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
//   scroll model      core/scroll.js    virtual, per-chapter allocations
//   progress + routes core/journeyState.js
//   camera path       core/director.js  Spike A orbit + keyed path
//   streaming seams   core/seams.js     T1..T4, hysteresis + dwell
//   optics            core/lens.js      unified grade, full journey (W5)
//   DOM               core/ui.js        nav, copy, cards, hotspot proxies
//   geometry          chapters/*.js

import * as THREE from 'three';
import { createJourneyState } from './core/journeyState.js';
import { createScrollModel } from './core/scroll.js';
import { createDirector } from './core/director.js';
import { createSeams } from './core/seams.js';
import { createLens } from './core/lens.js';
import { createUI } from './core/ui.js';
import { createInspire } from './chapters/inspire.js';
import { createConnect } from './chapters/connect.js';
import { createOwned } from './chapters/owned.js';
import { createFinal } from './chapters/final.js';
import { MEMBERS } from './chapters/final-world.js';
import { CONTENT } from './content/content.js';
import {
  CHAPTERS, CHAPTER_IDS, chapterAt, restProgress, HERO_INTRO_MS,
  DEEP_LINK_DETAIL_DELAY_MS,
} from './constants.js';

const DEG = Math.PI / 180;
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

  const q = new URLSearchParams(location.search);

  /* ================================================================
     State, scroll, camera
     ================================================================ */
  const journey = createJourneyState({
    onNavigate: (r) => handleRoute(r),
    onFlightCancel: () => { /* manual scroll won: nothing else to undo */ },
  });

  // ?steady=1 kills the documentary handheld layer (QA: pose sampling at
  // arbitrary p must be reproducible frame-to-frame).
  const director = createDirector(sceneApi, { steady: q.get('steady') === '1' });
  const lens = createLens(sceneApi);
  lens.update(0);   // the unified grade covers the full journey; amount stays 1

  // [g] — raw (post-bloom hero baseline) vs finished, everywhere. Same key
  // as the approved spike; the raw reference at p=0 IS the hero's own look.
  addEventListener('keydown', (e) => {
    if (e.key === 'g' || e.key === 'G') lens.setEnabled(!lens.enabled);
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
    // adjacent chapters fly the spatial route; non-adjacent jump (a
    // full-journey flight on a Back press reads as a hang)
    const from = CHAPTER_IDS.indexOf(chapterAt(journey.progress).id);
    const to = CHAPTER_IDS.indexOf(r.chapter);
    if (Math.abs(to - from) <= 1) {
      journey.flyToChapter(r.chapter);          // the surface follows the flight
    } else {
      // non-adjacent: jump. A full-journey flight on a Back press reads as a hang.
      journey.jumpToChapter(r.chapter);
      scroll.setProgress(restProgress(r.chapter));
      applyFrame(journey.progress, 0);
    }
  }

  /* ================================================================
     Per-frame
     ================================================================ */
  let lastChapter = null;

  /** Inspire's three exit regions reveal SEQUENTIALLY during the orbit and
   *  then stay visible together at rest (GB-1.3). Driven off the real camera
   *  azimuth, exactly as Spike A reviewed it, so manual poses and QA jumps
   *  arm the same way a scroll does. */
  function driveInspire(p) {
    const cam = sceneApi.camera.position;
    let azDeg = Math.atan2(cam.x, cam.z) / DEG;
    if (azDeg < -90) azDeg += 360;                    // rear-left reads 190..270
    if (!chapters.inspire.armed) { chapters.inspire.setReveal(0, 0, 0, 0); return; }
    // plume cores must never stream along the view ray: damp the +x breeze
    // lean while the camera crosses the +x sector
    const belly = Math.min(smooth01((azDeg - 40) / 30), 1 - smooth01((azDeg - 115) / 30));
    chapters.inspire.setLeanScale && chapters.inspire.setLeanScale(1 - 0.45 * Math.max(0, belly));
    const sm = (a, b) => clamp01((azDeg - a) / (b - a));
    // gill band -> ArtCompute -> Arca Gidan -> 2RP, then a hold through the rest
    let a = sm(36, 72), b = sm(76, 112), c = sm(104, 142), band = sm(20, 46);
    // under the cap the plumes are behind us: retire them into the seam
    const out = 1 - smooth01((p - 0.355) / 0.06);
    chapters.inspire.setReveal(a * out, b * out, c * out, band * out);
  }

  // Final-leg halation focus: the nearest mature ring member IN FRONT of the
  // Final rest camera (director key p=0.925, pos(-14.72,2.73,2.70) ->
  // tgt(-3.06,0.83,-1.94)) — its under-cap glow is the frame's focal
  // highlight ("selected fairy-ring highlights", handoff). Deterministic;
  // ring members are scene-parented and never move.
  const FINAL_FOCUS = (() => {
    const cam = new THREE.Vector3(-14.72, 2.73, 2.70);
    const dir = new THREE.Vector3(-3.06, 0.83, -1.94).sub(cam).normalize();
    let best = null, score = Infinity;
    const v = new THREE.Vector3();
    for (const m of MEMBERS) {
      v.set(m.x - cam.x, 0, m.z - cam.z);
      if (v.x * dir.x + v.z * dir.z <= 0 || m.m < 0.55) continue;  // behind / immature
      const dd = v.length();
      if (dd < score) { score = dd; best = m; }
    }
    return best ? new THREE.Vector3(best.x, best.gy + best.h * 0.82, best.z) : null;
  })();

  function applyFrame(p, dt) {
    const owned = p > 0.0008;
    director.setOwned(owned);
    if (owned) director.apply(p, dt);

    seams.update(p);
    driveInspire(p);

    // Optics (W5): ONE finishing language across the whole journey. The lens
    // owns the per-leg parameter curve; the journey supplies progress and the
    // active chapter's focal source for the halation focus hint (handoff:
    // active Inspire exit, ADOS knot, primary ownership nexus, and on the
    // Final leg the nearest lit ring member — the "selected fairy-ring
    // highlight", since the travelling front has no exposed world position).
    lens.update(p);
    let focus = null;
    if (p < 0.40) { if (chapters.inspire.armed) focus = chapters.inspire.activeWorld(); }
    else if (p < 0.62) { if (chapters.connect.armed) focus = chapters.connect.nodeWorld('ados'); }
    else if (p < 0.87) { if (chapters.owned.armed) focus = chapters.owned.nodeWorld('pod-shared'); }
    else if (chapters.final.armed) {
      // live growth-front position when the pulse is travelling (final.js
      // frontWorld(), declutter round); the static nearest-member hint
      // remains the fallback while the front rests
      focus = (chapters.final.frontWorld && chapters.final.frontWorld()) || FINAL_FOCUS;
    }
    lens.setFocusHint(focus);

    const ch = chapterAt(p);
    // Hero furniture releases as the journey leaves the Mission composition.
    const heroA = 1 - smooth01((p - 0.006) / 0.05);
    for (const f of heroFurniture) f.style.opacity = heroA;

    ui.update(p, ch.id, sceneApi.camera, dt);

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
    seams.update(p);
    chapters.inspire.snap();
    applyFrame(p, 0);
    lastChapter = chapterAt(p).id;
    if (detail) setTimeout(() => openDetail(detail, null), DEEP_LINK_DETAIL_DELAY_MS);
  }

  const qp = q.get('p');
  const qpose = q.get('pose');
  if (qp !== null) {
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
