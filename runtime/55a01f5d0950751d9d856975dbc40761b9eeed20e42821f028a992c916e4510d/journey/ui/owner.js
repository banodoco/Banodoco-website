/* ==================================================================== *
 * journey/ui/owner.js — the named registration funnel.
 *
 * WHAT THIS IS FOR, TODAY
 * -----------------------
 * One place through which this tree's listeners, timers and animation-frame
 * requests are attached, under a NAME. That is the whole job now, and it is
 * a real one: because every registration in `journey/ui.js`, `journey/rail.js`,
 * `journey/dial.js` and the `journey/ui/*` tier modules goes through
 * `listen()`, the raw `addEventListener` sites in this subtree are countable,
 * and `tools/test-render-baseline.mjs`'s registration manifest counts them —
 * "journey/ui/owner.js x1" is this file's single site. That census is what
 * found `journey/ui/sheet-gesture.js`'s four unfunnelled pointer listeners.
 *
 * `listen(x, t, f, o)` is `x.addEventListener(t, f, o)`. `timer(fn, ms)`
 * returns the raw `setTimeout` id, and `raf(fn)` the raw
 * `requestAnimationFrame` id, because `journey/ui.js` stores timer ids in
 * eight places and truthiness-tests the stored id in several of them.
 *
 * WHAT WAS REMOVED, AND WHY IT IS NOT COMING BACK QUIETLY
 * ------------------------------------------------------
 * This module used to record a matching cleanup for every registration and
 * drain them LIFO from `dispose()`, and it carried `child()`'s cascade,
 * `alive()`'s post-disposal guard, a generation counter and a `pending`
 * census. NOTHING IN PRODUCTION EVER CALLED `dispose()`. This is a load-once
 * page; the visitor's teardown is the tab closing. The machinery and the
 * ~4k lines of instrument that guarded it were removed together — the full
 * account, including which assertions died with it, is in
 * docs/code-health/DISPOSAL-REMOVED.md.
 *
 * `own()` AND `dispose()` SURVIVE FOR EXACTLY ONE CALLER.
 * `journey/chapters/connect/index.js` was under a live order when the
 * removal ran and was off limits to it, so Connect still carries a disposer:
 * two `own()` registrations (its scene root, its animator park) drained by
 * one `dispose()`. Nothing calls that either. THESE TWO METHODS ARE RESIDUE,
 * not an interface — do not attach new work to them. When Connect's disposer
 * goes, they go with it, and `journey/journey-owner.js` goes with them.
 *
 * `listen()`, `timer()` and `raf()` DO NOT REGISTER CLEANUPS. A caller that
 * expects `dispose()` to take a listener back off is wrong today; it did
 * before the removal and it does not now.
 *
 * ON THE MODULE PATH. XR-RUNTIME-DESIGN `lifecycle.md` §2 calls this file
 * `journey/lifecycle/owner.js`. That directory does not exist and, under
 * coordinator decision D109, is not going to.
 * ==================================================================== */

export function createOwner(name) {
  /* RESIDUE — see the header. Only journey/chapters/connect/index.js uses
     these two, and only through `own()`; no registration made by `listen`,
     `timer` or `raf` lands here. */
  const cleanups = [];
  let disposed = false;

  const self = {
    get name() { return name; },

    /** RESIDUE. Register `fn` to run at `dispose()`. */
    own(fn) { if (disposed) fn(); else cleanups.push(fn); },

    /** RESIDUE. Idempotent, drained LIFO, one `try` per cleanup so a throw
     *  in one does not strand the rest. */
    dispose() {
      if (disposed) return;
      disposed = true;
      for (let i = cleanups.length - 1; i >= 0; i--) {
        try { cleanups[i](); }
        catch (err) {
          console.error(`[lifecycle] '${name}' cleanup threw; disposal continues:`, err);
        }
      }
      cleanups.length = 0;
    },

    /** addEventListener, under this owner's name. */
    listen(target, type, fn, opts) { target.addEventListener(type, fn, opts); },

    /** RETURNS THE RAW setTimeout ID, exactly as setTimeout does. */
    timer(fn, ms) { return setTimeout(fn, ms); },

    /** One id per call, returned raw, same reasoning as `timer`. */
    raf(fn) { return requestAnimationFrame(fn); },

    /** A sub-owner with a composed name. Naming only — there is no cascade,
     *  because there is nothing to cascade. */
    child(childName) { return createOwner(`${name}/${childName}`); },
  };

  return self;
}
