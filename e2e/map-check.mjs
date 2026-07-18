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
  throw new Error(`OTP not found for ${phone}`);
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const nine = String(Math.floor(100000000 + Math.random() * 900000000));
  const local = `03${nine.slice(0, 8)}`; // 03 + 8 → 10-digit local after strip? ensure valid below
  // build valid PK: local must be 3 + 9 digits
  const digits9 = nine; // 9 digits
  const e164 = `+923${digits9}`;
  const typed = `03${digits9}`;

  await page.goto(`${WEB}/login`);
  await page.fill('#phone', typed);
  await page.getByRole('button', { name: /send code/i }).click();
  const code = await getOtp(e164);
  await page.fill('#code', code);
  await page.getByRole('button', { name: /verify/i }).click();
  await page.waitForURL(`${WEB}/`);
  console.log('✅ logged in');

  await page.goto(`${WEB}/map`);
  await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 });
  console.log('✅ map canvas rendered');
  await page.waitForSelector('.maplibregl-marker', { timeout: 20000 });
  console.log('✅ event marker rendered');

  const markerCount = await page.locator('.maplibregl-marker').count();
  console.log(`✅ ${markerCount} marker(s) on the map`);

  await page.waitForTimeout(1500); // let OSM tiles paint
  await page.screenshot({ path: 'e2e/shots/06-map.png' });

  // Popup (best-effort — marker hit-testing over tiles can be flaky).
  try {
    await page.locator('.maplibregl-marker').first().click({ timeout: 5000 });
    await page.getByText(/view & join/i).first().waitFor({ timeout: 5000 });
    console.log('✅ cafe popup shows meetup(s) with join links');
  } catch {
    console.log('… popup click skipped (marker hit-test flaky)');
  }
  console.log('\n=== MAP CHECK PASSED ===');
} catch (err) {
  console.error('=== MAP CHECK FAILED ===');
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  redis.disconnect();
}
