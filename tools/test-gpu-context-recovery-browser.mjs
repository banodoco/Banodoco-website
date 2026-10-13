import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import net from 'node:net';
import { chromium } from 'playwright-core';

const listener = net.createServer();
await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
const port = listener.address().port;
await new Promise(resolve => listener.close(resolve));
const server = spawn('python3', ['serve.py'], {
  cwd: new URL('..', import.meta.url), env: { ...process.env, PORT: String(port) }, stdio: 'ignore',
});
const base = `http://127.0.0.1:${port}`;
const source = await readFile(new URL('../journey/boot/hero-gpu.js', import.meta.url), 'utf8');
let browser;
try {
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await fetch(base)).ok) break; } catch { /* server starting */ }
    if (attempt === 59) throw new Error('server did not start');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true, args: ['--use-angle=metal'],
  });
  for (const restore of [true, false]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const injection = `
  if (!window.__gpuLossInjected && sceneApi.intro) {
    window.__gpuLossInjected = true;
    const extension = r.getContext().getExtension('WEBGL_lose_context');
    if (!extension) throw new Error('Test requires real WebGL context loss');
    const compile = r.compile;
    r.compile = function (...args) {
      const materials = compile.apply(this, args);
      for (const material of materials) r.properties.get(material).currentProgram.isReady = () => false;
      r.compile = compile;
      setTimeout(() => extension.loseContext(), 0);
      return materials;
    };
    r.domElement.addEventListener('webglcontextlost', () => {
      window.__gpuLossObserved = true;
      ${restore ? 'setTimeout(() => extension.restoreContext(), 100);' : ''}
    }, { once: true });
    r.domElement.addEventListener('webglcontextrestored', () => { window.__gpuRestoreObserved = true; }, { once: true });
  }
`;
    // Inject only a pending program and native loss event. The production
    // preparation/helper, handoff, note, and renderer run without substitution.
    const modified = source.replace('  if (!r) return false;\n', '  if (!r) return false;\n' + injection);
    assert.notEqual(modified, source);
    await page.route(/\/journey\/boot\/hero-gpu\.js(?:\?|$)/, route => route.fulfill({
      status: 200, contentType: 'application/javascript', body: modified,
    }));
    await page.goto(`${base}/?nointro=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__gpuLossObserved === true, null, { timeout: 20000 });
    if (restore) {
      await page.waitForFunction(() => !!window.journey, null, { timeout: 20000 });
      assert.equal(await page.evaluate(() => window.__gpuRestoreObserved), true);
      assert.equal(await page.locator('[role="status"] button').count(), 0, 'restored startup has no terminal fallback');
      await page.evaluate(() => window.journey.flyTo('connect'));
      await page.waitForFunction(() => window.journey?.debugState().chapter === 'connect', null, { timeout: 15000 });
    } else {
      await page.waitForSelector('[role="status"] details', { timeout: 10000 });
      assert.equal(await page.evaluate(() => !!window.journey), false);
      assert.equal(await page.locator('[role="status"] button').textContent(), 'Reload to try again');
      // The delayed context notice must not erase earlier startup diagnostics.
      await page.waitForTimeout(3000);
      assert.equal(await page.locator('[role="status"] details').count(), 1);
      assert.equal(await page.locator('[role="status"] button').textContent(), 'Reload to try again');
      assert.equal(await page.evaluate(() => !!window.journey), false);
    }
    assert.deepEqual(errors, [], 'loss does not cause an uncaught stale polling error');
    console.log(`${restore ? 'transient loss restores navigable startup' : 'permanent loss preserves bounded diagnostic fallback'}: PASS`);
    await page.close();
  }
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
