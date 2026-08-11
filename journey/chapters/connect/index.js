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
//   lit      PURE IN p (drive(p)): the light. THREE fronts now, one per route
//            (2026-08-06), running base -> hub -> off-stage in sequence —
//            Hivemind, then Discord, then ADOS (2026-08-11) — each lifting its
//            own strands from their quiet level to their full one and kindling
//            its own hub core as it lands. See THE ARRIVAL SCHEDULE below.
//
// THE D16 LAW IS KEPT, and kept the same way: nothing fades in over open
// view. `resolve` is EXACTLY 0 at the hero pose and at the Inspire rest in
// both orientations (see the measured table below), so the whole group is
// not merely dark but not drawn at the protected frames, and both arm edges
// sit where resolve is 0.
import * as THREE from 'three';
import { makeRng } from '../../anatomy.js';
import { startOf, endOf } from '../../route.js';
import { buildTendrils, HUB_IDS, FRONT_SOFT } from './tendrils.js';

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

/* ================================================================
   THE ARRIVAL SCHEDULE — one route at a time (2026-08-06)
   ================================================================
   Hannah: "the way the three points light up — could you make them happen ONE
   AT A TIME and A LOT SLOWER? It should feel like there are trails that kind
   of light up ... right now it feels like a rush. It should feel like an
   ecosystem growing."

   The old window was ONE front over leg-t 0.24..0.487 (p 0.4328..0.4871) run
   against the GLOBAL along axis, so all three routes departed the base on the
   same frame and the three hubs kindled 0.0181 p apart — the whole ecosystem
   in a twelfth of a section. It read as a switch because it WAS one switch.

   Now each route owns a front (tendrils.js, uLit/uHead/uLitMax are vec3) and
   the three windows are laid end to end with a deliberate overlap:

     ORDER: ADOS -> Hivemind -> Discord. Nearest, mid, far — light growing
     outward from the base, which is also the chapter's narrative order, the
     tab order and the chip order (NODE_IDS), so the sequence the eye learns
     here is the sequence every other affordance already uses. On screen it
     also sweeps the frame lower-left -> mid -> far-right, so the staging
     reads as one continuous outward motion rather than three unrelated
     flashes. (Far-to-near was tried on screen and reads backwards: the light
     arrives at the edge of the world and works IN toward the mushroom, which
     is drainage, not growth.)
       SUPERSEDED 2026-08-11 — see ADOS LAST below. Hannah reported ADOS
       arriving first as "comes in right away"; the order is now Hivemind ->
       Discord -> ADOS. The DURATION and OVERLAP laws in the two paragraphs
       under this one are unchanged and still govern; only the sequence did.

     DURATION: proportional to each front's own reach (tendrils.js measures
     it), so the light travels at ONE SPEED across the whole network instead
     of each route getting an equal slice and the long one whipping. Discord
     therefore gets the longest window, which is right — it is the far door.

     OVERLAP: 0.30 of a window. Enough that the next route departs the base
     while the previous one is still running out past its hub, so the network
     is never dead between beats; small enough that each route still lands its
     own hub in clear air. At 0 it stutters into three separate events; past
     ~0.45 the three merge back into the rush this change exists to remove.

   START: leg-t 0.0909 (p 0.4000), not 0.24. Making the arrival slower means
   starting EARLIER, because the far end is pinned — the rest frame at p 0.490
   is the section's reference still and must be FULLY lit, so everything has to
   be home by 0.487. p 0.400 is 0.0285 after the quiet paths first draw at all
   (measured: group.visible flips at p 0.365, camera-pure resolve 0.019) and
   0.035 after they are unambiguously a web, so the eye has read the network as
   PRE-EXISTING before one strand of it is lit. The resolve is 0.455 there and
   still climbing, which is the one thing worth being careful about: a strand
   the light reaches at p 0.400 comes up to 0.455 of full and then keeps
   brightening as the resolve completes. Checked on screen at 1440x900 across
   p 0.400/0.409/0.418 — it reads as light landing on a dim ground, never as
   geometry arriving, because the geometry is demonstrably already drawn in the
   frame before it. Total arrival: 0.0871 p, up from 0.0543.

   A LOT MORE GRADUAL (2026-08-07, Hannah's THIRD report on this timing: "make
   the Connect the ecosystem entry animation thing run a lot slower — meaning
   the way the ground lights up, that should happen a lot more gradually").

   The previous pass (4146288) was measured live and confirmed shipped, and she
   is asking again on that build, so the shipped pace is simply still too fast.
   Two budgets were opened, and they are very different sizes:

   1. THE SCHEDULE. Nearly pinned, and it is worth stating exactly by what.
      The far end cannot move: p 0.490 is the section's frozen reference still
      and must be FULLY lit, so the last tip still has to saturate by leg-t
      0.487. So the only budget is at the front, and the front is bounded by
      the CAMERA-PURE RESOLVE — the network is not drawn at all until the
      camera's gaze has dropped enough to resolve it, which on the current
      build is p 0.3500 (it was p 0.3256 before 93723f0 raised the Inspire
      aim; that commit is what made this budget small). The light may not start
      before the eye has read the web as PRE-EXISTING, and the restage set that
      lead at 0.035 of p. 0.3500 + 0.035 = 0.3850, and that is exactly where
      the light now leaves the base — the true earliest start, bounded by the
      resolve's own first draw, not by taste. Shot at 1440x900 across
      0.370 / 0.380 / 0.385: the ground is unambiguously a drawn web at all
      three (the hero's own root web is at full brightness there from p 0, and
      Connect's quiet routes are on top of it at 0.26 of resolve by 0.385), and
      the first metres of ADOS's run are over exactly that ground — the
      densest, oldest-drawn part of the frame. Total arrival 0.0862 -> 0.1021
      of p, 1.18x. That is all the schedule has.

   2. THE GRADIENT. This is where the change actually lives, and it has room.
      What "the ground lights up gradually" names is how long a given patch of
      ground takes to come up from quiet to lit, which is FRONT_SOFT against
      the head's speed — not the length of the schedule. FRONT_SOFT 0.11 ->
      0.32 (tendrils.js) takes a strand's own lift from 0.0040 to 0.0110 of p,
      2.75x, and the hub cores swell over the same widened window because the
      kindle is keyed to the same ramp. Combined with the 1.18x schedule, every
      visible rate in the arrival is between 1.2x and 2.8x slower and nothing
      about the staging changed: still one route at a time, still nearest to
      farthest, still pure in p.

   Tried and rejected: raising LIGHT_OVERLAP to buy slower fronts out of a
   fixed budget (it works arithmetically — a bigger overlap packs the three
   windows into less p, so each may be longer — but it does so by making the
   three routes more simultaneous, which is the rush this whole line of work
   exists to remove); and moving GAZE_HI to make the network resolve earlier
   and open the front budget (it eats the margin that keeps the resolve exactly
   0 at the portrait Inspire rest, which is a protected frame — 0.0426 of
   forward.y against a 0.0059 handheld wander, and not for sale).

   A THIRD OF THE SPEED (2026-08-10, Hannah's FIFTH request on this pacing:
   "the way the light from the ground lights up — could you make that work a
   lot slower... maybe a third of the current speed"). The previous pass
   reported the schedule FULLY SPENT, and it was — inside the old route. The
   road comes from route.js this time (both edits authorised, planned as one
   allocation with the Final chapter's — see EXECUTION.md 2026-08-10):

     · the rest stop moves to leg-t 0.65 (stops [0.65]): the SAME approved
       pose at p 0.5230 instead of 0.490, handing the arrival the road the
       dive never needed (the dive keys re-space; camera.js);
     · scrollVh 4.5 -> 10.0: 2.22x wall-clock per unit p at any scroll speed;
     · the leg itself is the new one-movement approach gesture (camera.js),
       whose gaze bow hands the camera-pure resolve its first draw at
       p 0.351 landscape / 0.336 portrait (measured, 321-sample trace).

   The window bounds re-derive by the SAME laws as before, against the new
   leg: first draw p 0.3510 + the restage's 0.035 pre-existence lead =
   p 0.3860 -> LIGHT_LO leg-t 0.0273; the rest at p 0.5230 keeps the same
   0.0029-p fully-lit margin -> LIGHT_HI leg-t 0.637 (p 0.5201). Total
   arrival 0.1021 -> 0.1341 of p (1.31x), times 2.22x scroll = 2.92x
   wall-clock — and every per-patch and per-hub rate rides the same stretch
   (the fronts' head speed in along-units per p falls 1.31x, so FRONT_SOFT's
   quiet->lit lift and the kindle swell widen with it). Measured at a
   deliberate 600 px/s: whole arrival 3.3 s -> ~9.6 s, a patch's own lift
   0.36 s -> ~1.05 s. FRONT_SOFT, EASE_MIX, LIGHT_OVERLAP and the staging
   are untouched — this is a re-time, not a re-choreography. */
const LIGHT_LO = 0.0273;   // leg-t — p 0.3860, the first route's light leaves the base
const LIGHT_HI = 0.637;    // leg-t — p 0.5201, the last route's farthest tip saturates
const LIGHT_OVERLAP = 0.30;

/* ADOS LAST (2026-08-11, Hannah: "the ADOS item and line seems to come in
   right away, but it should be sequenced after the other two — talking about
   the light line and dot").

   ORDER: HIVEMIND -> DISCORD -> ADOS. Route indices, not ids, because
   everything downstream of LIT_WIN is indexed by route.

   Why THIS order and not the other one that ends on ADOS. Discord ->
   Hivemind -> ADOS is monotonically far-to-near, and this chapter already
   owns that gesture and means something else by it: `uExit` converges the
   network's light back INTO the root as the camera walks to the trunk on the
   Connect->Owned dive, which is drainage. A monotone inward arrival is that
   gesture played forwards and the two would blur across the dive. Hivemind ->
   Discord -> ADOS is not monotone in either direction, so it cannot be
   confused with the exit — it opens OUTWARD from mid-frame to the far door
   and then lands home on the near one. Every front still departs the stipe
   base and runs outward along its own route; only which hub is next changed.

   Why it reads. The chapter is Connect the community: the wider community
   lights first (Hivemind mid-frame, then Discord at the far right), and the
   last thing the light reaches is ADOS — the event itself, nearest the eye
   and the largest of the three on screen (rest pose, 1440x900: Hivemind
   (887, 585) -> Discord (1209, 711) -> ADOS (262, 788)). The finale is the
   node the chapter is actually about, and it lands where the eye ends up.

   THE SCHEDULE IS NOT REBALANCED, and that is a measured decision rather
   than a default. The order is the only edit: DURATION is still proportional
   to each front's own reach (one head speed everywhere), OVERLAP is still
   0.30, LIGHT_LO/LIGHT_HI are untouched. Because the last window's reach
   enters the normaliser undiscounted and ADOS's is the smallest of the
   three, putting it last makes k slightly LARGER, so all three windows come
   out a shade longer than they were shipped (Hivemind 0.0555 -> 0.0566,
   Discord 0.0627 -> 0.0654, ADOS 0.0509 -> 0.0523 of p), and the arrival as
   a whole is the same length it was BY CONSTRUCTION — LIGHT_LO and LIGHT_HI
   did not move, so the arrival still runs p 0.3860 -> 0.5203, 10.4 s at a
   deliberate 600 px/s on the surface spline, and only its interior
   re-sequenced. Nothing
   in this chapter got faster, which after five rounds of "slower" is the
   property worth protecting above every other consideration here.

   THE SHORT ROUTE IS PAID FOR BY THE MOVE ITSELF, which is why no weight is
   needed. ADOS's hub sits at 0.42 of a 0.75-unit reach — 56% of its own run
   — against Discord's 0.70 of 1.00 (71%), so at equal head speed its front
   reaches its hub proportionally sooner, and in p its approach (depart ->
   dot full) is indeed the shortest of the three: 0.0207 against Discord's
   0.0353. But p is not what a visitor feels; scroll px are. The Connect
   leg's PCHIP allocation is not uniform, and the finale slot sits in a
   COSTLIER stretch of it, so measured on the surface spline at a deliberate
   600 px/s the same 0.0207 is 1.80 s — against Hivemind's 1.65 s and
   Discord's 2.92 s, i.e. the middle of the three, and 1.45x longer than
   ADOS's own approach was as the shipped opener (1.24 s). Moving ADOS last
   BOUGHT it the reading time; it did not cost it any.

   A FINALE WEIGHT WAS STILL BUILT AND MEASURED, then rejected. It evens the
   hub rhythm (gaps 0.0456 / 0.0321 in p at weight 1.00; 0.0409 / 0.0331 at
   1.30; 0.0377 / 0.0338 at 1.55) but it can only lengthen the finale by
   taking p from the other two, and at 1.55 Hivemind's window falls 17% and
   Discord's 15% BELOW their shipped lengths — two of three routes made
   materially faster to buy a rhythm nicety on the third, in the one part of
   this site with a five-request history of "slower". Rejected on that
   alone, and the rhythm did not need it: in wall-clock the gaps are 3.55 s
   and 2.82 s against the shipped 3.11 s and 3.93 s — the same 1.26 ratio,
   closing in rather than opening out. The shipped arrival widened toward
   the far door; this one tightens toward home. Both are cadences; only one
   of them ends on the node the chapter is about.

   The finale's other gain is free: its run-out plays NEAR THE CAMERA. Every
   window ends with the front running past its hub into the continuations,
   and the last route's tail is the only one no following route covers —
   2.41 s here against Discord's 2.16 s as the shipped finale, so barely
   longer. But Discord's tail ran out at the far right, small and distant,
   while ADOS's runs out bottom-left across the nearest, largest ground in
   the frame. The arrival now ENDS on its most legible motion. And the gap
   between the last two dots is not empty: ADOS's own front departs the base
   0.0153 p after Discord's dot lands, so the arrival's six beats (depart/dot
   x 3) fall at p 0.3860, 0.4071, 0.4231, 0.4527, 0.4680, 0.4848 — far more
   even than the hub-only reading suggests.

   THE KINDLE FLOOR is kept exactly as c77fb00 set it and was re-checked in
   this slot, since it exists for ADOS specifically. It still binds only on
   ADOS (along*0.5 = 0.21 against along - FRONT_SOFT = 0.10) and it still
   does the thing it was added to do: ADOS's core reads exactly zero for the
   first 24% of its window — 0.0126 of p, ~1.0 s at a deliberate scroll —
   so the light is unambiguously travelling before the dot exists, and the
   dot then swells to full over the following 0.0081 p as the front lands.
   Verified on screen at 1440x900 (p 0.472 front running, no dot; p 0.482
   core 0.12; p 0.490 core 0.58).

   THE CHIPS DO NOT FOLLOW. NODE_IDS stays [ados, hivemind, discord], which
   is the chip stagger order, the roving tab order and the deep-link order.
   They are a different medium answering a different question: the chips are
   the RESTING composition's labels, gated on the copy (they arrive p 0.516 ->
   0.523, after the light is home) and staggered 150 ms apart, so all three
   are up inside 300 ms — a garnish, not a competing sequence. Their order is
   importance (ADOS is the event this page exists for, and it must lead the
   tab order); the light's order is geography and cadence. Read together they
   hand off rather than contradict: the last hub the light reaches is the
   first one the page names. */
const LIGHT_ORDER = [1, 2, 0];       // hivemind, discord, ados

/* THE FRONT'S OWN PACE INSIDE ITS WINDOW (2026-08-07, with the above).
   Each front ran on a plain smoothstep, whose speed peaks at 1.5x its own
   average halfway through and falls to zero at both ends. Laid end to end with
   a 0.30 overlap that gives the arrival a crawl-rush-crawl pulse: the slowest
   moments are the handovers (one window's dying tail against the next one's
   waking head) and the fastest is the middle of a run — which is exactly where
   the hub kindles and where the eye is. Averaging it out is free (it costs no
   p at all) and it is the honest reading of "gradually": the light should move
   at ONE pace, not sprint through the part you are watching.

   f(t) = (1 - B)*t + B*smoothstep(t) — a linear ramp with the smoothstep
   blended in for its eased ends. At B = 0.55 the peak drops 1.500x -> 1.275x
   of the mean and the ends leave/land at 0.45x rather than 0. Zero terminal
   velocity is not worth protecting here: at t = 0 the head sits at along 0
   where the trailing ramp has not lifted anything yet, and at t = 1 it is
   already past the farthest tip, so both ends are doing their work through
   FRONT_SOFT, not through the head's speed. Fully linear (B = 0) was tried and
   is worse — the departure gets a visible edge to it. */
const EASE_MIX = 0.55;
// CLAMPS FIRST. smooth01 clamps its own input; the linear term does not, and
// an unclamped one would drive uLit negative before the window and past 1
// after it — which in the shader is a head running backwards down the route
// before it departs, and a rest frame lit past saturation.
const frontEase = (x) => {
  x = x < 0 ? 0 : x > 1 ? 1 : x;
  return (1 - EASE_MIX) * x + EASE_MIX * smooth01(x);
};

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
    // ONE FRONT PER ROUTE (2026-08-06): x ADOS, y Hivemind, z Discord. Each is
    // 0..1 and pure in p, so reverse scrubs still mirror exactly and a pause
    // mid-arrival holds a coherent partial network.
    uLit: { value: new THREE.Vector3(0, 0, 0) },
    uHead: { value: new THREE.Vector3(0, 0, 0) },   // arriving head, per route
    // filled by buildTendrils from the measured reach of each route
    uLitMax: { value: new THREE.Vector3(1, 1, 1) },
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

  /* ---- lay the three windows end to end in LIGHT_ORDER (see THE ARRIVAL
     SCHEDULE above). Durations are proportional to each front's measured
     reach, so the light runs at one speed; each window starts (1 - overlap)
     of the way through the previous one; the last one ends exactly on
     LIGHT_HI. Indexed BY ROUTE on the way out (drive(p) reads
     LIT_WIN[route]), so nothing downstream needs to know the order.
     Build-time constant and pure in p. ---- */
  const LIT_WIN = (() => {
    const reach = [U.uLitMax.value.x, U.uLitMax.value.y, U.uLitMax.value.z];
    const w = LIGHT_ORDER.map(r => reach[r]);
    const k = (LIGHT_HI - LIGHT_LO) /
      ((1 - LIGHT_OVERLAP) * (w[0] + w[1]) + w[2]);
    const out = [null, null, null];
    let s = LIGHT_LO;
    for (let n = 0; n < 3; n++) {
      const d = k * w[n];
      out[LIGHT_ORDER[n]] = [s, s + d];
      s += (1 - LIGHT_OVERLAP) * d;
    }
    return out;
  })();

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
  // written by drive(p) — pure in p. litR/headR are per route; litMin is "the
  // slowest route" (the honest test for FULLY ARRIVED, which gates the
  // particles and the ambient pulses) and litAvg is the network's overall
  // arrival, which the hero-web dim rides.
  const litR = [0, 0, 0], headR = [0, 0, 0];
  let litMin = 0, litAvg = 0;
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
    applyHeroDim(amount * resolve * (0.30 + 0.70 * sm(0.2, 0.8, litAvg)));

    U.uTime.value = t;
    U.uAmount.value = amount * resolve;
    U.uLit.value.set(litR[0], litR[1], litR[2]);
    U.uHead.value.set(headR[0], headR[1], headR[2]);

    /* ---- eased hover amounts ---- */
    const ke = Math.min(1, dt * 5);
    for (const id of NODE_IDS) amt[id] += ((hot[id] ? 1 : 0) - amt[id]) * ke;

    /* ---- ambient pulses: every 9–14 s per route, gated on extent > 0.9 ---- */
    for (const P of pulses) {
      P.driver.update(dt);
      if (litMin > 0.9) {
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
      // The ambient pulse used to land as a FLARE on the hub core (+0.45
      // opacity, +0.22 scale, ~2 s decay). HELD STILL (2026-08-11, Hannah:
      // the dots "pulse ... but they should stay STABLE"): the marker no
      // longer answers — the travelling light on the strand is the life,
      // measured 16-27% of brightness swing ON THE DOT before this change
      // and the camera-only floor after. The pulse itself is untouched:
      // it still runs the route (uPulseHead/uPulseAmp below), so the
      // network breathes while its destinations hold.
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
    U.uPartAmp.value = sm(0.9, 1.0, litMin);
    net.updateParticles(t);

    /* ---- hub cores: they KINDLE as the light reaches them (the strands,
       spokes and knot are already there quietly; the core glow is the
       arrival) + hover ---- */
    for (let i = 0; i < net.hubMeta.length; i++) {
      const hm = net.hubMeta[i];
      // THE KINDLE LANDS WITH ITS OWN TRAIL. `litR[route] * uLitMax[route]` IS
      // the head's position on the global along axis (the same expression the
      // strand shader uses), so the core comes up exactly as its own route's
      // light reaches the hub — never on a neighbour's front, never on a clock.
      // The window is the front's own ramp width, so the core swells over the
      // same distance the trail takes to lift.
      // THE KINDLE CARRIES A FLOOR (2026-08-07, with FRONT_SOFT 0.11 -> 0.32).
      // The kindle window IS the front's own ramp width, which is what makes
      // the core swell over exactly the distance its trail takes to lift — but
      // ADOS's hub sits only 0.42 along-units from the base, so once the ramp
      // is wider than about that, `hm.along - FRONT_SOFT` goes negative and the
      // nearest core would already be kindling on the frame its front departs:
      // a hub lit before its light left, which is the one thing this whole
      // staging exists to prevent. The floor keeps the kindle inside the second
      // half of the run on every route however wide the ramp gets, and it is
      // INERT at any ramp narrow enough not to need it (at 0.32 it binds only
      // on ADOS, by 0.076 of along; Hivemind and Discord are far enough out
      // that the ramp alone still starts them late).
      const headAt = litR[hm.route] * U.uLitMax.value.getComponent(hm.route);
      hubIgnite[i] = sm(Math.max(hm.along * 0.5, hm.along - FRONT_SOFT),
                        hm.along + 0.03, headAt);
      const core = net.cores[i];
      const a = amt[hm.id];
      // Resting identity raised (audit taste pass, 2026-08-04): each hub must
      // read as an unmistakable destination-beacon AT REST, not only on
      // hover — 0.58 resting, cap lifted to 1.0 so the hover (+0.4) headroom
      // still registers above it. The arrival flare left this line
      // 2026-08-11 (held still — see the pulse loop above): hover is the
      // visitor's own hand and stays; the ambient clock no longer moves
      // the marker.
      core.mat.opacity = amount * resolve * hubIgnite[i] * Math.min(1.0, 0.58 + 0.4 * a);
      core.sprite.scale.setScalar(core.baseScale * (1 + 0.18 * a));
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
     *  already there, ONE ROUTE AT A TIME (Hivemind, then Discord, then ADOS,
     *  windows overlapping by 0.30), kindling each hub as its own trail lands.
     *  Reverse: each front withdraws into the base in the opposite order and
     *  the routes go quiet again — they do not vanish. Nothing here reads a
     *  clock or any state, so pausing mid-arrival holds a coherent partial
     *  network and scrubbing back retraces it exactly.
     *  Past the leg (the p-window holds to owned.start + 0.105) the network
     *  stays fully lit; retire happens behind the Owned soil-crossing murk
     *  exactly as shipped (M5 values). */
    drive(p) {
      const legT = (p - SPAN_LO) / (SPAN_HI - SPAN_LO);
      litMin = 1; litAvg = 0;
      for (let i = 0; i < 3; i++) {
        // frontEase, not smoothstep: one pace across the run (see EASE_MIX).
        const L = frontEase((legT - LIT_WIN[i][0]) / (LIT_WIN[i][1] - LIT_WIN[i][0]));
        litR[i] = L;
        // The arriving head glows only while THIS route's light is travelling.
        // HEAD_PEAK 1.0 -> 0.55 with the re-time: the head is multiplied into
        // uColHot (near-white) at 1.4x in the shader, which on the old fast
        // front was a flicker you registered as speed and on a front running
        // at half that speed became a cold white streak swiping across the
        // ground — the loudest thing in the frame, and the opposite of the
        // "elegant" this change is for. At 0.55 it is a warm brightening that
        // says where the light is now, and the trailing SOFT ramp does the
        // work of reading as a trail.
        headR[i] = L > 0 && L < 1 ? 0.55 * Math.sin(Math.PI * L) ** 0.6 : 0;
        if (L < litMin) litMin = L;
        litAvg += L / 3;
      }
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
