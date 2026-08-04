// journey-v6 entry point — W3-A GREY-BOX PROTOTYPE.
//
// Boots after the hero's entry choreography (see the bootstrap in index.html)
// and turns the settled hero into the full five-chapter journey: ONE camera,
// ONE organism, ONE continuous reversible path (adr-d3-world-layout.md).
//
// Ownership rule that keeps the hero safe: the director does not touch the
// camera until progress leaves zero. At p = 0 the page IS the hero - same
// pose, same fog, same OrbitControls state, same DOM. The journey nav, copy
// blocks and hotspots are all at opacity 0 there.
//
//   scroll model      scroll.js    virtual, per-chapter allocations
//   progress + routes state.js
//   camera path       director.js  Spike A orbit + keyed path
//   streaming seams   seams.js     T1..T4, hysteresis + dwell
//   optics            lens.js      unified grade, full journey (W5)
//   DOM               ui.js        nav, copy, cards, hotspot proxies
//   geometry          chapters/*.js

import { createJourneyState } from './state.js';
import { createScrollModel } from './scroll.js';
import { createDirector } from './director.js';
import { createSeams } from './seams.js';
import { createLens } from './lens.js';
import { createUI } from './ui.js';
import { createInspire } from './chapters/inspire/index.js';
import { createConnect } from './chapters/connect/index.js';
import { createOwned } from './chapters/owned/index.js';
import { createFinal } from './chapters/final/index.js';
import { CONTENT } from '../content/content.js';
import {
  CHAPTERS, CHAPTER_IDS, chapterAt, restProgress, startOf,
} from './route.js';
import { HERO_INTRO_MS, DEEP_LINK_DETAIL_DELAY_MS } from './constants.js';
import { STEADY, P as P_FLAG, POSE as POSE_FLAG, CAPTURE } from '../flags.js';

const smooth01 = (x) => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

let started = false;

export function boot(opts = {}) {
  if (started) return window.journey;
  started = true;

  const sceneApi = window.sceneApi;
  if (!sceneApi) {
    console.error('[journey-v6] no hero scene handle — journey not started');
    return null;
  }

  /* ================================================================
     State, scroll, camera
     ================================================================ */
  const journey = createJourneyState({
    onNavigate: (r) => handleRoute(r),
    onFlightCancel: () => { /* manual scroll won: nothing else to undo */ },
  });

  // ?steady=1 kills the documentary handheld layer (QA: pose sampling at
  // arbitrary p must be reproducible frame-to-frame). (parsed once, in
  // ../flags.js — THE flag registry)
  const director = createDirector(sceneApi, { steady: STEADY });
  const lens = createLens(sceneApi);
  lens.update(0);   // the unified grade covers the full journey; amount stays 1

  // [g] — raw (post-bloom hero baseline) vs finished, everywhere. Same key
  // as the approved spike; the raw reference at p=0 IS the hero's own look.
  // Guarded like every raw-listener key seam (M5): a modified chord is a
  // browser shortcut (Cmd+G = find next), and a key typed into a text-entry
  // control is content — neither may toggle the grade.
  addEventListener('keydown', (e) => {
    if (e.key !== 'g' && e.key !== 'G') return;
    if (e.metaKey || e.ctrlKey || e.altKey || e.isComposing) return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    lens.setEnabled(!lens.enabled);
  });

  const chapters = {
    inspire: createInspire(sceneApi),
    connect: createConnect(sceneApi),
    owned: createOwned(sceneApi, CONTENT),
    final: createFinal(sceneApi),
  };

  const seams = createSeams({
    camera: sceneApi.camera,
    chapters,
    missionAz: director.heroPose.az,
  });

  let detailNode = null;      // currently open node id, or null

  const scroll = createScrollModel({
    onDelta: (p) => journey.setProgress(p),
    // GB-3.6: an open detail consumes the first scroll intent; travel resumes
    // once the frame is clear.
    onIntent: () => {
      if (!detailNode) return true;
      closeDetail();
      return false;
    },
  });
  scroll.attach();
  scroll.enabled = true;

  /* ================================================================
     DOM
     ================================================================ */
  const ui = createUI({
    onNav: (id) => navigateTo(id),
    onOpen: (nodeId, trigger) => openDetail(nodeId, trigger),
    onClose: () => closeDetail(),
    isDetailOpen: () => !!detailNode,
  });

  // hotspot proxies, one per named node (GB-4.1)
  const NODE_CHAPTER = {};
  function registerHotspots(chapterId, ids, mod) {
    for (const id of ids) {
      NODE_CHAPTER[id] = chapterId;
      const label = (CONTENT.nodes[id] && CONTENT.nodes[id].label)
        || (CONTENT.contributors.find(c => c.id === id) || {}).role
        || id;
      const h = ui.addHotspot({
        id, chapter: chapterId, label,
        world: () => mod.nodeWorld(id),
      });
      h.onHot = (on) => mod.setHot && mod.setHot(id, on);
    }
  }
  // registration order = narrative reveal order (ArtCompute -> Arca -> 2RP,
  // per Plate II) — it drives both the tab order and the W3-B label stagger
  registerHotspots('inspire', ['artcompute', 'arca', 'tworp'], {
    nodeWorld: (id) => chapters.inspire.nodeWorld(id),
    setHot: (id, on) => {
      const order = { artcompute: 0, arca: 1, tworp: 2 };
      chapters.inspire.setActive(on ? order[id] : -1);
    },
  });
  registerHotspots('connect', chapters.connect.nodeIds, chapters.connect);
  registerHotspots('owned', chapters.owned.nodeIds, chapters.owned);

  // The hero's own furniture: the world-tracked callouts and the hero scrim /
  // spill are Mission-pose compositions, so they release as the journey leaves
  // the hero and come back on the way in. Untouched at p = 0.
  const heroFurniture = ['.callouts', '.scrim', '.spill'].map(s => document.querySelector(s)).filter(Boolean);

  // Explore CTA hands off into the journey (GB-1.1): one restrained flow
  // toward the cap, then the orbit. No reset, no reload.
  const cta = document.querySelector('.ui .cta');
  if (cta) cta.addEventListener('click', (e) => { e.preventDefault(); navigateTo('inspire'); });

  /* ================================================================
     Routes (adr-d6-routes.md)
     ================================================================ */
  function normaliseNode(chapterId, nodeId) {
    if (!nodeId) return null;
    if (nodeId === '2rp') nodeId = 'tworp';
    if (nodeId === 'community') nodeId = 'discord';  // D16 ground restage: legacy deep links land

    const m = /^person-(\d+)$/.exec(nodeId);        // ADR spells the field person-N
    if (m) nodeId = `contributor-${m[1]}`;
    if (chapterId === 'final') return null;         // the epilogue has no detail state
    return nodeId;
  }

  function navigateTo(chapterId) {
    closeDetail({ silent: true });
    journey.writeRoute(chapterId, null, { push: true });   // the visitor chose to travel
    directJumpTo(chapterId);
  }

  /* Nav = a DIRECT jump (ride-through #2, Hannah): clicking a chapter must not
     run the camera through every section in between. Journey state snaps to
     the destination immediately (seams, copy, route, scroll surface all land
     there this tick — so a cancelling scroll hands control back exactly where
     the state is, satisfying GB-3.5 trivially), while the CAMERA takes a short
     straight blend from where it was to the destination pose, with a slight
     lift arc so the straight line doesn't shave through geometry. */
  let camBlend = null;
  function directJumpTo(chapterId) {
    const targetP = restProgress(chapterId);
    if (Math.abs(targetP - journey.progress) < 1e-4) return;
    const cam = sceneApi.camera, ctl = sceneApi.controls;
    const pos0 = cam.position.clone(), tgt0 = ctl.target.clone(), fov0 = cam.fov;
    placeAt(targetP);                           // the deep-link settle: place, arm, never replay
    camBlend = {
      t: 0,
      dur: 0.85 + 0.35 * Math.min(pos0.distanceTo(cam.position) / 20, 1),
      pos0, tgt0, fov0,
      lift: Math.min(2.2, 0.10 * pos0.distanceTo(cam.position)),
    };
  }

  // True only when THIS session pushed the history entry for the open detail.
  // A deep-link landing already sits on #/chapter/node with nothing of ours
  // behind it, so closing must not history.back() - that would walk off the
  // page entirely.
  let detailPushed = false;

  function openDetail(nodeId, trigger) {
    nodeId = normaliseNode(NODE_CHAPTER[nodeId] || chapterAt(journey.progress).id, nodeId);
    if (!nodeId) return;
    const ch = NODE_CHAPTER[nodeId] || chapterAt(journey.progress).id;
    if (!ui.openCard(nodeId, trigger)) return;
    // one Back should not walk a chain of drawers: retargeting an already-open
    // detail replaces, only the first open pushes
    const target = `#/${ch}/${nodeId}`;
    const willPush = !detailNode && location.hash !== target;
    journey.writeRoute(ch, nodeId, { push: willPush });
    if (willPush) detailPushed = true;
    detailNode = nodeId;
  }

  function closeDetail({ silent = false } = {}) {
    if (!detailNode) return;
    const ch = NODE_CHAPTER[detailNode] || chapterAt(journey.progress).id;
    const onOwnEntry = detailPushed && location.hash === `#/${ch}/${detailNode}`;
    detailNode = null;
    detailPushed = false;
    ui.closeCard();
    if (silent) return;
    if (onOwnEntry) history.back();                   // consume the entry the open pushed
    else journey.writeRoute(ch, null);
  }

  function handleRoute(r) {
    const node = normaliseNode(r.chapter, r.node);
    if (node) {
      if (node !== detailNode) { detailNode = node; ui.openCard(node, null); }
    } else if (detailNode) {
      detailNode = null;
      ui.closeCard();                                  // Back closes the detail first
    }
    detailPushed = false;   // arriving via the hash: the entry is not ours
    if (r.sameChapter) return;
    // Every route-driven chapter change is a DIRECT jump (D16 restage found
    // the legacy adjacent-chapter flight left the camera stuck with runaway y
    // on Back-to-Mission; direct jumps are also what Hannah asked nav to be).
    // The flight system's ONE remaining caller is the footer cue's fly to the
    // end-hold (ui-footer.js) — chapter travel never flies.
    directJumpTo(r.chapter);
  }

  /* ================================================================
     Per-frame
     ================================================================ */
  let lastChapter = null;

  // Error isolation for the spine's own subsystem calls (M5). The organism's
  // frame loop already isolates whole animators, but everything below runs
  // INSIDE the one 'journey' animator — an exception in a single chapter's
  // drive() would otherwise disable scroll, nav and copy along with it.
  // guarded() latches per name: first throw logs the error once and disables
  // that subsystem; every later call is skipped; the rest of the frame runs.
  const deadSystems = new Set();
  function guarded(name, fn) {
    if (deadSystems.has(name)) return;
    try { fn(); }
    catch (err) {
      deadSystems.add(name);
      console.error(`[journey] '${name}' threw and was disabled — the ride continues without it:`, err);
    }
  }

  function applyFrame(p, dt) {
    const owned = p > 0.0008;
    director.setOwned(owned);
    if (owned) guarded('director', () => director.apply(p, dt));

    guarded('seams', () => seams.update(p));
    // Chapter-owned choreography (M4): any chapter exposing drive(p) runs it
    // here, after the seams have armed/retired it. Inspire's reveal drive
    // lives in chapters/inspire/index.js now — the spine knows no chapter's
    // internals. Each chapter is guarded individually: one broken chapter is
    // dropped, the others keep driving.
    for (const id in chapters) {
      const mod = chapters[id];
      if (mod.drive) guarded(`chapter:${id}.drive`, () => mod.drive(p));
    }

    // Optics (W5): ONE finishing language across the whole journey. The lens
    // owns the per-leg parameter curve; the journey supplies progress and the
    // active chapter's focal source for the halation focus hint (handoff:
    // active Inspire exit, ADOS knot, primary ownership nexus, and on the
    // Final leg the nearest lit ring member — the "selected fairy-ring
    // highlight", since the travelling front has no exposed world position).
    guarded('lens', () => {
      lens.update(p);
      let focus = null;
      // Focal-source handoff points: shortly (+0.02) after each chapter's range
      // begins, route-derived (M4; shipped values 0.40 / 0.62 / 0.87).
      if (p < startOf('connect') + 0.02) { if (chapters.inspire.armed) focus = chapters.inspire.activeWorld(); }
      else if (p < startOf('owned') + 0.02) { if (chapters.connect.armed) focus = chapters.connect.nodeWorld('ados'); }
      else if (p < startOf('final') + 0.02) { if (chapters.owned.armed) focus = chapters.owned.nodeWorld('pod-shared'); }
      else if (chapters.final.armed) {
        // the Final chapter owns its focal anatomy (M4): the travelling
        // growth front while it runs, else its own rest-member hint
        focus = chapters.final.focusWorld();
      }
      lens.setFocusHint(focus);
    });

    const ch = chapterAt(p);
    // Hero furniture releases as the journey leaves the Mission composition.
    const heroA = 1 - smooth01((p - 0.006) / 0.05);
    // Swarm census finding (2026-08-03): opacity-0 elements are still
    // hit-testable — a cursor parked over the faded 01-INSPIRE callout kept
    // driving sceneApi.setHighlight('spores') via the hero page's own hover
    // bindings, flaring the old curtain up to ~2x with a breathing pulse at
    // exactly the moment it should cede. Faded furniture must leave the hit
    // tree, not just the eye.
    for (const f of heroFurniture) {
      f.style.opacity = heroA;
      f.style.pointerEvents = heroA < 0.05 ? 'none' : '';
    }

    guarded('ui', () => ui.update(p, ch.id, sceneApi.camera, dt));

    // Scrubbing must not fill the back stack (adr-d6 write policy)
    if (ch.id !== lastChapter) {
      lastChapter = ch.id;
      if (!detailNode) journey.writeRoute(ch.id, null);
    }
  }

  sceneApi.addAnimator('journey', (t, dt) => {
    scroll.update(dt);
    if (!journey.inFlight) journey.setProgress(scroll.progress);
    else scroll.setProgress(journey.raw);            // keep the surface under the flight
    const p = journey.update(dt);
    applyFrame(p, dt);
    // direct-jump camera blend: state is already AT the destination; the
    // camera glides straight from where it was onto the destination pose the
    // director just computed. Any manual input drops the blend instantly.
    if (camBlend) {
      if (scroll.sinceInput < 50) { camBlend = null; }
      else {
        camBlend.t += dt;
        const f = Math.min(camBlend.t / camBlend.dur, 1);
        const e = f * f * f * (f * (f * 6 - 15) + 10);   // smootherstep, C2 ends
        const cam = sceneApi.camera, ctl = sceneApi.controls;
        // The blend composes onto the DESTINATION pose read live from the
        // camera — valid only if something wrote that pose this frame. While
        // the director owns the camera (p past the hero band) its apply()
        // above did; at p = 0 the hero restore is a ONE-SHOT inside
        // setOwned(false), so on every later blend frame the camera still
        // holds the blend's own previous output — lerping toward it fed the
        // blend back into itself and parked the camera near the jump's
        // start pose plus the lift arc (the M4-found stuck camera:
        // end-hold -> Mission froze at ~(-15.9, 16.3, 2.6) fov 44).
        // Re-assert the completed restore first, so the blend lands ON it
        // and can never outlive or overwrite it. Composition order is
        // preserved: destination writer first, blend on top, blend ends.
        if (!director.owned) director.applyHeroPose();
        cam.position.lerpVectors(camBlend.pos0, cam.position, e);
        cam.position.y += Math.sin(Math.PI * f) * camBlend.lift;
        ctl.target.lerpVectors(camBlend.tgt0, ctl.target, e);
        const fv = camBlend.fov0 * (1 - e) + cam.fov * e;
        if (fv !== cam.fov) { cam.fov = fv; cam.updateProjectionMatrix(); }
        if (f >= 1) camBlend = null;
      }
    }
  });

  /* ================================================================
     Deep links (place, never replay) + QA affordances
     ================================================================ */
  const route = journey.parseHash();
  if (route.unknown) history.replaceState(null, '', '#/mission');

  function placeAt(p, { detail = null } = {}) {
    journey.snapTo(p);
    scroll.setProgress(p);
    // force every seam up to and including the target to arm before anything
    // opens, then place the camera in the same tick so a hidden-tab capture
    // (which only runs frames in bursts) sees the finished frame
    applyFrame(p, 0);
    guarded('seams', () => seams.update(p));
    // any chapter with a snap() gets its eased states jumped to their
    // targets (deep links / hidden-tab capture; today only Inspire has one)
    for (const id in chapters) {
      if (chapters[id].snap) guarded(`chapter:${id}.snap`, () => chapters[id].snap());
    }
    applyFrame(p, 0);
    lastChapter = chapterAt(p).id;
    if (detail) setTimeout(() => openDetail(detail, null), DEEP_LINK_DETAIL_DELAY_MS);
  }

  const qp = P_FLAG;
  const qpose = POSE_FLAG;
  const qcapture = CAPTURE;
  if (qcapture !== null) {
    // ?capture=<p> (M5): pixel-stable stills for capture.py. The page
    // bootstrap already froze the organism's clock at the t = 0 phase and
    // skipped the intro; here the journey places itself at exactly p (a
    // chapter id is accepted and means that chapter's rest, so capture
    // tooling can keep speaking pose names). Everything runs the dt = 0
    // deep-link path, so eased states snap and then hold.
    placeAt(CHAPTER_IDS.includes(qcapture)
      ? restProgress(qcapture)
      : clamp01(parseFloat(qcapture) || 0));
  } else if (qp !== null) {
    placeAt(clamp01(parseFloat(qp) || 0));
  } else if (qpose && CHAPTER_IDS.includes(qpose)) {
    placeAt(restProgress(qpose));
    journey.writeRoute(qpose, null);
  } else if (route.chapter) {
    placeAt(restProgress(route.chapter), { detail: normaliseNode(route.chapter, route.node) });
  } else {
    // cold load, or a legacy/unknown route normalised to #/mission: p = 0, the
    // director never takes the camera, and one applyFrame settles the DOM
    // state deterministically instead of leaving it to CSS defaults
    history.replaceState(null, '', '#/mission');
    placeAt(0);
  }

  /* ================================================================
     Public handle
     ================================================================ */
  const state = {
    version: 'w3-a-greybox',
    journey, scroll, director, lens, chapters, seams, ui,
    hero: sceneApi,
    heroIntroSkipped: !!opts.heroIntroSkipped,
    heroIntroMs: HERO_INTRO_MS,
    get p() { return journey.progress; },
    get chapter() { return chapterAt(journey.progress).id; },
    get detail() { return detailNode; },
    /** QA: jump progress with no travel and no replay. */
    scrollTo(p) { placeAt(clamp01(p)); return journey.progress; },
    /** QA: fly the spatial route, as a nav click does. */
    flyTo(id) { navigateTo(id); },
    /** QA: a chapter's build-time counts (segments, points, bodies, draws
     *  per body), or null. The budget A/Bs read this rather than counting
     *  scene children by hand. */
    counts(id) { const c = chapters[id]; return (c && c.counts) || null; },
    /** QA: one-line audit of everything a sample point should assert. */
    debugState() {
      const p = journey.progress;
      const c = sceneApi.camera;
      const active = document.querySelector('.j-navlink.active');
      const copy = [];
      for (const b of document.querySelectorAll('.j-block')) {
        if (parseFloat(b.style.opacity || 0) > 0.02) copy.push(b.dataset.chapter);
      }
      const heroCopy = parseFloat((document.querySelector('.ui .hero') || {}).style?.opacity ?? '1');
      if (heroCopy > 0.02) copy.unshift('mission');
      return {
        p: +p.toFixed(4),
        chapter: chapterAt(p).id,
        hash: location.hash,
        pose: [+c.position.x.toFixed(3), +c.position.y.toFixed(3), +c.position.z.toFixed(3)],
        fov: +c.fov.toFixed(2),
        fog: [+sceneApi.scene.fog.near.toFixed(2), +sceneApi.scene.fog.far.toFixed(2)],
        copy,
        nav: active ? active.dataset.chapter : null,
        detail: detailNode,
        armed: Object.keys(chapters).filter(k => chapters[k].armed),
        lens: {
          on: lens.enabled, amount: +lens.amount.toFixed(3),
          ...Object.fromEntries(Object.entries(lens.look)
            .map(([k, v]) => [k, typeof v === 'number' ? +v.toFixed(3) : v])),
        },
        hotspots: ui.hotspots.filter(h => h.btn.classList.contains('vis')).map(h => h.id),
        radius: +Math.hypot(c.position.x, c.position.z).toFixed(3),
      };
    },
  };
  window.journey = state;

  console.info(
    '[journey-v6] grey-box ready — %d chapters, p %s, scroll %dpx, route %s',
    CHAPTERS.length, journey.progress.toFixed(3), Math.round(scroll.total), location.hash || '(none)',
  );

  return state;
}
