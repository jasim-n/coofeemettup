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
  const ctx = await browser.newContext({
    viewport: { width: 430, height: 900 }, // phone-ish (Instagram audience)
    geolocation: { latitude: 33.72, longitude: 73.07 }, // near F-7 cafes
    permissions: ['geolocation'],
  });
  const page = await ctx.newPage();

  // Login screen (branded hero)
  await page.goto(`${WEB}/login`);
  await page.getByText(/coffee meetups/i).first().waitFor();
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'e2e/shots/brand-login.png' });
  console.log('✅ login');

  // Sign in
  const nine = String(Math.floor(100000000 + Math.random() * 900000000));
  await page.fill('#phone', `03${nine}`);
  await page.getByRole('button', { name: /send code/i }).click();
  const code = await getOtp(`+923${nine}`);
  await page.fill('#code', code);
  await page.getByRole('button', { name: /verify/i }).click();
  await page.waitForURL(`${WEB}/`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'e2e/shots/brand-home.png' });
  console.log('✅ home');

  await page.goto(`${WEB}/events`);
  await page.locator('a[href^="/events/"]').first().waitFor();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'e2e/shots/brand-events.png' });
  console.log('✅ events');

  await page.goto(`${WEB}/map`);
  await page.waitForSelector('.maplibregl-marker', { timeout: 15000 });
  await page.waitForTimeout(2000); // tiles + geolocation recenter
  await page.screenshot({ path: 'e2e/shots/brand-map.png' });
  console.log('✅ map (geolocated)');

  console.log('\n=== BRAND SHOTS DONE ===');
} catch (err) {
  console.error('=== FAILED ===', err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  redis.disconnect();
}
