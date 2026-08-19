// Future labs UI + interest-mix graph click-path (local web+API).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const WEB = process.env.WEB_URL ?? 'http://localhost:3001';
const API = process.env.API_URL ?? 'http://127.0.0.1:4000';
const email = `future-graph-${Date.now()}@example.test`;
const password = 'LocalTestPassword1!';
const handle = `fg_${String(Date.now()).slice(-8)}`;
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

function seedMixHistory(userId) {
  const r = spawnSync(
    'npx',
    ['--yes', 'tsx', 'scripts/seed-interest-mix-user.ts', userId],
    {
      cwd: path.join(process.cwd(), 'apps/api'),
      encoding: 'utf8',
      env: process.env,
    },
  );
  if (r.status !== 0) {
    throw new Error(`seed failed: ${r.stderr || r.stdout}`);
  }
  ok('seeded 3 tables + reviews for mix graph');
}

const browser = await chromium.launch();
const page = await browser.newPage();

try {
  await page.goto(`${WEB}/login`);
  await page.getByRole('button', { name: /create an account with email code/i }).click();
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: /send email code/i }).click();
  await page.getByLabel('Verification code').fill(await readDevCode(page));
  await page.getByLabel('Set your password').fill(password);
  await page.getByLabel('First name').fill('Graph');
  await page.getByLabel('Last name').fill('Tester');
  await page.getByLabel('Handle').fill(handle);
  await page.getByLabel('Phone number').fill(`03${String(Date.now()).slice(-9)}`);
  await page.getByRole('button', { name: /verify & sign in/i }).click();
  await page.waitForURL(`${WEB}/`);
  ok('signed up / signed in');

  const token = await page.evaluate(() => localStorage.getItem('jrst_token'));
  if (!token) throw new Error('missing jrst_token');

  const meRes = await fetch(`${API}/api/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const me = await meRes.json();
  const userId = me.user?.id;
  if (!userId) throw new Error('no user id');

  await fetch(`${API}/api/users/me`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      interests: ['Mindfulness', 'Books & Writing'],
      intents: ['MAKE_FRIENDS'],
      socialEnergy: 'MIX',
    }),
  }).then(async (r) => {
    if (!r.ok) throw new Error(`profile patch ${r.status} ${await r.text()}`);
  });
  ok('profile interests / intents set');

  seedMixHistory(userId);

  // Prefer curl — Node fetch to Neon-backed API can flake on some local stacks.
  const mixRaw = spawnSync(
    'curl',
    [
      '-sS',
      `${API}/api/users/me/interest-mix`,
      '-H',
      `Authorization: Bearer ${token}`,
    ],
    { encoding: 'utf8' },
  );
  if (mixRaw.status !== 0) {
    throw new Error(`interest-mix curl failed: ${mixRaw.stderr || mixRaw.stdout}`);
  }
  let mix;
  try {
    mix = JSON.parse(mixRaw.stdout);
  } catch {
    throw new Error(`interest-mix bad JSON: ${mixRaw.stdout.slice(0, 300)}`);
  }
  if (mix.statusCode >= 400 || mix.message) {
    throw new Error(`interest-mix error: ${mixRaw.stdout.slice(0, 300)}`);
  }
  if (!mix.axes || mix.axes.length < 3) throw new Error('axes missing');
  if (mix.totalTables < 3) throw new Error(`expected tables, got ${mix.totalTables}`);
  if (!mix.reviews?.overallCount) throw new Error('expected reviews');
  ok(
    `interest-mix API: tables=${mix.totalTables} reviews=${mix.reviews.overallCount} axes=${mix.axes.length}`,
  );

  await page.goto(`${WEB}/profile`);
  await page.getByTestId('interest-mix').waitFor({ timeout: 15_000 });
  await page.getByRole('img', { name: /Interest mix radar/i }).waitFor();
  await page
    .getByTestId('interest-mix')
    .getByRole('paragraph')
    .filter({ hasText: /^Peer rating$/ })
    .waitFor();

  const ratingBlock = await page.locator('[data-testid="interest-mix"]').innerText();
  if (!/\b([1-5](?:\.\d)?)\b/.test(ratingBlock)) {
    throw new Error(`peer rating not numeric in panel:\n${ratingBlock.slice(0, 400)}`);
  }
  ok('radar graph + review tiles visible');

  await page.getByText('Deep Talks').first().waitFor();
  await page.getByText('Coffee & Casual').first().waitFor();
  ok('category bars show seeded activity');

  await page.screenshot({ path: `${shotDir}/future-labs-graph.png`, fullPage: true });

  const surprise = page
    .locator('label')
    .filter({ hasText: 'Surprise me' })
    .locator('input[type="checkbox"]');
  await surprise.check();
  await page.getByText('Saved', { exact: true }).waitFor({ timeout: 10_000 });
  ok('Surprise me still saves');

  console.log('\nALL PASS — future labs graph UI');
} catch (err) {
  await page
    .screenshot({ path: `${shotDir}/future-labs-graph-FAIL.png`, fullPage: true })
    .catch(() => {});
  console.error('\nFAIL:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
