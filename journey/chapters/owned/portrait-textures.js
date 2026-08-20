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

  return {
    retire(texture) {
      if (!texture || protectedTextures.has(texture) || isWired(texture)) return;
      texture.dispose();
    },
  };
}
