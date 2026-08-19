// Future labs (NEXT_PUBLIC_FUTURE_TASKS=false) click-path against local web+API.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const WEB = process.env.WEB_URL ?? 'http://localhost:3001';
const API = process.env.API_URL ?? 'http://localhost:4000';
const email = `future-labs-${Date.now()}@example.test`;
const password = 'LocalTestPassword1!';
const handle = `fl_${String(Date.now()).slice(-8)}`;
const shotDir = 'e2e/shots';
mkdirSync(shotDir, { recursive: true });

function ok(m) {
  console.log(`✅ ${m}`);
}

async function readDevCode(page) {
  const text = await page.locator('text=Dev code:').innerText({ timeout: 15_000 });
  const code = text.match(/\d{6}/)?.[0];
  if (!code) throw new Error(`No dev OTP in: ${text}`);
  return code;
}

const browser = await chromium.launch();
const page = await browser.newPage();
const apiHits = [];

page.on('response', (r) => {
  const u = r.url();
  if (u.includes('/api/')) {
    apiHits.push(`${r.status()} ${r.request().method()} ${u.replace(API, '')}`);
  }
});

try {
  // --- signup ---
  await page.goto(`${WEB}/login`);
  await page.getByRole('button', { name: /create an account with email code/i }).click();
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: /send email code/i }).click();
  await page.getByLabel('Verification code').fill(await readDevCode(page));
  await page.getByLabel('Set your password').fill(password);
  await page.getByLabel('First name').fill('Future');
  await page.getByLabel('Last name').fill('Labs');
  await page.getByLabel('Handle').fill(handle);
  await page.getByLabel('Phone number').fill(`03${String(Date.now()).slice(-9)}`);
  await page.getByRole('button', { name: /verify & sign in/i }).click();
  await page.waitForURL(`${WEB}/`);
  ok('signed up / signed in');

  // --- profile future labs ---
  await page.goto(`${WEB}/profile`);
  await page.getByRole('heading', { name: 'Coming preferences' }).waitFor({ timeout: 15_000 });
  ok('Future labs panel visible (FUTURE_TASKS=false)');
  await page.screenshot({ path: `${shotDir}/future-labs-01.png`, fullPage: true });

  await page.getByRole('heading', { name: 'Your interest mix' }).waitFor();
  await page.getByText(/Join or host a few tables|Based on \d+ table/i).waitFor();
  ok('interest mix section rendered');

  // Prefer label association — Playwright role checkbox names from adjacent text
  const surprise = page.locator('label').filter({ hasText: 'Surprise me' }).locator('input[type="checkbox"]');
  const remind = page.locator('label').filter({ hasText: 'Remind me the day before' }).locator('input[type="checkbox"]');
  await surprise.check();
  await page.getByText('Saved', { exact: true }).waitFor({ timeout: 10_000 });
  ok('Surprise me toggled on + saved');

  await remind.check();
  await page.getByText('Saved', { exact: true }).waitFor({ timeout: 10_000 });
  ok('Remind me toggled on + saved');

  await page.getByText('Host templates', { exact: true }).waitFor();
  await page.getByText('Waitlist', { exact: true }).waitFor();
  await page.getByText('No-show signal', { exact: true }).waitFor();
  ok('stub cards visible');
  await page.screenshot({ path: `${shotDir}/future-labs-02-toggles.png`, fullPage: true });

  // --- API: prefs + interest mix ---
  const token = await page.evaluate(() => localStorage.getItem('jrst_token'));
  if (!token) throw new Error('missing jrst_token');

  const meRes = await fetch(`${API}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!meRes.ok) throw new Error(`auth/me ${meRes.status}`);
  const me = await meRes.json();
  if (!me.user?.surpriseMeOptIn) throw new Error('surpriseMeOptIn not persisted');
  if (!me.user?.remindBeforeMeetup) throw new Error('remindBeforeMeetup not persisted');
  ok('prefs persisted on /auth/me');

  const mixRes = await fetch(`${API}/api/users/me/interest-mix`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!mixRes.ok) throw new Error(`interest-mix ${mixRes.status}`);
  const mix = await mixRes.json();
  if (!Array.isArray(mix.segments) || typeof mix.totalTables !== 'number') {
    throw new Error(`bad interest-mix shape: ${JSON.stringify(mix)}`);
  }
  ok(`interest-mix API ok (tables=${mix.totalTables}, segments=${mix.segments.length})`);

  // --- reload retains toggles ---
  await page.reload();
  await page.getByRole('heading', { name: 'Coming preferences' }).waitFor();
  if (!(await surprise.isChecked())) throw new Error('Surprise me lost after reload');
  if (!(await remind.isChecked())) throw new Error('Remind lost after reload');
  ok('toggles survived reload');

  console.log('\nAPI sample:');
  for (const line of apiHits.filter((l) => l.includes('interest-mix') || l.includes('users/me')).slice(-8)) {
    console.log(' ', line);
  }
  console.log('\nALL PASS — future labs');
} catch (err) {
  await page.screenshot({ path: `${shotDir}/future-labs-FAIL.png`, fullPage: true }).catch(() => {});
  console.error('\nFAIL:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
