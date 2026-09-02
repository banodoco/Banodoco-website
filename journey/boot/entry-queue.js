/* ==================================================================== *
 * journey/boot/entry-queue.js — THE QUEUED CHAPTER ENTRY.
 *
 * WHY THIS TINY MODULE EXISTS. `pendingEntry` was main.js's worst-owned
 * binding by a wide margin — SIX write sites spread across the explore
 * CTA, the logo, two hero callout tags, the pre-boot rail's callback,
 * the journey's own onEntry callback, and the activation that drains it.
 * Nothing named the protocol those seven sites were all obeying, so each
 * one restated it, and two of them restated it differently.
 *
 * The protocol, named: a control pressed BEFORE the journey module has
 * booted records ONE chapter to arrive at, and boot drains it exactly
 * once. The browser used to record this intent for us — the tags were
 * plain `#/<chapter>` links, so a click wrote the hash and boot read it
 * back as a deep link. Nothing writes the URL any more (Hannah,
 * 2026-08-11), so the intent is held here and handed to boot() instead.
 * See journey/journey.js's `entry`.
 *
 * THE MACHINE (G3). States: EMPTY <-> QUEUED. `pending` is the binding
 * that encodes it, and it has exactly TWO write sites — `request()` and
 * `take()` — which is the whole reason this is a module and not a `let`.
 * Events: `request(chapter, { fast })`, `take()`, `peek()`,
 * `whenRequested(fn)`.
 *
 * `fast` IS THE REAL DISTINCTION, not a convenience flag. Most controls
 * want the departure to begin immediately: the CTA and the two hero
 * callouts hand a direct navigation to a hero that is still playing its
 * intro, and the intro should start leaving at once. THE LOGO DOES NOT.
 * It travels home — to Mission, where the hero already is — so asking
 * for an accelerated departure would be asking to hurry to where you
 * are standing. That difference used to be invisible: the logo simply
 * omitted the call, one line among six that looked like the others.
 *
 * `whenRequested` is installed by the boot machine when it is built. A
 * control pressed before that — possible, since the controls register
 * first and a WebGL failure means the machine is never built at all —
 * still QUEUES; it just has nobody to tell. That is the pre-existing
 * behaviour, preserved: the old code guarded with `if (requestEarlyEntry)`
 * at two of the four fast sites and not at the other two, which was safe
 * only because those two could not run before the hook existed.
 * ==================================================================== */

export function createEntryQueue() {
  let pending = null;
  let hook = null;

  const api = {
    /** What is queued, without draining it. Boot reads this to decide
     *  whether a load that has just finished should hand off fast, and
     *  whether the departure gets its immediate visual acknowledgement. */
    peek: () => pending,

    /** THE WRITE-IN. One chapter is held; a second press overwrites the
     *  first, which is what the six assignment sites did and what a
     *  visitor who changes their mind mid-intro means. */
    request(chapter, { fast = true } = {}) {
      pending = chapter;
      if (fast && hook) hook();
    },

    /** THE DRAIN, and the only other write. Boot takes the entry once,
     *  at activation, and the queue is empty afterwards — a second
     *  activation must not re-navigate. */
    take() {
      const chapter = pending;
      pending = null;
      return chapter;
    },

    /** The boot machine's accelerated-departure entry point, installed
     *  when that machine is built. */
    whenRequested(fn) { hook = fn; },
  };

  /* THE PREBOOT DOOR. The queue's five callers are all in main.js, and
     main.js does not run until three.js and the organism have arrived —
     1.7s at 1440x900 on this host, 6.7s at 430x932, past 25s on a throttled
     cold load. For that whole window the only navigation the visitor can see
     is index.html's preboot rail shell, and until this landed a press on it
     did nothing at all.
     The shell's own listener (index.html's cold-load entry barrier) cannot
     import this module, so it leaves the chapter on a bare global and this
     line adopts it — the same one-chapter, last-press-wins, drained-once
     protocol as `request`, arriving through the one door instead of a second
     one. Replacing the global with the sink is what closes the seam: a press
     after this constructor runs but before the live rail is built goes
     straight to `request` with nothing buffered in between.
     No `fast: true` here. This runs at main.js's module scope, before the
     boot machine has installed its hook, so an accelerated departure has
     nobody to ask; loadJourney's own `entryQueue.peek()` branch is what turns
     an adopted intent into a fast handoff, and it is already written. */
  const buffered = typeof globalThis.__banodocoEntry === 'string'
    ? globalThis.__banodocoEntry
    : null;
  globalThis.__banodocoEntry = (chapter) => api.request(chapter);
  if (buffered) api.request(buffered, { fast: false });

  return api;
}
