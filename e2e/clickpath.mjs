// End-to-end browser click-path (real Chromium via Playwright).
// Reads the dev OTP straight from Redis so the whole flow is automated.
import { chromium } from 'playwright';
import Redis from 'ioredis';

const WEB = 'http://localhost:3000';
const redis = new Redis('redis://localhost:6379');
const shot = (page, name) => page.screenshot({ path: `e2e/shots/${name}.png` });

async function getOtp(phone) {
  for (let i = 0; i < 30; i++) {
    const c = await redis.get(`otp:code:${phone}`);
    if (c) return c;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`OTP not found in redis for ${phone}`);
}

async function login(page, localPhone, e164) {
  await page.goto(`${WEB}/login`);
  await page.fill('#phone', localPhone);
  await page.getByRole('button', { name: /send code/i }).click();
  const code = await getOtp(e164);
  await page.fill('#code', code);
  await page.getByRole('button', { name: /verify/i }).click();
  await page.waitForURL(`${WEB}/`);
  await page.getByText(/signed in as/i).waitFor();
}

const browser = await chromium.launch();
const consoleErrors = [];
const netlog = [];
const results = [];
const ok = (m) => { results.push(`✅ ${m}`); console.log(`✅ ${m}`); };

try {
  // ---------- USER JOURNEY ----------
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
  page.on('response', (r) => {
    const u = r.url();
    if (u.includes('/api/')) netlog.push(`${r.status()} ${r.request().method()} ${u.replace('http://localhost:4000', '')}`);
  });

  const nine = String(Math.floor(100000000 + Math.random() * 900000000));
  await login(page, `03${nine}`, `+923${nine}`);
  ok('user logged in via OTP (fresh user)');
  await shot(page, '01-home');

  await page.getByRole('link', { name: /browse meetups/i }).click();
  await page.waitForURL('**/events');
  await page.getByText(/Saturday Coffee/i).waitFor();
  ok('browse shows seed event');
  await shot(page, '02-events');

  await page.getByText(/Saturday Coffee/i).click();
  await page.getByRole('button', { name: /join this meetup/i }).click();
  await page.getByRole('button', { name: /^Pay/i }).click();
  // hosted mock checkout (cross-origin redirect) → pay → redirect back to the event
  await page.waitForURL(/\/payments\/mock\/pay/);
  await page.getByRole('button', { name: /pay now \(mock\)/i }).click();
  await page.waitForURL(/\/events\/[^/]+$/);
  await page.getByText(/You're in/i).waitFor();
  ok('user joined + paid via hosted checkout + webhook');
  await shot(page, '03-paid');

  await page.getByRole('link', { name: /leave feedback/i }).click();
  await page.waitForURL('**/feedback');
  await page.getByRole('button', { name: /submit feedback/i }).click();
  await page.getByText(/thank you/i).waitFor();
  ok('feedback submitted');
  await shot(page, '04-feedback');
  await ctx.close();

  // ---------- ADMIN ----------
  const actx = await browser.newContext();
  const apage = await actx.newPage();
  await login(apage, '03001112222', '+923001112222');
  ok('admin logged in');
  await apage.getByRole('link', { name: /admin console/i }).click();
  await apage.waitForURL('**/admin');
  await apage.getByText(/create event/i).first().waitFor();
  ok('admin console loads (role-gated)');
  await shot(apage, '05-admin');

  await apage.getByRole('link', { name: /^reports$/i }).click();
  await apage.waitForURL('**/admin/reports');
  await apage.getByRole('heading', { name: /^reports$/i }).waitFor();
  ok('admin reports (moderation) page loads');
  await shot(apage, '07-reports');
  await actx.close();

  console.log('\n=== E2E PASSED ===');
  console.log(results.join('\n'));
  console.log(`console errors: ${consoleErrors.length}`);
  if (consoleErrors.length) console.log(consoleErrors.slice(0, 5).join('\n'));
} catch (err) {
  console.error('\n=== E2E FAILED ===');
  console.error(err.message);
  console.log('passed so far:\n' + results.join('\n'));
  console.log('network:\n' + netlog.slice(-12).join('\n'));
  console.log('console errors:\n' + consoleErrors.slice(-6).join('\n'));
  process.exitCode = 1;
} finally {
  await browser.close();
  redis.disconnect();
}
