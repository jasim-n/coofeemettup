/**
 * Mobile viewport audit: overflow + screenshot for one route.
 * Usage: node e2e/mobile-audit.mjs [/path]
 * Env: WEB_URL, EMAIL, PASSWORD — or reuses e2e/.mobile-audit-creds.json
 */
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';

const WEB = process.env.WEB_URL ?? 'http://localhost:3000';
const ROUTE = process.argv[2] ?? '/';
const VIEWPORT = { width: 390, height: 844 };
const OUT = 'e2e/shots/mobile';
const CREDS = 'e2e/.mobile-audit-creds.json';

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: VIEWPORT,
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();

function loadCreds() {
  if (process.env.EMAIL && process.env.PASSWORD) {
    return { email: process.env.EMAIL, password: process.env.PASSWORD };
  }
  if (existsSync(CREDS)) {
    return JSON.parse(readFileSync(CREDS, 'utf8'));
  }
  return null;
}

function saveCreds(email, password) {
  writeFileSync(CREDS, JSON.stringify({ email, password }, null, 2));
}

async function loginWithPassword(email, password) {
  await page.goto(`${WEB}/login`);
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });
}

async function ensureSignedIn() {
  const existing = loadCreds();
  if (existing) {
    try {
      await loginWithPassword(existing.email, existing.password);
      console.log('signed-in as', existing.email);
      return;
    } catch {
      console.log('stored creds failed — creating new account');
    }
  }

  const email = `mobile-audit-${Date.now()}@example.test`;
  const password = 'LocalTestPassword1!';
  await page.goto(`${WEB}/login`);
  await page.getByRole('button', { name: /create an account with email code/i }).click();
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: /send email code/i }).click();
  const codeText = await page.locator('text=Dev code:').innerText({ timeout: 15000 });
  const code = codeText.match(/\d{6}/)?.[0];
  if (!code) throw new Error('No OTP dev code');
  await page.getByLabel('Verification code').fill(code);
  await page.getByLabel('Set your password').fill(password);
  await page.getByLabel('First name').fill('Mobile');
  await page.getByLabel('Last name').fill('Audit');
  await page.getByLabel('Handle').fill(`ma_${Date.now().toString(36)}`);
  await page.getByLabel('Phone number').fill(`03${String(Date.now()).slice(-9)}`);
  await page.getByRole('button', { name: /verify & sign in/i }).click();
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });
  saveCreds(email, password);
  console.log('signed-in as', email);
}

function slug(route) {
  return route === '/' ? 'home' : route.replace(/^\//, '').replace(/\//g, '-');
}

try {
  await ensureSignedIn();
  await page.goto(`${WEB}${ROUTE}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const metrics = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(doc.scrollWidth, body.scrollWidth);
    const clientWidth = doc.clientWidth;
    const overflowX = scrollWidth > clientWidth + 1;

    const offenders = [];
    if (overflowX) {
      const all = Array.from(document.querySelectorAll('body *'));
      for (const el of all) {
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) continue;
        if (r.right > clientWidth + 2 || r.left < -2) {
          const tag = el.tagName.toLowerCase();
          const cls = typeof el.className === 'string' ? el.className.slice(0, 80) : '';
          offenders.push({
            tag,
            cls,
            left: Math.round(r.left),
            right: Math.round(r.right),
            w: Math.round(r.width),
          });
          if (offenders.length >= 12) break;
        }
      }
    }

    const bottomNav = !!document.querySelector('nav[aria-label="Primary"]');
    return {
      scrollWidth,
      clientWidth,
      overflowX,
      bottomNav,
      title: document.title,
      path: location.pathname,
      offenders,
    };
  });

  const name = slug(ROUTE);
  const shot = `${OUT}/${name}.png`;
  await page.screenshot({ path: shot, fullPage: true });

  console.log(JSON.stringify({ route: ROUTE, shot, ...metrics }, null, 2));
  if (metrics.overflowX) {
    console.error('FAIL horizontal overflow');
    process.exitCode = 1;
  } else {
    console.log('PASS no horizontal overflow');
  }
} catch (err) {
  console.error('AUDIT ERROR', err.message);
  await page.screenshot({ path: `${OUT}/error-${slug(ROUTE)}.png`, fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
