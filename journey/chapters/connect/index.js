// journey-v6 — CONNECT chapter, GROUND RESTAGE (16-connect-ground-restage.md).
//
// The gill-chamber staging is deleted (git history is the archive). The
// chapter now stages the surface network: the camera settles low and wide on
// the open ground, mushroom on the left of frame, and watches luminous
// tendrils grow out of the stipe base across the terrain to three hubs —
// ADOS, Hivemind, Discord. The organism already speaks this language (the
// hero's own faint ground web); Connect makes it legible.
//
//   tendrils.js   all geometry + shaders (strands, hubs, glints, particles)
//   this file     orchestration: arming/fade, drive(p) growth choreography,
//                 ambient pulse clocks, hover drivers, camera-driven exit
//                 convergence, node anchors. Public API is the chapter
//                 contract, verbatim: { group, counts, nodeIds, setArmed,
//                 armed, setHot, nodeWorld } plus drive(p) and snap().
//
// GROWTH IS THE ARRIVAL (doc §4) — and the no-self-ignition answer: there is
// no natural occlusion on this leg, so nothing may fade in on screen. The
// network GROWS from the stipe base, keyed to leg-local progress (Final's
// growth-front precedent): extent 0 -> 1 over leg t 0.10 -> 0.46, hubs
// igniting as the front reaches them (ADOS, then Hivemind, then Discord —
// their route lengths stagger them naturally). At the arm boundaries the
// network has zero extent: armed but invisible ("dark at arm").
import * as THREE from 'three';
import { makeRng } from '../../anatomy.js';
import { startOf, endOf } from '../../route.js';
import { buildTendrils, HUB_IDS } from './tendrils.js';

const smooth01 = (x) => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
const sm = (a, b, x) => smooth01((x - a) / (b - a));

/** Minimal one-shot pulse driver (donor H.pulseDriver, inlined — kept idiom). */
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

// Growth window in leg-local t (doc §4 suggested keys, kept).
const GROW_LO = 0.10, GROW_HI = 0.46;

export function createConnect(sceneApi) {
  const rnd = makeRng(41417);
  const group = new THREE.Group();
  group.visible = false;
  // NON-sway parent (doc §3): the network is rooted terrain — it must not
  // sway with the cap. Same parenting rule as the Final field (adr-d3).
  sceneApi.scene.add(group);

  /* ---- shared uniforms (one write per frame) ---- */
  const U = {
    uTime: { value: 0 },
    uAmount: { value: 0 },
    uGrow: { value: 0 },
    uGrowEdge: { value: 0 },
    uRouteAmp: { value: new THREE.Vector3(1, 1, 1) },
    uHairAmp: { value: 1 },
    uPulseHead: { value: new THREE.Vector3(-2, -2, -2) },
    uPulseAmp: { value: new THREE.Vector3(0, 0, 0) },
    uExit: { value: 0 },
    // The copy brightness well (doc §3): the calm dark zone under the centred
    // headline is made IN-WORLD — the network is quiet where the copy block
    // projects at the rest pose. xy = world-xz centre, z = strength, w = radius.
    // Authored against the live rest frame.
    uWell: { value: new THREE.Vector4(4.4, 1.4, 0.66, 1.9) },
    uPartAmp: { value: 0 },
  };

  const net = buildTendrils(group, U);
  const counts = net.counts;

  /* ================================================================
     Node anchors — the hub cores. The group parents to the scene root,
     so hub positions ARE world positions (no matrix walk needed; kept
     through a clone so callers can't mutate the anchors).
     Discord's chip anchors per orientation (hiveAnchorPort precedent):
     in landscape it sits on the hub; in portrait the hub is ~25 deg
     outside the narrow frustum, so the chip rides the route's mid
     stretch — the only part of Discord's run that is in-frame there.
     ================================================================ */
  const NODES = {};
  for (const hm of net.hubMeta) NODES[hm.id] = hm.pos.clone();
  const discordPort = net.hubMeta[2].portAnchor.clone();
  Object.defineProperty(NODES, 'discord', {
    get() { return sceneApi.camera.aspect < 1 ? discordPort : net.hubMeta[2].pos; },
  });
  // ADOS anchors per orientation too since its left-of-stem move (2026-08-04):
  // in landscape the chip sits on the hub in the lower-left ground field; in
  // portrait that world position projects inside the centred copy block, so
  // the chip rides the route's upper stretch (tendrils.js PORT_T) instead.
  const adosPort = net.hubMeta[0].portAnchor.clone();
  Object.defineProperty(NODES, 'ados', {
    get() { return sceneApi.camera.aspect < 1 ? adosPort : net.hubMeta[0].pos; },
  });
  const NODE_IDS = [...HUB_IDS];          // narrative order = reveal order = tab order
  const _nw = new THREE.Vector3();

  /* ================================================================
     State: hover + ambient pulse clocks (per route, own clocks,
     never synced — the ambRegions law)
     ================================================================ */
  const hot = { ados: false, hivemind: false, discord: false };
  const amt = { ados: 0, hivemind: 0, discord: 0 };
  const refire = { ados: 0, hivemind: 0, discord: 0 };

  const pulses = HUB_IDS.map((id, i) => ({
    id, i,
    driver: pulseDriver(2.6 + net.routes[i].len * 0.28),   // longer routes take longer
    clock: 4 + rnd() * 8,                                  // staggered first fires
    focus: 0,                                              // 1 while the pulse is hover-focused
    flare: 0,                                              // hub brightening on arrival
  }));

  /* ================================================================
     Hero ground-web dim (doc §3): the hero's ambient web is the undercoat
     that makes the network feel native, but at full strength the two are
     double-exposure mush. While armed, the chapter dims the hero web's
     materials using the EXACT collect-base/scale/restore-exactly pattern
     (Final-chapter precedent; organism.js is never edited). Restored
     byte-exactly the moment the chapter retires.
     ================================================================ */
  const heroDim = [];
  let heroDimReady = false, heroDimActive = false;
  function collectHeroWeb() {
    if (heroDimReady) return;
    heroDimReady = true;
    const gg = sceneApi.groups && sceneApi.groups.ground;
    if (!gg) return;
    // same detection + order the hero builds them in (Final precedent):
    // [web, myc, mossPts, pools, roots, ribbon, beads]
    const withWin = gg.children.filter(o => o.material &&
      ((o.material.uniforms && o.material.uniforms.uWin) ||
       (o.material.userData && o.material.userData.uWin)));
    const KEEP = [0.42, 0.42, 0.60, 0.80, 0.48, 0.52, 0.58];
    withWin.forEach((o, i) => {
      const m = o.material;
      const u = m.uniforms && m.uniforms.uOpacity;
      if (u) heroDim.push({ u, base: u.value, keep: KEEP[i] ?? 0.5 });
      else if (typeof m.opacity === 'number') heroDim.push({ m, base: m.opacity, keep: KEEP[i] ?? 0.5 });
    });
  }
  function applyHeroDim(reach) {
    heroDimActive = reach > 0.001;
    for (const d of heroDim) {
      const f = 1 - reach * (1 - d.keep);
      if (d.u) d.u.value = d.base * f;
      else d.m.opacity = d.base * f;
    }
  }
  function restoreHeroDim() {
    for (const d of heroDim) {
      if (d.u) d.u.value = d.base;
      else d.m.opacity = d.base;
    }
    heroDimActive = false;
  }

  /* ================================================================
     Per-frame
     ================================================================ */
  let amount = 0, amountTarget = 0;
  let grow = 0, growEdge = 0;             // written by drive(p) — pure in p
  const hubIgnite = [0, 0, 0];

  sceneApi.addAnimator('journey-connect', (t, dt) => {
    const k = Math.min(1, dt * 3.0);
    amount += (amountTarget - amount) * k;
    if (amount < 0.004 && amountTarget === 0) amount = 0;
    group.visible = amount > 0.003;
    if (!group.visible) {
      if (heroDimActive) restoreHeroDim();   // byte-exact hand-back
      return;
    }

    // undercoat dim rides amount x growth — eases in with the network,
    // reverses with it, restores exactly on retire
    collectHeroWeb();
    applyHeroDim(amount * sm(0.2, 0.8, grow));

    U.uTime.value = t;
    U.uAmount.value = amount;
    U.uGrow.value = grow;
    U.uGrowEdge.value = growEdge;

    /* ---- eased hover amounts ---- */
    const ke = Math.min(1, dt * 5);
    for (const id of NODE_IDS) amt[id] += ((hot[id] ? 1 : 0) - amt[id]) * ke;

    /* ---- ambient pulses: every 9–14 s per route, gated on extent > 0.9 ---- */
    for (const P of pulses) {
      P.driver.update(dt);
      if (grow > 0.9) {
        P.clock -= dt;
        if (P.clock <= 0) {
          if (!P.driver.active && !hot[P.id]) { P.driver.fire(); P.focus = 0; }
          P.clock = 9 + rnd() * 5;
        }
      }
      // hover: a focused pulse fires base->hub immediately, refiring while held
      if (hot[P.id]) {
        refire[P.id] -= dt;
        if (refire[P.id] <= 0 && !P.driver.active) { P.driver.fire(); P.focus = 1; refire[P.id] = 4.5; }
      } else refire[P.id] = 0;
      // arrival: the hub brightens briefly as the pulse lands, then relaxes
      if (P.driver.active && P.driver.value > 0.9) P.flare = Math.max(P.flare, sm(0.9, 1.0, P.driver.value));
      P.flare = Math.max(0, P.flare - dt * 0.55);
    }
    U.uPulseHead.value.set(
      pulses[0].driver.active ? pulses[0].driver.value : -2,
      pulses[1].driver.active ? pulses[1].driver.value : -2,
      pulses[2].driver.active ? pulses[2].driver.value : -2,
    );
    U.uPulseAmp.value.set(
      pulses[0].driver.active ? 0.9 + 1.1 * (pulses[0].focus || amt.ados) : 0,
      pulses[1].driver.active ? 0.9 + 1.1 * (pulses[1].focus || amt.hivemind) : 0,
      pulses[2].driver.active ? 0.9 + 1.1 * (pulses[2].focus || amt.discord) : 0,
    );

    /* ---- hover: hub + route lift, unrelated routes dim to ~0.55 ---- */
    const maxAmt = Math.max(amt.ados, amt.hivemind, amt.discord);
    const dimOf = (own) => (1 + 0.55 * own) * (1 - 0.45 * Math.max(0, maxAmt - own));
    U.uRouteAmp.value.set(dimOf(amt.ados), dimOf(amt.hivemind), dimOf(amt.discord));
    U.uHairAmp.value = 1 - 0.3 * maxAmt;

    /* ---- exit (doc §4): light converges home as the camera nears the trunk.
       Driven purely off the live camera (the driveInspire/exit-phase
       precedent) so reverse scrubs mirror it with no state to pop. The rest
       camera sits at radius ~7; the Connect->Owned join walks it in to ~1.3. ---- */
    const cam = sceneApi.camera.position;
    const camRad = Math.hypot(cam.x, cam.z);
    U.uExit.value = sm(5.0, 2.4, camRad) * amount;

    /* ---- particle field: sparse slow drift, gated on full extent ---- */
    U.uPartAmp.value = sm(0.9, 1.0, grow);
    net.updateParticles(t);

    /* ---- hub cores: ignition (growth front) + hover + pulse flare ---- */
    for (let i = 0; i < net.hubMeta.length; i++) {
      const hm = net.hubMeta[i];
      hubIgnite[i] = sm(hm.along - 0.05, hm.along + 0.015, grow * 1.06);
      const core = net.cores[i];
      const a = amt[hm.id], flare = pulses[i].flare;
      // Resting identity raised (audit taste pass, 2026-08-04): each hub must
      // read as an unmistakable destination-beacon AT REST, not only on
      // pulse/hover — 0.58 resting, cap lifted to 1.0 so the hover (+0.4)
      // and arrival-flare (+0.45) headroom still register above it.
      core.mat.opacity = amount * hubIgnite[i] * Math.min(1.0, 0.58 + 0.4 * a + 0.45 * flare);
      core.sprite.scale.setScalar(core.baseScale * (1 + 0.18 * a + 0.22 * flare));
    }
  });

  /* ================================================================
     Public API — the chapter contract, verbatim, plus drive(p)/snap()
     ================================================================ */
  const SPAN_LO = startOf('connect'), SPAN_HI = endOf('connect');

  return {
    group,
    counts,
    nodeIds: NODE_IDS,
    /** T2 streaming seam (now a pure p-window in seams.js) — eased, not a switch. */
    setArmed(on) { amountTarget = on ? 1 : 0; },
    get armed() { return amountTarget > 0; },
    setHot(id, on) {
      if (!(id in hot)) return;
      hot[id] = !!on;
    },
    nodeWorld(id) {
      const n = NODES[id];
      return n ? _nw.copy(n).clone() : null;
    },
    /** Growth choreography — pure in p, so scrubs reverse exactly.
     *  Forward: the network races across the ground and resolves into hubs.
     *  Reverse: it retracts into the base. Past the leg (the p-window holds
     *  to owned.start + 0.105) the network stays fully grown; retire happens
     *  behind the Owned soil-crossing murk exactly as shipped (M5 values). */
    drive(p) {
      const legT = (p - SPAN_LO) / (SPAN_HI - SPAN_LO);
      grow = sm(GROW_LO, GROW_HI, legT);
      // the growing edge glows only while the front travels
      growEdge = grow > 0 && grow < 1 ? Math.sin(Math.PI * Math.min(Math.max(grow, 0), 1)) ** 0.6 : 0;
    },
    /** Deep links / capture (placeAt): jump the eased arming to its target so
     *  a dt = 0 placement renders the finished state — the frozen ?capture=
     *  frame needs this (animators see dt = 0 under freezeTime). */
    snap() {
      amount = amountTarget;
      for (const id of NODE_IDS) amt[id] = hot[id] ? 1 : 0;
    },
  };
}
