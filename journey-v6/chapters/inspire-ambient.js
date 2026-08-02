// journey-v6 — W4-A gap b: the hero's own ambient spore shed (mushroom-scene
// §10, `sceneApi.groups.spores`) is a 4,200-particle curtain blown +x from the
// back-side gills — straight through the ArtCompute exit sector. At the
// Inspire rest it visually swallows part of the ArtCompute plume. Production
// fix per ADR D3: re-parameterise the hero's shed DURING the Inspire leg via
// scene-state manipulation only — the exact pattern spike-a/connect-frame.js
// used for the hero point clouds (store base values, modulate while active,
// restore EXACTLY on exit). mushroom-scene.js is never edited.
//
// Mechanism: the hero shed's `color` attribute is static (the hero animator
// writes positions only — verified by grep, §10/10c touch position + age).
// We keep a byte-exact copy of the base colors, and while the ArtCompute
// plume is revealed we dim each shed particle by its distance to the plume's
// corridor (a world-space segment from the release lip up the leaning rise).
// Spores outside the corridor are written back at exactly base value, and on
// exit (fade -> 0) the whole base array is restored verbatim — so the p = 0
// hero regression stays byte-identical.
import * as THREE from 'three';

const R0 = 0.65;      // full-dim core radius around the plume corridor
const R1 = 2.05;      // feather to untouched beyond this
const MAX_DIM = 0.78; // at full leg activity, corridor spores drop to 22%

export function createAmbientShedDimmer(sceneApi) {
  let pts = null, base = null, active = false;
  const _a = new THREE.Vector3(), _ab = new THREE.Vector3();

  function collect() {
    const p = sceneApi.groups && sceneApi.groups.spores;
    if (!p || !p.geometry || !p.geometry.attributes.color) return false;
    pts = p;
    base = p.geometry.attributes.color.array.slice();   // exact-restore copy
    return true;
  }

  function restore() {
    const attr = pts.geometry.attributes.color;
    attr.array.set(base);                               // verbatim
    attr.needsUpdate = true;
    active = false;
  }

  return {
    /** k: 0..1 leg activity (the ArtCompute reveal fade); a/b: world-space
     *  corridor segment, release lip -> plume top. k <= ~0 restores exactly. */
    update(k, a, b) {
      if (k <= 0.004) { if (active) restore(); return; }
      if (!pts && !collect()) return;
      active = true;
      const attr = pts.geometry.attributes.color;
      const col = attr.array;
      const pos = pts.geometry.attributes.position.array;
      _a.copy(a); _ab.copy(b).sub(a);
      const ab2 = Math.max(_ab.lengthSq(), 1e-6);
      const abx = _ab.x, aby = _ab.y, abz = _ab.z;
      const ax = _a.x, ay = _a.y, az = _a.z;
      const kd = MAX_DIM * k;
      for (let i = 0; i < col.length; i += 3) {
        const px = pos[i] - ax, py = pos[i + 1] - ay, pz = pos[i + 2] - az;
        let t = (px * abx + py * aby + pz * abz) / ab2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const dx = px - abx * t, dy = py - aby * t, dz = pz - abz * t;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        let f = 1;
        if (d < R1) {
          let s = d <= R0 ? 1 : 1 - (d - R0) / (R1 - R0);
          s = s * s * (3 - 2 * s);
          f = 1 - kd * s;
        }
        col[i] = base[i] * f;
        col[i + 1] = base[i + 1] * f;
        col[i + 2] = base[i + 2] * f;
      }
      attr.needsUpdate = true;
    },
    get active() { return active; },
  };
}
