// journey-v6 — INSPIRE chapter geometry: the three spore exits.
// Adapted from spike-a/plumes.js (approved at G2a) into the grey-box build:
// the spike stays frozen, this is the copy the journey drives. Changes vs the
// spike: the sequential reveal is driven from journey progress + camera
// azimuth here rather than by the spike's director, and the group arms/retires
// on the T1 seam. (The spike's 4th channel — the backlit gill band — was
// removed by the D16 restage; see below.)
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
//   2. SAME-PARTICLE TAKEOVER (Hannah's fifth note, 2026-08-03; completed by
//      the FINAL UNIFICATION the same evening): the whole leg — transition
//      AND rest — is performed by the hero's OWN 4,200 shed dots
//      (inspire-takeover.js, a CPU port of the staged braid math). The
//      5,100-spore GPU detail layer that used to fade in on the rest
//      approach is DELETED: even co-located and det-gated it was still a
//      swap to a visibly different stream ("it stays in the same spot, but
//      it switches to a completely different stream"). The rest richness is
//      now a DECORATION of the same dots — the knot-pearl cadence rides the
//      takeover's brightness feed at full strength, core cohort included —
//      plus the det-gated core ribbons, which grow and never replace;
//   3. inspire-ambient.js dims the hero shed as-and-where the structured
//      plume brightens — now per particle via the takeover's feed — and
//      restores it byte-exactly at p = 0.
//
// D16 RESTAGE (Hannah, 2026-08-03, after six rejected fixes): the exits now
// CLUSTER at the hero's one visible stream (anatomy.js EXITS — ArtCompute IS
// the stream at cap az ~5.83; Arca ~31 deg rearward, 2RP ~24 deg frontward
// along the rim), and the orbit is a short swing TOWARD that stream
// (director.js). The unified no-self-ignition principle is binding: during
// the whole Mission->Inspire leg nothing may go invisible -> visible unless
// it was already visible at the hero pose or visibly GROWS OUT of the stream
// (draw-on along the feed direction, fed by the stream's own dots/currents).
// Consequences in this file: the backlit gill band (a self-igniting filler
// for the old 172-deg orbit's sparse middle) and the cap-surface flow strips
// (self-igniting glow on the dome top, fed by nothing) are REMOVED; migrant
// destination filaments draw on lip-first (from where the rim current
// arrives); migrant wisps are re-authored to trace the actual walk from the
// source; ribbon cores join the rest-proximity detail gate.
//
// RIVER DELTA (Hannah, 2026-08-02, third note — the definitive fix): the hero
// shows exactly ONE visible stream, the shed spilling from under the
// back-right rim (ArtCompute's sector). So nothing may ever be BORN in the
// Arca or 2RP sectors — however gently it fades in, a population appearing
// away from the stream reads as a newcomer. Instead the one stream SPLITS:
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
  makeRng, gaussOf, heat, capUnderPt, rimRad,
  makeGlowTexture, makeStreakTexture, EXITS,
} from '../core/anatomy.js';
import { createAmbientShedDimmer } from './inspire-ambient.js';
import { createSporeTakeover } from './inspire-takeover.js';

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
      // D16 draw-on direction: 0 = grow from aProg 0 toward 1 (inner -> lip,
      // the stream's own outward flow), 1 = grow from aProg 1 toward 0 (lip
      // -> inner: a migrant destination lights up FROM the point the rim
      // current arrives at, spreading upstream into its gills — visibility
      // always enters from the feed).
      uFrom: { value: 0 },
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
      uniform float uFrom;
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
        // its feed end as the drift organizes — a full-length line appearing
        // at once reads as a new spore source. uFrom selects which end is the
        // feed (D16). Saturates past uFade = 1 so the approved rest look is
        // untouched.
        float prog = mix(aProg, 1.0 - aProg, uFrom);
        float lead = uFade * 1.12;
        vBright *= 1.0 - smoothstep(max(lead - 0.10, 0.0), lead + 0.001, prog);
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
  // counts.spores is gone with the GPU layer (final unification): the
  // chapter adds no particles of its own — the hero's 4,200 dots are it.
  const counts = { sourceSegs: 0, wispSegs: 0, beads: 0, coreSegs: 0, rimSegs: 0 };

  // per-exit fade drivers (sequential reveal). The old 4th channel (backlit
  // gill band) is GONE per D16: it was a self-igniting filler for the long
  // orbit's sparse middle, in a sector unrelated to the stream — the exact
  // "new spores appear at the back" read. The short stream-side leg has no
  // sparse middle and the no-self-ignition principle bans the element.
  const exits = EXITS.map((spec) => ({ spec, fade: 0, target: 0, mats: [] }));

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
    // D16: a migrant destination's filaments light lip-first — visibility
    // spreads upstream from where the rim current physically arrives. The
    // source exit keeps inner->lip (its wedge underlies the already-visible
    // stream; either way it is a brightening of what the visitor sees).
    if (ex !== exits[0]) mat.uniforms.uFrom.value = 1;
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
     2. AUTHORED AIRFLOW — faint wisp guides tracing the ACTUAL path
        each exit's spores take (D16). The resident exit's wisps run
        between-gills -> rim -> curl -> rise, inside the visible
        stream. A MIGRANT exit's wisps start in the SOURCE wedge and
        WALK THE RIM to the release sector before curling and rising —
        so when they draw on (tip tracking the live current) every
        centimetre of new line grows out of the stream.
     ================================================================ */
  for (const ex of exits) {
    const { az, riseMin, riseMax, lean } = ex.spec;
    const isMig = ex !== exits[0];
    const azSrcBase = EXITS[0].az;
    const lp = [], lc = [], lg = [];
    const N_WISP = 4;
    for (let w = 0; w < N_WISP; w++) {
      const a0 = az + gauss() * 0.16;
      const aS = isMig ? azSrcBase + gauss() * 0.14 : a0;   // where it is BORN
      const u0 = 0.55 + rand() * 0.18;
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
        if (!isMig) {
          // RESIDENT (the stream itself): between-gills -> margin -> curl -> rise
          if (t < 0.22) {                     // between the gills, drifting out
            const k = t / 0.22;
            p = capUnderPt(u0 + (1 - u0) * k * 0.45, a0 + 0.02 * Math.sin(k * 3));
            p.y -= 0.02 + 0.05 * k;
          } else if (t < 0.42) {              // lateral travel to the margin
            const k = (t - 0.22) / 0.2;
            const u = u0 + (1 - u0) * (0.45 + 0.55 * k);
            p = capUnderPt(u, a0);
            p.y -= 0.07 * (1 - k) + 0.02;
          } else if (t < 0.58) {              // curl around the rim
            const k = (t - 0.42) / 0.16;
            const aa = a0 + curl * k;
            const rr = rimR + 0.06 + 0.10 * Math.sin(k * Math.PI);
            p = new THREE.Vector3(Math.cos(aa) * rr, rim.y + 0.10 * k + 0.06 * Math.sin(k * 6 + sp), Math.sin(aa) * rr);
          } else {                            // braided rise, leaning +x
            const k = (t - 0.58) / 0.42;
            const aa = a0 + curl + 0.30 * Math.sin(k * 4.2 + sp);
            const rr = rimR + 0.06 + 0.22 * Math.sin(k * 3.1 + sp * 1.7);
            const y = rim.y + 0.10 + k * k * rise;
            p = new THREE.Vector3(Math.cos(aa) * rr, y, Math.sin(aa) * rr);
            p.x += BREEZE.x * lean * k * k * rise * 0.8;
            p.z += BREEZE.z * lean * k * k * rise * 0.8;
          }
        } else {
          // MIGRANT (D16): born in the SOURCE wedge -> source margin -> rim
          // WALK to the release sector -> curl -> rise. Draw-on along t means
          // the line only ever extends out of the stream, along the walk.
          if (t < 0.12) {                     // between the SOURCE gills
            const k = t / 0.12;
            p = capUnderPt(u0 + (1 - u0) * k * 0.45, aS + 0.02 * Math.sin(k * 3));
            p.y -= 0.02 + 0.05 * k;
          } else if (t < 0.26) {              // lateral to the source margin
            const k = (t - 0.12) / 0.14;
            const u = u0 + (1 - u0) * (0.45 + 0.55 * k);
            p = capUnderPt(u, aS);
            p.y -= 0.07 * (1 - k) + 0.02;
          } else if (t < 0.55) {              // WALK the real rim, source -> release
            const k = (t - 0.26) / 0.29;
            const aa = aS + (a0 - aS) * k;
            const rr = rimRad(aa) + 0.06 + 0.06 * Math.sin(k * 7 + sp);
            const rw = capUnderPt(1.0, aa);
            p = new THREE.Vector3(Math.cos(aa) * rr,
              rw.y + 0.04 + 0.04 * Math.sin(k * 11 + sp * 1.3), Math.sin(aa) * rr);
          } else if (t < 0.66) {              // curl at the release sector
            const k = (t - 0.55) / 0.11;
            const aa = a0 + curl * k;
            const rr = rimR + 0.06 + 0.10 * Math.sin(k * Math.PI);
            p = new THREE.Vector3(Math.cos(aa) * rr, rim.y + 0.10 * k + 0.06 * Math.sin(k * 6 + sp), Math.sin(aa) * rr);
          } else {                            // braided rise, leaning +x
            const k = (t - 0.66) / 0.34;
            const aa = a0 + curl + 0.30 * Math.sin(k * 4.2 + sp);
            const rr = rimR + 0.06 + 0.22 * Math.sin(k * 3.1 + sp * 1.7);
            const y = rim.y + 0.10 + k * k * rise;
            p = new THREE.Vector3(Math.cos(aa) * rr, y, Math.sin(aa) * rr);
            p.x += BREEZE.x * lean * k * k * rise * 0.8;
            p.z += BREEZE.z * lean * k * k * rise * 0.8;
          }
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
    // D16: the cluster straddles the source, so the delta BRANCHES — one
    // short current rearward to Arca, one frontward to 2RP. (The old chain
    // source -> Arca -> 2RP assumed all three lay one way around the rim.)
    const linkSpecs = [
      { from: EXITS[0].az, to: EXITS[1].az },   // source -> Arca (rearward)
      { from: EXITS[0].az, to: EXITS[2].az },   // source -> 2RP (frontward)
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
  // The strands' draw-on follows each branch's own walking front (mig mirrors
  // the shader's smoothstep(0, 0.55, rev)); the two branches are independent
  // now that the delta forks both ways from the source (D16).
  function migOf(e) {
    let x = e / 0.55; x = x < 0 ? 0 : x > 1 ? 1 : x;
    return x * x * (3 - 2 * x);
  }
  function linkFades() {
    return [migOf(eff[1]), migOf(eff[2])];
  }

  /* ================================================================
     3. (REMOVED, D16) CAP-SURFACE FLOW — the faint travelling glow
        strips on the dome top self-ignited: nothing feeds the cap TOP
        from the under-rim stream, so however gently they faded in they
        were new luminous structure appearing from nowhere. Banned by
        the no-self-ignition principle; the handoff's "cap carries a
        faint flow" idea is deferred until it can be stream-fed.
     ================================================================ */

  /* ================================================================
     4. (DELETED, final unification — Hannah, 2026-08-03 evening): the
        5,100-spore GPU detail layer is GONE from the live path. Even
        gated to the last ~2 degrees before the rest, its fade-in was
        still a swap: the hero's real stream (4,200 takeover-steered
        dots) crossfading into a second, visibly different stream —
        different size cohorts, uHeatA/uHeatB palette, its own
        knot-pearl cadence and sheath. "It stays in the same spot, but
        it switches to a completely different stream." Per the merge
        plan (15-merge-and-architecture.md section 3) the hero's own
        dots now carry the stream from Mission through the rest,
        permanently; the rest-pose richness is achieved by DECORATING
        those same dots — the knot-pearl cadence rides the takeover's
        per-particle brightness feed (inspire-takeover.js, full
        strength now, core cohort included) — never by replacing them.
        The rest frame reads slightly sparser (4,200 vs 5,100):
        sanctioned; compensated by pearl brightness and the ribbons.
        The core ribbons (4b) STAY — they draw on visibly and swap
        nothing — so the uniforms the two materials used to share are
        now owned here, standalone.
     ================================================================ */
  const uLean = { value: 1.0 };
  const uRev = { value: new THREE.Vector3(0, 0, 0) };
  const uCoh = { value: new THREE.Vector3(0, 0, 0) };
  const uDet = { value: new THREE.Vector3(0, 0, 0) };
  const uKnot = { value: new THREE.Vector3(EXITS[0].knot, EXITS[1].knot, EXITS[2].knot) };
  const uHeatA = { value: heat(0.55, new THREE.Color()).clone() };
  const uHeatB = { value: heat(0.92, new THREE.Color()).clone() };

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
      uLean,      // shared with the takeover's CPU port via setLeanScale,
                  // or ribbon and converted-dot braid would split
      uOpacity: { value: 0.62 },
      uRev,       // reveal drives ribbon draw-on
      uCoh,       // hover coherence
      // D16 + final unification: uDet is the rest-proximity condensation
      // gate. A continuous hot core igniting mid-orbit was self-ignition
      // (the converted hero dots carry the braid alone through the orbit);
      // det-gating makes the ribbon condense on the final approach as a
      // sharpening of the already-visible, still-lit converted-dot braid —
      // a growth, never a swap. (The GPU detail layer that used to fade in
      // on this same gate is deleted; the ribbons are all uDet drives now.)
      uDet,
      uKnot,
      uLeanP: { value: new THREE.Vector3(EXITS[0].lean, EXITS[1].lean, EXITS[2].lean) },
      uToneP: { value: new THREE.Vector3(EXITS[0].tone, EXITS[1].tone, EXITS[2].tone) },
      uTrace: { value: 9.0 },
      uTraceAmp: { value: new THREE.Vector3(0, 0, 0) },
      uHeatA,
      uHeatB,
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
      uniform vec3 uDet;
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
        float det  = plume < 0.5 ? uDet.x  : (plume < 1.5 ? uDet.y  : uDet.z);
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
        // det gate (D16): the ribbon exists only as part of the co-located
        // rest-detail layer — exactly 1 at the settled rest, 0 mid-orbit.
        vBright = env * rev * det * mg * ((0.30 + 0.85 * kn) * (1.0 + 0.6 * coh) + tAmp * band);
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
  // SAME-PARTICLE TAKEOVER (Hannah's fifth note, 2026-08-03): the hero's own
  // shed dots perform the whole transition; driven from this chapter's
  // animator every frame (which runs AFTER the hero's spore-drift — journey
  // animators were registered later in the insertion-ordered Map), and its
  // per-particle conv/brightness feed rides into ambient.update below.
  const takeover = createSporeTakeover(sceneApi);
  // Per-exit DETAIL fade — FINAL UNIFICATION (Hannah, 2026-08-03 evening):
  // the 5,100-spore GPU layer this gate used to open is DELETED. Even with
  // the rest-proximity gating the layer's late fade-in was a swap — the
  // hero's real stream crossfading into a second, visibly different stream
  // at the same spot. det survives as the CORE RIBBONS' condensation gate
  // only: eff-saturation (resident by 0.80, migrants by 0.55) x rest
  // proximity, so the ribbons sharpen the still-lit converted-dot braid on
  // the final approach, growing bottom-up, and hand back first in reverse.
  // The converted dots NO LONGER dim against det — they ARE the rest.
  const det = [0, 0, 0];
  let restProx = 0;
  function computeDet() {
    for (let i = 0; i < 3; i++) {
      let x = (eff[i] - 0.85) / 0.145;
      x = x < 0 ? 0 : x > 1 ? 1 : x;
      det[i] = x * x * (3 - 2 * x) * restProx;
    }
  }
  // scratch for the history-dissolve gradient (ride-through #5)
  const _capC = new THREE.Vector3();
  const _grad = { sx: 0, sy: 0, sz: 0, d0: 1, d1: 3, k: 0 };
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

  // Arrival ramps — the scroll-locked half of the handoff, re-keyed for the
  // D16 orbit (a ~90 deg swing, hero az ~-12 -> rest az 78). The chapter
  // multiplies each seam-gated fade by its own azimuth ramp so every exit's
  // effective reveal is continuous in scroll position (snap/?p= included),
  // grows only as the camera actually travels toward the stream, and plays
  // backward identically. Sequence: the stream itself organizes first
  // (ArtCompute), then the Arca current peels rearward, then 2RP frontward.
  // All ramps saturate by az ~74, safely before the rest (az 78), so the
  // settled Inspire rest is exactly reveal = 1. Bounds are desktop-orbit
  // absolute (mission az ~ -12 deg), like driveInspire's own fade (az
  // 36..72); T1 arms at ~48 deg past Mission (az ~36) — at or before the
  // first ramp, so nothing can step on arming.
  const ARR = [
    { a0: 34, a1: 60 },   // ArtCompute — the visible stream, gathered first
    { a0: 46, a1: 68 },   // Arca — its current peels off rearward
    { a0: 54, a1: 74 },   // 2RP — the frontward branch, last
  ];
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
  function computeEff() {
    const azDeg = camAzDeg();
    for (let i = 0; i < 3; i++) eff[i] = exits[i].fade * arrOf(azDeg, ARR[i]);
  }
  // Delta retime for the DESTINATION furniture (under-rim filaments, beads,
  // streak) of the migrating exits: it ignites only as their rim current
  // actually arrives (rev's second half — the front completes at rev 0.55),
  // never before, so no local structure suggests a local birth — and it draws
  // on lip-first (uFrom), spreading upstream from the arrival point. Exit 0
  // is the source itself and keeps its full-reveal drive. All three read
  // exactly 1 at eff = 1. (Wisps are NOT furnOf-driven any more: their fade
  // is eff itself, so their drawn tip tracks the live walking current out of
  // the stream — see the animator.)
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
    /** QA handle: the same-particle takeover (conv/brightness feed, perf). */
    _takeover: takeover,
    /** Tier hook, kept for API compatibility. The tierable 5,100-spore GPU
     *  layer is deleted (final unification): the chapter's particles ARE the
     *  hero's 4,200 shed dots, whose count is the hero's own budget. */
    setTier() {},
    /** Reveal drive. D16: journey.js still calls this with its legacy
     *  four-channel azimuth ramps (keyed to the OLD 172-deg orbit — b, c and
     *  band never complete on the short leg, and journey.js is outside this
     *  restage's file scope), so the chapter takes the MASTER drive — the
     *  furthest-along channel, which on the new leg is `a` (az 36..72,
     *  saturating before the rest) times the retire envelope — and applies
     *  its own per-exit sequencing via the ARR azimuth ramps above. The
     *  seam-gate contract is unchanged: setArmed(false) zeroes everything. */
    setReveal(a, b, c, band = 0) {
      const m = Math.max(a, b, c, band);
      exits[0].target = m; exits[1].target = m; exits[2].target = m;
    },
    /** Rest proximity 0..1 (pure in journey progress, set by driveInspire).
     *  Final unification: with the GPU detail layer deleted this now gates
     *  ONLY the core ribbons' condensation (uDet) — kept, not no-oped,
     *  because the ribbons' draw-on belongs to the final approach exactly
     *  as audited; journey.js's call site is unchanged. */
    setRestProx(v) { restProx = v < 0 ? 0 : v > 1 ? 1 : v; },
    /** Jump the eased fades straight to their targets (review + QA helper —
     *  a hidden tab only runs frames during capture bursts). W4-A: also snaps
     *  coherence and the streak so a ?p= capture sees the settled frame. */
    snap() {
      for (const ex of exits) ex.fade = ex.target;
      computeEff();                 // camera is already placed by placeAt
      effActive = resolveActive();
      const c = uCoh.value;
      for (let i = 0; i < 3; i++) {
        c.setComponent(i, (i === active || i === selected) ? 1 : (i === effActive ? 0.35 : 0));
        const st = streaks[i];
        st.o = (i === effActive ? 0.42 : 0) * furnOf(i);
        st.sprite.visible = st.o > 0.01;
        for (const m of exits[i].mats) {
          m.uniforms.uFade.value = m === exits[i].wispMat ? eff[i] : furnOf(i);
        }
      }
      const [fA, fB] = linkFades();
      rimLinks[0].mat.uniforms.uFade.value = fA;
      rimLinks[1].mat.uniforms.uFade.value = fB;
      uRev.value.set(eff[0], eff[1], eff[2]);
      computeDet();
      uDet.value.set(det[0], det[1], det[2]);
      // takeover positions are pure in (eff, time): the next pumped frame's
      // animator applies them with no temporal easing, so a ?p= capture sees
      // the settled conversion.
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
    setLeanScale(v) { uLean.value = v; },
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
    // effective reveals: seam-gated fade x scroll-locked arrival ramp — the
    // single value every visual channel (mats, uRev/morph, shed dim, streaks,
    // auto-active) reads from, so the whole handoff is continuous in p
    computeEff();
    let anyVisible = false;
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
        // wisps draw on with eff itself — their tip tracks the live current
        // walking out of the stream (D16); destination furniture waits for
        // the current's arrival (furnOf) and lights lip-first (uFrom).
        m.uniforms.uFade.value = m === ex.wispMat ? eff[i] : fv;
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
    // Ride-through #5 (Hannah, "still two sources"): the shed's FAR-DOWNWIND
    // history — old spores that drifted away long before the orbit — hangs in
    // the sky as a detached cloud while the braid grows at the rim. It is not
    // the source; it dissolves EARLY (with the first arrival), distance-graded
    // from the cap centre, while the near-rim live stream follows `gk` above
    // and is absorbed by the braid. One stream, no history-ghost.
    let hk = (eff[0] - 0.02) / 0.22;
    hk = hk < 0 ? 0 : hk > 1 ? 1 : hk;
    hk = hk * hk * (3 - 2 * hk);
    _capC.set(0, sceneApi.consts.CAP_Y, 0).applyMatrix4(mw);
    _grad.sx = _capC.x; _grad.sy = _capC.y; _grad.sz = _capC.z;
    _grad.d0 = sceneApi.consts.CAP_R * 1.2;
    _grad.d1 = sceneApi.consts.CAP_R * 2.6;
    _grad.k = hk;
    // Same-particle takeover: steer the hero's own dots (runs OUTSIDE the
    // anyVisible gate, like the dimmer, so the release path always executes;
    // it must run AFTER the shed's positions were integrated this frame and
    // BEFORE ambient.update reads its per-particle feed).
    computeDet();
    uDet.value.set(det[0], det[1], det[2]);
    takeover.update(eff, t, mw, uLean.value);
    ambient.update(shedRegions, gk, _grad, takeover.feed);

    group.visible = anyVisible;
    if (!anyVisible) return;
    coreMat.uniforms.uTime.value = t;
    uRev.value.set(eff[0], eff[1], eff[2]);
    const c = uCoh.value;
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
