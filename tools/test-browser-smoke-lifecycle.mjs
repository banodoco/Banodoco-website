import assert from 'node:assert/strict';

import {
  createScenarioOwner,
  runWithDeadline,
  ScenarioLifecycleError,
} from './browser-smoke.mjs';

const pause = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds));

function fakeBrowser({ browserClose = 'close', closeDelay = 0, newContextDelay = 0, newPageDelay = 0 } = {}) {
  const resources = new Set();
  const makeResource = (kind) => {
    const resource = {
      kind,
      closed: false,
      closeCalls: 0,
      async close() {
        resource.closeCalls += 1;
        if (closeDelay) await pause(closeDelay);
        if (resource.closeMode === 'hang') return new Promise(() => {});
        resource.closed = true;
      },
      closeMode: 'close',
    };
    resources.add(resource);
    return resource;
  };
  const browser = makeResource('browser');
  browser.closeMode = browserClose;
  browser.isConnected = () => !browser.closed;
  browser.newContext = async () => {
    if (newContextDelay) await pause(newContextDelay);
    const context = makeResource('context');
    context.newPage = async () => {
      if (newPageDelay) await pause(newPageDelay);
      return makeResource('page');
    };
    return context;
  };
  browser.newPage = async () => {
    if (newPageDelay) await pause(newPageDelay);
    return makeResource('page');
  };
  return { browser, resources };
}

async function assertTimedOut(owner, name = 'synthetic timeout') {
  await assert.rejects(
    runWithDeadline(async (scenario) => {
      scenario.setPhase('synthetic wait');
      await pause(40);
      scenario.throwIfCancelled();
    }, 8, name, owner, { cleanupGraceMs: 100 }),
    (error) => {
      assert(error instanceof ScenarioLifecycleError);
      assert.match(error.message, /exceeded 8ms/);
      assert.match(error.message, /phase: synthetic wait/);
      assert.equal(error.cleanupConfirmed, true);
      return true;
    },
  );
}

// Successful scenario values must survive the deadline wrapper; the live
// preflight uses this result to decide whether live coverage is available.
{
  const fixture = fakeBrowser();
  const owner = createScenarioOwner(fixture.browser, 'synthetic-result', { closeTimeoutMs: 100 });
  const result = await runWithDeadline(async scenario => {
    scenario.setPhase('successful result');
    return { webgl: true };
  }, 100, 'synthetic-result', owner);
  assert.deepEqual(result, { webgl: true });
  assert.equal(fixture.browser.closed, true);
}

// A timed-out callback is cancelled, its page/context/browser owner is closed,
// and it cannot perform a post-timeout mutation when it resumes.
{
  const fixture = fakeBrowser();
  const owner = createScenarioOwner(fixture.browser, 'synthetic-one', { closeTimeoutMs: 100 });
  let lateMutation = 0;
  await assert.rejects(
    runWithDeadline(async (scenario) => {
      scenario.setPhase('late mutation guard');
      await pause(35);
      scenario.throwIfCancelled();
      lateMutation += 1;
    }, 8, 'synthetic-one', owner, { cleanupGraceMs: 100 }),
    /exceeded 8ms/,
  );
  await pause(50);
  assert.equal(lateMutation, 0);
  assert.equal(fixture.browser.closed, true);
  assert.ok([...fixture.resources].every(resource => resource.closed));
}

// A resource that resolves after the deadline is still adopted and closed;
// the owner cannot confirm cleanup from a pre-resolution snapshot.
for (const [kind, fixtureOptions, start] of [
  ['page', { newPageDelay: 30 }, scenario => scenario.newPage()],
  ['context', { newContextDelay: 30 }, scenario => scenario.newContext()],
]) {
  const fixture = fakeBrowser(fixtureOptions);
  const owner = createScenarioOwner(fixture.browser, `synthetic-delayed-${kind}`, { closeTimeoutMs: 100 });
  await assert.rejects(
    runWithDeadline(async scenario => {
      scenario.setPhase(`delayed ${kind} creation`);
      await start(scenario);
    }, 8, `synthetic-delayed-${kind}`, owner, { cleanupGraceMs: 100 }),
    (error) => {
      assert(error instanceof ScenarioLifecycleError);
      assert.equal(error.cleanupConfirmed, true);
      return true;
    },
  );
  assert.ok([...fixture.resources].every(resource => resource.closed), `${kind} escaped owner cleanup`);
  const delayed = [...fixture.resources].find(resource => resource.kind === kind);
  assert.equal(delayed.closeCalls, 1, `${kind} was closed more than once`);
}

// Repeated timeout/cleanup cycles return every owned resource to its closed
// baseline; no browser or context is carried into the next synthetic scenario.
for (let i = 0; i < 3; i += 1) {
  const fixture = fakeBrowser();
  const owner = createScenarioOwner(fixture.browser, `synthetic-repeat-${i}`, { closeTimeoutMs: 100 });
  const context = await owner.newContext();
  await owner.newPage(context);
  await assertTimedOut(owner, `synthetic-repeat-${i}`);
  await pause(10);
  assert.ok([...fixture.resources].every(resource => resource.closed));
}

// Closure failure is a hard stop signal. The next scenario is intentionally
// not entered when the browser owner cannot acknowledge closure.
{
  const fixture = fakeBrowser({ browserClose: 'hang' });
  const owner = createScenarioOwner(fixture.browser, 'synthetic-close-failure', { closeTimeoutMs: 15 });
  let nextScenarioEntered = false;
  let stopAfterFailure = false;
  try {
    await runWithDeadline(() => new Promise(() => {}), 8, 'synthetic-close-failure', owner, { cleanupGraceMs: 15 });
  } catch (error) {
    assert(error instanceof ScenarioLifecycleError);
    stopAfterFailure = error.cleanupConfirmed === false;
  }
  if (!stopAfterFailure) nextScenarioEntered = true;
  assert.equal(nextScenarioEntered, false);
}

console.log('browser smoke lifecycle: PASS');
