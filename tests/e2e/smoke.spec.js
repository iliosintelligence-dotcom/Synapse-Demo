// Every public page must load without an uncaught JavaScript error, and the
// key journeys must show what they promise. Read-only: nothing is submitted.
// (An uncaught error on a page is how one wrong character in an inline script
// once stopped three pages from running. This test fails on exactly that.)
const { test, expect } = require('@playwright/test');

const PAGES = [
  '/', '/buyers.html', '/privacy.html', '/terms.html',
  '/app/toju.html', '/app/browse.html', '/app/dream.html', '/app/signin.html',
  '/app/your-data.html', '/app/verify.html', '/app/go.html',
];
// Third-party noise we do not own.
const IGNORE = /googletagmanager|google-analytics|favicon|ERR_BLOCKED|net::ERR|Failed to load resource/i;

for (const path of PAGES) {
  test('loads without script errors: ' + path, async ({ page }) => {
    const errors = [];
    page.on('pageerror', (e) => errors.push(String((e && e.message) || e)));
    page.on('console', (m) => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(m.text()); });
    const res = await page.goto(path, { waitUntil: 'load' });
    expect(res && res.status(), 'HTTP status').toBeLessThan(400);
    await page.waitForTimeout(1500);
    expect(errors, errors.join('\n')).toEqual([]);
  });
}

test('landing: four plans, a working carousel, no sideways page scroll', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('#prGrid .pr-card')).toHaveCount(4);
  await page.locator('#pricing').scrollIntoViewIfNeeded();
  await page.locator('#prNext').click();
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => document.getElementById('prGrid').scrollLeft)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});

test('browse: filters present, and listings or an honest empty state show', async ({ page }) => {
  await page.goto('/app/browse.html');
  await expect(page.locator('#dealFilter button')).toHaveCount(7);
  await page.waitForTimeout(4000);
  const cards = await page.locator('.card.listing').count();
  const empty = await page.locator('.empty:not([hidden])').count();
  expect(cards + empty).toBeGreaterThan(0);
});

test('a listing page and its agency page open from live data', async ({ page, request }) => {
  const cfg = await (await request.get('/app/auth.js')).text();
  const url = (cfg.match(/https:\/\/[a-z0-9]+\.supabase\.co/) || [])[0];
  const key = (cfg.match(/sb_publishable_[A-Za-z0-9_-]+/) || [])[0];
  test.skip(!url || !key, 'public config not found');
  const rows = await (await request.get(
    url + '/rest/v1/properties?select=id,agency_id&status=eq.live&is_active=is.true&limit=1',
    { headers: { apikey: key, Authorization: 'Bearer ' + key } })).json();
  test.skip(!rows.length, 'no live listing');
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.goto('/app/property.html?id=' + rows[0].id);
  await expect(page.locator('#pvPrice')).not.toHaveText('', { timeout: 15000 });
  await page.goto('/app/agency-profile.html?id=' + rows[0].agency_id);
  await expect(page.locator('#apName')).not.toHaveText(/Loading/, { timeout: 15000 });
  expect(errors, errors.join('\n')).toEqual([]);
});

test('tayo: the chat page is usable', async ({ page }) => {
  await page.goto('/app/toju.html');
  await expect(page.locator('#tjInput')).toBeVisible();
});

test('security headers are present', async ({ request }) => {
  const h = (await request.get('/')).headers();
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['content-security-policy'] || '').toContain('frame-ancestors');
  expect(h['referrer-policy']).toBeTruthy();
});
