// Non-browser probe for tools/browser-smoke.mjs. Exercises the harness's
// scenario registry, filtering, classification, renderer-mode resolution,
// and report shape WITHOUT ever launching Chromium — everything here runs
// against pure functions exported from browser-smoke.mjs. Importing that
// module does not spawn a server or a browser: its side-effecting main()
// only runs when the file is executed directly (see the isMain guard at
// its bottom), so importing it here is inert.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CLASS,
  UsageError,
  parseArgs,
  resolveRendererArgs,
  IMPLEMENTED_SCENARIO_IDS,
  RESERVED_SCENARIO_IDS,
  ALL_KNOWN_SCENARIO_IDS,
  resolveScenarioSelection,
  isTimeoutError,
  classifyTimeoutSite,
  isInteractionPhaseTimeout,
  awaitInteraction,
  classifyOutcome,
  classifyPreflight,
  combineOverall,
  resolveExitCode,
  buildReport,
} from './browser-smoke.mjs';

let passCount = 0;
function check(name, fn) {
  try {
    fn();
    passCount += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}\n${error.stack || error}`);
    process.exitCode = 1;
  }
}

// awaitInteraction is genuinely async (it awaits the real Promise chain a
// live scenario would), so exercising it for real -- rather than faking a
// pre-tagged Error -- needs an async-aware check. Queued here, drained by
// a top-level `await` loop at the end of the file so every sync check above
// still runs in its original, already-proven order first.
const asyncChecks = [];
function checkAsync(name, fn) {
  asyncChecks.push({ name, promise: (async () => fn())() });
}

// ---------------------------------------------------------------------------
// 1. Scenario registry
// ---------------------------------------------------------------------------

check('all 8 stable scenario ids are registered exactly once', () => {
  const expected = [
    'fallback-boot',
    'no-js',
    'webgl-fallback',
    'static-navigation',
    'static-alias',
    'static-input',
    'reduced-motion',
    'live-journey',
  ];
  assert.deepEqual(IMPLEMENTED_SCENARIO_IDS, expected);
});

check('reserved (C02) ids are known but not implemented', () => {
  assert.deepEqual(RESERVED_SCENARIO_IDS, ['live-desktop', 'live-touch', 'live-reduced-motion']);
  for (const id of RESERVED_SCENARIO_IDS) {
    assert.ok(!IMPLEMENTED_SCENARIO_IDS.includes(id), `${id} must not be implemented in this order`);
    assert.ok(ALL_KNOWN_SCENARIO_IDS.includes(id), `${id} must still be a known id`);
  }
});

check('no --scenario flag selects all 8 implemented scenarios', () => {
  assert.deepEqual(resolveScenarioSelection([]), IMPLEMENTED_SCENARIO_IDS);
});

check('a single valid --scenario id resolves to just that id', () => {
  assert.deepEqual(resolveScenarioSelection(['static-navigation']), ['static-navigation']);
});

check('repeated --scenario ids are deduplicated', () => {
  assert.deepEqual(resolveScenarioSelection(['fallback-boot', 'fallback-boot']), ['fallback-boot']);
});

check('multiple valid --scenario ids resolve in requested order', () => {
  assert.deepEqual(resolveScenarioSelection(['live-journey', 'no-js']), ['live-journey', 'no-js']);
});

check('an unknown scenario id (typo) throws UsageError, never resolves to zero silently', () => {
  assert.throws(() => resolveScenarioSelection(['static-navigatoin']), UsageError);
  assert.throws(() => resolveScenarioSelection(['static-navigatoin']), /unknown scenario id/);
});

check('an unknown id mixed with a valid one still throws (all-or-nothing validation)', () => {
  assert.throws(() => resolveScenarioSelection(['static-navigation', 'bogus-id']), /unknown scenario id\(s\): bogus-id/);
});

check('a reserved-but-unimplemented id throws a distinct, explicit error (not a silent skip)', () => {
  assert.throws(() => resolveScenarioSelection(['live-desktop']), UsageError);
  assert.throws(() => resolveScenarioSelection(['live-desktop']), /reserved for a future order \(C02\)/);
});

// ---------------------------------------------------------------------------
// 2. Classification mapping — the core proof
// ---------------------------------------------------------------------------

// 2a. classifyPreflight: no chrome executable / launch throws / webgl unavailable
check('classifyPreflight: no chrome executable -> environment-blocked', () => {
  const result = classifyPreflight({ chromeFound: false, launchError: null, webglAvailable: false, scenarioRequiresGpu: false });
  assert.equal(result.classification, CLASS.ENVIRONMENT_BLOCKED);
  assert.equal(result.reason, 'no-chromium-executable');
});

check('classifyPreflight: launch throws -> environment-blocked, carries the error message', () => {
  const fakeLaunchError = new Error('Failed to launch chromium: spawn ENOENT');
  const result = classifyPreflight({ chromeFound: true, launchError: fakeLaunchError, webglAvailable: false, scenarioRequiresGpu: false });
  assert.equal(result.classification, CLASS.ENVIRONMENT_BLOCKED);
  assert.equal(result.reason, 'launch-failed');
  assert.match(result.error, /ENOENT/);
});

check('classifyPreflight: WebGL unavailable blocks only scenarios that require GPU', () => {
  const gpuScenario = classifyPreflight({ chromeFound: true, launchError: null, webglAvailable: false, scenarioRequiresGpu: true });
  assert.equal(gpuScenario.classification, CLASS.ENVIRONMENT_BLOCKED);
  assert.equal(gpuScenario.reason, 'webgl-unavailable-preflight');

  const nonGpuScenario = classifyPreflight({ chromeFound: true, launchError: null, webglAvailable: false, scenarioRequiresGpu: false });
  assert.equal(nonGpuScenario, null, 'a non-GPU scenario must not be blocked by missing WebGL');
});

check('classifyPreflight: everything healthy -> no block (null)', () => {
  const result = classifyPreflight({ chromeFound: true, launchError: null, webglAvailable: true, scenarioRequiresGpu: true });
  assert.equal(result, null);
});

// 2b. classifyOutcome: assertion throws / timeout / unexpected error / pass / environment-blocked sentinel
check('classifyOutcome: assertion throws -> application-fail', () => {
  let assertionError;
  try {
    assert.equal(1, 2, 'fake assertion failure');
  } catch (error) {
    assertionError = error;
  }
  const result = classifyOutcome({ threw: true, error: assertionError });
  assert.equal(result.classification, CLASS.APPLICATION_FAIL);
  assert.equal(result.reason, 'assertion');
});

check('classifyOutcome: scenario-deadline timeout -> harness-fail, distinct from an assertion failure', () => {
  const timeoutError = new Error('scenario exceeded 45000ms total deadline: fake scenario');
  const result = classifyOutcome({ threw: true, error: timeoutError });
  assert.equal(result.classification, CLASS.HARNESS_FAIL);
  assert.equal(result.reason, 'timeout');
});

check('isTimeoutError recognizes the exact runWithDeadline message shape and rejects unrelated errors', () => {
  assert.equal(isTimeoutError(new Error('scenario exceeded 120000ms total deadline: live-journey')), true);
  assert.equal(isTimeoutError(new Error('Target closed')), false);
  assert.equal(isTimeoutError(new assert.AssertionError({ message: 'x' })), false);
});

check('classifyOutcome: an unexpected non-assertion, non-timeout throw -> harness-fail', () => {
  const protocolError = new Error('Protocol error (Page.navigate): Target closed');
  const result = classifyOutcome({ threw: true, error: protocolError });
  assert.equal(result.classification, CLASS.HARNESS_FAIL);
  assert.equal(result.reason, 'unexpected-error');
});

// ---------------------------------------------------------------------------
// 2d. D11 (coordinator repair) — timeout classification depends on WHEN it
// fires: post-boot interaction timeout vs boot/readiness timeout, and the
// latter escalates on the non-degraded reference renderer.
// ---------------------------------------------------------------------------

check('classifyTimeoutSite: an UNTAGGED timeout is always boot/readiness, regardless of its ms value', () => {
  assert.equal(classifyTimeoutSite('page.goto: Timeout 90000ms exceeded.'), 'boot');
  assert.equal(classifyTimeoutSite('page.waitForFunction: Timeout 90000ms exceeded.'), 'boot');
});

check('classifyTimeoutSite: the runWithDeadline backstop message is also bucketed as boot/readiness', () => {
  assert.equal(classifyTimeoutSite('scenario exceeded 120000ms total deadline: live-journey'), 'boot');
});

check('classifyTimeoutSite: a non-timeout message resolves to null (not a timeout at all)', () => {
  assert.equal(classifyTimeoutSite('Protocol error (Page.navigate): Target closed'), null);
  assert.equal(classifyTimeoutSite(undefined), null);
});

// ---------------------------------------------------------------------------
// 2e. D12 (coordinator repair) — R1 found D11's classifyTimeoutSite to be a
// numeric-coincidence fingerprint: it inferred 'interaction' purely because
// the error message happened to embed 20000ms, so a future BOOT-phase wait
// that also happened to use 20_000ms would be silently misclassified as
// 'interaction' -> application-fail, bypassing D11 row 3's
// swiftshader/unknown-renderer protection entirely. The fix replaces
// value-coincidence inference with structural tagging: awaitInteraction()
// marks a thrown timeout with a tag the call site itself attaches;
// classifyTimeoutSite reads that tag, not the number. Untagged is always
// 'boot' -- the safe default.
// ---------------------------------------------------------------------------

check("D12 acceptance criterion: a BOOT-phase wait using exactly 20,000ms (the interaction budget's own value, untagged) classifies as 'boot', not 'interaction'", () => {
  // This is precisely the adversarial case R1 raised: a plain, untagged
  // Error whose message happens to contain "20000ms" -- exactly what would
  // previously have been misread as an interaction timeout by value alone.
  const coincidentalBootTimeout = new Error('page.goto: Timeout 20000ms exceeded.');
  assert.equal(isInteractionPhaseTimeout(coincidentalBootTimeout), false, 'an untagged error must never read as interaction-phase');
  assert.equal(classifyTimeoutSite(coincidentalBootTimeout), 'boot', 'the adversarial case: same ms value as LIVE_INTERACTION_TIMEOUT_MS, but untagged -> boot');

  const result = classifyOutcome({ threw: true, error: coincidentalBootTimeout, rendererMode: 'swiftshader', rendererDegraded: true });
  assert.equal(result.classification, CLASS.HARNESS_FAIL, 'boot-phase 20000ms timeout on a degraded renderer must stay harness-fail, not escalate to application-fail via ms-coincidence');
  assert.equal(result.reason, 'timeout');
  assert.equal(result.requiresTriage, true);
});

checkAsync("D11 row 1 (re-proved under D12's real tagging mechanism): post-boot interaction timeout -> application-fail, on every renderer, via a genuinely-tagged error", async () => {
  for (const rendererDegraded of [false, true, undefined]) {
    let tagged;
    try {
      await awaitInteraction(() => {
        throw new Error('page.waitForFunction: Timeout 20000ms exceeded.');
      });
      assert.fail('awaitInteraction must rethrow');
    } catch (error) {
      tagged = error;
    }
    assert.equal(isInteractionPhaseTimeout(tagged), true, 'awaitInteraction must attach the structural tag before rethrowing');
    assert.equal(classifyTimeoutSite(tagged), 'interaction');

    const result = classifyOutcome({ threw: true, error: tagged, rendererMode: 'gpu-metal', rendererDegraded });
    assert.equal(result.classification, CLASS.APPLICATION_FAIL, `rendererDegraded=${rendererDegraded}`);
    assert.equal(result.reason, 'interaction-timeout');
    assert.equal(result.rendererDegraded, rendererDegraded);
  }
});

checkAsync('D12: awaitInteraction also tags a timeout thrown from a genuinely rejected Promise (not just a synchronous throw)', async () => {
  let tagged;
  try {
    await awaitInteraction(() => Promise.reject(new Error('page.waitForFunction: Timeout 20000ms exceeded.')));
    assert.fail('awaitInteraction must rethrow');
  } catch (error) {
    tagged = error;
  }
  assert.equal(isInteractionPhaseTimeout(tagged), true);
});

checkAsync('D12: on success, awaitInteraction returns the wrapped value untouched and tags nothing', async () => {
  const value = await awaitInteraction(() => Promise.resolve('ok'));
  assert.equal(value, 'ok');
});

checkAsync('D12 enforcement test: the invariant genuinely fires -- stripping the tag from an otherwise-real interaction timeout flips its classification back to boot', async () => {
  // Proves the enforcement is real, not decorative: take a timeout tagged
  // by the actual awaitInteraction() mechanism, then simulate the tag being
  // lost (the regression this test exists to catch -- e.g. a future refactor
  // that stops routing an interaction wait through awaitInteraction) by
  // deleting it from an in-memory fixture. Never done to committed state.
  let tagged;
  try {
    await awaitInteraction(() => {
      throw new Error('page.waitForFunction: Timeout 20000ms exceeded.');
    });
  } catch (error) {
    tagged = error;
  }
  assert.equal(isInteractionPhaseTimeout(tagged), true, 'precondition: the real mechanism did tag it');
  assert.equal(classifyTimeoutSite(tagged), 'interaction', 'precondition: correctly classified while tagged');

  // Simulate the tag being lost -- the exact regression this enforcement
  // test exists to catch (e.g. a future call site stops using
  // awaitInteraction, or the tag gets stripped along the way).
  const untaggedCopy = new Error(tagged.message);
  assert.equal(isInteractionPhaseTimeout(untaggedCopy), false, 'a plain copy without the tag must not read as interaction-phase');
  assert.equal(
    classifyTimeoutSite(untaggedCopy),
    'boot',
    'losing the structural tag must fall back to boot -- if this ever reads "interaction" instead, the enforcement has silently rotted',
  );
});


check('D11: boot/readiness timeout on the non-degraded reference GPU renderer -> application-fail (escalated)', () => {
  const bootTimeout = new Error('page.goto: Timeout 90000ms exceeded.');
  const result = classifyOutcome({ threw: true, error: bootTimeout, rendererMode: 'gpu-metal', rendererDegraded: false });
  assert.equal(result.classification, CLASS.APPLICATION_FAIL);
  assert.equal(result.reason, 'boot-timeout-on-reference-renderer');
  assert.equal(result.rendererMode, 'gpu-metal');
  assert.equal(result.rendererDegraded, false);
  assert.equal(result.requiresTriage, undefined, 'an application-fail is not a harness-fail and does not need the triage flag');
});

check('D11: boot/readiness timeout on an explicitly degraded (swiftshader) renderer stays harness-fail, with requiresTriage', () => {
  const bootTimeout = new Error('page.goto: Timeout 90000ms exceeded.');
  const result = classifyOutcome({ threw: true, error: bootTimeout, rendererMode: 'swiftshader', rendererDegraded: true });
  assert.equal(result.classification, CLASS.HARNESS_FAIL);
  assert.equal(result.reason, 'timeout', 'unchanged reason from before D11 -- only provenance and requiresTriage are new');
  assert.equal(result.rendererMode, 'swiftshader');
  assert.equal(result.rendererDegraded, true);
  assert.equal(result.requiresTriage, true);
});

check('D11: boot/readiness timeout with unknown renderer degradation (not passed) is treated as non-reference -- stays harness-fail, never silently escalated', () => {
  const bootTimeout = new Error('scenario exceeded 120000ms total deadline: live-journey');
  const result = classifyOutcome({ threw: true, error: bootTimeout });
  assert.equal(result.classification, CLASS.HARNESS_FAIL);
  assert.equal(result.requiresTriage, true);
});

check('D11: every timeout-class harness-fail carries requiresTriage: true; non-timeout harness-fails do not need it', () => {
  const bootTimeoutSwiftshader = classifyOutcome({
    threw: true,
    error: new Error('page.waitForFunction: Timeout 90000ms exceeded.'),
    rendererMode: 'swiftshader',
    rendererDegraded: true,
  });
  assert.equal(bootTimeoutSwiftshader.classification, CLASS.HARNESS_FAIL);
  assert.equal(bootTimeoutSwiftshader.requiresTriage, true);

  const backstopSwiftshader = classifyOutcome({
    threw: true,
    error: new Error('scenario exceeded 45000ms total deadline: fake scenario'),
    rendererMode: 'swiftshader',
    rendererDegraded: true,
  });
  assert.equal(backstopSwiftshader.classification, CLASS.HARNESS_FAIL);
  assert.equal(backstopSwiftshader.requiresTriage, true);

  const unexpected = classifyOutcome({ threw: true, error: new Error('Protocol error (Page.navigate): Target closed') });
  assert.equal(unexpected.classification, CLASS.HARNESS_FAIL);
  assert.equal(unexpected.reason, 'unexpected-error');
});

check('D11: no auto-retry mechanism exists in this harness -- each scenario runs exactly once regardless of classification', () => {
  // Structural guarantee, not a runtime one: `scenario.run(...)` must be
  // invoked from exactly one call site (the main per-scenario loop) with no
  // surrounding retry/backoff wrapper. This keeps the promise in the report
  // ("requiresTriage: true, never auto-retried") honest without needing to
  // launch a browser to prove it. A retry loop would either add a second
  // call site or wrap this one in a counted/backoff loop; either shows up
  // as more than one occurrence once such a loop calls it per-attempt.
  const source = readFileSync(new URL('./browser-smoke.mjs', import.meta.url), 'utf8');
  const runCallSites = source.match(/scenario\.run\(/g) || [];
  assert.equal(runCallSites.length, 1, 'scenario.run(...) must have exactly one call site: no retry wrapper');
});

// ---------------------------------------------------------------------------
// 2f. D14 (coordinator repair) — R1's D12 closure review found the tag was
// too trusting: awaitInteraction() tagged ANY thrown error, not only
// timeouts, so a genuine non-timeout failure (dropped connection, crashed
// context) surfacing inside one of the three wrapped waits was misread as
// an interaction TIMEOUT purely because it carried the tag -- reintroducing
// D11's "point someone at a nonexistent app bug" failure mode via the tag
// instead of the ms value. Fix: the tag is now necessary but not
// sufficient -- classifyTimeoutSite requires BOTH the structural tag AND a
// genuinely timeout-shaped message before returning 'interaction'.
// ---------------------------------------------------------------------------

checkAsync("D14 acceptance criterion: the reviewer's exact reproduction is dead -- a non-timeout error thrown INSIDE awaitInteraction classifies IDENTICALLY to the same error thrown OUTSIDE it", async () => {
  const outside = new Error('Protocol error (Page.navigate): Target closed');
  const outsideResult = classifyOutcome({ threw: true, error: outside, rendererMode: 'gpu-metal', rendererDegraded: false });

  let inside;
  try {
    await awaitInteraction(() => {
      throw new Error('Protocol error (Page.navigate): Target closed');
    });
    assert.fail('awaitInteraction must rethrow');
  } catch (error) {
    inside = error;
  }
  const insideResult = classifyOutcome({ threw: true, error: inside, rendererMode: 'gpu-metal', rendererDegraded: false });

  // Pin down what "correct" means before comparing: this must land on the
  // same bucket a genuine environment/harness failure belongs in, not on
  // application-fail/interaction-timeout (the bug the reviewer found).
  assert.equal(outsideResult.classification, CLASS.HARNESS_FAIL);
  assert.equal(outsideResult.reason, 'unexpected-error');
  assert.equal(insideResult.classification, CLASS.HARNESS_FAIL, 'the tag must not manufacture an application-fail out of a non-timeout error');
  assert.equal(insideResult.reason, 'unexpected-error');

  // And the two must actually match -- that symmetry IS the fix.
  assert.deepEqual(
    { classification: insideResult.classification, reason: insideResult.reason },
    { classification: outsideResult.classification, reason: outsideResult.reason },
    'identical error must classify identically whether thrown inside or outside awaitInteraction',
  );
});

checkAsync('D14 symmetry (generalized): classification inside awaitInteraction equals classification outside it, for a representative set of non-timeout errors', async () => {
  const cases = [
    ['protocol error', () => new Error('Protocol error (Page.navigate): Target closed')],
    ['target closed', () => new Error('Target closed')],
    ['assertion error', () => { try { assert.equal(1, 2, 'fixture'); } catch (error) { return error; } return undefined; }],
    ['TypeError', () => new TypeError("Cannot read properties of undefined (reading 'foo')")],
  ];
  for (const [label, makeError] of cases) {
    const outsideError = makeError();
    const outsideResult = classifyOutcome({ threw: true, error: outsideError, rendererMode: 'gpu-metal', rendererDegraded: false });

    let insideError;
    try {
      await awaitInteraction(() => { throw makeError(); });
      assert.fail(`awaitInteraction must rethrow (case: ${label})`);
    } catch (error) {
      insideError = error;
    }
    const insideResult = classifyOutcome({ threw: true, error: insideError, rendererMode: 'gpu-metal', rendererDegraded: false });

    assert.equal(insideResult.classification, outsideResult.classification, `classification mismatch for '${label}'`);
    assert.equal(insideResult.reason, outsideResult.reason, `reason mismatch for '${label}'`);
  }
});

checkAsync("D14 combination table 1/4: tagged + timeout-shaped -> 'interaction' (unchanged)", async () => {
  let tagged;
  try {
    await awaitInteraction(() => {
      throw new Error('page.waitForFunction: Timeout 20000ms exceeded.');
    });
  } catch (error) {
    tagged = error;
  }
  assert.equal(isInteractionPhaseTimeout(tagged), true);
  assert.equal(classifyTimeoutSite(tagged), 'interaction');
  const result = classifyOutcome({ threw: true, error: tagged, rendererMode: 'gpu-metal', rendererDegraded: false });
  assert.equal(result.classification, CLASS.APPLICATION_FAIL);
  assert.equal(result.reason, 'interaction-timeout');
});

checkAsync("D14 combination table 2/4: tagged + NOT timeout-shaped -> treated exactly as untagged (harness-fail/unexpected-error, never interaction)", async () => {
  let tagged;
  try {
    await awaitInteraction(() => {
      throw new Error('Protocol error (Page.navigate): Target closed');
    });
  } catch (error) {
    tagged = error;
  }
  assert.equal(isInteractionPhaseTimeout(tagged), true, 'precondition: awaitInteraction does still tag it (tagging stays broad; classification narrows)');
  assert.equal(classifyTimeoutSite(tagged), null, 'a tag on a non-timeout message must not produce a site at all');
  const result = classifyOutcome({ threw: true, error: tagged, rendererMode: 'gpu-metal', rendererDegraded: false });
  assert.equal(result.classification, CLASS.HARNESS_FAIL);
  assert.equal(result.reason, 'unexpected-error');
});

check("D14 combination table 3/4: untagged + timeout-shaped -> 'boot' (D12's safe default, unchanged)", () => {
  const untagged = new Error('page.goto: Timeout 20000ms exceeded.');
  assert.equal(isInteractionPhaseTimeout(untagged), false);
  assert.equal(classifyTimeoutSite(untagged), 'boot');
  const result = classifyOutcome({ threw: true, error: untagged, rendererMode: 'swiftshader', rendererDegraded: true });
  assert.equal(result.classification, CLASS.HARNESS_FAIL);
  assert.equal(result.reason, 'timeout');
  assert.equal(result.requiresTriage, true);
});

check('D14 combination table 4/4: untagged + NOT timeout-shaped -> harness-fail/unexpected-error (unchanged)', () => {
  const untagged = new Error('Protocol error (Page.navigate): Target closed');
  assert.equal(isInteractionPhaseTimeout(untagged), false);
  assert.equal(classifyTimeoutSite(untagged), null);
  const result = classifyOutcome({ threw: true, error: untagged });
  assert.equal(result.classification, CLASS.HARNESS_FAIL);
  assert.equal(result.reason, 'unexpected-error');
});

checkAsync('D14: D12 adversarial case (untagged 20,000ms boot-phase wait) still classifies as boot, not interaction, after the D14 fix', async () => {
  const coincidentalBootTimeout = new Error('page.goto: Timeout 20000ms exceeded.');
  assert.equal(isInteractionPhaseTimeout(coincidentalBootTimeout), false);
  assert.equal(classifyTimeoutSite(coincidentalBootTimeout), 'boot');

  // And the real tagging path for a genuine interaction timeout at the same
  // ms value still correctly reads 'interaction' -- D14 narrows WHEN the
  // tag is trusted, it does not weaken D12's fix for the ms-coincidence case.
  let tagged;
  try {
    await awaitInteraction(() => {
      throw new Error('page.waitForFunction: Timeout 20000ms exceeded.');
    });
  } catch (error) {
    tagged = error;
  }
  assert.equal(classifyTimeoutSite(tagged), 'interaction');
});

checkAsync('D14: frozen error objects thrown inside awaitInteraction still land safely (no crash, no silent pass)', async () => {
  const frozenTimeout = Object.freeze(new Error('page.waitForFunction: Timeout 20000ms exceeded.'));
  let caught;
  try {
    await awaitInteraction(() => { throw frozenTimeout; });
    assert.fail('awaitInteraction must rethrow');
  } catch (error) {
    caught = error;
  }
  // Tagging a frozen object throws on assignment; awaitInteraction must
  // swallow that internally and still rethrow the original error untagged
  // -- which is exactly D12's documented safe fallback: an untagged
  // timeout-shaped message still resolves to 'boot', never a crash, never
  // a silent pass.
  assert.equal(isInteractionPhaseTimeout(caught), false);
  const result = classifyOutcome({ threw: true, error: caught, rendererMode: 'swiftshader', rendererDegraded: true });
  assert.equal(result.classification, CLASS.HARNESS_FAIL);
  assert.notEqual(result.classification, CLASS.PASS);

  const frozenNonTimeout = Object.freeze(new Error('Target closed'));
  let caughtNonTimeout;
  try {
    await awaitInteraction(() => { throw frozenNonTimeout; });
    assert.fail('awaitInteraction must rethrow');
  } catch (error) {
    caughtNonTimeout = error;
  }
  const nonTimeoutResult = classifyOutcome({ threw: true, error: caughtNonTimeout });
  assert.equal(nonTimeoutResult.classification, CLASS.HARNESS_FAIL);
  assert.equal(nonTimeoutResult.reason, 'unexpected-error');
});

checkAsync('D14: thrown primitives (string, null, undefined, number) inside awaitInteraction still land safely, never a pass', async () => {
  const primitives = ['a plain string throw', null, undefined, 42];
  for (const primitive of primitives) {
    let caught;
    let didThrow = false;
    try {
      await awaitInteraction(() => { throw primitive; });
    } catch (error) {
      didThrow = true;
      caught = error;
    }
    assert.equal(didThrow, true, `awaitInteraction must rethrow primitive: ${String(primitive)}`);
    assert.equal(caught, primitive, 'the primitive itself must be rethrown unchanged');
    const result = classifyOutcome({ threw: true, error: caught });
    assert.equal(result.classification, CLASS.HARNESS_FAIL, `primitive ${String(primitive)} must not crash classification or produce a pass`);
    assert.notEqual(result.classification, CLASS.PASS);
  }
});

check('classifyOutcome: no throw, no sentinel -> pass', () => {
  const result = classifyOutcome({ threw: false, returnValue: undefined });
  assert.equal(result.classification, CLASS.PASS);
});

check("classifyOutcome: the 'environment-blocked' sentinel return value is honoured, not read as pass", () => {
  const result = classifyOutcome({ threw: false, returnValue: 'environment-blocked' });
  assert.equal(result.classification, CLASS.ENVIRONMENT_BLOCKED);
  assert.equal(result.reason, 'webgl-unavailable-fresh-context');
});

// 2c. Overall combination + exit codes, for both modes, across all 5 injected conditions
const injectedConditions = [
  {
    label: 'no chrome executable',
    classification: classifyPreflight({ chromeFound: false, launchError: null, webglAvailable: false, scenarioRequiresGpu: false }).classification,
  },
  {
    label: 'launch throws',
    classification: classifyPreflight({ chromeFound: true, launchError: new Error('boom'), webglAvailable: false, scenarioRequiresGpu: false }).classification,
  },
  {
    label: 'WebGL unavailable (GPU scenario)',
    classification: classifyPreflight({ chromeFound: true, launchError: null, webglAvailable: false, scenarioRequiresGpu: true }).classification,
  },
  {
    label: 'assertion throws',
    classification: (() => {
      try { assert.ok(false, 'fake'); } catch (error) { return classifyOutcome({ threw: true, error }).classification; }
    })(),
  },
  {
    label: 'timeout',
    classification: classifyOutcome({ threw: true, error: new Error('scenario exceeded 1ms total deadline: x') }).classification,
  },
];

const expectedByLabel = {
  'no chrome executable': CLASS.ENVIRONMENT_BLOCKED,
  'launch throws': CLASS.ENVIRONMENT_BLOCKED,
  'WebGL unavailable (GPU scenario)': CLASS.ENVIRONMENT_BLOCKED,
  'assertion throws': CLASS.APPLICATION_FAIL,
  timeout: CLASS.HARNESS_FAIL,
};

for (const condition of injectedConditions) {
  check(`injected condition '${condition.label}' classifies as '${expectedByLabel[condition.label]}'`, () => {
    assert.equal(condition.classification, expectedByLabel[condition.label]);
  });

  check(`injected condition '${condition.label}': permissive-mode exit code`, () => {
    const exitCode = resolveExitCode(condition.classification, 'permissive');
    if (condition.classification === CLASS.ENVIRONMENT_BLOCKED) {
      assert.equal(exitCode, 0, 'permissive mode may exit 0 for a genuine environment block');
    } else {
      assert.notEqual(exitCode, 0, 'permissive mode must never exit 0 on an application or harness fault');
    }
  });

  check(`injected condition '${condition.label}': required-mode exit code is always non-zero`, () => {
    const exitCode = resolveExitCode(condition.classification, 'required');
    assert.notEqual(exitCode, 0, 'required mode must exit non-zero on every one of the five injected conditions');
  });
}

check('a clean pass exits 0 in both permissive and required mode', () => {
  assert.equal(resolveExitCode(CLASS.PASS, 'permissive'), 0);
  assert.equal(resolveExitCode(CLASS.PASS, 'required'), 0);
});

check('combineOverall: zero scenarios run is never classified as pass (harness-fail)', () => {
  assert.equal(combineOverall([]), CLASS.HARNESS_FAIL);
});

check('combineOverall: precedence is harness-fail > application-fail > environment-blocked > pass', () => {
  assert.equal(combineOverall([CLASS.PASS, CLASS.ENVIRONMENT_BLOCKED]), CLASS.ENVIRONMENT_BLOCKED);
  assert.equal(combineOverall([CLASS.PASS, CLASS.ENVIRONMENT_BLOCKED, CLASS.APPLICATION_FAIL]), CLASS.APPLICATION_FAIL);
  assert.equal(combineOverall([CLASS.PASS, CLASS.APPLICATION_FAIL, CLASS.HARNESS_FAIL]), CLASS.HARNESS_FAIL);
  assert.equal(combineOverall([CLASS.PASS, CLASS.PASS]), CLASS.PASS);
});

check('overall environment-blocked exits 0 only in permissive mode, never in required mode', () => {
  assert.equal(resolveExitCode(CLASS.ENVIRONMENT_BLOCKED, 'permissive'), 0);
  assert.notEqual(resolveExitCode(CLASS.ENVIRONMENT_BLOCKED, 'required'), 0);
});

// ---------------------------------------------------------------------------
// 3. CLI parsing / scenario filtering exit behavior
// ---------------------------------------------------------------------------

check('parseArgs: --scenario is repeatable', () => {
  const args = parseArgs(['--scenario', 'fallback-boot', '--scenario', 'no-js']);
  assert.deepEqual(args.scenarios, ['fallback-boot', 'no-js']);
});

check('parseArgs: --scenario=id form is accepted', () => {
  const args = parseArgs(['--scenario=static-navigation']);
  assert.deepEqual(args.scenarios, ['static-navigation']);
});

check('parseArgs: unknown flag throws UsageError', () => {
  assert.throws(() => parseArgs(['--bogus']), UsageError);
});

check('parseArgs: default mode is permissive, default renderer is gpu', () => {
  const args = parseArgs([]);
  assert.equal(args.mode, 'permissive');
  assert.equal(args.renderer, 'gpu');
});

check('parseArgs: --mode=required is accepted; an invalid mode value is rejected', () => {
  assert.equal(parseArgs(['--mode=required']).mode, 'required');
  assert.throws(() => parseArgs(['--mode=bogus']), UsageError);
});

check("a run with only unknown scenario ids selected must exit non-zero (never a silent zero-scenario pass)", () => {
  // resolveScenarioSelection throwing here is exactly how main() guarantees
  // this: the process never reaches "0 selected scenarios, exit 0".
  assert.throws(() => resolveScenarioSelection(['nope-this-id-does-not-exist']), UsageError);
});

// ---------------------------------------------------------------------------
// 4. Renderer-mode resolution
// ---------------------------------------------------------------------------

check('resolveRendererArgs: default (gpu) on darwin resolves to --use-angle=metal, not degraded', () => {
  const result = resolveRendererArgs('gpu', 'darwin');
  assert.deepEqual(result.args, ['--use-angle=metal']);
  assert.equal(result.degraded, false);
  assert.equal(result.label, 'gpu-metal');
});

check('resolveRendererArgs: explicit swiftshader is honoured and flagged as degraded on every platform', () => {
  for (const platform of ['darwin', 'linux', 'win32']) {
    const result = resolveRendererArgs('swiftshader', platform);
    assert.deepEqual(result.args, ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']);
    assert.equal(result.degraded, true, `swiftshader must be flagged degraded on ${platform}`);
  }
});

check('resolveRendererArgs: gpu mode never emits the swiftshader flags', () => {
  const result = resolveRendererArgs('gpu', 'darwin');
  assert.ok(!result.args.includes('--use-angle=swiftshader'));
  assert.ok(!result.args.includes('--enable-unsafe-swiftshader'));
});

check('resolveRendererArgs: gpu mode on a non-darwin platform does not force software rendering either', () => {
  const result = resolveRendererArgs('gpu', 'linux');
  assert.equal(result.degraded, false);
  assert.ok(!result.args.includes('--use-angle=swiftshader'));
});

// ---------------------------------------------------------------------------
// 5. Report shape
// ---------------------------------------------------------------------------

check('buildReport: includes required provenance fields', () => {
  const report = buildReport({
    mode: 'permissive',
    provenance: {
      browserExecutable: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      browserVersion: 'Chrome/999.0.0.0',
      headless: true,
      rendererMode: 'gpu-metal',
      rendererDegraded: false,
      launchArgs: ['--use-angle=metal'],
      defaultViewport: { width: 1280, height: 720 },
      defaultDeviceScaleFactor: 1,
      webglAvailable: true,
      webglRenderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M3, Unspecified Version)',
      os: { platform: 'darwin', release: '24.6.0', arch: 'arm64' },
      servedBaseUrl: 'http://127.0.0.1:12345',
      port: 12345,
    },
    scenarios: [{ id: 'static-navigation', title: 'x', classification: CLASS.PASS, durationMs: 10 }],
    overall: { classification: CLASS.PASS, exitCode: 0, requestedScenarioIds: ['static-navigation'] },
    cleanup: { verified: true, issues: [] },
  });

  const requiredProvenanceFields = [
    'browserExecutable', 'browserVersion', 'headless', 'rendererMode', 'rendererDegraded',
    'launchArgs', 'defaultViewport', 'defaultDeviceScaleFactor', 'webglAvailable', 'webglRenderer',
    'os', 'servedBaseUrl', 'port',
  ];
  for (const field of requiredProvenanceFields) {
    assert.ok(field in report.provenance, `provenance.${field} must be present`);
  }
  assert.ok('platform' in report.provenance.os && 'release' in report.provenance.os && 'arch' in report.provenance.os);
  assert.equal(report.version, 1);
  assert.ok(Array.isArray(report.scenarios));
  assert.ok('classification' in report.overall && 'exitCode' in report.overall);
  assert.ok('verified' in report.cleanup && 'issues' in report.cleanup);
});

// Drain the queued async checks (awaitInteraction exercises a real Promise
// chain, so these could not run synchronously above) after every sync check
// has already run and reported.
for (const { name, promise } of asyncChecks) {
  try {
    await promise;
    passCount += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}\n${error.stack || error}`);
    process.exitCode = 1;
  }
}

console.log(`\n${passCount} checks passed${process.exitCode ? ', with failures above' : ''}.`);
if (!process.exitCode) process.exitCode = 0;
