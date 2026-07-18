import { chromium } from 'playwright';
import Redis from 'ioredis';

const WEB = 'http://localhost:3000';
const EVENT_ID = 'cmrot0nep00063uyqhtppe73i'; // "Group Test" — has 2 paid attendees + a group
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

  await page.goto(`${WEB}/admin/events/${EVENT_ID}`);
  await page.getByText(/paid attendees/i).waitFor();
  await page.getByRole('button', { name: /preview matches/i }).click();
  await page.getByText(/suggested groups/i).waitFor({ timeout: 10000 });
  await page.getByText(/match \d+%/i).first().waitFor({ timeout: 10000 });
  console.log('✅ preview renders suggested group(s) with match score');

  await page.waitForTimeout(400);
  await page.screenshot({ path: 'e2e/shots/09-preview.png' });
  console.log('\n=== PREVIEW CHECK PASSED ===');
} catch (err) {
  console.error('=== PREVIEW CHECK FAILED ===');
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  redis.disconnect();
}
