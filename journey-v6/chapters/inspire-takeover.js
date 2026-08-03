// journey-v6 — INSPIRE same-particle takeover (Hannah's fifth spore note,
// 2026-08-03 — the definitive rebuild).
//
// "We should only have ONE spores — the ones visible on the right side — and
// we should animate/activate THEM when we scroll over to them, not make new
// ones appear."
//
// Every prior fix (drift-morph seeding, delta rim-walk, history dissolve) was
// still a crossfade between two particle systems: the hero's 4,200-spore shed
// dimming while the chapter's separate 5,100-spore GPU system faded in.
// However synchronized, new points joined the scene. This file removes the
// crossfade from the TRANSITION entirely: the hero's own shed particles — the
// exact dots the visitor watches at p = 0 — are steered onto the braid paths.
//
//   - The hero's `spore-drift` animator keeps integrating its positions every
//     frame, untouched (mushroom-scene.js is never edited). This module runs
//     AFTER it (inspire.js's 'spike-plumes' animator was registered at journey
//     boot, later in the hero's insertion-ordered animator Map — verified
//     empirically, see BUDGETS.md TK entry) and, for each CONVERTED particle,
//     overwrites its position with lerp(heroPos, braidPos, conv).
//   - `braidPos` is a CPU port of the staged path of inspire.js's former §4
//     spore shader (born between gills -> lateral -> rim walk / curl ->
//     braided rise), same gates (mig / rg) driven by the same effective
//     reveals, evaluated in cap-local space and pushed through the live
//     mushroom matrix. (Final unification: that GPU system is deleted — this
//     port is the braid's only implementation on dots; the core ribbons in
//     inspire.js share the same winding math in their own shader.)
//   - `conv` is a hash-staggered pure function of the destination exit's
//     effective reveal: reverse scroll plays the whole conversion backward,
//     scrub-safe at any speed, nothing time-integrated.
//   - RESTORE BY CEASING: the hero integrates the buffer we wrote, so a
//     per-particle shadow of the TRUE hero position is kept by delta-tracking
//     (heroPos += what spore-drift added this frame; a recycle teleport is
//     accepted as the new hero home). As conv eases back to 0 the display
//     converges onto that shadow and this module simply stops writing — the
//     hero's math re-owns each dot with no pop. Positions only; the hero's
//     age/origin/velocity arrays are never touched, and the color attribute
//     is owned by inspire-ambient.js's byte-exact dim/restore machinery,
//     which this module only FEEDS (per-particle conv + plume-brightness
//     arrays) — restore discipline unchanged.
//
// Brightness contract (fed to inspire-ambient.js each frame):
//   F = shedDim * (1 - conv) + PLUME_GAIN * env * conv
// where `env` is the ported path alpha envelope (walk pulses, rise draw-on,
// cycle-wrap fades) TIMES the full knot-pearl cadence. A converting dot hands
// its ambient look over to its plume look and KEEPS it: the (1 - det)
// hand-back to the GPU detail layer is gone with that layer (final
// unification, Hannah 2026-08-03 evening — the layer's late fade-in was
// still a stream swap). At rest (conv = 1) the converted dots ARE the
// approved frame: the travelling pearls (pow(.5+.5*sin(h*7.3+sp*1.9
// -t*.55),4), per-exit EXITS[].knot gains, core-cohort weighting — the same
// cadence the deleted shader ran) live as brightness modulation of these
// same dots. All pure in (eff, time).
import {
  makeRng, gaussOf, capUnderPt, rimRad, rimYoff, EXITS, LEAN_DIR, CAP_Y,
} from '../core/anatomy.js';

const TAU = Math.PI * 2;
const PI = Math.PI;
const N_GILL_CHANNELS = 230;
const CHANNEL = TAU / N_GILL_CHANNELS;
// Exit weighting, delta order (matches the shed hand-over weights 0.50/0.28/
// 0.22 in inspire.js): the one visible stream feeds ArtCompute first and
// hardest, then the Arca current, then 2RP's.
const W_EXIT0 = 0.50, W_EXIT1 = 0.78; // cumulative: <0.50 -> 0, <0.78 -> 1, else 2
// How much brighter a fully-performing dot reads than its base shed color.
const PLUME_GAIN = 1.35;
// A hero recycle (or any teleport) moves a dot far more than one drift frame.
const TELEPORT2 = 0.09; // (0.3 units)^2

const ss = (a, b, x) => {
  x = (x - a) / (b - a);
  x = x < 0 ? 0 : x > 1 ? 1 : x;
  return x * x * (3 - 2 * x);
};

// rim underside height at azimuth a — mirrors capUnderPt(1, a).y (and the
// shader's rimYG) without allocating a Vector3 in the hot loop
function rimYof(a) {
  return CAP_Y + 0.03 + rimYoff(a) - (0.11 + 0.05 * Math.cos(a - LEAN_DIR)) - 0.11;
}

export function createSporeTakeover(sceneApi) {
  // own deterministic stream — must not consume the hero's or inspire.js's
  const rand = makeRng(9127);
  const gauss = () => gaussOf(rand);
  // SECOND stream for the core cohort (final unification): the cohort was
  // added after Hannah approved the takeover's per-particle assignments,
  // which are shaped by the FIRST stream's exact draw order — a separate
  // stream keeps every existing assignment byte-identical.
  const randC = makeRng(3187);

  let N = 0, pts = null, inited = false, wasActive = false;
  // per-particle STATIC assignment (filled at init)
  let exIdx, stag, oR, oAz, oY, az0, azS2, rimRi, rimYi, rimRs, rimYs,
      offR, offY, spanA, s1a, s2a, s3a, riseA, leanA, curlA, spA,
      perA, ph0A, h1A, h2A, sdA, dropA, knotA, coreA;
  // per-particle DYNAMIC state
  let heroP, lastW, writ;
  // the dimmer feed (read by inspire-ambient.js): cv = conv, pw = plume term
  const feed = { cv: null, pw: null, any: false };

  // ?tkdbg=1 — perf + animator-order probe hooks
  const dbg = typeof location !== 'undefined' && location.search.includes('tkdbg');
  let perfAcc = 0, perfN = 0;

  function init() {
    pts = sceneApi.groups && sceneApi.groups.spores;
    if (!pts || !pts.geometry || !pts.geometry.attributes.position) return false;
    N = pts.geometry.attributes.position.count;
    exIdx = new Uint8Array(N); dropA = new Uint8Array(N);
    stag = new Float32Array(N);
    oR = new Float32Array(N); oAz = new Float32Array(N); oY = new Float32Array(N);
    az0 = new Float32Array(N); azS2 = new Float32Array(N);
    rimRi = new Float32Array(N); rimYi = new Float32Array(N);
    rimRs = new Float32Array(N); rimYs = new Float32Array(N);
    offR = new Float32Array(N); offY = new Float32Array(N);
    spanA = new Float32Array(N);
    s1a = new Float32Array(N); s2a = new Float32Array(N); s3a = new Float32Array(N);
    riseA = new Float32Array(N); leanA = new Float32Array(N);
    curlA = new Float32Array(N); spA = new Float32Array(N);
    perA = new Float32Array(N); ph0A = new Float32Array(N);
    h1A = new Float32Array(N); h2A = new Float32Array(N); sdA = new Float32Array(N);
    knotA = new Float32Array(N); coreA = new Float32Array(N);
    heroP = new Float32Array(N * 3); lastW = new Float32Array(N * 3);
    writ = new Uint8Array(N);
    feed.cv = new Float32Array(N);
    feed.pw = new Float32Array(N);

    for (let i = 0; i < N; i++) {
      // destination exit, weighted toward the source stream's own plume
      const wr = rand();
      const e = wr < W_EXIT0 ? 0 : wr < W_EXIT1 ? 1 : 2;
      const spec = EXITS[e];
      exIdx[i] = e;
      stag[i] = rand();

      // destination lane in the RELEASE sector (same construction as the GPU
      // spores: snapped between real gill channels)
      const lane = Math.round((gauss() * 0.34) / CHANNEL) * CHANNEL
                 + (rand() - 0.5) * CHANNEL * 0.4;
      const a = spec.az + lane;
      az0[i] = a;

      // birth point — ALWAYS in the source wedge (the delta rule): exit 0's
      // own lane IS the source sector; migrants get their own source lane
      const srcLane = Math.round((gauss() * 0.34) / CHANNEL) * CHANNEL
                    + (rand() - 0.5) * CHANNEL * 0.4;
      const aBirth = e === 0 ? a : EXITS[0].az + srcLane;
      const u0 = 0.48 + Math.pow(rand(), 0.8) * 0.34;
      const o = capUnderPt(u0, aBirth);
      o.y -= 0.015 + rand() * 0.05;
      oR[i] = Math.hypot(o.x, o.z);
      oAz[i] = Math.atan2(o.z, o.x);
      oY[i] = o.y;

      rimRi[i] = rimRad(a) + 0.03 + rand() * 0.10;
      rimYi[i] = rimYof(a) - 0.02 + rand() * 0.06;
      rimRs[i] = rimRad(aBirth) + 0.05;
      rimYs[i] = rimYof(aBirth);
      offR[i] = rimRi[i] - rimRad(a);
      offY[i] = rimYi[i] - rimYof(a);

      const isDrop = rand() < 0.15;
      dropA[i] = isDrop ? 1 : 0;
      riseA[i] = isDrop ? (0.5 + rand() * 1.1)
                        : spec.riseMin + rand() * (spec.riseMax - spec.riseMin);
      leanA[i] = spec.lean * (0.8 + rand() * 0.45);
      const strand = i % 9 < 3 ? 0 : (i % 9 < 6 ? 1 : 2);
      curlA[i] = (strand - 1) * 0.30 + gauss() * 0.09;
      spA[i] = strand * 2.094 + gauss() * 0.3;

      perA[i] = 7.0 + rand() * 8.5;
      ph0A[i] = rand();
      h1A[i] = rand(); h2A[i] = rand(); sdA[i] = rand() * 1000;
      knotA[i] = spec.knot;
      // core cohort (ported from the deleted GPU layer, W4-A gap a): ~32% of
      // dots ride TIGHT on their winding strand and carry the knot cadence
      // hottest, so each braid resolves as a defined sinuous core at rest.
      const coreR = randC();
      coreA[i] = coreR < 0.32 ? 0.55 + randC() * 0.45 : 0.0;

      // stage boundaries (shader math, coh = 0 — the takeover carries no
      // hover coherence; that stays a GPU-detail behavior)
      const migF = e > 0;
      azS2[i] = aBirth + (h1A[i] - 0.5) * 0.05;
      spanA[i] = (a + curlA[i]) - azS2[i];
      s1a[i] = migF ? 0.10 : 0.16;
      s2a[i] = migF ? 0.24 : 0.40;
      s3a[i] = migF
        ? s2a[i] + 0.12 + 0.10 * Math.abs(spanA[i]) + (h2A[i] - 0.5) * 0.06
        : Math.min(0.86, s2a[i] + 0.10 + h2A[i] * 0.22);
    }
    inited = true;
    return true;
  }

  /** Per-frame drive, called from inspire.js's 'spike-plumes' animator —
   *  AFTER the hero's spore-drift has integrated the buffer this frame.
   *  eff: per-exit effective reveals; mw: groups.mushroom.matrixWorld;
   *  leanScale: the live uLean damp. (The det parameter is gone with the
   *  GPU detail layer — the dots never hand the braid to anything.) */
  function update(eff, tNow, mw, leanScale) {
    const drive = eff[0] > 1e-4 || eff[1] > 1e-4 || eff[2] > 1e-4;
    if (!drive && !wasActive) { feed.any = false; return; }
    if (!inited && !init()) { feed.any = false; return; }

    const t0 = dbg ? performance.now() : 0;
    const attr = pts.geometry.attributes.position;
    const arr = attr.array;

    if (!wasActive) {
      // first live frame: the buffer is pure hero state — prime the shadow
      heroP.set(arr); lastW.set(arr);
    }

    // per-exit gates, shader-identical
    const mE = mw.elements;
    const cv = feed.cv, pw = feed.pw;
    let anyConv = false, wroteAny = false;
    const rev0 = eff[0], rev1 = eff[1], rev2 = eff[2];
    const mig1 = ss(0, 0.55, rev1), mig2 = ss(0, 0.55, rev2);
    const rg1 = ss(0.55, 1, rev1), rg2 = ss(0.55, 1, rev2);

    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      // ---- hero shadow: absorb what spore-drift added since our last write.
      // A teleport (the hero recycling a spent spore to its gill origin) is
      // accepted as the dot's new hero home.
      let bx = arr[i3], by = arr[i3 + 1], bz = arr[i3 + 2];
      let dx = bx - lastW[i3], dy = by - lastW[i3 + 1], dz = bz - lastW[i3 + 2];
      if (dx * dx + dy * dy + dz * dz > TELEPORT2) {
        heroP[i3] = bx; heroP[i3 + 1] = by; heroP[i3 + 2] = bz;
      } else {
        heroP[i3] += dx; heroP[i3 + 1] += dy; heroP[i3 + 2] += dz;
      }

      const e = exIdx[i];
      const rev = e === 0 ? rev0 : e === 1 ? rev1 : rev2;
      // conversion: hash-staggered pure function of the exit's reveal.
      // Migrants complete by rev 0.55 (the walk front's arrival), the
      // resident stream keeps a wider stagger and completes by rev 0.80 —
      // both strictly before the GPU detail fade begins (det starts 0.85).
      const conv = e === 0
        ? ss(0, 0.35, rev - stag[i] * 0.45)
        : ss(0, 0.30, rev - stag[i] * 0.25);
      cv[i] = conv;
      if (conv <= 0) {
        pw[i] = 0;
        if (writ[i]) {
          // this dot was being steered last frame and its conversion just hit
          // zero (a smooth ease lands here with display ~== heroP; a deep-link
          // jump lands abruptly): hand the BUFFER back at the true hero
          // position, then cease — spore-drift re-owns it from there.
          writ[i] = 0;
          arr[i3] = heroP[i3]; arr[i3 + 1] = heroP[i3 + 1]; arr[i3 + 2] = heroP[i3 + 2];
          lastW[i3] = arr[i3]; lastW[i3 + 1] = arr[i3 + 1]; lastW[i3 + 2] = arr[i3 + 2];
          wroteAny = true;
        } else {
          // hero-owned: track exactly (no float accumulation drift)
          heroP[i3] = bx; heroP[i3 + 1] = by; heroP[i3 + 2] = bz;
          lastW[i3] = bx; lastW[i3 + 1] = by; lastW[i3 + 2] = bz;
        }
        continue;
      }
      anyConv = true;
      writ[i] = 1;

      // ---- braid path — CPU port of the spore vertex shader (inspire.js §4)
      const migF = e > 0;
      const mig = e === 1 ? mig1 : mig2;
      const rg = e === 0 ? 1 : (e === 1 ? rg1 : rg2);
      const h1 = h1A[i], h2 = h2A[i], sd = sdA[i], sp = spA[i];
      const s1 = s1a[i], s2 = s2a[i], s3 = s3a[i];
      const rimR = rimRi[i], rimY = rimYi[i], a0 = az0[i], curl = curlA[i];
      let t = tNow / perA[i] + ph0A[i]; t -= Math.floor(t);

      let r, y, az, env;
      let xLean = 0, zLean = 0;
      if (t < s1) {
        // born between the gills, shimmering in place
        const u0 = t / s1;
        r = oR[i] + Math.sin(tNow * 0.5 + sd) * 0.03;
        y = oY[i] - 0.05 * u0 + Math.sin(tNow * 0.6 + sd * 1.3) * 0.015;
        az = oAz[i] + Math.sin(tNow * 0.35 + sd * 2.1) * 0.012;
        env = ss(0, 0.45, u0) * 0.85 * (migF ? 0.72 : 1);
      } else if (t < s2) {
        // lateral travel between the lamellae toward the margin
        const u1s = (t - s1) / (s2 - s1);
        const u1 = u1s * u1s * (3 - 2 * u1s);
        const rT = migF ? rimRs[i] : rimR;
        const yT = migF ? rimYs[i] + (rimY - rimYof(a0)) : rimY;
        r = oR[i] + (rT - oR[i]) * u1;
        const yA = oY[i] - 0.05;
        y = yA + (yT - yA) * u1 - 0.10 * Math.sin(u1 * PI);
        const azA = oAz[i] + (h1 - 0.5) * 0.05 * u1;
        az = migF ? azA + (azS2[i] - azA) * u1 : azA;
        env = 0.95 * (migF ? 0.72 : 1);
      } else if (t < s3) {
        const u2 = (t - s2) / (s3 - s2);
        if (migF) {
          // rim migration — the delta current walking the real rim, clamped
          // at the reveal's advancing front
          const wSm = u2 * u2 * (3 - 2 * u2);
          const w = u2 + (wSm - u2) * 0.35;
          let wFront = mig * 1.12 - h1 * 0.10;
          wFront = wFront < 0 ? 0 : wFront > 1 ? 1 : wFront;
          const we = w < wFront ? w : wFront;
          az = azS2[i] + spanA[i] * we;
          const bobE = Math.sin(PI * we);
          r = rimRad(az) + 0.05 + offR[i] * we
            + Math.sin(we * 9 + sp) * 0.07 * bobE;
          y = rimYof(az) + offY[i] + 0.10 * ss(0.72, 1, we)
            + Math.sin(we * 12 + sp * 1.3 + tNow * 0.4) * 0.05 * bobE;
          const pl = 0.5 + 0.5 * Math.sin(we * 7 - tNow * 0.9 + sp);
          env = (0.55 + 0.45 * pl * pl) * (1 - ss(0, 0.10, w - wFront));
        } else {
          // resident plume: curl around the rim margin
          az = a0 + curl * u2;
          const loops = 1 + h2 * 1.2;
          r = rimR + 0.05 + Math.sin(u2 * PI * loops + sp) * 0.10;
          y = rimY + Math.sin(u2 * PI * loops * 0.7 + 1 + sp) * 0.08 + 0.10 * u2;
          env = 1;
        }
      } else {
        // braided rise (or sinking drop)
        const u3 = (t - s3) / (1 - s3);
        const eu = ss(0, 0.10, u3);
        if (dropA[i]) {
          y = rimY + 0.10 - u3 * u3 * riseA[i];
          az = a0 + curl + (h1 - 0.5) * 0.3 * u3;
          r = rimR + 0.05 + u3 * (0.3 + h2 * 0.4);
          env = eu * (1 - ss(0.45, 0.95, u3)) * 0.5;
        } else {
          const h = Math.pow(u3, 0.6 + h1 * 0.5);
          y = rimY + 0.10 + h * riseA[i];
          // SHEATH = 0.72; winding terms shared verbatim with the ribbons.
          // FINAL UNIFICATION: the winding-core identity now lives HERE —
          // core-cohort dots damp their scatter (tight, the deleted shader's
          // mix(1.0, 0.30, core)) so each braid resolves as a defined
          // sinuous line inside the loose sheath the majority carries.
          const core = coreA[i];
          const tight = 1 - 0.70 * core;
          az = a0 + curl
             + 0.13 * Math.sin(h * 5.1 + sp)
             + 0.07 * Math.sin(h * 9.7 + sp * 2.3 + tNow * 0.21)
             + 0.03 * Math.sin(tNow * 0.13 + sd * 3.7) * u3 * tight * 0.72;
          r = rimR + 0.05
            + 0.10 * Math.sin(h * 4.3 + sp * 1.7)
            + 0.05 * Math.sin(tNow * 0.17 + sd * 2.3)
            + (h1 - 0.5) * 0.09 * (0.4 + h) * tight * 0.72
            + h * 0.14;
          xLean = leanScale * leanA[i] * h * h * riseA[i] * 0.62;
          zLean = leanScale * leanA[i] * h * h * riseA[i] * 0.105;
          // knot cadence at FULL strength (the deleted GPU layer's exact
          // pearls): hot dots travelling UP the core with the flow, per-exit
          // gain from the anatomy map, hottest on the core cohort. This is
          // the rest look's richness, carried by the same dots — brightness
          // modulation only, reversible, pure in (eff, time).
          const kn0 = 0.5 + 0.5 * Math.sin(h * 7.3 + sp * 1.9 - tNow * 0.55);
          const kn = kn0 * kn0 * kn0 * kn0;
          const knotV = knotA[i] * kn * (0.30 + 0.70 * core);
          env = eu * (1 - ss(0.62, 1, u3))
              * (1 + 0.28 * core + 1.15 * knotV);
        }
        // migrant rise draw-on gate (rl inert for the resident and at rev 1)
        const rl = rg * 1.12;
        const g0 = rl - 0.10 > 0 ? rl - 0.10 : 0;
        env *= 1 - ss(g0, rl + 0.001, u3);
      }

      // cap-local -> world through the live mushroom matrix
      const lx = Math.cos(az) * r + xLean, ly = y, lz = Math.sin(az) * r + zLean;
      const wx = mE[0] * lx + mE[4] * ly + mE[8] * lz + mE[12];
      const wy = mE[1] * lx + mE[5] * ly + mE[9] * lz + mE[13];
      const wz = mE[2] * lx + mE[6] * ly + mE[10] * lz + mE[14];

      // the SAME dot slides from its own drift onto the path
      const px = heroP[i3] + (wx - heroP[i3]) * conv;
      const py = heroP[i3 + 1] + (wy - heroP[i3 + 1]) * conv;
      const pz = heroP[i3 + 2] + (wz - heroP[i3 + 2]) * conv;
      arr[i3] = px; arr[i3 + 1] = py; arr[i3 + 2] = pz;
      lastW[i3] = px; lastW[i3 + 1] = py; lastW[i3 + 2] = pz;
      wroteAny = true;

      // brightness feed: plume term (ambient term is (1 - conv), applied by
      // the dimmer). No det hand-back any more: the converted dots keep the
      // braid — and its pearls — through the rest, permanently.
      pw[i] = PLUME_GAIN * env * conv;
    }

    if (wroteAny) attr.needsUpdate = true;
    feed.any = anyConv;
    wasActive = drive || anyConv;

    if (dbg) {
      perfAcc += performance.now() - t0; perfN++;
      if (perfN >= 60) {
        window.__tkPerf = +(perfAcc / perfN).toFixed(3);
        perfAcc = 0; perfN = 0;
      }
      window.__tkLast0 = arr[0]; // animator-order probe: must survive to render
    }
  }

  return { update, feed, get active() { return wasActive; }, get n() { return N; } };
}
