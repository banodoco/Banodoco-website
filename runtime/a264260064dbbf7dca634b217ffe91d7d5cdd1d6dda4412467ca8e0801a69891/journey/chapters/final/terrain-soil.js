// journey-v6 — FINAL epilogue: THE OPAQUE SOIL SLAB.
//
// Split out of terrain.js by order H05 (2026-08-21). The region below is the
// byte-identical text terrain.js carried at 6967a36a, at its original
// indentation, WITH NO EDIT AT ALL — including the two lines whose leading
// whitespace was already irregular before this order touched anything.
//
// WHY THIS IS A FILE. Everything else terrain.js draws is an ADDITIVE STROKE:
// LineSegments and Points batched through world.js's makeStrandMat /
// makePointsMat, blended, never writing depth. This is the one thing in the
// chapter that is none of those. It is an opaque, depth-writing Mesh with its
// own ShaderMaterial and its own two GLSL programs — the file's ONLY authored
// shader text — it carries the file's ONLY renderOrder assignment
// (`soil.renderOrder = -10`, "first among opaques"), and it owns the two
// uniforms the chapter's runtime writes every frame (uSoilOn through
// setAmount, uBuried through setBuried). It is the occluder the strokes are
// drawn against, not one of them.
//
// AND IT DRAWS NO RANDOM NUMBERS. The slab's geometry is a deterministic grid
// over cutEdgePoint/groundY: zero rand(), zero gauss(), zero makeRng(). §2.2
// prefers a moved seeded region that brings its generator with it; a moved
// region that never touches a generator at all cannot shift a stream in the
// first place, and this is that case. terrain.js's shared makeRng(41719) is
// not read here, and the byte proof sees the result either way — `final/soil`
// is a committed key.
//
// WHAT CROSSES THE BOUNDARY. `group` and `counts` are mutated in place here
// exactly as they were when this was one closure; `sceneApi` is read for the
// scene fog colour and nothing else; `baked` is the committed-bytes read, or
// null. The three values returned — the mesh and the two uniform objects —
// were hoisted `let`s in the facade purely so the return could reach into
// this block (terrain.js's own comment said so). They are ordinary locals
// now, and the dead `= null` initialiser eslint reported at terrain.js:31 is
// gone with the hoist rather than papered over.

import * as THREE from 'three';
import { CUT_N, CUT_S_MIN, CUT_S_MAX, cutEdgePoint, groundY } from './world.js';

/** The kept side's opaque soil: a depth-writing slab under the surface plus a
 *  face sheet down the cut, dissolved by a screen-space hash at both ends of
 *  one stipple window. Returns { soil, soilDissolve, soilBuried }. */
export function buildSoilSlab({ sceneApi, group, counts, baked }) {
  let soilDissolve;   // the slab's uSoilOn uniform (set below)
  let soilBuried;     // the slab's uBuried uniform (set below)
  let soil;           // the slab mesh

  /* ================================================================
     0. SOIL OCCLUDER (declutter round). Under additive blending every
        underground stroke — this chapter's colony, the Owned field that
        stays armed through the epilogue, the hero's dipping roots —
        reads THROUGH the surface as a stray line lying ON the floor:
        the core of Hannah's twice-repeated note ("messy lines... along
        the forest floor"). Dimming cannot fix geometry that has no
        occluder, so the kept-side soil is now REAL: an opaque,
        fog-colored slab under the surface plus a face sheet down the
        cut, depth-written in the opaque pass. The colony is visible
        ONLY in the section the cutaway opens — the approved still's
        exact reading — and the growth-front pulse still shows above
        ground through the members it kindles (their aBoost channel)
        and underground where the front crosses the open section.
        The mirror of the hero's own §5 occlusion shells, at 1 draw.
     ================================================================ */
  {
    let g;
    if (baked) {
      g = baked.g.soil;
    } else {
      const pos = [], idx = [];
    const S_N = 44, S0 = CUT_S_MIN - 8, S1 = CUT_S_MAX + 8;
    // non-uniform depth rows into the kept side: dense at the lip where
    // the silhouette matters, sparse toward the horizon
    const DROWS = [0.02, 0.35, 0.9, 1.7, 3.0, 5.0, 8.0, 12.0, 18.0, 27.0];
    for (let i = 0; i <= S_N; i++) {
      const s = S0 + (i / S_N) * (S1 - S0);
      const e = cutEdgePoint(s);
      for (const d of DROWS) {
        const x = e.x + CUT_N.x * d, z = e.z + CUT_N.z * d;
        pos.push(x, groundY(x, z) - 0.06, z);
      }
    }
    const cols = DROWS.length;
    for (let i = 0; i < S_N; i++) {
      for (let j = 0; j < cols - 1; j++) {
        const a = i * cols + j, b = a + cols;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
    // the face: from just inside the lip straight down — the section wall
    const base = pos.length / 3;
    const F_N = 60, YR = [0.0, -1.2, -2.8, -4.6, -7.0];
    for (let i = 0; i <= F_N; i++) {
      const s = S0 + (i / F_N) * (S1 - S0);
      const e = cutEdgePoint(s);
      const x = e.x + CUT_N.x * 0.10, z = e.z + CUT_N.z * 0.10;
      const gy = groundY(x, z) - 0.05;
      for (const dy of YR) pos.push(x, gy + dy, z);
    }
    for (let i = 0; i < F_N; i++) {
      for (let j = 0; j < YR.length - 1; j++) {
        const a = base + i * YR.length + j, b = a + YR.length;
        idx.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
      g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setIndex(idx);
      counts.soilTris = idx.length / 3;
    }
    // M5 ignition audit (D16): the slab used to appear with group.visible —
    // a binary pop that blacked out the still-visible colony the instant the
    // chapter armed, and un-occluded it just as instantly on a reverse ride.
    // It is now a hashed-alpha dissolve: fragments discard where a screen-
    // space hash exceeds uSoilOn, so the occlusion builds pixel-by-pixel
    // (TAA integrates the stipple into a smooth swallow) while depth writes
    // stay honest for the fragments that remain. At uSoilOn = 1 every
    // fragment survives — identical to the old opaque MeshBasicMaterial.
    // Driven by the orchestrator through setAmount (the rise mask), so the
    // soil solidifies during the underground rise like fog thickening, never
    // as a switch.
    // High-detail transit pass (2026-08-09): the slab is fog-colored so that
    // FROM ABOVE it reads as distance haze under the surface. FROM BELOW —
    // the whole underground stretch of the Owned→Final leg, p ~0.80-0.855 —
    // that same constant color made its silhouette read as torn floating
    // cardboard plates against the black sky ("half-constructed"). uUnder
    // (0 above ground, 1 below; pure in the camera pose, driven by index.js)
    // sinks the slab toward warm near-black while the lens is underground,
    // so overhead it reads as OWNED's dark soil lid — a ceiling of earth,
    // not a stage flat — and it returns to fog tone by the time the camera
    // has pierced and can ever see its far side. The rest frame has
    // uUnder = 0 and is untouched by construction.
    // BURIED (2026-08-11, 17-final-field.md — Hannah, on Owned → Final: "the
    // side gets cropped off, I think, from the side of the fairy ring… it's in
    // an awkward state"). The 2026-08-09 note above says the leg's underground
    // stretch is spent looking at this plate's underside, and it treated that
    // by re-TINTING it. Measured, the situation is worse than a tint can
    // reach, and the measurement is the whole finding:
    //
    //   THE LEG IS BURIED IN THE KEPT SIDE FOR EVERY UNDERGROUND FRAME.
    //   Scanning cutVal along p 0.725–0.970 (41 samples): cutVal runs
    //   +10.06 → +0.56 across p 0.725–0.854 — POSITIVE, i.e. the kept side —
    //   and only crosses zero at p ≈ 0.862, which is AFTER the lens has
    //   already pierced the surface at p 0.8555. The file header's "the Final
    //   camera leg lives entirely on the removed side" is true of the REST and
    //   the approach; it is false of the whole underground traverse.
    //
    // So for p 0.725–0.855 this mesh is not a ceiling overhead — it is the
    // SECTION WALL standing between a buried lens and everything the chapter
    // draws, plus a horizontal plate whose own extent is the horizon. Hiding
    // it at p 0.83 restores a coherent, even underground volume; leaving it
    // gives the hard-edged dark wall down the middle of Hannah's "awkward
    // state", and no widening of the plate's span fixes that (measured: ±8 →
    // ±46 on the tangent and 27 → 66 units of depth moved pure-black pixels
    // by 0.1% — the edge was never the point, the wall was).
    //
    // It is therefore DISSOLVED while the lens is buried, on the same hashed
    // stipple uSoilOn already uses, driven by uBuried — a pure function of
    // camera depth (index.js). This is the exact mirror of OWNED's ceiling
    // being FrontSide-from-below: each soil surface draws only from the side
    // it is FOR. Nothing is lost, because everything this occluder exists to
    // stop ("underground strokes read THROUGH the surface as a stray line
    // lying ON the floor") is a from-ABOVE fault, and above ground uBuried is
    // 0 and this material compiles to the shipped one exactly — the rest, the
    // whole approach and both Final goldens are untouched by construction.
    const soilMat = new THREE.ShaderMaterial({
      uniforms: {
        uSoilOn: { value: 0 },
        uBuried: { value: 0 },
        uSoilCol: { value: new THREE.Color(
          (sceneApi.scene.fog && sceneApi.scene.fog.color) || 0x000000) },
      },
      vertexShader: /* glsl */`
        void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */`
        uniform float uSoilOn;
        uniform float uBuried;
        uniform vec3 uSoilCol;
        void main() {
          float h = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
          // ONE stipple window, two edges: uSoilOn builds the occlusion on
          // arm (D16), uBuried takes it away again as the lens goes under.
          if (h > uSoilOn) discard;
          if (h < uBuried) discard;
          gl_FragColor = vec4(uSoilCol, 1.0);
        }`,
      side: THREE.DoubleSide,
    });
    soil = new THREE.Mesh(g, soilMat);
    soil.frustumCulled = false;
    soil.renderOrder = -10;          // first among opaques
    group.add(soil);
    soilDissolve = soilMat.uniforms.uSoilOn;
    soilBuried = soilMat.uniforms.uBuried;
    // (soilTris is recorded in the live-only branch above — baked reads it
    // from the payload.)
  }

  return { soil, soilDissolve, soilBuried };
}
