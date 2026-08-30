/** Owns disposal policy for atlas textures connected to portrait uniforms. */
export function createPortraitTextureOwner({ uniforms, permanent }) {
  const protectedTextures = new Set(permanent);

  function isWired(texture) {
    return texture === uniforms.uMapA.value
      || texture === uniforms.uMapP.value
      || texture === uniforms.uMapA2.value
      || texture === uniforms.uMapP2.value
      || texture === uniforms.uMapH.value
      || texture === uniforms.uMapH2.value;
  }

  // R04 — this owner constructs no textures itself (see
  // docs/code-health/evidence/2026-08-21-elegance-run-01/r04/
  // CHARACTERIZATION.md); it is a disposal POLICY over textures the caller
  // constructs. Today's one caller (portraits.js's four internal mutators)
  // already guards every retire() call site with its own `disposed` flag
  // before this file is reached — never calls dispose() below, so this is
  // new, unwired capability, not a change to any current call's outcome.
  // `disposed` is defense in depth: the same class of hazard C04 found
  // unguarded in portraits.tickSwap() (a call that reaches a torn-down
  // owner through a path its own guard doesn't cover) has nowhere to land
  // here once a caller does start calling dispose(). retire()'s own
  // double-call behavior (no de-dup on an owner that was never disposed)
  // is left exactly as characterized — see CHARACTERIZATION.md's note on
  // tools/test-portrait-textures.mjs T5, a pinned assertion of that exact
  // current behavior this order does not disturb.
  let disposed = false;

  return {
    retire(texture) {
      if (disposed) return;
      if (!texture || protectedTextures.has(texture) || isWired(texture)) return;
      texture.dispose();
    },
    /** Idempotent. Permanently seals the owner: every retire() call after
     *  this is a no-op, including one arriving from an in-flight async
     *  continuation that resolves after the caller believes it torn down. */
    dispose() {
      disposed = true;
    },
  };
}
