import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import process from 'node:process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = new URL('..', import.meta.url);
const HOST = '127.0.0.1';
const timeout = 90_000;
const scenarioTimeout = 45_000;
const tests = [];
const test = (name, fn, deadline = scenarioTimeout) => tests.push({ name, fn, deadline });
let profileRoot;

export class CoverageUnavailableError extends Error {}

// Coverage gaps are failures by default. Local environments may consciously
// opt into a skip, which is emitted as a stable JSON record for CI/reporters.
export function coverageDisposition(reason, allowSkip = process.env.BROWSER_SMOKE_ALLOW_SKIP === '1') {
  return {
    gate: 'browser-smoke',
    status: allowSkip ? 'skip' : 'fail',
    reason,
    optInSkip: allowSkip,
  };
}

function reportUnavailable(reason) {
  const result = coverageDisposition(reason);
  console.log(`BROWSER_SMOKE_RESULT ${JSON.stringify(result)}`);
  return result.status === 'skip';
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, HOST, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

async function waitForServer(port, child) {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`serve.py exited ${child.exitCode}`);
    const ready = await new Promise(resolve => {
      const socket = net.connect(port, HOST);
      socket.once('connect', () => { socket.destroy(); resolve(true); });
      socket.once('error', () => resolve(false));
    });
    if (ready) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('serve.py did not become ready');
}

function executablePath() {
  const configured = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  const candidates = configured ? [configured] : [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ];
  return candidates.find(path => { try { return process.getBuiltinModule('fs').existsSync(path); } catch { return false; } });
}

function launchBrowser(chrome) {
  return chromium.launch({
    executablePath: chrome,
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    env: { ...process.env, TMPDIR: profileRoot, TMP: profileRoot, TEMP: profileRoot },
  });
}

async function closeWithin(resource, milliseconds = 5_000) {
  if (!resource) return;
  await Promise.race([
    resource.close().catch(() => {}),
    new Promise(resolve => setTimeout(resolve, milliseconds)),
  ]);
}

async function runWithDeadline(fn, milliseconds, name) {
  let timer;
  try {
    return await Promise.race([
      fn(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`scenario exceeded ${milliseconds}ms total deadline: ${name}`)), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function observeErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
  });
  return errors;
}

async function hasStableWebGL(browser) {
  const page = await browser.newPage();
  try {
    const probe = () => page.evaluate(() => {
      const canvas = document.createElement('canvas');
      return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    });
    if (!await probe()) return false;
    await page.waitForTimeout(400);
    return await probe();
  } finally {
    await page.close();
  }
}

async function assertNoErrors(errors) {
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.deepEqual(errors, [], errors.join('\n'));
}

async function main() {
  profileRoot = await mkdtemp(join(tmpdir(), 'banodoco-browser-smoke-'));
  const port = await freePort();
const server = spawn('python3', ['serve.py'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let browser;
let serverError = '';
let activeBrowser;
server.stderr.on('data', chunk => { serverError += chunk; });

try {
  await waitForServer(port, server);
  const chrome = executablePath();
  if (!chrome) {
    const reason = 'no Chromium executable (set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH)';
    process.exitCode = reportUnavailable(reason) ? 0 : 1;
  } else {
    try {
      browser = await launchBrowser(chrome);
    } catch (error) {
      const reason = `Chromium could not launch (${error.message.split('\n')[0]})`;
      process.exitCode = reportUnavailable(reason) ? 0 : 1;
    }
  }

  if (browser) {
    const base = `http://${HOST}:${port}`;
    const webglAvailable = await hasStableWebGL(browser);
    await closeWithin(browser);
    browser = undefined;

    test('static fallback boots without uncaught errors', async () => {
      const page = await browser.newPage();
      const errors = observeErrors(page);
      await page.goto(`${base}/static/`, { waitUntil: 'networkidle', timeout });
      await page.waitForFunction(() => window.staticJourney?.chapter === 'mission');
      assert.equal(await page.locator('html').getAttribute('class').then(v => v?.includes('no-js')), false);
      await assertNoErrors(errors);
      await page.close();
    });

    test('static fallback remains useful without JavaScript', async () => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      try {
        await page.goto(`${base}/static/#/owned`, { waitUntil: 'domcontentloaded' });
        assert.equal(await page.locator('main section[data-chapter]').count(), 5);
        assert.ok(await page.locator('main a[href]').count() > 0);
        assert.equal(await page.locator('canvas').count(), 0);
        assert.equal(new URL(page.url()).hash, '#/owned');
        const owned = page.locator('section[data-chapter="owned"]');
        const landingDeadline = Date.now() + 5_000;
        let ownedBox;
        do {
          ownedBox = await owned.boundingBox();
          if (ownedBox && ownedBox.y >= 0 && ownedBox.y < 300) break;
          await page.waitForTimeout(100);
        } while (Date.now() < landingDeadline);
        assert.ok(ownedBox && ownedBox.y >= 0 && ownedBox.y < 300,
          `native #/owned target did not land near the viewport top: ${JSON.stringify(ownedBox)}`);
      } finally {
        await context.close();
      }
    });

    test('interactive tier exposes visitor-safe fallback when WebGL creation fails', async () => {
      const context = await browser.newContext();
      await context.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
          if (kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl') return null;
          return original.call(this, kind, ...args);
        };
      });
      const page = await context.newPage();
      try {
        await page.goto(`${base}/?nointro=1`, { waitUntil: 'domcontentloaded' });
        const fallback = page.locator('[role="status"] a[href="./static/"]');
        await fallback.waitFor({ state: 'visible', timeout: 15_000 });
        assert.match(await page.locator('[role="status"]').innerText(), /could not start|static journey/i);
      } finally {
        await context.close();
      }
    });

    test('static chapter navigation is observable', async () => {
      const page = await browser.newPage();
      await page.goto(`${base}/static/`, { waitUntil: 'domcontentloaded' });
      const nav = page.locator('.rail-item[data-nav="connect"]');
      await nav.focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => window.staticJourney?.chapter === 'connect');
      assert.equal(await page.locator('.rail-item[data-nav="connect"]').getAttribute('aria-current'), 'true');
      assert.equal(await page.locator('.still[data-chapter="connect"]').evaluate(el => el.classList.contains('on')), true);
      await page.close();
    });

    test('static deep-link aliases resolve to canonical detail', async () => {
      const page = await browser.newPage();
      await page.goto(`${base}/static/#/inspire/2rp`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.staticJourney?.detail === 'tworp');
      assert.equal(await page.locator('#d-tworp').isVisible(), true);
      assert.equal(new URL(page.url()).hash, '#/inspire/tworp');
      await page.close();
    });

    test('static keyboard and pointer disclosures open and close', async () => {
      const page = await browser.newPage();
      await page.goto(`${base}/static/#/connect`, { waitUntil: 'domcontentloaded' });
      const trigger = page.locator('#t-discord');
      await trigger.focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => window.staticJourney?.detail === 'discord');
      assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => window.staticJourney?.detail === null);
      assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
      await trigger.click();
      await page.waitForFunction(() => window.staticJourney?.detail === 'discord');
      await trigger.click();
      await page.waitForFunction(() => window.staticJourney?.detail === null);
      await page.close();
    });

    test('reduced motion exposes the static door and removes smooth static scrolling', async () => {
      const context = await browser.newContext({ reducedMotion: 'reduce' });
      const page = await context.newPage();
      try {
        await page.goto(`${base}/static/`, { waitUntil: 'domcontentloaded' });
        assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
        assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
        await page.goto(`${base}/?nointro=1`, { waitUntil: 'domcontentloaded' });
        assert.equal(await page.locator('.static-door').isVisible(), true);
      } finally {
        await context.close();
      }
    });

    test('live journey boots cleanly and supports navigation, aliases, and card input', async () => {
      if (!webglAvailable) {
        throw new CoverageUnavailableError('live WebGL preflight context unavailable');
      }
      const liveBrowser = browser;
      if (!await hasStableWebGL(liveBrowser)) {
        throw new CoverageUnavailableError('live WebGL fresh-browser context unavailable');
      }
      const context = await liveBrowser.newContext({
        viewport: { width: 1280, height: 800 },
        hasTouch: true,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      const errors = observeErrors(page);
      try {
        await page.goto(`${base}/?capture=owned&steady=1&photos=0`, { waitUntil: 'domcontentloaded', timeout });
        const state = await Promise.race([
          page.waitForFunction(() => window.journey, null, { timeout }).then(() => 'ready'),
          page.waitForSelector('[role="status"] a[href="./static/"]', { state: 'visible', timeout }).then(() => 'fallback'),
        ]);
        assert.equal(state, 'ready', `application fallback was reached: ${errors.join(' | ')}`);
        assert.equal(await page.evaluate(() => window.journey.heroIntroSkipped), true);
        assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
        assert.equal(await page.locator('.static-door').isVisible(), true);
        assert.equal(new URL(page.url()).hash, '');

        // Owned's authored button is a zero-box wrapper around its face-sized
        // hit disc, so Playwright's `:visible` heuristic cannot target the
        // semantic control itself. Exercise its native keyboard activation;
        // pointer geometry is covered by the chapter's dedicated UI probes.
        const hotspot = page.locator('.j-hot.vis[data-node^="contributor-"][aria-expanded="false"]').first();
        await hotspot.evaluate(el => el.focus());
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => window.journey?.detail?.startsWith('contributor-'));
        assert.equal(await page.locator('.j-card.open.sheet').isVisible(), true);
        await page.locator('.j-card-x').tap();
        await page.waitForFunction(() => window.journey?.detail === null);

        const nav = page.locator('.j-rail-item[data-chapter="connect"]');
        await nav.evaluate(el => el.focus());
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => window.journey?.chapter === 'connect');
        assert.equal(await nav.getAttribute('aria-current'), 'true');
        await assertNoErrors(errors);
      } finally {
        await closeWithin(context);
      }
    }, 120_000);

    let failures = 0;
    for (const { name, fn, deadline } of tests) {
      try {
        activeBrowser = await launchBrowser(chrome);
        browser = activeBrowser;
        await runWithDeadline(fn, deadline, name);
        console.log(`PASS ${name}`);
      } catch (error) {
        if (error instanceof CoverageUnavailableError && reportUnavailable(error.message)) {
          console.log(`SKIP ${name}`);
        } else {
          failures += 1;
          console.error(`FAIL ${name}\n${error.stack || error}`);
        }
      } finally {
        await closeWithin(activeBrowser);
        if (browser === activeBrowser) browser = undefined;
        activeBrowser = undefined;
      }
    }
    if (failures) process.exitCode = 1;
  }
} finally {
  await closeWithin(activeBrowser);
  await closeWithin(browser);
  if (server.exitCode === null) {
    server.kill('SIGTERM');
    await Promise.race([
      new Promise(resolve => server.once('exit', resolve)),
      new Promise(resolve => setTimeout(resolve, 2_000)),
    ]);
    if (server.exitCode === null) server.kill('SIGKILL');
  }
  await rm(profileRoot, { recursive: true, force: true });
  if (serverError && process.exitCode) console.error(serverError.trim());
}
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) await main();
