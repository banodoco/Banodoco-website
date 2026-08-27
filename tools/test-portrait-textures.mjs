// C04 — journey/chapters/owned/portrait-textures.js characterization.
// Run with: node tools/test-portrait-textures.mjs
//
// Covers CHARACTERIZE item 5 (disposal policy) for the retire() helper
// portraits.js's dispose()/promoteSwap() both call. portrait-textures.js has
// no imports at all, so it runs completely unmodified — no rewrite, no
// stubbing.
import { textureOwnerModule, createLedger } from './test-portrait-harness.mjs';

const L = createLedger('portrait texture owner');
const { createPortraitTextureOwner } = textureOwnerModule;

function fakeTexture(name) {
  let disposeCalls = 0;
  return {
    name,
    dispose() { disposeCalls++; },
    get disposeCalls() { return disposeCalls; },
  };
}

function makeUniforms(uMapAValue = null) {
  return {
    uMapA: { value: uMapAValue }, uMapP: { value: null }, uMapA2: { value: null },
    uMapP2: { value: null }, uMapH: { value: null }, uMapH2: { value: null },
  };
}

/* T1 — a protected (permanent) texture is never disposed, wired or not. */
{
  const protectedTex = fakeTexture('protected');
  const uniforms = makeUniforms();
  const owner = createPortraitTextureOwner({ uniforms, permanent: [protectedTex] });
  owner.retire(protectedTex);
  L.check('T', 'T1 a permanent texture survives retire()', protectedTex.disposeCalls === 0, protectedTex.disposeCalls);
}

/* T2 — a texture currently wired into ANY of the six uniform slots is       *
 * protected from disposal even though it was never in `permanent`.         */
{
  const wiredTex = fakeTexture('wired');
  const uniforms = makeUniforms(wiredTex);
  const owner = createPortraitTextureOwner({ uniforms, permanent: [] });
  owner.retire(wiredTex);
  L.check('T', 'T2 a texture wired into uMapA is not disposed', wiredTex.disposeCalls === 0, wiredTex.disposeCalls);
}

/* T3 — a texture that is neither protected nor wired IS disposed, exactly  *
 * once for one retire() call.                                              */
{
  const freeTex = fakeTexture('free');
  const uniforms = makeUniforms();
  const owner = createPortraitTextureOwner({ uniforms, permanent: [] });
  owner.retire(freeTex);
  L.check('T', 'T3 an unwired, unprotected texture is disposed exactly once', freeTex.disposeCalls === 1, freeTex.disposeCalls);
}

/* T4 — LIVE re-check, not a construction-time snapshot: isWired() reads the *
 * uniforms object at CALL time. Mutating which texture is wired AFTER the  *
 * owner is constructed changes what the next retire() call protects.       */
{
  const tex = fakeTexture('was-wired');
  const uniforms = makeUniforms(tex);
  const owner = createPortraitTextureOwner({ uniforms, permanent: [] });
  owner.retire(tex);
  L.check('T4', 'T4a while wired, retire() protects it (0 disposals)', tex.disposeCalls === 0, tex.disposeCalls);
  uniforms.uMapA.value = null; // the swap moved on; this texture is no longer wired anywhere
  owner.retire(tex);
  L.check('T4', 'T4b once unwired, the SAME owner instance now disposes it (live read, not a snapshot)', tex.disposeCalls === 1, tex.disposeCalls);
}

/* T5 — retire() has no "already retired" bookkeeping: calling it twice on   *
 * the same eligible texture disposes it TWICE. Current behaviour, pinned   *
 * as an exact call count (three.js tolerates repeat Texture#dispose()      *
 * calls, so this is not a crash risk, but it IS a real double-call).       */
{
  const tex = fakeTexture('double-retire');
  const uniforms = makeUniforms();
  const owner = createPortraitTextureOwner({ uniforms, permanent: [] });
  owner.retire(tex);
  owner.retire(tex);
  L.check('T', 'T5 retire() called twice on the same eligible texture disposes it twice (no de-dup)', tex.disposeCalls === 2, tex.disposeCalls);
}

/* T6 — null/undefined are accepted silently (the dispose()/promoteSwap()    *
 * call sites in portraits.js pass possibly-null uniform slots straight      *
 * through retire() without checking first).                                 */
{
  const uniforms = makeUniforms();
  const owner = createPortraitTextureOwner({ uniforms, permanent: [] });
  let threw = null;
  try { owner.retire(null); owner.retire(undefined); } catch (e) { threw = e; }
  L.check('T', 'T6 retire(null) / retire(undefined) are silent no-ops', threw === null, threw);
}

process.exit(L.report());
