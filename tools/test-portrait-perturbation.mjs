// C04 — REQUIRED perturbation proof. For every invariant characterized in
// test-portrait-dealer.mjs, test-portrait-baked.mjs, test-portrait-
// textures.mjs and test-portrait-lifecycle.mjs, this file runs the SAME
// invariant check against a GOOD input (where it holds) and a single
// deliberately MUTATED input (where it breaks), side by side, so the
// transcript shows every check is actually sensitive — a suite that cannot
// fail proves nothing. Every PASS row below means "the check correctly
// told good from bad," not "the system has no defects" — P1 and P5 are the
// two rows that prove the ALREADY-REPORTED defects (DEF-C04-01 the torn
// deal, DEF-C04-02 the post-dispose mutation) by exactly this good/bad
// contrast.
// Run with: node tools/test-portrait-perturbation.mjs
import {
  dealerModule, loadBakedFresh, textureOwnerModule, buildField, imageLoader,
  fetchController, wait, createLedger,
  buildRealField, placementOf, framedCount,
} from './test-portrait-harness.mjs';
import { readFileSync } from 'node:fs';

const L = createLedger('portrait perturbation proof');

/* ------------------------------------------------------------------ *
 * P1 — dealer atomicity: well-formed deal input never throws and      *
 * fully mutates; a single malformed entry (missing .sprite) throws    *
 * and leaves a torn field. Same seatPeople() call, one field mutated. *
 * ------------------------------------------------------------------ */
{
  const { createPortraitDealer } = dealerModule;
  function scenario(mutateIndex) {
    const nodes = Array.from({ length: 5 }, (_, i) => ({ id: `n${i}`, content: { name: `stale-${i}` } }));
    const dealer = createPortraitDealer({ nodes, contributors: [], nodeCount: 5 });
    const people = dealer.dealFor(0);
    if (mutateIndex !== null) people[mutateIndex] = { name: 'MUTATED', role: 'x', blurb: 'y' }; // .sprite dropped
    let threw = null;
    try { dealer.seatPeople(people); } catch (e) { threw = e; }
    const fullyMutated = nodes.every((n, i) => n.content.name === (mutateIndex === i ? 'MUTATED' : people[i].name));
    return { threw: threw !== null, fullyMutated };
  }
  const good = scenario(null);
  const bad = scenario(2);
  L.check('P1', 'good deal (well-formed): no throw, every node fully mutated', good.threw === false && good.fullyMutated === true, good);
  L.check('P1', 'MUTATED deal (people[2] missing .sprite): throws, field left TORN — invariant correctly detected as broken', bad.threw === true && bad.fullyMutated === false, bad);
}

/* ------------------------------------------------------------------ *
 * P2 — baked.js late load: a matching manifest version eventually      *
 * flips isBaked() true; mutating ONLY manifest.version away from       *
 * MANIFEST_VERSION (1) makes isBaked() stay false forever, even        *
 * though the exact same bytes were otherwise fetched successfully.     *
 * ------------------------------------------------------------------ */
{
  async function scenario(version, tag) {
    fetchController.mode = 'manifest-ok';
    fetchController.delayMs = 0;
    fetchController.manifest = { version, chapters: { owned: { file: 'owned.bin', sha256: 'x', keys: [], payload: {} } } };
    fetchController.bins = { 'static/geom/owned.bin': new ArrayBuffer(8) };
    const baked = await loadBakedFresh(tag);
    await baked.ready;
    return baked.isBaked('owned');
  }
  const good = await scenario(1, 'p2-good');
  const bad = await scenario(999, 'p2-mutated-version');
  L.check('P2', 'good manifest (version: 1, matches MANIFEST_VERSION): isBaked() flips true', good === true, good);
  L.check('P2', 'MUTATED manifest (version: 999): isBaked() stays false forever — invariant correctly detected as broken', bad === false, bad);
}

/* ------------------------------------------------------------------ *
 * P3 — baked.js per-chapter isolation: two chapters both succeed ->    *
 * both baked; mutating just ONE chapter's .bin fetch to reject flips   *
 * only that chapter, proving isBaked() is genuinely per-chapter and    *
 * not an all-or-nothing manifest-level flag.                           *
 * ------------------------------------------------------------------ */
{
  async function scenario(secondBinOutcome, tag) {
    fetchController.mode = 'manifest-ok';
    fetchController.manifest = {
      version: 1,
      chapters: {
        owned: { file: 'owned.bin', sha256: 'x', keys: [], payload: {} },
        inspire: { file: 'inspire.bin', sha256: 'y', keys: [], payload: {} },
      },
    };
    fetchController.bins = { 'static/geom/owned.bin': new ArrayBuffer(8), 'static/geom/inspire.bin': secondBinOutcome };
    const baked = await loadBakedFresh(tag);
    await baked.ready;
    return { owned: baked.isBaked('owned'), inspire: baked.isBaked('inspire') };
  }
  const good = await scenario(new ArrayBuffer(8), 'p3-good');
  const bad = await scenario('reject', 'p3-mutated-reject');
  L.check('P3', 'good: both chapters\' .bin fetches succeed -> both isBaked() true', good.owned === true && good.inspire === true, good);
  L.check('P3', 'MUTATED: only inspire\'s .bin fetch rejects -> owned still baked, inspire is not — invariant correctly detected as broken for exactly one chapter', bad.owned === true && bad.inspire === false, bad);
}

/* ------------------------------------------------------------------ *
 * P4 — texture disposal policy: a wired texture is protected; mutating *
 * the SAME owner's uniforms so that texture is no longer wired to      *
 * anything flips the SAME retire() call from a no-op to a real         *
 * dispose(), with nothing else about the call changed.                 *
 * ------------------------------------------------------------------ */
{
  const { createPortraitTextureOwner } = textureOwnerModule;
  function fakeTexture() {
    let n = 0;
    return { dispose() { n++; }, get disposeCalls() { return n; } };
  }
  const tex = fakeTexture();
  const uniforms = {
    uMapA: { value: tex }, uMapP: { value: null }, uMapA2: { value: null },
    uMapP2: { value: null }, uMapH: { value: null }, uMapH2: { value: null },
  };
  const owner = createPortraitTextureOwner({ uniforms, permanent: [] });
  owner.retire(tex);
  const wiredResult = tex.disposeCalls;
  L.check('P4', 'good: texture wired into uMapA -> retire() is a no-op', wiredResult === 0, wiredResult);
  uniforms.uMapA.value = null; // MUTATED: the only change — this texture is no longer wired anywhere
  owner.retire(tex);
  const unwiredResult = tex.disposeCalls;
  L.check('P4', 'MUTATED: uMapA.value set to null -> the SAME retire() call now disposes it — invariant correctly detected as broken', unwiredResult === 1, unwiredResult);
}

/* ------------------------------------------------------------------ *
 * P5 — THE HEADLINE DEFECT (DEF-C04-02), restated as an order           *
 * perturbation: identical remix()+tickSwap() sequence; the only         *
 * variable mutated is WHETHER dispose() lands before or after the       *
 * settling tickSwap() call. "No mutation happens once dispose() has     *
 * run" holds in call-order A and fails in call-order B.                 *
 * ------------------------------------------------------------------ */
{
  function scenario(disposeBeforeSettle) {
    imageLoader.mode = 'success'; imageLoader.delayMs = 0;
    const api = buildField({ contributors: undefined, nodeCount: 4 });
    const r = api.remix();
    const namesAtDispose = api.nodes.map((n) => n.content.name); // snapshot taken right after remix(), before either dispose or settle
    if (disposeBeforeSettle) {
      api.dispose();
      api.tickSwap(r.ms / 1000 + 1); // MUTATED order: settle AFTER dispose
    } else {
      api.tickSwap(r.ms / 1000 + 1); // good order: settle BEFORE dispose
      api.dispose();
    }
    const namesAfter = api.nodes.map((n) => n.content.name);
    return { api, namesAtDispose, namesAfter };
  }
  const good = scenario(false);
  L.check('P5', 'good order (settle, THEN dispose): the promotion happened, as expected, before dispose ran',
    JSON.stringify(good.namesAtDispose) !== JSON.stringify(good.namesAfter), { before: good.namesAtDispose, after: good.namesAfter });
  const goodAfterSecondDispose = (good.api.dispose(), good.api.nodes.map((n) => n.content.name));
  L.check('P5', 'good order: an extra (idempotent) dispose() call afterward changes nothing further',
    JSON.stringify(good.namesAfter) === JSON.stringify(goodAfterSecondDispose), goodAfterSecondDispose);

  const bad = scenario(true);
  L.check('P5', 'MUTATED order (dispose, THEN a late tickSwap): node.content changed AFTER dispose() had already run — invariant correctly detected as broken (DEF-C04-02)',
    JSON.stringify(bad.namesAtDispose) !== JSON.stringify(bad.namesAfter), { atDisposeTime: bad.namesAtDispose, afterLateTick: bad.namesAfter });
  L.check('P5', 'MUTATED order: swap fully promoted (swapping=false) despite the instance having been disposed first', bad.api.swapping === false, bad.api.swapping);
}

/* ==================================================================== *
 * P6 — VIEWPORT-01: THE COMPOSITION A RESIZE LEAVES BEHIND.             *
 *                                                                      *
 * THE DEFECT, as the site owner reported it: "when I resize the screen, *
 * the number of items that shows in the ownership section doesn't       *
 * update appropriately." The Owned chapter's authored composition — the *
 * sixteen portrait sites and the five batched geometries placed from    *
 * them — was chosen once at build and never re-asked, while the camera  *
 * re-poses every frame through portrait.js. A page that crossed the     *
 * portrait band was therefore showing the LANDSCAPE arc through the     *
 * PORTRAIT lens. The fix (journey/chapters/owned/index.js:477 and       *
 * portraits.js recompose()) registers the chapter as a consumer of the  *
 * rail dock's viewport snapshot and RE-ASKS leg.fieldFor() for the      *
 * placement rather than patching the old one.                           *
 *                                                                      *
 * THE PERTURBATION IS THE DEFECT ITSELF, not a stand-in. Both arms are  *
 * one field built at 1440x900 and then judged at the far size. The good *
 * arm calls recompose(); the bad arm does not, which is bit-for-bit     *
 * what this file did before 2026-08-25. So every BAD row below is a     *
 * transcript of the shipped defect, and every GOOD row is the fix       *
 * measured against the only reference that settles the question — a     *
 * field FRESHLY BUILT at that size, which is what the owner compared    *
 * against when they reloaded and saw sixteen.                           *
 *                                                                      *
 * The reference oracle is fresh-build equality, deliberately, and not a *
 * hardcoded count: a count could be satisfied by a wrong composition    *
 * that happens to frame sixteen things, and could not survive any       *
 * authored change to REST_SITES. Fresh-build equality cannot be         *
 * re-blessed into truth — to make it pass falsely you would have to     *
 * break the fresh build the same way.                                   *
 *                                                                      *
 * This is the ONLY suite in the C04 family that uses the real leg and   *
 * the real substrate; see buildRealField() in the harness for why the   *
 * fake fixtures are structurally blind to this class.                   *
 * ==================================================================== */
{
  const LANDSCAPE = { width: 1440, height: 900 };   // 1.6000 — landscape band
  const PHONE = { width: 430, height: 932 };        // 0.4614 — portrait band
  const TABLET = { width: 700, height: 900 };       // 0.7778 — portrait band, other aspect
  const aspectOf = (s) => s.width / s.height;
  /* The ledger prints `value` with String(); these rows' values are objects,
     so they are serialised here rather than printed as [object Object]. */
  const p6 = (name, pass, detail) => L.check('P6', name, pass, JSON.stringify(detail));

  const freshPhone = await buildRealField(PHONE);
  const freshTablet = await buildRealField(TABLET);
  const freshLandscape = await buildRealField(LANDSCAPE);

  // ONE field, built landscape, dragged across the band. Both arms read it:
  // `stale` is snapshotted before recompose() is allowed to run.
  const crossed = await buildRealField(LANDSCAPE);
  const staleAt = {
    placement: placementOf(crossed),
    phoneFramed: framedCount(crossed, aspectOf(PHONE)),
    tabletFramed: framedCount(crossed, aspectOf(TABLET)),
  };
  const maxNodeDelta = (a, b) => a.reduce((m, p, i) =>
    Math.max(m, Math.hypot(p[0] - b[i][0], p[1] - b[i][1], p[2] - b[i][2])), 0);

  /* P6a — THE BAND CROSSING, 1.6000 -> 0.4614. */
  p6('MUTATED (no recompose — the shipped defect): a landscape-built field judged through the '
    + '430x932 lens frames only a fraction of its sixteen faces',
    staleAt.phoneFramed === 4,
    { framed: staleAt.phoneFramed, of: crossed.api.nodes.length, freshLoadFrames: framedCount(freshPhone, aspectOf(PHONE)) });
  p6('MUTATED (no recompose): that stale composition is NOT the one a fresh 430x932 load builds',
    maxNodeDelta(staleAt.placement, placementOf(freshPhone)) > 1,
    { maxNodeDeltaWorldUnits: +maxNodeDelta(staleAt.placement, placementOf(freshPhone)).toFixed(4) });

  // three.js fires 'dispose' on a BufferGeometry when dispose() is called on
  // it, so the release recompose() performs at its own leaf is observable
  // without reaching into the renderer.
  const strandsAtBuild = crossed.api.geometries.strands;
  let outgoingDisposed = 0;
  strandsAtBuild.addEventListener('dispose', () => { outgoingDisposed++; });

  const movedToPhone = crossed.api.recompose(aspectOf(PHONE));
  p6('good: recompose(0.4614) reports that the field moved', movedToPhone === true, movedToPhone);
  p6('good: the recomposed field is BIT-IDENTICAL to a fresh 430x932 load — re-asked, not patched',
    JSON.stringify(placementOf(crossed)) === JSON.stringify(placementOf(freshPhone)),
    { maxNodeDeltaWorldUnits: maxNodeDelta(placementOf(crossed), placementOf(freshPhone)) });
  p6('good: all sixteen faces now land inside the 430x932 frame, as on a fresh load',
    framedCount(crossed, aspectOf(PHONE)) === crossed.api.nodes.length,
    { framed: framedCount(crossed, aspectOf(PHONE)), of: crossed.api.nodes.length });

  /* P6b — THE FIVE BATCHED GEOMETRIES FOLLOWED. The sixteen sites are only
     the input; what the visitor sees is these buffers. Four are rewritten in
     place and the strand geometry is rebuilt, so all five are compared,
     attribute by attribute, against the fresh build's. aAnonF is excluded by
     name: it carries consent enforcement, which is identity and not
     composition, and recompose() documents that it must not be touched. */
  const IGNORED_ATTRS = new Set(['aAnonF']);
  const layerRows = [];
  for (const layer of ['planes', 'rim', 'cores', 'halos', 'strands']) {
    const got = crossed.api.geometries[layer], want = freshPhone.api.geometries[layer];
    const names = Object.keys(want.attributes).filter((k) => !IGNORED_ATTRS.has(k));
    let worst = 0, worstName = null, countMismatch = null;
    for (const name of names) {
      const a = got.attributes[name], b = want.attributes[name];
      if (!a || a.array.length !== b.array.length) { countMismatch = name; continue; }
      for (let i = 0; i < b.array.length; i++) {
        const d = Math.abs(a.array[i] - b.array[i]);
        if (d > worst) { worst = d; worstName = name; }
      }
    }
    layerRows.push({ layer, worst, worstName, countMismatch, attrs: names.length });
  }
  p6('good: every attribute of all five batched geometries matches the fresh build exactly '
    + '(planes, rim, cores, halos, strands) — the buffers followed the sites',
    layerRows.every((r) => r.countMismatch === null && r.worst === 0), layerRows);
  p6('good: the strand geometry was RE-SEATED and the outgoing one released — the strands are the one '
    + 'length placement can change, so they are the one buffer this fix allocates and frees',
    crossed.api.geometries.strands !== strandsAtBuild && outgoingDisposed === 1
      && crossed.api.counts.strandVerts === crossed.api.geometries.strands.attributes.position.count,
    { reseated: crossed.api.geometries.strands !== strandsAtBuild, outgoingDisposeCalls: outgoingDisposed,
      strandVerts: crossed.api.counts.strandVerts, fresh: freshPhone.api.counts.strandVerts });

  /* P6c — INSIDE the portrait band, 0.4614 -> 0.7778. Both are portrait, so a
     fix that keyed only on the BAND predicate would answer "already right"
     here and leave a tablet showing the phone's arc. recompose() keys on the
     composed ASPECT as well, and this is the row that says so. */
  p6('MUTATED (no recompose): a landscape-built field judged through the 700x900 lens is '
    + 'wrong there too, and differently — the fault is not phone-specific',
    staleAt.tabletFramed === 7,
    { framed: staleAt.tabletFramed, of: crossed.api.nodes.length, freshLoadFrames: framedCount(freshTablet, aspectOf(TABLET)) });
  const movedInBand = crossed.api.recompose(aspectOf(TABLET));
  p6('good: a PORTRAIT-to-PORTRAIT crossing (0.4614 -> 0.7778) still re-places — the band '
    + 'predicate alone would have answered "already right"',
    movedInBand === true && crossed.api.portraitField === true, { movedInBand, portraitField: crossed.api.portraitField });
  p6('good: and lands bit-identical to a fresh 700x900 load',
    JSON.stringify(placementOf(crossed)) === JSON.stringify(placementOf(freshTablet)),
    { maxNodeDeltaWorldUnits: maxNodeDelta(placementOf(crossed), placementOf(freshTablet)) });

  /* P6d — "ALREADY RIGHT" REALLY MEANS ALREADY RIGHT. The animator asks on
     every settled resize with no predicate of its own, so `false` has to be
     load-bearing: it must mean the answer did not change, never "this call
     does nothing". The good/bad pair is the same call at two aspects. */
  const beforeIdempotent = placementOf(crossed);
  const askedAgain = crossed.api.recompose(aspectOf(TABLET));
  p6('good: asking again for the aspect already composed returns false and moves nothing',
    askedAgain === false && JSON.stringify(placementOf(crossed)) === JSON.stringify(beforeIdempotent), askedAgain);
  const askedDifferent = crossed.api.recompose(aspectOf(LANDSCAPE));
  p6('MUTATED (the same call, one aspect over): returns true and DOES move — so the false '
    + 'above is a real answer about the aspect, not an inert code path',
    askedDifferent === true && JSON.stringify(placementOf(crossed)) !== JSON.stringify(beforeIdempotent), askedDifferent);

  /* P6e — THE ROUND TRIP. A visitor who drags back to where they started must
     get the composition they booted with. This is what distinguishes re-asking
     from patching: a patch accumulates, an answer does not. */
  p6('good: dragged landscape -> phone -> tablet -> landscape, the field is bit-identical to '
    + 'the one it was BUILT as — the placement is re-asked, never patched',
    JSON.stringify(placementOf(crossed)) === JSON.stringify(placementOf(freshLandscape)),
    { maxNodeDeltaWorldUnits: maxNodeDelta(placementOf(crossed), placementOf(freshLandscape)) });

  /* P6f — THE PLACEMENT-DERIVED NUMBERS HANDED OUT ELSEWHERE. `swapMaxR` is
     the world radius the colony wave crosses; it is measured from the field,
     so a build-time capture would send the wave across a field that no longer
     exists. portrait-remix.js takes it as a GETTER for exactly this reason,
     and remix()'s returned `maxR` is where that lands. */
  const radiusOf = (built) => {
    const c = built.leg.CROWN;
    return Math.max(...built.api.nodes.map((n) => n.pos.distanceTo(c)));
  };
  const builtRadius = radiusOf(freshLandscape);
  crossed.api.recompose(aspectOf(PHONE));
  const nowRadius = radiusOf(crossed);
  p6('MUTATED (a build-time capture of swapMaxR): the landscape radius is NOT the phone '
    + 'field\'s, so a captured number would drive the colony wave across the wrong field',
    Math.abs(builtRadius - nowRadius) > 0.1, { built: +builtRadius.toFixed(4), afterCrossing: +nowRadius.toFixed(4) });
  const swap = crossed.api.remix();   // ONE call: a second would find a swap in flight and answer null
  p6('good: remix() reports the RE-MEASURED radius after the crossing (swapMaxR is a getter)',
    swap !== null && Math.abs(swap.maxR - nowRadius) < 1e-9,
    { reported: swap && swap.maxR, measured: nowRadius });

  /* P6g — `?aspect=` STILL WINS. capture.py and every golden are pinned to an
     aspect override, and a window sized under one must not re-compose out of
     it. The override lives inside leg.fieldFor() and cannot be exercised from
     Node (flags.js reads a URL), so this is a SOURCE-SHAPE pin, and it is
     labelled as the weaker thing it is. */
  const legSrc = readFileSync(new URL('../journey/chapters/owned/leg.js', import.meta.url), 'utf8');
  p6('good (source shape, not executed): leg.fieldFor() still lets ?aspect= override the live '
    + 'viewport, which is what keeps capture.py and the ten goldens pinned',
    /function fieldFor\(aspect\) \{\s*\n\s*const a = ASPECT \?\? aspect;/.test(legSrc),
    legSrc.includes('const a = ASPECT ?? aspect;'));
}

await wait(1); // let any straggler timers from the scenarios above settle before exit
process.exit(L.report());
