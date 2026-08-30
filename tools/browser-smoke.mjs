import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import os from 'node:os';
import process from 'node:process';
import { existsSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HOST = '127.0.0.1';
const scenarioTimeout = 45_000;
// Individual operations stay inside the scenario's total deadline, leaving
// time for owner cancellation and confirmed resource cleanup.
const scenarioOperationTimeout = scenarioTimeout - 5_000;
// The coordinator measured live-journey's post-boot interaction waits
// (chapter nav, card open/close) hitting Playwright's *implicit* 30_000ms
// default under forced software rendering: 24,158ms to boot leaves too
// little of that 30s window for the subsequent waitForFunction calls to
// land. Under the real GPU path (--use-angle=metal) the same interactions
// measured ~12ms. LIVE_INTERACTION_TIMEOUT_MS makes that budget explicit
// instead of relying on Playwright's default: 20_000ms is ~1,600x the
// measured 12ms metal interaction time (generous margin for a cold GPU's
// first shader compile / card-open animation on slower CI hardware), while
// staying far short of the scenario's own 120_000ms total deadline so a
// genuine hang still fails within a single, attributable wait instead of
// being swallowed by the outer catch-all until the very end.
const LIVE_INTERACTION_TIMEOUT_MS = 20_000;
const LIVE_JOURNEY_DEADLINE_MS = 120_000;
const LIVE_OPERATION_TIMEOUT_MS = Math.min(90_000, LIVE_JOURNEY_DEADLINE_MS - 5_000);

// D12 (coordinator repair, post-D11-acceptance): a phase tag set by the
// call site itself, not inferred from the configured ms value. R1's review
// of D11 verified that ms-coincidence inference (interaction because the
// message happened to say "20000ms") would silently misclassify a future
// boot-phase wait that also happened to use 20_000ms. The tag below is
// structural: it is attached only by awaitInteraction(), only to a timeout
// thrown from one of the three post-boot interaction waits, so no numeric
// coincidence elsewhere can ever produce it.
const INTERACTION_PHASE = Symbol('browser-smoke:interaction-phase');

export async function awaitInteraction(run) {
  try {
    return await run();
  } catch (error) {
    if (error && typeof error === 'object') {
      try {
        error[INTERACTION_PHASE] = true;
      } catch {
        // A frozen/non-extensible error-like value can't carry the tag.
        // That is not a problem: classifyTimeoutSite's default for an
        // untagged timeout is 'boot', the conservative bucket that keeps
        // D11 row 3's swiftshader/unknown-renderer protection intact.
      }
    }
    throw error;
  }
}

// Exported only so the enforcement test can build/inspect tagged and
// untagged fixtures without duplicating the symbol. Classification logic
// elsewhere in this module always goes through classifyTimeoutSite, never
// reads this directly.
export function isInteractionPhaseTimeout(error) {
  return !!(error && typeof error === 'object' && error[INTERACTION_PHASE] === true);
}

export const CLASS = Object.freeze({
  PASS: 'pass',
  APPLICATION_FAIL: 'application-fail',
  ENVIRONMENT_BLOCKED: 'environment-blocked',
  HARNESS_FAIL: 'harness-fail',
});

const EXIT_CODES = Object.freeze({
  [CLASS.PASS]: 0,
  [CLASS.APPLICATION_FAIL]: 1,
  [CLASS.HARNESS_FAIL]: 2,
  [CLASS.ENVIRONMENT_BLOCKED]: 3,
});

const PRECEDENCE = Object.freeze({
  [CLASS.HARNESS_FAIL]: 3,
  [CLASS.APPLICATION_FAIL]: 2,
  [CLASS.ENVIRONMENT_BLOCKED]: 1,
  [CLASS.PASS]: 0,
});

export class UsageError extends Error {}

export class CoverageUnavailableError extends Error {}

// Missing browser/WebGL coverage is not a pass by default. Developers may
// opt into an explicit, machine-readable skip for constrained environments.
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

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export function parseArgs(argv) {
  const result = { scenarios: [], renderer: 'gpu', mode: 'permissive', report: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--scenario') {
      const value = argv[i += 1];
      if (!value) throw new UsageError('--scenario requires a value');
      result.scenarios.push(value);
    } else if (arg.startsWith('--scenario=')) {
      result.scenarios.push(arg.slice('--scenario='.length));
    } else if (arg === '--renderer') {
      result.renderer = argv[i += 1];
    } else if (arg.startsWith('--renderer=')) {
      result.renderer = arg.slice('--renderer='.length);
    } else if (arg === '--mode') {
      result.mode = argv[i += 1];
    } else if (arg.startsWith('--mode=')) {
      result.mode = arg.slice('--mode='.length);
    } else if (arg === '--report') {
      result.report = argv[i += 1];
    } else if (arg.startsWith('--report=')) {
      result.report = arg.slice('--report='.length);
    } else {
      throw new UsageError(`unknown argument: ${arg}`);
    }
  }
  if (result.mode !== 'permissive' && result.mode !== 'required') {
    throw new UsageError(`--mode must be 'permissive' or 'required', got '${result.mode}'`);
  }
  if (result.renderer !== 'gpu' && result.renderer !== 'swiftshader') {
    throw new UsageError(`--renderer must be 'gpu' or 'swiftshader', got '${result.renderer}'`);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Renderer mode
// ---------------------------------------------------------------------------

export function resolveRendererArgs(mode, platform) {
  if (mode === 'swiftshader') {
    return {
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
      degraded: true,
      label: 'swiftshader',
    };
  }
  if (platform === 'darwin') {
    return { args: ['--use-angle=metal'], degraded: false, label: 'gpu-metal' };
  }
  // Only the darwin/metal path was measured and validated by this order's
  // coordinator. Elsewhere, prefer Chrome's own default ANGLE backend over
  // forcing software rendering, but this is an unverified best-effort
  // default rather than a measured one.
  return { args: [], degraded: false, label: 'gpu-default' };
}

// ---------------------------------------------------------------------------
// Scenario registry
// ---------------------------------------------------------------------------

// `base` and `webglAvailable` are assigned by main() before any scenario's
// `run` function is actually invoked; the closures below only read them at
// call time, so defining SCENARIOS at module scope (for ID export without
// running main) is safe.
let base;
let webglAvailable;

function observeErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
  });
  return errors;
}

async function assertNoErrors(errors) {
  await new Promise(resolve => setTimeout(resolve, 150));
  assert.deepEqual(errors, [], errors.join('\n'));
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

export const SCENARIOS = [
  {
    id: 'fallback-boot',
    title: 'static fallback boots without uncaught errors',
    requiresGpu: false,
    deadline: scenarioTimeout,
    run: async browser => {
      const page = await browser.newPage();
      const errors = observeErrors(page);
      await page.goto(`${base}/static/`, { waitUntil: 'networkidle', timeout: scenarioOperationTimeout });
      await page.waitForFunction(() => window.staticJourney?.chapter === 'mission');
      assert.equal(await page.locator('body').getAttribute('class').then(v => v?.includes('no-js')), false);
      await assertNoErrors(errors);
      await page.close();
    },
  },
  {
    id: 'no-js',
    title: 'static fallback remains useful without JavaScript',
    requiresGpu: false,
    deadline: scenarioTimeout,
    run: async browser => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await browser.newPage(context);
      try {
        await page.goto(`${base}/static/`, { waitUntil: 'domcontentloaded' });
        assert.equal(await page.locator('main section[data-chapter]').count(), 5);
        assert.ok(await page.locator('main a[href]').count() > 0);
        assert.equal(await page.locator('canvas').count(), 0);
      } finally {
        await context.close();
      }
    },
  },
  {
    id: 'webgl-fallback',
    title: 'interactive tier exposes visitor-safe fallback when WebGL creation fails',
    requiresGpu: false,
    deadline: scenarioTimeout,
    run: async browser => {
      const context = await browser.newContext();
      await context.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
          if (kind === 'webgl' || kind === 'webgl2' || kind === 'experimental-webgl') return null;
          return original.call(this, kind, ...args);
        };
      });
      const page = await browser.newPage(context);
      try {
        await page.goto(`${base}/?nointro=1`, { waitUntil: 'domcontentloaded' });
        const fallback = page.locator('[role="status"] a[href="./static/"]');
        await fallback.waitFor({ state: 'visible', timeout: 15_000 });
        assert.match(await page.locator('[role="status"]').innerText(), /could not start|static journey/i);
      } finally {
        await context.close();
      }
    },
  },
  {
    id: 'static-navigation',
    title: 'static chapter navigation is observable',
    requiresGpu: false,
    deadline: scenarioTimeout,
    run: async browser => {
      const page = await browser.newPage();
      await page.goto(`${base}/static/`, { waitUntil: 'domcontentloaded' });
      await page.mouse.wheel(0, 420);
      await page.waitForTimeout(80);
      assert.equal(await page.evaluate(() => window.scrollY), 0);
      assert.equal(await page.evaluate(() => window.staticJourney?.chapter), 'mission');
      assert.equal(await page.locator('.rail').evaluate(el => el.classList.contains('rail-wave')), true);
      await page.keyboard.press('PageDown');
      assert.equal(await page.evaluate(() => window.staticJourney?.chapter), 'mission');
      const nav = page.locator('.rail-item[data-nav="connect"]');
      await nav.focus();
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => window.staticJourney?.chapter === 'connect');
      assert.equal(await page.locator('.rail-item[data-nav="connect"]').getAttribute('aria-current'), 'true');
      assert.equal(await page.locator('.still[data-chapter="connect"]').evaluate(el => el.classList.contains('on')), true);
      assert.equal(await page.evaluate(() => window.scrollY), 0);
      await page.close();
    },
  },
  {
    id: 'static-alias',
    title: 'static deep-link aliases resolve to canonical detail',
    requiresGpu: false,
    deadline: scenarioTimeout,
    run: async browser => {
      const page = await browser.newPage();
      await page.goto(`${base}/static/#/inspire/2rp`, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => window.staticJourney?.detail === 'tworp');
      assert.equal(await page.locator('#d-tworp').isVisible(), true);
      assert.equal(new URL(page.url()).hash, '#/inspire/tworp');
      await page.close();
    },
  },
  {
    id: 'static-input',
    title: 'static keyboard and pointer disclosures open and close',
    requiresGpu: false,
    deadline: scenarioTimeout,
    run: async browser => {
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
    },
  },
  {
    id: 'reduced-motion',
    title: 'reduced motion exposes the static door and removes smooth static scrolling',
    requiresGpu: false,
    deadline: scenarioTimeout,
    run: async browser => {
      const context = await browser.newContext({ reducedMotion: 'reduce' });
      const page = await browser.newPage(context);
      try {
        await page.goto(`${base}/static/`, { waitUntil: 'domcontentloaded' });
        assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
        assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
        await page.goto(`${base}/?nointro=1`, { waitUntil: 'domcontentloaded' });
        assert.equal(await page.locator('.static-door').isVisible(), true);
      } finally {
        await context.close();
      }
    },
  },
  {
    id: 'live-journey',
    title: 'live journey boots cleanly and supports navigation, aliases, and card input',
    requiresGpu: true,
    deadline: LIVE_JOURNEY_DEADLINE_MS,
    run: async browser => {
      if (!webglAvailable) {
        console.log('SKIP live WebGL assertions: persistent preflight context unavailability');
        return 'environment-blocked';
      }
      const liveBrowser = browser;
      if (!await hasStableWebGL(liveBrowser)) {
        console.log('SKIP live WebGL assertions: persistent fresh-browser context unavailability');
        return 'environment-blocked';
      }
      const context = await liveBrowser.newContext({
        viewport: { width: 1280, height: 800 },
        hasTouch: true,
        reducedMotion: 'reduce',
      });
      const page = await liveBrowser.newPage(context);
      const errors = observeErrors(page);
      try {
        await page.goto(`${base}/?capture=owned&steady=1&photos=0`, { waitUntil: 'domcontentloaded', timeout: LIVE_OPERATION_TIMEOUT_MS });
        const state = await Promise.race([
          page.waitForFunction(() => window.journey, null, { timeout: LIVE_OPERATION_TIMEOUT_MS }).then(() => 'ready'),
          page.waitForSelector('[role="status"] a[href="./static/"]', { state: 'visible', timeout: LIVE_OPERATION_TIMEOUT_MS }).then(() => 'fallback'),
        ]);
        assert.equal(state, 'ready', `application fallback was reached: ${errors.join(' | ')}`);
        assert.equal(await page.evaluate(() => window.journey.heroIntroSkipped), true);
        assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
        assert.equal(await page.locator('.static-door').isVisible(), true);
        assert.equal(new URL(page.url()).hash, '');

        const chapterBeforeScrollAttempts = await page.evaluate(() => window.journey?.chapter);
        await page.mouse.wheel(0, 520);
        await page.waitForTimeout(80);
        assert.equal(await page.evaluate(() => window.journey?.chapter), chapterBeforeScrollAttempts,
          'wheel changed the live journey chapter');
        assert.equal(await page.evaluate(() => window.scrollY), 0,
          'wheel moved the live document');
        assert.equal(await page.locator('.j-rail').evaluate(el => el.classList.contains('j-rail-wave')), true,
          'wheel did not cue the live journey rail');
        await page.keyboard.press('PageDown');
        assert.equal(await page.evaluate(() => window.journey?.chapter), chapterBeforeScrollAttempts,
          'PageDown changed the live journey chapter');

        // Owned's authored button is a zero-box wrapper around its face-sized
        // hit disc, so Playwright's `:visible` heuristic cannot target the
        // semantic control itself. Exercise its native keyboard activation;
        // pointer geometry is covered by the chapter's dedicated UI probes.
        const hotspot = page.locator('.j-hot.vis[data-node^="contributor-"][aria-expanded="false"]').first();
        await hotspot.evaluate(el => el.focus());
        await page.keyboard.press('Enter');
        await awaitInteraction(() => page.waitForFunction(() => window.journey?.detail?.startsWith('contributor-'), null, { timeout: LIVE_INTERACTION_TIMEOUT_MS }));
        assert.equal(await page.locator('.j-card.open.sheet').isVisible(), true);
        await page.locator('.j-card-x').tap();
        await awaitInteraction(() => page.waitForFunction(() => window.journey?.detail === null, null, { timeout: LIVE_INTERACTION_TIMEOUT_MS }));

        // Settled Ownership intentionally hides/inerts the five-item row.
        // Return through the centred Purpose parent before exercising another
        // top-level destination; this also proves the subtree can jump back
        // out without reaching through its hidden sibling surface.
        const purposeParent = page.locator('.j-rail-purpose-parent');
        await purposeParent.evaluate(el => el.focus());
        await page.keyboard.press('Enter');
        await awaitInteraction(() => page.waitForFunction(
          () => window.journey?.chapter === 'final',
          null,
          { timeout: LIVE_INTERACTION_TIMEOUT_MS },
        ));

        const nav = page.locator('.j-rail-item[data-chapter="connect"]');
        await nav.evaluate(el => el.focus());
        await page.keyboard.press('Enter');
        await awaitInteraction(() => page.waitForFunction(() => window.journey?.chapter === 'connect', null, { timeout: LIVE_INTERACTION_TIMEOUT_MS }));
        assert.equal(await nav.getAttribute('aria-current'), 'true');
        await assertNoErrors(errors);
      } finally {
        await context.close();
      }
    },
  },
];

export const IMPLEMENTED_SCENARIO_IDS = SCENARIOS.map(s => s.id);
// Defined by the runbook but out of scope for this order — belongs to C02.
// Listed here (not silently unknown) so requesting one fails loudly and
// explains why, instead of resolving to a silent zero-scenario pass.
export const RESERVED_SCENARIO_IDS = ['live-desktop', 'live-touch', 'live-reduced-motion'];
export const ALL_KNOWN_SCENARIO_IDS = [...IMPLEMENTED_SCENARIO_IDS, ...RESERVED_SCENARIO_IDS];

export function resolveScenarioSelection(requestedIds) {
  if (!requestedIds.length) return IMPLEMENTED_SCENARIO_IDS.slice();
  const unknown = requestedIds.filter(id => !ALL_KNOWN_SCENARIO_IDS.includes(id));
  if (unknown.length) {
    throw new UsageError(
      `unknown scenario id(s): ${unknown.join(', ')}. ` +
      `Known ids: ${IMPLEMENTED_SCENARIO_IDS.join(', ')} ` +
      `(reserved, not implemented in this order: ${RESERVED_SCENARIO_IDS.join(', ')})`,
    );
  }
  const reserved = requestedIds.filter(id => RESERVED_SCENARIO_IDS.includes(id));
  if (reserved.length) {
    throw new UsageError(
      `scenario id(s) reserved for a future order (C02), not implemented here: ${reserved.join(', ')}`,
    );
  }
  const selected = [...new Set(requestedIds)];
  if (!selected.length) throw new UsageError('no scenarios selected');
  return selected;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

export function isTimeoutError(error) {
  return /^scenario exceeded \d+ms total deadline/.test(error?.message || '')
    || /Timeout \d+ms exceeded/.test(error?.message || '');
}

// D11 (coordinator repair, post-Q03-acceptance): WHEN a timeout fires
// distinguishes what it means. D12 (coordinator repair, post-D11-review):
// R1 verified that inferring the phase from Playwright's embedded ms value
// alone is a numeric-coincidence fingerprint -- correct today, silently
// wrong the day a boot-phase wait happens to also use 20_000ms. The phase
// is read from the structural tag awaitInteraction() attaches (see
// isInteractionPhaseTimeout above), which is set by the call site, not by
// any number.
//
// D14 (coordinator repair, post-D12-review): R1 found that D12's tag alone
// was TOO trusting: awaitInteraction() tags every error it catches, not
// only timeouts, so a genuine non-timeout failure (a dropped CDP
// connection, a destroyed execution context, a browser crash) surfacing
// from inside one of the three wrapped interaction waits was tagged and
// then misread as an interaction TIMEOUT purely because it was tagged --
// reintroducing, via the tag, exactly the "point someone at a nonexistent
// app bug" failure mode D11 exists to prevent. The fix: the structural tag
// is NECESSARY but not SUFFICIENT. 'interaction' requires BOTH the tag AND
// a genuinely timeout-shaped message; a tagged-but-not-timeout-shaped error
// is treated exactly as if it had never been tagged at all, falling
// through to the same harness-fail/unexpected-error path an identical
// error thrown outside the wrapper would reach -- so tagging can no longer
// manufacture an application-fail out of something that was never a
// timeout. An untagged timeout is still 'boot' -- D12's safe default,
// unchanged, which keeps D11 row 3's swiftshader/unknown-renderer
// protection intact.
export function classifyTimeoutSite(error) {
  const msg = typeof error === 'string' ? error : (error?.message || '');
  const timeoutShaped = /Timeout \d+ms exceeded/.test(msg) || /^scenario exceeded \d+ms total deadline/.test(msg);
  if (!timeoutShaped) return null;
  return isInteractionPhaseTimeout(error) ? 'interaction' : 'boot';
}

// Pure decision: given how a single scenario attempt concluded, what class
// does it belong to? Kept separate from the Playwright plumbing so it can be
// exercised with injected fakes, without launching a browser.
//
// Coordinator decision D11 overrides the original blanket
// "timeout -> harness-fail" mapping with a WHEN-it-fires distinction:
//   1. Post-boot / interaction timeout (a LIVE_INTERACTION_TIMEOUT_MS site):
//      the app booted and reached readiness, so a stalled interaction is
//      strong evidence of a genuine hang -> application-fail, always.
//   2. Boot / readiness timeout (never reached readiness): stays
//      harness-fail, BUT escalates to application-fail when the renderer is
//      the non-degraded reference GPU path (measured cold boot 12,018ms
//      against a 90,000ms budget -- failing to boot in 90s on real GPU is
//      an application problem, not environment noise). Stays harness-fail
//      on an explicitly degraded (swiftshader) renderer.
//   3. Every timeout-class harness-fail carries requiresTriage: true and is
//      never auto-retried (this harness has no retry logic to begin with;
//      the flag persists the "do not auto-dismiss as flaky" signal into the
//      machine-readable report for whatever consumes it next).
export function classifyOutcome({ threw, error, returnValue, rendererMode, rendererDegraded }) {
  if (!threw) {
    if (returnValue === 'environment-blocked') {
      return { classification: CLASS.ENVIRONMENT_BLOCKED, reason: 'webgl-unavailable-fresh-context' };
    }
    return { classification: CLASS.PASS };
  }
  if (error instanceof assert.AssertionError) {
    return { classification: CLASS.APPLICATION_FAIL, reason: 'assertion', error: error.message };
  }
  const site = classifyTimeoutSite(error);
  if (site === 'interaction') {
    return { classification: CLASS.APPLICATION_FAIL, reason: 'interaction-timeout', error: error.message, rendererMode, rendererDegraded };
  }
  if (site === 'boot') {
    if (rendererDegraded === false) {
      // Never reached readiness on the non-degraded reference GPU path
      // (measured cold boot: 12,018ms against a 90,000ms budget). That is
      // an application problem, not environment noise.
      return { classification: CLASS.APPLICATION_FAIL, reason: 'boot-timeout-on-reference-renderer', error: error.message, rendererMode, rendererDegraded };
    }
    // Unchanged classification/reason from before D11 -- only the
    // provenance (rendererMode/rendererDegraded) and the requiresTriage
    // flag are new.
    return { classification: CLASS.HARNESS_FAIL, reason: 'timeout', error: error.message, rendererMode, rendererDegraded, requiresTriage: true };
  }
  return { classification: CLASS.HARNESS_FAIL, reason: 'unexpected-error', error: error?.stack || String(error) };
}

// Pure decision: does the environment preflight (chrome missing / launch
// failed / webgl unavailable) block a given scenario before its body even
// runs?
export function classifyPreflight({ chromeFound, launchError, webglAvailable: webgl, scenarioRequiresGpu }) {
  if (!chromeFound) return { classification: CLASS.ENVIRONMENT_BLOCKED, reason: 'no-chromium-executable' };
  if (launchError) return { classification: CLASS.ENVIRONMENT_BLOCKED, reason: 'launch-failed', error: String(launchError.message || launchError) };
  if (scenarioRequiresGpu && !webgl) return { classification: CLASS.ENVIRONMENT_BLOCKED, reason: 'webgl-unavailable-preflight' };
  return null;
}

export function combineOverall(classifications) {
  if (!classifications.length) return CLASS.HARNESS_FAIL;
  return classifications.reduce((worst, c) => (PRECEDENCE[c] > PRECEDENCE[worst] ? c : worst), CLASS.PASS);
}

export function resolveExitCode(classification, mode) {
  if (classification === CLASS.PASS) return 0;
  if (classification === CLASS.ENVIRONMENT_BLOCKED && mode === 'permissive') return 0;
  return EXIT_CODES[classification];
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export function buildReport({ mode, provenance, scenarios, overall, cleanup }) {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    mode,
    provenance,
    scenarios,
    overall,
    cleanup,
  };
}

const REPORT_BEGIN_MARKER = '##BROWSER_SMOKE_REPORT_JSON_BEGIN##';
const REPORT_END_MARKER = '##BROWSER_SMOKE_REPORT_JSON_END##';

// ---------------------------------------------------------------------------
// Browser / process plumbing
// ---------------------------------------------------------------------------

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
  return candidates.find(candidate => existsSync(candidate));
}

// Set by main() before any launchBrowser() call; module-level so the
// scenario-agnostic launch helper doesn't need every call site to thread it
// through.
let profileRoot;
let activeRendererArgs = [];

function launchBrowser(chrome) {
  return chromium.launch({
    executablePath: chrome,
    headless: true,
    args: activeRendererArgs,
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
    Promise.resolve(promise).then(value => {
      clearTimeout(timer);
      resolve(value);
    }, error => {
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
  const hasState = typeof resource.isClosed === 'function'
    || typeof resource.isConnected === 'function'
    || 'closed' in resource;
  if (!settledClosed(resource) && hasState) {
    throw new ScenarioLifecycleError(`could not confirm closure of ${label}`, {
      phase: `cleanup ${label}`,
    });
  }
}

/** Own every page, context, and browser created for one scenario. */
export function createScenarioOwner(browser, name = 'scenario', { closeTimeoutMs = 5_000 } = {}) {
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
      if (cancelled || closing) {
        throw new ScenarioLifecycleError(
          `scenario cancelled: ${name} (phase: ${phase})`,
          { phase, cleanupConfirmed: false },
        );
      }
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
        const ordered = [...resources].reverse().sort((a, b) => {
          const rank = entry => entry.label === 'browser' ? 0 : entry.label === 'context' ? 1 : 2;
          return rank(b) - rank(a);
        });
        for (const { resource, label } of ordered) {
          try {
            await (lateCleanupByResource.get(resource)
              || closeConfirmed(resource, `${name} ${label}`, closeTimeoutMs));
          } catch (error) {
            errors.push(error);
          }
        }
        if (lateCleanups.size) {
          try {
            await withTimeout(Promise.allSettled([...lateCleanups]), closeTimeoutMs, `late cleanup ${name}`);
          } catch (error) {
            errors.push(new ScenarioLifecycleError(
              `could not confirm late cleanup of ${name}: ${error.message}`,
              { cause: error, phase: `cleanup (${phase})` },
            ));
          }
        }
        if (errors.length) {
          throw new ScenarioLifecycleError(
            `scenario cleanup failed: ${name} (phase: ${phase}): ${errors.map(error => error.message).join('; ')}`,
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

export async function runWithDeadline(fn, milliseconds, name, owner, { cleanupGraceMs = 5_000 } = {}) {
  const startedAt = Date.now();
  owner?.setPhase('scenario start');
  let timer;
  let timedOut = false;
  let scenarioError;
  let scenarioResult;
  const scenarioP = Promise.resolve().then(() => fn(owner)).catch(error => {
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
    try {
      await owner?.close();
    } catch (cleanupError) {
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

async function getWebglRendererString(owner) {
  const page = await owner.newPage();
  try {
    return await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) return null;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    });
  } catch {
    // Renderer-string probing is diagnostic only — it feeds the report's
    // provenance field, never a scenario's pass/fail. An unavailable
    // context/extension or an evaluate()-time error just omits that field.
    // (F06/D4: INTENTIONAL-SAFE, classified 2026-08-21, no behavior change.)
    return null;
  } finally {
    await page.close();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const cleanupIssues = [];
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(`USAGE ERROR: ${error.message}`);
      process.exitCode = EXIT_CODES[CLASS.HARNESS_FAIL];
      return;
    }
    throw error;
  }

  let selectedIds;
  try {
    selectedIds = resolveScenarioSelection(args.scenarios);
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(`USAGE ERROR: ${error.message}`);
      process.exitCode = EXIT_CODES[CLASS.HARNESS_FAIL];
      return;
    }
    throw error;
  }

  const rendererResolution = resolveRendererArgs(args.renderer, os.platform());
  activeRendererArgs = rendererResolution.args;

  profileRoot = await mkdtemp(join(tmpdir(), 'banodoco-browser-smoke-'));
  const port = await freePort();
  base = `http://${HOST}:${port}`;

  const server = spawn('python3', ['serve.py'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  });
  let serverError = '';
  server.stderr.on('data', chunk => { serverError += chunk; });

  const scenarioById = new Map(SCENARIOS.map(s => [s.id, s]));
  const results = [];
  let overall;
  let chrome;
  let browserVersion = null;
  let webglRenderer = null;

  try {
    try {
      await waitForServer(port, server);
    } catch (error) {
      for (const id of selectedIds) {
        results.push({ id, title: scenarioById.get(id).title, classification: CLASS.HARNESS_FAIL, reason: 'server-not-ready', error: error.message });
        console.error(`HARNESS-FAIL ${id} (server-not-ready): ${error.message}`);
      }
      const provenance = buildProvenance({ chrome: null, browserVersion: null, webglAvailable: false, webglRenderer: null, rendererResolution, port });
      await finalize({ args, selectedIds, results, overall: CLASS.HARNESS_FAIL, provenance, cleanupIssues, serverError });
      return;
    }

    chrome = executablePath();
    let launchError = null;
    let preflightBrowser = null;
    if (chrome) {
      try {
        preflightBrowser = await launchBrowser(chrome);
      } catch (error) {
        launchError = error;
      }
    }

    if (preflightBrowser) {
      const preflightOwner = createScenarioOwner(preflightBrowser, 'preflight');
      try {
        const preflight = await runWithDeadline(async owner => {
          owner.setPhase('WebGL preflight');
          return {
            browserVersion: owner.browser.version(),
            webglAvailable: await hasStableWebGL(owner),
            webglRenderer: await getWebglRendererString(owner),
          };
        }, scenarioTimeout, 'preflight', preflightOwner);
        browserVersion = preflight.browserVersion;
        webglAvailable = preflight.webglAvailable;
        webglRenderer = preflight.webglRenderer;
      } catch (error) {
        launchError = error;
        if (error instanceof ScenarioLifecycleError && !error.cleanupConfirmed) {
          cleanupIssues.push(`preflight cleanup was not confirmed: ${error.message}`);
        }
      }
    } else {
      webglAvailable = false;
    }

    const selectedRequiresGpu = selectedIds.some(id => scenarioById.get(id).requiresGpu);
    if (!chrome || launchError || (!webglAvailable && selectedRequiresGpu)) {
      const reason = !chrome
        ? 'no Chromium executable (set PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH)'
        : launchError
          ? `Chromium could not launch or complete preflight (${launchError.message.split('\n')[0]})`
          : 'WebGL unavailable in stable preflight context';
      reportUnavailable(reason);
    }

    // A missing/unlaunchable browser blocks every selected scenario
    // identically; a missing WebGL context only blocks scenarios that
    // actually require GPU rendering (checked per-scenario below).
    for (const id of selectedIds) {
      const scenario = scenarioById.get(id);
      const globalBlock = classifyPreflight({ chromeFound: !!chrome, launchError, webglAvailable, scenarioRequiresGpu: scenario.requiresGpu });
      if (globalBlock) {
        results.push({ id, title: scenario.title, classification: globalBlock.classification, reason: globalBlock.reason, error: globalBlock.error, durationMs: 0 });
        console.log(`ENVIRONMENT-BLOCKED ${id} (${globalBlock.reason})`);
        continue;
      }
      const started = Date.now();
      let activeBrowser;
      let activeOwner;
      let outcome;
      let stopAfterScenario = false;
      try {
        activeBrowser = await launchBrowser(chrome);
        activeOwner = createScenarioOwner(activeBrowser, id);
        const returnValue = await runWithDeadline(owner => {
          owner.setPhase(scenario.title);
          return scenario.run(owner);
        }, scenario.deadline, id, activeOwner);
        outcome = classifyOutcome({ threw: false, returnValue, rendererMode: rendererResolution.label, rendererDegraded: rendererResolution.degraded });
      } catch (error) {
        outcome = classifyOutcome({ threw: true, error, rendererMode: rendererResolution.label, rendererDegraded: rendererResolution.degraded });
        if (error instanceof ScenarioLifecycleError && error.cleanupConfirmed === false) {
          cleanupIssues.push(`scenario '${id}' cleanup was not confirmed: ${error.message}`);
          stopAfterScenario = true;
        }
      } finally {
        if (activeOwner && !activeOwner.closeStarted) {
          try {
            await activeOwner.close();
          } catch (error) {
            cleanupIssues.push(`scenario '${id}' cleanup was not confirmed: ${error.message}`);
            stopAfterScenario = true;
          }
        }
      }
      const durationMs = Date.now() - started;
      results.push({ id, title: scenario.title, ...outcome, durationMs });
      const label = { pass: 'PASS', 'application-fail': 'FAIL', 'harness-fail': 'HARNESS-FAIL', 'environment-blocked': 'ENVIRONMENT-BLOCKED' }[outcome.classification];
      if (outcome.classification === CLASS.PASS) {
        console.log(`${label} ${id}`);
      } else {
        console.error(`${label} ${id}${outcome.reason ? ` (${outcome.reason})` : ''}\n${outcome.error || ''}`);
      }
      if (stopAfterScenario) break;
    }

    overall = combineOverall(results.map(r => r.classification));
    const provenance = buildProvenance({ chrome, browserVersion, webglAvailable, webglRenderer, rendererResolution, port });
    await finalize({ args, selectedIds, results, overall, provenance, cleanupIssues, serverError });
  } finally {
    if (server.exitCode === null && server.signalCode === null) {
      try {
        // Negative PID targets the whole process group (server + any
        // children it spawned). That group can already be gone — the
        // process exited between the guard above and this call, or the
        // platform never formed a group for it — in which case the
        // fallback below signals the server PID directly. Either path
        // still lets teardown proceed. (F06/D4: INTENTIONAL-SAFE,
        // classified 2026-08-21, no behavior change.)
        process.kill(-server.pid, 'SIGTERM');
      } catch {
        server.kill('SIGTERM');
      }
      await Promise.race([
        new Promise(resolve => server.once('exit', resolve)),
        new Promise(resolve => setTimeout(resolve, 2_000)),
      ]);
      if (server.exitCode === null && server.signalCode === null) {
        try {
          // Same process-group-vs-direct-PID fallback as the SIGTERM
          // attempt above, one escalation later. (F06/D4: INTENTIONAL-SAFE,
          // classified 2026-08-21, no behavior change.)
          process.kill(-server.pid, 'SIGKILL');
        } catch {
          server.kill('SIGKILL');
        }
      }
    }
    if (server.exitCode === null && server.signalCode === null) {
      cleanupIssues.push(`server process ${server.pid} did not exit`);
    }
    await rm(profileRoot, { recursive: true, force: true });
    if (existsSync(profileRoot)) cleanupIssues.push(`temp profile dir still present: ${profileRoot}`);
    if (cleanupIssues.length) console.error(`CLEANUP ISSUES: ${cleanupIssues.join('; ')}`);
  }
}

function buildProvenance({ chrome, browserVersion, webglAvailable: webgl, webglRenderer, rendererResolution, port }) {
  return {
    browserExecutable: chrome ?? null,
    browserVersion: browserVersion ?? null,
    headless: true,
    rendererMode: rendererResolution.label,
    rendererDegraded: rendererResolution.degraded,
    launchArgs: rendererResolution.args,
    defaultViewport: { width: 1280, height: 720 },
    defaultDeviceScaleFactor: 1,
    note: "live-journey overrides its own context to viewport 1280x800 with hasTouch and reducedMotion:'reduce'",
    webglAvailable: webgl,
    webglRenderer: webglRenderer ?? null,
    os: { platform: os.platform(), release: os.release(), arch: os.arch() },
    servedBaseUrl: base,
    port,
  };
}

async function finalize({ args, selectedIds, results, overall, provenance, cleanupIssues, serverError }) {
  // A leftover process/temp path after teardown is itself a harness-level
  // fault; fold it into the overall classification rather than reporting a
  // clean pass over an unverified cleanup.
  const finalOverall = cleanupIssues.length ? combineOverall([overall, CLASS.HARNESS_FAIL]) : overall;
  const allowCoverageSkip = process.env.BROWSER_SMOKE_ALLOW_SKIP === '1';
  const exitCode = finalOverall === CLASS.ENVIRONMENT_BLOCKED && !allowCoverageSkip
    ? 1
    : resolveExitCode(finalOverall, args.mode);
  const report = buildReport({
    mode: args.mode,
    provenance,
    scenarios: results,
    overall: { classification: finalOverall, exitCode, requestedScenarioIds: selectedIds },
    cleanup: { verified: cleanupIssues.length === 0, issues: cleanupIssues },
  });
  console.log(REPORT_BEGIN_MARKER);
  console.log(JSON.stringify(report, null, 2));
  console.log(REPORT_END_MARKER);
  if (args.report) {
    await writeFile(args.report, JSON.stringify(report, null, 2));
  }
  if (finalOverall !== CLASS.PASS) {
    if (finalOverall === CLASS.ENVIRONMENT_BLOCKED && exitCode === 0) {
      console.log(`ENVIRONMENT-BLOCKED (permissive mode, exit 0): this is NOT a verified application pass. ${results.filter(r => r.classification !== CLASS.PASS).map(r => r.id).join(', ')}`);
    } else {
      console.error(`OVERALL: ${finalOverall} (mode=${args.mode}, exit=${exitCode})`);
    }
  }
  if (serverError && exitCode) console.error(serverError.trim());
  process.exitCode = exitCode;
}

const isMain = (() => {
  if (!process.argv[1]) return false;
  try {
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  } catch {
    // pathToFileURL() throws on a value that isn't a valid absolute path
    // (process.argv[1] is host/loader-supplied, not this module's own
    // input). Direct execution requires that comparison to succeed, so a
    // malformed argv[1] safely means "not run directly" — the module was
    // imported as a dependency instead, exactly like the guard above for
    // a missing argv[1]. (F06/D4: INTENTIONAL-SAFE, classified 2026-08-21,
    // no behavior change.)
    return false;
  }
})();

if (isMain) {
  await main();
}
