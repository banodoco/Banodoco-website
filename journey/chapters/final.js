// journey-v6 — FINAL epilogue, PRODUCTION STAGE (W4-D).
//
// The grey-box proxy is replaced by the composed cutaway the re-keyed
// pullback resolves onto: an irregular fairy ring THAT INCLUDES THE HERO
// ORGANISM as one mature member (Hannah's direction — "the current mushroom
// is part of the scene"), a terrain cutaway with the living colony exposed
// in section, a broad broken spore sky, and a forest-mist horizon.
//
// Modules:
//   final-world.js    shared ring/cut geometry + the reveal/pulse shaders
//   final-ring.js     the fruiting bodies + primordia   (2 draws + 1)
//   final-terrain.js  cutaway, colony, front, connectors (7 draws + sprites)
//   final-sky.js      GPU spore cloud + horizon          (2 draws + sprites)
//
// Choreography owned here:
//   - uPull: camera-x -> reveal driver. The "undarken": bodies kindle in a
//     single-direction sequence around the arc as the camera pulls back, and
//     RE-DARKEN in reverse on a reverse scroll — pure in the pose.
//   - the growth-front pulse: a slow travelling wave along the underground
//     front; fruiting bodies brighten in step as it passes (FN-2.2), on a
//     randomized cycle so no loop is perceptible.
//   - primordia dwell: settled time at the rest, time-compressed emergence.
//   - CTA pulse (FN-3.1): trigger('ctaPulse'|'ringPulse') — one wave from
//     the hero around part of the ring, lighting the connectors that tie
//     surface bodies to the colony. Registered against any future closing
//     CTA via [data-final-cta] delegation (the footer lands in task 11).
//
// Fog: the director owns the ramp (Fog near 7->15, far 20->62 across the
// leg). These materials copy scene.fog every frame and fade to black — authored
// WITHIN the ramp, never fighting it.
//
// Parented to `scene` (adr-d3): the field does not sway.

import * as THREE from 'three';
import { makeUniforms, pullOf, makeRng, TAU, RING_C, HERO_AZ } from './final-world.js';
import { createFinalRing } from './final-ring.js';
import { createFinalTerrain } from './final-terrain.js';
import { createFinalSky } from './final-sky.js';

export function createFinal(sceneApi) {
  const group = new THREE.Group();
  group.visible = false;
  sceneApi.scene.add(group);

  const uniforms = makeUniforms();
  const ring = createFinalRing(sceneApi, uniforms);
  const terrain = createFinalTerrain(sceneApi, uniforms);
  const sky = createFinalSky(sceneApi, uniforms);
  group.add(ring.group, terrain.group, sky.group);

  /* ---- growth-front cycle: randomized duration + rest, one direction ---- */
  const cycleRand = makeRng(9182);
  const front = { phase: -0.1, running: true, dur: 13 + cycleRand() * 5, wait: 0, on: 0 };

  /* ---- CTA wave: one-shot, hero -> part of the ring ---- */
  const cta = { t: -1 };            // -1 idle; 0..1 running
  const CTA_TRAVEL = 0.52;          // how far around the arc the wave runs
  const CTA_SECS = 2.6;
  function fireCta() { if (cta.t < 0 || cta.t > 0.3) cta.t = 0; }

  // Delegated registration for the closing CTA the product-systems pass
  // adds (task 11). Harmless while absent; live the moment it exists.
  const CTA_SEL = '[data-final-cta], .j-final-cta';
  const onOver = (e) => {
    if (amount > 0.5 && e.target.closest && e.target.closest(CTA_SEL)) fireCta();
  };
  document.addEventListener('pointerover', onOver);
  document.addEventListener('focusin', onOver);

  /* ---- primordia dwell: settled time at the Final rest ---- */
  let dwell = 0;
  let lastPull = 0;

  let amount = 0, amountTarget = 0;

  /* ---- hero ground-network re-parameterisation (declutter round) ----
     Hannah, twice: "messy lines that go all over the place, ESPECIALLY
     ALONG THE FOREST FLOOR." The worst offender was the HERO's own §8
     ground network — web, mycelium threads, root arteries, hub stars —
     which lies at y≈0 across the entire Final floor and reads as a
     countable-stroke carpet from the pullback camera. The hero itself is
     untouchable, so this is handled scene-state-wise at the Final leg
     (the Connect-chapter precedent): materials are collected once, dimmed
     per class as the pullback proceeds, and restored EXACTLY on retire.
     The soft moss glow POOLS keep most of their light (they ARE the
     ground-glow language this revision moves the floor to); the stroke
     carriers fall to a whisper. The scene-level ambient mote cloud (the
     fake-DOF bokeh balloons in the near field) dims out entirely and is
     retired below 12% — Connect's raster lesson. */
  const heroDim = [];
  let heroDimReady = false, heroDimActive = false;
  function addDim(o, keep) {
    const m = o.material;
    const u = m && m.uniforms && m.uniforms.uOpacity;
    if (u) heroDim.push({ o, u, base: u.value, keep, vis: o.visible });
    else if (m && typeof m.opacity === 'number')
      heroDim.push({ o, m, base: m.opacity, keep, vis: o.visible });
  }
  function collectHeroGround() {
    if (heroDimReady) return;
    heroDimReady = true;
    const gg = sceneApi.groups && sceneApi.groups.ground;
    if (gg) {
      // same predicate + order the hero itself uses (§ intro sequencing):
      // [web, myc, mossPts, pools, roots, ribbon, beads]
      const withWin = gg.children.filter(o => o.material &&
        ((o.material.uniforms && o.material.uniforms.uWin) ||
         (o.material.userData && o.material.userData.uWin)));
      const KEEP = [0.10, 0.10, 0.28, 0.55, 0.12, 0.15, 0.25];
      withWin.forEach((o, i) => addDim(o, KEEP[i] ?? 0.20));
    }
    // ambient mote/bokeh cloud: a direct scene child, never the shed
    for (const o of sceneApi.scene.children) {
      if (o.isPoints && o !== sceneApi.groups.spores) addDim(o, 0.0);
    }
  }
  function applyHeroDim(reach) {
    heroDimActive = reach > 0.001;
    for (const d of heroDim) {
      const f = 1 - reach * (1 - d.keep);
      if (d.u) d.u.value = d.base * f;
      else d.m.opacity = d.base * f;
      d.o.visible = d.vis && (d.o.isPoints ? f > 0.12 : true);
    }
  }
  function restoreHeroDim() {
    for (const d of heroDim) {
      if (d.u) d.u.value = d.base;
      else d.m.opacity = d.base;
      d.o.visible = d.vis;
    }
    heroDimActive = false;
  }

  sceneApi.addAnimator('journey-final', (t, dt) => {
    amount += (amountTarget - amount) * Math.min(1, dt * 2.2);
    if (amount < 0.004 && amountTarget === 0) amount = 0;
    group.visible = amount > 0.003;
    if (!group.visible) {
      lastPull = pullOf(sceneApi.camera.position.x);
      if (heroDimActive) restoreHeroDim();   // byte-exact hand-back
      return;
    }

    // shared uniforms
    const pull = pullOf(sceneApi.camera.position.x);
    // hero floor-network dim rides amount x pull — eases in with the
    // pullback, reverses with it, restores exactly on retire
    collectHeroGround();
    const reachT = Math.max(0, Math.min(1, (pull - 0.25) / 0.45));
    applyHeroDim(amount * reachT * reachT * (3 - 2 * reachT));
    uniforms.uAmount.value = amount;
    uniforms.uPull.value = pull;
    uniforms.uTime.value = t;
    if (sceneApi.scene.fog) {
      uniforms.uFogNear.value = sceneApi.scene.fog.near;
      uniforms.uFogFar.value = sceneApi.scene.fog.far;
    }

    // growth-front pulse: travels the whole arc, then rests a random while.
    // Held off until the reveal is underway — the first bodies kindle from
    // the pull itself, and the pulse then reads as the colony breathing.
    if (pull > 0.35) {
      if (front.running) {
        front.phase += dt / front.dur;
        if (front.phase >= 1.1) {
          front.running = false;
          front.phase = -0.1;
          front.wait = 3 + cycleRand() * 4;
        }
      } else {
        front.wait -= dt;
        if (front.wait <= 0) { front.running = true; front.dur = 13 + cycleRand() * 5; }
      }
    }
    const edge = Math.max(0, Math.min(1,
      Math.min(front.phase + 0.1, 1.1 - front.phase) / 0.14));
    const wantOn = front.running && pull > 0.35 ? edge * edge * (3 - 2 * edge) : 0;
    front.on += (wantOn - front.on) * Math.min(1, dt * 4);
    uniforms.uFront.value = front.phase;
    uniforms.uFrontOn.value = front.on * 0.85;

    // CTA wave
    if (cta.t >= 0) {
      cta.t += dt / CTA_SECS;
      if (cta.t >= 1) cta.t = -1;
    }
    if (cta.t >= 0) {
      const env = Math.sin(Math.min(cta.t, 1) * Math.PI);
      uniforms.uCta.value = cta.t * CTA_TRAVEL;
      uniforms.uCtaOn.value = env;
    } else {
      uniforms.uCtaOn.value = 0;
      uniforms.uCta.value = -1;
    }

    // primordia dwell: only while settled near the rest (pull high, camera
    // quiet); reverse scroll drains it slowly so re-entry re-earns the buds
    const settled = pull > 0.88 && Math.abs(pull - lastPull) < dt * 0.25;
    dwell = settled ? dwell + dt : Math.max(0, dwell - dt * 0.5);
    lastPull = pull;
    ring.setDwell(dwell);

    // sprite layers (outside the shared shader uniforms)
    terrain.setAmount(amount);
    sky.update(t, amount);
  });

  /* ---- growth-front world position (lens halation focus hint) ----
     The travelling pulse finally has an exposed position (BUDGETS W5
     polish item 3): the same pure arc formula final-terrain builds the
     front from, sampled at the live phase. Null while the pulse rests or
     runs off-arc — the journey falls back to its static member hint. */
  const _front = new THREE.Vector3();
  function frontWorld() {
    if (!front.running || front.on < 0.08) return null;
    const ph = Math.max(0, Math.min(1, front.phase));
    const az = ph * TAU + HERO_AZ;
    const r = 6.4 + 1.1 * Math.sin(ph * TAU * 2.3 + 1.0);
    return _front.set(
      RING_C.x + Math.cos(az) * r, -0.5, RING_C.z + Math.sin(az) * r);
  }

  return {
    group,
    nodeIds: [],   // the epilogue has no detail state by design (adr-d6)
    /** T4 streaming seam. */
    setArmed(on) { amountTarget = on ? 1 : 0; },
    get armed() { return amountTarget > 0; },
    setHot() {},
    nodeWorld() { return null; },
    /** Live growth-front position for the halation focus hint (or null). */
    frontWorld,
    /** FN-3.1 — closing-CTA hook. Donor trigger names preserved. */
    trigger(name) { if (name === 'ctaPulse' || name === 'ringPulse') fireCta(); },
    /** QA introspection */
    counts: { ...ring.counts, ...terrain.counts, ...sky.counts },
  };
}
