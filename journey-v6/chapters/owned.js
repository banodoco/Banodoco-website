// journey-v6 — OWNED chapter, PRODUCTION (W4-C).
//
// The grey-box proxy is replaced by the APPROVED Spike B portrait-field
// treatment ("feels really nice" — motion review), ported against the
// journey's REAL camera leg:
//
//   owned-leg.js        samples the director's pure poseAt over the leg —
//                       every placement rule measures the actual polyline
//   owned-substrate.js  volumetric mycelial field (cords with travelling
//                       waves, asynchronous hyphae, authored voids, haze,
//                       soil-underside lid for both crossings)
//   owned-portraits.js  48-node contributor field: spike photo treatment,
//                       ember rims, strand termination, frame-cell
//                       stratification, 3.0-unit camera-path clearance
//
// This file owns the chapter contract the grey-box established (group /
// nodeIds / setArmed / setHot / nodeWorld), the three ownership pods and
// their claim-pulse behaviours (OW-3), and the growth-front exit gesture
// (OW-5). Parented to `scene`, a sibling of groundGroup, per adr-d3: soil
// does not sway, and a swaying substrate would shear the descent.
//
// COLOUR-PIPELINE NOTE for the grade-unification pass: Spike B calibrated
// its additive opacities with NO OutputPass (raw display-space sum). The
// journey renders through the hero composer — UnrealBloom(0.62/0.45/0.1) ->
// TAA -> OutputPass with ACES filmic (exposure 0.95) + sRGB encode — where
// dim linear values come out 2-4x brighter on screen. EXPOSURE_* below are
// the compensation the port applies so the field sits at the approved
// still's darkness UNDER the hero pipeline; they are the numbers the
// unification pass needs to reconcile, recorded in BUDGETS.md (W4-C).
import * as THREE from 'three';
import { buildLeg } from './owned-leg.js';
import { buildSubstrate, makeFadePulseMat } from './owned-substrate.js';
import { buildPortraitField } from './owned-portraits.js';
import * as H from '../lib/helpers.js';

const PAL = {
  gold: 0xd9a441,
  goldBright: 0xf0c877,
  ember: 0xffb36b,
  deepGold: 0x8a6426,
  warmBlack: 0x0a0805,
};

// Display-space (spike) -> linear-under-ACES compensation. Additive line /
// glow layers need the strongest cut; textured portrait planes are closest
// to a straight image and need the least.
const EXPOSURE_LINES = 0.30;
const EXPOSURE_PLANES = 0.42;

export function createOwned(sceneApi, content) {
  const group = new THREE.Group();
  group.name = 'journey-owned';
  group.visible = false;
  sceneApi.scene.add(group);

  /* ---- the real leg, sampled from the director ---- */
  const leg = buildLeg();

  /* ---- substrate + portrait field ---- */
  const substrate = buildSubstrate({ leg, palette: PAL, exposure: EXPOSURE_LINES });
  group.add(substrate.group);

  const contributors = (content && content.contributors) || [];
  const portraits = buildPortraitField({
    leg, contributors, substrate, palette: PAL,
    nodeCount: 48, exposure: EXPOSURE_PLANES,
  });
  group.add(portraits.group);
  // photos are the default read once the look-dev set lands (never blocks
  // boot; a failed load leaves the procedural busts, and anonymous stays one
  // call away — setPortraitMode('anonymous'))
  portraits.photosReady.then((ok) => { if (ok) portraits.setMode('photo'); });

  /* ================================================================
     Ownership pods (OW-3): three mycelial nexuses carrying the locked
     claims. Authored in the REST frame — primary below the top-centre
     copy block's suppression zone, secondaries lower/outer — then
     clearance-pushed off the polyline so no pod swallows a travel frame.
     ================================================================ */
  const rf = leg.restFrame;
  const TANV = Math.tan(0.5 * rf.fov * Math.PI / 180);
  function restPlace(cx, cy, depth) {
    const p = rf.pos.clone()
      .addScaledVector(rf.fwd, depth)
      .addScaledVector(rf.right, cx * TANV * 1.55 * depth)
      .addScaledVector(rf.up, cy * TANV * depth);
    leg.clampUnder(p, 0.8);
    for (let it = 0; it < 4; it++) {
      const cd = leg.camDist(p.x, p.y, p.z);
      if (cd >= 2.6) break;
      const nearest = leg.nearestCamPt(p);
      const away = p.clone().sub(nearest);
      if (away.lengthSq() < 0.001) away.set(0, -1, 0);
      away.normalize();
      if (away.y > 0) away.y *= 0.3;
      p.addScaledVector(away.normalize(), 2.65 - cd);
      leg.clampUnder(p, 0.8);
    }
    return p;
  }
  // Visual hierarchy per the approved still: 100% shared clearly primary
  // (centre of the colony, largest, nearest) but not overwhelming the
  // network; secondaries smaller/lower, legible.
  const POD_SPEC = [
    { id: 'pod-shared', pos: restPlace(0.02, -0.34, 6.2), scale: 0.62, primary: true },
    { id: 'pod-monthly', pos: restPlace(-0.56, -0.56, 5.4), scale: 0.44 },
    { id: 'pod-split', pos: restPlace(0.56, -0.52, 5.8), scale: 0.42 },
  ];
  const glowTex = H.glowSprite(PAL.ember, 64);
  const coreTex = H.softDisc(64);
  const pods = POD_SPEC.map((spec, pi) => {
    const rand = H.rng((9500 + pi * 311) >>> 0);
    // nexus: converging strand bundle — a knot the network thickens into,
    // not a UI badge. One pulse-mat per pod so hover state is per-pod.
    const mat = makeFadePulseMat(spec.primary ? PAL.goldBright : PAL.gold, {
      baseOpacity: (spec.primary ? 0.30 : 0.24) * EXPOSURE_LINES,
      pulseColor: PAL.goldBright, pulseWidth: 0.14, twinkle: 0.30, fogDensity: 0.014,
    });
    const R = spec.scale;
    const res = H.strandLines({
      count: spec.primary ? 30 : 22, seed: 9700 + pi * 77,
      generator: (i, rnd) => {
        const a = rnd() * Math.PI * 2;
        const b = (rnd() - 0.5) * Math.PI * 0.9;
        const rr = R * (2.2 + rnd() * 2.4);
        const start = new THREE.Vector3(
          spec.pos.x + Math.cos(a) * Math.cos(b) * rr,
          spec.pos.y + Math.sin(b) * rr * 0.7,
          spec.pos.z + Math.sin(a) * Math.cos(b) * rr,
        );
        leg.clampUnder(start, 0.25);
        const end = spec.pos.clone().add(new THREE.Vector3(
          (rnd() - 0.5) * R * 0.5, (rnd() - 0.5) * R * 0.4, (rnd() - 0.5) * R * 0.5));
        const pts = [];
        for (let j = 0; j <= 4; j++) {
          const t = j / 4;
          const e = H.easings.smooth(t);
          const p = start.clone().lerp(end, e);
          const hump = Math.sin(Math.PI * t);
          p.x += H.fbm3(i * 1.3, t * 2.8 + pi, 0.6, 2) * 0.5 * hump;
          p.y += H.fbm3(2.2, i * 0.9, t * 2.5 + pi, 2) * 0.4 * hump;
          p.z += H.fbm3(t * 2.6 + pi, 1.1, i * 1.7, 2) * 0.5 * hump;
          leg.clampUnder(p, 0.2);
          pts.push(p);
        }
        return pts;
      },
    });
    const lines = new THREE.LineSegments(res.geometry, mat);
    lines.frustumCulled = false;
    group.add(lines);
    // warm heart of the knot
    const coreMat = new THREE.SpriteMaterial({
      map: coreTex, color: new THREE.Color(spec.primary ? PAL.goldBright : PAL.ember),
      transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false,
    });
    const core = new THREE.Sprite(coreMat);
    core.position.copy(spec.pos);
    core.scale.setScalar(spec.scale * 0.9);
    group.add(core);
    const haloMat = new THREE.SpriteMaterial({
      map: glowTex, color: new THREE.Color(PAL.ember),
      transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: false,
    });
    const halo = new THREE.Sprite(haloMat);
    halo.position.copy(spec.pos);
    halo.scale.setScalar(spec.scale * 3.2);
    group.add(halo);
    return {
      ...spec, mat, coreMat, haloMat, core, halo,
      hot: 0, target: 0, pulseP: rand(),
      baseCore: (spec.primary ? 0.34 : 0.26) * EXPOSURE_LINES,
      baseHalo: (spec.primary ? 0.16 : 0.11) * EXPOSURE_LINES,
    };
  });
  const colonyCentre = leg.spineAt(0.42).addScaledVector(leg.UPN, 0.4);

  /* ================================================================
     Growth front (OW-5): the live rising edge the Final exit follows —
     a fan of climbing strands around the rise corridor, carrying its own
     slow upward waves. The exit pulse fires as the camera commits to the
     rise and the lens follows it out through the soil.
     ================================================================ */
  const exitC = leg.exitPt.clone();
  const frontMat = makeFadePulseMat(PAL.goldBright, {
    baseOpacity: 0.16 * EXPOSURE_LINES, pulseColor: PAL.goldBright,
    pulseWidth: 0.16, twinkle: 0.34, fogDensity: 0.026,
  });
  {
    const res = H.strandLines({
      count: 40, seed: 8811,
      generator: (i, rnd) => {
        // a fan BEYOND the exit crossing, spread across the corridor the
        // camera rises through. It sits far enough out (and fogged enough)
        // to be a faint suggestion from the rest pose — parallel verticals
        // straight down the rest gaze read as "rain" — and resolves into
        // the live growth edge as the rise closes on it.
        const a = (i / 40) * Math.PI * 1.1 + rnd() * 0.1 - 0.55;
        const rr = 2.4 + rnd() * 3.6;
        const x0 = exitC.x - 2.6 - Math.abs(Math.cos(a)) * rr;
        const z0 = exitC.z + Math.sin(a) * rr * 1.2;
        const y0 = -2.6 - rnd() * 1.4;
        if (leg.camDist(x0, (y0 - 0.4) * 0.5, z0) < 3.4) return null;
        const yTop = leg.groundY(x0, z0) - 0.14 - rnd() * 0.3;
        const pts = [];
        for (let j = 0; j <= 4; j++) {
          const t = j / 4;
          const p = new THREE.Vector3(
            x0 + H.fbm3(i * 0.7, t * 2.9, 1.1, 2) * 1.3 * t,
            y0 + (yTop - y0) * t,
            z0 + H.fbm3(1.9, i * 0.9, t * 2.6, 2) * 1.3 * t,
          );
          pts.push(p);
        }
        return pts;
      },
    });
    const lines = new THREE.LineSegments(res.geometry, frontMat);
    lines.frustumCulled = false;
    group.add(lines);
  }
  let frontP = 0;
  let risePulseArmed = true;

  /* ================================================================
     Chapter state + per-frame
     ================================================================ */
  let amount = 0, amountTarget = 0;
  const _w = new THREE.Vector3();

  sceneApi.addAnimator('journey-owned', (t, dt) => {
    const k = Math.min(1, dt * 2.6);
    amount += (amountTarget - amount) * k;
    if (amount < 0.004 && amountTarget === 0) amount = 0;
    group.visible = amount > 0.003;
    if (!group.visible) {
      substrate.setFade(0);
      portraits.setFade(0);
      frontMat.uniforms.uFade.value = 0;
      for (const pd of pods) { pd.mat.uniforms.uFade.value = 0; }
      return;
    }

    substrate.setFade(amount);
    portraits.setFade(amount);
    substrate.update(dt, t);
    portraits.update(dt, t);

    // pods: hover ease + per-pod inward pulse when hot
    for (const pd of pods) {
      pd.hot += (pd.target - pd.hot) * Math.min(1, dt * 6);
      pd.mat.uniforms.uFade.value = amount;
      pd.mat.uniforms.uTime.value = t;
      pd.pulseP += dt * (0.10 + pd.hot * 0.55);
      if (pd.pulseP > 1.3) pd.pulseP = -0.25;
      pd.mat.uniforms.uPulse.value = pd.pulseP;
      pd.mat.uniforms.uPulseOn.value = 0.30 + pd.hot * 0.9;
      pd.coreMat.opacity = amount * pd.baseCore * (1 + 1.4 * pd.hot)
        * (0.9 + 0.1 * Math.sin(t * 0.7 + pd.pos.x));
      pd.haloMat.opacity = amount * pd.baseHalo * (1 + 1.6 * pd.hot);
      const sc = pd.scale * 0.9 * (1 + 0.22 * pd.hot);
      pd.core.scale.setScalar(sc);
      pd.halo.scale.setScalar(pd.scale * 3.2 * (1 + 0.30 * pd.hot));
    }

    // growth front: slow upward travelling wave, uneven, never a loop you
    // can count — plus the OW-5 exit pulse when the rise commits
    frontMat.uniforms.uFade.value = amount;
    frontMat.uniforms.uTime.value = t;
    frontP += dt * (0.075 + 0.05 * (0.5 + 0.5 * H.noise3(t * 0.06, 3.3, 0)));
    if (frontP > 1.35) frontP = -0.2;
    frontMat.uniforms.uPulse.value = frontP;
    frontMat.uniforms.uPulseOn.value = 0.45;

    const p = window.journey ? window.journey.p : 0;
    if (risePulseArmed && p > 0.795) {
      risePulseArmed = false;
      frontP = -0.05;                       // the front fires...
      portraits.wavePulse(exitC, { speed: 5.0, width: 2.4, maxR: 13, amp: 0.75 });
      substrate.surge();                    // ...and the colony answers behind it
    } else if (!risePulseArmed && p < 0.765) {
      risePulseArmed = true;                // re-arm on the way back
    }
  });

  /* ================================================================
     Chapter contract (grey-box interface, kept)
     ================================================================ */
  const routableIds = portraits.nodes.filter(n => n.routable).map(n => n.id);

  return {
    group,
    substrate, portraits, leg,          // QA / debug access
    counts: { substrate: substrate.counts, portraits: portraits.counts },
    // pods first (the claims are the chapter's message), then the full
    // routable contributor set — this fixes the grey-box reachability gap
    // where only 4 of 16 contributors were registered.
    nodeIds: [...POD_SPEC.map(s => s.id), ...routableIds],

    /** T3 streaming seam. */
    setArmed(on) { amountTarget = on ? 1 : 0; },
    get armed() { return amountTarget > 0; },

    setHot(id, on) {
      const pd = pods.find(p => p.id === id);
      if (pd) {
        pd.target = on ? 1 : 0;
        if (on) {
          if (pd.primary) {
            // one broad, slow pulse through the FULL colony
            portraits.wavePulse(colonyCentre, { speed: 3.4, width: 3.2, maxR: 30, amp: 1.0 });
            substrate.surge();
          } else {
            // smaller, localized response
            portraits.wavePulse(pd.pos, { speed: 3.2, width: 2.0, maxR: 6.5, amp: 0.85 });
          }
        }
        return;
      }
      const idx = portraits.indexOf(id);
      if (idx < 0) return;
      if (on) portraits.setHover(idx);
      else if (portraits.hoverIdx === idx) portraits.setHover(-1);
    },

    nodeWorld(id) {
      const pd = pods.find(p => p.id === id);
      if (pd) return _w.copy(pd.pos).clone();
      return portraits.worldOf(id);
    },

    /** 'procedural' | 'photo' | 'anonymous' — anonymous is one call away. */
    setPortraitMode(m) { portraits.setMode(m); },
    get portraitMode() { return portraits.mode; },
    /** OW-4.4: consent-gated rendering (per-node, in code). */
    setConsentEnforced(on) { portraits.setConsentEnforced(on); },
    /** QA: which routable nodes frame at the rest pose. */
    restVisible() { return portraits.restVisible(); },
  };
}
