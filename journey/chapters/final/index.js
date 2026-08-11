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
import {
  makeUniforms, pullOf, pullRawOf, makeRng, TAU, RING_C, HERO_AZ, MEMBERS,
  groundY,
} from './world.js';
import { createFinalRing } from './ring.js';
import { createFinalTerrain } from './terrain.js';
import { createFinalSky } from './sky.js';
import { createFinalCanopy } from './canopy.js';
import { CAMERA } from './camera.js';

export function createFinal(sceneApi) {
  const group = new THREE.Group();
  group.visible = false;
  group.userData.jFinal = true;   // QA handle: budget A/Bs isolate this leg
  sceneApi.scene.add(group);

  // sceneApi: makeUniforms harvests the HERO's own tap-pulse trio off its live
  // materials, so a poke anywhere in this chapter plants the same wave the
  // hero answers (world.js heroPulse).
  const uniforms = makeUniforms(sceneApi);
  const ring = createFinalRing(sceneApi, uniforms);
  const terrain = createFinalTerrain(sceneApi, uniforms);
  const sky = createFinalSky(sceneApi, uniforms);
  // THE ROOT CANOPY (2026-08-07). Built after the ring because it is built
  // FROM it: ring.seats is where every fruiting body in the chapter stands,
  // and canopy.js lays one connected network over the lot, rooted at the
  // hero's own foot. It carries no state and no update() — every vertex is
  // on the chapter's shared aReveal/uPull law, so the whole thing kindles,
  // breathes with the growth front and retracts on a reverse scrub through
  // the same two uniforms the bodies use, with no per-frame cost at all.
  const canopy = createFinalCanopy(uniforms, ring.seats);
  group.add(canopy.group, ring.group, terrain.group, sky.group);

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

  /** BURIED (2026-08-11): 1 once the lens is 0.25 units under the soil, 0 at
   *  the surface and above. A pure function of the camera pose, so it reverse-
   *  scrubs exactly and a nav jump lands on the honest value with no state to
   *  carry. See the note at its call site and terrain.js's material. */
  function buriedOf(pos) {
    const cy = pos.y - groundY(pos.x, pos.z);
    const b = Math.max(0, Math.min(1, -cy / 0.25));
    return b * b * (3 - 2 * b);
  }

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
    if (shedFog) {
      shedFog.near.value = shedFog.n0;
      shedFog.far.value = shedFog.f0;
    }
    heroDimActive = false;
  }

  /* ---- the hero's own shed, on the world's fog (2026-08-06) ----------------
     Hannah: the spores at the end feel like a different substance from the
     ones at the beginning. Most of that lives in this chapter's own sky layer
     (sky.js's header has the diagnosis and the four fixes), but one part of
     it is the hero's REAL shed, and it is the same bug clones.js already
     names in capitals: THE ONE UNIFORM A CLONE MUST NOT INHERIT IS FOG.

     organism/organism.js's makePoints latches `fogNear`/`fogFar` per material
     at construction, to the hero page's fixed 7 -> 20. The director opens the
     world to 13.75 -> 60.3 across this leg and every other thing in frame
     rides that ramp — terrain, sky, the species batch, and the clone bodies,
     which had to be taken OFF the hero's pair for exactly this reason. The
     4,200-particle shed was never given the same treatment, so at the rest:

       · mean per-particle output 0.109, against 0.518 at the opening — the
         same cloud, 4.7x dimmer, for no reason a viewer can see;
       · on the world's own fog it would be 0.446, i.e. its own fog pair costs
         it 4.1x while the soil under it keeps its light;
       · and a hard black wall at 20 units cuts a cloud that spans 13.1-20.7
         clean in half. The hero's plume literally stops mid-air.

     So the shed rides the chapter's ramp here, by the same eased `reach` the
     ground-network dim uses (pure in the camera pose, so reverse scrubs
     retract it), and hands the two numbers back verbatim on retire. The
     material is the organism's; the VALUES are scene state for the length of
     one leg, which is the Connect-chapter precedent this file already runs on
     twenty lines above. Nothing inside organism/ is touched, and at p = 0 the
     chapter is not visible, so the Mission frame cannot see this at all. */
  let shedFog = null;
  function collectShedFog() {
    if (shedFog) return;
    const sp = sceneApi.groups && sceneApi.groups.spores;
    const u = sp && sp.material && sp.material.uniforms;
    if (!u || !u.fogNear || !u.fogFar) return;   // shader drifted: do nothing
    shedFog = { near: u.fogNear, far: u.fogFar, n0: u.fogNear.value, f0: u.fogFar.value };
  }
  function applyShedFog(reach) {
    if (!shedFog || !sceneApi.scene.fog) return;
    shedFog.near.value = shedFog.n0 + (sceneApi.scene.fog.near - shedFog.n0) * reach;
    shedFog.far.value = shedFog.f0 + (sceneApi.scene.fog.far - shedFog.f0) * reach;
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

  /* ---- the jump window: state says arrived, the camera says otherwise ----
     `amount` is the T4 arm, and the arm is driven by journey PROGRESS. On a
     nav jump progress snaps to the destination in one tick while the camera
     takes the best part of a second to get there, so for that window `amount`
     is not evidence about the pose — and the OR above lets it pin `eff` wide
     open regardless of `rise`. That is the second half of Hannah's "weird
     flash" (25-navigation-redux.md): even with the camera read fixed, a jump
     to Final composed the whole epilogue — soil slab, colony, sky, mist — at
     full uAmount over a camera still standing at Mission, while the per-vertex
     kindle (which DOES track the camera) held every body at its ember floor.
     Measured: +3,900 to +8,100 triangles of epilogue drawn at the departure
     pose, and the frame ~6.6/255 brighter than the Mission rest, for the whole
     blend.

     So while a blend is in flight the chapter composes on its CAMERA-PURE
     term alone. `rise` is exactly the right one: it already means "the lens
     has climbed into this chapter's territory", it is 0 at every other
     chapter's rest (their camera x is -2.25 .. +9.97, all well above the
     -4.6 onset) and 1 at this one's, and it is the same mask the ordinary
     underground approach composes on. The result is that a jump to Final
     reveals exactly as the scrub does — nothing until the lens passes
     x -4.6, then the slab dissolving in, then the bodies kindling on uPull —
     and a jump AWAY from Final retires it the same way, in reverse, instead
     of vanishing the whole field on the click frame.

     Off a blend this is byte-for-byte the shipped composition, including the
     visibility gate: `flag ? … : …` and not a blend of the two. Deep links,
     ?p= and the frozen ?capture= path never blend, so every golden is
     untouched by construction. */
  let blending = false;

  sceneApi.addAnimator('journey-final', (t, dt) => {
    amount += (amountTarget - amount) * Math.min(1, dt * 2.2);
    if (amount < 0.004 && amountTarget === 0) amount = 0;
    // The soil slab's `buried` dissolve is written EVERY frame, before the
    // visibility gate and outside setAmount — it is one float, and it is the
    // only way the term is genuinely stateless. Written inside the gate it
    // LATCHES whenever the chapter stops ticking: a reverse ride retires the
    // epilogue at p ~0.80 with the lens still 1.1 under the soil, leaving
    // buried = 1 for every p below that, against 0 on the way out. No frame
    // ever RENDERS the stale value (the group is invisible, and the animator
    // runs spine-first and rewrites it before any frame the group is drawn
    // for), but a forward/reverse uniform sweep then reports a full 1.0
    // mismatch that cannot be told apart from real hysteresis. Written here,
    // the sweep measures 0.000e+00 and the audit means what it says.
    terrain.setBuried(buriedOf(sceneApi.camera.position));
    const rise = riseOf(sceneApi.camera.position.x);
    const eff = blending ? rise : 1 - (1 - amount) * (1 - rise);   // amount OR rise
    // Still gated by the arm — `rise` says where the lens is, not which
    // chapter owns the frame, and the lens is below the onset on every other
    // leg anyway. `amountTarget > 0` keeps an arriving jump live before the
    // ease has moved; `amount > 0.003` keeps a departing one live while it
    // retires on the camera.
    group.visible = blending
      ? (amountTarget > 0 || amount > 0.003) && eff > 0.003
      : amount > 0.003;
    if (!group.visible) {
      lastPull = pullOf(sceneApi.camera.position.x);
      if (heroDimActive) restoreHeroDim();   // byte-exact hand-back
      if (wasVisible) {
        // One last INACTIVE tick as the chapter goes dark, so the ring drops
        // any poke still ringing and the clone bodies retire their opacities
        // in place instead of freezing mid-kindle behind the camera. It is
        // also what parks pickOn false, which is the picker's only gate now
        // that it holds no state of its own. Once retired we stop ticking
        // entirely — the epilogue costs nothing for the rest of the ride.
        wasVisible = false;
        uniforms.uAmount.value = eff;
        uniforms.uPull.value = pullOf(sceneApi.camera.position.x);
        uniforms.uPullRaw.value = pullRawOf(sceneApi.camera.position.x);
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
    collectShedFog();
    const reachT = Math.max(0, Math.min(1, (pull - 0.25) / 0.45));
    const reach = eff * reachT * reachT * (3 - 2 * reachT);
    applyHeroDim(reach);
    applyShedFog(reach);
    uniforms.uAmount.value = eff;
    uniforms.uPull.value = pull;
    // the unclamped twin, for the clone entry-draw front (clones.js part B)
    uniforms.uPullRaw.value = pullRawOf(sceneApi.camera.position.x);
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

    // sprite layers (outside the shared shader uniforms).
    // `buried` (2026-08-11): 1 once the lens is 0.25 under the soil, 0 at the
    // surface and above. MEASURED along p 0.725–0.970, every underground frame
    // of this leg is on the KEPT side (cutVal +10.06 → +0.56, crossing zero
    // only at p ≈ 0.862, AFTER the pierce at 0.8555) — so while this term is
    // up, the soil slab can only be the section wall standing in front of a
    // buried lens, and it dissolves. See terrain.js's material note.
    //
    // IT REPLACES the 2026-08-09 `under` tint, which is retired here. That
    // term sank the slab toward near-black over the 0.9 units EITHER side of
    // the soil line, to make its underside bearable; with the underside gone
    // it has nothing left to fix and one thing left to break — at the pierce
    // (p 0.8555) the lens stands ON the soil line with `under` still at 0.96,
    // so the surface it has just broken through filled the lower half of the
    // frame as a BLACK PLATE (10.7% of the frame pure black). Fog tone above
    // ground is what the slab was designed for and what its rest frame has
    // always had — `under` was already 0 at the Final rest (the lens stands
    // 2.68 up), so retiring it cannot touch either Final golden.
    //
    // 0.25 units, not 0.9: the slab must be back the instant the lens
    // surfaces, because above ground is where it does its job (stopping
    // underground strokes reading as lines on the floor). Camera-pure, so
    // reverse rides retrace it exactly.
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
    /** journey.js: a nav jump's camera blend is in flight, so the journey's
     *  state and the camera disagree — compose on the camera alone until it
     *  lands. See the block above the animator. */
    setBlending(on) { blending = !!on; },
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
    counts: { ...ring.counts, ...terrain.counts, ...sky.counts, ...canopy.counts },
    /** QA: every fruiting body's seat ({x, z, gy, s, reveal, tier}) — the
     *  arrival-pacing measurements (18-one-species.md §12/§13) read the
     *  reveal ladder here instead of recovering each threshold by inverting
     *  frozen uProg samples. A build product, never state: seats are filled
     *  once by placeMushroom and bodies never move. */
    seats: ring.seats,
    /** LIVE QA: the poke's own numbers, read now rather than at construction
     *  (the spread above freezes anything it touches). */
    pickStats: ring.pickStats,
  };
}
