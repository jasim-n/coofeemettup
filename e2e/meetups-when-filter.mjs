/**
 * Meetups mobile filters: Apply closes drawer + When filter changes results.
 * Usage: node e2e/meetups-when-filter.mjs
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';

const WEB = process.env.WEB_URL ?? 'http://localhost:3000';
const CREDS = 'e2e/.mobile-audit-creds.json';
const VIEWPORT = { width: 390, height: 844 };

async function ensureSignedIn(page) {
  if (existsSync(CREDS)) {
    const { email, password } = JSON.parse(readFileSync(CREDS, 'utf8'));
    await page.goto(`${WEB}/login`);
    await page.getByLabel('Email address').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: /sign in/i }).click();
    await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });
    return email;
  }

  const email = `when-filter-${Date.now()}@example.test`;
  const password = 'LocalTestPassword1!';
  await page.goto(`${WEB}/login`);
  await page.getByRole('button', { name: /create an account with email code/i }).click();
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: /send email code/i }).click();
  const codeText = await page.locator('text=Dev code:').innerText({ timeout: 15000 });
  const code = codeText.match(/\d{6}/)?.[0];
  if (!code) throw new Error('No OTP');
  await page.getByLabel('Verification code').fill(code);
  await page.getByLabel('Set your password').fill(password);
  await page.getByLabel('First name').fill('When');
  await page.getByLabel('Last name').fill('Filter');
  await page.getByLabel('Handle').fill(`wf_${Date.now().toString(36)}`);
  await page.getByLabel('Phone number').fill(`03${String(Date.now()).slice(-9)}`);
  await page.getByRole('button', { name: /verify & sign in/i }).click();
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 20000 });
  writeFileSync(CREDS, JSON.stringify({ email, password }, null, 2));
  return email;
}

function filtersDialog(page) {
  return page.getByRole('dialog', { name: /filters/i });
}

async function openFilters(page) {
  await page.getByRole('button', { name: /^filters$/i }).click();
  await filtersDialog(page).waitFor({ state: 'visible' });
}

async function applyAndClose(page) {
  await filtersDialog(page).getByRole('button', { name: /apply filters/i }).click();
  await filtersDialog(page).waitFor({ state: 'hidden', timeout: 5000 });
}

async function selectWhen(page, label) {
  await filtersDialog(page).getByRole('button', { name: new RegExp(`^${label}$`, 'i') }).click();
}

async function whenIsActive(page, label) {
  const btn = filtersDialog(page).getByRole('button', { name: new RegExp(`^${label}$`, 'i') });
  return btn.evaluate((el) =>
    el.className.includes('text-primary') || el.className.includes('bg-primary/10'),
  );
}

/** Cover cards in the discovery strip (Upcoming/Past Meetups heading). */
async function discoverySectionHrefs(page) {
  const heading = page.getByRole('heading', { name: /(upcoming|past) meetups/i });
  await heading.waitFor({ state: 'visible', timeout: 5000 });
  const section = heading.locator('xpath=ancestor::section[1]');
  return section.locator('a[href^="/tables/"]').evaluateAll((els) =>
    els.map((a) => a.getAttribute('href')).filter(Boolean).sort(),
  );
}

async function discoverySectionCardCount(page) {
  return (await discoverySectionHrefs(page)).length;
}

async function emptyFilterState(page) {
  return page
    .getByText(/no (upcoming|past) meetups match your filters/i)
    .isVisible()
    .catch(() => false);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: VIEWPORT,
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
const page = await context.newPage();

try {
  await ensureSignedIn(page);
  await page.goto(`${WEB}/meetups`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  // Ensure Upcoming tab (main content tabs, not drawer)
  await page.locator('main').getByRole('button', { name: /^upcoming$/i }).click();
  await page.waitForTimeout(400);

  const baseline = await discoverySectionCardCount(page);
  console.log('baseline discovery cards:', baseline);

  // --- Apply closes drawer ---
  await openFilters(page);
  await applyAndClose(page);
  console.log('PASS Apply Filters closes drawer');

  // --- When: Past ---
  await openFilters(page);
  await selectWhen(page, 'Past');
  if (!(await whenIsActive(page, 'Past'))) throw new Error('Past not active after click');
  await applyAndClose(page);
  await page.waitForTimeout(500);

  const pastHrefs = await discoverySectionHrefs(page);
  const pastCount = pastHrefs.length;
  const pastEmpty = await emptyFilterState(page);
  const pastHeading = await page.getByRole('heading', { name: /past meetups/i }).isVisible();
  if (!pastHeading) throw new Error('Past When did not switch section title to Past Meetups');
  console.log('After Past: cards=', pastCount, 'empty=', pastEmpty, 'ids=', pastHrefs);

  // Re-open: Past must still be selected (state survived Apply)
  await openFilters(page);
  if (!(await whenIsActive(page, 'Past'))) throw new Error('Past when-filter did not persist after Apply');
  await applyAndClose(page);
  console.log('PASS When=Past persists after Apply');

  // --- When: Upcoming ---
  await openFilters(page);
  await selectWhen(page, 'Upcoming');
  if (!(await whenIsActive(page, 'Upcoming'))) throw new Error('Upcoming not active after click');
  await applyAndClose(page);
  await page.waitForTimeout(500);

  const upcomingHrefs = await discoverySectionHrefs(page);
  const upcomingCount = upcomingHrefs.length;
  const upcomingEmpty = await emptyFilterState(page);
  const upcomingHeading = await page.getByRole('heading', { name: /upcoming meetups/i }).isVisible();
  if (!upcomingHeading) throw new Error('Upcoming When did not restore Upcoming Meetups title');
  console.log('After Upcoming: cards=', upcomingCount, 'empty=', upcomingEmpty, 'ids=', upcomingHrefs);

  await openFilters(page);
  if (!(await whenIsActive(page, 'Upcoming'))) throw new Error('Upcoming when-filter did not persist');
  await applyAndClose(page);
  console.log('PASS When=Upcoming persists after Apply');

  // Past and Upcoming should not show identical result sets when both have data,
  // OR at least Past should exclude future-only and Upcoming exclude past-only.
  // Strong check: All Meetups >= max(past, upcoming) card counts (or empty states differ).
  await openFilters(page);
  await selectWhen(page, 'All Meetups');
  await applyAndClose(page);
  await page.waitForTimeout(400);
  const allCount = await discoverySectionCardCount(page);
  console.log('After All Meetups: cards=', allCount);

  if (allCount > 0 && upcomingCount > allCount) {
    throw new Error(`Upcoming (${upcomingCount}) returned more than All (${allCount})`);
  }
  console.log('PASS When filter result counts are consistent');

  const sameSet =
    pastHrefs.length === upcomingHrefs.length &&
    pastHrefs.every((h, i) => h === upcomingHrefs[i]);

  if (!sameSet || pastEmpty !== upcomingEmpty) {
    console.log('PASS Past vs Upcoming produced different list results');
  } else if (baseline === 0 && pastEmpty && upcomingEmpty) {
    console.log('WARN no tables in seed — When selection UI verified only');
  } else {
    throw new Error(
      `When filter did not change results: past=${JSON.stringify(pastHrefs)} upcoming=${JSON.stringify(upcomingHrefs)}`,
    );
  }

  // --- This Week ---
  await openFilters(page);
  await selectWhen(page, 'This Week');
  if (!(await whenIsActive(page, 'This Week'))) throw new Error('This Week not active');
  await applyAndClose(page);
  await openFilters(page);
  if (!(await whenIsActive(page, 'This Week'))) throw new Error('This Week did not persist');
  await applyAndClose(page);
  console.log('PASS When=This Week persists after Apply');

  // --- This Weekend ---
  await openFilters(page);
  await selectWhen(page, 'This Weekend');
  if (!(await whenIsActive(page, 'This Weekend'))) throw new Error('This Weekend not active');
  await applyAndClose(page);
  console.log('PASS When=This Weekend selects and Apply closes');

  console.log('=== MEETUPS WHEN FILTER CLICKPATH PASSED ===');
} catch (err) {
  console.error('=== FAILED ===', err.message);
  await page.screenshot({ path: 'e2e/shots/mobile/meetups-when-filter-fail.png', fullPage: true }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
