/* ==================================================================== *
 * tools/pose-run.mjs — PAGE-02.
 *
 * THE ENTRY POINT FOR THE FREEZE-THEN-READ POSE HARNESS. `npm run test:pose`.
 *
 * Everything that decides anything is in tools/pose-oracle.mjs and is gated
 * by tools/test-pose-oracle.mjs and tools/test-instrument-layer.mjs. This
 * file owns only what needs a browser: the launch, the per-origin positive
 * controls, the sequential fronted driving, the origin matrix, and the D63
 * refusal. Nothing imports it (PAGE-01's split; D84/D88).
 *
 * WHAT IT PROVES, AND IN WHICH ORDER
 * ----------------------------------
 *  1. REPRODUCIBILITY. Every pose is read in `--sessions` FRESH browser
 *     processes and compared EXACTLY. Not "within a tolerance" — string
 *     equality of every one of the 363-odd rows, and a report of exactly
 *     which cell moved if any did.
 *  2. THE NULL-TREE CONTROL (`--control=<origin>`). A SECOND ORIGIN SERVING
 *     THE SAME TREE. Its poses must be identical to the first origin's. This
 *     is the control the two-tree protocol needs and did not have: without
 *     it, "the two trees differ" and "comparing across origins is broken"
 *     are the same observation. D46's shape, applied to a protocol rather
 *     than to a scan.
 *  3. THE TWO-TREE PROTOCOL (`--origin-b=<origin>`). The same discipline
 *     against a pristine tree served from the scratchpad, driven
 *     SEQUENTIALLY AND FRONTED — never concurrently, because a hidden tab
 *     both throttles `setTimeout` and trips `push()`'s
 *     `resumedFromBackground` branch (DEF-OWNED's trap, PAGE-01's record).
 *
 * THE POSITIVE CONTROLS ARE PER ORIGIN AND PER INPUT KIND. PAGE-01 carries
 * one, for the wheel. This carries two, because pointer and key reach the UI
 * through different handlers and a control for one says nothing about the
 * other. Each asserts that a REAL, BROWSER-DISPATCHED event changed a named
 * `window.journey.ui` cell.
 *
 * Run:
 *   node tools/pose-run.mjs
 *   node tools/pose-run.mjs --control=http://localhost:8189
 *   node tools/pose-run.mjs --origin-b=http://localhost:8188 --sessions=2
 *   node tools/pose-run.mjs --record=<path>
 * ==================================================================== */

import { existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

import { HarnessFault, fault, armSentinel } from './instrument-ledger.mjs';
import {
  POSE_REGION, POSE_FIELDS, FREEZE_PHASE_MS, FREEZE_SETTLE_TICKS, PLACED_POSES,
  EXCLUSIONS, SCENARIOS, INPUT_KINDS, MIN_POSE_ROWS, RAIL_GATE_SETTLE_MS,
  FREEZE_PASSES, TEAR_RETRIES,
  maskExclusions, comparePose, movedCells, vectorDigest, reproducibility,
  trustVerdict, parseArgs, pvRead, pvFreeze, pvThaw, pvUiState, pvTargetBox,
} from './pose-oracle.mjs';

const CHROME_CANDIDATES = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

/** How long a driven step's PREDICATE may take to become true. A budget on a
 *  refusal, not a tolerance on a measurement: exceeding it reports NO pose
 *  for that scenario. Nothing downstream is a function of this number. */
const PREDICATE_TIMEOUT_MS = 6000;

const READ_ARG = { region: POSE_REGION, fields: POSE_FIELDS };

/* --- THE DRIVEN REGION ---------------------------------------------- *
 * Everything between this marker and END OF DRIVEN REGION is the only code
 * in this instrument that causes the page to change state through input.
 * tools/test-pose-oracle.mjs slices exactly this span, strips its comments,
 * and asserts that what is left contains NO progress setter, NO placement
 * call and NO `dispatchEvent` — the UI is driven by the BROWSER's own
 * trusted pointer and key events or it is not driven at all.
 *
 * `dispatchEvent` is forbidden here and is not forbidden in PAGE-01's
 * driver, and the difference is deliberate: a synthesised event has
 * `isTrusted: false` and skips the browser's own hit-testing, so it can
 * "click" a control that is covered, disabled or off-screen. A proof that
 * `createUI` still responds to a click has to be a proof about a click.
 * -------------------------------------------------------------------- */
/** Perform one scenario step with real input, then wait for ITS OWN
 *  predicate. Returns the observed ui state, or a named miss.
 *  @param {object} page  the Playwright page
 *  @param {object} step  one entry of a SCENARIOS step list */
async function driveStep(page, step) {
  if (!INPUT_KINDS.includes(step.kind)) fault(`scenario step of unknown kind "${step.kind}"`);
  if (step.kind === 'key') {
    await page.keyboard.press(step.key);
  } else {
    const box = await page.evaluate(pvTargetBox, { target: step.target });
    if (!box) return { miss: `target "${step.target}" is absent, boxless or not hittable` };
    await page.mouse.move(box.x, box.y);
    if (step.kind === 'click') {
      await page.mouse.down();
      await page.mouse.up();
    }
  }
  const deadline = Date.now() + PREDICATE_TIMEOUT_MS;
  for (;;) {
    const seen = await page.evaluate(pvUiState);
    if (seen && seen[step.want] === step.to) return { state: seen };
    if (Date.now() > deadline) {
      return { miss: `predicate ui.${step.want} === ${JSON.stringify(step.to)} never became true `
        + `after a real ${step.kind} (observed ${JSON.stringify(seen && seen[step.want])})` };
    }
    await new Promise((r) => setTimeout(r, 50));
  }
}
/* --- END OF DRIVEN REGION ------------------------------------------- */

/** The two positive controls, per origin, before any pose is read. */
async function positiveControls(page) {
  const before = await page.evaluate(pvUiState);
  const click = await driveStep(page, { kind: 'click', target: 'menu-button', want: 'menuOpen', to: true });
  const afterClick = click.state || (await page.evaluate(pvUiState));
  const key = await driveStep(page, { kind: 'key', key: 'Escape', want: 'menuOpen', to: false });
  const afterKey = key.state || (await page.evaluate(pvUiState));
  return {
    pointer: !!(before && afterClick && before.menuOpen === false && afterClick.menuOpen === true),
    key: !!(afterClick && afterKey && afterClick.menuOpen === true && afterKey.menuOpen === false),
    notes: [click.miss, key.miss].filter(Boolean),
  };
}

/** THE DISCIPLINE, END TO END, FOR ONE POSE.
 *
 *  place -> (drive) -> freeze -> read. Each driven step thaws first, because
 *  a page pinned at `FREEZE_PHASE_MS` cannot run the transition the next
 *  state change starts. */
async function readPose(page, origin, spec, evidence) {
  const url = `${origin}/?capture=${spec.pose}&steady=1`;
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  evidence.httpStatus = resp ? resp.status() : 0;
  evidence.httpOk = evidence.httpOk && evidence.httpStatus === 200;
  await page.waitForFunction(() => window.journey && window.journey.ui, null, { timeout: 90_000 })
    .then(() => {}, () => { evidence.booted = false; });
  if (!evidence.booted) return null;
  let lastAction = Date.now();

  for (const step of spec.steps || []) {
    await page.evaluate(pvThaw, { hero: false });
    const r = await driveStep(page, step);
    if (r.miss) { evidence.predicateMisses++; evidence.misses.push(`${spec.id}: ${r.miss}`); return null; }
    lastAction = Date.now();
  }

  /* PAST journey/rail.js's TWO WALL-CLOCK GATES. Not a settle — both are
     one-way, so this reaches a state the page cannot leave. See the block
     above RAIL_GATE_SETTLE_MS in tools/pose-oracle.mjs. */
  const owed = lastAction + RAIL_GATE_SETTLE_MS - Date.now();
  if (owed > 0) await new Promise((r) => setTimeout(r, owed));

  /* FREEZE TO A FIXPOINT, THEN READ TWICE.
     THE TEAR DETECTOR IS THE FREEZE'S OWN POSITIVE CONTROL. The vector is
     363 rows of `getComputedStyle`; it is not instantaneous. Two consecutive
     reads inside ONE freeze must be identical, or the walk sampled a moving
     DOM and describes a state that never existed.

     A tear is RE-FROZEN and re-read up to TEAR_RETRIES times rather than
     immediately refused, because the known cause is a `transitionend`
     handler starting one more transition, and one more pass ends it. The
     budget is on the REFUSAL: every attempt compares exactly, and running
     out reports no pose at all. */
  let raw = null;
  let torn = null;
  for (let attempt = 0; attempt <= TEAR_RETRIES; attempt++) {
    if (attempt > 0) evidence.refreezes++;
    const froze = await page.evaluate(pvFreeze,
      { phaseMs: FREEZE_PHASE_MS, ticks: FREEZE_SETTLE_TICKS, passes: FREEZE_PASSES });
    evidence.freezeFailures += froze.failures;
    evidence.animationsFrozen += froze.total;
    evidence.freezePasses += froze.passes;
    evidence.residualAnimations = Math.max(evidence.residualAnimations, froze.residual);
    if (froze.hidden) evidence.hiddenReads++;
    const a = await page.evaluate(pvRead, READ_ARG);
    const b = await page.evaluate(pvRead, READ_ARG);
    if (comparePose(a, b).identical) { raw = a; torn = null; break; }
    torn = movedCells(a, b);
  }
  if (raw === null) {
    evidence.tornReads++;
    evidence.misses.push(`${spec.id}: ${TEAR_RETRIES + 1} freeze/read attempts all torn; last disagreed on `
      + `${(torn || []).slice(0, 4).join(', ')}`);
    return null;
  }
  if (raw.length < MIN_POSE_ROWS) evidence.thinVectors++;
  const { rows, masked, unmatched } = maskExclusions(raw, EXCLUSIONS);
  for (const u of unmatched) if (!evidence.staleExclusions.includes(u)) evidence.staleExclusions.push(u);
  evidence.maskedCells += masked.length;
  evidence.poseCount++;
  return rows;
}

/** One fresh browser process. Sequential and fronted by construction: one
 *  context, one page, one pose at a time. */
async function session(chromium, chrome, origin, opts, evidence, label) {
  const browser = await chromium.launch({ executablePath: chrome, headless: true, args: ['--use-angle=metal'] });
  const out = new Map();
  try {
    const ctx = await browser.newContext({ viewport: { width: opts.width, height: opts.height } });
    const page = await ctx.newPage();
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      evidence.consoleErrors++;
      const t = m.text().slice(0, 160);
      if (!evidence.consoleTexts.includes(t)) evidence.consoleTexts.push(t);
    });
    page.on('pageerror', (e) => {
      evidence.consoleErrors++;
      const t = `pageerror: ${String(e.message).slice(0, 160)}`;
      if (!evidence.consoleTexts.includes(t)) evidence.consoleTexts.push(t);
    });

    /* The controls run first, on their own navigation, so a failure is
       attributed to the origin rather than to whichever pose ran first. */
    const resp = await page.goto(`${origin}/?capture=connect&steady=1`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    evidence.httpStatus = resp ? resp.status() : 0;
    evidence.httpOk = evidence.httpStatus === 200;
    await page.waitForFunction(() => window.journey && window.journey.ui, null, { timeout: 90_000 })
      .then(() => { evidence.booted = true; }, () => { evidence.booted = false; });
    if (evidence.booted) {
      const pc = await positiveControls(page);
      evidence.positivePointer = evidence.positivePointer && pc.pointer;
      evidence.positiveKey = evidence.positiveKey && pc.key;
      if (label === 'S1') {
        console.log(`  POSCTL  ${origin}  real pointer click -> ui.rail.menuOpen [${pc.pointer ? 'PASS' : 'FAIL'}]   `
          + `real Escape key -> ui.rail.menuOpen [${pc.key ? 'PASS' : 'FAIL'}]`);
        for (const n of pc.notes) console.log(`          ${n}`);
      }

      for (const pose of PLACED_POSES) {
        if (opts.only && opts.only !== pose) continue;
        out.set(`placed:${pose}`, await readPose(page, origin, { id: `placed:${pose}`, pose, steps: [] }, evidence));
      }
      for (const s of SCENARIOS) {
        if (opts.only && opts.only !== s.id) continue;
        out.set(`driven:${s.id}`, await readPose(page, origin, s, evidence));
      }
    }
  } finally {
    await browser.close();
  }
  return out;
}

const freshEvidence = () => ({
  httpOk: false, httpStatus: 0, booted: false,
  positivePointer: true, positiveKey: true,
  hiddenReads: 0, consoleErrors: 0, freezeFailures: 0, animationsFrozen: 0,
  predicateMisses: 0, misses: [], staleExclusions: [], maskedCells: 0, tornReads: 0,
  consoleTexts: [], refreezes: 0, freezePasses: 0, residualAnimations: 0,
  thinVectors: 0, poseCount: 0, originsIdentical: false,
});

/** Are two origins serving the same bytes? Cheap, and it is the difference
 *  between a two-tree proof and a one-tree tautology. */
async function originDigest(origin) {
  const files = ['/journey/ui.js', '/journey/rail.js', '/hero.css', '/index.html', '/main.js'];
  const h = createHash('sha256');
  for (const f of files) {
    let r;
    try {
      r = await fetch(`${origin}${f}`);
    } catch (e) {
      fault(`${origin} is not answering (${e.message}) — this instrument cannot report a pose comparison `
        + 'against an origin it cannot read, and reporting one for the origins that DID answer would be '
        + 'a partial matrix wearing a whole one (D63)');
    }
    if (!r.ok) fault(`${origin}${f} -> HTTP ${r.status}; the origin is not serving this tree`);
    h.update(Buffer.from(await r.arrayBuffer()));
  }
  return h.digest('hex').slice(0, 16);
}

async function main() {
  const SENT = armSentinel('pose-run', ['inputs', 'contract']);
  const opts = parseArgs(process.argv.slice(2));
  const chrome = CHROME_CANDIDATES.find((c) => existsSync(c));
  if (!chrome) fault('no Chrome/Chromium executable found — this instrument cannot report without one');
  if (!(opts.sessions >= 2)) fault('--sessions must be at least 2: one read proves nothing about reproducibility');

  console.log('tools/pose-run.mjs — the freeze-then-read pose harness, driven through the real event path\n');
  console.log(`  origin ${opts.origin}   viewport ${opts.width}x${opts.height}   sessions ${opts.sessions}`);
  console.log(`  freeze phase ${FREEZE_PHASE_MS} ms + ${FREEZE_SETTLE_TICKS} rAF x <= ${FREEZE_PASSES} passes   `
    + `tear retries ${TEAR_RETRIES}   rail gate settle ${RAIL_GATE_SETTLE_MS} ms   exclusions ${EXCLUSIONS.length}`
    + `   region roots ${POSE_REGION.length}   pose cells ${POSE_FIELDS.length}`);
  if (opts.control) console.log(`  null-tree control ${opts.control}`);
  if (opts.originB) console.log(`  two-tree origin B ${opts.originB}`);
  console.log('');

  const { chromium } = await import('playwright-core');
  const evidence = freshEvidence();
  const origins = [['A', opts.origin]];
  if (opts.control) origins.push(['CTRL', opts.control]);
  if (opts.originB) origins.push(['B', opts.originB]);

  const digests = new Map();
  for (const [, o] of origins) digests.set(o, await originDigest(o));
  if (opts.originB) evidence.originsIdentical = digests.get(opts.origin) === digests.get(opts.originB);
  for (const [tag, o] of origins) console.log(`  origin ${tag.padEnd(4)} ${o}  tree digest ${digests.get(o)}`);
  console.log('');

  /* SEQUENTIAL AND FRONTED. One browser exists at a time; the loop never
     starts a second before the first has closed. */
  const matrix = new Map();
  for (const [tag, o] of origins) {
    for (let s = 1; s <= opts.sessions; s++) {
      const label = `S${s}`;
      const poses = await session(chromium, chrome, o, opts, evidence, tag === 'A' ? label : `${tag}${label}`);
      for (const [k, rows] of poses) {
        if (!matrix.has(k)) matrix.set(k, []);
        matrix.get(k).push({ label: `${tag}/${label}`, origin: o, rows });
      }
    }
  }

  console.log(`  INPUTS  poses ${evidence.poseCount}   animations frozen ${evidence.animationsFrozen}   `
    + `freeze failures ${evidence.freezeFailures}   predicate misses ${evidence.predicateMisses}   `
    + `torn reads ${evidence.tornReads}   refreezes ${evidence.refreezes}   freeze passes ${evidence.freezePasses}   `
    + `residual ${evidence.residualAnimations}   hidden reads ${evidence.hiddenReads}   thin ${evidence.thinVectors}   `
    + `console errors ${evidence.consoleErrors}`);
  for (const m of evidence.misses) console.log(`          miss: ${m}`);
  for (const t of evidence.consoleTexts) console.log(`          console: ${t}`);
  SENT.reach('inputs');

  const trust = trustVerdict(evidence);
  if (!trust.trusted) {
    console.log('\nFAIL pose-run INCONCLUSIVE — no pose comparison is reported (D63)');
    for (const c of trust.causes) console.log(`     cause: ${c}`);
    SENT.reach('contract');
    process.exit(1);
  }

  /* ---- 1. EXACT reproducibility, per pose, across fresh sessions ---- */
  console.log('\n  EXACT — the same pose, read in fresh browser sessions against the same origin\n');
  const violations = [];
  const report = {};
  for (const [k, reads] of matrix) {
    const a = reads.filter((r) => r.origin === opts.origin);
    if (a.length < 2 || a.some((r) => !r.rows)) { violations.push(`${k}: fewer than two readable reads on origin A`); continue; }
    const rep = reproducibility(a);
    report[k] = { rows: rep.rows, digest: rep.digest, exact: rep.exact };
    console.log(`  ${rep.exact ? 'EXACT' : 'DIFFER'}  ${k.padEnd(22)} rows ${String(rep.rows).padStart(3)}  `
      + `digest ${rep.digest}  reads ${rep.reads}`);
    if (!rep.exact) {
      violations.push(`${k}: not reproducible across sessions on one origin`);
      for (const p of rep.pairs.filter((x) => !x.identical)) {
        console.log(`         ${p.a} vs ${p.b}: ${p.movedRows} row(s) moved`);
        for (const c of p.cells.slice(0, 12)) console.log(`           ${c}`);
      }
    }
  }

  /* ---- 2. the null-tree control -------------------------------------- */
  if (opts.control) {
    console.log('\n  NULL-TREE CONTROL — a second origin serving the SAME tree must produce the SAME poses\n');
    for (const [k, reads] of matrix) {
      const a = reads.find((r) => r.origin === opts.origin && r.rows);
      const c = reads.find((r) => r.origin === opts.control && r.rows);
      if (!a || !c) { violations.push(`${k}: the null-tree control produced no readable pair`); continue; }
      const cmp = comparePose(a.rows, c.rows);
      console.log(`  ${cmp.identical ? 'EXACT ' : 'DIFFER'}  ${k.padEnd(22)} A vs CTRL  ${cmp.movedRows} row(s) moved`);
      if (!cmp.identical) {
        violations.push(`${k}: the same tree on two origins produced different poses — cross-origin comparison is not sound here`);
        for (const cell of movedCells(a.rows, c.rows).slice(0, 12)) console.log(`           ${cell}`);
      }
    }
  }

  /* ---- 3. the two-tree protocol -------------------------------------- */
  if (opts.originB) {
    console.log('\n  TWO-TREE — the same discipline against origin B. A DIFFER here is a finding about the trees,\n'
      + '            not a failure of the harness: it is only readable because the control above is EXACT.\n');
    for (const [k, reads] of matrix) {
      const a = reads.find((r) => r.origin === opts.origin && r.rows);
      const b = reads.find((r) => r.origin === opts.originB && r.rows);
      if (!a || !b) { console.log(`  ABSENT  ${k.padEnd(22)} origin B produced no readable pose`); continue; }
      const cmp = comparePose(a.rows, b.rows);
      const cells = cmp.identical ? [] : movedCells(a.rows, b.rows);
      report[k] = { ...(report[k] || {}), twoTree: cmp.identical ? 'EXACT' : `${cmp.movedRows} rows / ${cells.length} cells` };
      console.log(`  ${cmp.identical ? 'EXACT ' : 'DIFFER'}  ${k.padEnd(22)} A vs B  rows ${cmp.lengthA}/${cmp.lengthB}  `
        + `${cmp.movedRows} row(s), ${cells.length} cell(s) moved`);
      for (const cell of cells.slice(0, 8)) console.log(`           ${cell}`);
      if (cells.length > 8) console.log(`           ... and ${cells.length - 8} more`);
    }
  }

  if (opts.record) {
    writeFileSync(opts.record, JSON.stringify({
      origin: opts.origin, control: opts.control, originB: opts.originB,
      sessions: opts.sessions, viewport: [opts.width, opts.height],
      freezePhaseMs: FREEZE_PHASE_MS, exclusions: EXCLUSIONS, evidence, report,
      vectors: [...matrix].map(([k, reads]) => [k, reads.map((r) => ({ label: r.label, digest: r.rows ? vectorDigest(r.rows) : null }))]),
      /* The full vectors of origin A's first session, so a gated suite can
         run this module's arithmetic over a REAL pose without a browser —
         PAGE-01's recorded-trace pattern, and subject to the same caveat it
         states: a recording proves the oracle, never today's page. */
      full: [...matrix].map(([k, reads]) => {
        const a = reads.find((r) => r.origin === opts.origin && r.rows);
        return [k, a ? a.rows : null];
      }),
    }, null, 1));
    console.log(`\n  recorded to ${opts.record}`);
  }

  SENT.reach('contract');
  if (violations.length) {
    console.log('\nFAIL pose-run — the freeze-then-read discipline did not hold:');
    for (const v of violations) console.log(`  ${v}`);
    process.exit(1);
  }
  console.log('\n  every pose is EXACTLY reproducible across fresh sessions'
    + `${opts.control ? ' and across two origins serving the same tree' : ''}.`);
  process.exit(0);
}

main().catch((e) => {
  console.log(`FAIL pose-run ${e instanceof HarnessFault ? 'HARNESS FAULT' : 'THREW'} — ${e.message}`);
  process.exit(1);
});
