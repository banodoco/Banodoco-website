// journey-v6 — INSPIRE chapter geometry: the three spore exits.
// Adapted from spike-a/plumes.js (approved at G2a) into the grey-box build:
// the spike stays frozen, this is the copy the journey drives. Changes vs the
// spike: the 4th reveal channel (the backlit gill band) is wired through
// setReveal(), the sequential reveal is driven from journey progress + camera
// azimuth here rather than by the spike's director, and the group arms/retires
// on the T1 seam.
// Three spore-exit regions on the REAR rim of the real hero cap. Behaviour
// adapted from journey/chapters/inspire.js (staged GPU phase shader) but
// re-parameterised against the hero's actual anatomy via anatomy.js:
//   born BETWEEN GILLS under the cap -> lateral travel to the margin ->
//   curl around the rim in local airflow -> braided turbulent rise leaning
//   with the +x breeze. A cohort drops and fades; a cohort circles; nothing
//   is a fountain, and nothing touches the cap top.
// Everything parents to groups.mushroom, so it is authored in cap-local
// coordinates with capUnderPt()/rimRad() and inherits cap bend + sway free.
//
// CONCEPTUAL CONTINUITY (Hannah, 2026-08-02): there is ONE spore population.
// The plume spores do not appear alongside the hero's ambient shed — they ARE
// it, evolving. Three cooperating pieces, all pure functions of (effective
// reveal, time) so reverse scroll plays the transformation backward:
//   1. arrival ramps (see ARR below) make each exit's reveal continuous in
//      scroll position instead of stepping at the T1 seam;
//   2. the spore vertex shader's handoff block starts every particle as a
//      member of the hero's drift (same origins, same breeze law) and gathers
//      it onto the staged braid as the reveal rises;
//   3. inspire-ambient.js dims the hero shed as-and-where the structured
//      plume brightens, and restores it byte-exactly at p = 0.
//
// RIVER DELTA (Hannah, 2026-08-02, third note — the definitive fix): the hero
// shows exactly ONE visible stream, the shed spilling from under the
// back-right rim (ArtCompute's sector). So nothing may ever be BORN in the
// Arca or 2RP sectors — however gently it fades in, a population appearing
// rear-centre or back-left reads as a newcomer. Instead the one stream SPLITS:
//   - every Arca and 2RP particle is born in the SOURCE sector (same under-rim
//     wedge the visitor has been watching) and, as its plume's reveal rises, a
//     visible current of them peels off and WALKS THE RIM — hugging the real
//     rim anatomy (rimRadG/rimYG in-shader) — to its release sector, arriving,
//     turning upward, and only then rising as the braid;
//   - the walk front is a pure function of the reveal (advances ~rev 0..0.55,
//     the rise draws on rev 0.55..1), so scrubbing backward re-merges the
//     delta into the one stream;
//   - at rest the walk stage stays in every migrating particle's cycle, plus
//     faint authored rim-current strands (2b), so the three plumes remain
//     visibly fed by the one shared source even in a still frame.
// The braided rise itself (the approved rest look) is untouched: same rim
// entry points, same braid math, same knots, ribbons and streak.
import * as THREE from 'three';
import {
  makeRng, gaussOf, heat, capUnderPt, capTopPt, rimRad,
  makeGlowTexture, makeStreakTexture, EXITS, LEAN_DIR,
} from '../core/anatomy.js';
import { createAmbientShedDimmer } from './inspire-ambient.js';

const TAU = Math.PI * 2;
const N_GILL_CHANNELS = 230;                 // the hero's gill count
const CHANNEL = TAU / N_GILL_CHANNELS;
const FOG_NEAR = 7.0, FOG_FAR = 20.0;
const BREEZE = new THREE.Vector3(1.0, 0.62, 0.17).normalize();

const tmpC = new THREE.Color();

// ---------- shared faint-line material (sources / wisps / cap flow) ----------
function makeStrandMat(opacity, flow) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uOpacity: { value: opacity },
      uFade: { value: 0 },
      uTime: { value: 0 },
      uFlow: { value: flow },
      // W4-A hover trace-back: uTrace is the sweep parameter (0 -> 1 walks the
      // band from aProg = 1 BACKWARD to aProg = 0; parked far out = off),
      // uTraceAmp its brightness. Driven per-exit from the animator.
      uTrace: { value: 9.0 },
      uTraceAmp: { value: 0 },
      fogNear: { value: FOG_NEAR },
      fogFar: { value: FOG_FAR },
    },
    vertexShader: `
      attribute float aProg;
      varying vec3 vColor;
      varying float vFogDepth;
      varying float vBright;
      varying float vNear;
      uniform float uTime;
      uniform float uFlow;
      uniform float uTrace;
      uniform float uTraceAmp;
      uniform float uFade;
      void main() {
        vColor = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vFogDepth = -mv.z;
        // near-camera fade: the lens passes through clean air (G2a v2)
        vNear = smoothstep(0.9, 1.9, length(mv.xyz));
        // travelling bioluminescent wave, moving along the strand toward
        // aProg = 1 (the rim / the release point)
        float wave = 0.62 + 0.38 * sin(6.2832 * (aProg * 1.9 - uTime * 0.11));
        // hover trace-back: a bright band sweeping from the release point
        // BACKWARD along the strand to the gill sector of origin (IN-4.1)
        float band = exp(-pow((aProg - (1.0 - uTrace)) * 11.0, 2.0));
        vBright = mix(1.0, wave, uFlow) + uTraceAmp * band;
        // draw-on (ride-through #2, one-population rule): a strand GROWS from
        // its origin as the drift organizes — a full-length line appearing at
        // once reads as a new spore source. Saturates past uFade = 1 so the
        // approved rest look is untouched.
        float lead = uFade * 1.12;
        vBright *= 1.0 - smoothstep(max(lead - 0.10, 0.0), lead + 0.001, aProg);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      uniform float uFade;
      uniform float fogNear;
      uniform float fogFar;
      varying vec3 vColor;
      varying float vFogDepth;
      varying float vBright;
      varying float vNear;
      void main() {
        float fogF = clamp((fogFar - vFogDepth) / (fogFar - fogNear), 0.0, 1.0);
        gl_FragColor = vec4(vColor * vBright * uOpacity * uFade * fogF * vNear, 1.0);
      }
    `,
    vertexColors: true,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}

function strandGeo(positions, colors, progs) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('aProg', new THREE.Float32BufferAttribute(progs, 1));
  return geo;
}

export function createInspire(sceneApi) {
  const rand = makeRng(7741);
  const gauss = () => gaussOf(rand);
  // Second deterministic stream for the delta-redesign geometry (migration
  // lanes + rim-current strands): the approved braids are shaped by the FIRST
  // stream's exact draw order, so new randomness must never interleave with it.
  const rand2 = makeRng(4413);
  const gauss2 = () => gaussOf(rand2);
  const group = new THREE.Group();
  group.visible = false;
  sceneApi.groups.mushroom.add(group);

  const glowTex = makeGlowTexture();
  const streakTex = makeStreakTexture();
  const counts = { sourceSegs: 0, wispSegs: 0, flowSegs: 0, gillSegs: 0, beads: 0, spores: 0, coreSegs: 0, rimSegs: 0 };

  // per-exit fade drivers (sequential reveal)
  const exits = EXITS.map((spec) => ({ spec, fade: 0, target: 0, mats: [] }));
  // v2: a 4th reveal channel — the backlit gill band on the LIFTED rim
  // (cap a ~ LEAN_DIR - pi ~ 26 deg), which faces the camera through the
  // az 60..120 middle of the swing. Not an exit: no plume, no chip — just
  // the under-rim filaments igniting so the middle of the arc has structure.
  const gillBand = { fade: 0, target: 0, mats: [] };

  /* ================================================================
     1. UNDER-RIM SOURCE GEOMETRY — brightened gill filaments + embers
        in each exit sector (hidden until orbit; front view untouched)
     ================================================================ */
  for (const ex of exits) {
    const { az } = ex.spec;
    const lp = [], lc = [], lg = [];
    const bp = [], bc = [], bs = [];
    const N_FIL = 56;
    for (let f = 0; f < N_FIL; f++) {
      // snap to a real gill channel so the light sits BETWEEN lamellae
      const lane = Math.round((gauss() * 0.30) / CHANNEL) * CHANNEL
                 + (rand() - 0.5) * CHANNEL * 0.35;
      const a = az + lane;
      const u0 = 0.52 + rand() * 0.22;
      const wig = gauss() * 0.012;
      const SEG = 5;
      let prev = null, prevU = 0;
      for (let s = 0; s <= SEG; s++) {
        const t = s / SEG;
        const u = u0 + t * (1.0 - u0);
        const p = capUnderPt(u, a + wig * Math.sin(t * Math.PI));
        p.y -= 0.008 + 0.012 * rand();       // just beneath the gill surface
        if (prev) {
          lp.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
          const b0 = 0.30 + 0.55 * prevU, b1 = 0.30 + 0.55 * t;
          heat(b0, tmpC); lc.push(tmpC.r, tmpC.g, tmpC.b);
          heat(b1, tmpC); lc.push(tmpC.r, tmpC.g, tmpC.b);
          lg.push(prevU, t);
          counts.sourceSegs++;
        }
        prev = p; prevU = t;
      }
      // ember bead at the release lip
      if (rand() < 0.55) {
        const p = capUnderPt(0.985 + rand() * 0.03, a);
        p.y -= 0.01;
        bp.push(p.x, p.y, p.z);
        heat(0.68 + rand() * 0.22, tmpC);
        bc.push(tmpC.r, tmpC.g, tmpC.b);
        bs.push(0.02 + Math.pow(rand(), 2) * 0.045);
        counts.beads++;
      }
    }
    const mat = makeStrandMat(0.5, 1.0); // sources carry the travelling flow
    ex.mats.push(mat);
    ex.srcMat = mat;                     // trace-back target (rim -> inner gills)
    group.add(new THREE.LineSegments(strandGeo(lp, lc, lg), mat));

    // beads: small additive points with the same fade
    const bGeo = new THREE.BufferGeometry();
    bGeo.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
    bGeo.setAttribute('color', new THREE.Float32BufferAttribute(bc, 3));
    bGeo.setAttribute('psize', new THREE.Float32BufferAttribute(bs, 1));
    const bMat = makeBeadMat();
    ex.mats.push(bMat);
    group.add(new THREE.Points(bGeo, bMat));
  }

  function makeBeadMat() {
    return new THREE.ShaderMaterial({
      uniforms: {
        map: { value: glowTex }, uFade: { value: 0 }, uTime: { value: 0 },
        fogNear: { value: FOG_NEAR }, fogFar: { value: FOG_FAR },
      },
      vertexShader: `
        #define MIN_PT 1.7
        attribute float psize;
        varying vec3 vColor;
        varying float vFogDepth;
        varying float vShrink;
        varying float vNear;
        varying float vOn;
        uniform float uTime;
        uniform float uFade;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vFogDepth = -mv.z;
          vNear = smoothstep(0.9, 1.9, length(mv.xyz));
          // draw-on (ride-through #2): beads condense one by one as the drift
          // organizes — a full string appearing at once reads as a new source.
          // Hash-staggered thresholds; all fully on at uFade = 1 (rest intact).
          float hb = fract(sin(dot(position.xz, vec2(12.9898, 78.233))) * 43758.5453);
          vOn = smoothstep(hb * 0.85, hb * 0.85 + 0.15, uFade);
          float tw = 0.85 + 0.15 * sin(uTime * 1.7 + position.x * 31.0);
          float sz = psize * tw * (300.0 / -mv.z);
          vShrink = 1.0;
          if (sz < MIN_PT) { vShrink = (sz * sz) / (MIN_PT * MIN_PT); sz = MIN_PT; }
          gl_PointSize = sz;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform float uFade;
        uniform float fogNear;
        uniform float fogFar;
        varying vec3 vColor;
        varying float vFogDepth;
        varying float vShrink;
        varying float vNear;
        varying float vOn;
        void main() {
          vec4 t = texture2D(map, gl_PointCoord);
          float fogF = clamp((fogFar - vFogDepth) / (fogFar - fogNear), 0.0, 1.0);
          gl_FragColor = vec4(vColor * t.a * uFade * vOn * fogF * vShrink * vNear, 1.0);
        }
      `,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false,
    });
  }

  /* ================================================================
     1b. BACKLIT GILL BAND on the lifted rim (v2, sparse-middle fix) —
         brightened between-gill filaments spanning the gill-exposed
         sector the map calls "the entry side". Faint, wide, no plume.
     ================================================================ */
  {
    const az0 = LEAN_DIR - Math.PI;           // the lifted-rim centre, ~26 deg
    const lp = [], lc = [], lg = [];
    const bp = [], bc = [], bs = [];
    const N_FIL = 46;
    for (let f = 0; f < N_FIL; f++) {
      const lane = Math.round((gauss() * 0.60) / CHANNEL) * CHANNEL
                 + (rand() - 0.5) * CHANNEL * 0.35;
      const a = az0 + lane;
      const u0 = 0.50 + rand() * 0.26;
      const wig = gauss() * 0.012;
      const SEG = 5;
      let prev = null, prevU = 0;
      for (let s = 0; s <= SEG; s++) {
        const t = s / SEG;
        const u = u0 + t * (1.0 - u0);
        const p = capUnderPt(u, a + wig * Math.sin(t * Math.PI));
        p.y -= 0.008 + 0.012 * rand();
        if (prev) {
          lp.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
          const b0 = 0.26 + 0.46 * prevU, b1 = 0.26 + 0.46 * t;
          heat(b0, tmpC); lc.push(tmpC.r, tmpC.g, tmpC.b);
          heat(b1, tmpC); lc.push(tmpC.r, tmpC.g, tmpC.b);
          lg.push(prevU, t);
          counts.gillSegs++;
        }
        prev = p; prevU = t;
      }
      if (rand() < 0.30) {
        const p = capUnderPt(0.985 + rand() * 0.03, a);
        p.y -= 0.01;
        bp.push(p.x, p.y, p.z);
        heat(0.60 + rand() * 0.20, tmpC);
        bc.push(tmpC.r, tmpC.g, tmpC.b);
        bs.push(0.016 + Math.pow(rand(), 2) * 0.034);
        counts.beads++;
      }
    }
    const mat = makeStrandMat(0.34, 1.0);
    gillBand.mats.push(mat);
    group.add(new THREE.LineSegments(strandGeo(lp, lc, lg), mat));
    const bGeo = new THREE.BufferGeometry();
    bGeo.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
    bGeo.setAttribute('color', new THREE.Float32BufferAttribute(bc, 3));
    bGeo.setAttribute('psize', new THREE.Float32BufferAttribute(bs, 1));
    const bMat = makeBeadMat();
    gillBand.mats.push(bMat);
    group.add(new THREE.Points(bGeo, bMat));
  }

  /* ================================================================
     2. AUTHORED AIRFLOW — faint wisp guides tracing the actual path:
        between-gills -> rim -> curl -> rise. The air made visible.
     ================================================================ */
  for (const ex of exits) {
    const { az, riseMin, riseMax, lean } = ex.spec;
    const lp = [], lc = [], lg = [];
    const N_WISP = 4;
    for (let w = 0; w < N_WISP; w++) {
      const a0 = az + gauss() * 0.16;
      const u0 = 0.55 + rand() * 0.18;
      const o = capUnderPt(u0, a0);
      const rim = capUnderPt(1.0, a0);
      const rimR = rimRad(a0);
      const curl = (0.55 + rand() * 0.5) * (rand() < 0.5 ? 1 : -1) * 0.5;
      const rise = riseMin + rand() * (riseMax - riseMin);
      const sp = rand() * TAU;
      const pts = [];
      const SEG = 30;
      for (let s = 0; s <= SEG; s++) {
        const t = s / SEG;
        let p;
        if (t < 0.22) {                       // between the gills, drifting out
          const k = t / 0.22;
          p = capUnderPt(u0 + (1 - u0) * k * 0.45, a0 + 0.02 * Math.sin(k * 3));
          p.y -= 0.02 + 0.05 * k;
        } else if (t < 0.42) {                // lateral travel to the margin
          const k = (t - 0.22) / 0.2;
          const u = u0 + (1 - u0) * (0.45 + 0.55 * k);
          p = capUnderPt(u, a0);
          p.y -= 0.07 * (1 - k) + 0.02;
        } else if (t < 0.58) {                // curl around the rim
          const k = (t - 0.42) / 0.16;
          const aa = a0 + curl * k;
          const rr = rimR + 0.06 + 0.10 * Math.sin(k * Math.PI);
          p = new THREE.Vector3(Math.cos(aa) * rr, rim.y + 0.10 * k + 0.06 * Math.sin(k * 6 + sp), Math.sin(aa) * rr);
        } else {                              // braided rise, leaning +x
          const k = (t - 0.58) / 0.42;
          const aa = a0 + curl + 0.30 * Math.sin(k * 4.2 + sp);
          const rr = rimR + 0.06 + 0.22 * Math.sin(k * 3.1 + sp * 1.7);
          const y = rim.y + 0.10 + k * k * rise;
          p = new THREE.Vector3(Math.cos(aa) * rr, y, Math.sin(aa) * rr);
          p.x += BREEZE.x * lean * k * k * rise * 0.8;
          p.z += BREEZE.z * lean * k * k * rise * 0.8;
        }
        pts.push({ p, t });
      }
      for (let s = 0; s < SEG; s++) {
        const A = pts[s], B = pts[s + 1];
        lp.push(A.p.x, A.p.y, A.p.z, B.p.x, B.p.y, B.p.z);
        const fadeTop = (tt) => 1 - Math.pow(Math.max(0, (tt - 0.50) / 0.50), 1.15) * 0.95;
        heat(0.52 * fadeTop(A.t) + 0.1, tmpC); lc.push(tmpC.r, tmpC.g, tmpC.b);
        heat(0.52 * fadeTop(B.t) + 0.1, tmpC); lc.push(tmpC.r, tmpC.g, tmpC.b);
        lg.push(A.t, B.t);
        counts.wispSegs++;
      }
    }
    const mat = makeStrandMat(0.15, 1.0);
    ex.mats.push(mat);
    ex.wispMat = mat;                    // trace-back target (full path, plume -> gills)
    group.add(new THREE.LineSegments(strandGeo(lp, lc, lg), mat));
  }

  /* ================================================================
     2b. RIM DELTA CURRENTS (Hannah's river-delta redesign) — faint
         authored strands ALONG the rim, linking the shared under-rim
         source to the Arca and 2RP release sectors. They draw on with
         the walking spore front (fade driven per-frame from the same
         mig() curve the shader uses), and they PERSIST at rest at low
         opacity, so the one-source truth stays legible in a still
         frame. Same faint-line language as the wisps; carries the
         travelling flow wave so the link visibly flows outward.
     ================================================================ */
  const rimLinks = [];
  {
    const SEGL = 34, N_LINE = 3;
    const linkSpecs = [
      { from: EXITS[0].az, to: EXITS[1].az },   // source -> Arca (rear-centre)
      { from: EXITS[1].az, to: EXITS[2].az },   // …continuing on -> 2RP (back-left)
    ];
    for (const lk of linkSpecs) {
      const lp = [], lc = [], lg = [];
      for (let l = 0; l < N_LINE; l++) {
        const offR = 0.04 + l * 0.05 + rand2() * 0.03;
        const offY = -0.02 + l * 0.045 + rand2() * 0.02;
        const ph = rand2() * TAU;
        let prev = null, prevT = 0;
        for (let s = 0; s <= SEGL; s++) {
          const tt = s / SEGL;
          const az = lk.from + (lk.to - lk.from) * tt;
          const rr = rimRad(az) + offR + 0.05 * Math.sin(tt * 9 + ph);
          const rim = capUnderPt(1.0, az);
          const p = new THREE.Vector3(
            Math.cos(az) * rr,
            rim.y + 0.06 + offY + 0.04 * Math.sin(tt * 12 + ph * 1.3),
            Math.sin(az) * rr);
          if (prev) {
            lp.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
            heat(0.32 + 0.18 * Math.sin(Math.PI * prevT), tmpC);
            lc.push(tmpC.r, tmpC.g, tmpC.b);
            heat(0.32 + 0.18 * Math.sin(Math.PI * tt), tmpC);
            lc.push(tmpC.r, tmpC.g, tmpC.b);
            lg.push(prevT, tt);
            counts.rimSegs++;
          }
          prev = p; prevT = tt;
        }
      }
      const mat = makeStrandMat(0.12, 1.0);
      group.add(new THREE.LineSegments(strandGeo(lp, lc, lg), mat));
      rimLinks.push({ mat });
    }
  }
  // The strands' draw-on follows the walking front. mig mirrors the shader's
  // smoothstep(0, 0.55, rev); MIG_SPLIT is where 2RP's longer walk passes the
  // Arca sector, so link B only begins once a current actually continues past.
  const MIG_SPLIT = Math.abs(EXITS[1].az - EXITS[0].az)
                  / Math.abs(EXITS[2].az - EXITS[0].az);
  function migOf(e) {
    let x = e / 0.55; x = x < 0 ? 0 : x > 1 ? 1 : x;
    return x * x * (3 - 2 * x);
  }
  function linkFades() {
    const m1 = migOf(eff[1]), m2 = migOf(eff[2]);
    const fA = Math.max(m1, Math.min(m2 / MIG_SPLIT, 1));
    let fB = (m2 - MIG_SPLIT) / (1 - MIG_SPLIT);
    fB = fB < 0 ? 0 : fB > 1 ? 1 : fB;
    return [fA, fB];
  }

  /* ================================================================
     3. CAP-SURFACE FLOW — a faint travelling glow on the rear dome,
        flowing toward each exit sector (handoff: "the cap surface
        carries a faint travelling bioluminescent flow")
     ================================================================ */
  for (const ex of exits) {
    const { az } = ex.spec;
    const lp = [], lc = [], lg = [];
    const N_STRIP = 7;
    for (let f = 0; f < N_STRIP; f++) {
      const a = az + gauss() * 0.22;
      const wig = gauss() * 0.03;
      const SEG = 9;
      let prev = null, prevT = 0;
      for (let s = 0; s <= SEG; s++) {
        const t = s / SEG;
        const u = 0.38 + t * 0.64;
        const p = capTopPt(u, a + wig * Math.sin(t * 2.2));
        p.y += 0.015;
        if (prev) {
          lp.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
          const b0 = 0.24 + 0.3 * prevT, b1 = 0.24 + 0.3 * t;
          heat(b0, tmpC); lc.push(tmpC.r, tmpC.g, tmpC.b);
          heat(b1, tmpC); lc.push(tmpC.r, tmpC.g, tmpC.b);
          lg.push(prevT, t);
          counts.flowSegs++;
        }
        prev = p; prevT = t;
      }
    }
    const mat = makeStrandMat(0.12, 1.0);
    ex.mats.push(mat);
    group.add(new THREE.LineSegments(strandGeo(lp, lc, lg), mat));
  }

  /* ================================================================
     4. SPORES — staged GPU phase shader on real anatomy.
        Round-robin across the three plumes (a Tier-2 drawRange prefix
        stays plume-balanced, per the donor's lesson).
     ================================================================ */
  const SPORE_FULL = 5100;
  const SPORE_TIER2 = 2550;
  counts.spores = SPORE_FULL;
  const sporeGeo = (() => {
    const n = SPORE_FULL;
    const position = new Float32Array(n * 3);   // origin point (between gills)
    const aRim = new Float32Array(n * 3);       // (rimR, rimY, rimAz)
    const aRise = new Float32Array(n * 4);      // (riseTop, lean, curl, strandPhase)
    const aCycle = new Float32Array(n * 4);     // (period, phase0, size, tone)
    const aMisc = new Float32Array(n * 4);      // (plume, seed, coreness, azSrc)
    for (let i = 0; i < n; i++) {
      const p = i % 3;
      const spec = EXITS[p];
      // destination lane: snapped between real gill channels, inner-to-mid
      // skirt of the RELEASE sector (this shapes the approved braid entry)
      const lane = Math.round((gauss() * 0.34) / CHANNEL) * CHANNEL
                 + (rand() - 0.5) * CHANNEL * 0.4;
      const a = spec.az + lane;
      const u0 = 0.48 + Math.pow(rand(), 0.8) * 0.34;
      // RIVER DELTA: the origin is NOT the release sector. Plume 0 (ArtCompute)
      // is born in its own sector — which IS the hero's one visible stream —
      // and the migrating plumes (Arca, 2RP) are born in that SAME source
      // sector, on their own gill lanes, and walk the rim out to `a`.
      const srcLane = Math.round((gauss2() * 0.34) / CHANNEL) * CHANNEL
                    + (rand2() - 0.5) * CHANNEL * 0.4;
      const aSrc = p === 0 ? a : EXITS[0].az + srcLane;
      const o = capUnderPt(u0, aSrc);
      o.y -= 0.015 + rand() * 0.05;
      position[i * 3] = o.x; position[i * 3 + 1] = o.y; position[i * 3 + 2] = o.z;

      const rim = capUnderPt(1.0, a);
      const rr = rimRad(a) + 0.03 + rand() * 0.10;
      aRim[i * 3] = rr;
      aRim[i * 3 + 1] = rim.y - 0.02 + rand() * 0.06;
      aRim[i * 3 + 2] = a;

      const isDrop = rand() < 0.15;
      const rise = spec.riseMin + rand() * (spec.riseMax - spec.riseMin);
      aRise[i * 4] = isDrop ? -(0.5 + rand() * 1.1)      // sink below the rim
                            : rise;                       // rise above it
      aRise[i * 4 + 1] = spec.lean * (0.8 + rand() * 0.45);
      // each plume is a braid of THREE winding cores, not a uniform tube:
      // particles bunch onto one of three strands (quantized phase + curl),
      // which is what makes the braid resolve at viewing distance
      const strand = i % 9 < 3 ? 0 : (i % 9 < 6 ? 1 : 2);
      aRise[i * 4 + 2] = (strand - 1) * 0.30 + gauss() * 0.09;  // rim curl per core
      aRise[i * 4 + 3] = strand * 2.094 + gauss() * 0.3;        // braid phase per core

      aCycle[i * 4] = 7.0 + rand() * 8.5;                 // period: many velocities
      aCycle[i * 4 + 1] = rand();
      // size cohorts: dust / mid / a few bright knots
      const szR = rand();
      aCycle[i * 4 + 2] = szR < 0.75 ? 0.026 + rand() * 0.032
                        : szR < 0.96 ? 0.060 + rand() * 0.035
                        : 0.090 + rand() * 0.050;
      aCycle[i * 4 + 3] = Math.min(1, spec.tone + gauss() * 0.10 + (szR > 0.96 ? 0.2 : 0));

      aMisc[i * 4] = p;
      aMisc[i * 4 + 1] = rand() * 1000;
      // W4-A gap a: a core cohort rides TIGHT on its winding strand — reduced
      // scatter, hotter, carrying the knot cadence — so each braid resolves as
      // a defined sinuous core (the approved still) instead of a soft column.
      // The loose majority keeps the turbulent sheath around it.
      const coreR = rand();
      aMisc[i * 4 + 2] = coreR < 0.32 ? 0.55 + rand() * 0.45 : 0.0;
      aMisc[i * 4 + 3] = aSrc;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(position, 3));
    geo.setAttribute('aRim', new THREE.BufferAttribute(aRim, 3));
    geo.setAttribute('aRise', new THREE.BufferAttribute(aRise, 4));
    geo.setAttribute('aCycle', new THREE.BufferAttribute(aCycle, 4));
    geo.setAttribute('aMisc', new THREE.BufferAttribute(aMisc, 4));
    return geo;
  })();

  const sporeMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uMap: { value: glowTex },
      uLean: { value: 1.0 },
      uRev: { value: new THREE.Vector3(0, 0, 0) },
      uCoh: { value: new THREE.Vector3(0, 0, 0) },
      // per-plume knot-cadence gain (W4-A gap a), from the anatomy map
      uKnot: { value: new THREE.Vector3(EXITS[0].knot, EXITS[1].knot, EXITS[2].knot) },
      uHeatA: { value: heat(0.55, new THREE.Color()).clone() },
      uHeatB: { value: heat(0.92, new THREE.Color()).clone() },
      fogNear: { value: FOG_NEAR },
      fogFar: { value: FOG_FAR },
    },
    vertexShader: `
      #define MIN_PT 1.7
      attribute vec3 aRim;    // rimR, rimY, rimAz
      attribute vec4 aRise;   // riseTop(+)/sink(-), lean, curl, strandPhase
      attribute vec4 aCycle;  // period, phase0, size, tone
      attribute vec4 aMisc;   // plume, seed, coreness, azSrc
      uniform float uTime;
      uniform float uLean;
      uniform vec3 uRev;
      uniform vec3 uCoh;
      uniform vec3 uKnot;
      varying float vAlpha;
      varying float vTone;
      varying float vFogDepth;
      varying float vShrink;
      float hash(float n) { return fract(sin(n) * 43758.5453); }
      // the hero scene's one air current (mushroom-scene §10b), normalized —
      // the drift state below must move on the same wind the visitor watched
      const vec3 SHED_BREEZE = vec3(0.8414, 0.5217, 0.1430);
      // real rim anatomy in-shader (byte-mirrors core/anatomy.js rimRad and
      // capUnderPt(1, a)): the delta migration must HUG the actual rim as its
      // azimuth changes, not a circle of constant radius
      float rimRadG(float a) {
        return 2.35 * (1.0 + 0.09 * cos(a - 3.6)
                           + 0.045 * cos(2.0 * a - 1.1)
                           + 0.018 * sin(3.0 * a + 4.1));
      }
      float rimYG(float a) {
        float fold = exp(-pow(atan(sin(a - 5.3), cos(a - 5.3)) / 0.35, 2.0));
        float yoff = -0.16 * cos(a - 3.6) + 0.05 * cos(2.0 * a + 0.7) - 0.13 * fold;
        float droop = -(0.11 + 0.05 * cos(a - 3.6));
        return 3.15 + 0.03 + yoff + droop - 0.11;
      }

      void main() {
        float plume = aMisc.x;
        float seed = aMisc.y;
        float core = aMisc.z;
        float rev = plume < 0.5 ? uRev.x : (plume < 1.5 ? uRev.y : uRev.z);
        float coh = plume < 0.5 ? uCoh.x : (plume < 1.5 ? uCoh.y : uCoh.z);
        float knotG = plume < 0.5 ? uKnot.x : (plume < 1.5 ? uKnot.y : uKnot.z);
        float settle = 1.0 - 0.4 * coh;
        float knotV = 0.0;      // knot-cadence brightness, set in the rise stage

        float t = fract(uTime / aCycle.x + aCycle.y);
        float h1 = hash(seed * 12.9898);
        float h2 = hash(seed * 78.233 + 1.0);
        float rimR = aRim.x, rimY = aRim.y, az0 = aRim.z;
        float isDrop = step(aRise.x, 0.0);
        float riseTop = abs(aRise.x);
        float lean = aRise.y, curl = aRise.z, sp = aRise.w;

        // ---- RIVER DELTA (Hannah's third note): plumes 1 and 2 are MIGRANTS.
        // They are born in the source sector (azSrc, the one stream the hero
        // shows) and walk the rim to az0. The walk front is a pure function of
        // this plume's reveal: rev 0..0.55 extends the current around the rim,
        // rev 0.55..1 draws the rise on upward at the release point. Both
        // gates saturate at rev = 1, so the approved rest braid is untouched
        // and reverse scroll re-merges the delta into the one stream.
        float azSrc = aMisc.w;
        float migF = step(0.5, plume);
        float mig = smoothstep(0.0, 0.55, rev);                 // walk-front extent
        float rg = migF > 0.5 ? smoothstep(0.55, 1.0, rev) : 1.0; // rise draw-on
        float s1 = mix(0.16, 0.10, migF);
        float s2 = mix(0.40, 0.24, migF);
        float azS2 = azSrc + (h1 - 0.5) * 0.05;                 // lateral-stage exit heading
        float span = (az0 + curl) - azS2;                       // signed walk, incl. braid entry
        float circleLen = (0.10 + h2 * 0.22) * mix(1.0, 0.62, coh);
        float s3 = migF > 0.5
          ? s2 + 0.12 + 0.10 * abs(span) + (h2 - 0.5) * 0.06
          : min(0.86, s2 + circleLen);

        vec3 p;
        float alpha;
        // cylindrical about the stipe axis
        float r, y, az;
        float xLean = 0.0, zLean = 0.0;
        if (t < s1) {
          // born between the gills: a slow shimmer in place, drifting down a
          // hair. Migrants shimmer a touch dimmer — three plumes' worth of
          // births now share the ONE source wedge, and it must glow, not blow out.
          float u0 = t / s1;
          r = length(position.xz) + sin(uTime * 0.5 + seed) * 0.03 * settle;
          y = position.y - 0.05 * u0 + sin(uTime * 0.6 + seed * 1.3) * 0.015;
          az = atan(position.z, position.x) + sin(uTime * 0.35 + seed * 2.1) * 0.012;
          alpha = smoothstep(0.0, 0.45, u0) * 0.85 * mix(1.0, 0.72, migF);
        } else if (t < s2) {
          // lateral travel between the lamellae toward the margin — migrants
          // head for the SOURCE sector's rim (their walk starts there), the
          // resident plume for its own release rim, exactly as approved
          float u1 = smoothstep(0.0, 1.0, (t - s1) / (s2 - s1));
          float rT = migF > 0.5 ? rimRadG(azSrc) + 0.05 : rimR;
          float yT = migF > 0.5 ? rimYG(azSrc) + (rimY - rimYG(az0)) : rimY;
          r = mix(length(position.xz), rT, u1);
          y = mix(position.y - 0.05, yT, u1) - 0.10 * sin(u1 * 3.14159) ;
          az = mix(atan(position.z, position.x) + (h1 - 0.5) * 0.05 * u1,
                   azS2, u1 * migF);
          alpha = 0.95 * mix(1.0, 0.72, migF);
        } else if (t < s3) {
          float u2 = (t - s2) / max(s3 - s2, 1e-4);
          if (migF > 0.5) {
            // RIM MIGRATION — the delta current. The particle walks the real
            // rim from the source sector to its release sector, clamped at
            // the reveal's advancing front: the current visibly EXTENDS around
            // the rim as the orbit progresses (and retreats in reverse).
            // Travelling brightness pulses run with the flow so the current
            // reads as moving spores, not a static string.
            float w = mix(u2, u2 * u2 * (3.0 - 2.0 * u2), 0.35);
            float wFront = clamp(mig * 1.12 - h1 * 0.10, 0.0, 1.0);
            float we = min(w, wFront);
            az = azS2 + span * we;
            float offR = rimR - rimRadG(az0);
            float offY = rimY - rimYG(az0);
            float bobE = sin(3.14159 * we);       // wobble fades at both ends
            r = rimRadG(az) + mix(0.05, offR + 0.05, we)
              + sin(we * 9.0 + sp) * 0.07 * settle * bobE;
            y = rimYG(az) + offY + 0.10 * smoothstep(0.72, 1.0, we)
              + sin(we * 12.0 + sp * 1.3 + uTime * 0.4) * 0.05 * settle * bobE;
            float pulse = pow(0.5 + 0.5 * sin(we * 7.0 - uTime * 0.9 + sp), 2.0);
            alpha = (0.55 + 0.45 * pulse)
                  * (1.0 - smoothstep(0.0, 0.10, w - wFront)); // the current's live tip
          } else {
            // resident plume: curl around the rim margin in local airflow
            az = az0 + curl * u2 * mix(1.0, 0.5, coh);
            float loops = 1.0 + h2 * 1.2;
            r = rimR + 0.05 + sin(u2 * 3.14159 * loops + sp) * 0.10 * settle;
            y = rimY + sin(u2 * 3.14159 * loops * 0.7 + 1.0 + sp) * 0.08 * settle + 0.10 * u2;
            alpha = 1.0;
          }
        } else {
          // braided rise (or sinking drop), carried by the +x breeze
          float u3 = (t - s3) / max(1.0 - s3, 1e-4);
          float eu = smoothstep(0.0, 0.10, u3);
          if (isDrop > 0.5) {
            y = rimY + 0.10 - u3 * u3 * riseTop;
            az = az0 + curl + (h1 - 0.5) * 0.3 * u3;
            r = rimR + 0.05 + u3 * (0.3 + h2 * 0.4);
            alpha = eu * (1.0 - smoothstep(0.45, 0.95, u3)) * 0.5;
          } else {
            float h = pow(u3, 0.6 + h1 * 0.5);           // many rise velocities
            y = rimY + 0.10 + h * riseTop;
            // braid: coherent winding cores, jitter growing with height.
            // Core-cohort particles (W4-A gap a) damp their own wander and
            // scatter hard, so the winding core reads as a defined sinuous
            // line inside the loose sheath the majority still carries.
            // SHEATH is the W5 grade-unification taste knob (W4-A's open
            // item): the approved still's sheaths are tighter columns, so
            // the per-particle scatter is narrowed. ONLY the scatter terms
            // carry it - the winding terms are shared verbatim with the
            // core-ribbon shader (4b), which must keep threading the braid.
            #define SHEATH 0.72
            float tight = mix(1.0, 0.30, core);
            az = az0 + curl
               + (0.13 * sin(h * 5.1 + sp) + 0.07 * sin(h * 9.7 + sp * 2.3 + uTime * 0.21)) * settle
               + 0.03 * sin(uTime * 0.13 + seed * 3.7) * u3 * tight * SHEATH;
            r = rimR + 0.05
              + (0.10 * sin(h * 4.3 + sp * 1.7) + 0.05 * sin(uTime * 0.17 + seed * 2.3)) * settle
              + (h1 - 0.5) * 0.09 * (0.4 + h) * tight * SHEATH  // scatter around the core
              + h * 0.14;
            // uLean damps the +x breeze lean while the camera crosses the +x
            // sector, so plume cores never stream along the view ray.
            xLean = uLean * lean * h * h * riseTop * 0.62;
            zLean = uLean * lean * h * h * riseTop * 0.105;
            // knot cadence: hot pearls travelling UP the core with the flow
            // (phase moves with +uTime along +h), strongest on core particles,
            // per-plume gain from the anatomy map (Arca hottest)
            float kn = pow(0.5 + 0.5 * sin(h * 7.3 + sp * 1.9 - uTime * 0.55), 4.0);
            knotV = knotG * kn * (0.30 + 0.70 * core);
            alpha = eu * (1.0 - smoothstep(0.62, 1.0, u3));
          }
          // migrating plumes: the rise (and its drop cohort) draws on UPWARD
          // only once the current has arrived (rev's second half) — growing
          // from the rim exactly like the core ribbons, never appearing
          // full-height. rg = 1 for the resident plume, where the gate is
          // inert (lead 1.12 clears every u3); at rev = 1 it is inert for all.
          float rl = rg * 1.12;
          alpha *= 1.0 - smoothstep(max(rl - 0.10, 0.0), rl + 0.001, u3);
        }
        p = vec3(cos(az) * r + xLean, y, sin(az) * r + zLean);

        // ---- ONE-POPULATION HANDOFF (Hannah's conceptual-continuity note,
        // 2026-08-02). Before this plume's reveal, the particle is a member of
        // the hero's ambient shed: same under-cap origin, dropped clear of the
        // gills and carried +x by the same breeze law the visitor watched
        // during Mission (mushroom-scene §10: travel grows with age, scatter
        // spreads with travel). As the reveal rises, each particle — at its
        // own staggered moment — gathers out of that drift onto its staged
        // gill -> rim -> braid path, so the drift continuously BECOMES the
        // structured plume; the shed dimmer (inspire-ambient.js) hands the
        // hero curtain's density over in the same regions at the same rate.
        // Everything is a pure function of (reveal, time): reverse scroll
        // plays the same transformation backward. At rev = 1 the mix is
        // exactly 1 — the approved Inspire rest look is untouched.
        float dh1 = hash(seed * 3.31), dh2 = hash(seed * 5.77);
        float dh3 = hash(seed * 7.13), dh4 = hash(seed * 2.09);
        float spread = 0.07 + t * 0.78;
        vec3 driftP = position
                    + vec3(-0.03, -0.05 - 0.55 * pow(dh4, 1.5), 0.0)
                    + SHED_BREEZE * (t * 5.0)
                    + (vec3(dh1, dh2, dh3) - 0.5) * spread * vec3(2.0, 1.5, 1.2);
        // drift alpha mirrors the shed's envelope: born at the gills, thinning
        // downwind; both ends sit at ~0 so the cycle wrap is invisible in
        // every mix state
        float driftA = 0.8 * smoothstep(0.0, 0.06, t)
                     * (1.0 - smoothstep(0.55, 0.95, t));
        // Migrants gather out of the drift EARLY in their window (complete by
        // rev ~ 0.55) so the rim walk is populated while the front advances;
        // the resident plume keeps the approved wide stagger. Both reach
        // exactly 1 at rev = 1.
        float mi = smoothstep(0.0, mix(0.45, 0.30, migF),
                              rev - hash(seed * 17.77) * mix(0.55, 0.28, migF));
        p = mix(driftP, p, mi);
        alpha = mix(driftA, alpha, mi);
        knotV *= mi;   // knot pearls are a property of the organized braid

        // knot + core brightening applied OUTSIDE the clamp so hot pearls can
        // exceed the base envelope; heat tone shifts toward near-white at
        // knots. The structural gains ride the morph: a particle still in the
        // drift carries no core/knot identity yet.
        vAlpha = clamp(alpha, 0.0, 1.0) * rev
               * (1.0 + 0.5 * coh) * (1.0 + (0.28 * core + 1.15 * knotV) * mi);
        vTone = min(1.0, aCycle.w + 0.34 * knotV);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vFogDepth = -mv.z;
        float sz = aCycle.z * (1.0 + 0.25 * coh + 0.30 * knotV) * (300.0 / -mv.z);
        vShrink = 1.0;
        if (sz < MIN_PT) { vShrink = (sz * sz) / (MIN_PT * MIN_PT); sz = MIN_PT; }
        gl_PointSize = sz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform sampler2D uMap;
      uniform vec3 uHeatA;
      uniform vec3 uHeatB;
      uniform float fogNear;
      uniform float fogFar;
      varying float vAlpha;
      varying float vTone;
      varying float vFogDepth;
      varying float vShrink;
      void main() {
        vec4 t = texture2D(uMap, gl_PointCoord);
        float fogF = clamp((fogFar - vFogDepth) / (fogFar - fogNear), 0.0, 1.0);
        vec3 col = mix(uHeatA, uHeatB, vTone);
        gl_FragColor = vec4(col * t.a * vAlpha * vShrink * fogF * 2.3, 1.0);
      }
    `,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  const sporePts = new THREE.Points(sporeGeo, sporeMat);
  sporePts.frustumCulled = false;
  group.add(sporePts);

  /* ================================================================
     4b. CORE RIBBONS (W4-A gap a) — one live polyline per winding core
         (3 strands x 3 plumes), evaluated in the vertex shader with the
         SAME braid math and phases as the spores, so the line threads
         exactly through its own particle strand. This is what closes
         the definition gap to the approved still: a continuous sinuous
         hot core with travelling knot pearls, inside the loose sheath.
         One draw call; nothing touches the cap top.
     ================================================================ */
  const coreMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uLean: sporeMat.uniforms.uLean,      // shared: setLeanScale damps both,
                                           // or ribbon and strand would split
      uOpacity: { value: 0.62 },
      uRev: sporeMat.uniforms.uRev,        // shared: reveal drives both
      uCoh: sporeMat.uniforms.uCoh,        // shared: hover coherence too
      uKnot: sporeMat.uniforms.uKnot,
      uLeanP: { value: new THREE.Vector3(EXITS[0].lean, EXITS[1].lean, EXITS[2].lean) },
      uToneP: { value: new THREE.Vector3(EXITS[0].tone, EXITS[1].tone, EXITS[2].tone) },
      uTrace: { value: 9.0 },
      uTraceAmp: { value: new THREE.Vector3(0, 0, 0) },
      uHeatA: sporeMat.uniforms.uHeatA,
      uHeatB: sporeMat.uniforms.uHeatB,
      fogNear: { value: FOG_NEAR },
      fogFar: { value: FOG_FAR },
    },
    vertexShader: `
      attribute float aH;     // 0..1 along the rise
      attribute vec4 aCoreP;  // curl, strandPhase, plume, rise
      attribute vec3 aRimC;   // rimR, rimY, az0
      uniform float uTime;
      uniform float uLean;
      uniform vec3 uRev;
      uniform vec3 uCoh;
      uniform vec3 uKnot;
      uniform vec3 uLeanP;
      uniform vec3 uToneP;
      uniform float uTrace;
      uniform vec3 uTraceAmp;
      varying float vBright;
      varying float vTone;
      varying float vFogDepth;
      varying float vNear;
      void main() {
        float curl = aCoreP.x, sp = aCoreP.y, plume = aCoreP.z, rise = aCoreP.w;
        float rimR = aRimC.x, rimY = aRimC.y, az0 = aRimC.z;
        float rev  = plume < 0.5 ? uRev.x  : (plume < 1.5 ? uRev.y  : uRev.z);
        float coh  = plume < 0.5 ? uCoh.x  : (plume < 1.5 ? uCoh.y  : uCoh.z);
        float kg   = plume < 0.5 ? uKnot.x : (plume < 1.5 ? uKnot.y : uKnot.z);
        float lnP  = plume < 0.5 ? uLeanP.x: (plume < 1.5 ? uLeanP.y: uLeanP.z);
        float tone = plume < 0.5 ? uToneP.x: (plume < 1.5 ? uToneP.y: uToneP.z);
        float tAmp = plume < 0.5 ? uTraceAmp.x : (plume < 1.5 ? uTraceAmp.y : uTraceAmp.z);
        float settle = 1.0 - 0.4 * coh;
        float h = aH;
        // EXACT spore braid math (rise stage), time terms included, so the
        // ribbon threads through its own particle strand frame by frame
        float az = az0 + curl
                 + (0.13 * sin(h * 5.1 + sp) + 0.07 * sin(h * 9.7 + sp * 2.3 + uTime * 0.21)) * settle;
        float r = rimR + 0.05
                + (0.10 * sin(h * 4.3 + sp * 1.7) + 0.05 * sin(uTime * 0.17 + sp * 2.3)) * settle
                + h * 0.14;
        float y = rimY + 0.10 + h * rise;
        float xL = uLean * lnP * h * h * rise * 0.62;
        float zL = uLean * lnP * h * h * rise * 0.105;
        vec3 p = vec3(cos(az) * r + xL, y, sin(az) * r + zL);
        // knot cadence (same phase as the spores) + rise envelope
        float kn = pow(0.5 + 0.5 * sin(h * 7.3 + sp * 1.9 - uTime * 0.55), 4.0) * kg;
        float env = smoothstep(0.0, 0.05, h) * (1.0 - smoothstep(0.62, 1.0, pow(h, 1.18)));
        // hover trace-back band, sweeping the core top -> rim
        float band = exp(-pow((h - (1.0 - uTrace)) * 9.0, 2.0));
        // one-population handoff: the continuous winding core is the MOST
        // organized structure in the plume, so it condenses last — only once
        // the reveal's second half has gathered the drift onto the braid.
        // And it condenses as a draw-on GROWING UP from the rim (ride-through
        // #2): a full-length ribbon fading in reads as a new spore source.
        // Delta retime: on the MIGRATING plumes (Arca, 2RP) the ribbon starts
        // condensing only at rev 0.62 — after their rim current has arrived
        // (front completes at rev 0.55) — so no structure ever precedes the
        // spores that feed it. At rev = 1 both gates are exactly 1 (approved
        // rest look untouched).
        float grow = smoothstep(mix(0.5, 0.62, step(0.5, plume)), 1.0, rev);
        float lead = grow * 1.12;
        float mg = grow * (1.0 - smoothstep(max(lead - 0.10, 0.0), lead + 0.001, h));
        vBright = env * rev * mg * ((0.30 + 0.85 * kn) * (1.0 + 0.6 * coh) + tAmp * band);
        vTone = min(1.0, tone + 0.12 + 0.30 * kn);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        vFogDepth = -mv.z;
        vNear = smoothstep(0.9, 1.9, length(mv.xyz));
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      uniform float fogNear;
      uniform float fogFar;
      uniform vec3 uHeatA;
      uniform vec3 uHeatB;
      varying float vBright;
      varying float vTone;
      varying float vFogDepth;
      varying float vNear;
      void main() {
        float fogF = clamp((fogFar - vFogDepth) / (fogFar - fogNear), 0.0, 1.0);
        vec3 col = mix(uHeatA, uHeatB, vTone);
        gl_FragColor = vec4(col * vBright * uOpacity * fogF * vNear, 1.0);
      }
    `,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
  const coreLines = (() => {
    const SEG = 72;
    const hArr = [], cArr = [], rArr = [], pArr = [];
    for (let pi = 0; pi < 3; pi++) {
      const spec = EXITS[pi];
      const rise = (spec.riseMin + spec.riseMax) / 2;
      const rimR = rimRad(spec.az) + 0.08;               // mean of the spores' +0.03..0.13
      const rimY = capUnderPt(1.0, spec.az).y + 0.01;    // mean of -0.02..+0.04
      for (let s = 0; s < 3; s++) {
        const curl = (s - 1) * 0.30;                     // quantized, like the spores
        const sp = s * 2.094;
        for (let i = 0; i < SEG; i++) {
          for (const hh of [i / SEG, (i + 1) / SEG]) {
            hArr.push(hh);
            cArr.push(curl, sp, pi, rise);
            rArr.push(rimR, rimY, spec.az);
            pArr.push(0, 0, 0);                          // computed in-shader
          }
          counts.coreSegs = (counts.coreSegs || 0) + 1;
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pArr, 3));
    g.setAttribute('aH', new THREE.Float32BufferAttribute(hArr, 1));
    g.setAttribute('aCoreP', new THREE.Float32BufferAttribute(cArr, 4));
    g.setAttribute('aRimC', new THREE.Float32BufferAttribute(rArr, 3));
    const l = new THREE.LineSegments(g, coreMat);
    l.frustumCulled = false;                             // positions live in the shader
    group.add(l);
    return l;
  })();

  /* ================================================================
     5. ANAMORPHIC STREAK — ONE active exit only ([e] cycles)
     ================================================================ */
  const streaks = exits.map((ex) => {
    const a = ex.spec.az;
    const rim = capUnderPt(1.0, a);
    const out = 1.0 + 0.10 / rimRad(a);
    const mat = new THREE.SpriteMaterial({
      map: streakTex,
      color: heat(0.9, new THREE.Color()).clone(),
      transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const s = new THREE.Sprite(mat);
    s.scale.set(2.1, 0.17, 1);
    s.position.set(rim.x * out, rim.y + 0.05, rim.z * out);
    s.visible = false;
    group.add(s);
    return { sprite: s, mat, localPos: s.position.clone(), o: 0 };
  });

  let active = -1;   // HOVER channel: set by the journey's hotspot proxies
  let selected = -1; // SELECTION channel (W4-E): the exit whose card is open
  let armed = false; // T1 seam

  // W4-A gap c: the streak must live on "the currently active release point".
  // Hover is the explicit channel; when nothing is hovered we derive one —
  // during the sequential reveal it is the exit currently igniting (so the
  // lens is always catching the newest exceptional source, forward AND
  // reverse), and at the settled rest it is Arca (rear-centre, tallest — the
  // spike's reviewed default). Exactly one streak is ever lit.
  let autoActive = -1;
  function computeAuto() {
    let ig = -1, settled = true;
    for (let i = 0; i < 3; i++) {
      const f = eff[i];                        // EFFECTIVE reveal: fade x arrival
      if (f >= 0.12 && f <= 0.90) ig = i;      // currently igniting/retiring
      if (f < 0.97) settled = false;
    }
    if (ig >= 0) autoActive = ig;
    else if (settled) autoActive = 1;          // Arca at rest
    else if (eff[0] < 0.12 && eff[1] < 0.12 && eff[2] < 0.12) autoActive = -1;
    return autoActive;                          // hysteresis: else keep the last
  }

  // Which exit the streak sits on. Hover wins (it is the live pointer), then
  // an open card, then the derived auto exit. While a card is open we do NOT
  // fall through to computeAuto — the streak belongs to what is being read,
  // and skipping the call leaves autoActive's hysteresis exactly where it was
  // so release resumes the reveal cleanly.
  function resolveActive() {
    if (active >= 0) return active;
    if (selected >= 0) return selected;
    return computeAuto();
  }

  // ONE-POPULATION HANDOFF, the shed's half (Hannah 2026-08-02; extends W4-A
  // gap b). For each exit the hero's ambient shed hands its apparent density
  // to the plume system over three capsule regions — the under-cap origin
  // wedge (where the plume population is born), the rise corridor (lip ->
  // plume top, W4-A's original ArtCompute corridor generalized to all three
  // exits), and the downwind drift envelope (where the plume's drift-state
  // particles co-locate with the hero curtain during arrival; longest for
  // ArtCompute, whose sector carries the hero's visible right-drift). Local
  // endpoints are authored once in cap space and pushed through the live
  // mushroom matrix each frame so they ride cap bend + sway; per-region
  // strength k = gain * that exit's EFFECTIVE reveal, so the dim grows
  // exactly as, and exactly where, the structured plume brightens — and
  // unwinds the same way in reverse.
  const ambient = createAmbientShedDimmer(sceneApi);
  const shedRegions = (() => {
    const list = [];
    const driftLen = [4.8, 3.2, 2.6];   // ArtCompute rides the hero's full carry
    // Delta re-anchor: the migrating plumes' populations are BORN in the
    // source sector and walk the rim out, so their origin-wedge and downwind
    // capsules sit at the SOURCE (overlaps max-combine, never stack), their
    // rise corridor stays at the release sector, and a walk corridor along the
    // rim chord covers the migration itself.
    const lipAt = (az) => new THREE.Vector3(
      Math.cos(az) * (rimRad(az) + 0.08),
      capUnderPt(1.0, az).y - 0.15,
      Math.sin(az) * (rimRad(az) + 0.08));
    const srcAz = EXITS[0].az;
    for (let i = 0; i < 3; i++) {
      const spec = EXITS[i];
      const rise = (spec.riseMin + spec.riseMax) / 2;
      const rimR = rimRad(spec.az) + 0.08;
      const rim = capUnderPt(1.0, spec.az);
      const lip = lipAt(spec.az);
      const top = new THREE.Vector3(
        Math.cos(spec.az) * (rimR + 0.19) + spec.lean * rise * 0.62,
        rim.y + 0.10 + rise,
        Math.sin(spec.az) * (rimR + 0.19) + spec.lean * rise * 0.105,
      );
      const homeAz = i === 0 ? spec.az : srcAz;   // where this plume is BORN
      const srcLip = i === 0 ? lip.clone() : lipAt(srcAz);
      const inner = capUnderPt(0.52, homeAz);
      inner.y -= 0.12;
      const tail = srcLip.clone().addScaledVector(BREEZE, driftLen[i]);
      // rise corridor keeps W4-A's approved ArtCompute radii/gain
      list.push({ exit: i, la: lip,             lb: top,  r0: 0.65, r1: 2.05, gain: 0.78 });
      list.push({ exit: i, la: inner,           lb: srcLip.clone(), r0: 0.50, r1: 1.45, gain: 0.55 });
      list.push({ exit: i, la: srcLip.clone(),  lb: tail, r0: 1.00, r1: 2.60, gain: i === 0 ? 0.52 : 0.40 });
      // migration corridor: source lip -> release lip (rim arc sagitta stays
      // inside r1 for both spans)
      if (i > 0) list.push({ exit: i, la: srcLip.clone(), lb: lip.clone(), r0: 0.50, r1: 1.35, gain: 0.35 });
    }
    for (const rg of list) { rg.a = new THREE.Vector3(); rg.b = new THREE.Vector3(); rg.k = 0; }
    return list;
  })();

  // Arrival ramps — the scroll-locked half of the handoff. The T1 seam arms
  // this chapter at ~92 deg of camera azimuth past Mission (core/seams.js),
  // where driveInspire's ArtCompute ramp (az 36..72) is ALREADY complete: the
  // seam-gated fade therefore steps 0 -> 1 in a single frame, and the whole
  // plume system used to ease in fully formed — the "new spores appear when I
  // scroll" Hannah flagged. The chapter now multiplies each fade by its own
  // azimuth ramp that begins strictly AFTER the arming azimuth, so every
  // exit's effective reveal is continuous in scroll position (snap/?p=
  // included), grows only as the camera actually earns the sector, and plays
  // backward identically. All ramps saturate by az ~154, safely before the
  // rest window (az ~157.8..160), so the settled Inspire rest is exactly
  // reveal = 1 — the approved look. Ramp bounds are desktop-orbit absolute
  // (mission az ~ -12 deg), like driveInspire's own; the ArtCompute ramp
  // starts at 82 deg, 2 deg past desktop arming.
  const ARR = [
    { a0: 82,  a1: 116 },   // ArtCompute — the hero's right-drift, gathered first
    { a0: 108, a1: 140 },   // Arca — revealed as the camera rounds the rear
    { a0: 130, a1: 154 },   // 2RP — the drooped-margin sector, last
  ];
  const ARR_BAND = { a0: 80, a1: 100 };
  const RAD2DEG = 180 / Math.PI;
  function camAzDeg() {
    const c = sceneApi.camera.position;
    let d = Math.atan2(c.x, c.z) * RAD2DEG;
    if (d < -90) d += 360;                 // rear-left reads 190..270
    return d;
  }
  function arrOf(azDeg, rmp) {
    let x = (azDeg - rmp.a0) / (rmp.a1 - rmp.a0);
    x = x < 0 ? 0 : x > 1 ? 1 : x;
    return x * x * (3 - 2 * x);
  }
  const eff = [0, 0, 0];                   // per-exit effective reveal, per frame
  let effBand = 0;
  function computeEff() {
    const azDeg = camAzDeg();
    for (let i = 0; i < 3; i++) eff[i] = exits[i].fade * arrOf(azDeg, ARR[i]);
    effBand = gillBand.fade * arrOf(azDeg, ARR_BAND);
  }
  // Delta retime for the DESTINATION furniture (under-rim filaments, beads,
  // wisps, cap flow, streak) of the migrating exits: it ignites only as their
  // rim current actually arrives (rev's second half — the front completes at
  // rev 0.55), never before, so no local structure suggests a local birth.
  // Exit 0 is the source itself and keeps its full-reveal drive. All three
  // read exactly 1 at eff = 1: the approved rest is untouched.
  function furnOf(i) {
    if (i === 0) return eff[0];
    let x = (eff[i] - 0.55) / 0.45; x = x < 0 ? 0 : x > 1 ? 1 : x;
    return x * x * (3 - 2 * x);
  }

  // W3-B (gap g): initiative labels anchor on the PLUME BODY, not the rim
  // release lip. The lip projects into the lower third of the Inspire rest
  // frame — exactly where the bottom-centre copy lives — so two of the three
  // labels were suppressed by the copy rect. Mid-plume (lifted along the rise,
  // leaned with the breeze like the spores themselves) keeps each chip inside
  // its own initiative's sky sector per Plate II and clear of the editorial
  // block, so all three are readable at the rest.
  const LABEL_LIFT = 0.55;      // fraction of the plume's mid rise
  const LABEL_LEAN = 0.45;      // fraction of the spores' own breeze lean
  const breezeXZ = new THREE.Vector3(BREEZE.x, 0, BREEZE.z).normalize();
  const labelOffsets = EXITS.map(spec => {
    const rise = (spec.riseMin + spec.riseMax) / 2;
    return breezeXZ.clone().multiplyScalar(spec.lean * rise * LABEL_LEAN)
      .add(new THREE.Vector3(0, rise * LABEL_LIFT, 0));
  });

  const _wv = new THREE.Vector3();
  const api = {
    group,
    counts,
    exits: EXITS,
    sporeGeo,
    setTier(t) {
      sporeGeo.setDrawRange(0, t === 2 ? SPORE_TIER2 : SPORE_FULL);
      counts.spores = t === 2 ? SPORE_TIER2 : SPORE_FULL;
    },
    /** Sequential reveal, 0..1 per exit in EXITS order, plus the gill band. */
    setReveal(a, b, c, band = 0) {
      exits[0].target = a; exits[1].target = b; exits[2].target = c;
      gillBand.target = band;
    },
    /** Jump the eased fades straight to their targets (review + QA helper —
     *  a hidden tab only runs frames during capture bursts). W4-A: also snaps
     *  coherence and the streak so a ?p= capture sees the settled frame. */
    snap() {
      for (const ex of exits) ex.fade = ex.target;
      gillBand.fade = gillBand.target;
      computeEff();                 // camera is already placed by placeAt
      effActive = resolveActive();
      const c = sporeMat.uniforms.uCoh.value;
      for (let i = 0; i < 3; i++) {
        c.setComponent(i, (i === active || i === selected) ? 1 : (i === effActive ? 0.35 : 0));
        const st = streaks[i];
        st.o = (i === effActive ? 0.42 : 0) * furnOf(i);
        st.sprite.visible = st.o > 0.01;
        for (const m of exits[i].mats) m.uniforms.uFade.value = furnOf(i);
      }
      for (const m of gillBand.mats) m.uniforms.uFade.value = effBand;
      const [fA, fB] = linkFades();
      rimLinks[0].mat.uniforms.uFade.value = fA;
      rimLinks[1].mat.uniforms.uFade.value = fB;
      sporeMat.uniforms.uRev.value.set(eff[0], eff[1], eff[2]);
    },
    /** T1 streaming seam: arm/retire the whole exit set. */
    setArmed(on) { armed = !!on; if (!on) api.setReveal(0, 0, 0, 0); },
    get armed() { return armed; },
    /** Node id -> world position of its label anchor: mid-plume, above the
     *  release lip (W3-B gap g — see labelOffsets above). */
    nodeWorld(id) {
      const i = EXITS.findIndex(e => e.id === id || (id === 'tworp' && e.id === '2rp'));
      if (i < 0) return null;
      return streaks[i].localPos.clone().add(labelOffsets[i])
        .applyMatrix4(sceneApi.groups.mushroom.matrixWorld);
    },
    /** Damp the breeze lean (1 = full). Spike A's director called this but
     *  plumes.js never exported it - a live TypeError in spike-a/, fixed here
     *  rather than inherited; uLean was a declared-but-unused uniform. */
    setLeanScale(v) { sporeMat.uniforms.uLean.value = v; },
    /** HOVER channel: the explicitly active exit (streak + full coherence +
     *  trace-back). -1 = none hovered; the streak then falls back to the
     *  derived auto exit (see computeAuto). */
    setActive(i) { active = i; },
    get active() { return active; },
    /** SELECTION channel (W4-E) — the symmetric half of the hover path,
     *  called by core/ui.js's notifySelect for every open/close path (click,
     *  key, deep link, hashchange/Back, Escape, scroll-intent close).
     *
     *  While an initiative's spotlight card is open its plume holds the
     *  coherent/bright hover read — full uCoh plus the streak — and keeps it
     *  when the pointer wanders off or onto another plume. The trace-back
     *  band stays hover-only: it is a repeating arrival gesture, not a state
     *  to sit in behind an open card.
     *
     *  Ids arrive journey-side ('tworp'), the geometry spells it '2rp' — the
     *  same aliasing nodeWorld does. */
    setSelected(id, on) {
      const i = EXITS.findIndex(e => e.id === id || (id === 'tworp' && e.id === '2rp'));
      if (i < 0) return;
      // Guarded release: a stale close arriving after a retarget must not
      // drop the plume that is now selected.
      if (on) selected = i;
      else if (selected === i) selected = -1;
    },
    get selected() { return selected; },
    /** The exit the streak actually sits on right now (hover or derived). */
    get effectiveActive() { return effActive; },
    /** World position of the active release point (for the lens focus hint). */
    activeWorld() {
      const i = active >= 0 ? active : effActive;
      if (i < 0) return null;
      return _wv.copy(streaks[i].localPos)
        .applyMatrix4(sceneApi.groups.mushroom.matrixWorld).clone();
    },
  };

  const cohTarget = [0, 0, 0];
  let effActive = -1;        // hover if any, else the derived auto exit
  let lastHover = -1;        // trace-back trigger edge
  let traceStart = -1e9;
  sceneApi.addAnimator('spike-plumes', (t, dt) => {
    const k = Math.min(1, dt * 3.2);
    for (const ex of exits) {
      ex.fade += (ex.target - ex.fade) * k;
      if (ex.fade < 0.012 && ex.target === 0) ex.fade = 0; // no exponential ghost tail
    }
    gillBand.fade += (gillBand.target - gillBand.fade) * k;
    if (gillBand.fade < 0.012 && gillBand.target === 0) gillBand.fade = 0;
    // effective reveals: seam-gated fade x scroll-locked arrival ramp — the
    // single value every visual channel (mats, uRev/morph, shed dim, streaks,
    // auto-active) reads from, so the whole handoff is continuous in p
    computeEff();
    let anyVisible = effBand > 0;
    for (const m of gillBand.mats) { m.uniforms.uFade.value = effBand; m.uniforms.uTime.value = t; }
    effActive = resolveActive();
    // rim delta currents: guide strands extend with the walking spore front
    // and persist (fade 1) at rest
    {
      const [fA, fB] = linkFades();
      if (fA > 0 || fB > 0) anyVisible = true;
      rimLinks[0].mat.uniforms.uFade.value = fA;
      rimLinks[1].mat.uniforms.uFade.value = fB;
      for (const l of rimLinks) l.mat.uniforms.uTime.value = t;
    }
    for (let i = 0; i < 3; i++) {
      const ex = exits[i];
      if (eff[i] > 0) anyVisible = true;
      const fv = furnOf(i);
      for (const m of ex.mats) {
        m.uniforms.uFade.value = fv;
        m.uniforms.uTime.value = t;
      }
      // Full coherence on hover AND on the selected exit (W4-E: an open card
      // holds its plume gathered even after the pointer leaves — and because
      // the two channels are OR'd, hovering a different plume lights that one
      // without ever pulling the held one back down). A restrained gather on
      // the auto exit, so the lens always has ONE exceptional source without
      // flattening the others.
      cohTarget[i] = (i === active || i === selected) ? 1 : (i === effActive ? 0.35 : 0);
    }

    // The shed's half of the handoff — runs OUTSIDE the anyVisible gate so
    // the exact restore fires when the leg retires. Region strength tracks
    // each exit's effective reveal; endpoints ride the live mushroom matrix.
    const mw = sceneApi.groups.mushroom.matrixWorld;
    for (const rg of shedRegions) {
      rg.a.copy(rg.la).applyMatrix4(mw);
      rg.b.copy(rg.lb).applyMatrix4(mw);
      rg.k = rg.gain * eff[rg.exit];
    }
    // Ride-through #3 (Hannah): the plumes must not ignite BESIDE the old
    // curtain — as the exits complete, the WHOLE shed cedes to the structured
    // system. Delta retime (Hannah's third note): the hand-over is now WEIGHTED
    // ACROSS the three phases instead of keyed to the furthest exit, so the
    // original stream's curtain survives phase A at ~50% and only finishes
    // ceding as the LAST current arrives — the source never dies before its
    // delta has visibly taken over. Still a pure function of the effective
    // reveals: reverse scroll re-inflates the curtain the same way.
    const S3 = (x) => { x = (x - 0.25) / 0.65; x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
    const gk = 0.50 * S3(eff[0]) + 0.28 * S3(eff[1]) + 0.22 * S3(eff[2]);
    ambient.update(shedRegions, gk);

    group.visible = anyVisible;
    if (!anyVisible) return;
    sporeMat.uniforms.uTime.value = t;
    coreMat.uniforms.uTime.value = t;
    sporeMat.uniforms.uRev.value.set(eff[0], eff[1], eff[2]);
    const c = sporeMat.uniforms.uCoh.value;
    c.x += (cohTarget[0] - c.x) * k;
    c.y += (cohTarget[1] - c.y) * k;
    c.z += (cohTarget[2] - c.z) * k;

    // IN-4.1 trace-back: on hover, a bright band leaves the hovered plume and
    // runs BACKWARD — down the core, around the rim curl (wisps), then inward
    // along the source filaments to the gill sector of origin. Repeats gently
    // while the hover holds; parked off otherwise.
    if (active !== lastHover) { lastHover = active; traceStart = t; }
    const traceP = active >= 0 ? ((t - traceStart) % 2.6) / 1.7 : 9.0;
    const cohArr = [c.x, c.y, c.z];
    const coreAmp = coreMat.uniforms.uTraceAmp.value;
    coreMat.uniforms.uTrace.value = Math.min(traceP / 0.55, 9.0);
    for (let i = 0; i < 3; i++) {
      const on = i === active && traceP <= 1.0 + 0.35;
      const amp = on ? 2.2 * cohArr[i] : 0;
      if (exits[i].wispMat) {
        exits[i].wispMat.uniforms.uTrace.value = traceP;
        exits[i].wispMat.uniforms.uTraceAmp.value = amp;
      }
      if (exits[i].srcMat) {
        exits[i].srcMat.uniforms.uTrace.value = (traceP - 0.40) / 0.60;
        exits[i].srcMat.uniforms.uTraceAmp.value = amp;
      }
      coreAmp.setComponent(i, on ? 1.6 * cohArr[i] : 0);
    }

    for (let i = 0; i < 3; i++) {
      const st = streaks[i];
      const want = (i === effActive ? 0.42 : 0) * furnOf(i);
      st.o += (want - st.o) * Math.min(1, dt * 2.4);
      if (st.o < 0.02 && want === 0) st.o = 0;   // die cleanly, no lingering blade
      // a lens catching an exceptional source: slow breathing, slight shimmer
      st.mat.opacity = st.o * (0.82 + 0.13 * Math.sin(t * 1.9 + i * 2.1)
                                    + 0.05 * Math.sin(t * 7.3 + i));
      st.sprite.visible = st.o > 0.01;
      const w = 2.1 * (1 + 0.06 * Math.sin(t * 2.7 + i));
      st.sprite.scale.set(w, 0.17, 1);
    }
  });

  return api;
}
