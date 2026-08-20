/**
 * Drive the already-open CDP Chrome (port 9222) so you can watch the graph.
 * Leaves the tab open — does NOT close the browser.
 *
 *   node e2e/future-labs-headed-cdp.mjs
 */
import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const CDP = process.env.CDP_URL ?? 'http://127.0.0.1:9222';
const WEB = process.env.WEB_URL ?? 'http://localhost:3001';
const API = process.env.API_URL ?? 'http://127.0.0.1:4000';
const email = `graph-live-${Date.now()}@example.test`;
const password = 'LocalTestPassword1!';
const handle = `gl_${String(Date.now()).slice(-8)}`;

function ok(m) {
  console.log(`✅ ${m}`);
}

async function readDevCode(page) {
  const text = await page.locator('text=Dev code:').innerText({ timeout: 20_000 });
  const code = text.match(/\d{6}/)?.[0];
  if (!code) throw new Error(`No dev OTP in: ${text}`);
  return code;
}

function seedMixHistory(userId) {
  const r = spawnSync(
    'npx',
    ['--yes', 'tsx', 'scripts/seed-interest-mix-user.ts', userId],
    { cwd: path.join(process.cwd(), 'apps/api'), encoding: 'utf8', env: process.env },
  );
  if (r.status !== 0) throw new Error(`seed failed: ${r.stderr || r.stdout}`);
  ok('seeded tables + reviews');
}

const browser = await chromium.connectOverCDP(CDP);
ok(`connected to Chrome via ${CDP}`);

const context = browser.contexts()[0] ?? (await browser.newContext());
const page = await context.newPage();

try {
  await page.bringToFront();
  await page.goto(`${WEB}/login`, { waitUntil: 'domcontentloaded' });
  ok(`opened ${WEB}/login — watch this Chrome tab`);

  await page.getByRole('button', { name: /create an account with email code/i }).click();
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: /send email code/i }).click();
  await page.getByLabel('Verification code').fill(await readDevCode(page));
  await page.getByLabel('Set your password').fill(password);
  await page.getByLabel('First name').fill('Live');
  await page.getByLabel('Last name').fill('Graph');
  await page.getByLabel('Handle').fill(handle);
  await page.getByLabel('Phone number').fill(`03${String(Date.now()).slice(-9)}`);
  await page.getByRole('button', { name: /verify & sign in/i }).click();
  await page.waitForURL(`${WEB}/`);
  ok('signed in');

  const token = await page.evaluate(() => localStorage.getItem('jrst_token'));
  const me = await (
    await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
  ).json();
  const userId = me.user?.id;
  if (!userId) throw new Error('no user id');

  await fetch(`${API}/api/users/me`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      interests: ['Mindfulness', 'Books & Writing', 'Deep Talks'],
      intents: ['MAKE_FRIENDS'],
      socialEnergy: 'MIX',
    }),
  });
  ok('profile interests set');
  seedMixHistory(userId);

  await page.goto(`${WEB}/profile`);
  await page.getByTestId('interest-mix').waitFor({ timeout: 20_000 });
  await page.getByRole('img', { name: /Interest mix radar/i }).waitFor();
  await page.evaluate(() => {
    document.querySelector('[data-testid="interest-mix"]')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  });
  ok('radar graph is on screen — leave this tab open for you to inspect');
  console.log(`\nEmail: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Profile: ${WEB}/profile`);
  console.log('\nBrowser left open (CDP). Not closing Chrome.');
} catch (err) {
  console.error('\nFAIL:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
}
// Do NOT browser.close() — user wants to keep watching.
