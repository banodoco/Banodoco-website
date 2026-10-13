// journey/cap-occlusion.js — the cap hides the spores above it (2026-10-05,
// Hannah, from under the Equip cap: "they seem to move through the mushroom,
// does that make any physical sense?").
//
// It did not. The cap is drawn as additive lines, not a surface, and the spore
// points never test depth against it, so from underneath the whole plume
// rising off the top of the cap shone straight through the gills — most of
// what dominated the Equip frame was light a real cap would have blocked.
//
// The cap is treated here as the opaque disc it reads as from below: the rim
// plane (organism.js CAP_Y 3.15, CAP_R 2.35, in the swaying cap's frame). A
// spore is occluded when the segment from the camera to it crosses that disc —
// camera under the rim plane, spore above it, crossing point inside the rim
// (soft over the last few percent so the rim does not cut a hard edge). The
// same amount fades spores within a few units of the lens (see NEAR_LO/HI).
// Both multiply vShrink, the brightness term the spore shader carries.
//
// Gated by an amount the chapter drives (0 = no test at all, the shipped
// shader path), so the hero and every chapter that does not ask for it see
// the plume exactly as before. Only the spore cloud's own material is patched;
// organism.js's shared makePoints is untouched.

import * as THREE from 'three';

const CAP_Y = 3.15, CAP_R = 2.35;   // organism.js rim height / radius (cap frame)

const NEAR_LO = '1.0', NEAR_HI = '3.0';   // world units from the lens: midway between 1.5-4.0 (too bare) and 0.6-1.8 (too bright)

const OCCLUDE_GLSL = `
        if (uCapOcc > 0.0) {
          vec3 wpOcc = (modelMatrix * vec4(placed, 1.0)).xyz;
          if (cameraPosition.y < uCapC.y && wpOcc.y > uCapC.y) {
            float tOcc = (uCapC.y - cameraPosition.y) / (wpOcc.y - cameraPosition.y);
            vec2 hitOcc = mix(cameraPosition.xz, wpOcc.xz, tOcc);
            float dOcc = distance(hitOcc, uCapC.xz);
            vShrink *= 1.0 - uCapOcc * (1.0 - smoothstep(uCapR * 0.94, uCapR * 1.03, dOcc));
          }
          // Falling spores under the cap are physically right, but the ones
          // within a few units of the lens bloom into frame-filling bokeh
          // (the shader's fake depth of field grows them up to 2.35x): fade
          // those out instead of letting them lead the frame.
          vShrink *= 1.0 - uCapOcc * (1.0 - smoothstep(${NEAR_LO}, ${NEAR_HI}, -mv.z));
        }
        gl_PointSize = sz;`;

const shared = new WeakMap();

/** @returns {{ set(amount: number): void }} */
export function capOcclusionFor(sceneApi) {
  if (shared.has(sceneApi)) return shared.get(sceneApi);
  const pts = sceneApi && sceneApi.spores && sceneApi.spores.sporePts;
  const sway = sceneApi && sceneApi.groups && sceneApi.groups.sway;
  const mats = [];
  if (pts && sway) {
    pts.traverse((o) => {
      const m = o.material;
      if (!m || !m.isShaderMaterial || !m.vertexShader.includes('gl_PointSize = sz;')) return;
      m.uniforms.uCapOcc = { value: 0 };
      m.uniforms.uCapC = { value: new THREE.Vector3() };
      m.uniforms.uCapR = { value: CAP_R };
      m.vertexShader = m.vertexShader
        .replace('void main() {', 'uniform float uCapOcc;\n      uniform vec3 uCapC;\n      uniform float uCapR;\n      void main() {')
        .replace('gl_PointSize = sz;', OCCLUDE_GLSL);
      m.needsUpdate = true;
      mats.push(m);
    });
  }
  const _c = new THREE.Vector3(), _r = new THREE.Vector3();
  const occ = {
    set(amount) {
      const a = amount > 0 ? Math.min(1, amount) : 0;
      if (a > 0) {
        sway.updateMatrixWorld();
        sway.localToWorld(_c.set(0, CAP_Y, 0));
        const r = sway.localToWorld(_r.set(CAP_R, CAP_Y, 0)).distanceTo(_c);
        for (const m of mats) { m.uniforms.uCapC.value.copy(_c); m.uniforms.uCapR.value = r; }
      }
      for (const m of mats) m.uniforms.uCapOcc.value = a;
    },
  };
  shared.set(sceneApi, occ);
  return occ;
}
