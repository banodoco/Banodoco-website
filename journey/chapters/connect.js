// Chapter 3 — CONNECT: the under-cap gill commons.
//
// A radial gill chamber seen from inside: ~28 primary lamellae radiating from
// the central axis (inner r 2 → outer r 18, height ≈5), shorter secondary and
// tertiary lamellulae between them, and a fine layer of anastomosing cross-veins
// bridging neighbouring channels. The three network behaviours are anatomically
// real structures inside that architecture:
//
//   community — a REGION: neighbouring gills + their lamellulae + cross-veins
//               around azimuth 0.0, brightening outward IN SEQUENCE.
//   ados      — a CONVERGENCE KNOT at azimuth 2.1 r≈9: distant strands bend
//               into it; pulses run inward, then a small outward afterglow
//               spreads through the surrounding gills.
//   hivemind  — a persistent braided ROUTE spanning azimuths 3.6→5.2 at r 7–10:
//               a travelling pulse, fading memory-points, and an after-trace
//               that survives for a few seconds.
//
// The chamber NEVER pulses as one object: three independent regional exchanges
// migrate around the azimuth on their own clocks with their own idle gaps.
//
// See CONTRACT.md → cluster envelope "connect", and handoff.md → CHAPTER 3.
import * as THREE from 'three';

const TAU = Math.PI * 2;
const R_OUT = 18;          // outer gill radius (envelope)
const R_IN = 2;            // inner gill radius (central axis mass)
const CEIL = 5.0;          // cap-flesh ceiling at the axis
const N_PRIMARY = 28;

// semantic anchors (contract-fixed)
const AZ_COMMUNITY = 0.0;
const AZ_ADOS = 2.1;
const R_ADOS = 9.0;
const HIVE_A0 = 3.60, HIVE_A1 = 5.20;
// region windows (slightly wider than the structures themselves)
const W_COMMUNITY = 0.52, W_ADOS = 0.60;
const HIVE_W0 = 3.52, HIVE_W1 = 5.28;

/* ------------------------------------------------------------------ */
/* local utilities (kept in-chapter per CONTRACT)                      */
/* ------------------------------------------------------------------ */

function wrapPi(a) {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
}

// Merge indexed geometries carrying position / aAlong / aStrand into one.
function mergeGeos(geos) {
  let vTotal = 0, iTotal = 0;
  for (const g of geos) {
    vTotal += g.attributes.position.count;
    iTotal += g.index ? g.index.count : 0;
  }
  const pos = new Float32Array(vTotal * 3);
  const along = new Float32Array(vTotal);
  const strand = new Float32Array(vTotal);
  const idx = iTotal ? (vTotal > 65535 ? new Uint32Array(iTotal) : new Uint16Array(iTotal)) : null;
  let vo = 0, io = 0;
  for (const g of geos) {
    const p = g.attributes.position;
    const a = g.attributes.aAlong;
    const s = g.attributes.aStrand;
    pos.set(p.array, vo * 3);
    if (a) along.set(a.array, vo);
    if (s) strand.set(s.array, vo);
    if (idx && g.index) {
      const src = g.index.array;
      for (let k = 0; k < src.length; k++) idx[io + k] = src[k] + vo;
      io += src.length;
    }
    vo += p.count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('aAlong', new THREE.BufferAttribute(along, 1));
  out.setAttribute('aStrand', new THREE.BufferAttribute(strand, 1));
  if (idx) out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

/* ------------------------------------------------------------------ */
export function createChapter(ctx) {
  const H = ctx.helpers;
  const P = ctx.palette;
  const reduced = !!ctx.reducedMotion;
  const V3 = THREE.Vector3;

  const group = new THREE.Group();
  group.name = 'connect';

  const disposables = [];      // textures / stray geometry
  const timeMats = [];         // materials with a uTime uniform

  const rndA = H.rng(31337);   // animation-side randomness (seeded)

  /* ---------------- shared uniform objects (one write per frame) ---------------- */
  const uTime = { value: 0 };
  const uRegionAmt = { value: new THREE.Vector4(0, 0, 0, 0) };  // y=community z=ados w=hivemind
  const uRegionSeq = { value: new THREE.Vector4(0, 0, 0, 0) };
  const uTrace = { value: 0 };                                   // hivemind after-trace
  const uAmbC = { value: new THREE.Vector3(0, 2, 4) };           // regional exchange centers
  const uAmbA = { value: new THREE.Vector3(0, 0, 0) };           // amounts
  const uAmbW = { value: new THREE.Vector3(0.6, 0.6, 0.6) };     // angular widths
  const uOutPos = { value: -1 };                                 // outward transition pulse
  const uOutAmt = { value: 0 };
  const uFlex = { value: reduced ? 0 : 1 };

  /* ---------------- which semantic region owns an (az, r) ---------------- */
  // returns [region, order] — order 0..1 drives the sequence of the reveal
  function regionOf(az, r) {
    const dC = Math.abs(wrapPi(az - AZ_COMMUNITY));
    if (dC <= W_COMMUNITY && r > 3.6 && r < 15.5) return [1, Math.min(dC / W_COMMUNITY, 1)];
    const dA = Math.abs(wrapPi(az - AZ_ADOS));
    if (dA <= W_ADOS && r > 3.6 && r < 15.5) return [2, Math.min(dA / W_ADOS, 1)];
    const azn = az < 0 ? az + TAU : az;
    if (azn >= HIVE_W0 && azn <= HIVE_W1 && r > 5.6 && r < 12.0) {
      return [3, (azn - HIVE_W0) / (HIVE_W1 - HIVE_W0)];
    }
    return [0, 0];
  }

  /* ================================================================ */
  /* GILL BLADES — instanced sheets, one base grid, all placement in   */
  /* the vertex shader so every blade can carry its own irregularity.  */
  /* ================================================================ */

  const gillMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime, uRegionAmt, uRegionSeq, uTrace, uAmbC, uAmbA, uAmbW, uOutPos, uOutAmt, uFlex,
      // LIGHT BUDGET — see the note on the fragment shader. uBase scales the
      // blade FACE (near-invisible haze); uEdge scales the free-edge line,
      // which is where essentially all of the chamber's light lives.
      // Values tuned live in-browser against the three rest poses: edges read
      // as luminous architecture, chamber stays dark, copy stays legible.
      uBase: { value: 0.60 },
      uEdge: { value: 0.95 },
      uHot: { value: 0.50 },
      uNear: { value: 2.0 },
      uColor: { value: new THREE.Color(P.gold) },
      uEdgeColor: { value: new THREE.Color(P.ember) },
      uHotColor: { value: new THREE.Color(P.goldBright) },
      uFogDensity: { value: 0.052 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */`
      attribute float iAz;
      attribute vec2  iR;        // rIn, rOut
      attribute vec3  iProfile;  // botInner, botMain, topJitter
      attribute vec3  iWave;     // waveAmp, waveFreq, bend
      attribute vec4  iMeta;     // seed, bright, region, order
      uniform float uFlex;
      uniform float uTime;
      varying vec4 vA;   // u, v, rad01, az
      varying vec4 vB;   // seed, bright, region, order
      varying vec2 vC;   // viewDepth, facing
      void main() {
        float u = position.x, v = position.y;
        float s = iMeta.x;
        float r = mix(iR.x, iR.y, u);

        // cap flesh domes down toward the rim; gills hang from it
        float top = 5.0 - 1.45 * pow(r / 18.0, 2.0) + iProfile.z;
        // free edge: shallow where the gill leaves the axis, deep across the
        // body, shallowing again at the cap margin
        float bot = mix(iProfile.x, iProfile.y, smoothstep(0.0, 0.34, u));
        bot = mix(bot, iProfile.y + 0.95, smoothstep(0.84, 1.0, u));
        bot = min(bot, top - 0.30);

        // waviness of the blade (two octaves along radius + a surface ripple)
        float w = iWave.x * (sin(u * iWave.y * 3.1 + s * 6.2831) * 0.62
                           + sin(u * iWave.y * 7.7 + s * 11.0) * 0.24);
        w += iWave.x * 0.30 * sin(v * 2.3 + u * 3.4 + s * 5.1);
        // ambient flex — strongest at the free edge, imperceptible elsewhere
        w += uFlex * 0.011 * sin(uTime * 0.21 + s * 6.2831 + u * 1.6) * (1.0 - v);

        float az = iAz + iWave.z * u + w;
        float y = mix(bot, top, v);
        vec3 p = vec3(cos(az) * r, y, sin(az) * r);

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vec3 nrm = normalize((modelViewMatrix * vec4(-sin(az), 0.0, cos(az), 0.0)).xyz);
        // true distance (not view depth) so a sheet passing beside the camera
        // still fades — the camera must never be buried inside a glowing sheet
        vC = vec2(length(mv.xyz), abs(dot(nrm, normalize(-mv.xyz))));
        vA = vec4(u, v, r / 18.0, iAz);
        vB = vec4(s, iMeta.y, iMeta.z, iMeta.w);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      // ---------------------------------------------------------------
      // LIGHT BUDGET. From inside the chamber every view ray crosses 10-20
      // blades, so anything painted across a blade FACE accumulates additively
      // and blows the frame out to a golden whiteout. Therefore:
      //   * the face is near-invisible haze, and is suppressed hard at grazing
      //     angles — grazing sheets are exactly the ones that stack many-deep;
      //   * essentially all of the light lives in the free EDGE, which is
      //     geometrically thin and lands on distinct screen rows, so it reads
      //     as luminous line architecture instead of accumulating;
      //   * a near-camera fade keeps the camera out of any glowing sheet.
      // The chamber must stay near-black; the structures are what glow.
      // ---------------------------------------------------------------
      uniform float uTime, uBase, uEdge, uHot, uNear, uFogDensity, uTrace, uOutPos, uOutAmt;
      uniform vec3 uColor, uEdgeColor, uHotColor;
      uniform vec4 uRegionAmt, uRegionSeq;
      uniform vec3 uAmbC, uAmbA, uAmbW;
      varying vec4 vA;
      varying vec4 vB;
      varying vec2 vC;

      float regionGlow(float az, float c, float a, float w) {
        float d = az - c;
        d = atan(sin(d), cos(d));
        return a * exp(-d * d / (w * w));
      }
      // gaussian band — never pow() with a base that can go negative
      float band(float x, float c, float w) {
        float d = (x - c) / w;
        return exp(-d * d);
      }

      void main() {
        float u = vA.x, v = vA.y, rad = vA.z, az = vA.w;
        float s = vB.x, bright = vB.y, region = vB.z, order = vB.w;
        float dist = vC.x, facing = vC.y;

        // grazing sheets stack; face-on sheets do not. Suppress the former.
        float faceMask = mix(0.055, 1.0, facing);
        // a HAIRLINE free edge: bright per-pixel, but only a couple of percent
        // of each blade's height, so crossing edges land on distinct screen rows
        float edge = exp(-v * 40.0);
        float edgeW = exp(-v * 9.0);                // wider band, reveals only
        float face = (0.0024 + 0.010 * exp(-v * 2.6)) * faceMask;
        // the sheet fades where it leaves the axis and into the cap margin
        float ends = smoothstep(0.0, 0.09, u) * (1.0 - 0.62 * smoothstep(0.84, 1.0, u));
        // never bury the camera inside a glowing sheet
        float nearFade = smoothstep(uNear * 0.24, uNear, dist);

        // asynchronous per-blade twinkle
        float tw = 0.5 + 0.5 * sin(uTime * (0.17 + fract(s * 7.31) * 0.30) + s * 41.0);

        // three independent regional exchanges migrating around the azimuth
        float amb = regionGlow(az, uAmbC.x, uAmbA.x, uAmbW.x)
                  + regionGlow(az, uAmbC.y, uAmbA.y, uAmbW.y)
                  + regionGlow(az, uAmbC.z, uAmbA.z, uAmbW.z);

        // semantic reveals — three visually distinct behaviours
        float lit = 0.0;
        int ri = int(region + 0.5);
        if (ri == 1) {
          // community: neighbouring channels light outward in sequence, then hold
          lit = uRegionAmt.y * smoothstep(order - 0.26, order + 0.08, uRegionSeq.y);
          lit *= band(rad, 0.50, 0.34);
        } else if (ri == 2) {
          // ados: afterglow ring spreading outward from the knot
          float d = uRegionSeq.z - order;
          lit = uRegionAmt.z * exp(-d * d / 0.050) * step(0.0001, uRegionSeq.z);
          lit *= band(rad, 0.50, 0.32);
        } else if (ri == 3) {
          // hivemind: travelling head + a faint after-trace behind it
          float d = uRegionSeq.w - order;
          lit = uRegionAmt.w * (exp(-d * d / 0.014)
                + uTrace * 0.42 * smoothstep(-0.02, 0.07, d));
          lit *= band(rad, 0.47, 0.20);
        }

        // one outward transport pulse through the network (transition / trigger)
        float outp = uOutAmt * band(rad, uOutPos, 0.13);

        // Reveals ride the edge too, with only a narrow skirt and a grazing-
        // suppressed sliver on the face — enough for a hovered region to read as
        // a REGION of igniting channels, never enough to paint a lit sheet.
        float hotShape = 0.012 * faceMask + 0.055 * edgeW + 0.95 * edge;

        vec3 col = uColor     * (uBase * bright * face * (0.80 + 0.20 * tw))
                 + uEdgeColor * (uEdge * bright * edge)
                 + uColor     * (amb * 0.05 * (0.12 * faceMask + 0.88 * edgeW))
                 + uHotColor  * ((lit + outp * 0.7) * uHot * hotShape);

        col *= ends * nearFade;
        col *= exp(-uFogDensity * uFogDensity * dist * dist);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  timeMats.push(gillMat);

  /* ---------- blade specs (deterministic) ---------- */
  function buildSpecs() {
    const rand = H.rng(51771);
    const primary = [], secondary = [], tertiary = [];
    const step = TAU / N_PRIMARY;

    function push(list, tierIdx, az, rIn, rOut, botMain, waveAmp) {
      const azn = az < 0 ? az + TAU : az % TAU;
      // blades span the whole radius, so region membership is azimuthal here —
      // the radial window of each behaviour is applied per-fragment in the shader
      const [reg, ord0] = regionOf(azn, 9.0);
      // lamellulae light just after the primary they sit beside
      const ord = Math.min(0.99, ord0 * 0.82 + tierIdx * 0.11);
      // patchy luminosity: whole sectors stay darker (no uniform brightness)
      const patch = 0.5 + 0.5 * H.fbm3(Math.cos(azn) * 1.45, 0.7, Math.sin(azn) * 1.45, 3);
      const bright = (0.70 + rand() * 0.55) * (0.48 + 0.82 * patch) * (1 - tierIdx * 0.16);
      list.push({
        az,
        rIn, rOut,
        botInner: botMain + 0.55 + rand() * 1.9,
        botMain,
        topJit: (rand() - 0.5) * 0.34,
        waveAmp,
        waveFreq: 0.8 + rand() * 1.5,
        bend: (rand() - 0.5) * 0.10,
        seed: rand(),
        bright,
        region: reg,
        order: ord,
      });
    }

    for (let i = 0; i < N_PRIMARY; i++) {
      const base = i * step;
      // per-gill azimuth jitter: never perfectly rotationally symmetric
      const az = base + (rand() - 0.5) * step * 0.42;
      push(primary, 0, az,
        R_IN + rand() * 0.55,
        R_OUT - 0.7 + rand() * 1.3,
        0.14 + rand() * 0.40,
        0.010 + rand() * 0.022);

      // secondary lamellula between this gill and the next — never reaches the axis
      const azS = base + step * (0.42 + rand() * 0.20);
      push(secondary, 1, azS,
        6.2 + rand() * 2.9,
        R_OUT - 0.9 + rand() * 1.4,
        1.05 + rand() * 0.65,
        0.012 + rand() * 0.026);

      // tertiary, shorter still, offset again
      const azT = base + step * (0.20 + rand() * 0.16) + (rand() < 0.5 ? step * 0.42 : 0);
      push(tertiary, 2, azT,
        10.8 + rand() * 2.6,
        R_OUT - 1.1 + rand() * 1.4,
        1.85 + rand() * 0.70,
        0.014 + rand() * 0.030);
    }
    return { primary, secondary, tertiary };
  }
  const SPECS = buildSpecs();

  /* ---------- base grid + instanced batch construction ---------- */
  function gridGeo(nu, nv) {
    const nVert = (nu + 1) * (nv + 1);
    const pos = new Float32Array(nVert * 3);
    const idx = new Uint16Array(nu * nv * 6);
    let k = 0;
    for (let j = 0; j <= nv; j++) {
      for (let i = 0; i <= nu; i++) {
        pos[k * 3] = i / nu; pos[k * 3 + 1] = j / nv; pos[k * 3 + 2] = 0;
        k++;
      }
    }
    let o = 0;
    for (let j = 0; j < nv; j++) {
      for (let i = 0; i < nu; i++) {
        const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
        idx[o++] = a; idx[o++] = b; idx[o++] = d;
        idx[o++] = a; idx[o++] = d; idx[o++] = c;
      }
    }
    return { pos, idx, nVert };
  }

  function makeBatchGeo(specs, nu, nv) {
    const g = new THREE.InstancedBufferGeometry();
    const base = gridGeo(nu, nv);
    g.setAttribute('position', new THREE.BufferAttribute(base.pos, 3));
    g.setIndex(new THREE.BufferAttribute(base.idx, 1));
    const n = specs.length;
    const az = new Float32Array(n);
    const rr = new Float32Array(n * 2);
    const pr = new Float32Array(n * 3);
    const wv = new Float32Array(n * 3);
    const mt = new Float32Array(n * 4);
    specs.forEach((s, i) => {
      az[i] = s.az;
      rr[i * 2] = s.rIn; rr[i * 2 + 1] = s.rOut;
      pr[i * 3] = s.botInner; pr[i * 3 + 1] = s.botMain; pr[i * 3 + 2] = s.topJit;
      wv[i * 3] = s.waveAmp; wv[i * 3 + 1] = s.waveFreq; wv[i * 3 + 2] = s.bend;
      mt[i * 4] = s.seed; mt[i * 4 + 1] = s.bright; mt[i * 4 + 2] = s.region; mt[i * 4 + 3] = s.order;
    });
    g.setAttribute('iAz', new THREE.InstancedBufferAttribute(az, 1));
    g.setAttribute('iR', new THREE.InstancedBufferAttribute(rr, 2));
    g.setAttribute('iProfile', new THREE.InstancedBufferAttribute(pr, 3));
    g.setAttribute('iWave', new THREE.InstancedBufferAttribute(wv, 3));
    g.setAttribute('iMeta', new THREE.InstancedBufferAttribute(mt, 4));
    g.instanceCount = n;
    return g;
  }

  const RES = {
    1: { primary: [40, 10], secondary: [26, 8], tertiary: [15, 6] },
    2: { primary: [26, 7], secondary: [18, 6], tertiary: [10, 4] },
  };

  const batches = {};
  for (const key of ['primary', 'secondary', 'tertiary']) {
    const [nu, nv] = RES[1][key];
    const geo = makeBatchGeo(SPECS[key], nu, nv);
    const mesh = new THREE.Mesh(geo, gillMat);
    mesh.frustumCulled = false;
    mesh.renderOrder = -2;
    group.add(mesh);
    batches[key] = { mesh, key };
  }

  function rebuildBatch(key, specs, nu, nv) {
    const b = batches[key];
    b.mesh.geometry.dispose();
    b.mesh.geometry = makeBatchGeo(specs, nu, nv);
  }

  /* ================================================================ */
  /* CROSS-VEINS — anastomosing threads bridging neighbouring gills     */
  /* ================================================================ */
  const veinMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime, uRegionAmt, uRegionSeq, uTrace, uAmbC, uAmbA, uAmbW, uOutPos, uOutAmt,
      uBase: { value: 0.105 },
      uNear: { value: 2.6 },
      uColor: { value: new THREE.Color(P.deepGold) },
      uHotColor: { value: new THREE.Color(P.goldBright) },
      uFogDensity: { value: 0.050 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aAlong;
      attribute float aStrand;
      attribute float aRegion;
      attribute float aOrder;
      varying vec4 vA;   // along, strand, region, order
      varying vec3 vB;   // az, rad01, depth
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        float r = length(position.xz);
        vA = vec4(aAlong, aStrand, aRegion, aOrder);
        vB = vec3(atan(position.z, position.x), r / 18.0, length(mv.xyz));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uBase, uNear, uFogDensity, uTrace, uOutPos, uOutAmt;
      uniform vec3 uColor, uHotColor;
      uniform vec4 uRegionAmt, uRegionSeq;
      uniform vec3 uAmbC, uAmbA, uAmbW;
      varying vec4 vA;
      varying vec3 vB;
      float regionGlow(float az, float c, float a, float w) {
        float d = az - c;
        d = atan(sin(d), cos(d));
        return a * exp(-d * d / (w * w));
      }
      float band(float x, float c, float w) {
        float d = (x - c) / w;
        return exp(-d * d);
      }
      void main() {
        float s = vA.y, region = vA.z, order = vA.w;
        float az = vB.x, rad = vB.y;
        float tw = 0.5 + 0.5 * sin(uTime * (0.42 + fract(s * 9.7) * 1.4) + s * 57.0);
        float amb = regionGlow(az, uAmbC.x, uAmbA.x, uAmbW.x)
                  + regionGlow(az, uAmbC.y, uAmbA.y, uAmbW.y)
                  + regionGlow(az, uAmbC.z, uAmbA.z, uAmbW.z);

        float lit = 0.0;
        int ri = int(region + 0.5);
        if (ri == 1) {
          lit = uRegionAmt.y * smoothstep(order - 0.26, order + 0.08, uRegionSeq.y);
        } else if (ri == 2) {
          float d = uRegionSeq.z - order;
          lit = uRegionAmt.z * exp(-d * d / 0.050) * step(0.0001, uRegionSeq.z);
        } else if (ri == 3) {
          float d = uRegionSeq.w - order;
          lit = uRegionAmt.w * (exp(-d * d / 0.014) + uTrace * 0.40 * smoothstep(-0.02, 0.07, d));
        }
        float outp = uOutAmt * band(rad, uOutPos, 0.13);

        vec3 col = uColor * (uBase * (0.42 + 0.58 * tw))
                 + uColor * amb * 0.22
                 + uHotColor * (lit * 0.62 + outp * 0.45);
        col *= smoothstep(uNear * 0.22, uNear, vB.z);      // near-camera fade
        col *= exp(-uFogDensity * uFogDensity * vB.z * vB.z);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  timeMats.push(veinMat);

  const VEIN_FULL = 380;
  function buildVeinGeo(count) {
    const step = TAU / N_PRIMARY;
    const res = H.strandLines({
      count, seed: 8123,
      generator: (i, rand) => {
        // most veins bridge one channel; the community arc is densified so the
        // commons reads as a genuinely cross-linked lattice
        const inCommunity = i % 5 === 0;
        let az;
        if (inCommunity) az = AZ_COMMUNITY + (rand() - 0.5) * 2.0 * W_COMMUNITY * 0.92;
        else az = rand() * TAU;
        const r = 3.4 + Math.pow(rand(), 0.75) * 13.6;
        // patchy: leave real dark gaps between veined sectors
        const dens = H.fbm3(Math.cos(az) * 1.9, r * 0.09, Math.sin(az) * 1.9, 3);
        if (!inCommunity && dens < -0.16) return null;
        const span = step * (0.42 + rand() * 0.75);
        const y0 = 0.35 + rand() * 2.4;
        const y1 = y0 + (rand() - 0.5) * 0.7;
        const a1 = az + span;
        const r1 = Math.max(3.0, r + (rand() - 0.5) * 1.7);
        const p0 = new V3(Math.cos(az) * r, y0, Math.sin(az) * r);
        const p1 = new V3(Math.cos(a1) * r1, y1, Math.sin(a1) * r1);
        const mid = p0.clone().lerp(p1, 0.5);
        const sag = 0.10 + rand() * 0.26;
        mid.y -= sag;                                   // veins sag between blades
        const mr = Math.max(3.0, mid.length() * (1 + (rand() - 0.5) * 0.05));
        const ma = Math.atan2(mid.z, mid.x);
        mid.x = Math.cos(ma) * mr; mid.z = Math.sin(ma) * mr;
        return [p0, mid, p1];
      },
    });
    tagRegions(res.geometry);
    return res.geometry;
  }

  function tagRegions(geo) {
    const p = geo.attributes.position;
    const n = p.count;
    const reg = new Float32Array(n), ord = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = p.getX(i), z = p.getZ(i);
      let az = Math.atan2(z, x);
      if (az < 0) az += TAU;
      const [r0, o0] = regionOf(az, Math.hypot(x, z));
      reg[i] = r0; ord[i] = o0;
    }
    geo.setAttribute('aRegion', new THREE.BufferAttribute(reg, 1));
    geo.setAttribute('aOrder', new THREE.BufferAttribute(ord, 1));
  }

  const veins = (() => {
    const geo = buildVeinGeo(VEIN_FULL);
    const lines = new THREE.LineSegments(geo, veinMat);
    lines.frustumCulled = false;
    lines.renderOrder = -1;
    group.add(lines);
    return { lines };
  })();

  /* ================================================================ */
  /* ADOS — convergence knot fed by distant, visibly bending strands    */
  /* ================================================================ */
  const K_ADOS = new V3(Math.cos(AZ_ADOS) * R_ADOS, 2.35, Math.sin(AZ_ADOS) * R_ADOS);

  const adosMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime,
      uBase: { value: 0.145 },
      uIn: { value: 0 },        // inflow pulse amount
      uInPos: { value: -2 },    // inflow head (0 = distant source, 1 = knot)
      uOut: { value: 0 },       // outward afterglow amount
      uOutPos: { value: -2 },
      uStagger: { value: 0.42 },
      uColor: { value: new THREE.Color(P.gold) },
      uPulseColor: { value: new THREE.Color(P.goldBright) },
      uFogDensity: { value: 0.028 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aAlong;
      attribute float aStrand;
      varying vec3 vA;   // along, strand, depth
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vA = vec3(aAlong, aStrand, -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uBase, uIn, uInPos, uOut, uOutPos, uStagger, uFogDensity;
      uniform vec3 uColor, uPulseColor;
      varying vec3 vA;
      void main() {
        float a = vA.x, s = vA.y;
        float tw = 0.5 + 0.5 * sin(uTime * (0.33 + fract(s * 5.3) * 0.9) + s * 29.0);
        // channels arrive out of step with one another — a gathering, not a switch
        float head = uInPos - s * uStagger;
        float d = a - head;
        float inflow = uIn * exp(-d * d / 0.0052);
        float wake = uIn * 0.24 * exp(-abs(min(d, 0.0)) * 6.0) * step(d, 0.0);
        // afterglow travels back OUT from the knot through the same channels
        float dOut = (1.0 - a) - uOutPos;
        float after = uOut * exp(-dOut * dOut / 0.020);
        // strands brighten toward the knot even at rest: convergence is structural
        float toward = 0.35 + 0.85 * pow(a, 2.2);
        vec3 col = uColor * (uBase * toward * (0.55 + 0.45 * tw))
                 + uPulseColor * (inflow + wake + after);
        col *= exp(-uFogDensity * uFogDensity * vA.z * vA.z);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  timeMats.push(adosMat);

  const adosStrands = (() => {
    const res = H.strandLines({
      count: 18, seed: 6607,
      generator: (i, rand) => {
        // Sources sit in distant gill channels spread across a very wide arc.
        // Every third channel is seeded into the arc the orbit actually frames
        // during the rest band, so the bending toward the gathering is legible
        // long before the knot itself swings into view.
        const srcAz = (i % 3 === 0)
          ? 3.7 + rand() * 1.7
          : AZ_ADOS + (rand() - 0.5) * 5.2;
        const srcR = 11.5 + rand() * 6.0;
        const srcY = 0.5 + rand() * 2.9;
        const start = new V3(Math.cos(srcAz) * srcR, srcY, Math.sin(srcAz) * srcR);
        const pts = [start];
        const SEG = 9;
        for (let j = 1; j <= SEG; j++) {
          const t = j / SEG;
          const e = H.easings.smooth(t);
          // the channel is followed inward first, then the azimuth bends over
          const az = srcAz + wrapPi(AZ_ADOS - srcAz) * Math.pow(e, 1.55);
          const r = srcR + (R_ADOS - srcR) * H.easings.smooth(Math.pow(t, 0.85));
          const y = srcY + (K_ADOS.y - srcY) * e;
          const n1 = H.fbm3(i * 2.7, t * 3.2, 1.4, 3);
          const n2 = H.fbm3(4.1, t * 2.9, i * 1.9, 3);
          const hump = Math.sin(Math.PI * t) * (1 - e * 0.7);
          pts.push(new V3(
            Math.cos(az + n2 * 0.05 * hump) * (r + n1 * 0.85 * hump),
            y + n2 * 0.35 * hump,
            Math.sin(az + n2 * 0.05 * hump) * (r + n1 * 0.85 * hump),
          ));
        }
        pts[pts.length - 1] = K_ADOS.clone();
        return pts;
      },
    });
    const lines = new THREE.LineSegments(res.geometry, adosMat);
    lines.frustumCulled = false;
    group.add(lines);
    return { lines };
  })();

  // --- the knot itself: a tight tangle of short tubes + a warm core ---
  function tubeStrand(points, opts, strandVal) {
    const g = H.tubeFrom(points, opts);
    const n = g.attributes.position.count;
    const uv = g.attributes.uv;
    const along = new Float32Array(n);
    const st = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      along[i] = uv ? uv.getX(i) : 0;
      st[i] = strandVal;
    }
    g.setAttribute('aAlong', new THREE.BufferAttribute(along, 1));
    g.setAttribute('aStrand', new THREE.BufferAttribute(st, 1));
    if (g.attributes.normal) g.deleteAttribute('normal');
    if (g.attributes.uv) g.deleteAttribute('uv');
    return g;
  }

  const adosKnot = (() => {
    const rand = H.rng(4409);
    const geos = [];
    const N = 14;
    for (let i = 0; i < N; i++) {
      const a0 = rand() * TAU;
      const tilt = (rand() - 0.5) * 1.4;
      const R = 0.22 + rand() * 0.50;
      const span = 0.9 + rand() * 1.9;
      const segs = 5;
      const pts = [];
      for (let j = 0; j <= segs; j++) {
        const t = j / segs;
        const a = a0 + t * span;
        const rr = R * (1 - 0.40 * t);
        const w = H.noise3(i * 2.4, t * 3.1, 0.7) * 0.14;
        pts.push(new V3(
          Math.cos(a) * (rr + w),
          (t - 0.5) * R * 1.4 * (0.4 + tilt) + w * 0.6,
          Math.sin(a) * (rr + w),
        ));
      }
      geos.push(tubeStrand(pts, {
        radius: 0.026 + rand() * 0.030, radialSegments: 4, tubularSegments: 12, taper: 0.7,
      }, i / N));
    }
    const mat = H.makePulseMat(P.ember, {
      baseOpacity: 0.24, twinkle: 0.30, pulseWidth: 0.18,
      pulseColor: P.goldBright, fogDensity: 0.010,
    });
    timeMats.push(mat);
    const mesh = new THREE.Mesh(mergeGeos(geos), mat);
    mesh.frustumCulled = false;
    const g = new THREE.Group();
    g.position.copy(K_ADOS);
    g.add(mesh);

    const coreMat = new THREE.SpriteMaterial({
      map: H.glowSprite(P.ember, 64), color: new THREE.Color(P.ember),
      transparent: true, opacity: 0.30, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: true,
    });
    const core = new THREE.Sprite(coreMat);
    core.scale.setScalar(1.5);
    g.add(core);

    group.add(g);
    disposables.push(mesh.geometry);
    return { g, mesh, mat, base: 0.24, core, coreMat, coreBase: 0.30 };
  })();

  /* ================================================================ */
  /* HIVEMIND — braided persistent route through the under-cap tissue   */
  /* ================================================================ */
  function routePoint(t) {
    const az = HIVE_A0 + (HIVE_A1 - HIVE_A0) * t;
    const rr = 7.3 + 2.5 * t + H.fbm3(t * 3.0, 1.7, 0.5, 3) * 0.95;
    const yy = 2.55 - 0.85 * t + H.fbm3(0.9, t * 3.4, 2.2, 3) * 0.38;
    return { az, rr, yy, p: new V3(Math.cos(az) * rr, yy, Math.sin(az) * rr) };
  }

  const hiveMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime, uTrace,
      uBase: { value: 0.17 },
      uPulse: { value: -2 },
      uPulseOn: { value: 0 },
      uWidth: { value: 0.055 },
      uColor: { value: new THREE.Color(P.gold) },
      uPulseColor: { value: new THREE.Color(P.goldBright) },
      // a whisper of cool accent only in the memory trace — nowhere else
      uTraceColor: { value: new THREE.Color(P.goldBright).lerp(new THREE.Color(P.coolAccent), 0.32) },
      uFogDensity: { value: 0.024 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute float aAlong;
      attribute float aStrand;
      varying vec3 vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vA = vec3(aAlong, aStrand, -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */`
      uniform float uTime, uBase, uPulse, uPulseOn, uWidth, uTrace, uFogDensity;
      uniform vec3 uColor, uPulseColor, uTraceColor;
      varying vec3 vA;
      void main() {
        float a = vA.x, s = vA.y;
        float tw = 0.5 + 0.5 * sin(uTime * (0.28 + fract(s * 6.1) * 0.8) + s * 33.0);
        // braid strands carry the head slightly out of step with each other
        float head = uPulse - s * 0.07;
        float d = a - head;
        float pulse = uPulseOn * exp(-d * d / (uWidth * uWidth));
        // persistence: what the pulse has already passed keeps glowing, and
        // erodes from the start of the route forward
        float trace = uTrace * smoothstep(-0.03, 0.09, head - a);
        vec3 col = uColor * (uBase * (0.60 + 0.40 * tw))
                 + uPulseColor * pulse
                 + uTraceColor * trace * 0.50;
        col *= exp(-uFogDensity * uFogDensity * vA.z * vA.z);
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  timeMats.push(hiveMat);

  const HIVE_STRANDS = 5;
  function buildHiveGeo(tubular) {
    const rand = H.rng(2277);
    const geos = [];
    for (let k = 0; k < HIVE_STRANDS; k++) {
      const phase0 = (k / HIVE_STRANDS) * TAU + (rand() - 0.5) * 0.4;
      const twist = 5.5 + rand() * 3.0;
      const br = 0.20 + rand() * 0.14;
      const CTRL = 34;
      const pts = [];
      for (let j = 0; j <= CTRL; j++) {
        const t = j / CTRL;
        const { az, rr, yy } = routePoint(t);
        const ph = phase0 + t * twist * TAU;
        const wob = H.fbm3(k * 2.2, t * 4.1, 1.3, 3) * 0.10;
        pts.push(new V3(
          Math.cos(az) * (rr + Math.cos(ph) * br + wob),
          yy + Math.sin(ph) * br * 0.85 + wob * 0.5,
          Math.sin(az) * (rr + Math.cos(ph) * br + wob),
        ));
      }
      geos.push(tubeStrand(pts, {
        radius: 0.034 + rand() * 0.026, radialSegments: 4,
        tubularSegments: tubular, taper: 0.85,
      }, k / (HIVE_STRANDS - 1)));
    }
    return mergeGeos(geos);
  }

  const hive = (() => {
    const geo = buildHiveGeo(110);
    const mesh = new THREE.Mesh(geo, hiveMat);
    mesh.frustumCulled = false;
    group.add(mesh);
    return { mesh };
  })();

  // --- memory points: small fading markers left along the route ---
  const MEM_ALONG = [0.08, 0.21, 0.33, 0.46, 0.58, 0.71, 0.86];
  const memPoints = MEM_ALONG.map((t, i) => {
    const { p } = routePoint(t);
    const col = new THREE.Color(P.goldBright).lerp(new THREE.Color(P.coolAccent), 0.28);
    const mat = new THREE.SpriteMaterial({
      map: H.glowSprite(P.goldBright, 48), color: col,
      transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, fog: true,
    });
    const s = new THREE.Sprite(mat);
    const off = H.noise3(i * 3.1, 0.4, 1.9);
    s.position.set(p.x + off * 0.16, p.y + 0.22 + off * 0.1, p.z - off * 0.16);
    s.scale.setScalar(0.26);
    group.add(s);
    return { s, mat, along: t, life: 0, base: 0.26 };
  });

  /* ================================================================ */
  /* CEILING (cap flesh) + CENTRAL AXIS MASS — implied, never entered   */
  /* ================================================================ */
  function mottleTexture(seed, size = 256) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    g.fillStyle = '#000000';
    g.fillRect(0, 0, size, size);
    const rand = H.rng(seed);
    for (let i = 0; i < 150; i++) {
      const x = rand() * size, y = rand() * size;
      const r = size * (0.02 + rand() * 0.11);
      const a = 0.02 + rand() * 0.11;
      const grad = g.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(255,196,124,${a.toFixed(3)})`);
      grad.addColorStop(1, 'rgba(255,196,124,0)');
      g.fillStyle = grad;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    disposables.push(tex);
    return tex;
  }

  const ceiling = (() => {
    const rings = 7, segs = 30;
    const nVert = (rings + 1) * (segs + 1);
    const pos = new Float32Array(nVert * 3);
    const uv = new Float32Array(nVert * 2);
    const idx = new Uint16Array(rings * segs * 6);
    let k = 0;
    for (let j = 0; j <= rings; j++) {
      const rr = 1.6 + (R_OUT + 0.9 - 1.6) * (j / rings);
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * TAU;
        const y = CEIL - 1.45 * Math.pow(rr / R_OUT, 2) + 0.38
          + H.fbm3(Math.cos(a) * rr * 0.13, 0.5, Math.sin(a) * rr * 0.13, 3) * 0.26;
        pos[k * 3] = Math.cos(a) * rr; pos[k * 3 + 1] = y; pos[k * 3 + 2] = Math.sin(a) * rr;
        uv[k * 2] = (i / segs) * 3; uv[k * 2 + 1] = j / rings;
        k++;
      }
    }
    let o = 0;
    for (let j = 0; j < rings; j++) {
      for (let i = 0; i < segs; i++) {
        const a = j * (segs + 1) + i, b = a + 1, c = a + segs + 1, d = c + 1;
        idx[o++] = a; idx[o++] = b; idx[o++] = d;
        idx[o++] = a; idx[o++] = d; idx[o++] = c;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    const mat = new THREE.MeshBasicMaterial({
      map: mottleTexture(7714), color: new THREE.Color(P.deepGold),
      transparent: true, opacity: 0.042, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: true,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    mesh.renderOrder = -6;
    group.add(mesh);
    return { mesh, mat };
  })();

  const axisMass = (() => {
    const geo = new THREE.CylinderGeometry(2.35, 1.95, 5.7, 26, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      map: mottleTexture(3312, 128), color: new THREE.Color(P.gold),
      transparent: true, opacity: 0.055, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: true,
    });
    mat.map.repeat.set(4, 1);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 2.6;
    mesh.renderOrder = -5;
    group.add(mesh);
    return { mesh, mat };
  })();

  /* ================================================================ */
  /* SPORES — drifting between the lamellae, migrating toward the rim   */
  /* ================================================================ */
  const SPORE_FULL = 900;
  const sporeTex = H.softDisc(48);
  const sporeMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime,
      uMap: { value: sporeTex },
      uSize: { value: 26 },
      uColor: { value: new THREE.Color(P.parchment) },
      uColor2: { value: new THREE.Color(P.ember) },
      uAmt: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */`
      attribute vec4 aSpore;   // az0, r0, y0, seed
      uniform float uTime, uSize;
      varying vec2 vA;         // alpha, seed
      float h(float n){ return fract(sin(n) * 43758.5453); }
      void main() {
        float s = aSpore.w;
        float t = fract(uTime * (0.010 + h(s) * 0.013) + s);
        // slow outward migration toward the cap margin, with a slight fall
        float r = aSpore.y + t * (4.5 + h(s * 1.7) * 8.5);
        float az = aSpore.x + sin(uTime * 0.06 + s * 6.0) * 0.018 + t * (h(s * 2.3) - 0.5) * 0.06;
        float y = aSpore.z + sin(uTime * 0.13 + s * 11.0) * 0.16 - t * 0.42;
        vec3 p = vec3(cos(az) * r, y, sin(az) * r);
        vA = vec2(smoothstep(0.0, 0.09, t) * (1.0 - smoothstep(0.60, 1.0, t))
                  * (0.22 + 0.5 * h(s * 4.1)), s);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * (1.0 / max(-mv.z, 0.4)) * (0.55 + h(s * 5.7) * 0.8);
      }`,
    fragmentShader: /* glsl */`
      uniform sampler2D uMap;
      uniform vec3 uColor, uColor2;
      uniform float uAmt;
      varying vec2 vA;
      float h(float n){ return fract(sin(n) * 43758.5453); }
      void main() {
        vec4 tex = texture2D(uMap, gl_PointCoord);
        vec3 col = mix(uColor, uColor2, h(vA.y * 9.3) * 0.6);
        gl_FragColor = vec4(col, tex.a * vA.x * uAmt);
      }`,
  });
  timeMats.push(sporeMat);

  function buildSporeGeo(count) {
    const rand = H.rng(9182);
    const step = TAU / N_PRIMARY;
    const arr = new Float32Array(count * 4);
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // released BETWEEN lamellae, not off the blade faces
      const gi = Math.floor(rand() * N_PRIMARY);
      const az = gi * step + step * (0.2 + rand() * 0.6);
      const r0 = 3.0 + Math.pow(rand(), 0.8) * 9.5;
      const y0 = 0.45 + rand() * 2.5;
      arr[i * 4] = az; arr[i * 4 + 1] = r0; arr[i * 4 + 2] = y0; arr[i * 4 + 3] = rand();
      pos[i * 3] = Math.cos(az) * r0; pos[i * 3 + 1] = y0; pos[i * 3 + 2] = Math.sin(az) * r0;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSpore', new THREE.BufferAttribute(arr, 4));
    return g;
  }
  const spores = (() => {
    const geo = buildSporeGeo(SPORE_FULL);
    const pts = new THREE.Points(geo, sporeMat);
    pts.frustumCulled = false;
    pts.renderOrder = 1;
    group.add(pts);
    return { pts };
  })();

  /* ================================================================ */
  /* HOTSPOT RAYCAST PROXIES (transparent, opacity 0 — NOT visible=false)*/
  /* ================================================================ */
  function proxyAt(pos, radius) {
    const geo = new THREE.SphereGeometry(radius, 10, 8);
    const mat = new THREE.MeshBasicMaterial({
      transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(pos);
    group.add(m);
    disposables.push(geo, mat);
    return m;
  }
  const proxyCommunity = proxyAt(
    new V3(Math.cos(AZ_COMMUNITY) * 9.0, 2.45, Math.sin(AZ_COMMUNITY) * 9.0), 2.2);
  const proxyAdos = proxyAt(K_ADOS, 1.6);
  const proxyHive = (() => {
    // anchored on the route where the orbit frames it most directly
    const { p } = routePoint((4.95 - HIVE_A0) / (HIVE_A1 - HIVE_A0));
    return proxyAt(p, 1.8);
  })();

  /* ================================================================ */
  /* STATE                                                             */
  /* ================================================================ */
  let hovered = null, selected = null;
  let quality = 1;
  const motion = reduced ? 0 : 1;

  const nodes = {
    community: { amt: 0, driver: H.pulseDriver(2.0) },
    ados: { amt: 0, inDriver: H.pulseDriver(1.9), outDriver: H.pulseDriver(1.6), armed: false },
    hivemind: { amt: 0, driver: H.pulseDriver(3.0), trace: 0, reFire: 0 },
  };

  // three independent regional exchanges — own centers, widths, durations, gaps
  const ambRegions = [];
  for (let i = 0; i < 3; i++) {
    ambRegions.push({
      t: -(0.6 + rndA() * 4.0),
      dur: 3.4 + rndA() * 4.6,
      center: rndA() * TAU,
      width: 0.42 + rndA() * 0.65,
      peak: 0.30 + rndA() * 0.42,
      drift: (rndA() - 0.5) * 0.10,
      amt: 0,
    });
  }
  let ambCount = 3;

  // outward transport pulse (transition cue + trigger('pulse'))
  const outDriver = H.pulseDriver(4.2);
  let outFired = false;

  // ambient ADOS inflow: the gathering breathes on its own, out of step
  let adosAmbT = 3 + rndA() * 6;
  const adosAmbDriver = H.pulseDriver(3.4);

  function approach(cur, target, dt, rate) {
    return cur + (target - cur) * Math.min(dt * rate, 1);
  }

  /* ================================================================ */
  const api = {
    id: 'connect',
    group,
    hotspots: [
      { id: 'community', object: proxyCommunity, radius: 2.2, labelOffset: { x: 0, y: 1.7, z: 0 } },
      { id: 'ados', object: proxyAdos, radius: 1.6, labelOffset: { x: 0, y: 1.35, z: 0 } },
      { id: 'hivemind', object: proxyHive, radius: 1.8, labelOffset: { x: 0, y: 1.25, z: 0 } },
    ],

    update(dt, time, cp, active) {
      // shared uTime object covers most materials; makePulseMat builds its own
      for (const m of timeMats) m.uniforms.uTime.value = time;

      /* ---- semantic node states ---- */
      const cAmt = (hovered === 'community' ? 1 : 0) + (selected === 'community' ? 0.55 : 0);
      const aAmt = (hovered === 'ados' ? 1 : 0) + (selected === 'ados' ? 0.55 : 0);
      const hAmt = (hovered === 'hivemind' ? 1 : 0) + (selected === 'hivemind' ? 0.55 : 0);
      nodes.community.amt = approach(nodes.community.amt, cAmt, dt, 4.0);
      nodes.ados.amt = approach(nodes.ados.amt, aAmt, dt, 4.0);
      nodes.hivemind.amt = approach(nodes.hivemind.amt, hAmt, dt, 4.0);

      // community — sequential outward reveal of a real region, then hold
      nodes.community.driver.update(dt);
      uRegionAmt.value.y = nodes.community.amt * 0.95;
      uRegionSeq.value.y = nodes.community.driver.value;

      // ados — pulses run INTO the knot, then a small outward afterglow
      const A = nodes.ados;
      A.inDriver.update(dt);
      A.outDriver.update(dt);
      if (A.armed && !A.inDriver.active) { A.armed = false; A.outDriver.fire(); }
      adosAmbT -= dt;
      if (adosAmbT <= 0 && !A.inDriver.active) { adosAmbDriver.fire(); adosAmbT = 9 + rndA() * 11; }
      adosAmbDriver.update(dt);
      const inflowOn = A.inDriver.active
        ? 0.85 + 0.6 * A.amt
        : (adosAmbDriver.active ? 0.24 : 0);
      const inflowPos = A.inDriver.active
        ? A.inDriver.value * (1 + adosMat.uniforms.uStagger.value)
        : adosAmbDriver.value * (1 + adosMat.uniforms.uStagger.value);
      adosMat.uniforms.uIn.value = inflowOn;
      adosMat.uniforms.uInPos.value = inflowPos;
      adosMat.uniforms.uOut.value = A.outDriver.active ? (0.55 + 0.55 * A.amt) * (1 - A.outDriver.value * 0.6) : 0;
      adosMat.uniforms.uOutPos.value = A.outDriver.value * 0.9;
      adosMat.uniforms.uBase.value = 0.145 * (1 + 0.85 * A.amt);
      // the surrounding gills answer the gathering with an outward afterglow
      uRegionAmt.value.z = A.outDriver.active ? 0.55 + 0.75 * A.amt : 0;
      uRegionSeq.value.z = A.outDriver.active ? A.outDriver.value : 0;
      // knot core: tightens and warms, never bouncy
      adosKnot.mat.uniforms.uBase.value = adosKnot.base * (1 + 0.9 * A.amt);
      const arrive = A.inDriver.active ? Math.pow(A.inDriver.value, 3.5) : 0;
      adosKnot.coreMat.opacity = Math.min(0.92,
        adosKnot.coreBase * (1 + 0.7 * A.amt + 0.9 * arrive + (A.outDriver.active ? 0.5 * (1 - A.outDriver.value) : 0)));
      adosKnot.core.scale.setScalar(1.5 * (1 + 0.06 * A.amt + 0.10 * arrive));
      adosKnot.mesh.scale.setScalar(1 - 0.05 * A.amt);
      // circulation inside the knot itself: strongest as the channels land
      adosKnot.mat.uniforms.uPulse.value = (time * 0.34) % 1;
      adosKnot.mat.uniforms.uPulseOn.value = A.inDriver.active
        ? 0.75 * Math.pow(A.inDriver.value, 3)
        : (A.outDriver.active ? 0.55 * (1 - A.outDriver.value) : 0.10 * A.amt);

      // hivemind — travelling pulse, memory points, persistent after-trace
      const Hv = nodes.hivemind;
      Hv.driver.update(dt);
      if (selected === 'hivemind') {
        Hv.reFire -= dt;
        if (Hv.reFire <= 0 && !Hv.driver.active) { Hv.driver.fire(); Hv.reFire = 4.5; }
      }
      if (Hv.driver.active) Hv.trace = 1;
      else Hv.trace = Math.max(0, Hv.trace - dt / 4.2);
      const head = Hv.driver.active ? Hv.driver.value : (Hv.trace > 0 ? 1 : -2);
      hiveMat.uniforms.uPulse.value = head;
      hiveMat.uniforms.uPulseOn.value = Hv.driver.active ? 0.95 + 0.5 * Hv.amt : 0;
      hiveMat.uniforms.uBase.value = 0.17 * (1 + 0.75 * Hv.amt);
      uTrace.value = Hv.trace * (0.45 + 0.55 * Math.max(Hv.amt, Hv.trace));
      uRegionAmt.value.w = Math.max(Hv.amt, Hv.trace * 0.5) * 0.9;
      uRegionSeq.value.w = head;

      // memory points light as the head passes, then fade over seconds
      for (const m of memPoints) {
        if (Hv.driver.active && Hv.driver.value >= m.along && m.life < 0.02) m.life = 1;
        if (!Hv.driver.active && head < 0) m.life = Math.max(0, m.life - dt / 3.6);
        else m.life = Math.max(0, m.life - dt / 5.0);
        m.mat.opacity = m.life * 0.85 * (0.55 + 0.45 * Hv.amt);
        m.s.scale.setScalar(m.base * (0.75 + 0.5 * m.life));
      }

      /* ---- ambient: asynchronous regional exchanges ---- */
      for (let i = 0; i < ambRegions.length; i++) {
        const r = ambRegions[i];
        if (i >= ambCount) { r.amt = 0; continue; }
        r.t += dt;
        if (r.t > r.dur) {
          r.t = -(0.8 + rndA() * 5.5);
          r.dur = 3.4 + rndA() * 4.6;
          r.center = rndA() * TAU;
          r.width = 0.42 + rndA() * 0.65;
          r.peak = 0.30 + rndA() * 0.42;
          r.drift = (rndA() - 0.5) * 0.10;
        }
        const e = r.t > 0 ? Math.sin(Math.PI * Math.min(r.t / r.dur, 1)) : 0;
        r.amt = e * r.peak * (reduced ? 0.4 : 1);
        r.center += dt * r.drift * motion;
      }
      uAmbC.value.set(ambRegions[0].center, ambRegions[1].center, ambRegions[2].center);
      uAmbA.value.set(ambRegions[0].amt, ambRegions[1].amt, ambRegions[2].amt);
      uAmbW.value.set(ambRegions[0].width, ambRegions[1].width, ambRegions[2].width);

      /* ---- outward transport pulse toward the cap margin (threshold two) ---- */
      if (active && cp > 0.88 && !outFired) { outDriver.fire(); outFired = true; }
      if (cp < 0.80) outFired = false;
      outDriver.update(dt);
      if (outDriver.active) {
        const v = outDriver.value;
        uOutPos.value = 0.10 + v * 1.05;
        uOutAmt.value = Math.sin(Math.PI * v) * 0.85;
      } else {
        uOutAmt.value = 0;
        uOutPos.value = -1;
      }

      /* ---- entry / exit framing ---- */
      const entry = cp < 0.10 ? 1 - cp / 0.10 : 0;
      axisMass.mat.opacity = 0.055 * (1 + 1.1 * entry);
      ceiling.mat.opacity = 0.042 * (1 + 0.5 * (cp > 0.85 ? (cp - 0.85) / 0.15 : 0));
      gillMat.uniforms.uBase.value = 0.60 * (1 + 0.12 * entry);

      if (!active || reduced) return;

      // slow counter-drift of the implied cap flesh: parallax, not rotation of
      // the chamber itself (the gills never spin)
      ceiling.mesh.rotation.y += dt * 0.0016 * motion;
      axisMass.mesh.rotation.y -= dt * 0.0022 * motion;
    },

    setHover(id) {
      if (hovered === id) return;
      hovered = id || null;
      if (id === 'community') nodes.community.driver.fire();
      else if (id === 'ados') { nodes.ados.inDriver.fire(); nodes.ados.armed = true; }
      else if (id === 'hivemind') { nodes.hivemind.driver.fire(); nodes.hivemind.reFire = 4.5; }
    },

    setSelected(id) {
      selected = id || null;
      if (id === 'community') nodes.community.driver.fire();
      else if (id === 'ados') { nodes.ados.inDriver.fire(); nodes.ados.armed = true; }
      else if (id === 'hivemind') { nodes.hivemind.driver.fire(); nodes.hivemind.reFire = 4.5; }
    },

    trigger(name) {
      if (name === 'pulse' || name === 'ctaPulse') outDriver.fire();
    },

    setQuality(tier) {
      if (tier === quality) return;
      quality = tier;
      const low = tier === 2;
      const res = RES[low ? 2 : 1];

      // gills: primaries always survive (they ARE the architecture); the
      // lamellulae and the grid resolution take the cut
      rebuildBatch('primary', SPECS.primary, res.primary[0], res.primary[1]);
      const sec = low
        ? SPECS.secondary.filter((s, i) => s.region > 0 || i % 2 === 0)
        : SPECS.secondary;
      rebuildBatch('secondary', sec, res.secondary[0], res.secondary[1]);
      if (low) {
        batches.tertiary.mesh.visible = false;
      } else {
        batches.tertiary.mesh.visible = true;
        rebuildBatch('tertiary', SPECS.tertiary, res.tertiary[0], res.tertiary[1]);
      }

      // cross-veins
      veins.lines.geometry.dispose();
      veins.lines.geometry = buildVeinGeo(low ? Math.round(VEIN_FULL * 0.4) : VEIN_FULL);

      // braid tessellation
      hive.mesh.geometry.dispose();
      hive.mesh.geometry = buildHiveGeo(low ? 56 : 110);

      // spores
      spores.pts.geometry.dispose();
      spores.pts.geometry = buildSporeGeo(low ? Math.round(SPORE_FULL * 0.42) : SPORE_FULL);
      sporeMat.uniforms.uSize.value = low ? 24 : 30;

      // one fewer independent regional exchange on the reduced tier
      ambCount = low ? 2 : 3;
      for (const m of memPoints) m.s.visible = true;
      ceiling.mesh.visible = true;
    },

    dispose() {
      group.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          // maps from helpers.glowSprite/softDisc are shared module-singleton
          // caches — never dispose them here; chapter-owned textures live in
          // `disposables`
          for (const m of mats) { m.dispose?.(); }
        }
      });
      for (const d of disposables) d.dispose?.();
      gillMat.dispose();
      veinMat.dispose();
      adosMat.dispose();
      hiveMat.dispose();
      sporeMat.dispose();
      group.clear();
    },
  };

  if (ctx.tier === 2) api.setQuality(2);
  return api;
}
