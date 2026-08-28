/* ==================================================================== *
 * journey/boot/hero-mode.js — THE VIEWPORT MODE AND EVERYTHING KEYED BY
 * IT. Lifted out of main.js by B01; the tables below are byte-for-byte
 * the values main.js carried, with their provenance.
 *
 * WHY THIS IS ONE OWNER AND NOT THREE TABLES. `mode` was a `let` in the
 * page entry with five tables beside it — compositions, the Mission
 * truck, world anchors, the live tracker set, and a `mode-*` class on
 * <body> — each keyed by it and each written from a different place. A
 * reader asking "what changes when the viewport crosses a breakpoint?"
 * had to find five answers. There is one here.
 *
 * THE MACHINE (G3). States: the five modes — `desktop`, `deskNarrow`,
 * `compact`, `tablet`, `mobile`. `current` is the binding that encodes
 * the state and it has ONE write site, inside `adopt()`. Events:
 * `resolve()` (pure — what does this viewport measure as, right now),
 * `mount()` (publish the boot mode to <body>), `adopt(mode)` (the
 * transition: take the new mode, re-anchor the trackers, swap the
 * class). Readers: `current()`, `viewFor(mode)`, `tracks`,
 * `reframesWithinMode(mode)`.
 *
 * WHAT THIS IS NOT. It is NOT the viewport authority the replan reserves
 * `aspectProfile` in journey/frame/publication.js for. `getMode()`'s
 * <=620-portrait band is the THIRD copy of a table whose other two were
 * deduped this week (journey/layout/rail-geometry.js, journey/rail.js);
 * this order NAMED it rather than forking it, and building the real
 * authority is a design change that belongs with the frame-publication
 * work. A fourth, DIFFERENT 620 lives in journey/boot/handoff.js's
 * `departMs` — width only, no portrait test — and is not this table.
 * See OPEN-ITEMS D2.
 *
 * THE ORDER main.js CALLS THESE IN IS LOAD-BEARING, and is preserved
 * from the file this came out of: construct (resolve + build trackers)
 * -> createScene(viewFor(current), trackers) -> mount(). The <body>
 * class is published AFTER the scene is built, which is where it was.
 * ==================================================================== */

// --- responsive camera compositions, keyed by mode ---
const VIEWS = {
  // Composition restage (2026-08-19): pan the organism + its projected
  // annotations left by roughly 5-8vw, while the DOM hero copy stays put.
  // Lowering camera and target together preserves the viewing angle/scale
  // and lifts the specimen slightly in frame. Anchors remain anatomy-owned.
  desktop: { panX: -1.65, camY: 2.07, camZ: 10.4, targetY: 2.42, fov: 38 },
  compact: { panX: -1.82, camY: 2.12, camZ: 11.2, targetY: 2.52, fov: 38 },  // short landscape (phones)
  deskNarrow: { panX: -1.27, camY: 2.12, camZ: 11.6, targetY: 2.47, fov: 38 }, // landscape aspect < 1.55 (iPads)
  // Prior optical centring pass (ending at panX +0.45): the earlier
  // +0.33 landed the ensemble's geometric bounds on centre, but the bright
  // spore plume and the label column both weight the right side. Another
  // ~11px of leftward screen travel centres the visible energy of the set,
  // not merely its outer box. (2026-08-17, Hannah: "the way on mobile we hide the
  // main button and centre align the mushroom with the labels — do the same
  // on tablet"). Same pass as mobile's below: the CTA is gone (hero.css ≤900
  // portrait block), the labels ride runs (RAIL.tablet), and the pan walks
  // the specimen left until the ENSEMBLE reads centred — measured
  // at 768x1024: cap left rim 142, INSPIRE tag right 640, midpoint 391 at
  // panX 0.25; ~91.5 px/unit at this framing puts the optical centre at 0.45.
  tablet:  { panX: 1.00, camY: 2.72, camZ: 12.0, targetY: 3.82, fov: 50 },
  // Prior optical centring pass (ending at panX +0.40): the previous
  // comment described a +0.55 centring target, but the value below had only
  // moved to +0.20. Closing part of that gap shifts the unified composition
  // left by roughly the same visible amount as tablet, without making the
  // cap feel left-biased on narrow phones. (2026-08-17, Hannah: the specimen read centred but
  // specimen+labels together sat right-heavy — "they should be centred
  // together"). The pan walks the mushroom left so the ENSEMBLE's bounding
  // box centres; the labels follow because mobile now carries runs (RAIL).
  mobile:  { panX: 0.83, camY: 2.95, camZ: 11.5, targetY: 4.50, fov: 64 },
};

/* Mission composition truck, in CSS pixels rather than world units. The
   visual correction is projection-authored, while each responsive view uses a
   different distance/FOV, so viewFor() converts these values through the
   active projection. Moving panX trucks camera and target together: organism,
   particles, bloom and ground all move as one projection while DOM copy/nav
   remain fixed. Portrait keeps only a restrained nudge so the wide cap and
   stipe do not crowd the phone/tablet edge. */
const MISSION_RIGHT_PX = Object.freeze({
  desktop: 20,
  /* 45 -> 75 (2026-08-25, owner: "maybe 30px to the right" on iPad Mini horizontal).
     It is a collision, not a preference: measured at 1024x768 the cap rim cut
     through the word "art" in the headline -- clearance -23.3px, taken from the
     union of the h1's TEXT-NODE rects, because the <h1> box is the wrap column
     and measuring the box hides it. +20 still touches at -3.5px; +30 clears at
     +6.3px; +40 gives visible air. Incidentally closes most of the aspect-1.55
     mode cliff (798.1 vs 795.2px, residual 2.9px) -- the 11.4% scale jump across
     that seam survives and is a separate fix.
     deskNarrow is every landscape window under aspect 1.55, not "iPad": a laptop
     dragged narrow gets this too, and hero-mode.js already refuses device hooks
     ("Physical screen inches are not a web layout input"). */
  deskNarrow: 75,
  compact: 36,
  tablet: 26,
  /* 48 -> 63 (2026-08-27, owner: "the stalk of the mushroom [should be]
     right in the middle of the Equip button in the HERO section... The
     feng shui is important"). SUPERSEDES owner report #28's 48px, and the
     reason is a change of referent, not a change of mind: #28 asked for
     the organism 8-12% right against a hero that had NO centre line to
     align to (the navigator lived at the right edge then); the centred
     navigator gave the frame one, with Equip standing at exactly x 215 of
     430, and alignment beats the earlier balance judgement. Measured by
     column-luminance peak in the one band that isolates the stalk proper
     (y 640-680; half-max width ~6-10px — wider readings are the cap above
     or the root flare below, both of which mislead): at 48 the stalk
     centred at x 200.5, 14.5px left of Equip; at 63 it centres at 215
     (verified on the re-shot mission@430x932 golden). 63/430 = 14.7% —
     outside #28's 8-12% band, which is the visible cost of the trade. */
  mobile: 63,
});

// --- per-mode world anchors for the HUD callouts (tuned against screenshots) ---
const ANCHORS = {
  desktop: {
    // inspire raised back up the plume's sweep (2026-08-16, Hannah: the
    // leader should point "higher into the spores, like similar angle to
    // the connect one"): from here the dot sits up-RIGHT of the label's
    // top centre by roughly its drop distance, so the leader reads as one
    // 45° diagonal — CONNECT's angle, mirrored top-down.
    inspire: [3.63, 3.97, -0.50],
    equip:   [0.06, 1.60, 0.22],
    connect: [0.55, 0.04, 1.15],
  },
  compact: {
    inspire: [2.37, 3.20, -1.09], // measured in-plume, clear of the nav
    equip:   [0.05, 0.50, 0.25],
    connect: [0.50, 0.04, 1.60],
  },
  deskNarrow: {
    inspire: [3.50, 3.90, -0.47], // up the plume sweep, same reasoning as desktop
    equip:   [0.06, 1.60, 0.22],
    connect: [0.55, 0.04, 1.15],
  },
  tablet: {
    inspire: [2.52, 3.50, -0.17], // measured in-plume (tablet portrait)
    equip:   [0.06, 1.30, 0.22],
    connect: [0.30, 0.04, 1.30],
  },
  mobile: {
    // raised off the rim exit into the plume's MIDDLE (2026-08-17, Hannah:
    // the tag "should be pointing into the middle of the spores and have a
    // nice angle to it") — the label holds its slot under the side rail
    // (tuckSep in RAIL below), so the anchor alone sets the leader's angle;
    // this projection aims for ~45° at 375x812.
    inspire: [3.20, 4.45, -1.60],
    // equip 1.55 -> 1.25 (2026-08-17, Hannah: "push all the labels down a
    // little bit"): EQUIP's label sits ON its stem row (riseEquip 0), so the
    // whole balanced column is slid by sliding this anchor down the stem —
    // INSPIRE hangs tuckSep above it and CONNECT's rise (RAIL below) came
    // down in step, so the 74px beat survives the shift.
    equip:   [0.06, 1.25, 0.22],
    connect: [-0.12, 0.04, 1.15],
  },
};

// --- breakpoint detection: portrait phones/tablets get their own compositions ---
function getMode() {
  const w = innerWidth, h = innerHeight;
  const portrait = h > w;
  if (w <= 620 && portrait) return 'mobile';
  if (w <= 900 && portrait) return 'tablet';
  if (!portrait && h <= 560) return 'compact';
  if (!portrait && w / h < 1.55) return 'deskNarrow';
  return 'desktop';
}

// deskNarrow spans aspects 1.25–1.55: interpolate the framing with aspect so
// the right-side callouts keep edge clearance all the way down to 4:3 iPads
function viewFor(mode) {
  const v = { ...VIEWS[mode] };
  if (mode === 'deskNarrow') {
    const t = Math.min(1, Math.max(0, (1.55 - innerWidth / innerHeight) / 0.3));
    v.panX = -1.27 + 0.3 * t;
    v.camZ = 11.6 + 0.9 * t;
  }
  if (mode === 'mobile') {
    const t = Math.min(1, Math.max(0, (innerWidth / innerHeight - 0.44) / 0.16));
    // base 4.75 -> 4.50 (2026-08-17, Hannah's vertical rebalance: "too much
    // deadspace between the mushroom and text") — LOWERING the look-at
    // lifts the specimen on screen (measured ~55px per unit, and the sign
    // is the trap: a higher target renders the scene lower). The further
    // 0.40 drop (2026-08-27) lifts the phone specimen about 22px so its body
    // reads centrally while the stalk remains aligned with the Equip control.
    v.targetY = 3.45 + 1.2 * t;
    v.camZ = 11.5 + 1.3 * t;
  }
  /* ONE LANDSCAPE HERO BALANCE FIELD. Physical screen inches are not a web
     layout input: display scaling and window chrome give the same laptop many
     possible CSS widths. Author the requested rightward composition in screen
     space instead. It eases from the reviewed 1024px landscape pose to the
     full 75px correction at 1200px, then holds—no device rectangle, no upper
     cutoff, and no one-pixel cliff. Converting pixels through the active FOV
     keeps the visible correction stable while deskNarrow changes distance. */
  if (innerWidth > innerHeight && mode !== 'compact') {
    let mix = (innerWidth - 1024) / (1200 - 1024);
    mix = Math.max(0, Math.min(1, mix));
    mix = mix * mix * (3 - 2 * mix);
    const worldPerPixel = 2 * v.camZ * Math.tan(v.fov * Math.PI / 360) / innerHeight;
    v.panX -= 75 * mix * worldPerPixel;
  }
  /* The camera/target truck is the Mission boundary condition captured by the
     journey director. Consequently scroll and the route-faithful direct-click
     compositor depart from (and return to) this exact shifted pose, while the
     analytic Inspire arrival still lands bit-exactly on its existing rest. */
  let missionShiftPx = MISSION_RIGHT_PX[mode] || 0;
  if (mode === 'mobile') {
    /* The reviewed 63px shift aligns the stalk with Equip on tall phones
       (430x932 / 375x812). Shorter browser viewports project the fixed panX
       through a much wider world-per-pixel field, which pushed the stalk
       right of Equip at 337x601. Ease 28px out by aspect (21px measured in
       the owner capture plus the 7px residual in the exact-size re-shot) so
       tall phones keep their exact pose and short phones regain the centre. */
    const shortPhoneMix = Math.min(1, Math.max(0,
      (innerWidth / innerHeight - 0.47) / 0.09));
    missionShiftPx -= 28 * shortPhoneMix;
  }
  const missionWorldPerPixel = 2 * v.camZ * Math.tan(v.fov * Math.PI / 360)
    / innerHeight;
  v.panX -= missionShiftPx * missionWorldPerPixel;
  return v;
}

/** The three modes whose composition keeps moving WITHIN the mode.
 *  `deskNarrow` and `mobile` interpolate on aspect in viewFor() above,
 *  and `desktop` rides the landscape balance field; the other two hold a
 *  fixed pose for the whole band. This is why a resize that does NOT
 *  cross a breakpoint still re-frames for exactly these three — the
 *  magic triple that used to sit inline in main.js's resize handler. */
const REFRAMES_WITHIN_MODE = new Set(['desktop', 'deskNarrow', 'mobile']);

const MODE_CLASSES = ['mode-desktop', 'mode-tablet', 'mode-mobile',
  'mode-compact', 'mode-deskNarrow'];

export function createHeroMode() {
  let current = getMode();

  // live tracker state the scene projects to screen space every frame
  const tracks = {
    connect: { pos: ANCHORS[current].connect.slice(), el: document.getElementById('co-connect') },
    inspire: { pos: ANCHORS[current].inspire.slice(), el: document.getElementById('co-inspire') },
    // STABLE CALLOUTS (Hannah, 2026-08-05): all three are static world anchors.
    //
    // equip used to carry `sway: true`, which pinned it to swayGroup.matrixWorld
    // so it rode the breeze with the stalk — measured at 7.4-12.6 px of
    // horizontal travel, and the one callout that visibly moved. Hannah asked for
    // all three to hold still, so the flag is gone and this is now the anchor's
    // REST position, which (swayGroup being rotation-only, at the origin) is also
    // its sway pivot. The leader still lands on the stalk at every phase of the
    // breeze — the stalk's own excursion at this height is ~0.054 world units,
    // far narrower than the stalk. Full reasoning, measurements and the rejected
    // alternatives are in organism/furniture.js registerTrackers.
    equip:   { pos: ANCHORS[current].equip.slice(),   el: document.getElementById('co-equip') },
  };

  /** Publish the boot mode. Separate from construction because main.js
   *  builds the scene between the two, and the <body> class has always
   *  landed after the scene rather than before it. */
  function mount() {
    document.body.classList.add('mode-' + current);
  }

  /** THE TRANSITION, and the only write site `current` has: take the new
   *  mode, re-anchor the three trackers onto its world anchors, and swap
   *  the class. The caller eases the camera itself, before this, because
   *  the scene handle is the page's and not this module's — the order is
   *  main.js's old applyMode(), unchanged. */
  function adopt(mode) {
    current = mode;
    for (const key of ['inspire', 'equip', 'connect']) {
      const a = ANCHORS[mode][key];
      tracks[key].pos[0] = a[0];
      tracks[key].pos[1] = a[1];
      tracks[key].pos[2] = a[2];
    }
    document.body.classList.remove(...MODE_CLASSES);
    document.body.classList.add('mode-' + mode);
  }

  return {
    tracks,
    current: () => current,
    resolve: getMode,
    viewFor,
    reframesWithinMode: (mode) => REFRAMES_WITHIN_MODE.has(mode),
    mount,
    adopt,
  };
}
