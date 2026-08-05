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
// THE PATHS PRE-EXIST; ARRIVING LIGHTS THEM UP (2026-08-05, Hannah). The old
// model grew the network as new geometry keyed to leg progress, which is
// exactly why it read as conjured. Now the routes are part of the world and
// the arrival is LIGHT TRAVELLING ALONG THEM. Two orthogonal gates:
//
//   resolve  CAMERA-PURE, this file's `resolveNow()`. Nothing on a timeline:
//            the quiet paths come out of the ground as the camera's own gaze
//            drops onto it, the way real ground detail resolves as you come
//            down to it (the house precedent; the Final chapter's camera-pure
//            uPull). Reverse scrubs mirror it exactly because the camera pose
//            is itself a pure function of p.
//   lit      PURE IN p (drive(p)): the light front runs base -> hubs over
//            leg t GROW_LO..GROW_HI, lifting each strand from its quiet
//            level to its full one and kindling each hub core as it lands.
//
// THE D16 LAW IS KEPT, and kept the same way: nothing fades in over open
// view. `resolve` is EXACTLY 0 at the hero pose and at the Inspire rest in
// both orientations (see the measured table below), so the whole group is
// not merely dark but not drawn at the protected frames, and both arm edges
// sit where resolve is 0.
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

// Light-travel window in leg-local t. Later than the old growth window
// (0.10..0.46): the quiet paths must be established BEFORE the light runs,
// and the camera-pure resolve is ~1 by leg t 0.27 (p 0.44). Here the light
// leaves the base at p 0.433 and lands on Discord at p 0.487, just under the
// rest at 0.490.
const GROW_LO = 0.24, GROW_HI = 0.487;

/* ================================================================
   The camera-pure resolve (Change 1, 2026-08-05)
   ================================================================
   ONE quantity, read straight off the live camera — no p, no clock, no state:
   `forward.y`, the downward component of the camera's own look axis. That is
   the camera coming DOWN onto the ground, which is what makes ground detail
   resolve. Above GAZE_HI the eye is not on the ground at all and the resolve
   is exactly zero; by GAZE_LO the paths are fully out.

   Measured on the shipped path (steady, both orientations):

                          landscape          portrait
     hero pose  p 0      +0.0337 (1.9 up)   +0.1452 (8.4 up)   resolve 0
     min over p 0..0.35  +0.0337 (at p 0)   +0.0323 (at p 0.20) resolve 0
     Inspire rest 0.26   +0.0863            +0.0477            resolve 0
     first non-zero      p 0.3715           p 0.3685
     fully resolved      p 0.4405           p 0.4405
     Connect rest 0.49   -0.1548 (8.9 down) -0.1548 (8.9 down)

   The nearest either orientation ever comes to the threshold before Connect
   is 0.053 in forward.y, i.e. ~3.0 deg — an order of magnitude more than the
   handheld layer's whole 0.34 deg peak wander (constants.js HANDHELD), and
   the handheld is EXACTLY zero within 0.018 p of a rest anchor anyway, so
   both protected frames are hard zeros with no jitter at all. The arm window
   is the second, independent guarantee: seams.js does not arm this chapter
   below p 0.32, so neither p = 0 nor p 0.26 is even built into a frame.

   A camera-to-network PROXIMITY factor was tried here first (it is the more
   literal reading of "resolves as you approach") and had to be dropped: the
   portrait field dollies back 1.62x at this rest, so the portrait camera sits
   13.59 world units from the network while the LANDSCAPE hero pose sits at
   12.76 — the portrait chapter is farther away than the frame it has to stay
   dark on, and no single threshold separates them. Normalising by fov does
   not fix it either (37.1 vs 21.1 at the two hero poses, 19.4 at the portrait
   rest). The gaze drop is orientation-invariant by construction, because
   portrait.js re-aims the gaze rather than re-pointing it somewhere else.

   Nothing here is a function of time or progress, which is what makes it
   lawful under D16 where a fade-in would not be. */
const GAZE_HI = -0.0209;   // sin(-1.2 deg) — above this: nothing has resolved
const GAZE_LO = -0.1253;   // sin(-7.2 deg) — at/below this: fully resolved

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
    uAmount: { value: 0 },      // arm x camera-pure resolve — the ONLY visibility gate
    uLit: { value: 0 },         // travelling light front, 0..1, pure in p
    uHead: { value: 0 },        // brightness of the arriving head while it travels
    // The quiet, un-highlighted state of a path before the light reaches it.
    // 0.22 was measured against the hero's own ground web at the rest pose
    // (organism.js §8 web/moss lines): the routes read as the same ambient
    // mycelium, one family, just organised — not as three dark highways.
    uQuiet: { value: 0.22 },
    // ...and unlit, the primary/secondary/hairline contrast collapses most of
    // the way toward a common value, so a quiet path is web, not a highway.
    uQuietTier: { value: 0.55 },
    uRouteAmp: { value: new THREE.Vector3(1, 1, 1) },
    uHairAmp: { value: 1 },
    uPulseHead: { value: new THREE.Vector3(-2, -2, -2) },
    uPulseAmp: { value: new THREE.Vector3(0, 0, 0) },
    uExit: { value: 0 },
    // The copy brightness well (doc §3): the calm dark zone under the headline
    // is made IN-WORLD — the network is quiet where the copy block projects at
    // the rest pose. xy = world-xz centre, z = strength, w = radius.
    //
    // RETIRED TO STRENGTH 0 (2026-08-05, with the eye lift). Raising the gaze
    // 7 deg walked the horizon down the frame (1440x900: y 241 -> 338) and the
    // copy block with its scrim now sits ENTIRELY above it: re-unprojecting the
    // rect at the new rest pose, its bottom rows meet the ground 55-74 world
    // units out and the scrim's bottom edge at 42 — an order of magnitude past
    // the farthest strand. There is no longer any network under the copy to
    // quiet. Leaving the old well where it was would have been actively wrong:
    // (3.60, -12.20) now projects to (1012, 457) with its 5.4-unit radius
    // spanning x 794..1336, y 430..502 — a dark hole punched through the middle
    // of the open ground this chapter exists to show, which is the exact
    // failure the 2026-08-04 recompute fixed. Centre/radius are kept at the
    // copy's measured ground footprint so the machinery stays wired and honest;
    // only the strength is zero.
    uWell: { value: new THREE.Vector4(0.74, -37.68, 0.0, 5.40) },
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
  // ADOS's per-orientation anchor RETIRED with the top-left/top-right restage
  // (2026-08-04): the portrait pose now clears the copy block off the whole
  // organism, so the ADOS hub itself is in-frame with room for its pill in
  // both orientations. nodeWorld('ados') is therefore the hub in every
  // orientation again — which is also what the lens focal handoff wants.
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
  let lit = 0, head = 0;                  // written by drive(p) — pure in p
  let resolve = 0;                        // written per frame from the camera
  const hubIgnite = [0, 0, 0];
  const _fwd = new THREE.Vector3();

  /** The camera-pure resolve. Pure function of the live camera pose — see the
   *  block at the top of this file for the measured values that make it
   *  exactly zero on the protected frames. */
  function resolveNow() {
    sceneApi.camera.getWorldDirection(_fwd);
    return sm(GAZE_HI, GAZE_LO, _fwd.y);
  }

  sceneApi.addAnimator('journey-connect', (t, dt) => {
    const k = Math.min(1, dt * 3.0);
    amount += (amountTarget - amount) * k;
    if (amount < 0.004 && amountTarget === 0) amount = 0;
    resolve = amount > 0 ? resolveNow() : 0;
    // Not drawn at all until the camera has resolved something. This is what
    // makes carrying the network outside the old arm window free (the whole
    // Inspire leg costs zero draws) AND what keeps the protected frames
    // byte-identical: at the hero pose the network is not merely dark, it is
    // never submitted.
    group.visible = amount > 0.003 && resolve > 0.0004;
    if (!group.visible) {
      if (heroDimActive) restoreHeroDim();   // byte-exact hand-back
      return;
    }

    // undercoat dim rides the resolve (camera-pure) and deepens as the light
    // lands — so the two webs never sum to double-exposure mush — and hands
    // the hero's own materials back byte-exactly on retire
    collectHeroWeb();
    applyHeroDim(amount * resolve * (0.30 + 0.70 * sm(0.2, 0.8, lit)));

    U.uTime.value = t;
    U.uAmount.value = amount * resolve;
    U.uLit.value = lit;
    U.uHead.value = head;

    /* ---- eased hover amounts ---- */
    const ke = Math.min(1, dt * 5);
    for (const id of NODE_IDS) amt[id] += ((hot[id] ? 1 : 0) - amt[id]) * ke;

    /* ---- ambient pulses: every 9–14 s per route, gated on extent > 0.9 ---- */
    for (const P of pulses) {
      P.driver.update(dt);
      if (lit > 0.9) {
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
    U.uExit.value = sm(5.0, 2.4, camRad) * amount * resolve;

    /* ---- particle field: sparse slow drift, gated on full extent ---- */
    U.uPartAmp.value = sm(0.9, 1.0, lit);
    net.updateParticles(t);

    /* ---- hub cores: they KINDLE as the light reaches them (the strands,
       spokes and knot are already there quietly; the core glow is the
       arrival) + hover + pulse flare ---- */
    for (let i = 0; i < net.hubMeta.length; i++) {
      const hm = net.hubMeta[i];
      hubIgnite[i] = sm(hm.along - 0.05, hm.along + 0.015, lit * 1.06);
      const core = net.cores[i];
      const a = amt[hm.id], flare = pulses[i].flare;
      // Resting identity raised (audit taste pass, 2026-08-04): each hub must
      // read as an unmistakable destination-beacon AT REST, not only on
      // pulse/hover — 0.58 resting, cap lifted to 1.0 so the hover (+0.4)
      // and arrival-flare (+0.45) headroom still register above it.
      core.mat.opacity = amount * resolve * hubIgnite[i] * Math.min(1.0, 0.58 + 0.4 * a + 0.45 * flare);
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
    /** T2 streaming seam (a pure p-window in seams.js).
     *
     *  ARMING SNAPS, RETIRING EASES. The low edge of the window sits far
     *  outside the camera-pure resolve (seams.js: arm at p 0.32, resolve is
     *  still exactly 0 until p ~0.372), so jumping `amount` straight to 1
     *  there is invisible BY CONSTRUCTION — and it removes the one way a
     *  time-based fade could ever have been seen: a hard fling across the arm
     *  edge used to leave the eased amount still climbing while the paths
     *  came into view. Retiring keeps the ease, because that edge (p 0.705)
     *  is covered by the Owned soil-crossing murk, not by a zero. */
    setArmed(on) {
      if (on && amountTarget === 0) amount = 1;
      amountTarget = on ? 1 : 0;
    },
    get armed() { return amountTarget > 0; },
    setHot(id, on) {
      if (!(id in hot)) return;
      hot[id] = !!on;
    },
    nodeWorld(id) {
      const n = NODES[id];
      return n ? _nw.copy(n).clone() : null;
    },
    /** The travelling light — pure in p, so scrubs reverse exactly.
     *  Forward: light leaves the stipe base and runs out along paths that are
     *  already there, kindling each hub as it lands. Reverse: it withdraws
     *  into the base and the routes go quiet again — they do not vanish.
     *  Past the leg (the p-window holds to owned.start + 0.105) the network
     *  stays fully lit; retire happens behind the Owned soil-crossing murk
     *  exactly as shipped (M5 values). */
    drive(p) {
      const legT = (p - SPAN_LO) / (SPAN_HI - SPAN_LO);
      lit = sm(GROW_LO, GROW_HI, legT);
      // the arriving head glows only while the light is actually travelling
      head = lit > 0 && lit < 1 ? Math.sin(Math.PI * Math.min(Math.max(lit, 0), 1)) ** 0.6 : 0;
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
