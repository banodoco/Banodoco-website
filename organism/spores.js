// organism/spores.js — THE spore system: the 4,200-particle shed, its
// integrator, and the driver seat (merge doc §3). Split out of the
// createScene closure at merge step M2 with zero behaviour change; all
// formerly-closure state arrives through `ctx` (built in organism.js).
import * as THREE from 'three';
import { TKDBG } from '../flags.js';

// =====================================================================
// 10. SPORE CLOUD — shed from the gill surface across the cap's back side
// =====================================================================
// A real agaric releases spores from the whole hymenium: basidia carpet every
// gill face, the spores drop clear of the margin, and only then does the air
// take them. So each particle is a permanent emitter parked at its own spot on
// the back-side gills, and BREEZE_DIR carries it out from there — the plume is
// a consequence of the wind, not a shape we drew.
export function createSpores(ctx) {
  const { rand, gauss, pushC, makePoints, capUnderPt, tiltX, leanZ, scene } = ctx;
  // cap form language for the driven modes (the lit routes are authored
  // against the organism's own rim, not a mirror)
  const { rimRad, rimYoff } = ctx;

  // The one wind. The lit route spines below rise along THIS vector's own
  // ratios (D17 locus law: organization happens IN PLACE, inside the drift's
  // diagonal envelope) — so the axis is derived here, from the raw components,
  // and can never diverge from the drift that carries the ambient shed.
  const BZX = 1.0, BZY = 0.62, BZZ = 0.17;
  const BREEZE_DIR = new THREE.Vector3(BZX, BZY, BZZ).normalize();
  const DRIFT_RX = BZX / BZY;   // route-rise x advance per unit of rise (y)
  const DRIFT_RZ = BZZ / BZY;   // route-rise z advance per unit of rise (y)

  // ---- THE LEE FILAMENTS (D27, 2026-08-09 — the second half of Hannah's
  // chosen trade). Wind past a bluff cap does not stay laminar: the shed
  // organizes into standing lee filaments downstream of the margin. Here
  // that weather is three weak line-attractors, each a streamline of the
  // one wind (base at a rim lip, direction BREEZE_DIR — the same axis the
  // D17 locus law derives every rise from). The drift integrator applies a
  // gentle lateral contraction toward the nearest filament, everywhere, at
  // every scroll position, forever — a property of the WIND, never of the
  // section — so the shed's stationary density genuinely carries three
  // soft streams for the chapter's lighting to pick out, and crossing a
  // boundary still moves nothing (positions stay a pure function of time
  // and wind). The azimuths are the wind's own: ArtCompute's 5.83 was
  // back-projected FROM the hero's visible stream (D16), and the flanks
  // sit ±1.15 rad along the rim (D18); the chapter's exit anatomy is
  // authored AT these filaments — if one ever moves, both files move
  // (journey/chapters/inspire/anatomy.js documents the same numbers).
  // λ = 0.060/s with a ~0.9 u gaussian catch (basin capped at 1.5 u so
  // no filament drains a whole flank): an e-fold takes ~17 s of
  // transit, so the near-lip curtain stays a diffuse shed (the ramp below
  // holds the first ~10% of each filament at zero) and the condensation
  // arrives gradually with height — streaky smoke, not drawn columns.
  // 2026-08-09 (Hannah's brief, item 3): λ 0.100 → 0.060. At the Final
  // pullback the 0.100 catch condensed the shed into two-three distinct
  // white lumps over the cap — "three distinct clouds", the exact
  // three-plumes read D27 existed to avoid, reappearing as DENSITY at
  // distance. 0.060 keeps a soft occupancy bias for Inspire's lighting to
  // pick out (the lanes' legibility is compensated in the emphasis gains,
  // GAIN_BODY/GAIN_KNOT below) while the far view reads as one irregular
  // wind. Same law everywhere, at every scroll position — the softening
  // is global, so positions remain scroll-independent by construction.
  const FIL_AZ = [5.83, 6.98, 4.68];
  const FIL_RISEMAX = [2.35, 1.32, 2.10]; // = EXITS riseMax (anatomy.js)
  const FIL_LAM = 0.060, FIL_SIG2 = 0.81, FIL_R2 = 2.25;
  // ---- D29 (2026-08-10, Hannah's Epilogue report: "three lines of glowing
  // spores coming from the main mushroom" at the Final pullback). Measured
  // at the Epilogue pose, live equilibrium: the D28-softened catch still
  // organised the whole plume — lane occupancy within 0.30 u of the three
  // axes was 1,023 / 255 / 370 dots against 507 / 18 / 0 at a control
  // rotated half-way between the lanes, and the lanes TIGHTENED with
  // height (rms lateral 0.80 u at the lip → 0.31 u four units up),
  // because the catch ran the full transit and contraction accumulates.
  // Against dark sky at the pullback, a 0.3 u-wide density core IS a
  // drawn line — no chapter lighting involved (hiding the shed Points
  // removes all three; the seat stays structurally silent outside
  // Inspire, re-confirmed).
  //
  // The resolution keeps D27's trade — the wind, not the section, owns
  // the organisation, so every boundary stays motionless — and gives the
  // weather the vertical structure real lee filaments have: a near-wake
  // that DOES NOT extend forever. Two moves, both global, both
  // p-independent:
  //
  //   1. THE CATCH RELEASES ALONG ITS OWN LENGTH (FIL_FADE0/1): the
  //      contraction runs full only through the band Inspire actually
  //      lights (the rise corridors; the emphasis tip-fade begins at arc
  //      0.70 ≈ 0.55 of sMax) and lets go smoothly by 0.82 of sMax — the
  //      +0.6-rise extension above the lit lane top is retired with it.
  //      Near the rim, where Inspire frames the three ways out, the lane
  //      bias is untouched; the upper plume stops being actively drawn
  //      into lines.
  //   2. UPPER-AIR DECOHERENCE (DISP_*): above the lanes' tops the
  //      near-wake breaks up — each dot carries its own fixed lateral
  //      drift direction (hash of its index, in the plane ⊥ the wind),
  //      applied at DISP_RATE under a world-height gate. Contraction
  //      inherited from the window disperses back into one irregular
  //      cloud over the remaining transit, which is what a wake does
  //      downstream. Deterministic per dot, a pure function of (time,
  //      wind) like every other term here — crossings stay motionless by
  //      construction, same code path at every p.
  //
  // The seed block mirrors both (the filStep profile is shared; the
  // decoherence is integrated in closed form over each dot's own climb),
  // so the frozen landing stays at the live wind's stationary shape.
  const FIL_FADE0 = 0.34, FIL_FADE1 = 0.60; // catch release window, in s/sMax
  const DISP_RATE = 0.012;                  // u/s upper-air lateral drift
                                          // 0.016 -> 0.012 (2026-08-17, the
                                          // same balance pass as D30 below:
                                          // under the tree's brighter tone
                                          // the full-rate decoherence read as
                                          // a broad even canopy; the bulk now
                                          // hugs the braid while the D30
                                          // cohort carries the far strays)
  const DISP_Y0 = 4.2, DISP_Y1 = 5.6;       // world-y gate (above the lit lanes)
  const FIL_SEED_T = [0.75, 0.55, 1.60]; // per-filament seed-transit scale, re-calibrated to the D29 live equilibrium (see D27/D29)
  let filPX, filPY, filPZ, filSMax;        // built with the seed block below
  let dispDir;                             // D29 per-dot decoherence directions
  const filUX = BREEZE_DIR.x, filUY = BREEZE_DIR.y, filUZ = BREEZE_DIR.z;
  let sporePts, sporeVel = [], sporeOrigin, sporeAge;
  {
    const pp = [], pc = [], ps = [], org = [];
    const N = 4200;
    // the cap's own transform, so gill points land in world space
    const capXf = new THREE.Euler(tiltX, 0, leanZ);
    const capOff = new THREE.Vector3(0, 0, -tiltX * 3.2);
    // lee-filament bases (see the D27 note at the top): rim lip + 0.10 rise,
    // through the same cap transform the gill points take
    {
      filPX = new Float64Array(3); filPY = new Float64Array(3);
      filPZ = new Float64Array(3); filSMax = new Float64Array(3);
      const rimYl = (a) => ctx.CAP_Y + 0.03 + ctx.rimYoff(a)
        - (0.11 + 0.05 * Math.cos(a - ctx.LEAN_DIR)) - 0.11;
      for (let e = 0; e < 3; e++) {
        const r = ctx.rimRad(FIL_AZ[e]) + 0.05;
        const b = new THREE.Vector3(
          Math.cos(FIL_AZ[e]) * r, rimYl(FIL_AZ[e]) + 0.10, Math.sin(FIL_AZ[e]) * r
        ).applyEuler(capXf).add(capOff);
        filPX[e] = b.x; filPY[e] = b.y; filPZ[e] = b.z;
        filSMax[e] = (FIL_RISEMAX[e] + 0.6) / filUY;
      }
    }
    // D29: per-dot decoherence directions — a fixed unit vector in the plane
    // ⊥ the wind, golden-angle-hashed on the dot's own index. Deterministic,
    // consumes no draws from the seeded stream.
    {
      const e1 = new THREE.Vector3(0, 1, 0).cross(BREEZE_DIR).normalize();
      const e2 = new THREE.Vector3().crossVectors(BREEZE_DIR, e1).normalize();
      dispDir = new Float32Array(4200 * 3);
      // D30 STRAGGLER COHORT (2026-08-17, Hannah's Inspire balance pass): a
      // hashed ~16% of dots carry a LONGER upper-air throw biased along +e1
      // (the horizontal ⊥ of the wind, world (0.17, 0, -0.99)) with a lift of
      // e2 — at the Inspire rest that direction projects toward the upper-
      // RIGHT of the frame (alignment +0.82 with view-right), so a thin
      // scatter of strays softens the plume's empty flank without touching
      // its asymmetric mass; on the hero framing the same vector is nearly
      // depth-parallel (alignment -0.06 with view-right), so the landing
      // composition barely feels it. Mechanically this is ONLY a reshape of
      // each cohort dot's fixed decoherence vector (direction + magnitude —
      // the vector is deliberately non-unit): both the seed block's closed
      // form and the live integrator multiply the same dispDir entries, so
      // the frozen landing and the running wind still agree by construction,
      // and the other ~84% of dots keep bit-identical vectors. Consumes no
      // RNG draws (hash-derived, like the base directions).
      const COHORT_F = 0.16, COHORT_BOOST0 = 1.7, COHORT_BOOST1 = 2.9;
      for (let i = 0; i < 4200; i++) {
        const ph = i * 2.3999632297;
        const h1 = (i * 0.61803398875) % 1;
        const h2 = (i * 0.75487766625) % 1;
        if (h1 < COHORT_F) {
          // stray: mostly +e1, lifted a touch along e2, thrown 1.7-2.9x
          const lift = 0.18 + 0.38 * h2;
          const inv = 1 / Math.hypot(1, lift);
          const boost = COHORT_BOOST0 + (COHORT_BOOST1 - COHORT_BOOST0) * h2;
          const g = inv * boost;
          dispDir[i * 3]     = (e1.x + lift * e2.x) * g;
          dispDir[i * 3 + 1] = (e1.y + lift * e2.y) * g;
          dispDir[i * 3 + 2] = (e1.z + lift * e2.z) * g;
          continue;
        }
        const c = Math.cos(ph), s = Math.sin(ph);
        dispDir[i * 3]     = c * e1.x + s * e2.x;
        dispDir[i * 3 + 1] = c * e1.y + s * e2.y;
        dispDir[i * 3 + 2] = c * e1.z + s * e2.z;
      }
    }
    // the along-filament catch profile: the D27 onset ramp × the D29
    // release window, one function so the seed's path average below and
    // the live integrator can never disagree about the law
    const filProf = (bs) => {
      let q = (bs - 0.10) / 0.40; q = q < 0 ? 0 : q > 1 ? 1 : q;
      let qd = (FIL_FADE1 - bs) / (FIL_FADE1 - FIL_FADE0);
      qd = qd < 0 ? 0 : qd > 1 ? 1 : qd;
      return q * q * (3 - 2 * q) * (qd * qd * (3 - 2 * qd));
    };
    // one lateral contraction step toward the nearest filament — THE same
    // rule the integrator applies each frame; the seed block below iterates
    // it so the seeded scatter sits at the wind's own stationary shape.
    // profOv >= 0 replaces the along-arc profile (the seed passes its own
    // PATH AVERAGE — see the D29 note in the seed block); -1 derives it
    // from the dot's current position, the live law exactly.
    const filStep = (x, y, z, profOv, dt) => {
      let bd2 = FIL_R2, blx = 0, bly = 0, blz = 0, bs = 0;
      for (let e = 0; e < 3; e++) {
        const wx = x - filPX[e], wy = y - filPY[e], wz = z - filPZ[e];
        const s = wx * filUX + wy * filUY + wz * filUZ;
        if (s < 0 || s > filSMax[e]) continue;
        const lx = wx - s * filUX, ly = wy - s * filUY, lz = wz - s * filUZ;
        const d2 = lx * lx + ly * ly + lz * lz;
        if (d2 < bd2) { bd2 = d2; blx = lx; bly = ly; blz = lz; bs = s / filSMax[e]; }
      }
      if (bd2 >= FIL_R2) return [x, y, z];
      const ramp = profOv >= 0 ? profOv : filProf(bs);
      let lam = FIL_LAM * Math.exp(-bd2 / FIL_SIG2) * ramp * dt;
      if (lam > 0.9) lam = 0.9;
      return [x - blx * lam, y - bly * lam, z - blz * lam];
    };
    // ---- THE RELEASE ARC (D27, 2026-08-09 — Hannah's chosen trade after
    // D26's stop-and-report). Under the lighting-only model the dots never
    // leave the wind, so a stream can only be lit out of dust the wind
    // actually carries — and the old release arc [pi, 1.98pi], biased hard
    // toward the lee, never fed two of the three exit sectors (measured:
    // 2,422 / 24 / 429 dots within 0.55 u of the ArtCompute / Arca / 2RP
    // rise spines). The exits' rise corridors ARE wind streamlines seeded at
    // their rim lips (rise advance = DRIFT_RX/RZ, the breeze's own ratios),
    // so the honest reshape is at the SOURCE: the hymenium sheds around a
    // wider sweep of the margin, one smooth single-peaked density — densest
    // at the lee (az ~5.9, ArtCompute's side, keeping it the primary
    // stream), tapering through both flank sectors (2RP az 4.68, Arca az
    // 6.98) to near-zero tails, so the landing reads as ONE wind wrapping
    // the cap, not three pre-drawn plumes. The BREEZE vector, the
    // integrator, and the age-scatter law are untouched — each birth still
    // rides the same streamline law the seeded scatter encodes, which is
    // what keeps the seeded cloud at the field's own stationary shape.
    // Sampled by inverse-CDF from the SAME single rand() draw the old
    // mapping consumed, so the hero stream's downstream consumers are
    // byte-identical.
    const ARC_A0 = 3.20, ARC_A1 = 7.45, ARC_PEAK = 5.90;
    const ARC_HLO = 2.45, ARC_HHI = 1.75, ARC_BINS = 96;
    const arcW = (azv) => {
      const q = Math.min(1, Math.abs(azv - ARC_PEAK) / (azv < ARC_PEAK ? ARC_HLO : ARC_HHI));
      return 0.03 + 0.97 * Math.pow(Math.cos(q * Math.PI / 2), 1.15);
    };
    const arcCdf = new Float64Array(ARC_BINS + 1);
    for (let b = 1; b <= ARC_BINS; b++) {
      arcCdf[b] = arcCdf[b - 1] + arcW(ARC_A0 + (b - 0.5) * (ARC_A1 - ARC_A0) / ARC_BINS);
    }
    for (let b = 0; b <= ARC_BINS; b++) arcCdf[b] /= arcCdf[ARC_BINS];
    const arcAz = (v) => {
      let lo = 0, hi = ARC_BINS;
      while (hi - lo > 1) { const m = (lo + hi) >> 1; if (arcCdf[m] <= v) lo = m; else hi = m; }
      const f = (v - arcCdf[lo]) / ((arcCdf[hi] - arcCdf[lo]) || 1);
      return ARC_A0 + (lo + f) * (ARC_A1 - ARC_A0) / ARC_BINS;
    };
    for (let k = 0; k < N; k++) {
      // the gill skirt sheds around the release arc above — one draw, as the
      // old mapping took; the outer gills carry the most surface, so bias u
      // outward too
      const a = arcAz(rand());
      const u = 0.55 + Math.pow(rand(), 0.6) * 0.45;
      const e = capUnderPt(u, a).applyEuler(capXf).add(capOff);
      e.x += gauss() * 0.06;
      e.z += gauss() * 0.06;
      e.y -= 0.06 + Math.pow(rand(), 1.5) * 0.62; // they fall clear of the gills first
      org.push(e.x, e.y, e.z);

      // scatter the cloud along the wind path by age: dense at the gills,
      // thinning and spreading as it travels downwind
      const age = Math.pow(rand(), 1.3);
      const travel = age * 5.2;
      const spread = 0.07 + age * 0.8;
      // same three gauss() draws, in the same order, as the pre-D27 push
      let px = e.x + BREEZE_DIR.x * travel + gauss() * spread;
      let py = e.y + BREEZE_DIR.y * travel + gauss() * spread * 0.72;
      let pz = e.z + BREEZE_DIR.z * travel + gauss() * spread * 0.6;
      // tone pow 1.4 → 1.9 (2026-08-09, Hannah's brief items 2/3): the 1.4
      // draw put ~1 dot in 5 above tone 0.9 — near-white — and under
      // additive stacking the close Connect framing and the far Final
      // pullback both read as decorated glitter rather than warm dust.
      // 1.9 thins the white tail (~1 in 8) and leaves the amber body of
      // the distribution untouched. ONE SUBSTANCE: sky.js TONE_POW and
      // final/shed.js's own draw mirror this number — all three move
      // together or the species splits.
      pushC(pc, 0.64 + Math.pow(rand(), 1.9) * 0.36);
      ps.push(Math.pow(rand(), 1.8) * 0.072 + 0.019);
      const sp = 0.028 + rand() * 0.055;
      sporeVel.push(BREEZE_DIR.x * sp,
                    BREEZE_DIR.y * sp + rand() * 0.012,
                    BREEZE_DIR.z * sp + gauss() * 0.008);
      // D27: iterate the filament contraction over this dot's own transit
      // time (travel / its integrated carry speed), so the seeded cloud IS
      // the reshaped wind's stationary distribution — no draws consumed,
      // and the frozen landing matches what the live wind holds.
      {
        // FIL_SEED_T: the closed-form iteration below overstates the live
        // contraction (it holds the dot at its final arc position and full
        // gust carry; the real path spends much of its transit outside the
        // ramp and catch), so the transit is scaled down to land the seeded
        // occupancy on the measured live equilibrium — the landing then
        // neither sharpens nor softens as the wind runs.
        // nearest filament decides the per-filament dwell scale (the lee
        // corridor is a thoroughfare — dust transits it — while the flank
        // corridors hold their catch longer)
        let ne = 0, nd = 1e9, nbs = 0;
        for (let e2 = 0; e2 < 3; e2++) {
          const wx = px - filPX[e2], wy = py - filPY[e2], wz = pz - filPZ[e2];
          const sfr = wx * filUX + wy * filUY + wz * filUZ;
          if (sfr < 0 || sfr > filSMax[e2]) continue;
          const lx = wx - sfr * filUX, ly = wy - sfr * filUY, lz = wz - sfr * filUZ;
          const d2f = lx * lx + ly * ly + lz * lz;
          if (d2f < nd) { nd = d2f; ne = e2; nbs = sfr / filSMax[e2]; }
        }
        // D29: the iteration holds the dot at its FINAL arc position, where
        // the release window may already have let go even though most of
        // its transit ran inside the catch — evaluating the profile there
        // would zero the whole history. So the profile is averaged over the
        // dot's own path 0..bs_final (numerically; filProf is smooth) and
        // applied as one constant, which is the closed form of "the catch
        // it actually flew through".
        let profAvg = 0;
        if (nbs > 1e-6) {
          const S = 16;
          for (let j = 0; j < S; j++) profAvg += filProf(nbs * (j + 0.5) / S);
          profAvg /= S;
        }
        let t = travel / (sp * 0.826) * FIL_SEED_T[ne];
        if (t > 120) t = 120;
        const steps = 12, dt = t / steps;
        for (let j = 0; j < steps; j++) {
          const r = filStep(px, py, pz, profAvg, dt);
          px = r[0]; py = r[1]; pz = r[2];
        }
      }
      // D29: the decoherence, in closed form over this dot's own climb —
      // DISP_RATE × (time spent above the gate), the gate integrated
      // analytically over the height it has risen through (∫smoothstep =
      // q³ − q⁴/2 across the ramp, then linear above it), at the dot's own
      // rise speed. Same law the integrator applies live, so the seeded
      // upper plume sits where the running wind holds it.
      if (py > DISP_Y0) {
        const y1 = Math.min(py, DISP_Y1);
        const qq = (y1 - DISP_Y0) / (DISP_Y1 - DISP_Y0);
        let I = (qq * qq * qq - qq * qq * qq * qq / 2) * (DISP_Y1 - DISP_Y0);
        if (py > DISP_Y1) I += py - DISP_Y1;
        const rv = sp * 0.826 * BREEZE_DIR.y;   // this dot's own rise speed
        let tAb = I / rv;
        if (tAb > 150) tAb = 150;
        const o = tAb * DISP_RATE, k3 = k * 3;
        px += dispDir[k3] * o; py += dispDir[k3 + 1] * o; pz += dispDir[k3 + 2] * o;
      }
      pp.push(px, py, pz);
    }
    sporeOrigin = new Float32Array(org); // each spore recycles to its own gill spot
    // release progress, 0 = just shed and still dropping, 1 = fully carried
    sporeAge = new Float32Array(N).fill(1);
    sporePts = makePoints(pp, pc, ps, 2.4);
    scene.add(sporePts);
  }

  // a rap on the cap shakes a fresh shed of spores off the gills: a few
  // particles restart their fall from their own release points
  // (called by the tap handler in organism.js §10c)
  function shedSpores(n) {
    const pos = sporePts.geometry.attributes.position, arr = pos.array;
    for (let k = 0; k < n; k++) {
      const i = (rand() * sporeAge.length) | 0, i3 = i * 3;
      arr[i3]     = sporeOrigin[i3] * ctx.swayCos - sporeOrigin[i3 + 1] * ctx.swaySin;
      arr[i3 + 1] = sporeOrigin[i3] * ctx.swaySin + sporeOrigin[i3 + 1] * ctx.swayCos;
      arr[i3 + 2] = sporeOrigin[i3 + 2];
      sporeAge[i] = 0;
    }
    pos.needsUpdate = true;
  }

  // ---- mouse wind + the drift integrator ----
  // Called by organism.js at the exact position the inline block held
  // before the M2 split. ORDERING CONSTRAINT (load-bearing): 'spore-drift'
  // must be registered AFTER 'breeze' (it reads ctx.swayCos/swaySin written
  // by 'breeze' earlier in the same frame) and BEFORE any journey-layer
  // animator — the seated driver's lighting (seat.drive, called from the
  // chapter's own animator later in the same frame) reads the
  // freshly-integrated positions, before render. Drift writes positions,
  // the seat writes light, render sees both: that order is proven
  // load-bearing (a8d4518).
  function registerDrift() {
    const { breeze, camera, addAnimator } = ctx;

    // ---- mouse wind: the cursor drags a whisper of air with it ----
    // The pointer's screen motion becomes a faint breeze along its view ray:
    // spores within about a unit of the ray feel a push matching the cursor's
    // sweep, mapped to each spore's own depth so near and far plume deflect by
    // the same VISUAL amount. A resting cursor keeps only a barely-there
    // outward drift — enough to sense the hover, never to scatter the cloud.
    // The smoothed velocity makes the stirred air trail the cursor a beat.
    // Mouse only: touch drags are orbit gestures, and this is a hover thing.
    const mw = { x: 9, y: 9, px: 9, py: 9, svx: 0, svy: 0, on: false };
    addEventListener('pointermove', (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return;
      if (e.buttons !== 0) { mw.on = false; return; } // dragging = orbiting, not hovering
      mw.x = (e.clientX / innerWidth) * 2 - 1;
      mw.y = -(e.clientY / innerHeight) * 2 + 1;
      mw.on = true;
    });
    document.addEventListener('mouseleave', () => { mw.on = false; });
    const _mwDir = new THREE.Vector3(), _mwRight = new THREE.Vector3(), _mwUp = new THREE.Vector3();

    addAnimator('spore-drift', (t, dt) => {
      // Seat watchdog (restore discipline is structural, not promised): if a
      // claimed driver stopped calling drive() — chapter torn down, journey
      // frame error — the system itself restores the colors and sizes
      // byte-exact within one frame. The primary release path is still
      // drive() easing its channels to zero.
      frameNo++;
      if (lastDriveFrame >= 0 && lastDriveFrame < frameNo - 1) releaseSeat();
      // sway state for this frame, written by 'breeze' earlier in the frame
      const swayCos = ctx.swayCos, swaySin = ctx.swaySin;
      const gust = 0.72 + 0.28 * breeze(t);   // gusts surge the drift as the body leans
      const k = Math.min(dt, 0.033) * 60;     // advance per 60fps-equivalent frame
      // cursor wind for this frame (see the mouse-wind comment above)
      let windOn = false, wdx = 0, wdy = 0, wdz = 0,
          rox = 0, roy = 0, roz = 0, rdx = 0, rdy = 0, rdz = 0, steady = 0;
      {
        const a = 1 - Math.exp(-dt * 7); // the stirred air trails the cursor a bit
        const ivx = dt > 0 ? (mw.x - mw.px) / dt : 0;
        const ivy = dt > 0 ? (mw.y - mw.py) / dt : 0;
        mw.px = mw.x; mw.py = mw.y;
        mw.svx += (Math.max(-3, Math.min(3, ivx)) - mw.svx) * a;
        mw.svy += (Math.max(-3, Math.min(3, ivy)) - mw.svy) * a;
        if (mw.on) {
          windOn = true;
          _mwDir.set(mw.x, mw.y, 0.5).unproject(camera).sub(camera.position).normalize();
          rox = camera.position.x; roy = camera.position.y; roz = camera.position.z;
          rdx = _mwDir.x; rdy = _mwDir.y; rdz = _mwDir.z;
          // screen velocity -> world velocity per unit of depth along the ray
          const tanH = Math.tan(camera.fov * Math.PI / 360);
          _mwRight.setFromMatrixColumn(camera.matrixWorld, 0).multiplyScalar(mw.svx * tanH * camera.aspect);
          _mwUp.setFromMatrixColumn(camera.matrixWorld, 1).multiplyScalar(mw.svy * tanH);
          wdx = (_mwRight.x + _mwUp.x) * 0.03;
          wdy = (_mwRight.y + _mwUp.y) * 0.03;
          wdz = (_mwRight.z + _mwUp.z) * 0.03;
          steady = 0.018; // the resting-cursor drift, in units/s at the ray
        }
      }
      const dts = Math.min(dt, 0.033); // seconds, matching k's frame clamp
      const pos = sporePts.geometry.attributes.position;
      const arr = pos.array; // raw typed array: the getter/setter API costs real
                             // time at 4200 spores x 60fps in the hottest JS loop
      // THE BUFFER IS ALWAYS THE AMBIENT STATE (D26, 2026-08-09, Hannah's
      // eighth spore report — "they shouldn't EVER switch positions based on
      // a move; emphasis should just be changed", taken literally). The seat
      // no longer writes positions AT ALL: this integrator is the one and
      // only owner of the position buffer at every scroll position, in both
      // directions, at every taste value. The hero-shadow bookkeeping
      // (heroP/lastW/writ), the retire-in-place algebra, the engage refit and
      // the standing floor — all machinery for reconciling a steered buffer
      // with an ambient one — are deleted with the steering itself, not
      // disabled: there is no second arrangement left to reconcile.
      for (let i = 0; i < pos.count; i++) {
        const i3 = i * 3;
        // the gills that release this spore are swaying, so its origin swings too
        const gx = sporeOrigin[i3] * swayCos - sporeOrigin[i3 + 1] * swaySin;
        const gy = sporeOrigin[i3] * swaySin + sporeOrigin[i3 + 1] * swayCos;
        let x = arr[i3], y = arr[i3 + 1], z = arr[i3 + 2];
        // Under the cap the air is still, so a fresh spore drops clear of the gills
        // before the wind takes hold. That handover is measured in TIME, not in
        // distance travelled: the drift is slow enough (~0.06 units/s) that a
        // distance gate would keep a spore falling for a quarter of a minute.
        let w = sporeAge[i];
        if (w < 1) w = sporeAge[i] = Math.min(1, w + (k / 60) / 1.6);
        // The cursor's slipstream: find how deep this spore sits in it BEFORE
        // the ambient drift is applied. Inside the slipstream the air belongs
        // to the cursor, so the breeze's carry YIELDS to it instead of adding
        // to it — a purely additive push against the wind just cancelled a
        // comparable drift and read as nothing; displacing the ambient flow is
        // what lets an against-the-wind sweep visibly stall and turn the plume.
        let fall = 0, spx = 0, spy = 0, spz = 0, sd2 = 0, tp = 0;
        if (windOn) {
          const ox = x - rox, oy = y - roy, oz = z - roz;
          tp = ox * rdx + oy * rdy + oz * rdz; // depth of this spore along the ray
          if (tp > 1 && tp < 16) {
            spx = ox - tp * rdx; spy = oy - tp * rdy; spz = oz - tp * rdz;
            sd2 = spx * spx + spy * spy + spz * spz;
            if (sd2 < 7.3) fall = Math.exp(-sd2 / 0.81); // beyond ~3 radii: nothing
          }
        }
        const carry = gust * (0.45 + 0.55 * w) * k * (1 - 0.6 * fall);
        // gentle turbulence layered over the drift
        x += sporeVel[i3]     * 0.016 * carry + Math.sin(t * 0.7 + i * 0.37) * 0.0018 * k * w;
        y += sporeVel[i3 + 1] * 0.016 * carry - 0.0026 * (1 - w) * k;
        z += sporeVel[i3 + 2] * 0.016 * carry + Math.cos(t * 0.5 + i * 0.53) * 0.0013 * k * w;
        // D27 LEE FILAMENTS (see the note at the top of this file): a
        // gentle, permanent lateral contraction toward the nearest of the
        // wind's three standing filaments — the same rule the seed block
        // integrates, scaled by the dot's own release progress so a fresh
        // recycle drops clear of the gills before the weather takes it.
        // Frozen frames are untouched by construction (dts = 0).
        {
          let bd2 = FIL_R2, blx = 0, bly = 0, blz = 0, bs = 0;
          for (let e = 0; e < 3; e++) {
            const wx = x - filPX[e], wy = y - filPY[e], wz = z - filPZ[e];
            const s = wx * filUX + wy * filUY + wz * filUZ;
            if (s < 0 || s > filSMax[e]) continue;
            const lx = wx - s * filUX, ly = wy - s * filUY, lz = wz - s * filUZ;
            const d2 = lx * lx + ly * ly + lz * lz;
            if (d2 < bd2) { bd2 = d2; blx = lx; bly = ly; blz = lz; bs = s / filSMax[e]; }
          }
          if (bd2 < FIL_R2) {
            let q = (bs - 0.10) / 0.40; q = q < 0 ? 0 : q > 1 ? 1 : q;
            // D29 release window — same profile as the seed's filStep
            let qd = (FIL_FADE1 - bs) / (FIL_FADE1 - FIL_FADE0);
            qd = qd < 0 ? 0 : qd > 1 ? 1 : qd;
            const lam = FIL_LAM * Math.exp(-bd2 / FIL_SIG2)
              * (q * q * (3 - 2 * q)) * (qd * qd * (3 - 2 * qd)) * dts * w;
            x -= blx * lam; y -= bly * lam; z -= blz * lam;
          }
        }
        // D29 UPPER-AIR DECOHERENCE (see the note at the top): above the
        // lanes' tops each dot drifts along its own fixed lateral direction,
        // dissolving the near-wake's inherited organisation back into one
        // irregular cloud. Frozen frames untouched by construction (dts = 0).
        if (y > DISP_Y0) {
          let qg = (y - DISP_Y0) / (DISP_Y1 - DISP_Y0);
          if (qg > 1) qg = 1;
          const dq = qg * qg * (3 - 2 * qg) * DISP_RATE * dts * w;
          x += dispDir[i3] * dq; y += dispDir[i3 + 1] * dq; z += dispDir[i3 + 2] * dq;
        }
        if (fall > 0) {
          const g = fall * dts;
          const inv = steady / Math.sqrt(sd2 + 1e-4) * g;
          x += wdx * tp * g + spx * inv;
          y += wdy * tp * g + spy * inv;
          z += wdz * tp * g + spz * inv;
        }
        // spent — release again from its own gill spot. The bounds are closed on
        // every side so nothing can wander off and never come back.
        if (x > 6.8 || y > 7.6 || y < 0.2 || x < gx - 2.5) {
          x = gx; y = gy; z = sporeOrigin[i3 + 2]; sporeAge[i] = 0;
        }
        arr[i3] = x; arr[i3 + 1] = y; arr[i3 + 2] = z;
      }
      pos.needsUpdate = true;
    });
  }

  // =====================================================================
  // 10d. DRIVER SEAT — the journey's emphasis as a LIGHTING MODE of THESE
  // dots (merge doc §3): one spore population, one arrangement, lit three
  // ways.
  // =====================================================================
  // D26 (2026-08-09) — THE POSITION CHANNEL IS DELETED. Hannah's eighth
  // report in this family stated the requirement in absolute terms:
  //
  //   "They shouldn't EVER switch positions based on a move — emphasis
  //    should just be changed."
  //
  // Seven rounds (b2c9584 … 6e28eff) refined a model in which the rendered
  // shed was a BLEND between a free drift and a designed braid, and the
  // blend amount varied with the section — so crossing a boundary always
  // moved dots, however well paced. D25's standing floor got closest (the
  // lerp fl -> T), but a lerp whose endpoints differ IS a position change
  // at the boundary, by construction. The only blend constant enough to be
  // invisible at every boundary is the one this file now ships: ZERO. The
  // dots are the wind's, everywhere, always; the three streams are LIGHT.
  //
  // The seam rule survives intact: SPORE BEHAVIOUR lives here; the chapter
  // keeps its anatomy and intent. A driver claims the seat once with the
  // static exit geometry (setDriver({ exits }) -> seat handle) and then,
  // every frame, passes intent through seat.drive({...}) — per-exit reveals,
  // dim regions, the TRANSFORM taste value. What the seat now drives:
  //
  //   drift (ambient)  — the integrator above. It ALWAYS owns positions.
  //   emphasis         — emphasize(): a per-dot LIGHTING field. Each exit's
  //                      route (source wedge -> rim walk -> braided rise
  //                      along the drift's own lean, DRIFT_RX/RZ — D17) is
  //                      sampled as a capsule chain each frame, and every
  //                      dot's proximity to the lit portion of that chain
  //                      sets how much of its ambient look it exchanges for
  //                      plume look (cv), how much brightness it gains (pw)
  //                      and how much its sprite swells (sz). The reveal
  //                      opens the chain from the source outward (draw-on
  //                      along the feed direction — the no-self-ignition
  //                      law), staggered per dot so cohorts arrive as
  //                      growth, never as a switch. Dots drift THROUGH the
  //                      lit lanes — the drift and the routes share one
  //                      axis (D17), so the wind itself animates the
  //                      streams — and the knot-pearl cadence travels along
  //                      the lane as a wave of light, not of matter.
  //   dim              — the color/size pass, applying the per-dot feed +
  //                      region channels (the whole-shed hand-over retired
  //                      2026-08-06). Byte-exact restore from the one base
  //                      copy (colors AND sizes).
  //
  // WHAT THIS BUYS, STATED AS INVARIANTS:
  //   · Positions are a pure function of (time, wind, taps) — NEVER of
  //     scroll position. Crossing any boundary, in either direction, at any
  //     rate, moves nothing: the position-difference distribution across a
  //     crossing is the ambient drift's own, exactly, because it is the
  //     same code path.
  //   · Lighting is conservative and monotone per dot: pw >= cv for every
  //     lit dot (f = f·(1 - cv) + pw >= f), so no dot ever darkens for the
  //     reveal — the b2c9584 conservation law strengthened to "emphasis
  //     only ever adds". The dark-and-converted class is empty by
  //     construction.
  //   · The reveal SCHEDULE (gates, fronts, ramps) is pure in (eff, hash) —
  //     the e2bd6e8 discipline. The spatial share necessarily reads the
  //     dots' live positions: that is the same time-dependence the ambient
  //     twinkle always had, and it is what "lighting a region of a drifting
  //     cloud" means. Both shares are separable and measured separately.
  //   · All channels at ~0 restores colors and sizes byte-exact (one
  //     release path, three ways in: drive() easing to zero, setDriver
  //     (null), the watchdog above).

  // -- deterministic per-dot hashes. Same LCG family as the hero's own rand
  // (organism.js §1); own seed (9127, the stream the approved assignments
  // were drawn from), so it can never consume the hero's stream.
  function makeRng(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  const TAU = Math.PI * 2;
  const ss = (a, b, x) => {
    x = (x - a) / (b - a);
    x = x < 0 ? 0 : x > 1 ? 1 : x;
    return x * x * (3 - 2 * x);
  };
  // rim underside height at azimuth a — mirrors capUnderPt(1, a).y without
  // allocating a Vector3 in the hot loop
  const { LEAN_DIR, CAP_Y } = ctx;
  function rimYof(a) {
    return CAP_Y + 0.03 + rimYoff(a) - (0.11 + 0.05 * Math.cos(a - LEAN_DIR)) - 0.11;
  }

  // ---- EMPHASIS TUNING ------------------------------------------------
  // ARRIVAL SPREAD (kept from 9e2a277/2fdb4e6): a dot's own crossing is
  // invisible, a cohort crossing together is the flash — so every dot's
  // lighting gate is hash-staggered across the reveal, exact at reveal 1
  // (ss(0, RAMP, 1 - STAG) = 1 requires RAMP + STAG <= 1).
  const CONV_RAMP = 0.26, CONV_STAG = 0.74;
  // Route tube radii (world units): full weight inside R0, feathered to
  // nothing at R1, per stage. The braid strands sit ~0.65 u apart, so the
  // rise tubes stay narrow enough to read as three winding filaments per
  // stream rather than one fat column.
  const R0_SRC = 0.28, R1_SRC = 0.62;   // source wedge (shared birth sector)
  const R0_WLK = 0.20, R1_WLK = 0.45;   // migrant rim-walk chord
  // Rise tubes are PER EXIT: the ambient flux through each exit's rise
  // corridor differs by two orders (measured at the rest: dots within
  // 0.55 u of the rise spines — ArtCompute 2,422 / Arca 24 / 2RP 429),
  // because the wind carries the shed past ArtCompute's sector, brushes
  // 2RP's, and barely reaches Arca's front-left lip. A lane can only light
  // the dust that is actually there, so the starved exits get wider,
  // softer catchments and the source exit a tight one.
  // D27: the release-arc reshape feeds all three corridors honestly
  // (measured after: 959 / 379 / 292 dots within 0.55 u of the rise
  // spines, against 2,422 / 24 / 429 before), so the starved-field
  // catchments (1.10 / 0.72, tuned to scrape light out of nearly-empty
  // sectors) are re-tightened toward the lane read: wide catchments on a
  // populated field light a wash, not a stream.
  const R0_RIS_E = [0.10, 0.18, 0.15];
  const R1_RIS_E = [0.34, 0.55, 0.48];
  const R_CORE_E = [0.14, 0.24, 0.20];  // hot-core grading inside the rise
  // Draw-on front soft width, in arc units (the chain is arc 0..1).
  const FRONT_W = 0.14;
  // Brightness: body gain + knot-pearl cadence gain (per-exit knot spec).
  // D27 re-split: the BODY is a modest lift (the lane's presence), and the
  // legible stream structure rides the CORE pearls — bright beads hugging
  // the tight winding spines (R_CORE), where projected scatter is small
  // enough to read as a filament. A big body gain on a 0.5 u tube lights a
  // wash; beads on a 0.2 u core light a line.
  // 2026-08-09 (Hannah's brief, item 1): 1.15/4.6 → 1.40/5.4. With the lee
  // filaments softened (FIL_LAM 0.060) the lanes' density substrate is
  // thinner, and at the D27 values the Inspire rest read as ONE broad fan
  // with barely-discernible streaks — under-legible for the chapter whose
  // whole job is three channels. The radii stay tight (the wash guard),
  // so the lift lands on the winding cores where the lane read lives.
  const GAIN_BODY = 1.40;
  const GAIN_KNOT = 6.2;
  const BOOST_E = [1.15, 1.34, 1.24];
  // Sprite swell, keyed to the core beads (see pw below).
  // (1.15 → 1.45 with the 2026-08-09 legibility pass: the beads that carry
  // the lane read swell a step further; off-core dots barely move.)
  const GAIN_SIZE = 1.45;
  // Taste-dial pearl floor (kept): the knot-pearl richness never scales
  // below this share, so a faint sparkle keeps the labels' anchors alive
  // even near T = 0.
  const PEARL_FLOOR = 0.18;
  // Rise strand sampling: SEG segments per strand, 3 strands per exit.
  const SEG = 6;
  // Overlapping dim regions never fully erase a spore.
  const MAX_TOTAL_DIM = 0.85;

  // seat bookkeeping (watchdog contract with 'spore-drift' above)
  let frameNo = 0, lastDriveFrame = -1;
  let exits = null;                       // claim: static exit geometry/anchors

  // ---- emphasis state ----
  let N = 0, inited = false, wasActive = false;
  let stagW, phA, twA;                    // per-dot static hashes
  // the dimmer feed: cv = exchange, pw = plume brightness, sz = sprite swell
  const feed = { cv: null, pw: null, sz: null, any: false };

  // ---- dim state (color/size mode) ----
  let colorBase = null, sizeBase = null, dimActive = false;
  // scratch: per-region scalars, rebuilt each drive (regions.length ~9; flat
  // parallel arrays so the 4,200-dot loop touches no objects)
  const ax = [], ay = [], az = [], bx = [], by = [], bz = [], ab2 = [],
        r0 = [], r1 = [], kk = [];

  // ?tkdbg=1 — perf + animator-order probe hooks (QA)
  // (parsed once, in ../flags.js — THE flag registry)
  const dbg = TKDBG;
  let perfAcc = 0, perfN = 0;

  function initEmphasis() {
    if (!exits || exits.length < 3) return false;
    N = sporePts.geometry.attributes.position.count;
    stagW = new Float32Array(N);
    phA = new Float32Array(N);
    twA = new Float32Array(N);
    const randT = makeRng(9127);
    for (let i = 0; i < N; i++) {
      // ARRIVAL SPREAD: a stagger uniform in REVEAL is not uniform on
      // SCREEN (the chapter drives the reveal as a smoothstep of progress),
      // so the hash is pre-warped through the same smoothstep — more dots
      // where the reveal is slow, an even arrival in TIME (2fdb4e6).
      const sg = randT();
      stagW[i] = sg * sg * (3 - 2 * sg);
      phA[i] = randT() * TAU;
      twA[i] = 0.5 + randT() * 1.1;
    }
    feed.cv = new Float32Array(N);
    feed.pw = new Float32Array(N);
    feed.sz = new Float32Array(N).fill(1);
    inited = true;
    return true;
  }

  // ---- ROUTE CHAINS, sampled fresh each frame -------------------------
  // Per exit: a capsule chain in WORLD space with an arc parameter s in
  // [0, 1] running along the feed direction — source wedge, then (migrants)
  // the rim-walk chord, then the braided rise as 3 winding strands whose
  // wobble breathes with tNow. Light only ever advances along s from the
  // source (D16's no-self-ignition rule: visibility enters from the feed),
  // and the wobble means the lit lanes themselves gently writhe — the
  // braid's living motion carried by light alone.
  //
  // Arc spans: resident  src 0 -> 0.22, rise 0.22 -> 1
  //            migrants  src 0 -> 0.15, walk 0.15 -> 0.42, rise 0.42 -> 1
  // The migrant walk front completes at rev 0.55 and the rise draws on
  // across rev 0.55 -> 1 (the shipped delta choreography, now as light).
  const MAXSEG = 3 * (2 + 3 * SEG);       // per-exit segment capacity
  const seg = {
    // flat per-exit segment tables (world space, rebuilt each drive frame)
    axA: new Float32Array(3 * MAXSEG), ayA: new Float32Array(3 * MAXSEG),
    azA: new Float32Array(3 * MAXSEG),
    bxA: new Float32Array(3 * MAXSEG), byA: new Float32Array(3 * MAXSEG),
    bzA: new Float32Array(3 * MAXSEG),
    s0A: new Float32Array(3 * MAXSEG), s1A: new Float32Array(3 * MAXSEG),
    r0A: new Float32Array(3 * MAXSEG), r1A: new Float32Array(3 * MAXSEG),
    stA: new Uint8Array(3 * MAXSEG),    // 0 src, 1 walk, 2 rise
    // hot-loop precomputation (per segment, rebuilt with the tables):
    // direction (b - a), 1/|b - a|², r1², and (r1 - r0) reciprocal
    dxA: new Float32Array(3 * MAXSEG), dyA: new Float32Array(3 * MAXSEG),
    dzA: new Float32Array(3 * MAXSEG), il2A: new Float32Array(3 * MAXSEG),
    r12A: new Float32Array(3 * MAXSEG), irSpanA: new Float32Array(3 * MAXSEG),
    n: [0, 0, 0],                        // segments used per exit
    // per-exit bounding capsules (2 per exit: src->lip, lip->top), radius
    // R_BOUND — the cheap reject the hot loop runs first
    bAx: new Float32Array(6), bAy: new Float32Array(6), bAz: new Float32Array(6),
    bBx: new Float32Array(6), bBy: new Float32Array(6), bBz: new Float32Array(6),
    bDx: new Float32Array(6), bDy: new Float32Array(6), bDz: new Float32Array(6),
    bIl2: new Float32Array(6),
  };
  // D27: 1.45 covers the tightened tubes (strand spread ±0.36 + wobble
  // ~0.25 + widest R1 0.55) with margin; 2.1 was sized for the old 1.10
  // starved-field catchments and let ~2x the dots into the fine scan.
  const R_BOUND = 1.45, R_BOUND2 = R_BOUND * R_BOUND;

  function xfPush(mEl, lx, ly, lz, out, o) {
    out[0][o] = mEl[0] * lx + mEl[4] * ly + mEl[8] * lz + mEl[12];
    out[1][o] = mEl[1] * lx + mEl[5] * ly + mEl[9] * lz + mEl[13];
    out[2][o] = mEl[2] * lx + mEl[6] * ly + mEl[10] * lz + mEl[14];
  }

  function buildRoutes(tNow, leanScale, mEl) {
    const srcAz = exits[0].az;
    const A = [seg.axA, seg.ayA, seg.azA], B = [seg.bxA, seg.byA, seg.bzA];
    const BA = [seg.bAx, seg.bAy, seg.bAz], BB = [seg.bBx, seg.bBy, seg.bBz];
    // shared source geometry (all three chains are born in the source wedge —
    // the delta rule)
    const inner = capUnderPt(0.55, srcAz); inner.y -= 0.10;
    const srcR = rimRad(srcAz) + 0.08, srcY = rimYof(srcAz);
    const srcLipX = Math.cos(srcAz) * srcR, srcLipZ = Math.sin(srcAz) * srcR;
    for (let e = 0; e < 3; e++) {
      const spec = exits[e];
      const a = spec.az, migF = e > 0;
      const rimR = rimRad(a) + 0.05, rimY = rimYof(a);
      const lipX = Math.cos(a) * rimR, lipY = rimY + 0.10, lipZ = Math.sin(a) * rimR;
      const sSrc1 = migF ? 0.15 : 0.22;   // arc where the source stage ends
      const sRise0 = migF ? 0.42 : sSrc1; // arc where the rise begins
      let n = 0;
      const base = e * MAXSEG;
      const put = (lx1, ly1, lz1, lx2, ly2, lz2, s0, s1, rr0, rr1, st) => {
        const o = base + n;
        xfPush(mEl, lx1, ly1, lz1, A, o);
        xfPush(mEl, lx2, ly2, lz2, B, o);
        seg.s0A[o] = s0; seg.s1A[o] = s1;
        seg.r0A[o] = rr0; seg.r1A[o] = rr1; seg.stA[o] = st;
        const dx = seg.bxA[o] - seg.axA[o], dy = seg.byA[o] - seg.ayA[o],
              dz = seg.bzA[o] - seg.azA[o];
        const l2 = dx * dx + dy * dy + dz * dz;
        seg.dxA[o] = dx; seg.dyA[o] = dy; seg.dzA[o] = dz;
        seg.il2A[o] = l2 > 1e-9 ? 1 / l2 : 0;
        seg.r12A[o] = rr1 * rr1;
        seg.irSpanA[o] = 1 / (rr1 - rr0);
        n++;
      };
      // source wedge: inner gills -> source lip
      put(inner.x, inner.y, inner.z, srcLipX, srcY, srcLipZ,
          0, sSrc1, R0_SRC, R1_SRC, 0);
      // migrant walk: source lip -> release lip (rim chord; sagitta < R1)
      if (migF) {
        put(srcLipX, srcY, srcLipZ, lipX, lipY, lipZ,
            sSrc1, sRise0, R0_WLK, R1_WLK, 1);
      }
      // braided rise: 3 winding strands, sampled SEG segments each. Strand
      // heights split the exit's [riseMin, riseMax] band so the tips vary.
      for (let s = 0; s < 3; s++) {
        const rise = spec.riseMin + ((s + 0.5) / 3) * (spec.riseMax - spec.riseMin);
        // Lane spread: HALF the old braid's strand curl (0.30) — a lit lane
        // has the tube's own width on top of the spine spread, so the spine
        // trio must sit tighter than the positional braid did or the three
        // strands read as one wide wash.
        const azS = a + (s - 1) * 0.15;
        const sp = s * 2.094 + e * 1.3;   // strand winding phase
        let px = 0, py = 0, pz = 0;
        for (let q = 0; q <= SEG; q++) {
          const hh = q / SEG;
          // the shipped braid winding (steer()'s own wobble terms, strand-
          // averaged, halved for lane sharpness), alive in tNow — light
          // writhes, dots do not
          const azP = azS
            + 0.065 * Math.sin(hh * 5.1 + sp)
            + 0.035 * Math.sin(hh * 9.7 + sp * 2.3 + tNow * 0.21);
          const r = rimR + 0.05
            + 0.05 * Math.sin(hh * 4.3 + sp * 1.7)
            + 0.025 * Math.sin(tNow * 0.17 + sp * 2.3)
            + hh * 0.14;
          const lean = leanScale * hh * rise;
          const lx = Math.cos(azP) * r + lean * DRIFT_RX;
          const ly = rimY + 0.10 + hh * rise;
          const lz = Math.sin(azP) * r + lean * DRIFT_RZ;
          if (q > 0) {
            put(px, py, pz, lx, ly, lz,
                sRise0 + ((q - 1) / SEG) * (1 - sRise0),
                sRise0 + (q / SEG) * (1 - sRise0),
                R0_RIS_E[e], R1_RIS_E[e], 2);
          }
          px = lx; py = ly; pz = lz;
        }
      }
      seg.n[e] = n;
      // bounding capsules: src inner -> release lip, release lip -> top
      const riseTop = spec.riseMax;
      const topX = Math.cos(a) * (rimR + 0.19) + leanScale * riseTop * DRIFT_RX;
      const topY = rimY + 0.10 + riseTop;
      const topZ = Math.sin(a) * (rimR + 0.19) + leanScale * riseTop * DRIFT_RZ;
      xfPush(mEl, inner.x, inner.y, inner.z, BA, e * 2);
      xfPush(mEl, lipX, lipY, lipZ, BB, e * 2);
      xfPush(mEl, lipX, lipY, lipZ, BA, e * 2 + 1);
      xfPush(mEl, topX, topY, topZ, BB, e * 2 + 1);
      for (let b = e * 2; b <= e * 2 + 1; b++) {
        const dx = seg.bBx[b] - seg.bAx[b], dy = seg.bBy[b] - seg.bAy[b],
              dz = seg.bBz[b] - seg.bAz[b];
        const l2 = dx * dx + dy * dy + dz * dz;
        seg.bDx[b] = dx; seg.bDy[b] = dy; seg.bDz[b] = dz;
        seg.bIl2[b] = l2 > 1e-9 ? 1 / l2 : 0;
      }
    }
  }

  /** THE EMPHASIS — runs inside drive(), i.e. from the driver's own
   *  animator, AFTER 'spore-drift' integrated the buffer this frame.
   *  Writes ONLY the per-dot lighting feed (cv/pw/sz); positions are
   *  read-only here, by design and by Hannah's own rule.
   *  eff: per-exit effective reveals; mw: the mushroom's matrixWorld;
   *  T: the TRANSFORM taste value (0..1). */
  function emphasize(eff, tNow, mw, leanScale, transform) {
    const drive = eff[0] > 1e-4 || eff[1] > 1e-4 || eff[2] > 1e-4;
    if (!drive && !wasActive) { feed.any = false; return; }
    if (!inited && !initEmphasis()) { feed.any = false; return; }
    const T = transform < 0 ? 0 : transform > 1 ? 1 : transform;
    const pearlScale = PEARL_FLOOR + (1 - PEARL_FLOOR) * T;

    const t0 = dbg ? performance.now() : 0;
    const cv = feed.cv, pw = feed.pw, sz = feed.sz;
    if (!drive) {
      // going quiet: zero the feed so dim() restores, then release
      cv.fill(0); pw.fill(0); sz.fill(1);
      feed.any = false;
      wasActive = false;
      return;
    }
    buildRoutes(tNow, leanScale, mw.elements);

    const pos = sporePts.geometry.attributes.position.array;
    // per-exit front position along the arc, from the reveal — the draw-on
    // choreography (walk completes at rev 0.55, rise draws on 0.55 -> 1 for
    // migrants; the resident's source saturates by rev 0.2 and its rise
    // rides the rest). Fronts overshoot by FRONT_W so arc 1 is FULLY lit at
    // rev 1 (identity at the rest, exact by arithmetic).
    const fronts = [0, 0, 0];
    for (let e = 0; e < 3; e++) {
      const rev = eff[e];
      let f;
      if (rev <= 0) f = 0;
      else if (e === 0) {
        // resident: source saturates by rev 0.2, the rise rides the rest
        f = rev < 0.2 ? (rev / 0.2) * 0.22
                      : 0.22 + ((rev - 0.2) / 0.8) * 0.78;
      } else {
        // migrant: source by 0.15, walk completes at 0.55, then the rise
        f = rev < 0.15 ? (rev / 0.15) * 0.15
          : rev < 0.55 ? 0.15 + ((rev - 0.15) / 0.40) * 0.27
                       : 0.42 + ((rev - 0.55) / 0.45) * 0.58;
      }
      fronts[e] = f * (1 + FRONT_W);
    }
    const knotG = [exits[0].knot, exits[1].knot, exits[2].knot];

    let anyOn = false;
    // ?tkdbg=1 — per-exit lane occupancy probe (QA): how many dots each
    // exit's chain is actually lighting, and how hard
    const dbgN = dbg ? [0, 0, 0] : null;
    const dbgSum = dbg ? [0, 0, 0] : null;
    for (let i = 0; i < N; i++) {
      const i3 = i * 3;
      const px = pos[i3], py = pos[i3 + 1], pz = pos[i3 + 2];
      const sw = stagW[i];
      let em = 0, emArc = 0, emCore = 0, emKnot = 0, emExit = -1;
      for (let e = 0; e < 3; e++) {
        const rev = eff[e];
        if (rev <= 1e-4) continue;
        // per-dot arrival gate (pure in (eff, hash) — the schedule share)
        const gate = ss(0, CONV_RAMP, rev - sw * CONV_STAG);
        if (gate <= 0) continue;
        // cheap reject: the exit's two bounding capsules (inlined — this is
        // the hottest arithmetic on the page; no function calls in here)
        let inBound = false;
        for (let b = e * 2; b <= e * 2 + 1; b++) {
          const ox = px - seg.bAx[b], oy = py - seg.bAy[b], oz = pz - seg.bAz[b];
          let t = (ox * seg.bDx[b] + oy * seg.bDy[b] + oz * seg.bDz[b]) * seg.bIl2[b];
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const ex = ox - seg.bDx[b] * t, ey = oy - seg.bDy[b] * t, ez = oz - seg.bDz[b] * t;
          if (ex * ex + ey * ey + ez * ez <= R_BOUND2) { inBound = true; break; }
        }
        if (!inBound) continue;
        // fine scan: nearest tube of this exit's chain, normalized by each
        // stage's own radii
        const base = e * MAXSEG, nSeg = seg.n[e];
        let bq = 1e9, bArc = 0, bSt = 0, bD = 0;
        for (let j = 0; j < nSeg; j++) {
          const o = base + j;
          const ox = px - seg.axA[o], oy = py - seg.ayA[o], oz = pz - seg.azA[o];
          let t = (ox * seg.dxA[o] + oy * seg.dyA[o] + oz * seg.dzA[o]) * seg.il2A[o];
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const ex = ox - seg.dxA[o] * t, ey = oy - seg.dyA[o] * t, ez = oz - seg.dzA[o] * t;
          const d2 = ex * ex + ey * ey + ez * ez;
          if (d2 >= seg.r12A[o]) continue;
          const d = Math.sqrt(d2);
          const q = (d - seg.r0A[o]) * seg.irSpanA[o];
          if (q < bq) {
            bq = q;
            bArc = seg.s0A[o] + (seg.s1A[o] - seg.s0A[o]) * t;
            bSt = seg.stA[o]; bD = d;
          }
        }
        if (bq >= 1) continue;
        // radial weight (1 inside R0, feathered to 0 at R1), SQUARED (D27):
        // in projection the three rises converge toward the breeze's own
        // vanishing point, so a lane's soft radial skirt is what smears the
        // gaps between streams — the steeper falloff keeps the light on the
        // winding cores where the lane read lives.
        let wR;
        if (bq <= 0) wR = 1;
        else { wR = 1 - bq * bq * (3 - 2 * bq); wR *= wR; }
        // draw-on front along the arc (soft edge FRONT_W)
        const g = ss(0, 1, (fronts[e] - bArc) / FRONT_W);
        if (g <= 0) continue;
        // tip fade (D27: 0.70 -> 1.0 — the positional plume's own top fade,
        // read off steer()'s 0.62-1 rise fade mapped to arc: the converging
        // upper third is where the three lanes merge in projection, so the
        // light lets go exactly where the old braid's density did)
        const tip = bSt === 2 ? 1 - ss(0.70, 1.0, bArc) : 1;
        // stage weight: the rise carries the stream read; the source wedge
        // sits half-occluded under the cap and must not spend the contrast
        const stW = bSt === 2 ? 1 : bSt === 1 ? 0.65 : 0.28;
        const emE = wR * g * tip * gate * stW;
        if (emE > em) {
          em = emE; emArc = bArc; emKnot = knotG[e]; emExit = e;
          emCore = bSt === 2 ? 1 - ss(0, R_CORE_E[e], bD) : 0;
        }
      }
      if (dbg && em > 0.05) { dbgN[emExit]++; dbgSum[emExit] += em; }
      if (em <= 0) {
        cv[i] = 0; pw[i] = 0; sz[i] = 1;
        continue;
      }
      anyOn = true;
      // knot-pearl cadence: a wave of light travelling along the lane
      // toward the tip. The phase jitter is deliberately SMALL (±0.5 rad):
      // the crests must stay spatially coherent along the lane — coherent
      // light along a path is what makes a stream legible out of dust —
      // while the jitter keeps each dot's own crossing particulate.
      // D27: spatial frequency 26 (was 11) — the rise spans ~0.6 of arc, so
      // ~2.5 crests ride each lane at any instant; a single travelling
      // crest reads as a pulse, several at once read as a beaded stream.
      const kn0 = 0.5 + 0.5 * Math.sin(emArc * 26.0 - tNow * 0.8 + (phA[i] - Math.PI) * 0.16);
      const kn2 = kn0 * kn0;
      const kn = kn2 * kn2;
      // slow per-dot twinkle keeps the lit lane alive between crests
      const twk = 0.82 + 0.18 * Math.sin(tNow * twA[i] + phA[i] * 3.1);
      const c = em * T;
      cv[i] = c;
      const boost = BOOST_E[emExit];
      // pw >= cv: the exchange never darkens a dot (conservation, monotone).
      // The knot share is concentrated on the core (0.10 floor, was 0.35):
      // off-core dots keep the lane's body lift but the pearls — the read —
      // hug the spines.
      pw[i] = c * (1
        + GAIN_BODY * twk * boost
        + GAIN_KNOT * kn * emKnot * boost * (0.10 + 0.90 * emCore) * pearlScale);
      sz[i] = 1 + GAIN_SIZE * c * (0.20 + 0.80 * emCore) * (0.45 + 0.55 * kn);
    }
    feed.any = anyOn;
    wasActive = true;

    if (dbg) {
      perfAcc += performance.now() - t0; perfN++;
      if (perfN >= 60) {
        window.__tkPerf = +(perfAcc / perfN).toFixed(3);
        perfAcc = 0; perfN = 0;
      }
      window.__tkLast0 = pos[0]; // animator-order probe: must survive to render
      window.__emphN = dbgN;    // per-exit lane occupancy (dots at em > 0.05)
      window.__emphSum = dbgSum.map(v => +v.toFixed(1));
      window.__emphSeg = seg;   // the live segment tables (QA inspection)
    }
  }

  // ---- color/size mode: per-region dim + per-dot emphasis, byte-exact restore ----
  function restoreBase() {
    const cAttr = sporePts.geometry.attributes.color;
    cAttr.array.set(colorBase);                         // verbatim
    cAttr.needsUpdate = true;
    if (sizeBase) {
      const sAttr = sporePts.geometry.attributes.psize;
      sAttr.array.set(sizeBase);
      sAttr.needsUpdate = true;
    }
    dimActive = false;
  }

  /** regions: [{ a, b, r0, r1, k }] — world-space capsule from a to b, full
   *  dim inside r0, feathered to untouched at r1, strength k (0..1, already
   *  scaled by the driver's reveal x taste).
   *  grad: { sx,sy,sz, d0,d1, k } distance-graded history dissolve. The
   *  per-dot exchange rides the emphasis feed:  F = f * (1 - cv) + pw
   *  — an emphasized dot swaps its ambient look for its plume look; the dim
   *  channels apply to the unemphasized share only. Sizes ride feed.sz the
   *  same way. All channels ~0 restores the base colors AND sizes byte-exact. */
  function dim(regions, grad) {
    const tk = feed;
    let n = 0;
    if (regions) for (const rg of regions) {
      if (rg.k <= 0.004) continue;
      ax[n] = rg.a.x; ay[n] = rg.a.y; az[n] = rg.a.z;
      const dx = rg.b.x - rg.a.x, dy = rg.b.y - rg.a.y, dz = rg.b.z - rg.a.z;
      bx[n] = dx; by[n] = dy; bz[n] = dz;
      ab2[n] = Math.max(dx * dx + dy * dy + dz * dz, 1e-6);
      r0[n] = rg.r0; r1[n] = rg.r1; kk[n] = rg.k;
      n++;
    }
    const gradOn = grad && grad.k > 0.004;
    const tkOn = tk && tk.any && tk.cv;
    if (n === 0 && !gradOn && !tkOn) { if (dimActive) restoreBase(); return; }
    if (!colorBase) colorBase = sporePts.geometry.attributes.color.array.slice(); // the ONE base copy
    if (!sizeBase) sizeBase = sporePts.geometry.attributes.psize.array.slice();
    dimActive = true;
    const attr = sporePts.geometry.attributes.color;
    const col = attr.array;
    const sAttr = sporePts.geometry.attributes.psize;
    const siz = sAttr.array;
    const pos = sporePts.geometry.attributes.position.array;
    const tcv = tkOn ? tk.cv : null, tpw = tkOn ? tk.pw : null, tsz = tkOn ? tk.sz : null;
    let pi = 0;
    for (let i = 0; i < col.length; i += 3, pi++) {
      const x = pos[i], y = pos[i + 1], z = pos[i + 2];
      let dimV = 0;
      for (let j = 0; j < n; j++) {
        const px = x - ax[j], py = y - ay[j], pz = z - az[j];
        let t = (px * bx[j] + py * by[j] + pz * bz[j]) / ab2[j];
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const dx = px - bx[j] * t, dy = py - by[j] * t, dz = pz - bz[j] * t;
        const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (d < r1[j]) {
          let s = d <= r0[j] ? 1 : 1 - (d - r0[j]) / (r1[j] - r0[j]);
          s = s * s * (3 - 2 * s);
          const v = kk[j] * s;
          if (v > dimV) dimV = v;   // max, not sum: overlaps must not over-darken
        }
      }
      if (dimV > MAX_TOTAL_DIM) dimV = MAX_TOTAL_DIM;
      let g = 0;
      if (gradOn) {
        const hx = x - grad.sx, hy = y - grad.sy, hz = z - grad.sz;
        const hd = Math.sqrt(hx * hx + hy * hy + hz * hz);
        let hf = (hd - grad.d0) / (grad.d1 - grad.d0);
        hf = hf < 0 ? 0 : hf > 1 ? 1 : hf;
        hf = hf * hf * (3 - 2 * hf);
        const gh = grad.k * hf * 0.97;   // history dissolves; source survives
        if (gh > g) g = gh;
      }
      let f = 1 - (g > dimV ? g : dimV);
      // per-dot exchange: an emphasized dot swaps its ambient look for its
      // plume look; near T = 0 cv is ~0 but the pearl FLOOR still sparkles
      // through pw — so pw alone can open the branch.
      let szf = 1;
      if (tkOn) {
        const c = tcv[pi];
        const w = tpw[pi];
        if (c > 0.0005 || w > 0.0005) { f = f * (1 - c) + w; szf = tsz[pi]; }
      }
      col[i] = colorBase[i] * f;
      col[i + 1] = colorBase[i + 1] * f;
      col[i + 2] = colorBase[i + 2] * f;
      siz[pi] = sizeBase[pi] * szf;
    }
    attr.needsUpdate = true;
    sAttr.needsUpdate = true;
  }

  // ---- the ONE release path (see the header note) ----
  function releaseSeat() {
    lastDriveFrame = -1;
    // Positions are the drift's at every moment (D26): releasing the seat
    // has NOTHING to hand back but light. Colors and sizes restore
    // byte-exact from the one base copy.
    wasActive = false;
    feed.any = false;
    if (dimActive) restoreBase();
  }

  /** The driver's per-frame hand on the seat. Called from the driver's own
   *  animator — i.e. AFTER 'spore-drift' integrated this frame (the journey's
   *  animators register after the organism's; see the ordering comment on
   *  registerDrift). The emphasis runs first, then the color/size pass reads
   *  its per-dot feed — same frame, one call. */
  const seat = {
    drive({ eff, time, matrixWorld, leanScale = 1, transform = 1,
            regions = null, grad = null }) {
      if (!system.driver) return;   // released seat: the handle is inert
      lastDriveFrame = frameNo;
      if (eff) emphasize(eff, time, matrixWorld, leanScale, transform);
      dim(regions, grad);
    },
    /** Warm-up (D25, kept): allocate the per-dot emphasis state at page
     *  load instead of on the first mid-scroll frame that needs it. Pure
     *  allocation + deterministic RNG draws; a no-op if already
     *  initialized. */
    prime() { if (!inited) initEmphasis(); },
  };

  const system = {
    sporePts,
    shedSpores, registerDrift,
    // ---- driver seat (merge doc §3) ----
    // ONE driver at a time claims the seat with its static exit geometry and
    // gets the seat handle back; releasing (setDriver(null)) — like going
    // quiet, or silent — restores colors and sizes byte-exact. Positions are
    // never the seat's to give back. Unclaimed, the seat does nothing by
    // construction.
    driver: null,
    setDriver(d) {
      if (system.driver && system.driver !== d) releaseSeat();
      system.driver = d || null;
      if (!d) { releaseSeat(); return null; }
      // static claim: exit geometry/anchors ({ az, riseMin, riseMax, knot }
      // per exit) — the chapter's anatomy, passed as intent, never imported.
      exits = d.exits;
      return seat;
    },
  };
  return system;
}
