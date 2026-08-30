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
const scenarioTimeout = 45_000;
// Every ordinary operation must finish before its scenario deadline leaves
// room for owner cancellation and confirmed cleanup. The live journey has a
// deliberately longer deadline, so its 90s operation budget remains below it.
const scenarioOperationTimeout = scenarioTimeout - 5_000;
const liveScenarioTimeout = 120_000;
const liveOperationTimeout = Math.min(90_000, liveScenarioTimeout - 5_000);
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

export class ScenarioLifecycleError extends Error {
  constructor(message, { cause, phase, cleanupConfirmed = false } = {}) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'ScenarioLifecycleError';
    this.phase = phase;
    this.cleanupConfirmed = cleanupConfirmed;
  }
}

function settledClosed(resource) {
  if (!resource) return true;
  if (typeof resource.isClosed === 'function') return resource.isClosed();
  if (typeof resource.isConnected === 'function') return !resource.isConnected();
  if (resource.closed === true) return true;
  return false;
}

function closePromise(resource) {
  if (!resource || typeof resource.close !== 'function') return Promise.resolve();
  return Promise.resolve().then(() => resource.close());
}

function withTimeout(promise, milliseconds, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} exceeded ${milliseconds}ms`)), milliseconds);
    Promise.resolve(promise).then((value) => {
      clearTimeout(timer);
      resolve(value);
    }, (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function closeConfirmed(resource, label, milliseconds) {
  if (!resource || settledClosed(resource)) return;
  try {
    await withTimeout(closePromise(resource), milliseconds, `closing ${label}`);
  } catch (error) {
    throw new ScenarioLifecycleError(
      `could not confirm closure of ${label}: ${error.message}`,
      { cause: error, phase: `cleanup ${label}` },
    );
  }
  // BrowserContext has no isClosed() API; a resolved close() is its public
  // closure acknowledgement. Browser/page objects expose an explicit state.
  const hasState = typeof resource.isClosed === 'function'
    || typeof resource.isConnected === 'function'
    || 'closed' in resource;
  if (!settledClosed(resource) && hasState) {
    throw new ScenarioLifecycleError(`could not confirm closure of ${label}`, {
      phase: `cleanup ${label}`,
    });
  }
}

/** Own every browser resource created by one scenario. Closing is strict:
 *  timeout returns only after all owned resources have acknowledged closure. */
export function createScenarioOwner(browser, name = 'scenario', {
  closeTimeoutMs = 5_000,
} = {}) {
  const controller = new AbortController();
  const resources = [];
  const pendingCreations = new Set();
  const lateCleanups = new Set();
  const lateCleanupByResource = new WeakMap();
  let phase = 'setup';
  let cancelled = false;
  let closing = false;
  let closeP = null;

  const track = (resource, label) => {
    if (!resource) return resource;
    resources.push({ resource, label });
    if (cancelled || closing) {
      const cleanup = closeConfirmed(resource, `${name} ${label}`, closeTimeoutMs);
      lateCleanupByResource.set(resource, cleanup);
      lateCleanups.add(cleanup);
      cleanup.then(() => lateCleanups.delete(cleanup), () => lateCleanups.delete(cleanup));
    }
    return resource;
  };
  const create = (factory, label) => {
    const creation = Promise.resolve().then(factory).then(async resource => {
      track(resource, label);
      pendingCreations.delete(creation);
      if (cancelled || closing) {
        // track() already started the sole cleanup promise for an adopted
        // late resource; awaiting it here avoids a concurrent second close.
        await lateCleanupByResource.get(resource);
        throw new ScenarioLifecycleError(
          `scenario cancelled before ${label} was ready: ${name} (phase: ${phase})`,
          { phase, cleanupConfirmed: false },
        );
      }
      return resource;
    }, error => {
      pendingCreations.delete(creation);
      throw error;
    });
    pendingCreations.add(creation);
    return creation;
  };
  track(browser, 'browser');

  const owner = {
    name,
    browser,
    signal: controller.signal,
    get phase() { return phase; },
    get closeStarted() { return closeP !== null; },
    setPhase(label) {
      owner.throwIfCancelled();
      phase = String(label);
    },
    throwIfCancelled() {
      if (cancelled || closing) throw new ScenarioLifecycleError(
        `scenario cancelled: ${name} (phase: ${phase})`,
        { phase, cleanupConfirmed: false },
      );
    },
    cancel(reason = `scenario deadline: ${name}`) {
      if (cancelled) return;
      cancelled = true;
      controller.abort(new Error(reason));
    },
    async newPage(context = null) {
      owner.throwIfCancelled();
      return create(() => (context ? context.newPage() : browser.newPage()), 'page');
    },
    async newContext(options) {
      owner.throwIfCancelled();
      return create(() => browser.newContext(options), 'context');
    },
    track,
    async close() {
      if (closeP) return closeP;
      closing = true;
      closeP = (async () => {
        const errors = [];
        // Creation is part of ownership. Await it before taking the resource
        // snapshot; otherwise a delayed page/context can escape cleanup.
        if (pendingCreations.size) {
          try {
            await withTimeout(Promise.allSettled([...pendingCreations]), closeTimeoutMs, `creating ${name} resources`);
          } catch (error) {
            errors.push(new ScenarioLifecycleError(
              `could not confirm creation quiescence of ${name}: ${error.message}`,
              { cause: error, phase: `cleanup (${phase})` },
            ));
          }
        }
        // Pages first, then contexts, then the browser. This keeps the owner
        // boundary explicit even when a scenario abandoned a page operation.
        const ordered = [...resources].reverse().sort((a, b) => {
          const rank = (entry) => entry.label === 'browser' ? 0 : entry.label === 'context' ? 1 : 2;
          return rank(b) - rank(a);
        });
        for (const { resource, label } of ordered) {
          try {
            await (lateCleanupByResource.get(resource)
              || closeConfirmed(resource, `${name} ${label}`, closeTimeoutMs));
          }
          catch (error) { errors.push(error); }
        }
        if (lateCleanups.size) {
          try { await withTimeout(Promise.allSettled([...lateCleanups]), closeTimeoutMs, `late cleanup ${name}`); }
          catch (error) {
            errors.push(new ScenarioLifecycleError(
              `could not confirm late cleanup of ${name}: ${error.message}`,
              { cause: error, phase: `cleanup (${phase})` },
            ));
          }
        }
        if (errors.length) {
          const detail = errors.map(error => error.message).join('; ');
          throw new ScenarioLifecycleError(
            `scenario cleanup failed: ${name} (phase: ${phase}): ${detail}`,
            { cause: errors[0], phase: `cleanup (${phase})`, cleanupConfirmed: false },
          );
        }
        return true;
      })();
      return closeP;
    },
  };
  return owner;
}

async function settleAfterCancellation(promise, milliseconds, name, phase) {
  try {
    await withTimeout(promise, milliseconds, `settling ${name}`);
  } catch (error) {
    if (error.message.startsWith('settling ')) {
      throw new ScenarioLifecycleError(
        `abandoned scenario did not settle after cancellation: ${name} (phase: ${phase})`,
        { cause: error, phase, cleanupConfirmed: false },
      );
    }
  }
}

export async function runWithDeadline(fn, milliseconds, name, owner, {
  cleanupGraceMs = 5_000,
} = {}) {
  const startedAt = Date.now();
  owner?.setPhase('scenario start');
  let timer;
  let timedOut = false;
  let scenarioError;
  let scenarioResult;
  const scenarioP = Promise.resolve().then(() => fn(owner)).catch((error) => {
    scenarioError = error;
    throw error;
  });
  try {
    scenarioResult = await Promise.race([
      scenarioP,
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          reject(new ScenarioLifecycleError(
            `scenario exceeded ${milliseconds}ms total deadline: ${name} (phase: ${owner?.phase || 'unknown'})`,
            { phase: owner?.phase || 'unknown', cleanupConfirmed: false },
          ));
        }, milliseconds);
      }),
    ]);
  } catch (error) {
    if (!timedOut) scenarioError = error;
  } finally {
    clearTimeout(timer);
  }

  if (timedOut) {
    owner?.cancel(`scenario deadline: ${name}`);
    try { await owner?.close(); }
    catch (cleanupError) {
      // Keep observing the abandoned promise so it cannot become an
      // unhandled rejection, but do not permit the suite to continue.
      await settleAfterCancellation(scenarioP, cleanupGraceMs, name, owner?.phase || 'unknown').catch(() => {});
      throw cleanupError;
    }
    await settleAfterCancellation(scenarioP, cleanupGraceMs, name, owner?.phase || 'unknown');
    throw new ScenarioLifecycleError(
      `scenario exceeded ${milliseconds}ms total deadline: ${name} (phase: ${owner?.phase || 'unknown'}, elapsed: ${Date.now() - startedAt}ms)`,
      { phase: owner?.phase || 'unknown', cleanupConfirmed: true },
    );
  }

  await owner?.close();
  if (scenarioError) throw scenarioError;
  return scenarioResult;
}

function observeErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
  });
  return errors;
}

async function hasStableWebGL(owner) {
  const page = await owner.newPage();
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
let activeOwner;
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
    let webglAvailable = false;
    let preflightOK = true;
    const preflightOwner = createScenarioOwner(browser, 'initial WebGL preflight');
    activeOwner = preflightOwner;
    try {
      webglAvailable = await runWithDeadline(async owner => {
        owner.setPhase('initial WebGL stability preflight');
        return hasStableWebGL(owner);
      }, scenarioOperationTimeout, 'initial WebGL preflight', preflightOwner);
    } catch (error) {
      preflightOK = false;
      process.exitCode = 1;
      console.error(`FAIL initial WebGL preflight\n${error.stack || error}`);
    } finally {
      if (!preflightOwner.closeStarted) {
        try { await preflightOwner.close(); }
        catch (error) {
          preflightOK = false;
          process.exitCode = 1;
          console.error(`FAIL initial WebGL preflight cleanup\n${error.stack || error}`);
        }
      }
      if (browser === preflightOwner.browser) browser = undefined;
      activeOwner = undefined;
    }

    if (preflightOK) test('static fallback boots without uncaught errors', async (owner) => {
      owner.setPhase('static fallback navigation');
      const page = await owner.newPage();
      const errors = observeErrors(page);
      await page.goto(`${base}/static/`, { waitUntil: 'networkidle', timeout: scenarioOperationTimeout });
      await page.waitForFunction(() => window.staticJourney?.chapter === 'mission');
      assert.equal(await page.locator('html').getAttribute('class').then(v => v?.includes('no-js')), false);
      await assertNoErrors(errors);
      await page.close();
    });

    if (preflightOK) test('static fallback remains useful without JavaScript', async (owner) => {
      owner.setPhase('static no-JS navigation');
      const context = await owner.newContext({ javaScriptEnabled: false });
      const page = await owner.newPage(context);
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

    if (preflightOK) test('interactive tier exposes visitor-safe fallback when WebGL creation fails', async (owner) => {
      owner.setPhase('interactive fallback navigation');
      const context = await owner.newContext();
      await context.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
          if (kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl') return null;
          return original.call(this, kind, ...args);
        };
      });
      const page = await owner.newPage(context);
      try {
        await page.goto(`${base}/?nointro=1`, { waitUntil: 'domcontentloaded' });
        const fallback = page.locator('[role="status"] a[href="./static/"]');
        await fallback.waitFor({ state: 'visible', timeout: 15_000 });
        assert.match(await page.locator('[role="status"]').innerText(), /could not start|static journey/i);
      } finally {
        await context.close();
      }
    });

    if (preflightOK) test('static chapter navigation is observable', async (owner) => {
      owner.setPhase('static chapter navigation');
      const page = await owner.newPage();
      await page.goto(`${base}/static/`, { waitUntil: 'domcontentloaded' });
      const nav = page.locator('.rail-item[data-nav="connect"]');
      await nav.focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => window.staticJourney?.chapter === 'connect');
      assert.equal(await page.locator('.rail-item[data-nav="connect"]').getAttribute('aria-current'), 'true');
      assert.equal(await page.locator('.still[data-chapter="connect"]').evaluate(el => el.classList.contains('on')), true);
      await page.close();
    });

    if (preflightOK) test('static deep-link aliases resolve to canonical detail', async (owner) => {
      owner.setPhase('static alias navigation');
      const page = await owner.newPage();
      await page.goto(`${base}/static/#/inspire/2rp`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.staticJourney?.detail === 'tworp');
      assert.equal(await page.locator('#d-tworp').isVisible(), true);
      assert.equal(new URL(page.url()).hash, '#/inspire/tworp');
      await page.close();
    });

    if (preflightOK) test('static keyboard and pointer disclosures open and close', async (owner) => {
      owner.setPhase('static disclosure interaction');
      const page = await owner.newPage();
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

    if (preflightOK) test('reduced motion exposes the static door and removes smooth static scrolling', async (owner) => {
      owner.setPhase('reduced-motion navigation');
      const context = await owner.newContext({ reducedMotion: 'reduce' });
      const page = await owner.newPage(context);
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

    if (preflightOK) test('live journey boots cleanly and supports navigation, aliases, and card input', async (owner) => {
      if (!webglAvailable) {
        throw new CoverageUnavailableError('live WebGL preflight context unavailable');
      }
      const liveBrowser = owner;
      owner.setPhase('live WebGL stability preflight');
      if (!await hasStableWebGL(liveBrowser)) {
        throw new CoverageUnavailableError('live WebGL fresh-browser context unavailable');
      }
      owner.setPhase('live context creation');
      const context = await liveBrowser.newContext({
        viewport: { width: 1280, height: 800 },
        hasTouch: true,
        reducedMotion: 'reduce',
      });
      const page = await liveBrowser.newPage(context);
      const errors = observeErrors(page);
      try {
        owner.setPhase('live journey navigation');
        await page.goto(`${base}/?capture=owned&steady=1&photos=0`, { waitUntil: 'domcontentloaded', timeout: liveOperationTimeout });
        owner.setPhase('live journey readiness');
        const state = await Promise.race([
          page.waitForFunction(() => window.journey, null, { timeout: liveOperationTimeout }).then(() => 'ready'),
          page.waitForSelector('[role="status"] a[href="./static/"]', { state: 'visible', timeout: liveOperationTimeout }).then(() => 'fallback'),
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
        owner.setPhase('live contributor card open');
        const hotspot = page.locator('.j-hot.vis[data-node^="contributor-"][aria-expanded="false"]').first();
        await hotspot.evaluate(el => el.focus());
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => window.journey?.detail?.startsWith('contributor-'));
        assert.equal(await page.locator('.j-card.open.sheet').isVisible(), true);
        owner.setPhase('live contributor card close');
        await page.locator('.j-card-x').tap();
        await page.waitForFunction(() => window.journey?.detail === null);

        owner.setPhase('live Connect navigation');
        const nav = page.locator('.j-rail-item[data-chapter="connect"]');
        await nav.evaluate(el => el.focus());
        await page.keyboard.press('Enter');
        await page.waitForFunction(() => window.journey?.chapter === 'connect');
        assert.equal(await nav.getAttribute('aria-current'), 'true');
        await assertNoErrors(errors);
      } finally {
        await context.close();
      }
    }, liveScenarioTimeout);

    let failures = 0;
    for (const { name, fn, deadline } of tests) {
      let owner;
      let stopAfterScenario = false;
      try {
        activeBrowser = await launchBrowser(chrome);
        browser = activeBrowser;
        owner = createScenarioOwner(activeBrowser, name);
        activeOwner = owner;
        await runWithDeadline(fn, deadline, name, owner);
        console.log(`PASS ${name}`);
      } catch (error) {
        if (error instanceof CoverageUnavailableError && reportUnavailable(error.message)) {
          console.log(`SKIP ${name}`);
        } else {
          failures += 1;
          console.error(`FAIL ${name}\n${error.stack || error}`);
          stopAfterScenario = error instanceof ScenarioLifecycleError
            && error.cleanupConfirmed === false;
        }
      } finally {
        if (owner && !owner.closeStarted) {
          try { await owner.close(); }
          catch (error) {
            failures += 1;
            stopAfterScenario = true;
            console.error(`FAIL ${name} cleanup\n${error.stack || error}`);
          }
        }
        if (browser === activeBrowser) browser = undefined;
        activeBrowser = undefined;
        activeOwner = undefined;
      }
      if (stopAfterScenario) break;
    }
    if (failures) process.exitCode = 1;
  }
} finally {
  try { await activeOwner?.close(); }
  catch (error) { process.exitCode = 1; console.error(`FAIL suite cleanup\n${error.stack || error}`); }
  if (!activeOwner && browser) {
    try { await closeConfirmed(browser, 'suite browser', 5_000); }
    catch (error) { process.exitCode = 1; console.error(`FAIL suite browser cleanup\n${error.stack || error}`); }
  }
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
