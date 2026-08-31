import { arcLerp } from './camera-path.js';

/** The route-faithful flight's presented coordinate for eased phase `e`.
 *  With a pace table (journey.js buildRoutePace) the phase advances along the
 *  leg's own sampled path metric, so equal eased time buys equal path and the
 *  hero-end dead band can no longer park the camera for a third of the move
 *  (measured 0.38 s parked, then 24 units in ~0.7 s — see the block at
 *  buildRoutePace). Without one — a degenerate leg, or a fixture-built blend —
 *  it falls back to the shipped linear map. Monotone by construction: the
 *  metric is a strictly positive per-segment sum. */
function routePaceP(blend, e) {
  const pace = blend.routePace;
  if (!pace) {
    return blend.routeFromP + (blend.routeTargetP - blend.routeFromP) * e;
  }
  const cum = pace.cum, n = cum.length - 1;
  const u = e * pace.total;
  let lo = 0, hi = n;
  while (hi - lo > 1) {
    const m = (lo + hi) >> 1;
    if (cum[m] < u) lo = m; else hi = m;
  }
  const span = cum[hi] - cum[lo];
  let f = (lo + (span > 0 ? (u - cum[lo]) / span : 1)) / n;
  if (f < 0) f = 0; else if (f > 1) f = 1;
  return blend.routeFromP + (blend.routeTargetP - blend.routeFromP) * f;
}

/** Build the frame-critical direct-jump camera compositor once. */
export function createCameraBlendStepper(sceneApi, director, lens, guarded, onEnd) {
  const dstPos = sceneApi.camera.position.clone();
  const dstTgt = sceneApi.controls.target.clone();

  return function stepCameraBlend(blend, railMotion, dt) {
    blend.t += dt * blend.play;
    if (blend.t < 0) blend.t = 0;
    const f = Math.min(blend.t / blend.dur, 1);
    const e = f * f * f * (f * (f * 6 - 15) + 10);
    // The rail consumes the camera's exact eased clock for both ordinary
    // clicks and cyclic wraps. Journey progress itself is already parked at
    // the destination during a direct flight, so it cannot supply this phase.
    if (railMotion) railMotion.phase = e;
    /* Mission <-> Inspire is already an authored, reversible camera gesture.
       An adjacent nav click must present that same route coordinate rather
       than replacing it with the generic jump arc: the mushroom's apparent
       acceleration on scroll is the arrival camera's dead-band + trap/az
       easing, not a mesh clock. Publish the exact compositor coordinate so
       every later frame reader can consume the same value. */
    if (blend.routeFaithful) {
      blend.presentedP = routePaceP(blend, e);
      director.apply(blend.presentedP, dt);
      guarded('lens', () => lens.setLookOverride(lens.lookOf(blend.presentedP)));
      if (f >= 1) onEnd(true);
      return;
    }
    const cam = sceneApi.camera, ctl = sceneApi.controls;
    if (!director.owned) director.applyHeroPose();
    dstPos.copy(cam.position);
    dstTgt.copy(ctl.target);
    const fv = blend.fov0 * (1 - e) + cam.fov * e;
    arcLerp(blend.pos0, dstPos, e, cam.position, blend.az1, blend.bow, blend.rise);
    ctl.target.lerpVectors(blend.tgt0, dstTgt, e);
    /* The gaze-height swell of the shaped Equip leg (directJumpTo's ONE ARC
       block prices it; zero on every other jump, and absent from fixture
       blends). Same sin(pi*e) family as `bow`/`rise` above, driven by the
       SAME ease as the target it perturbs, so its velocity is zero at both
       ends and a settled or dt = 0 frame is byte-identical by construction. */
    if (blend.tgtDip) ctl.target.y += blend.tgtDip * Math.sin(Math.PI * e);
    /* The banked pass of the shaped Connect -> Final leg (directJumpTo's
       FLYBY block prices it; absent from every other jump and from fixture
       blends). ONE sin(pi*e) lobe — the same swell family as `bow`/`rise`
       above, on the position's own ease — pulls the radius IN toward a
       single closest pass and lifts the height over the rim. No plateau and
       no shoulders: the first cut held a flat skim between two quintic
       shoulders, which concentrated all radial motion in the entry — the
       velocity aimed AT the specimen, then turned — and the owner read it as
       "zooming in, almost hitting it, and then turning ... it should feel
       like a PLANE flying around something". With the lobe, radial change is
       spread across the whole move and the azimuth sweep is in the velocity
       from the first frame, so curvature changes continuously and the path
       never aims at what it is passing — the tangency trace in the R3
       evidence measures the velocity holding >=60deg off the specimen the
       entire approach. The gaze eases onto the cap on the lobe's SQUARE
       (zero slope at both ends, one smooth in-and-out). Every term is zero
       at e = 0 and e = 1, so endpoints, settled frames and dt = 0 frames are
       byte-identical to the unshaped arc by construction — the arcLerp rule.
       The radius term moves INWARD, so unlike a positive `bow` it does not
       inherit arcLerp's clearance-by-construction guarantee; its clearance
       is measured instead, on the live scene, in the same evidence. */
    if (blend.skim) {
      const k = blend.skim, lobe = Math.sin(Math.PI * e), wG = lobe * lobe;
      const az = Math.atan2(cam.position.x, cam.position.z);
      const r = Math.hypot(cam.position.x, cam.position.z) - k.depth * lobe;
      cam.position.set(Math.sin(az) * r,
        cam.position.y + k.lift * lobe, Math.cos(az) * r);
      ctl.target.set(ctl.target.x * (1 - wG) + k.gx * wG,
        ctl.target.y * (1 - wG) + k.gy * wG,
        ctl.target.z * (1 - wG) + k.gz * wG);
    }
    cam.up.set(0, 1, 0);
    cam.lookAt(ctl.target);
    if (fv !== cam.fov) { cam.fov = fv; cam.updateProjectionMatrix(); }
    if (blend.fog) {
      blend.fog.near = blend.fogN0 + (blend.fogN1 - blend.fogN0) * e;
      blend.fog.far = blend.fogF0 + (blend.fogF1 - blend.fogF0) * e;
    }
    for (const k in blend.look) {
      blend.look[k] = blend.look0[k] + (blend.look1[k] - blend.look0[k]) * e;
    }
    guarded('lens', () => lens.setLookOverride(blend.look));
    if (f >= 1) onEnd(true);
  };
}
