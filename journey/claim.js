// The manual-input claim — the model's answer to "is the visitor's hand on
// this motion right now?"  (J04a-3; boundaries.md §A.8 / §A.9.)
//
// WHY THIS FILE EXISTS. Until now that question was asked from OUTSIDE the
// model, in journey/journey.js's blendCancelled(), by reading two raw
// diagnostic getters and applying a threshold the model had never heard of:
//
//     return scroll.sinceInput < 50 && scroll.answeredAt === null;
//
// One half of that predicate — the arrival wall — is the model's own state.
// The other half — the 50 ms freshness window — existed NOWHERE in
// journey/scroll.js: no such constant, no such test, only a getter that
// subtracts a timestamp. boundaries.md §A.9 is exact about what that makes
// this change, and it is a bigger claim than "publish what you already
// compute":
//
//     J04a MOVES A POLICY INTO THE MODEL. It does not remove a duplication.
//
// So the threshold arrives NAMED, beside the model's other thresholds, with
// the whole of its reasoning attached, and it is never inlined. A threshold
// that arrives in a file without its reasoning is how the next wave
// "simplifies" it.
//
// WHAT THIS FILE DELIBERATELY DOES NOT HOLD. The predicate itself is authored
// inside createScrollModel()'s closure (journey/scroll.js, `claimNow`), where
// it reads `lastInput`, `answeredP` and `lastDir` directly. It is NOT
// implemented here over the model's published getters. A module that reads
// `scroll.sinceInput` and calls the result a decision is a RELABELLING: it
// re-creates the exact duplication §A.9 exists to remove, one file further
// out, while passing every focused proof to the letter. This file holds the
// TYPE, the THRESHOLD, the THRESHOLD'S REASONING and the PORT REGISTRY. The
// model holds the policy.

/** ONE ANSWER TO ONE QUESTION, ASKED AT ONE INSTANT. Frozen at construction.
 *
 *  @typedef {null | Readonly<{ dir: 1|-1|0 }>} ManualClaim
 *
 *  null   — the model is REFUSING the visitor's current input (an answered
 *           gesture's momentum tail), or no input is fresh.
 *  {dir}  — input the model ACTS ON is live at this instant. `dir` is the
 *           model's own `lastDir`, never a re-derivation from position.
 *
 *  The discriminated `null | {dir}` shape is the point: there is no scalar
 *  here to truthiness-test, so `dir === 0` (a placement, a standing start)
 *  cannot be mistaken for "no claim" the way `answeredAt === 0` — the Mission
 *  anchor — has repeatedly been mistaken for "no wall" (J-H2).
 *
 *  MAGNITUDE RULE (boundaries.md §A.5), stated so a reviewer can apply it in
 *  ten seconds: no field of a ManualClaim may be a rate, a duration, a count,
 *  an EMA, a peak, or a threshold-relative fraction. `dir` is a sign. That is
 *  a REVIEW CRITERION, not an enforcement mechanism.
 */

/** THE FRESHNESS WINDOW, AND THE REASONING THAT BOUGHT IT.
 *  =======================================================
 *  Relocated from journey/journey.js's blendCancelled() per boundaries.md
 *  §A.9, which requires the constant to move with its reasoning rather than
 *  arrive bare. (§A.9 calls it "the twenty-four-line rationale"; the block as
 *  authored is 51 non-blank lines. The block is what moved.)
 *  The text below is the rationale as authored there, verbatim
 *  line for line (re-indented to this file's margin, and pinned as such by
 *  tools/test-input-claim.mjs C3). journey.js still carries its copy until
 *  J01 deletes blendCancelled(); C3 is the row that proves the two agree, and
 *  J01 retires C3 when it removes the original.
 *
 *  THE GESTURE THAT BOUGHT THE MOVE IS NOT THE VISITOR CANCELLING IT
 *  (2026-08-14 — Hannah: "it still just jumps DIRECTLY when I scroll up
 *  from the top, or down from the bottom").
 *
 *  Manual input drops the blend — and with it the arrival the copy was
 *  being timed against. Handing the copy back to the scroll rule here
 *  (rather than letting the envelope play out over a camera that is no
 *  longer travelling) is what keeps the two from fighting: the scroll
 *  rule picks the block up at exactly the opacity the envelope had
 *  reached, so there is no step and no second animation.
 *
 *  That rule was written for a jump the visitor asks for with a CLICK,
 *  where any scroll afterwards is unambiguously them taking the camera
 *  back. A WRAP is asked for with the scroll itself, and it is armed from
 *  inside scroll.update() — one line before applyFrame() runs in the very
 *  same frame (see the tick order in boot()). `sinceInput` at that moment
 *  is the age of the wheel delta that just caused the wrap: measured on a
 *  real wheel-driven wrap, 1.3 ms forward and 7.1 ms back. So the test
 *  below fired on the blend's OWN FIRST FRAME and every wrap ran exactly
 *  ZERO blend frames — the camera stood where placeAt's director pass had
 *  put it, which is the destination. Measured before this change: the
 *  camera moved 14.6643 world units in ONE frame and did not move again
 *  for the next 5 s. A teleport, in both directions, on every wrap.
 *
 *  Two passes missed it because both measured the wrap through
 *  `journey.wrap(dir)`, the QA hook — which is navigateTo() with no wheel
 *  event anywhere near it, so `sinceInput` is ~1e9 and the blend runs in
 *  full. Same call, same destination, traced side by side: the QA hook
 *  travels 76.42 units over 3.8 s across 178 frames; the wheel does 14.66
 *  units in one frame. `2c22844`'s authored 4 s lap and its frame strip
 *  were real — and unreachable by any visitor. The lesson is that a wrap
 *  must never be gated from a script that does not deliver the input that
 *  causes it.
 *
 *  THE RULE IS NOW: a blend is cancelled by input the model ACTS ON.
 *  Input the model is currently refusing is not the visitor taking
 *  control — it is the gesture that asked for this move still finishing.
 *  `scroll.answeredAt` is exactly that refusal: the arrival wall, which
 *  the wrap raises at the end of its own placement (scroll.js) and which
 *  makes `carrying()` refuse every remaining delta of the same gesture.
 *  While it stands, the tail of the flick buys nothing and moves nothing,
 *  so cancelling on it could only strand the camera mid-lap.
 *
 *  It comes down — and the camera goes back to the visitor — on exactly
 *  the three events that already mean "the visitor is asking for
 *  something new": an ARRIVAL_HOLD_MS (90 ms) pause, a reversal, or a
 *  placement (dropWall). Tying the camera hand-back to that same
 *  threshold is the point rather than a coincidence: the instant a
 *  visitor has earned another section is the instant they have earned the
 *  camera back.
 *
 *  Safe for the click jump it was written for, whose contract is
 *  unchanged: directJumpTo -> placeAt -> setProgress -> newGesture ->
 *  dropWall, so the wall is DOWN on every frame of a click blend and the
 *  first stray delta still cancels it within one frame. (`answeredAt` can
 *  be 0 — the Mission anchor — so this must be a null test, never a
 *  truthiness test.)
 */
export const MANUAL_CLAIM_FRESH_MS = 50;

/* The three claims, minted once. A claim is a value, not a record of an
   event: two frames that agree about the visitor's hand agree about the
   claim, so there is nothing to allocate per frame and E-A3's "frozen at
   construction" is a property of the module rather than a discipline the
   caller has to keep. */
export const CLAIM_FORWARD = Object.freeze({ dir: 1 });
export const CLAIM_BACKWARD = Object.freeze({ dir: -1 });
export const CLAIM_UNDIRECTED = Object.freeze({ dir: 0 });

/** The claim for a travel direction. Total over every number, so there is no
 *  unreachable arm and nothing to fall through: the model's `lastDir` is
 *  always one of -1, 0, 1 (tools/test-input-claim.mjs A5 pins that domain
 *  over a live trace), and for those three this is the identity.
 *  @param {number} dir  the model's own lastDir
 *  @returns {Readonly<{ dir: 1|-1|0 }>} */
export function manualClaim(dir) {
  if (dir > 0) return CLAIM_FORWARD;
  if (dir < 0) return CLAIM_BACKWARD;
  return CLAIM_UNDIRECTED;
}

/* THE PORT, AND WHY IT IS NOT A TWENTY-SEVENTH MEMBER OF THE MODEL.
   ================================================================
   boundaries.md §A.6 E-A2 wants the transition controller constructed as
   createTransitionController({ decisions, input, frame, … }) with NO `scroll`
   parameter, so that a reach for a diagnostic getter has no identifier to
   reach through. `input` is this port: the model's decision surface, and
   nothing else.

   It is handed out through a WeakMap keyed on the model rather than as a root
   member for two reasons. The model's root member set is pinned as a literal
   list of 26 — `tools/test-road.mjs` `F3` is the live one — so a
   twenty-seventh member is a red gate, not a design choice. And a WeakMap
   keeps the port per-model, which the trace suites need: they build many rigs
   in one process.

   boundaries.md §A.8 writes `input.claimNow()` without saying how `input` is
   obtained; this is that answer. */
const PORTS = new WeakMap();

/** Publish a model's decision surface. Called once, by the model, at the end
 *  of construction. The port is frozen here so the model cannot hand out a
 *  mutable one by accident (E-A3).
 *  @template T @param {object} model @param {T} port @returns {Readonly<T>} */
export function publishInputPort(model, port) {
  const frozen = Object.freeze(port);
  PORTS.set(model, frozen);
  return frozen;
}

/** The decision surface of a model, or null if it has none.
 *  @param {object} model
 *  @returns {null | Readonly<{ claimNow: () => ManualClaim,
 *                              retire: (dir: number) => void }>} */
export function inputPortOf(model) {
  if (!model) return null;
  return PORTS.get(model) || null;
}
