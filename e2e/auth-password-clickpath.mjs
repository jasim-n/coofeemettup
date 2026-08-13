// Current email/password auth click path against local web and API servers.
import { chromium } from 'playwright';

const WEB = process.env.WEB_URL ?? 'http://localhost:3000';
const email = `playwright-${Date.now()}@example.test`;
const password = 'LocalTestPassword1!';
const resetPassword = 'LocalResetPassword2!';

const browser = await chromium.launch();
const page = await browser.newPage();

try {
  await page.goto(`${WEB}/login`);
  await page.getByRole('button', { name: /first login or create an account/i }).click();
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: /send email code/i }).click();

  await page.getByLabel('Verification code').fill(
    await page.locator('text=Dev code:').innerText().then((text) => text.match(/\d{6}/)?.[0] ?? ''),
  );
  await page.getByLabel('Set your password').fill(password);
  await page.getByLabel('First name').fill('Playwright');
  await page.getByLabel('Last name').fill('Tester');
  await page.getByLabel('Handle').fill(`pw_${Date.now()}`);
  await page.getByLabel('Phone number').fill(`03${String(Date.now()).slice(-9)}`);
  await page.getByRole('button', { name: /verify & sign in/i }).click();
  await page.waitForURL(`${WEB}/`);
  console.log('PASS first login and password setup');

  await page.evaluate(() => localStorage.clear());
  await page.goto(`${WEB}/login`);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill('WrongPassword1!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.getByText(/invalid email or password/i).waitFor();
  console.log('PASS wrong password rejected');

  await page.getByRole('button', { name: /forgot password/i }).click();
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: /send reset code/i }).click();
  await page.locator('input[placeholder="Verification code"]').fill(
    await page.locator('text=Dev code:').innerText().then((text) => text.match(/\d{6}/)?.[0] ?? ''),
  );
  await page.locator('input[placeholder^="New password"]').fill(resetPassword);
  await page.getByRole('button', { name: /set new password/i }).click();
  await page.waitForURL(`${WEB}/`);
  console.log('PASS password reset and automatic sign-in');

  const loginContext = await browser.newContext();
  const loginPage = await loginContext.newPage();
  await loginPage.goto(`${WEB}/login`);
  await loginPage.getByLabel('Email address').fill(email);
  await loginPage.getByLabel('Password').fill(resetPassword);
  await loginPage.getByRole('button', { name: /sign in/i }).click();
  await loginPage.waitForURL(`${WEB}/`);
  console.log('PASS sign-in with reset password');
  await loginContext.close();
} finally {
  await browser.close();
}
