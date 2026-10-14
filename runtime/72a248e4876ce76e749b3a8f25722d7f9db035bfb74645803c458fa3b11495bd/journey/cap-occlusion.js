// journey/cap-occlusion.js — the cap hides the spores above it (2026-10-05,
// Hannah, from under the Equip cap: "they seem to move through the mushroom,
// does that make any physical sense?").
//
// A flat rim disc misses the curved gill surface and its rolled edge.
// Spores riding the rising wind can enter that tissue below the nominal
// rim plane. Fade their light before contact rather than allowing their
// sprite/bloom footprint to intersect the visible underside.
//
// Two visibility tests share the existing Equip presence gate. A broad rim
// disc still hides the distant plume behind the cap. A local tissue test
// follows the actual curved underside, rolled edge and upper shell through
// the mushroom's full tilt/bend/sway transform, hiding particles that enter
// solid flesh below the nominal rim. Clearly falling spores and the exterior
// plume retain their light. Both tests feather at the surface; neither
// changes the wind path, particle lifetime, or welcome/tap lighting.
//
// Gated by an amount the chapter drives (0 = no test at all, the shipped
// shader path), so the hero and every chapter that does not ask for it see
// the plume exactly as before. Only the spore cloud's own material is patched;
// organism.js's shared makePoints is untouched.

import * as THREE from 'three';

const CAP_Y = 3.15, CAP_R = 2.35;   // organism.js rim height / radius (cap frame)

const NEAR_LO = '1.0', NEAR_HI = '3.0';   // world units from the lens: midway between 1.5-4.0 (too bare) and 0.6-1.8 (too bright)

// Same form as anatomy.capUnderPt: evaluate the gill surface in the
// mushroom's own frame, including the asymmetric rim and rolled margin.
// The small x offset depends on u, so four fixed iterations recover its
// radial parameter without a texture, per-frame CPU work or new draw.
export const CAP_CLEARANCE_GLSL = `
      float capRimRadius(float a) {
        return 2.35 * (1.0 + 0.09 * cos(a - 3.6)
          + 0.045 * cos(2.0 * a - 1.1) + 0.018 * sin(3.0 * a + 4.1));
      }
      vec2 capCoordinates(vec3 p, float offset) {
        float u = 0.0, a = 0.0;
        for (int i = 0; i < 4; i++) {
          vec2 q = p.xz + vec2(offset * (1.0 - min(u * u, 1.0)), 0.0);
          a = atan(q.y, q.x);
          u = length(q) / capRimRadius(a);
        }
        return vec2(u, a);
      }
      float capRimHeight(float a) {
        float angle = atan(sin(a - 5.3), cos(a - 5.3));
        float fold = angle / 0.35;
        return -0.16 * cos(a - 3.6) + 0.05 * cos(2.0 * a + 0.7) - 0.13 * exp(-fold * fold);
      }
      vec2 capUnderside(vec3 p) {
        vec2 ua = capCoordinates(p, 0.075);
        float u = ua.x, a = ua.y;
        float v = clamp(u, 0.0, 1.0);
        float rim = capRimHeight(a);
        float margin = max(0.0, (v - 0.78) / 0.22);
        float edge = max(0.0, (v - 0.8) / 0.2);
        float throat = v / 0.22;
        float y = 3.15 + 0.5 * pow(1.0 - v, 1.8) + 0.03
          + rim * pow(v, 1.6) - (0.11 + 0.05 * cos(a - 3.6)) * margin * margin
          - 0.11 * edge * edge - 0.36 * exp(-throat * throat);
        return vec2(u, y);
      }
      float capTopHeight(vec3 p) {
        vec2 ua = capCoordinates(p, 0.15);
        float u = clamp(ua.x, 0.0, 1.0), a = ua.y;
        float margin = max(0.0, (u - 0.78) / 0.22);
        float lump = (0.038 * sin(u * 6.3 + a * 2.1 + 1.0)
          + 0.026 * sin(u * 9.7 - a * 3.3 + 2.0)) * sin(3.14159265 * u);
        return 3.15 + 1.22 * pow(max(0.0, cos(u * 1.57079633)), 1.15)
          + capRimHeight(a) * pow(u, 1.6)
          - (0.11 + 0.05 * cos(a - 3.6)) * margin * margin + lump;
      }
      float capTissueMask(vec3 p, float coreRadius) {
        // Most plume particles are far from the cap: reject them before
        // evaluating the curved surfaces (these bounds enclose the form).
        if (p.y < 2.5 - coreRadius || p.y > 4.55 || dot(p.xz, p.xz) > 8.41) return 0.0;
        vec2 surface = capUnderside(p);
        // Lamella tips extend .012 + .044*sin(pi*t) below capUnderPt.
        // Use their lower envelope, then allow for the luminous sprite core.
        float clearance = surface.y - 0.056 - p.y - coreRadius;
        if (surface.x <= 0.07 || surface.x >= 1.0 || clearance >= 0.04) return 0.0;
        float footprint = smoothstep(0.07, 0.10, surface.x)
          * (1.0 - smoothstep(0.97, 1.0, surface.x));
        // Fade in clear air before reaching the flesh; nothing at or
        // above the underside can bloom through its illuminated surface.
        float belowTop = 1.0 - smoothstep(0.0, 0.08, p.y - capTopHeight(p));
        return footprint * belowTop * (1.0 - smoothstep(0.0, 0.04, clearance));
      }
`;

const OCCLUDE_GLSL = `
        if (uCapOcc > 0.0) {
          vec3 wpOcc = (modelMatrix * vec4(placed, 1.0)).xyz;
          vec3 capLocal = (uCapWorldToLocal * vec4(wpOcc, 1.0)).xyz;
          vShrink *= 1.0 - uCapOcc * capTissueMask(capLocal, sz * max(0.0, -mv.z) * uCapCorePixelScale);
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
  const mushroom = sceneApi && sceneApi.groups && sceneApi.groups.mushroom;
  const mats = [];
  if (pts && sway && mushroom) {
    pts.traverse((o) => {
      const m = o.material;
      if (!m || !m.isShaderMaterial || !m.vertexShader.includes('gl_PointSize = sz;')) return;
      m.uniforms.uCapOcc = { value: 0 };
      m.uniforms.uCapCorePixelScale = { value: 0 };
      m.uniforms.uCapWorldToLocal = { value: new THREE.Matrix4() };
      m.uniforms.uCapC = { value: new THREE.Vector3() };
      m.uniforms.uCapR = { value: CAP_R };
      m.vertexShader = m.vertexShader
        .replace('void main() {', CAP_CLEARANCE_GLSL + '\nuniform float uCapCorePixelScale;\n      uniform mat4 uCapWorldToLocal;\n      uniform float uCapOcc;\n      uniform vec3 uCapC;\n      uniform float uCapR;\n      void main() {')
        .replace('gl_PointSize = sz;', OCCLUDE_GLSL);
      m.needsUpdate = true;
      mats.push(m);
    });
  }
  const _c = new THREE.Vector3(), _r = new THREE.Vector3();
  const worldToCap = new THREE.Matrix4();
  const bufferSize = new THREE.Vector2();
  const occ = {
    set(amount) {
      const a = amount > 0 ? Math.min(1, amount) : 0;
      if (a > 0) {
        mushroom.updateWorldMatrix(true, false);
        worldToCap.copy(mushroom.matrixWorld).invert();
        // Half the quad radius contains its luminous core; the outer texture
        // halo should not erase otherwise clear-air spores. Convert device
        // pixels through the live lens and cap transform (including scale).
        sceneApi.renderer.getDrawingBufferSize(bufferSize);
        const e = worldToCap.elements;
        const localScale = Math.max(Math.hypot(e[0], e[1], e[2]),
          Math.hypot(e[4], e[5], e[6]), Math.hypot(e[8], e[9], e[10]));
        const corePixelScale = 0.5 * localScale
          / (bufferSize.y * sceneApi.camera.projectionMatrix.elements[5]);
        for (const m of mats) {
          m.uniforms.uCapWorldToLocal.value.copy(worldToCap);
          m.uniforms.uCapCorePixelScale.value = corePixelScale;
        }
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
