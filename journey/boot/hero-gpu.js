/* ==================================================================== *
 * journey/boot/hero-gpu.js — THE HERO'S OWN GPU PREPARATION.
 *
 * Everything the growth draws, linked before the growth may start, and
 * nothing else. Split out of journey.js's prepareGpu() (2026-10-04) so it
 * no longer waits behind the journey: the hero needs neither the journey's
 * module graph, nor the baked chapter geometry (~4 s of download on a
 * 10 Mbps link), nor the chapter builds (~1.6 s at a quarter of this
 * machine's CPU). With those in front of it, a slow device watched the
 * prelude for ~15 s before the mushroom began. journey/boot/handoff.js
 * starts this as soon as the scene exists and gates the growth on it.
 *
 * Imports nothing: it only drives the renderer the scene already owns.
 * ==================================================================== */

/** compileAsync, but for the program variant the frame actually draws.
 *  The scene is rendered into the composer's offscreen target, and three
 *  keys a program on its output (linear, no tone mapping into a target;
 *  sRGB + ACES to the canvas). Compiled with no target bound, a warm-up
 *  builds the CANVAS variant — a program no frame ever uses — and the real
 *  one still compiles on first sight. So the composer's target is bound
 *  for the synchronous part of the call and then put back. */
export function compileForFrame(sceneApi, object) {
  const r = sceneApi.renderer;
  const target = sceneApi.composer && sceneApi.composer.readBuffer;
  if (!target || typeof r.setRenderTarget !== 'function') {
    return r.compileAsync(object, sceneApi.camera, sceneApi.scene);
  }
  const previous = r.getRenderTarget();
  r.setRenderTarget(target);
  try { return r.compileAsync(object, sceneApi.camera, sceneApi.scene); }
  finally { r.setRenderTarget(previous); }
}

/** The occluder shells' growth states, LINKED BY A REAL DRAW. compileAsync
 *  cannot produce them: three applies a material's own clippingPlanes only
 *  inside a render (WebGLClipping.setState), so a compile of the stem
 *  shell under its clip plane builds the UNclipped program, and the real
 *  one still linked on the frame the stem began to fade — measured 0.52 s
 *  into the growth, 50-100 ms, on every cold load, after the compile-based
 *  warm-up had supposedly covered it. So each state the growth passes
 *  through (organism/intro.js eachShellVariant) is drawn once, synchronously,
 *  here — where a synchronous link costs nothing anyone can see, because the
 *  prelude is on its own thread and the scene is holding its frame. */
function renderShellVariants(sceneApi) {
  const r = sceneApi.renderer;
  const intro = sceneApi.intro;
  if (!intro || typeof intro.eachShellVariant !== 'function'
      || typeof r.render !== 'function' || typeof r.setRenderTarget !== 'function') return;
  // The composer's own buffer, not a scratch target: the GPU driver also
  // builds its pipeline state on a program's first draw, keyed on the
  // target's format and sample count, so only a draw into the real target
  // leaves nothing for the growth's first stem-fade frame to build. The
  // buffer is overwritten by the next composed frame, and while the scene
  // holds its frame (organism/animation.js holdRender) nothing reads it.
  const target = sceneApi.composer && sceneApi.composer.readBuffer;
  if (!target) return;
  const previous = r.getRenderTarget();
  try {
    r.setRenderTarget(target);
    intro.eachShellVariant(() => r.render(sceneApi.scene, sceneApi.camera));
  } finally {
    r.setRenderTarget(previous);
  }
}

/** Resolves once every program the growth's first seconds need is linked,
 *  or after `timeoutMs` — this is a warm-up, and a slow driver must never
 *  turn into a blank hero. Never rejects. */
export async function prepareHeroGpu(sceneApi, { timeoutMs = 8000 } = {}) {
  const r = sceneApi && sceneApi.renderer;
  if (!r) return false;
  let timer;
  try {
    const work = Promise.resolve().then(() => {
      if (typeof r.compileAsync !== 'function') {
        if (typeof r.compile === 'function') r.compile(sceneApi.scene, sceneApi.camera);
        renderShellVariants(sceneApi);
        return;
      }
      const pending = compileForFrame(sceneApi, sceneApi.scene);
      renderShellVariants(sceneApi);
      return pending;
    });
    const outcome = await Promise.race([
      work.then(() => 'done', () => 'error'),
      new Promise((resolve) => { timer = setTimeout(() => resolve('timeout'), timeoutMs); }),
    ]);
    if (outcome === 'timeout') console.warn('[hero-gpu] shader warm-up timed out; continuing');
    if (outcome === 'error') console.warn('[hero-gpu] shader warm-up failed; continuing');
  } finally {
    clearTimeout(timer);
  }
  performance.mark('hero-gpu-ready');
  return true;
}
