import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const message = 'Injected module failure <img src=x onerror="window.injected=true">';
  await page.route('**/journey/journey.js', route => route.fulfill({ contentType: 'application/javascript', body: `throw new Error(${JSON.stringify(message)});` }));
  await page.goto(`${process.env.TEST_URL || 'http://localhost:8137'}/?nointro=1`);
  const banner = page.locator('[role="status"]').filter({ hasText: 'interactive journey could not load' });
  await banner.waitFor({ timeout: 30000 });
  const details = banner.locator('details');
  assert.equal(await details.getAttribute('open'), null, 'diagnostics start collapsed');
  assert.equal(await banner.locator('a').getAttribute('href'), './static/', 'working fallback preserved');
  await details.locator('summary').tap();
  const text = await details.locator('pre').textContent();
  assert.ok(text.includes('Stage: loading journey modules') && text.includes(message), text);
  assert.equal(await banner.locator('img').count(), 0, 'error markup is literal text');
  assert.equal(await page.evaluate(() => !!window.injected), false);
  assert.ok(await page.evaluate(() => window.__pageErrors > 0), 'failure reaches the existing error channel');
  await page.screenshot({path:'/tmp/journey-failure-details.png'});
  console.log('PASS injected import failure: stage, literal error, collapsed details, static exit, existing error channel');
} finally { await browser.close(); }
