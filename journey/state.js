// Canonical journey state - the ONE source of truth for where the visitor is.
// Adapted from journey/core/journeyState.js (donor). Differences, all forced
// by v6 / D1 / the grey-box scroll model (W3-A):
//
//   * five chapters, no Equip range (ranges live in ../constants.js)
//   * it does NOT create a scroll spacer and does NOT read window.scrollY.
//     The hero page is `overflow:hidden` with no scroll surface, and that must
//     not change. The grey-box drives progress from a VIRTUAL scroll surface
//     (core/scroll.js) which pushes deltas in through setProgress(); the state
//     itself stays a pure smoothing + routing owner.
//   * it no longer smooths the scrubbed path at all. The scroll controller
//     owns the displayed position (smoothing + speed limit, once), because a
//     second first-order lag here had no velocity state and therefore decayed
//     the on-screen rate to zero whenever input paused — see update() below.
//   * routing normalises the retired Equip routes (adr-d6-routes.md) and
//     delegates the decision of HOW to travel to the host (fly vs jump vs
//     stay put), because that is a camera concern, not a state concern.
//
// It owns no DOM, creates no elements, and starts no frame loop.

import {
  CHAPTER_IDS, chapterAt,
} from './route.js';
import { normaliseNode } from './navigation.js';

const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);

export function createJourneyState({ onNavigate = null } = {}) {
  let p = 0;          // displayed progress - what the camera will read
  let rawP = 0;       // instantaneous target
  let suppressRoute = 0;

  /* ---------------- routing ---------------- */
  // NODE ALIASES ARE NOT SPELLED OUT HERE. They are declared once, in
  // structure.js's JOURNEY_SCHEMA.aliases, and applied once, by
  // navigation.js's normaliseNode(). This door used to carry its own copy of
  // two of those rules — `2rp` -> `tworp` and "final has no detail node" —
  // so a rule added to the schema was honoured by the boot deep link and
  // ignored by a hash that arrived later. Delegating keeps the two doors on
  // the same table.
  function parseHash() {
    const h = (location.hash || '').replace(/^#\/?/, '');
    const [rawChapter, rawNode] = h.split('/').filter(Boolean);
    const chapter = rawChapter || null;
    // retired chapter -> normalise, never a dead route
    if (chapter && !CHAPTER_IDS.includes(chapter)) return { chapter: null, node: null, unknown: chapter };
    return { chapter, node: normaliseNode(chapter, rawNode || null), unknown: null };
  }

  /* THE ROUTE IS INBOUND ONLY (2026-08-11, Hannah: "when we go into a new
     section, let's NOT append this hashtag thing to the URL ... and if they do
     have it, let's strip it out. It destroys our journey.").
     writeRoute() is gone. Nothing the visitor does — scrolling, pressing a nav
     tile, opening or closing a card — writes to the URL any more, so there is
     no pushState anywhere and no history entry the ride owns. What survives is
     the READ: a URL that ARRIVES carrying `#/connect` or `#/owned/contributor-3`
     still places the journey there (journey.js's boot chain), and the hash is
     then removed. clearRoute() is the only writer left in the codebase, and it
     only ever DELETES. */

  /** Strip whatever route the URL is carrying. replaceState, never a
   *  navigation: no reload, no new history entry, and the QA flags (?p=,
   *  ?pose=, ?capture=) survive untouched because only the hash is dropped. */
  function clearRoute() {
    if (!location.hash) return;
    suppressRoute++;
    history.replaceState(null, '', location.pathname + location.search);
    // replaceState does not fire hashchange, but a queued one from an earlier
    // user gesture might still land; release on the next task.
    setTimeout(() => { suppressRoute--; }, 0);
  }

  // A hash can still APPEAR after boot — pasted into the address bar, or an
  // in-page link that reaches the browser (none ship today: every nav control
  // preventDefault()s and calls the host). Treat it exactly like an arrival:
  // honour it, then take it back out of the URL.
  window.addEventListener('hashchange', () => {
    if (suppressRoute > 0) return;
    const r = parseHash();
    clearRoute();
    if (r.unknown || !r.chapter) return;
    // A detail route inside the current chapter must not yank the camera; the
    // host decides jump vs stay put for a real chapter change.
    r.sameChapter = chapterAt(p).id === r.chapter;
    if (onNavigate) onNavigate(r);
  });

  /* ---------------- travel ---------------- */
  // There is no flight system any more. It was a PROGRESS tween whose last
  // caller was the footer cue's fly to the end-hold; the footer and its cue
  // were removed by the navigation redux (Hannah, 2026-08-09 — their content
  // lives in journey/rail.js's site-map panel now), and the tween, its
  // cancel listeners and inFlight went with them. Chapter navigation stopped
  // flying in the D16 era: every nav/route change is a direct jump.

  function setProgress(v) { rawP = clamp01(v); }

  /** Place progress with no travel at all (deep links: place, never replay). */
  function snapTo(v) { rawP = clamp01(v); p = rawP; }

  /* SMOOTHING LIVES IN ONE PLACE, AND IT IS NOT HERE.
     This file used to run every scrubbed frame through a first-order lag on
     top of the scroll model's own — and that second filter is exactly what
     made the stop Hannah kept reporting structurally unavoidable. A
     first-order lag holds no velocity state: its output rate is k * (rawP - p),
     so the instant rawP stopped moving the rate on screen decayed as
     e^(-k t) toward zero, every time, before any commit could begin. Three
     separate repairs inside scroll.js could not reach it, because the
     deceleration was happening downstream of all of them.
     The scroll controller (scroll.js) now owns the displayed position: it
     smooths at SMOOTH_K and speed-limits at MAX_SCRUB_RATE once, with the
     rate as persistent state, and hands the finished number here. This file
     generates no motion of its own at all — the flight tween, the last
     motion it kept, retired with the footer cue (see the travel note above). */
  function update() {
    p = rawP;
    return p;
  }

  return {
    update,
    get progress() { return p; },
    get raw() { return rawP; },
    setProgress,
    snapTo,
    parseHash,
    clearRoute,
  };
}
