import * as THREE from 'three';

// Collapse the cap's connected graph instead of keeping isolated eighth
// edges. Endpoints remain real hero vertices, and the draw stays within the
// previous segment budget. Built once, shared by every aerial instance.
export function connectedLineIndex(geometry, stride = 8) {
  const p = geometry.attributes.position, base = geometry.index;
  const count = base ? base.count : p.count;
  const at = i => base ? base.getX(i) : i;
  const budget = Math.ceil(count / (2 * stride));
  function collapse(cell) {
    const cells = new Map(), remap = new Map(), seen = new Set(), out = [];
    const vertex = i => {
      if (remap.has(i)) return remap.get(i);
      const key = `${Math.round(p.getX(i) / cell)},${Math.round(p.getY(i) / cell)},${Math.round(p.getZ(i) / cell)}`;
      if (!cells.has(key)) cells.set(key, i);
      const v = cells.get(key);
      remap.set(i, v);
      return v;
    };
    for (let i = 0; i < count; i += 2) {
      const a = vertex(at(i)), b = vertex(at(i + 1));
      if (a === b) continue;
      const key = a < b ? `${a}:${b}` : `${b}:${a}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(a, b);
      }
    }
    return out;
  }
  geometry.computeBoundingBox();
  let low = 0, high = geometry.boundingBox.getSize(new THREE.Vector3()).length();
  let indices = collapse(high);
  for (let i = 0; i < 12; i++) {
    const cell = (low + high) / 2, candidate = collapse(cell);
    if (candidate.length / 2 > budget) low = cell;
    else {
      high = cell;
      indices = candidate;
    }
  }
  const length = (a, b) => Math.hypot(p.getX(a) - p.getX(b), p.getY(a) - p.getY(b), p.getZ(a) - p.getZ(b));
  let original = 0, reduced = 0;
  for (let i = 0; i < count; i += 2) original += length(at(i), at(i + 1));
  for (let i = 0; i < indices.length; i += 2) reduced += length(indices[i], indices[i + 1]);
  return {
    index: new THREE.BufferAttribute(Uint32Array.from(indices), 1),
    gain: reduced > 0 ? original / reduced : 1,
  };
}
