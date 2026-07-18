import { chromium } from 'playwright';
import Redis from 'ioredis';

const WEB = 'http://localhost:3000';
const redis = new Redis('redis://localhost:6379');

async function getOtp(phone) {
  for (let i = 0; i < 30; i++) {
    const c = await redis.get(`otp:code:${phone}`);
    if (c) return c;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('OTP not found');
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const nine = String(Math.floor(100000000 + Math.random() * 900000000));
  await page.goto(`${WEB}/login`);
  await page.fill('#phone', `03${nine}`);
  await page.getByRole('button', { name: /send code/i }).click();
  const code = await getOtp(`+923${nine}`);
  await page.fill('#code', code);
  await page.getByRole('button', { name: /verify/i }).click();
  await page.waitForURL(`${WEB}/`);
  console.log('✅ logged in');

  await page.goto(`${WEB}/events`);
  await page.locator('a[href^="/events/"]').first().waitFor({ timeout: 10000 });
  console.log('✅ events list shows meetups (no filter)');

  // All seed events are MIXED → Women-only should yield none.
  await page.selectOption('select >> nth=1', 'WOMEN_ONLY');
  await page.getByText(/no meetups match your filters/i).waitFor({ timeout: 10000 });
  console.log('✅ gender-track filter re-queries (Women-only → empty)');

  // Back to Mixed → events return.
  await page.selectOption('select >> nth=1', 'MIXED');
  await page.locator('a[href^="/events/"]').first().waitFor({ timeout: 10000 });
  console.log('✅ Mixed filter → events return');

  await page.screenshot({ path: 'e2e/shots/10-filters.png' });
  console.log('\n=== FILTER CHECK PASSED ===');
} catch (err) {
  console.error('=== FILTER CHECK FAILED ===');
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  redis.disconnect();
}
