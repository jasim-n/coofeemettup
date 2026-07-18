import { chromium } from 'playwright';
import Redis from 'ioredis';
import { writeFileSync } from 'node:fs';

const WEB = 'http://localhost:3000';
const redis = new Redis('redis://localhost:6379');
const PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
writeFileSync('/tmp/cnic.png', Buffer.from(PNG_B64, 'base64'));

async function getOtp(phone) {
  for (let i = 0; i < 30; i++) {
    const c = await redis.get(`otp:code:${phone}`);
    if (c) return c;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error('OTP not found');
}
async function login(page, local, e164) {
  await page.goto(`${WEB}/login`);
  await page.fill('#phone', local);
  await page.getByRole('button', { name: /send code/i }).click();
  const code = await getOtp(e164);
  await page.fill('#code', code);
  await page.getByRole('button', { name: /verify/i }).click();
  await page.waitForURL(`${WEB}/`);
}

const browser = await chromium.launch();
try {
  // --- user uploads CNIC ---
  const uctx = await browser.newContext();
  const upage = await uctx.newPage();
  const nine = String(Math.floor(100000000 + Math.random() * 900000000));
  await login(upage, `03${nine}`, `+923${nine}`);
  await upage.goto(`${WEB}/profile`);
  await upage.getByText(/identity verification/i).waitFor();
  await upage.setInputFiles('input[type="file"]', '/tmp/cnic.png');
  await upage.getByText(/pending review/i).waitFor({ timeout: 10000 });
  console.log('✅ user uploaded CNIC → pending review');
  await uctx.close();

  // --- admin reviews + approves ---
  const actx = await browser.newContext();
  const apage = await actx.newPage();
  await login(apage, '03001112222', '+923001112222');
  await apage.goto(`${WEB}/admin/verifications`);
  await apage.getByRole('heading', { name: /verifications/i }).waitFor();
  await apage.getByRole('button', { name: /^approve$/i }).first().waitFor({ timeout: 10000 });
  console.log('✅ admin verifications page lists pending CNIC(s)');
  await apage.waitForTimeout(600);
  await apage.screenshot({ path: 'e2e/shots/11-cnic.png' });
  await apage.getByRole('button', { name: /^approve$/i }).first().click();
  await apage.waitForTimeout(1000);
  console.log('✅ admin approved a verification');

  console.log('\n=== CNIC CHECK PASSED ===');
} catch (err) {
  console.error('=== CNIC CHECK FAILED ===');
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await browser.close();
  redis.disconnect();
}
