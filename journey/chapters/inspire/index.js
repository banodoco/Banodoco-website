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
//      the FINAL UNIFICATION the same evening; the spore system's own
//      split/braid modes — organism/spores.js): the whole leg —
//      transition AND rest — is performed by the hero's OWN 4,200 shed dots.
//      The 5,100-spore GPU detail layer that used to fade in on the rest
//      approach is DELETED: even co-located and det-gated it was still a
//      swap to a visibly different stream ("it stays in the same spot, but
//      it switches to a completely different stream"). The rest richness is
//      a DECORATION of the same dots — the knot-pearl cadence rides the
//      system's per-dot brightness feed at full strength, core cohort
//      included — plus the det-gated core ribbons, which grow, never replace;
//   3. the spore system's color mode dims the hero shed as-and-where the
//      structured plume brightens — per particle, via its own feed — and
//      restores it byte-exactly at p = 0. This chapter only passes intent
//      through the driver seat (see the seat claim below).
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
  makeGlowTexture, makeStreakTexture,
} from '../../anatomy.js';
import { EXITS } from './anatomy.js';
import { endOf } from '../../route.js';
import { isBaked, geometry, payload, registerGeometry, registerPayload, bakeDumpDone } from '../../lib/baked.js';
import { createDial } from '../../dial.js';
import { T_QA_ACTIVE, T_QS_VALUE, getTransformStorage, setTransformStorage } from '../../../flags.js';

const TAU = Math.PI * 2;
const N_GILL_CHANNELS = 230;                 // the hero's gill count
const CHANNEL = TAU / N_GILL_CHANNELS;
const FOG_NEAR = 7.0, FOG_FAR = 20.0;
const BREEZE = new THREE.Vector3(1.0, 0.62, 0.17).normalize();
// D17 RE-AXIS (Hannah, round 8 — the locus half of the note): the organized
// braid must occupy the SAME diagonal volume as the hero's visible drift
// column (BREEZE_DIR (1.0, 0.62, 0.17): per unit of rise the drift advances
// x by RX and z by RZ). Everything that rises — converted dots (takeover),
// ribbons, wisp guides, the shed's rise-corridor capsule, the label anchors —
// shares these ratios, so organization tightens the column IN PLACE instead
// of relocating it to an upright rim column (the "it switched" read).
const DRIFT_RX = 1.0 / 0.62;
const DRIFT_RZ = 0.17 / 0.62;

const tmpC = new THREE.Color();

/* ----------------------------------------------------------------------
   MASTER TASTE DIAL — TRANSFORM (T), Hannah's own knob (2026-08-03,
   review round 8). Seven rounds in, the note is still "the stream
   transforms into a different thing when I rotate around" — and it is
   the STREAM's choreography (drift reorganizing into designed braided
   plumes), confirmed by direct question. Rather than guess the right
   intensity an eighth time, the WHOLE reorganization scales coherently
   from one live scalar T (0..1):
     - dot path blend toward the braid (lerp by conv * T;
       rim-walks scale, never sever)         organism/spores.js (steer)
     - core-cohort scatter tightening (x T)  organism/spores.js (steer)
     - pearl brightness gain (x T, floored)  organism/spores.js (steer)
     - furniture (source filaments, beads, wisps, rim currents) x T
     - shed hand-over dims (capsules / global / history) x T
     - residual coherence x T; streak x (STREAK_FLOOR + rest * T) — the
       streak keeps a modest floor because it anchors the active label
   T = 1 is EXACTLY the full build (i.e. with the D17 re-axis below —
   every scale law hits 1); T = 0 leaves the hero's stream
   visually untouched (labels, the streak's floor glint and a faint
   pearl sparkle remain). Every channel stays a pure function of
   (eff, time, T): changing T mid-scrub re-scales live with no state
   corruption, and the p = 0 byte-exact restore is untouched (every T
   channel multiplies an Inspire-leg drive that is already zero at p=0).
   Baked (merge doc §1 rule 6): the SHIPPED path runs T_SHIPPED and
   reads neither the query nor localStorage. The dial is a QA tool now,
   activated only when ?t= is present in the URL: ?t=0.45 sets T at
   load (?t alone recalls the last persisted QA value), [ / ] step
   0.05 and persist, and a small aria-hidden readout (bottom-left)
   stays visible while in QA mode. Plain loads build none of it.
   ---------------------------------------------------------------------- */
// T_SHIPPED — the TRANSFORM value the site ships with.
//
// PROVENANCE. Through M3-M5 this stayed at 0.30: the dial build's own code
// default, recorded there as "a deliberately restrained first offer, not a
// measured choice", pending Hannah's ride. D18 (2026-08-05) is that ride, and
// it retires 0.30 — because 0.30 cannot satisfy the brief at ANY camera angle.
//
// The reason is mechanical. Every dot's displacement onto its braid is
// cvT = conv * T (organism/spores.js steer): at T = 0.30 a dot moves 30% of
// the way from its free drift onto the designed path and keeps the rest of its
// drift, so the three braids never resolve. Measured on the live 4,200-dot
// buffer at the rest — horizontal density profile of the plume band, counting
// separated lobes:
//   T 0.30 -> 1 peak    T 0.65 -> 1 peak    T 0.85 -> 3 peaks
//   T 0.50 -> 1 peak    T 0.80 -> 3 peaks   T 0.94 -> 3 peaks
// One peak IS the "1 merged cloud" note, and it was there at every azimuth
// tried. The three-lobe threshold is ~0.78; 0.85 sits above it with the
// deepest valleys measured (peaks 0.33 / 1.00 / 0.28 of max, valleys 0.24 and
// 0.23) without pushing the FURNITURE — the 56 source filaments per exit, the
// wisp guides, the rim currents and the core ribbons, all of which also scale
// with T — into the wiry, over-drawn look that T = 1.0 gives.
//
// TENSION WORTH KNOWING. T was introduced to RESTRAIN the reorganization,
// after seven rounds of "the stream transforms into a different thing when I
// rotate around". Raising it to 0.85 pushes back against that note, and it is
// the one number in this restage most likely to want Hannah's own eye. The
// dial is still live: ?t=0.55 (or [ / ]) rides any value without a rebuild.
// If she wants the transformation calmer, lower THIS constant — but below
// ~0.78 the three streams collapse back into one, so the honest trade is
// fewer, softer streams, not the same three more quietly.
const T_SHIPPED = 0.85;
const T_STEP = 0.05;
// D26 (2026-08-09, Hannah's eighth report: "They shouldn't EVER switch
// positions based on a move — emphasis should just be changed"): the
// position channel is DELETED from the spore system. The dots belong to the
// wind at every scroll position; the three streams are carried by LIGHT — a
// per-dot emphasis field along the route chains, computed by the seat from
// the same per-exit reveals this chapter has always driven. D25's standing
// route-ride floor (FLOOR_B) and D24's gather drive existed to pace the
// position blend across the boundary; with no position blend there is
// nothing left to pace, and both are retired WITH the model, not tuned to
// zero. (The T provenance note above predates D26: the three-lobe density
// sweep it cites was measured on the positional braid. T now scales the
// emphasis — brightness, cadence, coherence, furniture — and the three
// streams' legibility lives in the lighting radii/gains in
// organism/spores.js.)
const STREAK_FLOOR = 0.25;
// clamping/grid-snap now lives in ../../dial.js (createDial), which this
// module's tDial instance owns — see the master TRANSFORM state block below.

// ---------- shared faint-line material (sources / wisps / cap flow) ----------
function makeStrandMat(opacity, flow) {
  const m = new THREE.ShaderMaterial({
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
  // taste dial: remember the authored opacity so the per-frame T scaling has
  // a stable base (uOpacity = baseOpacity * T; uFade keeps the draw-on
  // choreography untouched — intensity scales, staging does not truncate)
  m.userData.baseOpacity = opacity;
  return m;
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
  const counts = { sourceSegs: 0, wispSegs: 0, beads: 0, rimSegs: 0 };

  /* ---- master TRANSFORM state (see the block comment at module scope).
     Re-implemented on the taste-dial registry (../../dial.js, M5): SHIPPED
     runs T_SHIPPED, nothing else consulted; QA (?t= present) reads the
     query value if it parses, else the last persisted QA value, else the
     baked default; [ / ] steps 0.05, clamped 0..1, and only an interactive
     adjustment writes storage. dial.js owns the mechanism (clamp, keys,
     readout, persistence) — this call site owns only TRANSFORM's numbers.
     flags.js (THE flag registry) is the sole reader of ?t= / localStorage;
     dial.js never touches either directly. */
  const tDial = createDial({
    name: 'transform',
    shipped: T_SHIPPED,
    min: 0, max: 1, step: T_STEP,
    keys: ['[', ']'],
    active: T_QA_ACTIVE,
    qsValue: T_QS_VALUE,
    loadStored: getTransformStorage,
    saveStored: setTransformStorage,
  });

  // per-exit fade drivers (sequential reveal). The old 4th channel (backlit
  // gill band) is GONE per D16: it was a self-igniting filler for the long
  // orbit's sparse middle, in a sector unrelated to the stream — the exact
  // "new spores appear at the back" read. The short stream-side leg has no
  // sparse middle and the no-self-ignition principle bans the element.
  const exits = EXITS.map((spec) => ({ spec, fade: 0, target: 0, mats: [] }));

  // ---- baked read path (2026-08-17) -----------------------------------
  // Inspire's 11 static line/point buffers are baked under 'inspire/<site>'
  // (§1 srcFil/srcBeads per exit, §2 wisps per exit, §2b rimCurrents per
  // link). One isBaked check, one try/catch: any missing key or shape
  // mismatch throws and falls back to the live builders below — never a
  // half-baked mix. Everything else — materials, group.add, ex.mats/
  // srcMat/wispMat, rimLinks[{mat}], the spore seat, shedRegions, sprites,
  // reveal state and the animator — stays live on BOTH paths; only the
  // geometry math (and the seeded RNG draws it consumes) is skipped. counts
  // round-trips via payload: the loop increments are what draw the two seed
  // streams, so recomputing after skipping them would mis-sync the RNG.
  const geometries = {};
  const baked = (() => {
    if (!isBaked('inspire')) return null;
    try {
      const P = payload('inspire');
      if (!P || !P.counts
          || typeof P.counts.sourceSegs !== 'number'
          || typeof P.counts.wispSegs !== 'number'
          || typeof P.counts.beads !== 'number'
          || typeof P.counts.rimSegs !== 'number') {
        throw new Error('inspire counts payload mismatch');
      }
      const STRAND = [['position', 3], ['color', 3], ['aProg', 1]];
      const BEADS = [['position', 3], ['color', 3], ['psize', 1]];
      return {
        counts: P.counts,
        g: {
          srcFil: [0, 1, 2].map((n) => geometry(`inspire/srcFil${n}`, STRAND)),
          srcBeads: [0, 1, 2].map((n) => geometry(`inspire/srcBeads${n}`, BEADS)),
          wisps: [0, 1, 2].map((n) => geometry(`inspire/wisps${n}`, STRAND)),
          rimCurrents: [0, 1].map((n) => geometry(`inspire/rimCurrents${n}`, STRAND)),
        },
      };
    } catch (e) {
      return null;
    }
  })();
  if (baked) Object.assign(counts, baked.counts);

  /* ================================================================
     1. UNDER-RIM SOURCE GEOMETRY — brightened gill filaments + embers
        in each exit sector (hidden until orbit; front view untouched)
     ================================================================ */
  for (let i = 0; i < exits.length; i++) {
    const ex = exits[i];
    const { az } = ex.spec;
    const lp = [], lc = [], lg = [];
    const bp = [], bc = [], bs = [];
    const N_FIL = 56;
    for (let f = 0; !baked && f < N_FIL; f++) {
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
    const filGeo = baked ? baked.g.srcFil[i] : strandGeo(lp, lc, lg);
    if (!baked) geometries['srcFil' + i] = filGeo;
    group.add(new THREE.LineSegments(filGeo, mat));

    // beads: small additive points with the same fade
    const bGeo = baked ? baked.g.srcBeads[i] : new THREE.BufferGeometry();
    if (!baked) {
      bGeo.setAttribute('position', new THREE.Float32BufferAttribute(bp, 3));
      bGeo.setAttribute('color', new THREE.Float32BufferAttribute(bc, 3));
      bGeo.setAttribute('psize', new THREE.Float32BufferAttribute(bs, 1));
      geometries['srcBeads' + i] = bGeo;
    }
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
  for (let i = 0; i < exits.length; i++) {
    const ex = exits[i];
    const { az, riseMin, riseMax } = ex.spec;   // spec.lean retired by D17
    const isMig = ex !== exits[0];
    const azSrcBase = EXITS[0].az;
    const lp = [], lc = [], lg = [];
    const N_WISP = 4;
    for (let w = 0; !baked && w < N_WISP; w++) {
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
          } else {                            // braided rise along the drift axis (D17)
            const k = (t - 0.58) / 0.42;
            const aa = a0 + curl + 0.30 * Math.sin(k * 4.2 + sp);
            const rr = rimR + 0.06 + 0.22 * Math.sin(k * 3.1 + sp * 1.7);
            const y = rim.y + 0.10 + k * rise;
            p = new THREE.Vector3(Math.cos(aa) * rr, y, Math.sin(aa) * rr);
            p.x += DRIFT_RX * k * rise;
            p.z += DRIFT_RZ * k * rise;
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
          } else {                            // braided rise along the drift axis (D17)
            const k = (t - 0.66) / 0.34;
            const aa = a0 + curl + 0.30 * Math.sin(k * 4.2 + sp);
            const rr = rimR + 0.06 + 0.22 * Math.sin(k * 3.1 + sp * 1.7);
            const y = rim.y + 0.10 + k * rise;
            p = new THREE.Vector3(Math.cos(aa) * rr, y, Math.sin(aa) * rr);
            p.x += DRIFT_RX * k * rise;
            p.z += DRIFT_RZ * k * rise;
          }
        }
        pts.push({ p, t });
      }
      for (let s = 0; s < SEG; s++) {
        const A = pts[s], B = pts[s + 1];
        lp.push(A.p.x, A.p.y, A.p.z, B.p.x, B.p.y, B.p.z);
        // THE WISP DIES WHERE THE DUST BEGINS (Hannah, 2026-08-06, third spore
        // report: "these kind of weird arrows inside of them"). The old ramp
        // faded to 0.05 and then added a +0.1 FLOOR, so the strand's colour
        // bottomed out at heat(0.126) — and heat(0) is not black either, it is
        // C_DARK 0x421c05. Under additive blending against an empty sky that
        // floor is plainly visible: twelve continuous, perfectly smooth curves
        // (4 wisps x 3 exits) climbing the full height of the shed, through
        // and past the dust. In a 2.6x exposure of the inspire golden they are
        // the most conspicuous thing in the frame, and they are the only
        // continuous-line form left in open sky since the core ribbons went.
        //
        // This is the ribbon lesson again, in the same file: "a continuous
        // line cannot read as dust at any opacity". So the fade now runs to
        // LITERAL BLACK (multiplyScalar, not a walk down the heat ramp) and it
        // completes at t = 0.70 — which is past every exit's rim walk and curl
        // but before any of them starts to rise. The delta story the wisps
        // exist to tell (born between the gills, out to the margin, walking
        // the rim to the release sector) is untouched and still draws on with
        // the live current; what is gone is the stroke crossing open sky,
        // where the spores alone should carry the braid.
        //
        // A STATIC fade along the strand, baked into the vertex colours — the
        // same at every frame, so this is not a fade-out over open view and
        // reverse scrubs still mirror exactly.
        const fadeTop = (tt) => {
          let x = (tt - 0.50) / 0.20;
          x = x < 0 ? 0 : x > 1 ? 1 : x;
          return 1 - x * x * (3 - 2 * x);
        };
        const fa = fadeTop(A.t), fb = fadeTop(B.t);
        heat(0.52 * fa + 0.1, tmpC).multiplyScalar(fa); lc.push(tmpC.r, tmpC.g, tmpC.b);
        heat(0.52 * fb + 0.1, tmpC).multiplyScalar(fb); lc.push(tmpC.r, tmpC.g, tmpC.b);
        lg.push(A.t, B.t);
        counts.wispSegs++;
      }
    }
    const wispGeo = baked ? baked.g.wisps[i] : strandGeo(lp, lc, lg);
    if (!baked) geometries['wisps' + i] = wispGeo;
    const mat = makeStrandMat(0.15, 1.0);
    ex.mats.push(mat);
    ex.wispMat = mat;                    // trace-back target (full path, plume -> gills)
    group.add(new THREE.LineSegments(wispGeo, mat));
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
    for (let i = 0; i < linkSpecs.length; i++) {
      const lk = linkSpecs[i];
      const lp = [], lc = [], lg = [];
      for (let l = 0; !baked && l < N_LINE; l++) {
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
      const linkGeo = baked ? baked.g.rimCurrents[i] : strandGeo(lp, lc, lg);
      if (!baked) geometries['rimCurrents' + i] = linkGeo;
      const mat = makeStrandMat(0.12, 1.0);
      group.add(new THREE.LineSegments(linkGeo, mat));
      rimLinks.push({ mat });
    }
  }

  // ---- bake recording site (2026-08-17) -------------------------------
  // Inspire bakes ATOMICALLY: the 11 static line/point buffers (§1 source
  // filaments + beads, §2 wisps, §2b rim currents) are final the instant the
  // loops above return — there is no cross-module post-pass (Owned needed
  // substrate.assignOwners to finalise aOwner; Inspire has no analogue). The
  // spore seat, shedRegions, every ShaderMaterial + its uniforms, the streak
  // and lip-glow sprites, the reveal state and the animator are all runtime
  // steering and stay live on BOTH paths — only the geometry math (and the
  // seeded RNG draws it consumes) is skipped on the baked read path. counts
  // round-trips via payload: recomputing after skipping the loops would
  // mis-sync the two seed streams. Under ?bakedump=1 each registerGeometry
  // copies the live-built attributes into window.__bake; on the shipped path
  // these are no-ops.
  for (const [site, geo] of Object.entries(geometries)) {
    registerGeometry(`inspire/${site}`, geo);
  }
  registerPayload('inspire', { counts });
  bakeDumpDone('inspire');
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

  const uLean = { value: 1.0 };
  const uCoh = { value: new THREE.Vector3(0, 0, 0) };

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

  // THE REST MATRIX (851c77a): a lip's world position with both wind
  // rotations zeroed — swayGroup is rotation-only about the origin, capBend
  // is the throat translation plus a rotation-only bend, and the mushroom's
  // own local transform is static, so the chain collapses to
  // T(capBend.position) * mushroom.matrix. Computed once, cached. Declared
  // HERE because the release-lip glows (5b) pin to it at build time; the
  // full WHY — the chips came first — is the comment above nodeWorld().
  let restMat = null;
  function mushroomRestMatrix() {
    if (restMat) return restMat;
    const mush = sceneApi.groups.mushroom;
    const capBend = mush.parent;          // pivot at the throat (rotation-only in wind)
    mush.updateMatrix();                  // local matrix: static tilt/lean, set once
    restMat = new THREE.Matrix4()
      .makeTranslation(capBend.position.x, capBend.position.y, capBend.position.z)
      .multiply(mush.matrix);
    return restMat;
  }

  /* ================================================================
     5b. RELEASE-LIP GLOWS (2026-08-09, owner's brief item 1: "light up
         three specific points along the relevant edge of the mushroom").
         WHAT: one compact soft warm glow sprite sitting exactly on each
         exit's release lip — the same rim anchor the streak uses, so the
         three lit points ARE the three release points and nothing else.
         WHY a separate element: the streak (5) is hover/selection only
         since 2026-08-06, so at the settled rest NOTHING marked the three
         points on the edge; the braids read as sky structure with no
         visible attachment to the cap. These are the attachment — small,
         soft and round (glowTex, additive), the opposite substance to the
         12:1 anamorphic blade, so they read as the edge glowing rather
         than as another drawn form.
         REVEAL: each glow rides its OWN exit's destination-furniture law
         (furnOf) — exit 0 on eff[0], the migrants gated on their rim
         current's arrival — so a lip never lights before the current that
         feeds it reaches it (no-self-ignition), all three are exactly 1
         at the Inspire rest, and all three are 0 outside the section.
         PURE IN (eff, T): direct assignment, no temporal easing, so a
         reverse scrub mirrors the forward one exactly (the reveal-is-a-
         position rule in the animator). x T so the glows belong to the
         taste dial's one reorganization like every other furniture channel.
         DUALITY: the law lives in BOTH the animator's per-exit loop AND
         snap() — snap() is the path every frozen capture and every ?p=
         deep link takes (dt = 0 freezes the animator), so a law in one
         place only would be missing from every still. See the note above
         st.o in snap().
         HELD STILL (2026-08-11, Hannah: the dots "should stay STABLE in
         the one place, not move"). Two changes, one intent:
           1. POSITION — the sprite parents to the SCENE, not the swaying
              cap, at the lip's REST position (mushroomRestMatrix above,
              the same anchor 851c77a pinned the chip dot to). Measured
              before: 7.1x13.4 / 11.0x16.6 / 3.4x5.2 px of breeze wander
              over 16 s at the rest — the ember drifted around the very
              dot that names it.
           2. BRIGHTNESS — no breathing term in either path (the animator
              used to carry x(0.9 + 0.1 sin); snap() never did). The two
              laws are now literally identical, and the ember holds one
              level at the rest.
         The life is not deleted, it is LEFT WHERE IT ALREADY LIVES: the
         braids, wisps and the spore streams around the lip all shimmer
         on their own clocks — the marker is the one thing that holds.
         lipHolder mirrors group.visible every frame (animators still run
         under freezeTime), so the seam gate keeps working.
         2026-08-16: the REVEAL paragraph above gained a third factor —
         the ember is now furnOf x the landing cascade (5c below), so it
         ignites at the landing, in the cascade's order, rather than
         riding the orbit's furniture ramp alone. furnOf keeps its duty:
         no ember before the current that feeds it.
     ================================================================ */
  const lipHolder = new THREE.Group();
  lipHolder.visible = false;
  sceneApi.scene.add(lipHolder);
  const lipGlows = exits.map((ex, i) => {
    const mat = new THREE.SpriteMaterial({
      map: glowTex,
      color: heat(0.78, new THREE.Color()).clone(),
      transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const s = new THREE.Sprite(mat);
    s.scale.set(0.70, 0.70, 1);
    // the exact lip anchor (see 5), at its REST pose — held out of the wind
    s.position.copy(streaks[i].localPos).applyMatrix4(mushroomRestMatrix());
    s.visible = false;
    lipHolder.add(s);
    return { sprite: s, mat };
  });

  /* ================================================================
     5c. THE LANDING CASCADE (2026-08-16, Hannah: the three labels
         "show up one at a time from left to right once the things
         land", and the light edges "turn up one at a time in that
         order too", timed with the intro).
         WHAT: once the streams have landed AND the chapter's copy is
         re-anchoring (the intro), the three lip embers ignite one at
         a time in SCREEN order at the rest — Arca (left rim), then
         ArtCompute (centre), then 2RP (right rim) — and each label
         stands up with its own ember via nodeReveal below, exactly
         the architecture Connect's chips got the same day ("the
         labels should show up as soon as each light line
         progresses"): the scene owns the cadence, the chips ride it,
         and ui.js skips its 150 ms queue for reveal chips because
         this cascade IS the stagger.
         THE GATE is the chapter's eased copy opacity, bound by
         journey.js (bindLandingGate -> ui.copyEase('inspire')) — the
         one signal that already means "the intro is playing": it
         waits for the camera to settle on a scroll arrival, rides
         the armCopyEntry envelope on a nav jump, and releases the
         moment travel begins, so the embers leave with the heading
         rather than lingering on a moving frame. Unbound (QA
         harnesses that build the chapter alone) it defaults to 1 and
         the embers ride furnOf exactly as before this note.
         WALL-CLOCK, DELIBERATELY — like the chips' own arrival
         stagger and unlike every stream channel: the reveal-is-a-
         position rule protects the TRANSFORMATION (per-dot state
         that corrupts across direction reversals); the ember is a
         stateless marker whose feed gate (furnOf, kept as a factor
         below) is still pure in position, so no ember can ever light
         before the current that feeds it arrives — lighting LATER
         than the feed is the one direction no-self-ignition permits.
         dt = 0 (placeAt / ?p= / captures) snaps a to its target like
         the chips' h.a, so every frozen still is the settled frame.
     ================================================================ */
  const LAND_ORDER = [1, 0, 2];      // screen left -> right at the rest:
                                     // Arca 6.98 (left rim), ArtCompute 5.83,
                                     // 2RP 4.68 (right rim) — anatomy.js
  const LAND_STAGGER_S = 0.38;       // one ember at a time, still one gesture
  const LAND_IN_K = 5.0;             // ~0.2 s to 63% — an ignition, not a pop
  const LAND_OUT_K = 9.0;            // leave with the copy (HOTSPOT_OUT_K pace)
  const LAND_ON = 0.60;              // gate threshold: first ember ignites
                                     // while the heading is still resolving —
                                     // overlap reads as one intro, not a queue
  const land = exits.map(() => ({ a: 0, at: null }));
  let landGate = null;               // bound by journey.js; null = QA default 1
  function driveLand(t, dt) {
    const g = landGate ? landGate() : 1;
    for (let s = 0; s < 3; s++) {
      const L = land[LAND_ORDER[s]];
      if (g > LAND_ON) {
        if (L.at === null) L.at = t + s * LAND_STAGGER_S;
        if (dt === 0) L.a = 1;
        else if (t >= L.at) L.a += (1 - L.a) * Math.min(1, dt * LAND_IN_K);
      } else {
        L.at = null;
        if (dt === 0) L.a = 0;
        else { L.a += (0 - L.a) * Math.min(1, dt * LAND_OUT_K); if (L.a < 0.02) L.a = 0; }
      }
    }
  }

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
  // The same-particle takeover and the shed dimmer are MODES OF THE SPORE
  // SYSTEM (merge doc §3), living in organism/spores.js behind the driver
  // seat. The chapter claims the seat once with its exit anatomy
  // (EXITS — az/rise/knot, the anchors this chapter stages the leg around)
  // and passes intent through seat.drive() each frame: per-exit effective
  // reveals, the dim regions/global/history channels, and the TRANSFORM
  // taste value. The hero's own 4,200 dots perform the whole transition —
  // steered by the system itself, after its own drift integrator (this
  // chapter's animator runs later in the insertion-ordered Map, which is
  // when drive() is called). No buffer is touched from this file;
  // conservation and byte-exact restore are the spore system's own.
  const sporeSeat = sceneApi.spores.setDriver({ exits: EXITS });
  // D25: allocate + assign the per-dot steering state NOW, at chapter build,
  // instead of on the first mid-scroll frame that needs it — initSteer's
  // cost used to land as part of a 100-400 ms hitch at the exact crossing
  // Hannah reported as "a lot of jankiness" (measured; the rest of that
  // hitch was first-use shader compilation, warmed in journey.js boot).
  if (sporeSeat.prime) sporeSeat.prime();
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
      // D17 re-axis: the rise corridor's top follows the leaned braid, so the
      // shed dim tracks where the organized column actually lives
      const top = new THREE.Vector3(
        Math.cos(spec.az) * (rimR + 0.19) + rise * DRIFT_RX,
        rim.y + 0.10 + rise,
        Math.sin(spec.az) * (rimR + 0.19) + rise * DRIFT_RZ,
      );
      const homeAz = i === 0 ? spec.az : srcAz;   // where this plume is BORN
      const srcLip = i === 0 ? lip.clone() : lipAt(srcAz);
      const inner = capUnderPt(0.52, homeAz);
      inner.y -= 0.12;
      const tail = srcLip.clone().addScaledVector(BREEZE, driftLen[i]);
      // rise corridor; role indexes the D26 contrast weights (see DIM_ROLE
      // in the animator). D27: the full-strength core (r0) is widened to
      // reach the inter-lane gap (~1.4 u at the rim) — with the release arc
      // feeding every sector, the valleys between the lit lanes are ambient
      // dust at its own brightness, and only a recede that actually covers
      // the gap can carve the three-stream read out of one continuous field.
      list.push({ exit: i, role: 0, la: lip,             lb: top,  r0: 0.72, r1: 2.05, gain: 0.78 });
      list.push({ exit: i, role: 1, la: inner,           lb: srcLip.clone(), r0: 0.50, r1: 1.45, gain: 0.55 });
      list.push({ exit: i, role: 2, la: srcLip.clone(),  lb: tail, r0: 1.00, r1: 2.60, gain: i === 0 ? 0.52 : 0.40 });
      // migration corridor: source lip -> release lip (rim arc sagitta stays
      // inside r1 for both spans)
      if (i > 0) list.push({ exit: i, role: 3, la: srcLip.clone(), lb: lip.clone(), r0: 0.50, r1: 1.35, gain: 0.35 });
    }
    for (const rg of list) { rg.a = new THREE.Vector3(); rg.b = new THREE.Vector3(); rg.k = 0; }
    return list;
  })();

  // Arrival ramps — the scroll-locked half of the handoff, re-keyed for the
  // D18 orbit (a ~127 deg swing, hero az ~-12 -> rest az 115). The chapter
  // multiplies each seam-gated fade by its own azimuth ramp so every exit's
  // effective reveal is continuous in scroll position (snap/?p= included),
  // grows only as the camera actually travels toward the stream, and plays
  // backward identically. Sequence: the stream itself organizes first
  // (ArtCompute), then the Arca current peels off along the rim, then 2RP.
  //
  // WHY THEY ALL FINISH BY az ~74 NOW. These bounds are absolute camera
  // azimuth, and D18 made azimuth non-monotone across the leg: the arrival
  // climbs to 115 and the exit falls back to 68.8 to meet Connect. Anything
  // still ramping above 74 would therefore run BACKWARD on the way out — the
  // plumes would visibly dissolve while the visitor is still looking at them,
  // which is the no-self-ignition rule played in reverse. Saturating every
  // channel by 74 means the whole span the exit travels (115 down to ~83
  // before the seam's own retire takes over at p 0.355) is flat at reveal = 1,
  // so the only thing that ever fades the plumes out is `out` below. Verified
  // by sampling all three effective reveals across p 0..0.42: no channel rises
  // after it has fallen, at any point in the run.
  //
  // T1 arms where the reveal PRODUCT is still exactly zero — az 4.79 against
  // an onset of 5 — so arming can never step on a ramp. That threshold is
  // derived from these bounds; see seams.js, and re-derive it if they move.
  //
  // ---- EVERY RAMP RUNS TO THE CEILING (2026-08-07) ----------------------
  // Hannah's "they just flash up" survived `9e2a277`: that commit spread each
  // cohort's brightening across the WHOLE of its reveal, which is all a dot
  // can do, and then ran into the reveal's own p-width. The resident's window
  // was az 14..44, and the arrival crosses 30 deg of azimuth in Δp 0.044 — so
  // at MAX_SCRUB_RATE the entire arrival could not last longer than ~97 ms
  // however its amplitude was distributed. Under ~150 ms a luminance change
  // reads as a cut, not a fade, so the cohort could still land as a flash.
  //
  // WHERE THE BUDGET WAS, AND WHERE IT WAS NOT. `9e2a277`'s note pointed at
  // p 0.1825–0.26, which is indeed all rest — but that region is all ABOVE
  // az 78, and no ramp may finish above ~83: the arrival climbs to 115 and the
  // exit leg falls back through it to meet Connect, so a ramp still open up
  // there would run BACKWARD in view on the way out (the rule stated below
  // this block, and the reason D18 pulled the old bounds in). That budget is
  // unspendable. The budget that IS spendable was inside these very numbers:
  // the resident's ramp SATURATED at az 44 and then sat flat for the 34
  // further degrees the cascade had left before the ceiling. Every ramp was
  // finishing early and idling.
  //
  // So every ramp now runs to the ceiling and the sequence is carried by the
  // ONSETS alone. That is the whole change: the three streams still enter in
  // the authored order (the visible stream gathers first, the Arca current
  // peels off along the rim, 2RP last) and are always visibly at different
  // stages — at az 40 they stand at 0.47 / 0.32 / 0.13 — but each one now
  // spends every remaining degree of the swing growing instead of stopping.
  // The resident's window goes 30 -> 73 deg, Δp 0.044 -> 0.101 (measured).
  //
  // ONSETS. 5 / 17 / 29. The first is the master drive's own onset (the
  // `band` channel, sm(5, 28) in drive() below) — the reveal is a product of
  // the two, so nothing can begin before 5, and putting the resident exactly
  // there costs nothing and makes the seam derivation exact: BOTH factors are
  // zero at az <= 5.
  //
  // 12 deg is the SMALLEST spacing that still reads as an order, and small is
  // what this wants: the three windows all end at 78, so every degree of
  // spacing is a degree taken off the later streams. Measured per cohort
  // (dots crossing luminance 1.0, split by cap-local azimuth at the rest;
  // frames carrying 80% of that cohort's amplitude, at MAX_SCRUB_RATE),
  // widening the spacing costs the tail and buys nothing:
  //
  //     spacing      ArtCompute   Arca   2RP     conservation drawdown
  //     12 (this)         7         5     3            -1.97%
  //     18                7         4     3            -1.50%
  //     21                7         4     2            -0.84%
  //     shipped 20/16     4         2     2            -2.10%
  //
  // Every cohort improves against shipped at every spacing; 12 is simply the
  // best of them, and it is also where the two migrant streams stop being the
  // worst thing on screen. See 07-chapter-inspire.md (2026-08-07, later).
  //
  // CEILING 78, unchanged and still the binding constraint — it is the number
  // D18 chose for the reversal rule above, kept to the digit.
  const ARR = [
    { a0: 5,  a1: 78 },   // ArtCompute — the visible stream, gathered first
    { a0: 17, a1: 78 },   // Arca — its current peels off along the rim
    { a0: 29, a1: 78 },   // 2RP — the far branch, last
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

  // LABEL ANCHORS: the LIT RELEASE LIP, held at its REST pose (2026-08-10).
  //
  // Hannah: "make it so that the labels are pointing at the edge of the
  // mushroom — the part where it's actually lighting up, not the part above"
  // — and, the same day, "the items and their marker should stay in one
  // place", i.e. never ride the wind in ANY state (the generalisation of
  // 6d37205's hover-only hold).
  //
  // Both are one change here. The old anchor was mid-plume (W3-B's
  // labelOffsets lifted the chip 55% up the rise, leaned with the breeze) for
  // a reason that is now stale: W3-B measured the lip projecting into the
  // bottom-centre copy rect, but the compositions have moved since (ca7a769
  // re-centred the cap, 93723f0 pushed the mushroom down) and the three lips
  // now project 157+ px CLEAR of the copy block at 1440x900 (lips at
  // y 344-452 against copy top 608.5; measured 2026-08-10). So the chip can
  // sit where the content is: on the lip-glow ember (ce91bc2) — the lit point
  // the label names.
  //
  // WHY THE REST POSE and not the live lip: the ember is a child of the
  // swaying cap, and at the Inspire rest it wanders 14.5x20.7 / 18.8x18.4 /
  // 7.7x4.7 px (ArtCompute/Arca/2RP, 12 s trace) — the exact motion Hannah
  // wants gone. The hero's EQUIP callout answered this in e20f7ff: anchor to
  // the sway PIVOT, not the swaying tip. Here that means the lip's world
  // position with both wind rotations zeroed — swayGroup (organism.js
  // 'breeze') carries rotation only about the origin, capBend carries the
  // throat translation plus a rotation-only bend, and the mushroom's own
  // local transform is static, so the rest matrix collapses to
  // T(capBend.position) * mushroom.matrix. It does not lie about what it
  // points at: the ember draws ~86-100 px across on screen and its breeze
  // swing is +-7-10 px, so the held dot stays inside the lit glow at every
  // phase of the gust — same argument, same numbers game, as e20f7ff's stalk.
  //
  // Measured after (12 s at the rest, 1440x900): every chip holds at
  // 0.65 x 0.62 px — the camera-only floor, identical to Connect's hubs and
  // Owned's faces, whose anchors were always static. See
  // 07-chapter-inspire.md (2026-08-10).
  //
  // (mushroomRestMatrix itself now lives above section 5b: since 2026-08-11
  // the embers pin to the same rest anchor as the chips that name them.)

  const _wv = new THREE.Vector3();
  const api = {
    group,
    counts,
    exits: EXITS,
    /** QA handle: the spore-system driver seat (per-dot conv/brightness
     *  feed; ?tkdbg adds perf + animator-order probes). */
    _sporeSeat: sporeSeat,
    /** MASTER TASTE DIAL (see the block comment at module scope). Sets the
     *  live TRANSFORM scalar, clamped 0..1, via ../../dial.js — which
     *  persists it through flags.js's getTransformStorage/setTransformStorage
     *  (localStorage key 'journey.transform') — QA mode only (?t= present;
     *  the shipped path neither reads nor writes the key). The [ / ] keys
     *  pass persist: true; programmatic calls default to session-only.
     *  Pure re-scale: every channel is a function of (eff, time, T), so
     *  this is safe at any p, mid-scrub included. */
    setTransform(v, opts) { return tDial.set(v, opts); },
    get transform() { return tDial.value; },
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
    /** Jump the eased fades straight to their targets (review + QA helper —
     *  a hidden tab only runs frames during capture bursts). W4-A: also snaps
     *  coherence and the streak so a ?p= capture sees the settled frame. */
    snap() {
      for (const ex of exits) ex.fade = ex.target;
      computeEff();                 // camera is already placed by placeAt
      effActive = resolveActive();
      const T = tDial.value;        // taste dial: same scalings as the animator
      const stkScale = STREAK_FLOOR + (1 - STREAK_FLOOR) * T;
      // landing cascade (5c): a frozen capture is a settled frame — every
      // ember stands at its gate's own resolution, no clocks mid-flight
      // (the animator's dt = 0 branch says the same thing).
      {
        const g = landGate ? landGate() : 1;
        for (const L of land) { L.a = g > LAND_ON ? 1 : 0; L.at = null; }
      }
      const c = uCoh.value;
      for (let i = 0; i < 3; i++) {
        c.setComponent(i, ((i === active || i === selected) ? 1 : (i === effActive ? 0.35 : 0)) * T);
        const st = streaks[i];
        // hover/selection only — MUST stay identical to the animator's `want`
        // (see the note there). snap() is the path every frozen capture and
        // every ?p= deep link takes, because dt = 0 freezes the animator's
        // easing, so a law that lives in both places has to be changed in both.
        st.o = ((i === active || i === selected) ? 0.42 : 0) * furnOf(i) * stkScale;
        st.sprite.visible = st.o > 0.01;
        // release-lip glow (5b): the SAME law as the animator — since
        // 2026-08-11 literally the same expression (the animator's breathing
        // multiplier is gone; the ember holds one level, see 5b). x land (5c):
        // the ember belongs to the landing cascade now.
        const lo = 0.22 * furnOf(i) * land[i].a * T;
        lipGlows[i].sprite.visible = lo > 0.01;
        lipGlows[i].mat.opacity = lo;
        for (const m of exits[i].mats) {
          const fadeV = m === exits[i].wispMat ? eff[i] : furnOf(i);
          if (m.uniforms.uOpacity) {
            m.uniforms.uFade.value = fadeV;
            m.uniforms.uOpacity.value = m.userData.baseOpacity * T;
          } else {
            m.uniforms.uFade.value = fadeV * T;   // beads: see the animator note
          }
        }
      }
      const [fA, fB] = linkFades();
      rimLinks[0].mat.uniforms.uFade.value = fA;
      rimLinks[1].mat.uniforms.uFade.value = fB;
      for (const l of rimLinks) l.mat.uniforms.uOpacity.value = l.mat.userData.baseOpacity * T;
      // takeover positions are pure in (eff, time): the next pumped frame's
      // animator applies them with no temporal easing, so a ?p= capture sees
      // the settled conversion.
    },
    /** T1 streaming seam: arm/retire the whole exit set. */
    setArmed(on) { armed = !!on; if (!on) api.setReveal(0, 0, 0, 0); },
    get armed() { return armed; },
    /** Per-frame reveal drive (migrated from journey.js's driveInspire, M4:
     *  the chapter owns its own choreography — merge doc rule 3). The three
     *  exit regions reveal SEQUENTIALLY during the orbit and then stay
     *  visible together at rest (GB-1.3). Driven off the real camera
     *  azimuth, exactly as Spike A reviewed it, so manual poses and QA
     *  jumps arm the same way a scroll does. Called by the journey's frame
     *  loop for every chapter that exposes drive(p). */
    drive(p) {
      const azDeg = camAzDeg();
      const smz = (x) => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
      const end = endOf('inspire');
      // D26: the position channel is deleted (see the note at T_SHIPPED),
      // so the floor (D25) and gather (D24) drives are gone with it — the
      // reveal envelopes below are the WHOLE choreography, and they drive
      // lighting only.
      // PER-EXIT RETIRE ENVELOPES (D25). `out` used to be ONE scalar,
      // 0.355 -> 0.415, shared by all three exits — so entering from the
      // Connect side (where the ARR azimuth ramps are already ~saturated)
      // the ENTIRE emphasis crossed in Δp 0.06, all three streams at once:
      // the exact switch 2fdb4e6 removed from the Mission side, still
      // shipping on this one. The retire is now a cascade in p, mirroring
      // the ARR cascade in azimuth, with the SOURCE stream widest and last
      // out — so riding forward the migrants hand back first and the
      // visible stream lingers (the delta played backward), and riding in
      // from Connect the source organizes first, then Arca peels off, then
      // 2RP: the same authored order as the Mission-side arrival. All three
      // are exactly 1 at the rest and through p 0.35 (the approved framing
      // never dims), and exactly 0 by 0.430 — inside T1's re-arm edge at
      // p 0.44 and its release at 0.46, so the seam derivation stands.
      const out0 = 1 - smz((p - (end - 0.028)) / 0.078);   // ArtCompute 0.352 -> 0.430
      const out1 = 1 - smz((p - (end - 0.022)) / 0.060);   // Arca       0.358 -> 0.418
      const out2 = 1 - smz((p - (end - 0.015)) / 0.040);   // 2RP        0.365 -> 0.405
      if (!armed) { api.setReveal(0, 0, 0, 0); return; }
      // D17 locus law (Hannah, round 8): the braid rises along the stream's
      // own drift axis and must OVERLAY the drift envelope at every camera
      // angle. The old belly clamp damped the +x lean mid-orbit (to keep
      // cores off the view ray), which moved the organized column off the
      // stream's locus — exactly the "it switches place" read. Retired in
      // favour of locus fidelity: lean is always full; near-lens protection
      // stays with the shaders' near-camera fade (vNear), never with
      // re-uprighting geometry.
      api.setLeanScale(1);
      const sm = (a, b) => { const x = (azDeg - a) / (b - a); return x < 0 ? 0 : x > 1 ? 1 : x; };
      // gill band -> ArtCompute -> Arca Gidan -> 2RP, then a hold through the rest.
      // D18: pulled in from (36,72)/(76,112)/(104,142) to finish by az 78. The
      // old top bounds were authored when the rest was az 78, which left Arca
      // at 0.06 and 2RP at 0.00 reveal AT the rest — two of the three plumes
      // were barely lit, and that (not just the staging) is why the frame read
      // as one cloud. Carrying the camera to 115 made it worse, not better:
      // 2RP would have reached only 0.29. Now all three are exactly 1 from
      // az 78 through the rest and back down the exit.
      //
      // THESE FOUR ARE ONE NUMBER. setReveal takes max(a, b, c, band) and
      // gives every exit the same `target`; the per-exit shaping is the ARR
      // ramps above, applied in computeEff. `band` is the steepest of the
      // four from az -37.7 upward, so the master drive IS sm(5, 28) — a, b
      // and c never bind. They are kept, and re-keyed here to the ARR windows
      // they mirror, so that the master's onset stays 5 no matter which of
      // them someone edits next: the T1 derivation in seams.js rests on the
      // master being zero below az 5, and a channel that opened earlier would
      // silently move it.
      const a = sm(5, 78), b = sm(17, 78), c = sm(29, 78), band = sm(5, 28);
      // under the cap the plumes are behind us: retire them into the seam,
      // now on the PER-EXIT envelopes computed above (D25) — the master
      // drive is still max(a, b, c, band); each exit's target carries its
      // own retire so the Connect side has the same sequenced arrival the
      // ARR ramps give the Mission side. setReveal keeps its contract for
      // the seam gate (setArmed(false) zeroes everything).
      const m = Math.max(a, b, c, band);
      exits[0].target = m * out0;
      exits[1].target = m * out1;
      exits[2].target = m * out2;
    },
    /** Node id -> world position of its label anchor: the lit release lip
     *  (the ce91bc2 ember), at its REST pose so the chip never rides the
     *  wind — see the mushroomRestMatrix block above.
     *
     *  D22 CONSTELLATION NUDGE (2026-08-17, Hannah): 2RP's chip sat at the
     *  outermost rim point, at the same screen height as the rail glyph —
     *  it read as drifting toward the navigation rather than riding the
     *  cap. Its LABEL anchor (chip + dot only — the ember, the streak and
     *  the plume keep the true lip) pulls a step inward along the cap's
     *  own curvature (horizontal shrink toward the stem axis, slight lift),
     *  which keeps the dot inside the ember's ~90 px glow — the same
     *  numbers game the rest-pose hold played (a ~25 px offset against a
     *  bloom that size still reads as "on the lit edge"). The other two
     *  chips are untouched: the constellation stays an organic arc, not a
     *  re-arranged line. */
    nodeWorld(id) {
      const i = EXITS.findIndex(e => e.id === id || (id === 'tworp' && e.id === '2rp'));
      if (i < 0) return null;
      const p = streaks[i].localPos.clone();
      if (EXITS[i].id === '2rp') { p.x *= 0.90; p.z *= 0.90; p.y += 0.10; }
      return p.applyMatrix4(mushroomRestMatrix());
    },
    /** The landing cascade's intro gate (5c). journey.js binds the chapter's
     *  eased copy opacity here so the embers and labels arrive WITH the
     *  intro; unbound, the cascade runs open (QA harnesses). */
    bindLandingGate(fn) { landGate = typeof fn === 'function' ? fn : null; },
    /** Per-node chip gate (5c) — the same product the node's own ember
     *  rides (land x furnOf, both 0..1), so a label can never outrun the
     *  lit edge it names: each chip stands up as its ember finishes
     *  igniting, in the cascade's left-to-right order, and ui.js skips its
     *  arrival stagger for reveal chips because this cadence IS the
     *  stagger (the Connect precedent, 2026-08-16). */
    nodeReveal(id) {
      const i = EXITS.findIndex(e => e.id === id || (id === 'tworp' && e.id === '2rp'));
      return i < 0 ? 0 : Math.min(land[i].a, furnOf(i));
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
     *  key, deep link, inbound route, Escape, scroll-intent close).
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
    // taste dial: one scalar, read once per frame, scales every channel of
    // the stream's reorganization below (pure: no eased/integrated T state)
    const T = tDial.value;
    const stkScale = STREAK_FLOOR + (1 - STREAK_FLOOR) * T;
    // THE REVEAL IS A POSITION, NOT A DESTINATION (2026-08-07, Hannah's
    // fourth spore report — the first about the REVERSE direction).
    //
    // This used to be a first-order lag, `ex.fade += (ex.target - ex.fade) * k`
    // with k = min(1, dt * 3.2) — a ~0.31 s time constant on the ONE number
    // every visual channel of the handoff reads. A lag always TRAILS, so it
    // trails HIGH when the target is falling and LOW when it is rising: the
    // same scroll position therefore carried two different reveals depending
    // on which way the visitor arrived. Measured on the live buffer, riding
    // p 0.10 <-> 0.50 at a deliberate rate (see 07-chapter-inspire.md):
    //
    //     p        eff forward   eff reverse    dots whose conversion differs
    //     0.30        0.999         0.950              163 / 4200
    //     0.34        1.000         0.781              646
    //     0.37        0.971         0.379            2,414
    //     0.40        0.609         0.024            3,570  (3,463 by > 0.25)
    //
    // Two forward passes over the same span agreed to cv_max 0.0009 — the
    // conversion is perfectly reproducible along a direction and was never
    // reproducible ACROSS one. That gap IS "all the spores rearrange weirdly"
    // going Connect -> Inspire: the shed re-enters its conversion on a
    // different schedule than the one it left on.
    //
    // `target` is already everything the ease was pretending to smooth: it is
    // max(a, b, c, band) * out, four smoothsteps of camera azimuth and p, and
    // azimuth is itself a C1 function of p (the director's Hermite spline).
    // So assigning it straight through is C1-continuous in p, with no step to
    // soften anywhere — and it is what makes the reveal a pure function of
    // scroll position, which is the whole invariant.
    //
    // THE SEAM STILL CANNOT SHOW. setArmed(false) snaps target to 0, but the
    // T1 gate is derived (seams.js) so that BOTH its edges sit where the
    // reveal is already exactly zero: it arms at az 4.79 against an onset of
    // 5, and it releases either at az < -3.21 (arrOf = 0) or at p > 0.46,
    // where every retire envelope has been 0 since p 0.430 (out0, the
    // widest — D25). The snap has nothing to snap.
    //
    // AND IT IS A NO-OP AT EVERY LANDING FRAME: snap() — the path every ?p=
    // deep link and every ?capture= golden takes — has always done exactly
    // `ex.fade = ex.target`. The scrub now agrees with the still instead of
    // lagging behind it.
    for (const ex of exits) ex.fade = ex.target;
    // effective reveals: seam-gated fade x scroll-locked arrival ramp — the
    // single value every visual channel (mats, shed dim, streaks,
    // auto-active) reads from, so the whole handoff is continuous in p
    computeEff();
    driveLand(t, dt);              // landing cascade clocks (5c)
    let anyVisible = false;
    effActive = resolveActive();
    // rim delta currents: guide strands extend with the walking spore front
    // and persist (fade 1) at rest
    {
      const [fA, fB] = linkFades();
      if (fA > 0 || fB > 0) anyVisible = true;
      rimLinks[0].mat.uniforms.uFade.value = fA;
      rimLinks[1].mat.uniforms.uFade.value = fB;
      for (const l of rimLinks) {
        l.mat.uniforms.uTime.value = t;
        // taste dial: brightness x T; uFade keeps the walking-front draw-on
        l.mat.uniforms.uOpacity.value = l.mat.userData.baseOpacity * T;
      }
    }
    for (let i = 0; i < 3; i++) {
      const ex = exits[i];
      if (eff[i] > 0) anyVisible = true;
      const fv = furnOf(i);
      for (const m of ex.mats) {
        // wisps draw on with eff itself — their tip tracks the live current
        // walking out of the stream (D16); destination furniture waits for
        // the current's arrival (furnOf) and lights lip-first (uFrom).
        const fadeV = m === ex.wispMat ? eff[i] : fv;
        if (m.uniforms.uOpacity) {
          // taste dial: strand brightness x T, choreography via uFade intact
          m.uniforms.uFade.value = fadeV;
          m.uniforms.uOpacity.value = m.userData.baseOpacity * T;
        } else {
          // beads have no opacity uniform; uFade is both their hash-stagger
          // threshold and their brightness, so x T = fewer, fainter embers —
          // a coherent "less designed" read at low T (exactly 1 at T = 1)
          m.uniforms.uFade.value = fadeV * T;
        }
        m.uniforms.uTime.value = t;
      }
      // Full coherence on hover AND on the selected exit (W4-E: an open card
      // holds its plume gathered even after the pointer leaves — and because
      // the two channels are OR'd, hovering a different plume lights that one
      // without ever pulling the held one back down). A restrained gather on
      // the auto exit, so the lens always has ONE exceptional source without
      // flattening the others.
      // Taste dial: residual coherence is part of the designed gather — x T.
      cohTarget[i] = ((i === active || i === selected) ? 1 : (i === effActive ? 0.35 : 0)) * T;
    }

    // THE SHED IS EMPHASIZED, AND EMPHASIS HAS TWO SIDES (D26). Hannah,
    // 2026-08-06: "there should be particles coming from EVERYWHERE, but
    // they should just be MORE EMPHASIZED in three parts" — and 2026-08-09:
    // "they shouldn't EVER switch positions based on a move — emphasis
    // should just be changed." Under D26 the dots never leave the wind, so
    // the three streams can no longer earn contrast from DENSITY (the old
    // model emptied the sky by condensing every dot onto the braids). The
    // only contrast left is lighting's own: the lanes brighten (the seat's
    // per-dot feed) and the shed immediately AROUND them recedes a step —
    // the same figure/ground move a stage light makes. So the region
    // capsules return, re-purposed and re-weighted:
    //   · the rise corridors carry most of it (the lanes live there);
    //   · the origin wedge and walk corridors take a light touch;
    //   · the downwind history capsules take the lightest — the far fan is
    //     the opening view's own shed and must never read as deleted
    //     (2026-08-06's "disappearance by name" stands).
    // The 2026-08-06 trough (total luminance −30% mid-approach — "the
    // particles that are there before kind of disappear") came from dims
    // that LED the emphasis. These LAG it: k rides eff² x T, so the recede
    // arrives after the lanes are already carrying light. The whole-shed
    // hand-over retired (2026-08-06); grad stays 0. All channels are pure
    // in (eff, T) — exactly reversible.
    const mw = sceneApi.groups.mushroom.matrixWorld;
    // D27: with the release arc feeding all three corridors, the valleys
    // between the lit lanes are ambient dust at its own 0.6-0.9 luminance —
    // the figure/ground recede is the only thing that can carve them (the
    // old model carved them with DENSITY, by emptying the gaps). Deepened
    // rise/downwind weights, still lagging eff² x T, still capped by
    // MAX_TOTAL_DIM — the shed recedes a step; it never reads as deleted.
    // D27 (second pass): with the lee filaments condensing real density
    // into the lanes, the recede only needs to FINISH the valleys, not dig
    // them — weights back near the D26 candidate's, and the drive is gated
    // late (ss(0.55, 1, eff) x eff, not eff²): the dim must never lead the
    // per-dot light, whose stagger opens across the whole reveal. Measured
    // before this gate: total-light trough -19..-27% mid-transition (the
    // 2026-08-06 offense class); after: see D27 in 07-chapter-inspire.md.
    // 2026-08-09: rise 0.46 → 0.50 — with FIL_LAM softened the valleys
    // need one more step of figure/ground from the recede (still late-
    // gated, still capped; the shed recedes, it never reads as deleted).
    const DIM_ROLE = { 0: 0.54, 1: 0.25, 2: 0.24, 3: 0.22 }; // rise/wedge/downwind/walk
    for (const rg of shedRegions) {
      rg.a.copy(rg.la).applyMatrix4(mw);
      rg.b.copy(rg.lb).applyMatrix4(mw);
      const ee = eff[rg.exit];
      const smzl = ee < 0.55 ? 0 : ((ee - 0.55) / 0.45);
      rg.k = DIM_ROLE[rg.role] * (smzl * smzl * (3 - 2 * smzl)) * ee * T;
    }
    _capC.set(0, sceneApi.consts.CAP_Y, 0).applyMatrix4(mw);
    _grad.sx = _capC.x; _grad.sy = _capC.y; _grad.sz = _capC.z;
    _grad.d0 = sceneApi.consts.CAP_R * 1.2;
    _grad.d1 = sceneApi.consts.CAP_R * 2.6;
    // D26: a MILD far-history recede (0.97-strength grad was 2026-08-06's
    // "disappearance by name" and stays retired; 0.30, lagging the reveal
    // like the region capsules, only asks the far fan to yield figure/ground
    // to the lit lanes — the source and the near shed keep their light).
    const effMin = Math.min(eff[0], eff[1], eff[2]);
    const gz = effMin < 0.55 ? 0 : ((effMin - 0.55) / 0.45);
    _grad.k = 0.24 * (gz * gz * (3 - 2 * gz)) * effMin * T;
    // The seat, driven (runs OUTSIDE the anyVisible gate so the release path
    // always executes): one call carries the whole frame's intent — the
    // system steers its own dots first, then its color pass reads the
    // per-dot feed. This animator runs after the organism's 'spore-drift',
    // which is the ordering the steering blend depends on.
    sporeSeat.drive({
      eff, time: t, matrixWorld: mw, leanScale: uLean.value, transform: T,
      regions: shedRegions, grad: _grad,
    });

    group.visible = anyVisible;
    lipHolder.visible = anyVisible;   // the embers live outside the swaying
                                      // group (5b, held still) but keep its gate
    if (!anyVisible) return;
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
    }

    for (let i = 0; i < 3; i++) {
      const st = streaks[i];
      // HOVER/SELECTION ONLY (Hannah, 2026-08-06). This sprite is a 12:1
      // anamorphic blade — the hardest, whitest, least particulate form in the
      // chapter — and it used to sit lit at the REST on the merely-derived auto
      // exit, which is the white bar across the cap's left rim in the old
      // inspire golden. It is a lens answering a poke, not a resting state, so
      // the derived case is now zero and only a real hover or an open card
      // lights it. The chips are unaffected: nodeWorld() anchors off
      // streaks[i].localPos, a position, which exists whether or not it draws.
      // taste dial: the streak keeps a modest floor even at T = 0 — it is
      // the active label's living anchor (see stkScale above)
      const want = ((i === active || i === selected) ? 0.42 : 0) * furnOf(i) * stkScale;
      st.o += (want - st.o) * Math.min(1, dt * 2.4);
      if (st.o < 0.02 && want === 0) st.o = 0;   // die cleanly, no lingering blade
      // a lens catching an exceptional source: slow breathing, slight shimmer
      st.mat.opacity = st.o * (0.82 + 0.13 * Math.sin(t * 1.9 + i * 2.1)
                                    + 0.05 * Math.sin(t * 7.3 + i));
      st.sprite.visible = st.o > 0.01;
      const w = 2.1 * (1 + 0.06 * Math.sin(t * 2.7 + i));
      st.sprite.scale.set(w, 0.17, 1);
      // RELEASE-LIP GLOW (5b) — the three lit points on the edge. The
      // position half of the law (furnOf) stays pure and lag-free, so the
      // reverse scrub mirrors the forward one exactly (the reveal-is-a-
      // position rule above); x land (5c) is the one sanctioned clock — the
      // landing cascade, eased like the chips' own arrival and snapped at
      // dt = 0. MUST stay identical to snap()'s copy of it — snap() is the
      // frozen-capture / ?p= path. HELD STILL (2026-08-11): the old
      // x(0.9 + 0.1 sin) breathing is gone — the ember is the marker and
      // the marker holds one level; the shimmer stays with the braids and
      // streams around it. Animator and snap() compute the identical value.
      const lg = lipGlows[i];
      const lo = 0.22 * furnOf(i) * land[i].a * T;
      lg.sprite.visible = lo > 0.01;
      lg.mat.opacity = lo;
    }
  });

  return api;
}
