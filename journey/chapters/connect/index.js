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
//   lit      CONDUCTED IN p, PERFORMED IN SECONDS (drive(p) + the pace floor;
//            see THE ARRIVAL IS PERFORMED at LIGHT_PACE_RATE). THREE fronts,
//            one per route (2026-08-06), running base -> hub -> off-stage in
//            sequence — Hivemind, then Discord, then ADOS (2026-08-11) — each
//            lifting its own strands from their quiet level to their full one
//            and kindling its own hub core as it lands. The SCHEDULE — where
//            each front stands for a given p — is still pure in p, and the
//            displayed fronts may only LAG it (a floor in seconds when the
//            visitor outruns the show), never lead it. Reverse follows p
//            exactly and dt = 0 snaps, so scrubs stay honest and frozen
//            frames stay bit-identical. See THE ARRIVAL SCHEDULE below.
//
// THE D16 LAW IS KEPT, and kept the same way: nothing fades in over open
// view. `resolve` is EXACTLY 0 at the hero pose and at the Inspire rest in
// both orientations (see the measured table below), so the whole group is
// not merely dark but not drawn at the protected frames, and both arm edges
// sit where resolve is 0.
import * as THREE from 'three';
import { makeRng } from '../../anatomy.js';
import { startOf, endOf, restProgress } from '../../route.js';
import { buildTendrils, HUB_IDS, FRONT_SOFT } from './tendrils.js';
import { registerGeometry, registerPayload, bakeDumpDone } from '../../lib/baked.js';
import { createHeroGroundDimClaim } from '../hero-ground-dim.js';
import { applyPortrait } from '../../portrait.js';
import { CAMERA as CONNECT_CAMERA } from './camera.js';
import { createOwner } from '../../ui/owner.js';
import { PARKED } from '../../journey-owner.js';
import { railDock } from '../../layout/rail-geometry.js';
/* FROM THE DOMAIN MODULE, NOT THE FACADE (the DEFECT-01 #3 rule): the chosen
   beat tempo (`grand`, 2026-08-24) paces this chapter's whole arrival —
   see THE ARRIVAL IS PERFORMED at LIGHT_PACE_RATE. */
import { HOTSPOT_ARRIVAL } from '../../constants/copy.js';

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
   are untouched — this is a re-time, not a re-choreography.

   EQUIP RE-DERIVES THE FRONT BOUND, AND PAYS FOR IT IN ROAD (2026-08-30).
   Every law above holds; ONE of its inputs moved. The leg into this chapter no
   longer departs the Inspire rest — journey/chapters/equip/ stands between the
   two, and its rest is an UPWARD-LOOKING pose beneath the cap. The camera-pure
   resolve is `forward.y` and nothing else, so the whole leg is now that
   quantity unwinding from +0.363 instead of from +0.050, and the network's
   first draw slides with it: p 0.3510 -> p 0.4310, measured on a 43-sample
   scrub of the built gesture at 1440x900.
   
   THE LEAD IS PRESERVED IN THE UNIT IT IS FOR, WHICH IS NOT p. What the
   pre-existence lead buys is a stretch of SCROLLING in which the visitor reads
   the web as already there before one strand of it is lit; 0.035 of p was the
   figure because, at the road this segment then owned, 0.035 of p WAS that
   stretch — 8.00 vh over 0.143 of p is 55.9 vh/p, so the lead was 1.96 vh.
   Copying 0.035 onto a leg whose road has changed would have been the exact
   error CONTRIBUTING.md §5 names: a beat priced in a coordinate whose exchange
   rate to the thing it buys nothing declares. So:
   
     · route.js gives this segment 13.00 vh instead of 8.00 (90.9 vh/p), which
       is what keeps the light TRAVEL long after the front bound moved;
     · the lead is re-derived at that density: 1.96 vh / 90.9 vh/p = 0.0216 of
       p, so LIGHT_LO = 0.4310 + 0.0216 = 0.4526 -> leg-t 0.33.
   
   LIGHT_HI DOES NOT MOVE, in leg-t or in p: the rest is where it was, the
   0.0029-p fully-lit margin is where it was, and the frozen reference still is
   the frozen reference still.
   
   WHAT IT COSTS, stated rather than absorbed. The arrival's own window falls
   0.1341 -> 0.0675 of p. At 13.00 vh that is 6.14 vh of road under the light
   against the 7.50 vh it had, i.e. 82% — the light travel is 18% shorter in
   scrolling than the eighth pass left it, and no amount of road inside THIS
   segment can recover the rest without turning the page into a corridor
   (a full restoration wants 16.7 vh here and a 55 vh page). The two things
   that did NOT move are the two the six "slower" requests were actually
   about: the pre-existence lead in the unit it is spent, and the gradient —
   FRONT_SOFT, EASE_MIX, LIGHT_OVERLAP, the staging and the order are all
   untouched, so a given patch of ground still takes the same time to come up
   from quiet to lit at any fixed scroll speed. What is shorter is the number
   of patches the schedule crosses per unit of road, and that is the honest
   price of putting a chapter in this leg. */
const LIGHT_LO = 0.33;     // leg-t — p 0.4526, the first route's light leaves the base
const LIGHT_HI = 0.637;    // leg-t — p 0.5201, the last route's farthest tip saturates
/* 0.30 -> 0.22 (2026-08-14, Hannah's sixth report: "one at a time elegantly").
   She has now asked for "one at a time" twice, three passes apart, so the 0.30
   the 2026-08-06 pass chose is simply too generous: at 0.30 the next route
   departs the base while the previous one is still a third of the way from its
   hub, and with all three fronts overlapping that much the eye reads the ground
   as generally busy rather than as three deliberate events. 0.22 keeps the
   property that overlap exists for — the network is never dead between beats,
   which is what stops it stuttering into three separate switches at 0 — while
   giving each route clear air around its own hub landing. The cost is arithmetic
   and tiny: the three windows share a slightly larger normaliser, so each comes
   out 6.3% shorter in p. Against the 3.2x of road this pass buys, that is
   nothing, and it is spent on separation, which is what was asked for. */
const LIGHT_OVERLAP = 0.22;

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
   first one the page names.

   ...AND THE CHIPS NOW DO FOLLOW — the ARRIVAL half of them (2026-08-16,
   Hannah's seventh pass on this arrival: "the labels should show up as soon
   as each light line progresses"). The paragraph above kept the chips out of
   the light's sequence to protect the copy-anchored resting composition, and
   what that bought was measured on screen as the complaint: the whole band
   plays with three anonymous hubs, then the copy re-anchors at p 0.516 and
   all three names pop inside 300 ms — a caption card after the film, not
   labels on the thing happening. So each chip now rides ITS OWN hub's
   ignition (`nodeReveal` below — amount * resolve * hubIgnite, the same
   product the hub core's own opacity rides, so the name can never outrun the
   dot it names). The reveal ORDER therefore becomes the light's order by
   construction, and the ui.js arrival stagger is skipped for these chips —
   the light's cadence, seconds apart, IS the stagger, and 150 ms of queue on
   top of it is noise. Pure in p end to end: scrub back and each label
   withdraws with its own light. NODE_IDS still leads with ADOS — tab order
   and deep-link order are importance, untouched; only WHEN each chip stands
   up moved. The copy keeps exactly one duty here: its band's CLOSE edge
   still takes the chips down into the Owned dive (ui.js), so departure is
   byte-identical to the copy-gated era. */
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
   THE DEPARTURE IS PERFORMED TOO — on machine-owned falls only
   (LIGHT-RETREAT, 2026-08-25)
   ================================================================
   The owner: "When I click from Connect backwards, the lit-up ground
   network disappears really quickly. It should have a min speed that's
   something like the speed that happens when I scroll backwards — for
   disappearing."

   The mechanism, measured (1440x900, evidence light-retreat/): a backward
   nav click parks p at the destination in one tick (only the route-faithful
   Mission<->Inspire flight presents a travelling p; every other jump is a
   parked-state camera blend — journey.js directJumpTo), so the conducted
   leg-t fell below LIGHT_LO in one frame and the instant-fall branch cut
   every front from 1 to 0 on that frame — litSum 3.0 -> 0.0 in a single
   ~45 ms frame, both adjacent (-> Inspire) and far (-> Mission) — while the
   ground itself stayed on screen another ~585 ms (the camera still gazing
   down as the blend departs; the seam disarm and the rising gaze then fade
   the quiet web out). The owner's reference speeds, same rig: a deliberate
   backward hand scrub crosses the light window (p 0.5201 -> 0.3860) in
   1.17 s (0.115 p/s); the machine's own backward commit glide crosses it
   in 0.57 s (0.235 p/s).

   THE LAW, AND WHETHER IT EXTENDS. The arrival principle reads "a named
   beat may arrive later than its scene event, never earlier", and this
   chapter's amendment made the performance govern the drawn object whole.
   Read as written it is about arrival only. The honest generalisation both
   halves already obey is: THE PERFORMANCE MAY ONLY LAG THE CONDUCTED
   POSITION — lag on the rise is arriving later; lag on the fall is leaving
   later; LEADING is impossible in either direction (min on the way up, max
   against the conducted target on the way down). So yes — the law extends
   symmetrically, but the asymmetry the old wording protected is real and
   is KEPT, because it was never between directions: it is between HANDS.
   On a scrub the VISITOR owns p, the reveal is a position, and honesty
   demands the light track their gesture frame-for-frame — the instant fall
   below is that law and it is untouched, byte-identical (max(h.a −
   sceneGate) = 0 is re-proved in the evidence). On a jump the MACHINE owns
   p, there is no gesture for the light to be honest to, and the same
   argument that gave the nav jump its own copy envelope ("a jump snaps
   progress in a single dt = 0 tick, so scroll speed never rises") gives
   the departure its floor: the retreat is timed against the camera actually
   leaving, not against the click.

   THE RATE IS AUTHORED FROM THE OWNER'S OWN REFERENCE, NOT FROM THE BEAT
   TEMPO. LIGHT_PACE_RATE derives from HOTSPOT_ARRIVAL because the arrival
   is the show and the show has one tempo; the scroll-backward speed is a
   property of the scroll model and does not move when the owner re-tastes
   the beat preset, so coupling the retreat to beatGapMs would silently
   detune it from the thing it was asked to match. This also keeps
   LABEL-EXIT's ruling intact (constants/copy.js: "departures do not read
   this table — an arrival is a performance; a departure is a release"):
   the chip layer stays a release under its scene ceiling, exactly as
   ruled; what changes is that on a machine-owned fall the SCENE CEILING
   ITSELF now descends at a floor, and the chips simply ride it — the same
   one-object product as ever, no departure clock added to any marker.
   1.2 s is the measured
   deliberate backward scrub (1.17 s) — the gentler of the two references,
   chosen over the 0.57 s glide because the visitor's own hand is the
   conservative reading of "when I scroll backwards" and this chapter has a
   five-request history of "slower". The floor therefore never disappears
   the network faster than any backward scroll the owner can perform.

   WHAT KEEPS THE LAWS. The floor engages ONLY between setBlending(true)
   and setBlending(false) — the transition controller's own broadcast,
   raised for every non-route-faithful jump (journey.js directJumpTo) and
   lowered on every ending a blend can have (endCamBlend: landed,
   cancelled, wrap-home). A visitor-owned fall is byte-identical to before.
   dt = 0 still snaps unconditionally, so ?p= deep links, ?capture= freezes
   and the goldens are settled by construction; snap() still settles
   placements. beginEntry() now resets the performed position explicitly
   (the nav replay INTO this chapter must open on a reset performance, not
   inherit a floored, still-falling one — entryReveal is 0 there, so the
   reset is invisible by the same argument as the reveal itself). A blend
   CANCELLED by manual input clears the flag and the next tick snaps the
   residue to the visitor's p — the same hard hand-back step every
   cancelled jump on this site already makes (transition/controller.js §15
   residual). A blend that lands before the retreat finishes leaves its
   residue to the same clearing tick, which is invisible by construction:
   the fall only has residue below the arm window, where amount is already
   0 and the protected rests hold resolve at exactly 0. The forward jump
   out of Connect was measured for the mirror fault and does not have it:
   past the leg the conducted target clamps at LIGHT_HI, so a forward click
   never falls at all — its departure is the seam disarm behind the Owned
   murk, exactly as scrolled. */
const LIGHT_RETREAT_WINDOW_S = 1.2;
const LIGHT_RETREAT_RATE = (LIGHT_HI - LIGHT_LO) / LIGHT_RETREAT_WINDOW_S;

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
// Navigation gets its own visible replay. The ordinary scroll reaches the first
// light at about 0.26 camera resolve; using the same floor prevents a jump from
// spending the replay while the travelling camera still cannot show the soil.
const ENTRY_CAMERA_READY = 0.24;
const ENTRY_DURATION_S = 3.2;

export function createConnect(sceneApi) {
  const rnd = makeRng(41417);
  const group = new THREE.Group();
  group.visible = false;
  /* THIS CHAPTER'S DISPOSABLE WORK, AND ITS OWNER (R05, 2026-08-22).
     Everything Connect attaches OUTSIDE its own returned descriptor goes
     through this owner and is drained, LIFO, by `dispose()` at the bottom of
     the descriptor. Today that is two things: the scene-graph parenting on
     the line below, and the 'journey-connect' animator registration.
     `createOwner` runs one `try` per cleanup, so a throw in one does not
     strand the other. Nothing calls `dispose()` in production —
     journey/chapter-registry.js deliberately does not cascade it (C06). */
  const owner = createOwner('chapter:connect');

  // NON-sway parent (doc §3): the network is rooted terrain — it must not
  // sway with the cap. Same parenting rule as the Final field (adr-d3).
  sceneApi.scene.add(group);
  owner.own(() => { sceneApi.scene.remove(group); });

  /* ---- shared uniforms (one write per frame) ---- */
  const U = {
    uTime: { value: 0 },
    uAmount: { value: 0 },      // arm x camera resolve x navigation-entry reveal
    // ONE FRONT PER ROUTE (2026-08-06): x ADOS, y Hivemind, z Discord. Each
    // is 0..1, conducted in p through the pace floor (THE ARRIVAL IS
    // PERFORMED): reverse scrubs still mirror p exactly and a pause
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
    // Screen-space collision is solved into one ground-plane world offset.
    // The strand and point shaders, hub sprite and DOM anchor all read this
    // same vector, so ADOS never splits into a moved label and an old light.
    uAdosShift: { value: new THREE.Vector3() },
    // Filled from buildTendrils' measured route arc. Points use it to apply
    // exactly the primary strand's root-to-hub feather while they drift.
    uAdosHubAlong: { value: 1 },
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
  /* THE FOCAL NODE. Six sites below need to name one particular node of the
     network: the one the lens focuses, the one the copy block and the
     persistent-nav dodge are solved against, and the one this chapter
     publishes as its `focus` capability. Which node that is is declared in
     `content/connect-nodes.js` and carried out on the built network, so the
     six sites ask the network rather than each repeating a string. The
     `Ados`-spelled identifiers around them — `uAdosShift`, `_adosBase`,
     `debugAdosAlignment` — are NAMES, not lookups, and are left alone: the
     shader uniform and the QA surface are called that by their consumers. */
  const FOCAL = net.focalId;
  U.uAdosHubAlong.value = net.hubMeta.find((h) => h.id === FOCAL).along;

  /* ADOS / PERSISTENT-NAV EXCLUSION --------------------------------------
     ADOS is deliberately the nearest lower-left hub, which became the one
     place the new horizontal navigator and the scene could occupy together.
     Solve the requested ~75px left / 50-75px up move in SCREEN space against
     the live rail rectangle, then convert it to an x/z ground-plane offset by
     a local projection Jacobian. This works for every camera aspect and keeps
     the authored route rooted: tendrils.js feathers the shift from zero at
     the stipe to one at the hub. No fixed world vector can make the same
     promise across landscape and portrait cameras.

     The glow radius includes the core bloom and convergence rays; the rail
     rectangle is expanded for its active-ring bloom. The baseline move gives
     the composition the requested air even before the rectangles intersect;
     the exclusion solve adds only as much upward travel as a smaller viewport
     actually needs. */
  // Projection and the DOM use jitter-free vs live matrices respectively;
  // these small source margins paint as the requested ~75px / 50-75px move.
  const ADOS_SCREEN_LEFT = 84;
  const ADOS_SCREEN_UP_MIN = 66;
  const ADOS_SCREEN_UP_MAX = 96;
  const ADOS_GLOW_RADIUS = 38;
  const RAIL_AIR = 14;
  // The settled projection and DOM anchors use slightly different matrix
  // paths; allow their measured 8-12px delta.
  const PROJECTION_AIR = 12;
  const _adosBase = net.hubMeta.find((h) => h.id === FOCAL).pos.clone();
  const _adosPlaced = _adosBase.clone();
  const _adosResolvedShift = new THREE.Vector3();
  const _placementCamera = new THREE.PerspectiveCamera();
  const _placementPose = {
    pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 62,
  };
  const _screen0 = new THREE.Vector3();
  const _screenX = new THREE.Vector3();
  const _screenZ = new THREE.Vector3();
  const _probeX = new THREE.Vector3();
  const _probeZ = new THREE.Vector3();
  const _coreLift = new THREE.Vector3(0, 0.05, 0);
  const PROBE = 0.05;
  /* The revision of the dock snapshot this placement was last solved against.
     0 is "never solved": the owner's revisions start at 1. */
  let placementRevision = 0;

  /** Placement is composition, not arrival choreography. Apply the resolved
   *  vector whole so the ambient ground, Connect routes, core and DOM anchor
   *  share one baked destination before any Connect light becomes visible. */
  function applyAdosPlacement() {
    U.uAdosShift.value.copy(_adosResolvedShift);
    _adosPlaced.copy(_adosBase).add(U.uAdosShift.value);
    const core = net.cores.find((entry) => entry.id === FOCAL);
    if (core) core.sprite.position.copy(_adosPlaced).add(_coreLift);
    sceneApi.setGroundAdosTarget?.(_adosPlaced);
  }

  function toScreen(world, out, camera = _placementCamera) {
    out.copy(world).project(camera);
    out.x = (out.x * 0.5 + 0.5) * innerWidth;
    out.y = (-out.y * 0.5 + 0.5) * innerHeight;
    return out;
  }

  /** Re-solve the ADOS placement, but only when the geometry it is solved
   *  against has actually moved.
   *
   *  `drive()` calls this EVERY FRAME. Before U05 that meant a
   *  getBoundingClientRect() on the page logo every frame, plus this module's
   *  own copy of the rail's responsive dock table to turn it into a rectangle.
   *  Both belonged to one owner and now are: `railDock` measures once per
   *  viewport and publishes a frozen snapshot, and the revision on it is the
   *  exact signal "the dock moved, solve again". This function therefore reads
   *  no DOM and takes no measurement during frame drive.
   *
   *  `force` is a deliberate re-solve. It drops the published dock first and
   *  works from a fresh measurement, and CHAPTER BUILD IS ITS ONLY CALLER —
   *  the one instant the page's chrome may have settled since the last
   *  publication without the viewport having moved. `drive()`, `beginEntry()`,
   *  `driveEntry()` and `snap()` all call this UNFORCED, exactly as they did
   *  before U05, so the revision check is what decides whether they re-solve. */
  function updateAdosExclusion(force = false) {
    if (force) railDock.invalidate();
    const dock = railDock.dock();
    if (!force && dock.revision === placementRevision) return;
    placementRevision = dock.revision;

    // Solve in the authored resting composition, never the travelling live
    // camera. This makes the world destination invariant across forward and
    // reverse scroll while preserving the portrait/tablet composition field.
    const rest = CONNECT_CAMERA.keys[0];
    _placementPose.pos.copy(rest.pos);
    _placementPose.target.copy(rest.tgt);
    _placementPose.fov = rest.fov;
    applyPortrait(_placementPose, restProgress('connect'),
      innerWidth / innerHeight, innerWidth);
    _placementCamera.aspect = innerWidth / innerHeight;
    _placementCamera.fov = _placementPose.fov;
    _placementCamera.position.copy(_placementPose.pos);
    _placementCamera.lookAt(_placementPose.target);
    _placementCamera.updateProjectionMatrix();
    _placementCamera.updateMatrixWorld(true);
    toScreen(_adosBase, _screen0);

    let tx = Math.max(ADOS_GLOW_RADIUS + RAIL_AIR, _screen0.x - ADOS_SCREEN_LEFT);
    let ty = _screen0.y - ADOS_SCREEN_UP_MIN;
    const r = dock.rect;
    const left = r.left - RAIL_AIR, right = r.right + RAIL_AIR;
    const top = r.top - RAIL_AIR;
    const overlapsX = tx + ADOS_GLOW_RADIUS > left && tx - ADOS_GLOW_RADIUS < right;
    if (overlapsX) ty = Math.min(ty, top - ADOS_GLOW_RADIUS - PROJECTION_AIR);
    ty = Math.max(_screen0.y - ADOS_SCREEN_UP_MAX, ty);

    // Local screen Jacobian for world x/z at the hub's ground plane.
    _probeX.copy(_adosBase).x += PROBE;
    _probeZ.copy(_adosBase).z += PROBE;
    toScreen(_probeX, _screenX);
    toScreen(_probeZ, _screenZ);
    const ax = (_screenX.x - _screen0.x) / PROBE;
    const ay = (_screenX.y - _screen0.y) / PROBE;
    const bx = (_screenZ.x - _screen0.x) / PROBE;
    const by = (_screenZ.y - _screen0.y) / PROBE;
    const det = ax * by - bx * ay;
    if (Math.abs(det) < 1e-4) {
      _adosResolvedShift.set(0, 0, 0);
      applyAdosPlacement();
      return;
    }
    const dxPx = tx - _screen0.x, dyPx = ty - _screen0.y;
    _adosResolvedShift.set(
      (dxPx * by - bx * dyPx) / det,
      0,
      (ax * dyPx - dxPx * ay) / det,
    );
    applyAdosPlacement();
  }

  /* ---- bake recording site (2026-08-17) -------------------------------
     Connect is baked ATOMICALLY. buildTendrils is the chapter's single
     geometry producer and its output is final the instant it returns — there
     is no cross-module post-pass (Owned needed substrate.assignOwners to
     finalise aOwner; Connect has no analogue). Under ?bakedump=1 each
     registerGeometry copies the live-built attributes into window.__bake; on
     the shipped path these are no-ops. The read path (buildTendrils's baked
     IIFE) rebuilds from static/geom bytes and skips the emission — see
     journey/lib/baked.js and tools/bake-geom.py for the harvest. partData
     ROUND-TRIPS via payload: it is never recomputed on the baked path
     (recomputing after skipping the geometry loops mis-syncs stream B). */
  for (const [site, geo] of Object.entries(net.geometries)) {
    registerGeometry(`connect/${site}`, geo);
  }
  registerPayload('connect', net.bakePayload);
  bakeDumpDone('connect');

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
     THE ARRIVAL IS PERFORMED — the pace floor (CONNECT-SYNC, 2026-08-23)
     ================================================================
     The owner, on this chapter: "the lines on the ground appear at a
     different speed to when the items appear. When I navigate in, it's
     perfectly aligned, but when I scroll in, it is misaligned."

     The asymmetry was the diagnosis. A nav jump replays the whole
     progression on driveEntry's 3.2 s clock, so lights and chips move
     together; a scroll left the lights pure in p while the chips rode
     hotspot-frame.js's seconds-denominated beat floor — so a fast pass
     had the light land in ~130 ms per hub while its own label was still
     forming 300-600 ms behind it, and the pairing this composition
     depends on (the chip rides the EXACT product the hub core's opacity
     rides — see nodeReveal) came apart.

     THE PRINCIPLE, AMENDED. "The scene is conducted; the beats are
     performed — a named beat may arrive later than its scene event,
     never earlier" (DEFECT-01 #3 / ICON-ARRIVAL) still governs; what
     this chapter adds is: WHERE THE BEAT'S MARKER AND ITS SCENE EVENT
     ARE DRAWN AS ONE OBJECT, THE PERFORMANCE GOVERNS THE OBJECT WHOLE.
     On Connect the label and its dot are one object by authored intent
     (2026-08-16, "the labels should show up as soon as each light line
     progresses"), so the tempo floor moves out of the chip layer and
     into the light itself: when the visitor outruns the choreography,
     the WHOLE arrival — strands, dots, labels — plays out at this floor,
     and the pair can never separate because there is only one clock.
     The chips' own beat envelope is retired for this chapter
     (hotspot-frame.js, the revealScrub branch): they are pure in the
     gate again, which is pure in the paced light.

     This also closes the gap D175 named: "as gesture speed -> infinity
     the experience should converge on the jump; instead it
     discontinuously flips." The floor IS that convergence — a hard
     flick now gets the show at a bounded tempo, the same law the nav
     replay already enforces, instead of a compressed pop.

     THE RATE IS DERIVED, NOT AUTHORED HERE. The owner chose the site's
     beat tempo on 2026-08-24 — `grand`, now the one shipped value in
     constants/copy.js HOTSPOT_ARRIVAL (the tasting flag is gone). One
     number of that choice — beatGapMs, the minimum spacing of named
     beats — paces this floor too: the floor rate is set so the CLOSEST
     pair of hub landings in the authored schedule is exactly beatGapMs
     (540 ms) apart when the floor is the conductor. So the two chapters
     keep speaking at one tempo, from one constant. formMs does not
     apply here: this chapter's formation is the kindle swell itself,
     which the same floor paces. The window time that falls out of
     540 ms is ~2.3 s on a hard pass — at the ~2.2 s the nav replay's
     own clock gives the light window, so the scroll floor cannot make
     the show meaningfully slower than navigating in (the min() below
     keeps even that honest).

     WHAT KEEPS THE LAWS. The floor can only LAG the pure-in-p schedule
     (min with the conducted target), so at any deliberate speed the
     scene is still the whole of the answer; REVERSE follows p exactly
     on the same frame wherever the visitor owns p (a machine-owned nav
     blend now performs its departure too — see THE DEPARTURE IS
     PERFORMED TOO at LIGHT_RETREAT_RATE); dt = 0
     snaps the performance to the conducted position, so ?p= deep
     links, ?capture= freezes and every protected golden are settled by
     construction (snap() jumps it; the animator's dt = 0 branch keeps
     it). A pause mid-outrun lets the show finish catching up to where
     the visitor already scrolled — the driveEntry philosophy: the show
     is owed, not skipped. */
  const LIGHT_PACE_RATE = (() => {
    // frontEase is strictly monotone on [0,1]; invert by bisection.
    const inv = (target) => {
      let lo = 0, hi = 1;
      for (let n = 0; n < 48; n++) {
        const m = (lo + hi) / 2;
        if (frontEase(m) < target) lo = m; else hi = m;
      }
      return (lo + hi) / 2;
    };
    // Each hub's dot completes when its route's head reaches along + 0.03
    // (the same expression hubIgnite's window closes on).
    const dots = net.hubMeta.map((hm) => {
      const w = LIT_WIN[hm.route];
      const litAtDot = Math.min(1,
        (hm.along + 0.03) / U.uLitMax.value.getComponent(hm.route));
      return w[0] + inv(litAtDot) * (w[1] - w[0]);
    }).sort((a, b) => a - b);
    const minGap = Math.min(dots[1] - dots[0], dots[2] - dots[1]);
    // leg-t per second such that minGap plays in exactly beatGapMs.
    return minGap / (HOTSPOT_ARRIVAL.beatGapMs / 1000);
  })();

  /* ================================================================
     Node anchors — the hub cores. The group parents to the scene root,
     so hub positions ARE world positions (no matrix walk needed; kept
     through a clone so callers can't mutate the anchors).
     Every hub is its own anchor, in BOTH orientations — no node here has a
     per-orientation position any more. See the two retirement notes below
     (ADOS 2026-08-04, Discord 2026-08-14) for why each exception existed and
     what made it expire.
     ================================================================ */
  const NODES = {};
  for (const hm of net.hubMeta) NODES[hm.id] = hm.pos.clone();
  // ADOS's per-orientation anchor RETIRED with the top-left/top-right restage
  // (2026-08-04): the portrait pose now clears the copy block off the whole
  // organism, so the ADOS hub itself is in-frame with room for its pill in
  // both orientations. nodeWorld('ados') is therefore the hub in every
  // orientation again — which is also what the lens focal handoff wants.
  // ...AND DISCORD'S RETIRES HERE (2026-08-14 — Hannah: "in the Connect the
  // community section on mobile, when I hover, the Discord button isn't
  // aligned with the thing that appears for it — the flashing thing").
  //
  // It was the last one, and it was the whole complaint. In portrait this
  // getter handed the chip `portAnchor` — route-t 0.25, a point on the middle
  // of Discord's run — while the thing that answers a hover is the HUB: its
  // core brightens (0.58 -> 1.0) and scales +18%, and its route pulse fires
  // from there. So on a phone the control and its own response were two
  // different places on the ground. Measured at the Connect rest, chip dot
  // against the projected hub: 375x812 **267 px** apart, 430x932 **306 px**
  // apart, 5.686 world units. ADOS and Hivemind measured 0 px at both, and
  // all three measured 0 px at 1440x900 — a mobile-only fault on exactly one
  // hub, which is what Hannah reported.
  //
  // The exception's own justification is what has expired. It reads: "at
  // 375x812 all three hub cores are inside the frame, but Discord's sits 10 px
  // from the right edge, so its pill (99 px, drawn to the right of the dot)
  // would run off." Two things have since made that false. The chip layer
  // learned to EDGE-FLIP (`ui.js`: mirror the pill about the dot and
  // compensate the translate so the DOT stays exactly on its node), so a pill
  // with no room on the right is placed on the left with the anchor unmoved —
  // which is precisely this case and is why ADOS could come home in 2026-08-04.
  // And `a6f027a` moved the hub itself: measured after it, Discord's core
  // projects 27 px from the right edge at 375x812, not 10.
  //   Verified rather than assumed — measured with the anchor on the hub:
  // the pill flips left and lands fully on frame at both sizes, the dot sits
  // on the hub to 0 px, and chip-chip clearance IMPROVES at both (the worst
  // portrait pair was hivemind/discord, and Discord is moving away from it).
  //
  // `portAnchor` goes with it: this was its only reader, so tendrils.js no
  // longer computes one. Nothing else in the build asks a node for a
  // per-orientation position — all three hubs are now their own anchor in
  // both orientations, which is the state this file kept trying to reach.
  const NODE_IDS = [...HUB_IDS];          // narrative order = reveal order = tab order
  const _nw = new THREE.Vector3();

  /** Per-node clocks, one entry per node the chapter actually has. Derived
   *  from NODE_IDS rather than written out as three-key literals: a table
   *  spelled `{ ados: …, hivemind: …, discord: … }` is a fourth, fifth and
   *  sixth copy of the node list that cannot learn a node was added, and
   *  `setHot`'s `if (!(id in hot)) return` guard turns a missing key into a
   *  node that silently never lights rather than an error. */
  const perNode = (init) => Object.fromEntries(NODE_IDS.map((id) => [id, init]));

  /* ================================================================
     State: hover + ambient pulse clocks (per route, own clocks,
     never synced — the ambRegions law)
     ================================================================ */
  const hot = perNode(false);
  const amt = perNode(0);
  const refire = perNode(0);

  // THE PULSE RUNS PAST THE HUB AND FADES (2026-08-17, with the tendrils.js
  // hub-convergence pulse gate — Hannah's "weird white flash in the right bg").
  // The driver used to deactivate the instant its head reached rAlong 1.0,
  // which is exactly where the gaussian peaks on the route's hub-end
  // vertices: the landing built to maximum brightness and then cut to zero
  // in ONE frame — a flash by construction. The head now overruns to 1.4
  // (gaussian sigma is 1/9 of rAlong, so at 1.4 the nearest route vertex is
  // 3.6 sigma behind it, ~2e-6 of amp) and each driver's duration is scaled
  // by the same factor, so the speed ON the route is unchanged and the pulse
  // simply dissolves into the hub over ~0.35 s instead of snapping off.
  const PULSE_OVERRUN = 1.4;
  const pulses = HUB_IDS.map((id, i) => ({
    id, i,
    driver: pulseDriver((2.6 + net.routes[i].len * 0.28) * PULSE_OVERRUN),   // longer routes take longer
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
  // Connect and Purpose overlap during direct flights and both dim these same
  // organism materials. Publish a claim against their one canonical baseline
  // instead of privately capturing whichever value the previous chapter left.
  const heroGroundDim = createHeroGroundDimClaim(sceneApi, {
    keeps: [0.42, 0.42, 0.60, 0.80, 0.48, 0.52, 0.58],
  });

  /* ================================================================
     Per-frame
     ================================================================ */
  let amount = 0, amountTarget = 0;
  // litR/headR are per route; litMin is "the slowest route" (the honest test
  // for FULLY ARRIVED, which gates the particles and the ambient pulses) and
  // litAvg is the network's overall arrival, which the hero-web dim rides.
  // All four are written by applyFronts, from the DISPLAYED leg-t below.
  const litR = [0, 0, 0], headR = [0, 0, 0];
  let litMin = 0, litAvg = 0;
  // The conducted position: pure in p, written by driveAt on every drive/
  // entry/snap path. The performed position may only lag it — see THE
  // ARRIVAL IS PERFORMED above. Both are leg-t, clamped to the light window
  // where it matters (outside it the fronts are pinned at 0 or 1 anyway).
  let litPureT = -1e9;
  // The performed position the fronts actually display. Animator-owned:
  // follows litPureT down instantly on visitor-owned frames (reverse scrubs
  // are honest), falls at most at LIGHT_RETREAT_RATE while a nav blend owns
  // p (THE DEPARTURE IS PERFORMED TOO), rises toward it at most at
  // LIGHT_PACE_RATE, and snaps to it on dt = 0 and in snap().
  let litShownT = LIGHT_LO;
  // True between setBlending(true) and setBlending(false): a nav blend owns
  // p, so a fall in the conducted position is the machine's, not a gesture.
  let blendGoverned = false;
  let resolve = 0;                        // written per frame from the camera
  // 1 during ordinary scroll/placements. A nav entry alone pulls this to zero
  // before its first rendered frame, so even a downward-looking SOURCE camera
  // cannot expose an already-resolved bed while the local light clock resets.
  let entryReveal = 1;
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
    /* THE PACE FLOOR, applied where the frame clock lives. Down instantly
       on visitor-owned frames (reverse scrubs mirror p exactly, same
       frame), down at most at LIGHT_RETREAT_RATE while a nav blend owns p
       (THE DEPARTURE IS PERFORMED TOO — the machine's parked p is not a
       gesture for the light to be honest to), up at most at
       LIGHT_PACE_RATE (the show keeps its tempo when the visitor outruns
       it — and finishes catching up if they pause, the driveEntry
       philosophy), dt = 0 snaps (frozen captures and ?p= placements are
       settled by construction; snap() covers the placement's own tick).
       This runs before the visibility gate on purpose: a hidden network
       keeps performing, so scrubbing away and back cannot bank a stale
       half-arrival against the pure schedule — and the tick after a blend
       ends, an unfinished floored retreat settles here the same way. */
    const tgtT = litTargetT();
    if (dt === 0) litShownT = tgtT;
    else if (tgtT >= litShownT) litShownT = Math.min(tgtT, litShownT + dt * LIGHT_PACE_RATE);
    else if (blendGoverned) litShownT = Math.max(tgtT, litShownT - dt * LIGHT_RETREAT_RATE);
    else litShownT = tgtT;
    applyFronts(litShownT);

    const k = Math.min(1, dt * 3.0);
    amount += (amountTarget - amount) * k;
    if (amount < 0.004 && amountTarget === 0) amount = 0;
    resolve = amount > 0 ? resolveNow() : 0;
    // Not drawn at all until the camera has resolved something. This is what
    // makes carrying the network outside the old arm window free (the whole
    // Inspire leg costs zero draws) AND what keeps the protected frames
    // byte-identical: at the hero pose the network is not merely dark, it is
    // never submitted.
    group.visible = amount > 0.003 && resolve > 0.0004 && entryReveal > 0.0004;
    if (!group.visible) {
      heroGroundDim.clear();                 // preserves any sibling claim
      return;
    }

    // undercoat dim rides the resolve (camera-pure) and deepens as the light
    // lands — so the two webs never sum to double-exposure mush — and hands
    // the hero's own materials back byte-exactly on retire
    const visualAmount = amount * resolve * entryReveal;
    heroGroundDim.set(visualAmount * (0.30 + 0.70 * sm(0.2, 0.8, litAvg)));

    U.uTime.value = t;
    U.uAmount.value = visualAmount;
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
      pulses[0].driver.active ? pulses[0].driver.value * PULSE_OVERRUN : -2,
      pulses[1].driver.active ? pulses[1].driver.value * PULSE_OVERRUN : -2,
      pulses[2].driver.active ? pulses[2].driver.value * PULSE_OVERRUN : -2,
    );
    // Ambient amp 0.9 -> 0.45 (2026-08-17, the other half of Hannah's "weird
    // white flash in the right bg"). The pulse rides uColHot (near-white) ON
    // TOP of a fully-lit strand, so at 0.9 the sweep clamped to pure white
    // along a long stretch of braid — the HEAD_PEAK 1.0 -> 0.55 lesson
    // replayed on the ambient breath (measured: right-bg px>200 count still
    // doubled on every Discord pulse after the hub-landing fix alone). 0.45
    // is a warm brightening that says where the light is; the hover sum is
    // unchanged at 2.0 — a held chip still answers at full strength, because
    // that one is the visitor's own hand.
    U.uPulseAmp.value.set(
      pulses[0].driver.active ? 0.45 + 1.55 * (pulses[0].focus || amt.ados) : 0,
      pulses[1].driver.active ? 0.45 + 1.55 * (pulses[1].focus || amt.hivemind) : 0,
      pulses[2].driver.active ? 0.45 + 1.55 * (pulses[2].focus || amt.discord) : 0,
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
    U.uExit.value = sm(5.0, 2.4, camRad) * visualAmount;

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
      core.mat.opacity = visualAmount * hubIgnite[i] * Math.min(1.0, 0.58 + 0.4 * a);
      core.sprite.scale.setScalar(core.baseScale * (1 + 0.18 * a));
    }
  });
  /* PARKED ON DISPOSAL, NEVER REMOVED — journey/journey-owner.js's rule,
     applied to a chapter animator. `organism/animation.js` replaces a
     same-name registration IN ITS ORIGINAL Map slot, so re-parking keeps this
     chapter's frame-order position for whatever rebuilds into it; REMOVING
     the registration would push a rebuilt Connect to the END of insertion
     order, behind animators that must not precede it, with nothing failing.

     THIS IS ALSO THE S-1 ANSWER. `organism/animation.js`'s frame loop catches
     a throw from an animator by DELETING the registration and passing
     silently forever after. Parking a no-op means the disposed chapter's body
     is never entered again, so there is no disposed-state path inside an
     animator that could throw and trigger that deletion. The alternative —
     an `if (disposed) return;` guard inside the body — leaves the body
     reachable and is strictly worse under S-1. */
  owner.own(() => {
    heroGroundDim.clear();
    sceneApi.addAnimator('journey-connect', PARKED);
  });

  /* ================================================================
     Public API — the chapter contract, verbatim, plus drive(p)/snap()
     ================================================================ */
  const SPAN_LO = startOf('connect'), SPAN_HI = endOf('connect');
  const REST_P = restProgress('connect');

  /** One writer for the CONDUCTED position. Scroll drive(p) and the
   *  navigation-only entry replay below deliberately share this exact
   *  mapping; the animator derives the displayed fronts from it through the
   *  pace floor (THE ARRIVAL IS PERFORMED above). */
  function driveAt(p) {
    litPureT = (p - SPAN_LO) / (SPAN_HI - SPAN_LO);
  }

  /** The front loop — the pre-pacing driveAt body verbatim, parameterised on
   *  the leg-t the fronts actually display. */
  function applyFronts(legT) {
    litMin = 1; litAvg = 0;
    for (let i = 0; i < 3; i++) {
      const L = frontEase((legT - LIT_WIN[i][0]) / (LIT_WIN[i][1] - LIT_WIN[i][0]));
      litR[i] = L;
      // HEAD_PEAK 0.55: warm emphasis while this route's front travels.
      headR[i] = L > 0 && L < 1 ? 0.55 * Math.sin(Math.PI * L) ** 0.6 : 0;
      if (L < litMin) litMin = L;
      litAvg += L / 3;
    }
  }

  /** The conducted target, clamped to the light window (outside it every
   *  front is pinned at 0 or 1, so the clamp loses nothing and keeps the
   *  pace limiter from spending seconds on empty road). */
  function litTargetT() {
    return litPureT < LIGHT_LO ? LIGHT_LO
      : litPureT > LIGHT_HI ? LIGHT_HI : litPureT;
  }

  // The chapter is prepared before journey activation. Lock the responsive
  // placement now so entering Connect only reveals light over geometry that
  // has already occupied its final world position for the whole approach.
  updateAdosExclusion(true);

  /* ---- descriptor members, hoisted (C05 slice B) ----------------------
     These three were object-literal methods until the declared descriptor
     needed to reference them from a capability as well as from the root.
     Hoisting them keeps ONE body per behaviour: a capability method that
     tried `this.nodeWorld(...)` would resolve `this` to the capability
     object, which has no such member, so delegation has to go through a
     lexical binding. Bodies are unchanged, character for character. */

  function setHot(id, on) {
    if (!(id in hot)) return;
    hot[id] = !!on;
  }

  function nodeWorld(id) {
    const n = NODES[id];
    if (!n) return null;
    return _nw.copy(id === FOCAL ? _adosPlaced : n).clone();
  }

  /** Per-node chip gate (2026-08-16 — see the CHIPS NOW DO FOLLOW note at
   *  LIGHT_ORDER). The exact product the hub core's opacity rides
   *  (animator, `core.mat.opacity`), minus the hover term: the label stands
   *  up as its own dot kindles and never before the network is drawn at
   *  all. hubIgnite is written by the animator only while the group is
   *  visible, but the product is still safe on every hidden frame — a
   *  frozen hubIgnite is multiplied by an amount/resolve pair that IS
   *  current, and both are 0 exactly when the scene has nothing up. */
  function nodeReveal(id) {
    const i = HUB_IDS.indexOf(id);
    return i < 0 ? 0 : amount * resolve * entryReveal * hubIgnite[i];
  }

  return {
    id: 'connect',
    group,
    counts,
    nodeIds: NODE_IDS,
    // The UI retains its 72% readiness floor but maps the remaining marker
    // opacity directly from nodeReveal(), so reverse scroll cannot leave a
    // time-eased label behind the core/ground placement.
    revealScrub: true,
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
    setHot,
    nodeWorld,
    /** QA: prove every rendered ADOS layer consumes this chapter's one
     *  resolved dodge vector. The returned arrays are copies; callers cannot
     *  mutate live uniforms or scene nodes. */
    debugAdosAlignment() {
      const core = net.cores.find((entry) => entry.id === FOCAL);
      const strandSpec = net.geometries.strands.getAttribute('aB');
      const strandLayout = net.geometries.strands.getAttribute('aA');
      const strandPosition = net.geometries.strands.getAttribute('position');
      const strandW = net.geometries.strands.getAttribute('aAdosShiftW');
      const pointRoute = net.geometries.points.getAttribute('aR');
      const pointW = net.geometries.points.getAttribute('aAdosShiftW');
      const weightSummary = (routeAttr, weightAttr, routeComponent = 'getX', limit = weightAttr.count) => {
        let planted = 0, feathered = 0, translated = 0;
        for (let i = 0; i < limit; i++) {
          if (routeAttr[routeComponent](i) >= 0.5) continue;
          const w = weightAttr.getX(i);
          if (w <= 0.001) planted++;
          else if (w >= 0.999) translated++;
          else feathered++;
        }
        return { planted, feathered, translated };
      };
      const centroid = (accept) => {
        let x = 0, y = 0, z = 0, n = 0, minW = 1, maxW = 0;
        for (let i = 0; i < strandW.count; i++) {
          if (!accept(i)) continue;
          const w = strandW.getX(i);
          x += strandPosition.getX(i) + U.uAdosShift.value.x * w;
          y += strandPosition.getY(i) + U.uAdosShift.value.y * w;
          z += strandPosition.getZ(i) + U.uAdosShift.value.z * w;
          minW = Math.min(minW, w); maxW = Math.max(maxW, w); n++;
        }
        return n ? { world: [x / n, y / n, z / n], count: n, minW, maxW } : null;
      };
      return {
        shift: U.uAdosShift.value.toArray(),
        resolvedShift: _adosResolvedShift.toArray(),
        placementFactor: 1,
        visualAmount: amount * resolve * entryReveal,
        groupVisible: group.visible,
        base: _adosBase.toArray(),
        placed: _adosPlaced.toArray(),
        core: core ? core.sprite.position.toArray() : null,
        hubAlong: U.uAdosHubAlong.value,
        strandUniformShared: net.strandMat.uniforms.uAdosShift === U.uAdosShift,
        pointUniformShared: net.pointMat.uniforms.uAdosShift === U.uAdosShift,
        pointHubAlongShared: net.pointMat.uniforms.uAdosHubAlong === U.uAdosHubAlong,
        strandWeights: weightSummary(strandSpec, strandW, 'getW'),
        glintWeights: weightSummary(pointRoute, pointW, 'getX', net.counts.glints),
        primaryEndpoint: centroid((i) => strandSpec.getW(i) < 0.5
          && strandLayout.getZ(i) < 0.5 && Math.abs(strandLayout.getW(i)) < 0.5
          && strandLayout.getY(i) > 0.985),
        groundNexus: centroid((i) => strandSpec.getW(i) < 0.5
          && strandLayout.getZ(i) < 0.5 && strandLayout.getW(i) < -0.5),
      };
    },
    nodeReveal,
    /** The travelling light — conducted in p, performed in seconds (THE
     *  ARRIVAL IS PERFORMED above; the schedule itself is still pure in p).
     *  Forward: light leaves the stipe base and runs out along paths that are
     *  already there, ONE ROUTE AT A TIME (Hivemind, then Discord, then ADOS,
     *  windows overlapping by 0.30), kindling each hub as its own trail lands
     *  — never faster than the beat tempo, however hard the visitor scrolls.
     *  Reverse: each front withdraws into the base in the opposite order and
     *  the routes go quiet again — they do not vanish. The displayed arrival
     *  may lag p, never lead it; a reverse SCRUB follows p on the same frame,
     *  and a machine-owned reverse (a nav blend) withdraws at no more than
     *  LIGHT_RETREAT_RATE (THE DEPARTURE IS PERFORMED TOO). So pausing
     *  mid-arrival holds a coherent partial network (then finishes
     *  the show it still owes) and scrubbing back retraces the schedule
     *  exactly.
     *  Past the leg (the p-window holds to owned.start + 0.105) the network
     *  stays fully lit; retire happens behind the Owned soil-crossing murk
     *  exactly as shipped (M5 values). */
    drive(p) {
      entryReveal = 1;
      driveAt(p);
      updateAdosExclusion();
    },
    /** Navigation has already placed global p at the rest while its camera is
     *  still arriving. Re-run the normal start->rest progression on a local
     *  visible clock: the journey does not start it until entryReady() passes,
     *  and lets it finish after the camera lands. The structural multiplier is
     *  reset as well as the fronts, so a downward-looking source pose cannot
     *  leak the resolved network on the click frame. Placement paths never call
     *  these hooks. */
    entryDuration: ENTRY_DURATION_S,
    beginEntry() {
      entryReveal = 0;
      driveAt(SPAN_LO);
      // The replay opens on a RESET performance. Before the departure floor
      // this reset was implicit (the next tick's instant fall); with a
      // machine-owned fall now floored, make it explicit so a backward jump
      // INTO this chapter can never open on a stale, still-falling network.
      // Invisible by the same argument as the reveal: entryReveal is 0 until
      // driveEntry's own clock raises it.
      litShownT = litTargetT();
      updateAdosExclusion();
    },
    entryReady() {
      return resolveNow() >= ENTRY_CAMERA_READY;
    },
    driveEntry(f) {
      entryReveal = sm(0, 0.12, f);
      driveAt(SPAN_LO + (REST_P - SPAN_LO) * f);
      updateAdosExclusion();
    },
    /** Deep links / capture (placeAt): jump the eased arming to its target so
     *  a dt = 0 placement renders the finished state — the frozen ?capture=
     *  frame needs this (animators see dt = 0 under freezeTime). */
    snap() {
      amount = amountTarget;
      // The performed arrival settles with everything else on a placement:
      // the light stands exactly where the conducted schedule puts it, so a
      // deep link or capture renders the finished (or exactly-partial) state.
      litShownT = litTargetT();
      updateAdosExclusion();
      for (const id of NODE_IDS) amt[id] = hot[id] ? 1 : 0;
    },
    // A nav landing reconciles the eased seam arm only. The route fronts and
    // entryReveal belong to driveEntry and deliberately outlive the camera.
    snapLanding() { amount = amountTarget; },
    /** The transition controller's blend broadcast (the Final chapter's
     *  precedent; an optional contract member, chapter-contract.js). While a
     *  blend is up the machine owns p, so a fall in the conducted light
     *  position is a departure to PERFORM (the animator's retreat floor),
     *  not a gesture to track. `dstCamX`/`durS` are deliberately unused:
     *  the floor is a rate matched to the owner's scroll-backward reference
     *  (see THE DEPARTURE IS PERFORMED TOO), not a schedule against the
     *  move. The clearing call settles any downward residue SYNCHRONOUSLY
     *  rather than leaving it to "the next tick": a blend can end on the
     *  frame loop's last frame before it idles at the landed rest (measured:
     *  the retreat froze mid-window at [0, 1, 0.49] across a 7 s park when
     *  this was tick-deferred), and a banked half-arrival across that sleep
     *  is exactly what the pace floor's own hidden-frames rule exists to
     *  rule out. The settle is downward-only (Math.min), so a landing whose
     *  entry replay is still legitimately rising is untouched; it is
     *  invisible by construction below the arm window (amount 0, and the
     *  protected rests hold resolve at exactly 0), and on a manual-claim
     *  cancel it is the same hard hand-back step every cancelled jump on
     *  this site already makes. */
    setBlending(on) {
      blendGoverned = !!on;
      if (!blendGoverned) litShownT = Math.min(litShownT, litTargetT());
    },
    /** RETIRE THIS CHAPTER'S EXTERNAL ATTACHMENTS — and ONLY those (R05).
     *
     *  What it covers, both drained through one owner, LIFO, idempotently:
     *    - the 'journey-connect' animator, RE-PARKED with a no-op rather than
     *      removed (see the note at the registration for why, and for how
     *      that answers S-1);
     *    - this chapter's `group`, removed from `sceneApi.scene`.
     *  After this call the chapter is unreachable from the frame loop and
     *  absent from the scene graph, which is the pair of properties the
     *  lifecycle contract asks R05 for.
     *
     *  WHAT IT DOES NOT COVER, SO THAT NOBODY READS THE NAME AS A PROMISE:
     *  GPU resources. The geometries, materials and textures built by this
     *  chapter and by `tendrils.js`/`tendrils-materials.js` are NOT disposed.
     *  The partiality is deliberate — one live reason being that the baked
     *  path may hand out SHARED geometry, so disposing here can free
     *  something another chapter is still drawing. Why it was left open, and
     *  what a later order needs to overturn it, are in
     *  docs/code-health/evidence/2026-08-21-elegance-run-01/e01/relocated/journey-chapters-connect-index.md
     *
     *  This partiality is PINNED, not merely commented:
     *  tools/test-r05-chapter-disposal.mjs `B4` fails if a geometry or
     *  material disposal appears here without that suite's claim moving with
     *  it. No caller may read this method as full teardown.
     *
     *  `dispose` is not a contract key. journey/chapter-contract.js declares
     *  seven core keys and four capabilities and deliberately allows extra
     *  root members, so this adds a member, not a capability. */
    dispose() { owner.dispose(); },

    /* ---- DECLARED DESCRIPTOR (journey/chapter-contract.js) --------------
       Core: id/group/counts/setArmed/armed/snap/snapLanding, all above.

       All three capabilities are live: chapter-interactions.js registers this
       chapter from `visibility.nodeIds` and holds no chapter id of its own,
       and journey.js's pickChapterFocus asks `focus.world()`.

       Every member below is still a reference to the same hoisted body the
       root member exposes, so the two spellings cannot drift apart — and the
       root spellings STAY, because they ARE these functions and QA browser
       scripts read them off the published `window.journey.chapters` handle.
       How the capability migration was sliced:
       docs/code-health/evidence/2026-08-21-elegance-run-01/e01/relocated/journey-chapters-connect-index.md */

    /** The lens focal source for the Connect leg: the ADOS hub, in its
     *  responsively-placed position (`_adosPlaced`, not `_adosBase`). This is
     *  what journey.js used to spell `chapters.connect.nodeWorld('ados')`,
     *  with the string moved into the chapter that owns it. */
    focus: {
      world() { return nodeWorld(FOCAL); },
    },

    /** Connect has a hover channel and no selection channel. `setSelected`
     *  is declared null rather than omitted because the ABSENCE is the
     *  statement: ui.js's notifySelect reads `selection.setSelected` and
     *  no-ops on a null one. Omitting the key instead would make the absence
     *  indistinguishable from an oversight. */
    selection: {
      setHot,
      setSelected: null,
    },

    visibility: {
      // Narrative order = reveal order = tab order. The SAME array object
      // the root `nodeIds` publishes, so registration order is authored
      // once (H3/H6).
      nodeIds: NODE_IDS,
      nodeWorld,
      nodeReveal,
      // No hit-radius model and no label policy: connect keeps ui.js's
      // pill-only hit surface and its default chip. Declared null, not
      // omitted — and they must reach addHotspot as `undefined`, never as
      // a function, or the collision/dodge/hit-pad passes change (H4).
      nodeRadius: null,
      labelPolicy: null,
      // The reveal-gate pair, one true at most. Connect scrubs: the UI
      // keeps its 72% readiness floor but maps the remaining marker
      // opacity straight off nodeReveal(), so reverse scroll cannot leave
      // a time-eased label behind the placement. This is the flag that
      // already lived at the root as `revealScrub: true`.
      revealDirect: false,
      revealScrub: true,
      // Connect excludes no node from the rail and gates no chip on the
      // chapter copy ease.
      setExcludedNodes: null,
      bindCopyEase: null,
    },
  };
}
