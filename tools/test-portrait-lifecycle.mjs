// C04 — journey/chapters/owned/portraits.js dispose/async/cancellation
// characterization, run against the REAL buildPortraitField() factory (not
// a fake): test-portrait-harness.mjs rewrites the module's import
// specifiers to real absolute paths (three -> vendor, everything else ->
// its real repo location) and fakes only the browser surface (canvas 2D
// context, Image, matchMedia, requestIdleCallback) that portraits.js would
// otherwise need a real page for. Placement math itself is out of scope —
// the fake `leg`/`substrate` fixtures just keep the real placement code
// running to completion without NaNs; every dispose/async/swap code path
// below is the production implementation, unmodified.
// Run with: node tools/test-portrait-lifecycle.mjs
//
// Covers CHARACTERIZE items 2 (late load), 3 (load failure), 4
// (cancellation), 5 (disposal — including the one genuine defect found
// here), and 6 (two instances / leakage).
//
// DEF-C04-02 (NEW, reported here — not fixed): tickSwap() has no `disposed`
// guard, unlike every sibling mutator (prepareNext, schedulePrepare, remix,
// dispose itself all check `if (disposed) return`). The chapter's own
// animator registration (journey/chapters/owned/index.js:472,
// `sceneApi.addAnimator('journey-owned', ...)`) is never torn down on
// dispose either — the returned unsubscribe closure from addAnimator
// (organism/animation.js:8-11) is discarded, and dispose() (index.js:713)
// only calls portraits.dispose(), never animators.delete('journey-owned').
// So in the real app, once a chapter is disposed while a remix swap is
// in-flight, the SAME 'journey-owned' animator keeps calling
// portraits.tickSwap(dt) every frame forever, and when the in-flight swap's
// clock crosses its duration, promoteSwap() runs post-dispose: it reseats
// every node's name/role/blurb (seatPeople) and reassigns portraitMat's
// uniforms to textures dispose() already freed. See L7 below for the
// reproduction and L7b for the perturbation contrast (same scenario, tick
// BEFORE dispose instead of after — no post-dispose mutation).
//
// Currently latent: nothing in the shipped journey.js ever calls
// chapters.owned.dispose() (grepped repo-wide — the only call site is
// index.js:713's own definition), so this cannot fire today. It becomes
// live the moment any chapter-teardown/SPA-navigation path is wired up.
import { buildField, imageLoader, wait, createLedger } from './test-portrait-harness.mjs';

const L = createLedger('portraits.js lifecycle');

function resetImageLoader() {
  imageLoader.mode = 'success';
  imageLoader.delayMs = 0;
  imageLoader.images.length = 0;
}

/* L1 — dispose() is idempotent: calling it twice does not throw. */
{
  resetImageLoader();
  const api = buildField();
  await api.photosReady;
  api.dispose();
  let threw = null;
  try { api.dispose(); } catch (e) { threw = e; }
  L.check('L', 'L1 dispose() called twice does not throw', threw === null, threw && threw.message);
}

/* L2 — LATE LOAD, correctly guarded: photosReady resolves AFTER dispose()   *
 * has already run. The `.then()` handler's `if (disposed) return false;`   *
 * check (portraits.js:1861) fires — photoSet/uniforms are never touched.   */
{
  resetImageLoader();
  imageLoader.delayMs = 20; // the sprite load is still in flight when we dispose
  const api = buildField();
  L.check('L', 'L2 photosAvailable is false before the (delayed) image ever loads', api.photosAvailable === false, api.photosAvailable);
  api.dispose();
  const settled = await api.photosReady;
  L.check('L', 'L2 the late-resolving photosReady still settles (to false) rather than hanging', settled === false, settled);
  L.check('L', 'L2 photosAvailable stays false — the late result never got applied post-dispose', api.photosAvailable === false, api.photosAvailable);
  L.check('L', 'L2 mode stays procedural — uMapP/uMapH were never reassigned post-dispose', api.mode === 'procedural', api.mode);
}

/* L3 — LOAD FAILURE: the sprite Image fires onerror. photosReady resolves  *
 * to false (never rejects); a console.warn fires (portraits.js:1877) but   *
 * nothing throws out of the chapter.                                      */
{
  resetImageLoader();
  imageLoader.mode = 'fail';
  const api = buildField();
  let rejected = false;
  const settled = await api.photosReady.catch(() => { rejected = true; return 'REJECTED'; });
  L.check('L', 'L3 a failed image load resolves photosReady to false, never rejects', rejected === false && settled === false, settled);
  L.check('L', 'L3 photosAvailable stays false on load failure', api.photosAvailable === false, api.photosAvailable);
}

/* L4 — NEVER SETTLES: the sprite Image never fires onload/onerror.         *
 * photosReady stays pending forever; the chapter keeps working otherwise   *
 * (dispose() still succeeds while the promise is pending).                 */
{
  resetImageLoader();
  imageLoader.mode = 'hang';
  const api = buildField();
  const race = await Promise.race([api.photosReady.then(() => 'settled'), wait(80).then(() => 'timeout')]);
  L.check('L', 'L4 a hung image load leaves photosReady pending (race won by the timeout, not the promise)', race === 'timeout', race);
  let threw = null;
  try { api.dispose(); } catch (e) { threw = e; }
  L.check('L', 'L4 dispose() still works normally while photosReady is permanently pending', threw === null, threw && threw.message);
}

/* L5 — CANCELLATION (item 4): dispose() does not abort the underlying      *
 * image request — the fake loader's onload still fires; only the RESULT   *
 * is discarded (by the disposed check), not the in-flight work itself.    *
 * There is no AbortController anywhere in this path.                      */
{
  resetImageLoader();
  imageLoader.delayMs = 15;
  const api = buildField();
  api.dispose();
  await wait(30); // let the delayed onload actually fire
  L.check('L', 'L5 the underlying Image object still exists (one was constructed)', imageLoader.images.length === 1, imageLoader.images.length);
  L.check('L', 'L5 photosAvailable is false — the fired onload\'s result was discarded, not the request itself', api.photosAvailable === false, api.photosAvailable);
}

/* L6 — prepareNext()'s scheduled idle/timeout callback IS cancelled by     *
 * dispose(): drive one full remix to completion so promoteSwap() calls     *
 * schedulePrepare() (arming a setTimeout, since requestIdleCallback is     *
 * undefined in this harness — the documented fallback path), then dispose  *
 * before it fires, then wait well past its 400ms window. No new atlas is   *
 * baked (observed indirectly via a document.createElement('canvas') spy — *
 * portraits.js exposes no direct getter for the internal `pending` var).   */
{
  resetImageLoader();
  const api = buildField({ contributors: undefined, nodeCount: 3 });
  await api.photosReady;
  const origCreateElement = document.createElement;
  let canvasBakes = 0;
  document.createElement = (tag) => {
    if (tag === 'canvas') canvasBakes++;
    return origCreateElement(tag);
  };
  try {
    const r = api.remix();
    api.tickSwap(r.ms / 1000 + 0.01); // completes the swap -> promoteSwap() -> schedulePrepare()
    const afterPromote = canvasBakes;
    api.dispose();
    await wait(500); // past the 400ms setTimeout fallback schedulePrepare() would have used
    L.check('L', 'L6 no new atlas bake happens after dispose (the scheduled prepare timer was cancelled)', canvasBakes === afterPromote, { afterPromote, final: canvasBakes });
  } finally {
    document.createElement = origCreateElement;
  }
}

/* L7 — DEF-C04-02, the centerpiece: tickSwap() called AFTER dispose(),     *
 * with a swap already in flight at dispose time, mutates the disposed      *
 * instance. This is the exact "fake loader/clock test that fails on        *
 * post-dispose mutation" the C04 order asks for — pinned here as CURRENT   *
 * behaviour (a real defect), not fixed.                                    */
{
  resetImageLoader();
  const api = buildField({ contributors: undefined, nodeCount: 4 });
  await api.photosReady;
  const before = api.nodes.map((n) => n.content.name);
  const r = api.remix();
  L.check('L', 'L7 a swap is in flight right after remix()', api.swapping === true, api.swapping);
  api.dispose();
  L.check('L', 'L7 DEFECT: swap survives dispose() — dispose() never clears the in-flight swap clock', api.swapping === true, api.swapping);
  let threw = null;
  try { api.tickSwap(r.ms / 1000 + 1); } catch (e) { threw = e; } // the animator that never got torn down would call this
  const after = api.nodes.map((n) => n.content.name);
  L.check('L', 'L7 DEFECT: a post-dispose tickSwap() call does not throw (silent mutation, not a crash)', threw === null, threw && threw.message);
  L.check('L', 'L7 DEFECT: node.content.name actually changed AFTER dispose() — a disposed instance was mutated', JSON.stringify(before) !== JSON.stringify(after), { before, after });
  L.check('L', 'L7 the swap completed (promoteSwap ran) even though the instance was disposed', api.swapping === false, api.swapping);
}

/* L7b — PERTURBATION CONTRAST for L7: identical setup, but tickSwap() is   *
 * driven to completion BEFORE dispose() instead of after. The promotion    *
 * (and its node.content mutation) is legitimate pre-dispose behaviour, and *
 * — this is the point — NOTHING further mutates once dispose() actually    *
 * runs. Same invariant check as L7, opposite call order, opposite result:  *
 * this is the required proof that the check is sensitive to the defect,    *
 * not vacuously true. See test-portrait-perturbation.mjs P5 for the        *
 * side-by-side transcript.                                                 */
{
  resetImageLoader();
  const api = buildField({ contributors: undefined, nodeCount: 4 });
  await api.photosReady;
  const beforeRemix = api.nodes.map((n) => n.content.name); // REPAIRED 2026-08-21: this snapshot used to be missing — L7b's first check compared `afterPromote` to a hardcoded `true`, which cannot fail. It now compares two real, independently-captured snapshots.
  const r = api.remix();
  api.tickSwap(r.ms / 1000 + 1); // promote BEFORE dispose — legitimate
  const afterPromote = api.nodes.map((n) => n.content.name);
  api.dispose();
  api.tickSwap(1); // no swap in flight; tickSwap's own `if (!swap) return;` guard applies
  const afterDispose = api.nodes.map((n) => n.content.name);
  L.check('L', 'L7b promote-before-dispose: names actually changed by the (legitimate) promotion', JSON.stringify(beforeRemix) !== JSON.stringify(afterPromote), { beforeRemix, afterPromote });
  L.check('L', 'L7b promote-before-dispose: NO further mutation once dispose() actually ran', JSON.stringify(afterPromote) === JSON.stringify(afterDispose), { afterPromote, afterDispose });
}

/* L8 — TWO INDEPENDENT INSTANCES: buildPortraitField() is a factory, not a *
 * singleton (contrast with journey/lib/baked.js — see                     *
 * test-portrait-baked.mjs B5). Mutating one instance's dealt field must    *
 * not touch a second, independently-built instance.                       */
{
  resetImageLoader();
  const A = buildField({ contributors: undefined, nodeCount: 4 });
  const B = buildField({ contributors: undefined, nodeCount: 4 });
  await A.photosReady; await B.photosReady;
  L.check('L', 'L8 the two instances do not share node object identity', A.nodes[0] !== B.nodes[0], { a: A.nodes[0].id, b: B.nodes[0].id });
  const bBefore = B.nodes.map((n) => n.content.name);
  const rA = A.remix();
  A.tickSwap(rA.ms / 1000 + 1);
  const bAfter = B.nodes.map((n) => n.content.name);
  L.check('L', 'L8 remixing instance A leaves instance B\'s dealt content untouched', JSON.stringify(bBefore) === JSON.stringify(bAfter), { bBefore, bAfter });
}

process.exit(L.report());
