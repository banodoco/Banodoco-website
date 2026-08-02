// journey-v6 — CONNECT chapter, PRODUCTION (W4-B): the gill commons.
//
// Replaces the grey-box proxy reviewed at W3. Geometry and light are split:
//   connect-blades.js      the colonnade — instanced blade-tissue lamellae,
//                          taut cross-veins, moisture beads, spores, haze
//   connect-structures.js  the three semantic structures (ADOS strands+knot,
//                          Hivemind braid+memory; Community lives in the
//                          blade/vein shaders via per-instance tags)
//   this file              orchestration: arming/fade, hover drivers, the
//                          asynchronous ambient life, camera-driven exit
//                          pulse, hero-point re-parameterisation, node
//                          anchors. Public API is IDENTICAL to the grey-box
//                          (setArmed/armed/setHot/nodeWorld/nodeIds/counts) —
//                          journey.js hotspot registration is untouched.
//
// COMPOSITION vs THE LEFT COPY BLOCK (resolves the W3-B compromise): the
// grey-box parked Community at az 2.00 / y 2.00 to dodge the copy's
// suppression rect. Here the whole sector moved to the front-left wall the
// rest gaze actually centres (az 2.95 ± 0.36): the region and its label sit
// centre-frame LOW, fully right of and below the copy block at every sway
// phase; ADOS crowns the stipe apex upper-centre; Hivemind winds through the
// lower-right — three regions, none over the text. Verified against the live
// suppression rect at 1440x900 and the pane size (see W4-B in BUDGETS.md).
//
// HERO POINT CLOUDS (bokeh): the hero's fake depth-of-field balloons any
// point sprite far from its 9.5-unit focal band; at chamber range (~1-2
// units) motes/beads become frame-filling bokeh blobs. The grey-box dimmed
// them to a flat 22% (the spike's number) — still half the frame at the
// rest. Production keeps the same scene-state mechanism (uOpacity uniforms
// collected once, scaled per-frame, restored EXACTLY when the eased amount
// reaches zero — mushroom-scene.js is never edited) but deepens the dim with
// camera proximity: ~22% while slipping under the rim, easing to ~6%
// residual at the chamber rest, back out symmetrically on exit. The hero's
// spore shed stays live (it feeds the plume-follow entry).
import * as THREE from 'three';
import { makeRng, capUnderPt } from '../core/anatomy.js';
import {
  buildColonnade, bladeDepth, smooth01, COMM_AZ,
} from './connect-blades.js';
import { buildStructures, routePoint, KNOT, KNOT_AZ } from './connect-structures.js';

const sm = (a, b, x) => smooth01((x - a) / (b - a));

/** Minimal one-shot pulse driver (donor H.pulseDriver, inlined). */
function pulseDriver(dur) {
  return {
    active: false, value: -1, t: 0, dur,
    fire() { this.active = true; this.t = 0; },
    update(dt) {
      if (!this.active) return;
      this.t += dt;
      this.value = this.t / this.dur;
      if (this.value >= 1) { this.active = false; this.value = -1; }
    },
  };
}

export function createConnect(sceneApi) {
  const rnd = makeRng(41417);
  const group = new THREE.Group();
  group.visible = false;
  sceneApi.groups.mushroom.add(group);

  /* ---- shared uniforms (one write per frame) ---- */
  const U = {
    uTime: { value: 0 },
    uAmount: { value: 0 },
    uFlex: { value: 1 },
    uComm: { value: new THREE.Vector2(0, 0) },          // amt, seq
    uAmbC: { value: new THREE.Vector3(0, 2, 4) },       // regional exchange centres
    uAmbA: { value: new THREE.Vector3(0, 0, 0) },       // amounts
    uAmbW: { value: new THREE.Vector3(0.6, 0.6, 0.6) }, // widths
    uAdos: { value: new THREE.Vector3(0, 0, KNOT_AZ) }, // afterglow amt, ring pos, knot az
    uExit: { value: new THREE.Vector2(0, 1.2) },        // exit pulse amt, head (u)
  };

  const col = buildColonnade(group, U);
  const st = buildStructures(group, U);
  st.setGlowTexture(col.glowTex);

  const counts = {
    blades: col.counts.blades,
    tris: col.counts.tris,
    edgeSegs: col.counts.edgeSegs,
    veinSegs: col.counts.veinSegs,
    beads: col.counts.beads,
    spores: col.counts.spores,
    haze: col.counts.sprites,
    adosStrandSegs: st.counts.adosStrandSegs,
    adosKnotSegs: st.counts.adosKnotSegs,
    hiveSegs: st.counts.hiveSegs,
    memPoints: st.counts.memPoints,
  };

  /* ================================================================
     Node anchors — real structure, mushroom-local (sway-correct via
     matrixWorld in nodeWorld, exactly as the grey-box did).
     ================================================================ */
  // Anchor placement is constrained by BOTH orientations (W4-F handoff,
  // GREYBOX-DECISIONS §23): the portrait rest's half-hfov is ~15 deg and its
  // copy block owns the middle band of the frame, so all three anchors must
  // hold inside the narrow frustum AND clear of the portrait copy rect.
  // Verified live at 430x932, 375x812 and 1440x900 (see W4-B in BUDGETS.md).
  const communityAnchor = (() => {
    // at the lit region's floor: below the portrait copy rect, still inside
    // the region the hover ignites
    const p = capUnderPt(0.62, COMM_AZ);
    p.y -= bladeDepth(0.62) * 1.30;
    return p;
  })();
  // Hivemind's chip anchors to a different point of the SAME route per
  // orientation (the "anchor decision on the chapter side" §23 asked for):
  // in landscape it sits mid-route in the open lower-right; in portrait that
  // stretch is ~30 deg outside the narrow frustum and the copy rect owns the
  // middle band, so the chip rides the junction turn-in instead — the only
  // stretch of the route that is both in-frame and clear of the text.
  const hiveAnchorLand = (() => {
    const { p } = routePoint(0.82);
    p.y -= 0.04;
    return p;
  })();
  const hiveAnchorPort = (() => {
    const { p } = routePoint(0.94);
    return p;
  })();
  const NODES = {
    community: communityAnchor,
    ados: KNOT.clone(),
    get hivemind() {
      return sceneApi.camera.aspect < 1 ? hiveAnchorPort : hiveAnchorLand;
    },
  };
  const NODE_IDS = ['community', 'ados', 'hivemind'];   // narrative order

  /* ================================================================
     State: hover drivers + asynchronous ambient life
     ================================================================ */
  const hot = { community: false, ados: false, hivemind: false };
  const amt = { community: 0, ados: 0, hivemind: 0 };   // eased hover amounts

  const commSeq = pulseDriver(1.7);      // community ignition sweep
  let commHold = 0;                      // holds the sequence at 1 while hot
  const adosIn = pulseDriver(1.5);       // convergence inflow
  const adosOut = pulseDriver(1.2);      // outward afterglow (auto-chained)
  let adosChained = false;
  let adosRefire = 0;
  const hiveHead = pulseDriver(2.3);     // route traversal
  let hiveTrace = 0;
  let hiveRefire = 0;

  // ambient clocks — every behaviour also breathes on its own, quietly, so a
  // first-time visitor sees all three verbs without hovering (CN acceptance).
  // Staggered so they can never sync.
  let ambComm = 6 + rnd() * 5;
  let ambAdos = 3 + rnd() * 5;
  let ambHive = 10 + rnd() * 6;
  let commAmbAmt = 0;                    // ambient (sub-hover) strengths
  let adosAmbAmt = 0;
  let hiveAmbAmt = 0;

  // three independent regional exchanges (CN-4.1) — own clocks, own gaps;
  // the chamber never pulses as one object
  const ambRegions = [];
  for (let i = 0; i < 3; i++) {
    ambRegions.push({
      t: -(0.6 + rnd() * 4.0),
      dur: 3.4 + rnd() * 4.6,
      center: rnd() * Math.PI * 2,
      width: 0.40 + rnd() * 0.55,
      peak: 0.26 + rnd() * 0.38,
      drift: (rnd() - 0.5) * 0.10,
      amt: 0,
    });
  }

  /* ================================================================
     Hero point re-parameterisation (see header note)
     ================================================================ */
  const dimmed = [];
  function collectHeroPoints() {
    if (dimmed.length) return;
    const roots = [sceneApi.groups.mushroom, sceneApi.groups.ground, sceneApi.scene];
    const seen = new Set();
    for (const root of roots) {
      root.traverse((o) => {
        if (!o.isPoints || seen.has(o)) return;
        let inOwn = false;
        for (let p = o.parent; p; p = p.parent) if (p === group) { inOwn = true; break; }
        if (inOwn) return;                            // not our own
        if (o === sceneApi.groups.spores) return;     // keep the shed alive
        const u = o.material && o.material.uniforms && o.material.uniforms.uOpacity;
        if (u) { dimmed.push({ u, base: u.value, obj: o }); seen.add(o); }
      });
    }
  }

  /* ================================================================
     Per-frame
     ================================================================ */
  let amount = 0, amountTarget = 0;
  let exitFired = false;
  const _nw = new THREE.Vector3();

  sceneApi.addAnimator('journey-connect', (t, dt) => {
    const k = Math.min(1, dt * 3.0);
    amount += (amountTarget - amount) * k;
    if (amount < 0.004 && amountTarget === 0) amount = 0;
    group.visible = amount > 0.003;

    // Hero bokeh: eased dim, deepened by camera proximity; exact restore at 0.
    // Below ~12% the point clouds RETIRE COMPLETELY (visible = false): at
    // chamber range the hero's fake-DOF balloons every mote into a frame-
    // filling quad, and that raster load — stacked under the colonnade — is
    // what pushed heavy frames into the Metal command-buffer aborts described
    // in connect-blades.js. Dimming pays the full raster cost for 6% of the
    // light; retiring pays nothing. Restored exactly on exit.
    collectHeroPoints();
    const cam = sceneApi.camera.position;
    const camRad = Math.hypot(cam.x, cam.z);
    const inside = sm(3.4, 2.3, camRad);
    const dimK = 1 - amount * (0.78 + 0.16 * inside);   // 22% armed -> ~6% at the rest
    for (const d of dimmed) {
      d.u.value = d.base * dimK;
      d.obj.visible = dimK > 0.12;
    }

    if (!group.visible) return;

    U.uTime.value = t;
    U.uAmount.value = amount;
    for (const f of col.fadeMats) f.m.opacity = f.base * amount;

    /* ---- eased hover amounts ---- */
    const ke = Math.min(1, dt * 5);
    for (const id of NODE_IDS) amt[id] += ((hot[id] ? 1 : 0) - amt[id]) * ke;

    /* ---- ambient clocks (skip a behaviour while it is hovered) ---- */
    ambComm -= dt; ambAdos -= dt; ambHive -= dt;
    if (ambComm <= 0) {
      if (!hot.community && !commSeq.active) { commSeq.fire(); commAmbAmt = 0.34; }
      ambComm = 11 + rnd() * 7;
    }
    if (ambAdos <= 0) {
      if (!hot.ados && !adosIn.active) { adosIn.fire(); adosChained = true; adosAmbAmt = 0.30; }
      ambAdos = 9 + rnd() * 6;
    }
    if (ambHive <= 0) {
      if (!hot.hivemind && !hiveHead.active) { hiveHead.fire(); hiveAmbAmt = 0.38; }
      ambHive = 13 + rnd() * 6;
    }
    if (hot.community) commAmbAmt = 0;
    if (hot.ados) adosAmbAmt = 0;
    if (hot.hivemind) hiveAmbAmt = 0;
    // ambient strengths fade once their pulse has finished
    if (!commSeq.active) commAmbAmt = Math.max(0, commAmbAmt - dt * 0.25);
    if (!adosIn.active && !adosOut.active) adosAmbAmt = Math.max(0, adosAmbAmt - dt * 0.4);
    if (!hiveHead.active) hiveAmbAmt = Math.max(0, hiveAmbAmt - dt * 0.4);

    /* ---- COMMUNITY: sequential ignition, held while hot ---- */
    commSeq.update(dt);
    const commA = Math.max(amt.community, commAmbAmt);
    if (commSeq.active) commHold = commSeq.value;
    else if (hot.community) commHold += (1 - commHold) * Math.min(1, dt * 3);
    else commHold = Math.max(0, commHold - dt * 0.7);
    if (commA < 0.02 && !commSeq.active) commHold = 0;
    U.uComm.value.set(commA, commHold);

    /* ---- ADOS: inflow -> knot -> outward afterglow ---- */
    adosIn.update(dt); adosOut.update(dt);
    if (adosChained && !adosIn.active) { adosChained = false; adosOut.fire(); }
    if (hot.ados) {
      adosRefire -= dt;
      if (adosRefire <= 0 && !adosIn.active) { adosIn.fire(); adosChained = true; adosRefire = 2.8; }
    } else adosRefire = 0;
    const aA = Math.max(amt.ados, adosAmbAmt);
    const stag = st.adosMat.uniforms.uStag.value;
    st.adosMat.uniforms.uIn.value = adosIn.active ? (0.35 + 0.85 * aA) : 0;
    st.adosMat.uniforms.uInPos.value = adosIn.active ? adosIn.value * (1 + stag) : -2;
    st.adosMat.uniforms.uBase.value = 0.16 * (1 + 0.9 * amt.ados);
    // the surrounding gill tissue answers with an outward ring (blade shader)
    U.uAdos.value.x = adosOut.active ? (0.30 + 0.65 * aA) * Math.sin(Math.PI * adosOut.value) : 0;
    U.uAdos.value.y = adosOut.active ? adosOut.value * 1.1 : 0;
    // knot: warms as channels land, never bouncy
    const arrive = adosIn.active ? Math.pow(adosIn.value, 3.2) : 0;
    st.knotMat.uniforms.uHotAmt.value =
      0.28 * amt.ados + 0.85 * arrive + (adosOut.active ? 0.4 * (1 - adosOut.value) : 0);
    st.coreMat.opacity = amount * Math.min(0.9,
      0.30 + 0.35 * amt.ados + 0.55 * arrive + (adosOut.active ? 0.30 * (1 - adosOut.value) : 0));
    st.core.scale.setScalar(st.coreBase * (1 + 0.10 * amt.ados + 0.16 * arrive));

    /* ---- HIVEMIND: travelling head, memory points, persistent trace ---- */
    hiveHead.update(dt);
    if (hot.hivemind) {
      hiveRefire -= dt;
      if (hiveRefire <= 0 && !hiveHead.active) { hiveHead.fire(); hiveRefire = 4.5; }
    } else hiveRefire = 0;
    if (hiveHead.active) hiveTrace = 1;
    else hiveTrace = Math.max(0, hiveTrace - dt / 4.2);
    const hA = Math.max(amt.hivemind, hiveAmbAmt);
    const head = hiveHead.active ? hiveHead.value : (hiveTrace > 0 ? 1 : -2);
    st.hiveMat.uniforms.uPulse.value = head;
    st.hiveMat.uniforms.uPulseOn.value = hiveHead.active ? (0.45 + 0.75 * hA) : 0;
    st.hiveMat.uniforms.uBase.value = 0.20 * (1 + 0.70 * amt.hivemind);
    st.hiveMat.uniforms.uTrace.value = hiveTrace * (0.40 + 0.60 * Math.max(hA, hiveTrace * 0.5));
    // memory points light as the head passes, fade over seconds
    let memDirty = false;
    for (let i = 0; i < st.memAlong.length; i++) {
      let L = st.memLife[i];
      if (hiveHead.active && hiveHead.value >= st.memAlong[i] && L < 0.02) L = 1;
      L = Math.max(0, L - dt / (hiveHead.active ? 5.2 : 3.8));
      if (L !== st.memLife[i]) { st.memLife[i] = L; memDirty = true; }
    }
    if (memDirty) st.memGeo.attributes.aLife.needsUpdate = true;

    /* ---- ambient regional exchanges (CN-4.1) ---- */
    for (const r of ambRegions) {
      r.t += dt;
      if (r.t > r.dur) {
        r.t = -(0.8 + rnd() * 5.0);
        r.dur = 3.4 + rnd() * 4.6;
        r.center = rnd() * Math.PI * 2;
        r.width = 0.40 + rnd() * 0.55;
        r.peak = 0.26 + rnd() * 0.38;
        r.drift = (rnd() - 0.5) * 0.10;
      }
      const e = r.t > 0 ? Math.sin(Math.PI * Math.min(r.t / r.dur, 1)) : 0;
      r.amt = e * r.peak;
      r.center += dt * r.drift;
    }
    U.uAmbC.value.set(ambRegions[0].center, ambRegions[1].center, ambRegions[2].center);
    U.uAmbA.value.set(ambRegions[0].amt, ambRegions[1].amt, ambRegions[2].amt);
    U.uAmbW.value.set(ambRegions[0].width, ambRegions[1].width, ambRegions[2].width);

    /* ---- CN-5.1 exit: a pulse travels toward the stipe-cap junction ----
       Driven purely off the live camera (like journey.js driveInspire), so a
       reverse scrub produces the mirror-image wave with no state to pop. The
       Connect->Owned leg carries the camera's z from -1.0 to +0.9 while y
       drops; that crossing IS the exit phase. */
    const exitPhase = sm(-0.85, 0.62, cam.z) * sm(2.62, 2.42, cam.y) * amount;
    const exA = sm(0.04, 0.30, exitPhase) * (1 - sm(0.72, 1.0, exitPhase));
    U.uExit.value.set(exA * 0.9, 1.05 - exitPhase);
    st.hiveMat.uniforms.uHiveExit.value = exA;
    // one real pulse runs the braid to the junction as the exit begins
    if (exitPhase > 0.15 && !exitFired) {
      exitFired = true;
      if (!hiveHead.active) { hiveHead.fire(); hiveTrace = 1; }
    }
    if (exitPhase < 0.06) exitFired = false;
  });

  /* ================================================================
     Public API — unchanged from the grey-box
     ================================================================ */
  return {
    group,
    counts,
    nodeIds: NODE_IDS,
    /** T2 streaming seam — eased, not a switch. */
    setArmed(on) { amountTarget = on ? 1 : 0; },
    get armed() { return amountTarget > 0; },
    setHot(id, on) {
      if (!(id in hot)) return;
      const was = hot[id];
      hot[id] = !!on;
      if (on && !was) {
        if (id === 'community') { commSeq.fire(); }
        else if (id === 'ados') { adosIn.fire(); adosChained = true; adosRefire = 2.8; }
        else if (id === 'hivemind') { hiveHead.fire(); hiveRefire = 4.5; }
      }
    },
    nodeWorld(id) {
      const n = NODES[id];
      return n ? _nw.copy(n).applyMatrix4(sceneApi.groups.mushroom.matrixWorld).clone() : null;
    },
  };
}
