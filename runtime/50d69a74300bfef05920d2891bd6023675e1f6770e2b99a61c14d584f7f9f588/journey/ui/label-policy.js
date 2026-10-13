const STYLE_ID = 'j-hot-label-policy';

function ensureStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = [
    '.j-hot.label-hover { background: transparent; }',
    '.j-hot.label-hover:not(.bare) > * { opacity: 0; transition: opacity 0.3s; }',
    '.j-hot.label-hover:not(.bare):is(:hover, .hot, :focus-visible) { background: rgba(18, 12, 4, 0.6); }',
    '.j-hot.label-hover:not(.bare):is(:hover, .hot, :focus-visible) > * { opacity: 1; }',
    '@media (prefers-reduced-motion: reduce) { .j-hot.label-hover:not(.bare) > * { transition: none; } }',
  ].join('\n');
  document.head.appendChild(style);
}

/** The `label-hover` rules are this module's own DOM. Installing them is not a
 *  write to anyone else's record, so it stays here — the caller asks for them
 *  by name once it knows the plan calls for them. */
export function ensureLabelHoverStyles() {
  ensureStyles();
}

/** DECIDE what a chapter-owned visual label policy does to a hotspot record.
 *
 *  THIS FUNCTION DOES NOT WRITE THE RECORD, AND THAT IS THE POINT (D158/D153,
 *  order U04). It used to: `applyHotspotLabelPolicy` property-wrote `.label`,
 *  `.labelEl`, `.chipBare`, `.dotEl` and `.labelOnHover` on a record whose
 *  object literal is created in `journey/ui.js`, which that file also writes
 *  eight times. Two modules mutating one object is a record with no owner —
 *  G1 rule (b), and the only cross-module mutable coupling the module census
 *  could see in the whole tree. *"A pin that mirrors another pin has no way to
 *  learn that the original was retired."*
 *
 *  So: the policy is knowledge, the record is `ui.js`'s. This returns a plan
 *  and the owner performs it. The plan is deliberately flat and literal —
 *  every field is a decision, none is an instruction to run — so the caller's
 *  apply block reads as the sequence of DOM operations it actually is.
 *
 *  `null` means "no policy, change nothing", which is the old early return.
 */
export function resolveHotspotLabelPolicy(hotspot, policy) {
  if (!policy) return null;
  const rename = (typeof policy.label === 'string' && policy.label) ? policy.label : null;
  const bare = policy.chip === 'none';
  // Read AFTER the bare decision, exactly as the old body read `hotspot.chipBare`
  // after assigning it — a bare chip is `labelOnHover` in every sense.
  const chipBare = bare ? true : hotspot.chipBare;
  return {
    rename,
    // The accessible name is the renamed label when there is one, and the
    // record's existing label otherwise; the old code read `hotspot.label`
    // back after the assignment above, which is the same value.
    label: rename !== null ? rename : hotspot.label,
    bare,
    chipBare,
    /* CORRECTED, DEFECT-01 (2026-08-23). This read `!!policy.labelOnHover ||
       chipBare`, which yields `undefined` — not `false` — whenever the policy
       declines the flag AND `hotspot.chipBare` is unset. The caller feeds the
       result to `classList.toggle(name, force)`, and WebIDL treats an explicit
       `undefined` for an optional `boolean` as ABSENT, so that call TOGGLES
       instead of forcing off: the class lands on a chip that should not have
       it, and every re-application inverts it again. Measured, four
       applications with each value:
           toggle('label-hover', false)     -> off off off off
           toggle('label-hover', undefined) -> ON  off ON  off
       `!!chipBare` closes it: the plan's every field is now a real boolean, so
       the toggle is a statement and not a flip.

       WHAT THIS DID NOT FIX, stated because the defect report guessed
       otherwise. It was NOT reachable on any shipped path, and it is not why
       Inspire's labels went missing on a phone. `addHotspot` initialises
       `chipBare: false` in the record literal BEFORE it calls
       `policies.register`, so every production hotspot answers `false` here
       and always got a proper boolean; and the only chapter that returns a
       policy at all (Owned) returns `chip: 'none'`, which takes the `bare`
       branch above and answers `true`. The `undefined` was reachable only from
       a record with no `chipBare` — a harness double, or the next chapter to
       declare `labelOnHover: false`. So this is a trap disarmed before anyone
       stepped in it, not a visitor-facing repair. The Inspire symptom is
       DEFECT-01 #2's boundary crossing; see the hero-shelf note in
       journey/ui/copy-arrival.js. */
    labelOnHover: !!policy.labelOnHover || !!chipBare,
  };
}
