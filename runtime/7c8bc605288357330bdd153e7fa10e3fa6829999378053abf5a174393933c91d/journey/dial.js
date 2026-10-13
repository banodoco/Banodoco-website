// journey/dial.js — THE taste-dial registry (M5 debt burn-down,
// journey-v6-plan/15-merge-and-architecture.md M5 row + §1 rule 6:
// "taste is a dialed number, not a guess").
//
// Extracted from the TRANSFORM dial (journey/chapters/inspire/index.js,
// 2026-08-03, review round 8) — the one pattern every TRANSFORM-class knob
// (perceptual intensities with a shipped default and a live QA control)
// needs: shipped-by-default / QA-activated-by-query / clamped-and-stepped /
// key-adjustable / read-out / persisted-while-QA. TRANSFORM is re-implemented
// on top of this file with IDENTICAL observable behaviour (see inspire's
// module-scope comment for the full provenance); it is this registry's ONE
// client — do not add dials for other knobs here, add the CALL SITE there
// (handheld amplitude, commit blend — merge doc §1 rule 6) once the taste
// owner is ready to dial them, each a one-liner against createDial().
//
// FLAG-REGISTRY BOUNDARY: this module never touches location.search or
// localStorage itself — that would make it a second flag parser, exactly
// what ../flags.js exists to prevent. Every createDial() call site reads
// its own activation/value/storage through ../flags.js and passes them in
// as plain config (see chapters/inspire/index.js for the TRANSFORM
// instantiation). dial.js owns only the PATTERN: clamping, keys, the
// readout DOM, and calling the caller's persist hook.
//
// REGISTRATION (J04c, 2026-08-22). The two things this module attaches to
// something it does not own — one QA-only `keydown` on the global, and the
// readout element it appends to `document.body` — go through a single named
// owner, so both are countable. ON THE SHIPPED PATH IT REGISTERS NOTHING AT
// ALL: the listener is inside a `qaDial` branch and the readout is created
// only from showDial(), which returns early when `qaDial` is false. There is
// no `destroy()` any more and there never was a caller for one; see
// docs/code-health/DISPOSAL-REMOVED.md.
//
// THE OWNER LIVES UNDER journey/ui/ AND SHOULD NOT — this module is not UI.
// `lifecycle.md` §2 names it `journey/lifecycle/owner.js`; the relocation is
// open debt, not an accepted shape. Why it landed there and why each order
// since has been unable to move it:
// docs/code-health/evidence/2026-08-21-elegance-run-01/e01/relocated/journey-dial.md

import { createOwner } from './ui/owner.js';

let _readoutCount = 0; // stacks multiple simultaneous dials' readouts without overlap

/**
 * @param {object} o
 * @param {string} o.name        Display name for the readout (e.g. 'transform').
 * @param {number} o.shipped     The shipped default value (non-QA path).
 * @param {number} [o.min=0]     Clamp floor.
 * @param {number} [o.max=1]     Clamp ceiling.
 * @param {number} [o.step=0.05] Grid step: values snap to this grid (kills
 *                                float-step residue) and key-adjustment moves
 *                                by exactly one step.
 * @param {[string,string]} [o.keys=['[',']']] [decrement, increment] key pair.
 *                                Guarded exactly like every other raw-listener
 *                                key seam in this codebase (M5 key-routing
 *                                pass): a modified chord or a text-entry
 *                                target never reaches the dial.
 * @param {(v:number)=>string} [o.format] Formats the value for the readout.
 * @param {boolean} o.active     Whether QA mode is on for this dial (caller
 *                                supplies from flags.js, e.g. T_QA_ACTIVE).
 * @param {string|null} o.qsValue Raw query value string, or null (caller
 *                                supplies from flags.js, e.g. T_QS_VALUE).
 * @param {() => (string|null)} [o.loadStored] Reads the persisted QA value.
 * @param {(v:number) => void}  [o.saveStored] Writes the persisted QA value.
 * @param {(v:number) => void}  [o.onChange]   Fires on every value change
 *                                AFTER construction (key press or an
 *                                external .set() call) — NOT at construction,
 *                                so a one-liner instantiation never triggers
 *                                a self-referential update loop; read
 *                                `.value` directly for the initial number.
 * @returns {{ readonly value: number, readonly active: boolean,
 *             set: (v: number, opts?: { persist?: boolean }) => number,
 *             destroy: () => void }}
 */
export function createDial({
  name,
  shipped,
  min = 0,
  max = 1,
  step = 0.05,
  keys = ['[', ']'],
  format = (v) => v.toFixed(2),
  active = false,
  qsValue = null,
  loadStored = () => null,
  saveStored = () => {},
  onChange = null,
} = {}) {
  // decimal digits needed to represent `step` (0.05 -> 2, 0.1 -> 1, ...):
  // mirrors the TRANSFORM dial's clampT (Math.round(v * 100) / 100 for
  // step 0.05) generalised to any step, killing float-step residue from
  // repeated +/- step key presses.
  const stepStr = step.toString();
  const dot = stepStr.indexOf('.');
  const stepDecimals = dot === -1 ? 0 : stepStr.length - dot - 1;
  const stepK = 10 ** stepDecimals;
  const clamp = (v) => {
    v = v < min ? min : v > max ? max : v;
    return Math.round(v * stepK) / stepK;
  };

  const qaDial = !!active;
  let v = shipped;

  /* THIS DIAL'S OWNER (J04c). Created on BOTH paths, deliberately: a shipped
     dial registers nothing, and the funnel is where that zero is read. It
     registers nothing by existing. */
  const owner = createOwner(`dial:${name}`);

  // SHIPPED: the baked default, nothing else consulted. QA (active): the
  // query value if it parses, else the last persisted QA value, else the
  // baked default. Only an interactive key adjustment (or an explicit
  // persist: true .set() call) writes storage, so a one-off query trial
  // never silently overwrites a saved QA setting — and the shipped path
  // never even calls loadStored/saveStored.
  if (qaDial) {
    const qv = qsValue === null ? NaN : parseFloat(qsValue);
    if (Number.isFinite(qv)) v = clamp(qv);
    else {
      const sv = parseFloat(loadStored());
      if (Number.isFinite(sv)) v = clamp(sv);
    }
  }

  // small unobtrusive readout, bottom-left, journey styling, out of the a11y
  // tree (it is a taste tool, not content). QA-only: on a plain load this DOM
  // never exists — showDial() gates on qaDial and nothing else calls it. In
  // QA mode it appears at boot and stays visible (no fade): the whole point
  // of the session is reading the number. Multiple simultaneous dials stack
  // upward from the same corner instead of overlapping.
  const readoutSlot = _readoutCount++;
  let dialEl = null, dialVal = null;
  function showDial() {
    if (!qaDial || typeof document === 'undefined') return;
    if (!dialEl) {
      if (!document.getElementById('j-dial-style')) {
        const st = document.createElement('style');
        st.id = 'j-dial-style';
        st.textContent = [
          '.j-dial { position: fixed; left: 2.4vw; z-index: 40;',
          '  font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase;',
          '  color: var(--muted, #c9bfa8); opacity: 0; transition: opacity 0.35s;',
          '  pointer-events: none; user-select: none; }',
          '.j-dial b { color: var(--gold-bright, #f0c877); font-weight: 400; }',
        ].join('\n');
        document.head.appendChild(st);
      }
      dialEl = document.createElement('div');
      dialEl.className = 'j-dial';
      dialEl.style.bottom = `calc(3.2vh + ${readoutSlot * 2.6}em)`;
      dialEl.setAttribute('aria-hidden', 'true');
      dialEl.append(name + ' ');
      dialVal = document.createElement('b');
      dialEl.appendChild(dialVal);
      document.body.appendChild(dialEl);
      /* The readout is the only DOM this module creates, and `#j-dial-style`
         is one shared page-level stylesheet for every dial (the id guard is
         what makes it one). Both live as long as the document does. */
    }
    dialVal.textContent = format(v);
    dialEl.style.opacity = 1;
  }

  // key-adjust in `step` increments, clamped, persisting. QA-only: the
  // listener is not even registered on a plain load.
  /* THE TARGET IS SPELLED OUT, AND IT IS THE SAME TARGET AS BEFORE (J04c).
     What stood here was a bare, unqualified `addEventListener` call on the
     'keydown' type — deliberately not re-spelled with its parenthesis here,
     because M6's comment filter (render-report-lib.mjs's `isCode`) only
     rejects lines starting `//` or `*` and would count this line as a
     fourth call site (D101's shape, met while re-baselining M6). An
     unqualified call resolves the identifier through the global environment
     record — i.e. to `globalThis.addEventListener` — and WebIDL's
     global-object fallback for a `this` of `undefined` is why the bare form
     worked at all. `owner.listen` needs a named target to remove FROM, so the
     target is written down. The guard is deliberately left exactly as it was:
     `typeof addEventListener` tests the same property this now calls, so the
     registration remains conditional on precisely what it was conditional on
     (design.md J-H19 — a conditional registration stays conditional). */
  if (qaDial && typeof addEventListener === 'function') {
    owner.listen(globalThis, 'keydown', (e) => {
      if (e.key !== keys[0] && e.key !== keys[1]) return;
      // same raw-listener seam guard as every other key handler in this
      // codebase (M5 key-routing pass): modified chords are browser
      // shortcuts, text-entry targets get their keystrokes, not the dial.
      if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      api.set(v + (e.key === keys[1] ? step : -step), { persist: true });
    });
    showDial(); // QA boot: surface the live value immediately
  }

  const api = {
    get value() { return v; },
    get active() { return qaDial; },
    set(nv, { persist = false } = {}) {
      v = clamp(nv);
      if (persist && qaDial) saveStored(v);
      showDial();
      if (onChange) onChange(v);
      return v;
    },
  };
  return api;
}
