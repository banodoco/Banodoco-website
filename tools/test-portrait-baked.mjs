// C04 — journey/lib/baked.js characterization: the "fake loader/clock" tests
// for the background bake fetch that portraits.js (buildPortraitField, see
// portraits.js:723-756) reads through isBaked()/geometry()/payload().
// Run with: node tools/test-portrait-baked.mjs
//
// Covers CHARACTERIZE item 2 (late load), item 3 (load failure — the two
// silent catches at baked.js:88 and :98), and item 6 (module-global
// leakage: baked.js has no factory, no instance — `manifest`/`bins` are
// bare module-top-level state, so EVERY importer of the module shares the
// exact same singleton for the life of the page; there is no "second
// instance" to leak INTO, only one shared cache every chapter reads).
//
// Each scenario gets its own loadBakedFresh(tag) — a genuinely new Node
// module instance (see test-portrait-harness.mjs's rewriteTree) — because
// baked.js's `ready` IIFE runs exactly once at import time and its result
// is cached in module-top-level `manifest`/`bins` for as long as that
// module instance lives, same as it is in the browser for the life of the
// page.
import { loadBakedFresh, bakedModuleUrl, fetchController, wait, createLedger } from './test-portrait-harness.mjs';

const L = createLedger('baked.js async characterization');

function resetFetch() {
  fetchController.mode = 'no-manifest';
  fetchController.delayMs = 0;
  fetchController.manifest = undefined;
  fetchController.bins = undefined;
}

// Successful loader scenarios cross production's strict manifest boundary.
// This is the smallest complete chapter: one packed f32 window that exactly
// occupies the eight-byte fake bin used throughout this suite.
function validChapter(id, payload = {}) {
  return {
    file: `${id}.bin`,
    sha256: '0'.repeat(64),
    keys: [{
      key: `${id}/fixture`,
      attrs: [{ name: 'position', itemSize: 1, byteOffset: 0, byteLength: 8, kind: 'f32' }],
    }],
    payload,
  };
}

/* -------------------------------------------------------------- *
 * B1 — LATE LOAD (item 2): the manifest+bin fetch is still in      *
 * flight when the caller checks isBaked() (i.e. the caller has     *
 * already fallen back to a live build); the fetch resolves LATER,  *
 * and isBaked() only flips true once `ready` actually settles.     *
 * -------------------------------------------------------------- */
{
  resetFetch();
  fetchController.mode = 'manifest-ok';
  fetchController.delayMs = 30;
  fetchController.manifest = {
    version: 1,
    chapters: { owned: validChapter('owned', { hello: 'owned' }) },
  };
  fetchController.bins = { 'static/geom/owned.bin': new ArrayBuffer(8) };
  const baked = await loadBakedFresh('b1-late-load');
  L.check('B', 'B1 isBaked() is false the instant the module loads (fetch still in flight)', baked.isBaked('owned') === false, baked.isBaked('owned'));
  await wait(5);
  L.check('B', 'B1 isBaked() is STILL false mid-flight (5ms into a 30ms fetch) — this is the "moved on" moment', baked.isBaked('owned') === false, baked.isBaked('owned'));
  await baked.ready;
  L.check('B', 'B1 isBaked() flips true only once `ready` actually settles — the late arrival', baked.isBaked('owned') === true, baked.isBaked('owned'));
  L.same('B', 'B1 payload() is readable once late — the late loader\'s result is not discarded, only late', baked.payload('owned'), { hello: 'owned' });
}

/* -------------------------------------------------------------- *
 * B2 — LOAD FAILURE, network/JSON error on the MANIFEST fetch      *
 * itself (baked.js:88's `catch { return; }`). ready resolves       *
 * (never rejects) and isBaked() stays false forever.               *
 * -------------------------------------------------------------- */
{
  resetFetch();
  fetchController.mode = 'network-error';
  const baked = await loadBakedFresh('b2-manifest-network-error');
  let rejected = false;
  await baked.ready.catch(() => { rejected = true; });
  L.check('B', 'B2 a manifest fetch that throws does NOT reject `ready` (baked.js:88 absorbs it)', rejected === false, rejected);
  L.check('B', 'B2 isBaked() stays false — every chapter falls back to a live build', baked.isBaked('owned') === false, baked.isBaked('owned'));
}

/* -------------------------------------------------------------- *
 * B2b — LOAD FAILURE, manifest fetch resolves but !res.ok           *
 * (baked.js:86's early return — a distinct code path from B2).     *
 * -------------------------------------------------------------- */
{
  resetFetch();
  fetchController.mode = 'no-manifest'; // { ok: false }
  const baked = await loadBakedFresh('b2b-manifest-not-ok');
  await baked.ready;
  L.check('B', 'B2b a !res.ok manifest response also resolves `ready` cleanly, isBaked() false', baked.isBaked('owned') === false, baked.isBaked('owned'));
}

/* -------------------------------------------------------------- *
 * B3 — LOAD FAILURE, per-chapter bin fetch: baked.js:98 absorbs a  *
 * per-chapter fetch failure silently, leaving isBaked(id) false    *
 * for just that chapter. The MANIFEST loads fine for two chapters, *
 * but only one chapter's own .bin fetch fails — isBaked() is       *
 * per-chapter, not all-or-nothing.                                 *
 * -------------------------------------------------------------- */
{
  resetFetch();
  fetchController.mode = 'manifest-ok';
  fetchController.manifest = {
    version: 1,
    chapters: {
      owned: validChapter('owned'),
      inspire: validChapter('inspire'),
    },
  };
  fetchController.bins = {
    'static/geom/owned.bin': new ArrayBuffer(8),
    'static/geom/inspire.bin': 'reject',
  };
  const baked = await loadBakedFresh('b3-per-chapter-failure');
  await baked.ready;
  L.check('B', 'B3 the sibling chapter whose .bin fetch succeeded IS baked', baked.isBaked('owned') === true, baked.isBaked('owned'));
  L.check('B', 'B3 the chapter whose .bin fetch rejected stays NOT baked, even though its manifest entry exists', baked.isBaked('inspire') === false, baked.isBaked('inspire'));
}

/* -------------------------------------------------------------- *
 * B3b — same shape, but the failing chapter's fetch resolves        *
 * !res.ok instead of rejecting (baked.js:96's early return, a       *
 * second path into the same "stays false" outcome).                *
 * -------------------------------------------------------------- */
{
  resetFetch();
  fetchController.mode = 'manifest-ok';
  fetchController.manifest = {
    version: 1,
    chapters: { owned: validChapter('owned') },
  };
  fetchController.bins = { 'static/geom/owned.bin': 'not-ok' };
  const baked = await loadBakedFresh('b3b-bin-not-ok');
  await baked.ready;
  L.check('B', 'B3b a !res.ok .bin fetch also leaves isBaked() false', baked.isBaked('owned') === false, baked.isBaked('owned'));
}

/* -------------------------------------------------------------- *
 * B4 — NEVER SETTLES: the manifest fetch hangs forever. `ready`     *
 * never resolves or rejects; isBaked() stays false indefinitely;   *
 * nothing crashes and there is no unhandled-rejection warning.      *
 * -------------------------------------------------------------- */
{
  resetFetch();
  fetchController.mode = 'hang';
  const seenRejections = [];
  const onRejection = (err) => seenRejections.push(err);
  process.on('unhandledRejection', onRejection);
  const baked = await loadBakedFresh('b4-never-settles');
  await wait(200);
  process.off('unhandledRejection', onRejection);
  L.check('B', 'B4 isBaked() stays false through a hung fetch with no diagnostic raised to the caller', baked.isBaked('owned') === false, baked.isBaked('owned'));
  L.check('B', 'B4 a hung fetch produces zero unhandled rejections (the promise just never settles)', seenRejections.length === 0, seenRejections.length);
}

/* -------------------------------------------------------------- *
 * B5 — MODULE-GLOBAL LEAKAGE (item 6), REPAIRED 2026-08-21 after    *
 * R1 review: the original B5 compared `baked` to itself             *
 * (`consumerA = baked; consumerB = baked;`) — a tautology that      *
 * could never fail. This version exercises the REAL mechanism:      *
 * `bakedModuleUrl(tag)` returns a resolved file:// URL WITHOUT       *
 * importing it, so two SEPARATE `import(url)` calls simulate two    *
 * genuinely independent production import sites (e.g. two different *
 * chapter files each writing their own                              *
 * `import { isBaked } from '../lib/baked.js'`). Node's ESM loader    *
 * caches by resolved URL, so — IF baked.js really is a bare-module   *
 * singleton — those two `import()` calls must return the IDENTICAL  *
 * namespace object, and a consumer that never itself awaits `ready`  *
 * must still observe the state a DIFFERENT consumer's await          *
 * resolved, off ONE shared fetch, not two.                           *
 * -------------------------------------------------------------- */
{
  resetFetch();
  fetchController.mode = 'manifest-ok';
  fetchController.delayMs = 15; // force a real window where B has imported but not yet awaited anything
  fetchController.manifest = {
    version: 1,
    chapters: { owned: validChapter('owned', { n: 1 }) },
  };
  fetchController.bins = { 'static/geom/owned.bin': new ArrayBuffer(8) };
  fetchController.calls = [];
  const url = bakedModuleUrl('b5-singleton-real');
  const consumerA = await import(url); // "chapter A": import { isBaked, ready } from '../lib/baked.js'
  const consumerB = await import(url); // "chapter B": a SEPARATE import statement, same resolved specifier
  L.check('B', 'B5 two independent import() calls on the SAME specifier return the IDENTICAL module namespace object (true singleton, not just equal values)',
    consumerA === consumerB, consumerA === consumerB);
  L.check('B', 'B5 before anyone awaits `ready`, both consumers agree isBaked() is false', consumerA.isBaked('owned') === false && consumerB.isBaked('owned') === false, { a: consumerA.isBaked('owned'), b: consumerB.isBaked('owned') });
  await consumerA.ready; // ONLY consumer A explicitly awaits readiness
  L.check('B', 'B5 consumer B — which never awaited `ready` itself — observes the state consumer A\'s await resolved',
    consumerB.isBaked('owned') === true, consumerB.isBaked('owned'));
  L.same('B', 'B5 consumer B reads the SAME payload consumer A\'s fetch produced (identical object, not a re-fetched copy)', consumerB.payload('owned'), { n: 1 });
  L.check('B', 'B5 only ONE manifest fetch and ONE bin fetch happened for two consumers (a shared cache, not per-caller work)',
    fetchController.calls.filter((u) => u.endsWith('manifest.json')).length === 1 && fetchController.calls.filter((u) => u.endsWith('owned.bin')).length === 1,
    fetchController.calls.slice()); // snapshot NOW — B5-neg below reuses this same shared array and would otherwise make this trace look wrong in hindsight
}

/* -------------------------------------------------------------- *
 * B5-neg — the required "prove it can fail" contrast for B5. Two    *
 * DIFFERENT bakedModuleUrl() tags produce two DIFFERENT specifiers,  *
 * hence two genuinely SEPARATE module registrations (exactly what   *
 * B1-B4 already rely on for independent state per scenario). The    *
 * module-identity check flips to false immediately. For the state-  *
 * sharing check, the meaningful contrast is NOT "does D ever become *
 * baked" (of course it does — given a working fetch config it bakes *
 * on its own, independently, which would make a naive "D stays      *
 * false" assertion pass for the WRONG reason: not because sharing   *
 * is absent, but because nothing gave D a chance to succeed). The    *
 * honest contrast is: C is given a WORKING config and succeeds, THEN *
 * the fetch config is switched to a FAILING one before D is ever     *
 * imported — if D's state were somehow inherited from C's already-   *
 * resolved success, D would read baked anyway; because the two       *
 * modules are genuinely unrelated, D fails entirely on its own.      *
 * -------------------------------------------------------------- */
{
  resetFetch();
  fetchController.mode = 'manifest-ok';
  fetchController.manifest = {
    version: 1,
    chapters: { owned: validChapter('owned', { n: 1 }) },
  };
  fetchController.bins = { 'static/geom/owned.bin': new ArrayBuffer(8) };
  const consumerC = await import(bakedModuleUrl('b5-neg-c'));
  await consumerC.ready; // C succeeds fully, on a working config, before D even exists
  L.check('B', 'B5-neg setup: consumer C (working config) really did bake', consumerC.isBaked('owned') === true, consumerC.isBaked('owned'));
  fetchController.mode = 'no-manifest'; // NOW switch to a failing config, before D is ever imported
  const consumerD = await import(bakedModuleUrl('b5-neg-d')); // deliberately a DIFFERENT tag -> different specifier
  await consumerD.ready;
  L.check('B', 'B5-neg MUTATED (two different specifiers): NOT the identical module object — invariant correctly detected as broken', consumerC !== consumerD, consumerC !== consumerD);
  L.check('B', 'B5-neg MUTATED: D does NOT inherit C\'s already-resolved success — its own (failing) fetch is all that determines its state, proving no cross-module sharing', consumerD.isBaked('owned') === false, consumerD.isBaked('owned'));
}

process.exit(L.report());
