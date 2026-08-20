import { arcLerp } from './camera-path.js';

/** Build the frame-critical direct-jump camera compositor once. */
export function createCameraBlendStepper(sceneApi, director, lens, guarded, onEnd) {
  const dstPos = sceneApi.camera.position.clone();
  const dstTgt = sceneApi.controls.target.clone();

  return function stepCameraBlend(blend, railWrap, dt) {
    blend.t += dt * blend.play;
    if (blend.t < 0) blend.t = 0;
    const f = Math.min(blend.t / blend.dur, 1);
    const e = f * f * f * (f * (f * 6 - 15) + 10);
    if (railWrap) railWrap.phase = e;
    const cam = sceneApi.camera, ctl = sceneApi.controls;
    if (!director.owned) director.applyHeroPose();
    dstPos.copy(cam.position);
    dstTgt.copy(ctl.target);
    const fv = blend.fov0 * (1 - e) + cam.fov * e;
    arcLerp(blend.pos0, dstPos, e, cam.position, blend.az1, blend.bow, blend.rise);
    ctl.target.lerpVectors(blend.tgt0, dstTgt, e);
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
