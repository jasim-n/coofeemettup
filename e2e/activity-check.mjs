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
  await page.goto(`${WEB}/login`);
  await page.fill('#phone', '03001112222');
  await page.getByRole('button', { name: /send code/i }).click();
  const code = await getOtp('+923001112222');
  await page.fill('#code', code);
  await page.getByRole('button', { name: /verify/i }).click();
  await page.waitForURL(`${WEB}/`);
  console.log('✅ admin logged in');

  await page.goto(`${WEB}/admin/activity`);
  await page.getByRole('heading', { name: /activity log/i }).waitFor();
  await page.getByText(/auth\.login|booking\./i).first().waitFor({ timeout: 10000 });
  const count = await page.locator('[data-slot="card"]').count();
  console.log(`✅ activity log renders ${count} entries`);

  await page.waitForTimeout(400);
  await page.screenshot({ path: 'e2e/shots/12-activity.png' });
  console.log('\n=== ACTIVITY CHECK PASSED ===');
} catch (err) {
  console.error('=== ACTIVITY CHECK FAILED ===', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  redis.disconnect();
}
