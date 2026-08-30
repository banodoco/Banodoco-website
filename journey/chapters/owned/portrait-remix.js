// journey-v6 — OWNED portrait field: the arrangement / texture lifecycle.
//
// A01a-2 (2026-08-21) lifted this out of journey/chapters/owned/portraits.js,
// where it was one of four responsibility clusters sharing a single closure.
// Its six direct mutators of `variant` / `pending` / `prepareTimer` / `swap`
// were spread across 275 lines of that file with sixteen members of unrelated
// clusters interleaved between them; here they are the module's whole surface.
// See docs/code-health/evidence/2026-08-21-elegance-run-01/a01/decision.md.
//
// THIS IS A MOVE. Every line below is the pre-move text of portraits.js at
// 04921ba4f565ccf993eaf8322581a57763c06619667d69aaa8c284f8c425c452, with the
// closure's implicit reads turned into explicit constructor arguments
// (`portraitMat.uniforms` -> `uniforms`, `NODE_COUNT/COLS/CELL` ->
// `nodeCount/cols/cell`) and the four api members turned into function
// declarations. No guard was added, none was removed, and no ordering changed.
//
// DELIBERATELY NOT FIXED — DEF-C04-02, carried across unchanged.
// Four of the six mutators guard `disposed`; `promoteSwap` and `tickSwap` do
// not, so a tickSwap() arriving after dispose() still promotes a swap and
// still reseats sixteen contributor rows. tools/test-portrait-perturbation.mjs
// P5 pins that exact behaviour and tools/test-portrait-remix.mjs re-pins it
// from this side of the seam. Guarding tickSwap would cover both holes and
// would strictly reduce post-dispose work — but it is a behaviour change, and
// this order is an extraction. It belongs to a teardown order with its own
// proof budget, together with update()'s identical hole in portraits.js.
//
// DELIBERATELY NOT FIXED — DEF-A01-03, the chapter's largest open lifecycle
// hole. dispose() below frees textures and nothing else. Five BufferGeometry
// and five ShaderMaterial objects are freed nowhere under
// journey/chapters/owned/, and `group` is never removed from the scene: a
// disposal sweep of that directory finds exactly three executable call sites
// and every one of them releases a texture. a01/decision.md Q4 refuses to let
// this order define teardown against that shape, and that refusal is inherited
// here — the texture owner's own seal is deliberately left uncalled, because
// calling it would silence the retire() calls that today's unguarded
// post-dispose path still makes, which is an observable behaviour change.
import { makePortraitAtlas } from './portrait-atlas.js';
import { loadPortraitSprite } from './portrait-photo-loader.js';
import { HOVER_GRADE, drawPhotoCell, drawBust } from './portrait-paint.js';

/** The bust-seed law, as a pure function of (nodes, arrangement).
 *
 *  It moved out of the factory closure so that portraits.js's build-time bake
 *  of arrangement 0 is an explicit import rather than a call to a function
 *  declared 800 lines further down and reachable only through hoisting.
 *
 *  DEF-A01-01 stands, unfixed and now one import edge more visible: this law
 *  is written a second time in portrait-deal.js:61 (`photoSpecs`'s
 *  `bustSeed`), identical in form and differing only in identifier names,
 *  with nothing pinning the two together. tools/test-portrait-remix.mjs pins
 *  this copy against pre-move literals; the equality of the two copies is
 *  still unpinned, and is a01/decision.md Q2's open question. */
export function bustSeedsFor(nodes, v) {
  return nodes.map((nd, i) => (nd.content.seed ?? i + 1) * 131 + i * 7 + v * 9973);
}

/** The arrangement/texture lifecycle for one portrait field.
 *
 *  Owns `variant`, `pending`, `prepareTimer`, `swap`, `photoSet`,
 *  `photosAvailable` and `disposed` — seven bindings that intersect nothing
 *  the rest of portraits.js holds (a01/decision.md §2, Seam 2). It writes nine
 *  uniform keys (uMapA/uMapP/uMapH/uMapA2/uMapP2/uMapH2/uSwap/uSwapSpan/
 *  uSwapFlare) and the frame updater writes sixteen others; the two sets do
 *  not overlap.
 *
 *  ONE MUTATION REACHES PAST THE FIELD, and it is inherited rather than
 *  introduced: `dealer.seatPeople()` writes `name`/`role`/`blurb` onto the
 *  id-matched row of the `contributors` array that buildPortraitField's own
 *  caller owns (portrait-deal.js:31–36), as well as onto `nodes[i].content`.
 *  So this module writes through to an object two levels up the call chain.
 *  Disjointness survives it — everything else reads only `.length`, `.id` and
 *  position — but it is stated here rather than discovered.
 *
 *  `atlasA` and `atlasB` are the build-time atlases: passed in because
 *  dispose() frees them and bakeBusts(0) returns atlasA rather than re-baking
 *  it. `swapEpicentre`/`swapMaxR` are placement-derived and pass straight
 *  through remix()'s return value.
 *
 *  `swapMaxR` IS A GETTER, not a number (2026-08-25). It is the world radius
 *  of the field measured from the crown, and the field can be re-placed under
 *  this module while the page is open — a viewport that crosses the portrait
 *  band re-composes the sixteen sites (portraits.js recompose()). A number
 *  captured at build would send the colony wave across the radius of a field
 *  that no longer exists. `nodes` was already read live for exactly this
 *  reason; this closes the one placement-derived value that was not. */
export function createPortraitRemix({
  uniforms, nodes, atlasA, atlasB, textureOwner, dealer,
  nodeCount, cols, cell, photosEnabled, swapEpicentre, swapMaxR,
}) {
  const { dealFor, seatPeople } = dealer;

  /* ---------------- photo pipeline (async; never blocks boot) -------------
     REAL CONTRIBUTORS since 2026-08-16. This used to load assets/test-portraits
     — randomuser.me/pravatar stock faces, marked LOOK-DEV ONLY and barred from
     shipping. It now loads each contributor's OWN avatar, as published by
     Banodoco on its own front page; see assets/contributor-portraits/
     manifest.js for provenance.

     ONE PORTRAIT PER PERSON, BY IDENTITY. The old loader fetched a POOL of 26
     images and dealt them to nodes by a stride permutation, because with
     anonymous placeholder rows it did not matter which face landed where. It
     matters completely now: the popover beside a face prints that node's
     `content.name`, so a mis-dealt image captions a real person with someone
     else's name. Each node therefore loads the file named by its own row's
     `avatar` field and no other, and the deal is gone rather than reseeded.

     A MISSING FILE IS SURVIVABLE, per node. One failed image no longer rejects
     the whole set (the old Promise.all did, dropping the entire field back to
     procedural over a single 404) — that node keeps its procedural bust and the
     other fifteen still show. Only a wholesale failure leaves the field as it
     was, which is the same graceful outcome as before. */
  /* ---------------- ARRANGEMENTS: what a remix actually re-deals ----------
     REMIX (Hannah, 2026-08-07) — see 20-owned-root-network.md.

     THE PORTRAIT-SET SITUATION, stated where the code lives — and resolved
     2026-08-16. This block used to record a constraint: the repo's only image
     set was 26 stock faces barred from shipping, so a remix could re-light the
     field but never honestly re-cast it. That is over. The set is now
     Banodoco's own published avatar sheet and the pool is 120 real people
     (content/contributors.js), so a re-deal genuinely changes WHO is in the
     field — sixteen out of 120, which is what the mechanism was always built
     general for.

     The prediction in the retired note was right about the shape and wrong
     about the seam: it expected a second manifest to be swapped in behind
     `variantSpecs`. What actually changed is that the arrangement index now
     selects PEOPLE as well as treatment, because identity turned out to be
     the thing that has to move — and the thing that has to move atomically
     with the name beside it.

     Arrangement 0 is byte-identical to what shipped before this feature (the
     stride/offset pair at v=0 is the old `i * 7 + 3`, and every other term
     reduces to its old form), so nothing about the resting composition, the
     goldens or the look-dev calibration moves.

     Strides are all coprime with the 20-image small pool, so each is a
     different permutation rather than a rotation of the last. */
  let photosAvailable = false;
  let photoSet = null;        // { images, wanted } once loaded

  function photoSpecs(v, grade) {
    return dealer.photoSpecs(v, photoSet.sheet, grade);
  }
  function bakeBusts(v) {
    return v === 0 ? atlasA : makePortraitAtlas(nodeCount, cols, cell, drawBust, bustSeedsFor(nodes, v));
  }
  function bakePhotos(v) {
    return photoSet ? makePortraitAtlas(nodeCount, cols, cell, drawPhotoCell, photoSpecs(v)) : null;
  }
  /** The same sixteen tiles, graded gently — what a hovered face crossfades
   *  to. Baked wherever bakePhotos is, so the pair can never disagree about
   *  who is in the field.
   *
   *  Baked at DOUBLE the cell resolution, deliberately. Measured 2026-08-18
   *  (blur probe, dpr 2): a hovered near face renders its disc at ~440 device
   *  px, and the 256-cell's 190px disc — itself a bilinear blow-up of the
   *  96px source tile — was being magnified a second time by the GPU. Two
   *  stacked bilinear upscales is exactly the mush Hannah kept calling
   *  blurred. One high-quality 96 -> 380 resample at bake (see makeAtlas's
   *  imageSmoothingQuality) plus a ~1.16x GPU step is the sharpest chain the
   *  96px source can support. Costs ~4x the bake pixels and ~17MB of GPU
   *  memory for the pair — paid only in photo mode, only for the two hover
   *  atlases; the resting atlases and the goldens' bust path are untouched. */
  const HOVER_CELL = cell * 2;
  function bakePhotosHover(v) {
    if (!photoSet) return null;
    const tex = makePortraitAtlas(nodeCount, cols, HOVER_CELL, drawPhotoCell, photoSpecs(v, HOVER_GRADE));
    // The hovered plane tilts and breathes fractionally off-axis; anisotropic
    // sampling keeps the magnified face from smearing on that slight skew.
    // Hover atlases only — the resting atlas feeds the goldens untouched.
    tex.anisotropy = 8;
    return tex;
  }

  let disposed = false;
  const photosReady = (photosEnabled ? loadPortraitSprite() : Promise.resolve(null)).then((photos) => {
    if (!photos) return false;
    if (disposed) return false;
    photoSet = photos;
    // The nearest-node/large-source ranking retired with the mixed-resolution
    // stock pool: every tile in the published sheet is the same 96px, so there
    // is no sharper variant to reserve for the faces closest to camera.
    //
    // Seat arrangement 0's people at the same moment its atlas becomes the
    // resting one. Until this line the rows still carry their opening
    // occupants from content.js, which is the correct thing to show while the
    // sheet is in flight.
    seatPeople(dealFor(0));
    uniforms.uMapP.value = bakePhotos(0);
    uniforms.uMapH.value = bakePhotosHover(0);
    photosAvailable = true;
    return true;
  }).catch((e) => {
    console.warn('[owned] test photos unavailable — staying procedural:', e.message);
    return false;
  });

  /* ---------------- the remix swap ----------------
     One clock (uSwap 0 -> 1) opened at a different moment per node by aSwapD.
     While it runs, uMap*2 hold the incoming arrangement; when it lands, the
     incoming becomes current, uSwap drops back to 0 and the retired atlases
     are released. Nothing here touches placement, size, strands or camera —
     the field is exactly the field it was, wearing different faces. */
  const SWAP_MS = 1250;
  const SWAP_MS_REDUCED = 320;
  const SWAP_SPAN = 0.34;          // each node's own crossfade, as a fraction
  const reduceMotion = typeof matchMedia === 'function'
    ? matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };
  let variant = 0;
  let pending = null;              // { v, bust, photo } — warmed ahead of the press
  let prepareTimer = null;
  let swap = null;                 // { t, dur }

  /** Bake the arrangement after the current one. Called on an idle beat after
   *  the photos land and again after every completed swap, so a press is never
   *  waiting on two canvas atlases; called inline from remix() only if the
   *  visitor got there first. */
  function prepareNext() {
    if (disposed) return;
    const v = variant + 1;
    if (pending && pending.v === v && (!photoSet || pending.photo)) return;
    if (pending) { retire(pending.bust); retire(pending.photo); retire(pending.photoHover); }
    pending = { v, bust: bakeBusts(v), photo: bakePhotos(v), photoHover: bakePhotosHover(v) };
  }
  function schedulePrepare() {
    if (disposed || prepareTimer) return;
    const run = () => { prepareTimer = null; prepareNext(); };
    prepareTimer = typeof requestIdleCallback === 'function'
      ? requestIdleCallback(run, { timeout: 1500 })
      : setTimeout(run, 400);
  }

  /** Release a canvas texture, unless it is still wired to something. The two
   *  build-time atlases are never released: atlasA is arrangement 0's busts and
   *  is also uMapP's stand-in until the photos land, and atlasB is the
   *  anonymous glyph sheet, which a remix has no business touching. */
  function retire(tex) {
    textureOwner.retire(tex);
  }

  /** The incoming arrangement becomes the resting one. */
  function promoteSwap() {
    const u = uniforms;
    // NAMES CHANGE HERE, not when the incoming atlas was baked. prepareNext()
    // bakes the next arrangement minutes ahead, while the visitor is still
    // looking at the current one — reseating on bake would rename sixteen
    // people under faces that have not turned over yet, and a popover opened
    // in that window would caption the wrong person. The swap wave is the
    // moment the field genuinely becomes the new cast, so it is the moment the
    // rows do too.
    seatPeople(dealFor(variant));
    const oldBust = u.uMapA.value, oldPhoto = u.uMapP.value, oldHover = u.uMapH.value;
    u.uMapA.value = u.uMapA2.value;
    u.uMapP.value = u.uMapP2.value;
    u.uMapH.value = u.uMapH2.value;
    u.uSwap.value = 0;
    u.uSwapFlare.value = 0;    // back to an exactly-unlit resting field
    swap = null;
    if (oldBust !== u.uMapA.value) retire(oldBust);
    if (oldPhoto !== u.uMapP.value) retire(oldPhoto);
    if (oldHover !== u.uMapH.value) retire(oldHover);
    schedulePrepare();
  }

  /** Build and submit the first remix set while startup is still on the
   *  empty scene. This used to arm on the visitor's first input, which put
   *  two large Canvas2D atlas bakes back into visible motion. */
  function prepareRemix(renderer) {
    if (disposed) return;
    prepareNext();
    if (renderer && renderer.initTexture && pending) {
      /* Keep the 4096×1024 hover atlas lazy. Chromium's software WebGL path
         can block indefinitely inside initTexture() for that one upload,
         preventing journey.ready from ever publishing. The two resting
         atlases are the visible remix path we need to warm at startup; the
         hover-only texture is first sampled by an explicit pointer action. */
      for (const tex of [pending.bust, pending.photo]) {
        if (tex) renderer.initTexture(tex);
      }
    }
  }

  /** REMIX: re-deal the field's faces (Hannah, 2026-08-07).
   *
   *  Returns the shape the caller needs to answer in the scene and in the
   *  DOM — { arrangement, ms, epicentre, maxR, speed } — or null if a swap
   *  is already running. `speed` is the world-units/sec a wave must travel
   *  to keep pace with the node order, so the strand/rim/halo response the
   *  chapter fires arrives at each face as that face turns over.
   *
   *  Under prefers-reduced-motion the span opens to 1: every node's window
   *  is the whole clock, so the field cross-fades as one over a third of a
   *  second, with the per-node ember flare off. Same start state, same end
   *  state, no travelling motion. */
  function remix() {
    if (disposed || swap) return null;
    const reduced = !!reduceMotion.matches;
    if (!pending || pending.v !== variant + 1 || (photoSet && !(pending.photo && pending.photoHover))) {
      if (prepareTimer) {
        if (typeof cancelIdleCallback === 'function') cancelIdleCallback(prepareTimer);
        else clearTimeout(prepareTimer);
        prepareTimer = null;
      }
      prepareNext();
    }
    const u = uniforms;
    u.uMapA2.value = pending.bust;
    // With no photo set the material's two channels are the same sheet, the
    // way they are at boot before the photos land — so a procedural-only
    // build still genuinely remixes (different busts) instead of no-oping.
    u.uMapP2.value = pending.photo || pending.bust;
    u.uMapH2.value = pending.photoHover || pending.bust;
    u.uSwapSpan.value = reduced ? 1 : SWAP_SPAN;
    u.uSwapFlare.value = reduced ? 0 : 1;
    u.uSwap.value = 0;
    variant = pending.v;
    pending = null;
    const dur = (reduced ? SWAP_MS_REDUCED : SWAP_MS) / 1000;
    swap = { t: 0, dur };
    return {
      arrangement: variant,
      ms: Math.round(dur * 1000),
      epicentre: swapEpicentre.clone(),
      maxR: swapMaxR(),
      // the wave has to cross the field in the stretch of the clock the node
      // order actually occupies (1 - span), or it outruns its own faces
      speed: swapMaxR() / Math.max(0.12, dur * (reduced ? 1 : 1 - SWAP_SPAN)),
    };
  }

  /** Advance the swap clock. Deliberately NOT inside update(): the chapter
   *  stops calling update the moment the group goes invisible, and a visitor
   *  who presses Remix and immediately scrolls out would otherwise come back
   *  to a field frozen half-way between two arrangements. Called from the
   *  chapter animator ahead of its own visibility gate. */
  function tickSwap(dt) {
    if (!swap) return;
    swap.t += dt;
    const f = swap.t / swap.dur;
    uniforms.uSwap.value = f < 1 ? f : 1;
    if (f >= 1) promoteSwap();
  }

  /** Idempotent texture/async teardown for a chapter owner that retires. */
  function dispose() {
    if (disposed) return;
    disposed = true;
    photosAvailable = false;
    if (prepareTimer) {
      if (typeof cancelIdleCallback === 'function') cancelIdleCallback(prepareTimer);
      else clearTimeout(prepareTimer);
      prepareTimer = null;
    }
    const u = uniforms;
    const textures = new Set([
      atlasA, atlasB,
      u.uMapA.value, u.uMapP.value, u.uMapA2.value,
      u.uMapP2.value, u.uMapH.value, u.uMapH2.value,
      pending && pending.bust, pending && pending.photo,
      pending && pending.photoHover,
    ]);
    pending = null;
    for (const texture of textures) if (texture && typeof texture.dispose === 'function') texture.dispose();
  }

  return {
    photosReady,
    prepareRemix,
    get photosAvailable() { return photosAvailable; },
    dispose,
    remix,
    tickSwap,
    get swapping() { return !!swap; },
    get arrangement() { return variant; },
  };
}
