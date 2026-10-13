/* ==================================================================== *
 * journey/ui/label-policies.js — the hotspot label-policy owner (U06).
 *
 * WHAT IT DECIDES: what each chapter wants its own nodes' chips to say and
 * to draw — a rename, a bare chip, hover-only revelation — asked ONCE per
 * node and applied by this owner alone.
 *
 * WHY IT IS AN OWNER. It was the last shared mutable binding in `createUI`:
 * `policyPending`, written by `addHotspot` and by the resolver, read by
 * `update()`, and touched by four sub-owners. A one-shot latch read from
 * the frame loop is a state machine, however small, and it was the reason
 * `update()`'s first statement was an `if` rather than a call.
 *
 * ---- G3: NAME THE MACHINE -------------------------------------------
 *
 *   states   SETTLED <-> PENDING
 *   mode     `pending`. true = at least one registered node still has no
 *            answer from its chapter, so ask again on the next frame.
 *   events   `register(h, declared)` — a registration that states the flag
 *            outright is already resolved and applies synchronously; one
 *            that says nothing sets PENDING.
 *            `resolve()` — one sweep. Every node whose chapter is now
 *            reachable gets its answer and is marked done; any node whose
 *            chapter is still absent re-arms PENDING. Called every frame
 *            and cheap in the settled case: it returns on the latch.
 *   writers  exactly two, which is G2's bar met rather than waived.
 *
 * THE FRAME RETRY IS VESTIGIAL AND DELIBERATELY KEPT — see `resolve()`.
 * ==================================================================== */

import { resolveHotspotLabelPolicy, ensureLabelHoverStyles } from './label-policy.js';

/**
 *  @param {object} io
 *  @param {Array}  io.hotspots  the registry array, BY IDENTITY.
 *  @param {object} io.chapters  the injected chapter map.
 */
export function createLabelPolicies({ hotspots, chapters }) {
  let pending = false;

  function applyLabelPolicy(h, pol) {
    /* `chip: 'none'` — THE CHIP PAINTS NOTHING, EVER (2026-08-14, Hannah:
       "there are now two things that show on the orbs upon hover, can you
       please delete the smaller ones, we should only keep the black one
       above").

       The smaller of the two was this chip: a dark pill carrying a gold dot
       and "CONTRIBUTOR · RESEARCHER", revealed on hover by `labelOnHover`.
       It long predates the card's transient tier — it is the label policy this
       function has always applied — but the two only ever showed TOGETHER as
       of 2026-08-14, and the panel says both of the things the pill did.

       DELETED, not hidden: the label and the dot come out of the DOM, so there
       is no invisible text left in the a11y tree and no element left painting
       zero pixels. What stays is everything that was never visible in the
       first place — the button (the tab stop), its `aria-label` (the whole
       accessible name, which never depended on the label being drawn), and the
       hit pad, which IS the target and always was (696e95d). The chip is now
       what a hover zone is: a control with no pixels of its own, answering for
       a thing the scene draws.

       Per-node, through the policy a chapter already owns, so this is an
       OWNED-ONLY removal: Inspire's and Connect's chips declare no policy at
       all, keep their resting pills, and are untouched — verified by their
       label boxes still measuring their full width. */
    // A bare chip draws nothing at rest either, so it is `labelOnHover` in
    // every sense the rest of this file uses the flag for — the collision
    // dodge skips it, and the arrival stagger does not queue it.
    // AT parity (the whole point): the chip may be invisible for most of its
    // life, the ACCESSIBLE NAME never is. A screen reader hears the same
    // "Name · Role" a pointer reveals, at rest and while hot alike. Set for
    // every policied node, hover-only or not, so the name is stated rather
    // than inherited from text whose visibility this file is now changing.
    /* THE POLICY DECIDES; THIS OWNER WRITES (D158/D153, order U04).
       `h` is created by the object literal in addHotspot below, and every
       write to it now happens in this file. `label-policy.js` used to reach in
       and property-write five of its fields, which made the hotspot record a
       thing two modules mutated and nobody owned — the one cross-module
       coupling G1 rule (b) could find in the tree.

       The order below is the order the policy performed these operations in,
       and it is load-bearing: the trace oracle records an ORDERED stream of
       DOM writes, so `classList.add('bare')` before the removes, and the
       `toggle`/`setAttribute` pair after them, is behaviour and not style. */
    const plan = resolveHotspotLabelPolicy(h, pol);
    if (!plan) return;
    if (plan.rename !== null) {
      h.label = plan.rename;
      if (h.labelEl) h.labelEl.textContent = plan.rename;
    }
    if (plan.bare) {
      h.chipBare = true;
      h.btn.classList.add('bare');
      if (h.labelEl) { h.labelEl.remove(); h.labelEl = null; }
      if (h.dotEl) { h.dotEl.remove(); h.dotEl = null; }
    }
    // A REAL BOOLEAN, since DEFECT-01 (2026-08-23). This used to be able to
    // arrive `undefined`, which made the toggle below a flip rather than a
    // statement — see the corrected note at the resolver for the measurement
    // and for why no shipped chip ever took that path.
    h.labelOnHover = plan.labelOnHover;
    h.btn.classList.toggle('label-hover', h.labelOnHover);
    h.btn.setAttribute('aria-label', h.label);
    if (h.labelOnHover) ensureLabelHoverStyles();
  }

  /** Ask each chapter, once, what it wants for its own nodes.
   *
   *  THE FRAME RETRY IS NOW VESTIGIAL, AND IS DELIBERATELY KEPT (C05 slice D,
   *  design.md §6.3). It used to be load-bearing: this function read
   *  `window.journey.chapters`, which journey.js publishes inside activate()
   *  — AFTER registration — so the first calls found nothing and `policyPending`
   *  ran it again from update() until they did. The map is now INJECTED, and
   *  `buildChapters` has returned by the time createUI is called, so the value
   *  is available at registration and the loop below always completes on its
   *  first pass over a given hotspot.
   *
   *  It is retained anyway because removing it is a BEHAVIOUR change, not a
   *  tidy-up: the policy would then apply synchronously inside addHotspot, one
   *  frame earlier than today, which moves the frame at which every policied
   *  chip's `aria-label` first appears. That is an a11y-timing change and it
   *  deserves its own before/after measurement — design.md §6.3's follow-up
   *  owns it, in the same class as the DEF-01 corrective. Until then the retry
   *  holds the timing still. Do not delete it as dead code; it is not dead,
   *  it is load-bearing for the wrong reason and that reason is recorded.
   *
   *  `left` is still real: a chapter absent from the injected map (a partial
   *  boot, or a harness constructing the UI on its own) leaves its hotspots
   *  unresolved and re-arms the pass, exactly as an unpublished global did. */
  function resolveLabelPolicies() {
    let left = false;
    for (const h of hotspots) {
      if (h.policyDone) continue;
      const ch = chapters[h.chapter];
      if (!ch) { left = true; continue; }    // chapter not mounted yet
      h.policyDone = true;
      const vis = ch.visibility;
      if (vis && typeof vis.labelPolicy === 'function') applyLabelPolicy(h, vis.labelPolicy(h.id));
    }
    pending = left;
  }

  return {
    /** One node's registration. A declaration that states the flag outright
     *  is already resolved; one that says nothing asks its chapter, once, on
     *  the next frame. */
    register(h, declared) {
      if (declared !== undefined) applyLabelPolicy(h, { labelOnHover: declared });
      else pending = true;
    },
    /** The frame door. The latch is checked HERE rather than at the call
     *  site, so `update()` composes a call and not a conditional. */
    resolve() {
      if (!pending) return;
      resolveLabelPolicies();
    },
  };
}
