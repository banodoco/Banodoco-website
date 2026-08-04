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
import { makeUniforms, pullOf, makeRng, TAU, RING_C, HERO_AZ, MEMBERS } from './world.js';
import { createFinalRing } from './ring.js';
import { createFinalTerrain } from './terrain.js';
import { createFinalSky } from './sky.js';
import { CAMERA } from './camera.js';

export function createFinal(sceneApi) {
  const group = new THREE.Group();
  group.visible = false;
  group.userData.jFinal = true;   // QA handle: budget A/Bs isolate this leg
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
  let wasVisible = false;

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

  /* ---- rise mask (M5 ignition audit, D16) ----
     The T4 hold arms this chapter at p 0.80, while the camera is still deep
     in the Owned colony (x −4.4). Between there and the surface pierce
     (x −8.06 at p 0.85) this mask runs 0 → 1 as a pure function of the pose
     — the same discipline as uPull — so every fade the chapter owns (soil
     slab dissolve, whisper bases, haze, sky, mist) COMPLETES underground,
     behind the slab it is itself dissolving in, before anything above ground
     can be seen. Combined with `amount` as a probabilistic OR: a fling that
     outruns the arming clock still surfaces onto a finished world, because
     the mask alone saturates the reveal. Reverse rides re-descend behind the
     same slab and the mask retires everything in place. */
  const riseOf = (camX) => {
    const u = (-camX - 4.6) / 2.8;             // 0 at x −4.6, 1 by x −7.4
    const c = u < 0 ? 0 : u > 1 ? 1 : u;
    return c * c * (3 - 2 * c);
  };

  sceneApi.addAnimator('journey-final', (t, dt) => {
    amount += (amountTarget - amount) * Math.min(1, dt * 2.2);
    if (amount < 0.004 && amountTarget === 0) amount = 0;
    const rise = riseOf(sceneApi.camera.position.x);
    const eff = 1 - (1 - amount) * (1 - rise);   // amount OR rise
    group.visible = amount > 0.003;
    if (!group.visible) {
      lastPull = pullOf(sceneApi.camera.position.x);
      if (heroDimActive) restoreHeroDim();   // byte-exact hand-back
      if (wasVisible) {
        // One last INACTIVE tick as the chapter goes dark, so the ring drops
        // any hover it was holding and the clone bodies retire their
        // opacities in place instead of freezing mid-kindle behind the
        // camera. Once retired we stop ticking entirely — the epilogue costs
        // nothing for the rest of the ride.
        wasVisible = false;
        uniforms.uAmount.value = eff;
        uniforms.uPull.value = pullOf(sceneApi.camera.position.x);
        ring.update(t, dt, false);
      }
      return;
    }
    wasVisible = true;

    // shared uniforms
    const pull = pullOf(sceneApi.camera.position.x);
    // hero floor-network dim rides amount x pull — eases in with the
    // pullback, reverses with it, restores exactly on retire
    collectHeroGround();
    const reachT = Math.max(0, Math.min(1, (pull - 0.25) / 0.45));
    applyHeroDim(eff * reachT * reachT * (3 - 2 * reachT));
    uniforms.uAmount.value = eff;
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

    // the bodies: clone reveal + sway, and the pointer response for clones
    // and batched members alike. Last, so it reads this frame's uniforms.
    ring.update(t, dt, true);

    // sprite layers (outside the shared shader uniforms)
    terrain.setAmount(eff);
    sky.update(t, eff);
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

  /* ---- Final-leg halation focus fallback (migrated from journey.js, M4:
     the chapter owns its own focal anatomy): the nearest mature ring member
     IN FRONT of the Final rest camera — its own camera.js's 'final-rest'
     key, so the reference can never drift from the authored leg — is the
     frame's focal highlight ("selected fairy-ring highlights", handoff)
     while the travelling front rests. Deterministic; ring members are
     scene-parented and never move. */
  const REST_FOCUS = (() => {
    const rk = CAMERA.keys.find(k => k.note === 'final-rest');
    const cam = rk.pos, dir = rk.tgt.clone().sub(cam).normalize();
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

  return {
    group,
    nodeIds: [],   // the epilogue has no detail state by design (adr-d6)
    /** T4 streaming seam. */
    setArmed(on) { amountTarget = on ? 1 : 0; },
    get armed() { return amountTarget > 0; },
    /** Deep-link / frozen-capture snap (journey.js placeAt contract): jump
     *  the eased arm state to its target so a dt=0 ride sees the finished
     *  chapter. Before this, ?capture=final shot the epilogue DARK — amount
     *  never integrated under the frozen clock, so the golden showed the
     *  hero over an unlit floor instead of the composition being gated. */
    snap() { amount = amountTarget; },
    setHot() {},
    nodeWorld() { return null; },
    /** Live growth-front position for the halation focus hint (or null). */
    frontWorld,
    /** The focal source for the lens: the travelling front when it runs,
     *  else the static nearest-member hint at the rest. */
    focusWorld() { return frontWorld() || REST_FOCUS; },
    /** FN-3.1 — closing-CTA hook. Donor trigger names preserved. */
    trigger(name) { if (name === 'ctaPulse' || name === 'ringPulse') fireCta(); },
    /** QA introspection */
    counts: { ...ring.counts, ...terrain.counts, ...sky.counts },
  };
}
