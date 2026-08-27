// C01 — deterministic characterization harness for journey/scroll.js.
//
// NOT A TEST FILE. It installs the DOM-free globals journey/scroll.js needs,
// imports the model once, and exposes a rig that records every RAW SAMPLE and
// every FRAME alongside the SEMANTIC DECISIONS that step produced. Consumers:
//   tools/test-scroll-trace.mjs        the characterization traces
//   tools/test-scroll-perturbation.mjs the deliberate-failure evidence
//
// Nothing here touches production source. Every decision below is derived by
// diffing the model's own published getters between steps, so the trace can
// only ever describe behaviour the shipped surface already exposes.
//
// Run order matters: the globals are installed at module scope, BEFORE the
// dynamic import of the model, because journey/scroll.js reads matchMedia,
// document.hidden and location.search at module-evaluation time.

let now = 0;

/** The whole environment's clock. Every test advances it explicitly. */
export const clock = {
  get now() { return now; },
  set(v) { now = v; },
  advance(ms) { now += ms; return now; },
};

/** DESKTOP_PACING is captured once at module load, but `.matches` is read on
 *  every clampRate() call — so a live getter lets a trace select touch pacing
 *  (the shipped default in tools/scroll-touch-gates.mjs) or fine-pointer
 *  desktop pacing without reloading the module or touching source. */
export const pacing = { desktop: false };

const handlers = new Map();
const addListener = (type, fn) => {
  const list = handlers.get(type) || [];
  list.push(fn);
  handlers.set(type, list);
};

export const env = {
  hidden: false,
  activeElement: null,
  innerHeight: 932,
};

globalThis.performance = { now: () => now };
globalThis.location = { search: '', hash: '', pathname: '/' };
globalThis.matchMedia = () => ({ get matches() { return pacing.desktop; } });
globalThis.getComputedStyle = (node) => ({ overflowY: node.overflowY || 'visible' });
globalThis.document = {
  get hidden() { return env.hidden; },
  body: { nodeType: 1 },
  get activeElement() { return env.activeElement; },
  addEventListener: addListener,
};
globalThis.window = {
  get innerHeight() { return env.innerHeight; },
  addEventListener: addListener,
};

const model = await import('../journey/scroll.js');
export const { createScrollModel, claimInput, releaseInput } = model;

/** Dispatch to every capture listener scroll.attach() registered. */
export function dispatch(type, event) {
  for (const fn of handlers.get(type) || []) fn(event);
}

export const SURFACE = { nodeType: 1, isConnected: true };

/* ------------------------------------------------------------------ *
 * The rig: raw samples and frames in, trace of cited decisions out.   *
 * ------------------------------------------------------------------ */

function snap(scroll) {
  const bg = scroll.bootGuardState;
  return {
    p: scroll.progress,
    surface: scroll.surface,
    lastDir: scroll.lastDir,
    rate: scroll.rate,
    peak: scroll.gesturePeak,
    streaming: scroll.streaming,
    resolving: scroll.resolving,
    target: scroll.resolveTarget,
    cruise: scroll.resolveCruise,
    answered: scroll.answeredAt,
    gliding: scroll.gliding,
    commit: scroll.commitP,
    guard: `${bg.active ? 'on' : 'off'}:${bg.dir}:${bg.reason}`,
  };
}

const r6 = (v) => (typeof v === 'number' ? +v.toFixed(6) : v);

/** The semantic decisions a single step produced, each derived from a getter
 *  the model already publishes. An empty array is a legitimate outcome and the
 *  traces assert it. */
function decisionsBetween(before, after, extra) {
  const out = [...extra];
  if (before.lastDir !== after.lastDir) out.push(`dir=${after.lastDir}`);
  if (!before.resolving && after.resolving) out.push(`intent.arm->${r6(after.target)}`);
  else if (before.resolving && after.resolving && before.target !== after.target) {
    out.push(`intent.retarget ${r6(before.target)}->${r6(after.target)}`);
  } else if (before.resolving && !after.resolving) out.push('intent.release');
  if (before.cruise === null && after.cruise !== null && after.resolving) {
    out.push(`cruise.latch=${r6(after.cruise)}`);
  }
  if (before.answered === null && after.answered !== null) out.push(`wall.raise@${r6(after.answered)}`);
  if (before.answered !== null && after.answered === null) out.push('wall.drop');
  if (before.peak !== 0 && after.peak === 0) out.push('peak.spend');
  if (!before.streaming && after.streaming) out.push('stream.on');
  if (before.streaming && !after.streaming) out.push('stream.off');
  if (!before.gliding && after.gliding) out.push('glide.on');
  if (before.gliding && !after.gliding) out.push('glide.off');
  if (before.guard !== after.guard) out.push(`guard:${after.guard}`);
  return out;
}

export function createRig({ onIntent = null, onWrap = null, desktop = false } = {}) {
  pacing.desktop = !!desktop;
  const events = [];
  const scroll = createScrollModel({
    // Only a REFUSAL is a decision: onIntent is consulted on every sample,
    // so recording the consultation itself would bury the trace.
    onIntent: (kind) => {
      const answer = onIntent ? onIntent(kind) : true;
      if (answer === false) events.push(`intent.consumed(${kind})`);
      return answer;
    },
    onWrap: onWrap === false ? null : (dir) => {
      events.push(`wrap(${dir})`);
      if (typeof onWrap === 'function') onWrap(dir, scroll);
    },
  });
  scroll.attach();
  scroll.enabled = true;

  const trace = [];
  let n = 0;
  let recording = false;
  let before = snap(scroll);

  function step(label, detail, run) {
    const pre = recording ? before : snap(scroll);
    events.length = 0;
    run();
    const post = snap(scroll);
    const id = `${label}${++n}`;
    if (recording) {
      trace.push({
        id,
        at: +now.toFixed(3),
        detail,
        p: r6(post.p),
        decisions: decisionsBetween(pre, post, events.slice()),
      });
      before = post;
    }
    return post;
  }

  const api = {
    scroll,
    trace,
    get now() { return now; },
    record() { recording = true; before = snap(scroll); trace.length = 0; n = 0; return api; },
    stop() { recording = false; return api; },

    /** One wheel event. `gap` advances the INPUT clock only — no frame runs,
     *  so an event delivered with no rAF between it and the next one is the
     *  default rather than a special case. */
    wheel(deltaY, gap = 16, { deltaMode = 0, target = SURFACE, cancelable = true } = {}) {
      return step('S', `wheel dy=${deltaY} gap=${gap} mode=${deltaMode}`, () => {
        now += gap;
        dispatch('wheel', { target, deltaY, deltaMode, cancelable, preventDefault() {} });
      });
    },

    /** One rAF. `dt` is seconds, and the wall clock advances by exactly dt. */
    frame(dtMs = 16) {
      return step('F', `frame dt=${dtMs}ms`, () => {
        now += dtMs;
        scroll.update(dtMs / 1000);
      });
    },

    /** A frame whose dt the caller controls independently of the wall clock —
     *  how the site's own animator behaves when it caps dt after a long frame. */
    frameCapped(wallMs, dtMs) {
      return step('F', `frame wall=${wallMs}ms dt=${dtMs}ms`, () => {
        now += wallMs;
        scroll.update(dtMs / 1000);
      });
    },

    key(key, opts = {}) {
      let prevented = false;
      const out = step('S', `key ${key}${opts.repeat ? ' (repeat)' : ''}`, () => {
        now += opts.gap === undefined ? 16 : opts.gap;
        dispatch('keydown', {
          key,
          target: opts.target || document.body,
          repeat: !!opts.repeat,
          metaKey: !!opts.metaKey,
          ctrlKey: !!opts.ctrlKey,
          altKey: !!opts.altKey,
          shiftKey: !!opts.shiftKey,
          isComposing: !!opts.isComposing,
          defaultPrevented: !!opts.defaultPrevented,
          preventDefault() { prevented = true; },
        });
      });
      out.prevented = prevented;
      return out;
    },

    touchStart(y, { target = SURFACE, touches = null } = {}) {
      return step('S', `touchstart y=${y}`, () => {
        dispatch('touchstart', {
          target,
          touches: touches || [{ clientY: y }],
          cancelable: true,
          preventDefault() {},
        });
      });
    },
    touchMove(y, gap = 16, { target = SURFACE, touches = null } = {}) {
      return step('S', `touchmove y=${y} gap=${gap}`, () => {
        now += gap;
        dispatch('touchmove', {
          target,
          touches: touches || [{ clientY: y }],
          cancelable: true,
          preventDefault() {},
        });
      });
    },
    touchEnd({ target = SURFACE } = {}) {
      return step('S', 'touchend', () => {
        dispatch('touchend', { target, touches: [], cancelable: true, preventDefault() {} });
      });
    },

    visibilityChange(hidden) {
      return step('S', `visibilitychange hidden=${hidden}`, () => {
        env.hidden = hidden;
        dispatch('visibilitychange', {});
      });
    },

    call(label, fn) { return step('S', label, fn); },

    /** Run frames until nothing is moving any more. Deliberately NOT recorded
     *  step-by-step: it is a tail, not a decision site. */
    settle(ms = 8000, dtMs = 16) {
      const wasRecording = recording;
      recording = false;
      for (let e = 0; e < ms; e += dtMs) { now += dtMs; scroll.update(dtMs / 1000); }
      recording = wasRecording;
      if (recording) before = snap(scroll);
      return snap(scroll);
    },

    /** Place at p and let every eased term settle, with nothing recorded. */
    reset(p = 0) {
      const wasRecording = recording;
      recording = false;
      scroll.setProgress(p);
      for (let i = 0; i < 30; i++) { now += 16; scroll.update(0.016); }
      recording = wasRecording;
      if (recording) { before = snap(scroll); trace.length = 0; n = 0; }
      return snap(scroll);
    },

    snapshot() { return snap(scroll); },
  };
  return api;
}

/* ------------------------------------------------------------------ *
 * Assertion bookkeeping shared by the trace and perturbation files.  *
 * ------------------------------------------------------------------ */

export function createLedger(title) {
  const rows = [];
  return {
    rows,
    check(area, name, pass, value, trace) {
      rows.push({ area, name, pass: !!pass, value, trace });
      return !!pass;
    },
    near(area, name, value, expected, eps = 2e-3, trace) {
      const pass = Math.abs(value - expected) <= eps;
      rows.push({
        area, name, pass, value: r6(value),
        trace: { expected, ...(trace || {}) },
      });
      return pass;
    },
    same(area, name, value, expected, trace) {
      const a = JSON.stringify(value);
      const b = JSON.stringify(expected);
      rows.push({ area, name, pass: a === b, value: a, trace: { expected: b, ...(trace || {}) } });
      return a === b;
    },
    report() {
      let failed = 0;
      const byArea = new Map();
      for (const row of rows) {
        if (!row.pass) failed++;
        byArea.set(row.area, (byArea.get(row.area) || 0) + 1);
      }
      for (const row of rows) {
        const value = typeof row.value === 'number' ? row.value.toFixed(6) : String(row.value);
        console.log(`${row.pass ? 'PASS' : 'FAIL'} [${row.area}] ${row.name}: ${value}`
          + (row.trace ? ` ${JSON.stringify(row.trace)}` : ''));
      }
      const areas = [...byArea].map(([a, c]) => `${a}=${c}`).join(' ');
      console.log(`${title}: ${rows.length - failed}/${rows.length} PASS (${areas})`);
      return failed;
    },
  };
}

export { r6 };
