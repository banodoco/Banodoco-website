import * as THREE from 'three';

/**
 * Generic parametric surface builder.
 * fn(u, v, target) with u,v in [0,1]. u wraps around the axis (closed),
 * v runs along the profile. UVs are (u, v).
 */
export function parametricSurface(fn, uSeg, vSeg) {
  const positions = [];
  const uvs = [];
  const indices = [];
  const p = new THREE.Vector3();

  for (let j = 0; j <= vSeg; j++) {
    const v = j / vSeg;
    for (let i = 0; i <= uSeg; i++) {
      const u = i / uSeg;
      fn(u, v, p);
      positions.push(p.x, p.y, p.z);
      uvs.push(u, v);
    }
  }

  const row = uSeg + 1;
  for (let j = 0; j < vSeg; j++) {
    for (let i = 0; i < uSeg; i++) {
      const a = j * row + i;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/**
 * Tube swept along a curve with a per-station radius and an arbitrary
 * cross-section deformer — this is what gives the stem its braided,
 * twisting fibre bundle silhouette (THREE.TubeGeometry can't vary radius).
 *
 * radiusFn(v) -> number
 * crossFn(u, v) -> radial multiplier (1.0 = circular)
 */
export function variableTube(curve, tubularSeg, radialSeg, radiusFn, crossFn) {
  const frames = curve.computeFrenetFrames(tubularSeg, false);
  const positions = [];
  const uvs = [];
  const indices = [];
  const P = new THREE.Vector3();

  for (let j = 0; j <= tubularSeg; j++) {
    const v = j / tubularSeg;
    curve.getPointAt(v, P);
    const N = frames.normals[j];
    const B = frames.binormals[j];
    const r = radiusFn(v);

    for (let i = 0; i <= radialSeg; i++) {
      const u = i / radialSeg;
      const a = u * Math.PI * 2;
      const rr = r * (crossFn ? crossFn(u, v) : 1.0);
      const sx = Math.cos(a) * rr;
      const sy = Math.sin(a) * rr;
      positions.push(
        P.x + N.x * sx + B.x * sy,
        P.y + N.y * sx + B.y * sy,
        P.z + N.z * sx + B.z * sy
      );
      uvs.push(u, v);
    }
  }

  const row = radialSeg + 1;
  for (let j = 0; j < tubularSeg; j++) {
    for (let i = 0; i < radialSeg; i++) {
      const a = j * row + i;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** Deterministic PRNG so every reload produces the identical specimen. */
export function makeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
