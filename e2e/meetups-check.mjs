import { chromium } from 'playwright';
import Redis from 'ioredis';

const WEB = 'http://localhost:3000';
const redis = new Redis('redis://localhost:6379');
const PHONE_LOCAL = '03002000011';
const PHONE_E164 = '+923002000011';

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
  await page.goto(`${WEB}/login`);
  await page.fill('#phone', PHONE_LOCAL);
  await page.getByRole('button', { name: /send code/i }).click();
  const code = await getOtp(PHONE_E164);
  await page.fill('#code', code);
  await page.getByRole('button', { name: /verify/i }).click();
  await page.waitForURL(`${WEB}/`);
  console.log('✅ logged in');

  await page.goto(`${WEB}/meetups`);
  await page.getByRole('heading', { name: /my meetups/i }).waitFor();
  console.log('✅ My Meetups page loads');
  await page.getByText(/your group/i).first().waitFor({ timeout: 10000 });
  console.log('✅ co-members (group) shown');
  await page.getByRole('button', { name: /^block$/i }).first().waitFor({ timeout: 5000 });
  console.log('✅ Block/Report actions present');

  await page.waitForTimeout(500);
  await page.screenshot({ path: 'e2e/shots/08-meetups.png' });
  console.log('\n=== MEETUPS CHECK PASSED ===');
} catch (err) {
  console.error('=== MEETUPS CHECK FAILED ===');
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  redis.disconnect();
}
