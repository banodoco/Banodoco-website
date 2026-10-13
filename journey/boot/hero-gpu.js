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
export function compileForFrame(sceneApi, object, options = {}) {
  const method = typeof sceneApi.renderer.compileAsync === 'function' ? 'compileAsync' : 'compile';
  const r = sceneApi.renderer;
  const target = sceneApi.composer && sceneApi.composer.readBuffer;
  if (!target || typeof r.setRenderTarget !== 'function') {
    return r[method](object, sceneApi.camera, sceneApi.scene, options);
  }
  const previous = r.getRenderTarget();
  r.setRenderTarget(target);
  try { return r[method](object, sceneApi.camera, sceneApi.scene, options); }
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

function verifyFrameDraw(sceneApi, compileError) {
  const r = sceneApi.renderer;
  if (typeof r.render !== 'function') throw compileError;
  const target = sceneApi.composer && sceneApi.composer.readBuffer;
  const bindTarget = target && typeof r.setRenderTarget === 'function';
  const previous = bindTarget ? r.getRenderTarget() : null;
  try {
    if (bindTarget) r.setRenderTarget(target);
    r.render(sceneApi.scene, sceneApi.camera);
  } finally {
    if (bindTarget) r.setRenderTarget(previous);
  }
}

function contextLost(renderer) {
  const context = typeof renderer.getContext === 'function' && renderer.getContext();
  return !!(context && typeof context.isContextLost === 'function' && context.isContextLost());
}

/** Keep the existing short context-loss grace without extending the whole
 * readiness deadline. Polling also works when recovery preceded observation. */
function waitForContextRecovery(renderer, timeoutMs) {
  const deadline = performance.now() + Math.max(0, timeoutMs);
  return new Promise((resolve, reject) => {
    const check = () => {
      try {
        if (!contextLost(renderer)) { resolve(true); return; }
        const remaining = deadline - performance.now();
        if (remaining <= 0) { resolve(false); return; }
        setTimeout(check, Math.min(25, remaining));
      } catch (error) {
        reject(error);
      }
    };
    check();
  });
}

async function warmOnce(sceneApi, renderVariants, timeoutMs) {
  const r = sceneApi.renderer;
  const controller = new AbortController();
  let timer;
  let drawError = null;
  try {
    const work = Promise.resolve().then(() => {
      if (typeof r.compileAsync !== 'function' && typeof r.compile !== 'function') return;
      // Preserve the existing full-scene prewarm, including hidden chapters,
      // so early chapter navigation retains its compiled material coverage.
      const pending = compileForFrame(sceneApi, sceneApi.scene, { signal: controller.signal });
      try {
        if (renderVariants) renderVariants(sceneApi);
      } catch (error) {
        // Observe and stop the earlier compile before forwarding the real
        // variant draw's original diagnostic.
        drawError = error;
        controller.abort();
        Promise.resolve(pending).catch(() => {});
        throw error;
      }
      return pending;
    });
    const outcome = await Promise.race([
      work.then(() => ({ done: true }), (error) => ({ error })),
      new Promise((resolve) => {
        timer = setTimeout(() => {
          resolve({ timeout: true });
          controller.abort();
        }, Math.max(0, timeoutMs));
      }),
    ]);
    return { ...outcome, drawError };
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

/** Compilation may degrade after a verified frame. Context loss gets the
 * page's 2.5s recovery grace and at most one fresh-generation retry, all
 * within the same readiness deadline. Only a still-unusable scene fails. */
export async function prepareGpuWarmup(sceneApi, {
  timeoutMs = 8000, recoveryTimeoutMs = 2500, label = 'gpu', renderVariants = null,
} = {}) {
  const r = sceneApi && sceneApi.renderer;
  if (!r) return false;
  const deadline = performance.now() + Math.max(0, timeoutMs);
  const recover = () => waitForContextRecovery(r,
    Math.min(recoveryTimeoutMs, Math.max(0, deadline - performance.now())));
  let recovered = false;
  let retries = 0;
  if (contextLost(r)) {
    if (!await recover()) {
      console.warn(`[${label}] WebGL did not recover during shader warm-up`);
      return false;
    }
    recovered = true;
  }
  while (true) {
    const outcome = await warmOnce(sceneApi, renderVariants, deadline - performance.now());
    if (contextLost(r) || outcome.error?.name === 'WebGLContextInvalidatedError') {
      if (retries++ >= 1 || !await recover()) {
        console.warn(`[${label}] WebGL unavailable after bounded shader warm-up recovery`, outcome.error);
        return false;
      }
      recovered = true;
      continue; // stale polling is cancelled; prepare the restored generation
    }
    if (outcome.drawError) throw outcome.drawError;
    if (outcome.error || recovered) {
      // A recovered generation must actually draw, even if its compile
      // completed. An unexpected compile error likewise needs this proof.
      try {
        verifyFrameDraw(sceneApi, outcome.error || new Error('WebGL frame unavailable after recovery'));
      } catch (error) {
        if (!contextLost(r)) throw error;
      }
      if (contextLost(r)) {
        if (retries++ >= 1 || !await recover()) return false;
        recovered = true;
        continue;
      }
    }
    if (outcome.timeout) console.warn(`[${label}] shader warm-up timed out; continuing`);
    if (outcome.error) console.warn(`[${label}] shader warm-up failed; continuing`, outcome.error);
    return true;
  }
}

/** Prepare the growth's actual render variants before starting its clock. */
export async function prepareHeroGpu(sceneApi, options = {}) {
  const ready = await prepareGpuWarmup(sceneApi, {
    ...options, label: 'hero-gpu', renderVariants: renderShellVariants,
  });
  if (ready) performance.mark('hero-gpu-ready');
  return ready;
}
