// journey-v6 — FINAL epilogue: THE SECTION TRAILS (§3b).
//
// Split out of terrain.js by order H05 (2026-08-21). The region below is the
// byte-identical text terrain.js carried at 6967a36a, at its original
// indentation, WITH NO EDIT AT ALL — its own `if (!baked)` guard included,
// which is why `baked` is a parameter rather than a caller-side condition.
//
// WHY THIS IS A FILE, and it is the one test that separated it from every
// other emission block in the chapter. terrain.js runs ONE shared stream —
// makeRng(41719) — through §1, §2, the aggregates, §4, §3, the section ends,
// §5, §6 and the haze tones, in that order, with four local masking streams
// interleaved among them. Every one of those blocks therefore has its
// generator's construction in one place and half its consumption in another
// the moment you move it, which is h-series-contract.md §2.2's stated
// prohibition. THIS BLOCK IS THE EXCEPTION: it constructs BOTH of its
// generators inside the moved text — makeRng(0x5EC7104E) and
// makeRng(0x9174B1) — and reads terrain.js's shared `rand`/`gauss` at NO
// point, so the extraction cannot shift the main stream by construction
// rather than by care. That is §2.2's PREFERRED form, and in this file it
// selects exactly one region.
//
// The block's own header already says the same thing in the language of the
// artwork — "A FRESH RNG, and this block runs after every existing draw into
// `hyph`, so not one shipped stroke moves" — which is the property that let
// it be authored late without re-laying the colony, and is the property that
// lets it be moved now.
//
// WHAT CROSSES THE BOUNDARY. `hyph` is the chapter's shared line batch and
// `counts` its shared tally; both are mutated in place here exactly as they
// were when this was one closure, and both reach the committed bytes
// (`final/hyph`) or the committed payload (`pitStrands`), so a binding that
// failed to arrive would be caught by the byte proof rather than passing
// silently.

import {
  CUT_N, CUT_S_MIN, CUT_S_MAX, TAU, arcOf, cutEdgePoint, gaussOf, groundY, makeRng,
} from './world.js';

/** §3b — the severed network trailing out of the cut face into the removed
 *  side. Emits into `hyph` and records `counts.pitStrands`. */
export function laySectionTrails({ baked, hyph, counts }) {
  /* ================================================================
     3b. THE SECTION TRAILS OFF INTO THE CUT (2026-08-13, Hannah): "in the
         final section, the area to the left of the text currently contains
         a large amount of empty black space and feels under-composed...
         visible mycelial/network structures... subtle organic details that
         connect back to the rest of the mushroom system."
     ================================================================
     WHERE THE EMPTINESS ACTUALLY IS, MEASURED. Unprojecting the rest frame
     at 1728x980 and reading cutVal at the ground plane under each pixel:

       screen (80,700)  -> ( -9.34, -5.46) dist 10.2  cutVal -2.62
       screen (250,760) -> ( -9.72, -3.37) dist  8.3  cutVal -2.05
       screen (420,830) -> (-10.12, -1.68) dist  6.9  cutVal -1.88
       screen (150,900) -> (-11.18, -2.32) dist  6.7  cutVal -3.08
       screen (80,460)  -> (  0.09,-19.05) dist 26.5  cutVal +2.91  KEPT

     The whole lower half of the frame is the REMOVED side. It is not an
     under-populated field — it is the excavation, and there is no ground
     there to stand anything on. d39b35b's left extension could only reach
     the kept band along the horizon (screen y < ~500), which is why the
     dead area survived it.

     SO THE THING THAT BELONGS THERE IS THE SECTION ITSELF. §3 already
     exposes the colony in the void near the face and then deliberately
     stops: "survival beyond the cut face now decays with distance (none
     past ~2.6 units)... so the removed side fades to true absence instead
     of stranding bright floaters in open black (the rest frame's
     lower-left)". That is the authored emptiness Hannah is now reporting,
     and the note names the real hazard exactly: FLOATERS. The answer is
     not to relax the decay and scatter loose strokes into the black — that
     is the countable-dash carpet the declutter round removed — it is to
     give the void strands an ANCHOR, so what fills the pit is visibly the
     severed network trailing out of the wall rather than debris hanging in
     front of it.

     Every filament here therefore STARTS ON THE CUT FACE — on the lip or
     down the section wall — and travels out into the removed side, sagging
     under its own length, dimming continuously to nothing by its tip. It
     is the same three-vocabulary the file already speaks (§2's rootlets
     leave the lip, §3's filaments travel with momentum, §4's cords are cut
     at the face and glint); this is those cut ends CONTINUING, which is
     what a section through a living network looks like when you stand
     inside the hole.

     WEIGHTED TO FRAME-LEFT, which is the LOW-s end: with the rest lens at
     (-14.72, 2.70) and the cut running s -14..+10, cutEdgePoint(-14) is
     ( -2.75, -15.81) — 22.0 units out and 12.8 to the left of the view
     axis — while cutEdgePoint(+10) is (-10.69, 6.85), 5.8 units out and
     5.4 to the RIGHT. The right end is the near corner the lip's own
     nearK taper already holds down; the left end is the far wall across
     the empty pit. Density falls off with s so the near-right corner gains
     almost nothing and the frame-left wall gains most.

     A FRESH RNG, and this block runs after every existing draw into `hyph`,
     so not one shipped stroke moves. Reveal is left at the batch default
     (-1, "always lit"), which is what every other stroke on this face
     carries: the cut face is gated by the chapter's camera-pure rise mask
     (uAmount), so it is dark at the arm, arrives with the rise, and
     retracts stroke-for-stroke on a reverse scrub — the same law, not a
     second one. Nothing here is a fruiting body, so nothing enters the
     bodies' uPull ladder or the canopy's node set. */
  if (!baked) {
    const vr = makeRng(0x5EC7104E);            // 'section'
    const vg = () => gaussOf(vr);
    const S_LO = CUT_S_MIN, S_SPAN = CUT_S_MAX - CUT_S_MIN;
    // the face's own tangent, so a strand can run ALONG the wall as
    // readily as away from it (see the CURL note below)
    const TGx = -CUT_N.z, TGz = CUT_N.x;
    /* 150 -> 80 (2026-08-14, Hannah: "the back left looks a little bit too
       crowded"). This block is the larger half of that report, and the
       failure mode is the one the header above names and then walks into.

       The header is right that a persistent curl beats per-step noise, and
       it does — each strand on its own is a smooth arc. What it does not
       account for is how many arcs the frame can hold before the arcs stop
       being the unit you read. At 150 strands x ~11.5 segments the pit
       carried 1,723 line segments in the lower-left third, and at that
       count the eye stops resolving individual strands and integrates them
       into a MAT: a field of crossing strokes with no figure, which is the
       countable-dash carpet by another route. The declutter round's lesson
       was about stroke count, and the curl fixed the character of each
       stroke without touching the count.

       80 is where the strands are still countable as strands. Compared at
       0 / 60 / 80 / 100 / 150 on the frame: the pit reads as severed
       network trailing out of the wall up to about 80, begins to hatch at
       100, and is a mat at 150.

       WHAT IS NOT CUT, and this is the load-bearing half of the fix: the
       22 second-bank colony glow pools below stay at 22. They are the
       reason this count could come down as far as it did. The pools are
       ATMOSPHERE — broad, dim, sub-lip light with no edges — so they add
       floor to the pit without adding anything to count, and they answer
       "empty black space" directly while contributing nothing to "busy".
       Cutting strokes and keeping light is the whole trade; cutting both
       would land back on the emptiness this block was built to fill. */
    /* 2026-08-14 (Hannah's fairy-ring brief): "reduce maybe 20-30% of the
       miscellaneous angular lines, PARTICULARLY IN THE VERY BOTTOM FOREGROUND
       and immediately around/behind the copy."

       The bottom foreground of this frame is this block, and the previous pass
       (60c7370) already argued its count down 150 -> 80 on a whole-frame
       judgement. What it did not do — because its own finding had not been
       written down yet — is spend the cut where the frame actually pays for
       it. Its lesson was: A RULE THAT BOUNDS THINGS ON THE GROUND SAYS NOTHING
       ABOUT WHAT THE LENS SEES, and a uniform count cut is exactly such a
       rule. Every strand costs the same one of eighty either way, but a strand
       starting six units from the lens paints something like sixteen times the
       pixels of one starting twenty-four units out, and lands them in the
       bottom of the frame at full size where nothing else is competing.

       So the mask is a function of DISTANCE TO THE REST LENS, not of index:
       near strands are mostly dropped and far ones mostly kept. That takes the
       cut out of the very bottom foreground she named, and leaves it where
       6ba7b3f put it for a reason — the far wall across the pit, which is the
       "large amount of empty black space" this block exists to answer. The two
       reports are only compatible along this axis; a uniform thin would have
       had to trade one against the other.

       Emission is gated and the vr() stream is not, so every surviving strand
       is byte-identical to the one that shipped. */
    const pitThin = makeRng(0x9174B1);
    const pitKeep = (x, z) => {
      const d = Math.hypot(x + 14.72, z - 2.70);            // dist to rest cam
      const t = Math.max(0, Math.min(1, (d - 6.5) / 14.5));
      return 0.34 + 0.62 * t * t * (3 - 2 * t);
    };
    let pitKept = 0;
    for (let i = 0; i < 80; i++) {
      // s weighted to the low (frame-left, far) end: pow > 1 crowds toward 0
      const s = S_LO + Math.pow(vr(), 1.9) * S_SPAN;
      const p = cutEdgePoint(s);
      const keep = pitThin() < pitKeep(p.x, p.z);
      if (keep) pitKept++;
      // start somewhere on the wall: at the lip, or down the section
      const y0 = groundY(p.x, p.z) - Math.pow(vr(), 1.5) * 3.4;
      // a little proud of the face, on the removed side, so the opaque
      // section sheet cannot z-fight it away
      const ox = p.x - CUT_N.x * (0.06 + vr() * 0.10);
      const oz = p.z - CUT_N.z * (0.06 + vr() * 0.10);
      /* CURL, NOT MOMENTUM+NOISE. The first cut of this block gave every
         strand the same outward bias and let noise do the bending; at four
         to seven long steps that produces a near-straight run, and 210 of
         them all leaning off the same wall read as a COMBED HATCH — the
         countable-stroke carpet the declutter round spent a pass deleting,
         reintroduced in the one place the frame has nothing else to look
         at. Two changes fix the reading and neither is a tuning nudge:
           · the heading starts on the face TANGENT, with a random sign, and
             only drifts outward — so strands run along the wall and across
             each other instead of all raking away from it;
           · turning is a PERSISTENT CURL (a signed turn rate carried for
             the strand's whole length, itself drifting) rather than
             per-step noise, so the path is a smooth arc. A hypha bends; it
             does not zigzag and it does not rule a line.
         Steps are half as long and there are twice as many of them, for the
         same reach, so the curve is actually resolved. */
      const sgn = vr() < 0.5 ? -1 : 1;
      let hx = TGx * sgn * (0.55 + vr() * 0.45) - CUT_N.x * (0.10 + vr() * 0.45);
      let hz = TGz * sgn * (0.55 + vr() * 0.45) - CUT_N.z * (0.10 + vr() * 0.45);
      let hy = -0.05 - vr() * 0.12;
      const hl = Math.hypot(hx, hy, hz) || 1;
      hx /= hl; hy /= hl; hz /= hl;
      let curl = vg() * 0.30;                    // rad per step, persistent
      const tone = 0.10 + vr() * 0.12;
      const tw = vr() * TAU;
      const arc = arcOf(ox, oz);
      const SEG = 9 + ((vr() * 6) | 0);
      const REACH = 3.0 + vr() * 2.4;
      let px = ox, py = y0, pz = oz, run = 0;
      for (let k = 0; k < SEG; k++) {
        const step = 0.16 + vr() * 0.16;
        // rotate the heading in the horizontal plane by the curl
        curl = curl * 0.90 + vg() * 0.07;
        const ca = Math.cos(curl), sa = Math.sin(curl);
        const rx = hx * ca - hz * sa, rz = hx * sa + hz * ca;
        hx = rx; hz = rz;
        hy = hy * 0.88 - 0.018 - vr() * 0.020;    // drapes as it goes
        const nl = Math.hypot(hx, hy, hz) || 1;
        const nx = px + (hx / nl) * step;
        const ny = py + (hy / nl) * step;
        const nz = pz + (hz / nl) * step;
        run += step;
        // dim continuously with how far it has left the wall, so the strand
        // dissolves into the dark instead of ending at a countable point
        const f0 = Math.max(0, 1 - run / REACH);
        const f1 = Math.max(0, 1 - (run + step) / REACH);
        if (keep) hyph.seg(px, py, pz, nx, ny, nz,
          tone * f0 * f0, tone * f1 * f1, { tw, boost: 0.22, arc });
        px = nx; py = ny; pz = nz;
      }
    }
    counts.pitStrands = pitKept;
  }
}
