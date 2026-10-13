import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { chromium } from 'playwright-core';

const listener = net.createServer();
await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
const port = listener.address().port;
await new Promise(resolve => listener.close(resolve));
const base = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['serve.py'], {
  cwd: new URL('..', import.meta.url), env: { ...process.env, PORT: String(port) }, stdio: 'ignore',
});
let browser;
try {
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await fetch(base)).ok) break; } catch { /* server starting */ }
    if (attempt === 59) throw new Error('server did not start');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    headless: true, args: ['--use-angle=metal'],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${base}/?nointro=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => !!window.journey, null, { timeout: 45000 });
  assert.deepEqual(errors, [], 'healthy journey boot has no page exceptions');
  const boot = await page.evaluate(() => ({
    chapter: window.journey.debugState().chapter,
    marks: performance.getEntriesByType('mark').filter(mark => /gpu-ready/.test(mark.name)).map(mark => mark.name),
  }));
  assert.equal(boot.chapter, 'mission');
  assert(boot.marks.includes('journey-gpu-ready'));

  // Use an independent real GL context so injected loss does not damage the
  // site's readiness state. Program polling and actual loss/restoration use
  // the vendored renderer, rather than a reimplementation in the test.
  const contextResult = await page.evaluate(async () => {
    const THREE = await import('/vendor/three/three.module.js');
    const r = new THREE.WebGLRenderer();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera();
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial()));
    const originalCompile = r.compile;
    r.compile = function (...args) {
      const materials = originalCompile.apply(this, args);
      for (const material of materials) r.properties.get(material).currentProgram.isReady = () => false;
      return materials;
    };
    const extension = r.getContext().getExtension('WEBGL_lose_context');
    if (!extension) throw new Error('WEBGL_lose_context is required for this test');
    const pending = r.compileAsync(scene, camera).then(() => 'resolved', error => error.name);
    const lost = new Promise(resolve => r.domElement.addEventListener('webglcontextlost', resolve, { once: true }));
    extension.loseContext();
    await lost;
    const outcome = await pending;
    const restored = new Promise(resolve => r.domElement.addEventListener('webglcontextrestored', resolve, { once: true }));
    extension.restoreContext();
    await restored;
    r.compile = originalCompile;
    await r.compileAsync(scene, camera);
    r.render(scene, camera);
    const { prepareGpuWarmup } = await import('/journey/boot/hero-gpu.js');
    const api = { renderer: r, scene, camera };
    const compileError = new Error('injected compile failure');
    r.compileAsync = () => Promise.reject(compileError);
    const verifiedFallback = await prepareGpuWarmup(api);
    const drawError = new Error('injected real draw failure');
    r.render = () => { throw drawError; };
    const drawFailure = await prepareGpuWarmup(api).then(() => false, error => error === drawError);
    r.dispose();
    return { outcome, verifiedFallback, drawFailure };
  });
  assert.deepEqual(contextResult, {
    outcome: 'WebGLContextInvalidatedError', verifiedFallback: true, drawFailure: true,
  });
  await page.waitForTimeout(50);
  assert.deepEqual(errors, [], 'real GL loss/restoration causes no uncaught poll error');

  // Stalled optional manifest BODY must release real startup via live builders.
  const stalledPage = await browser.newPage();
  const stalledErrors = [];
  stalledPage.on('pageerror', error => stalledErrors.push(error.message));
  await stalledPage.addInitScript(() => {
    const originalFetch = window.fetch;
    window.fetch = (...args) => String(args[0]).endsWith('static/geom/manifest.json')
      ? Promise.resolve({ ok: true, json: () => new Promise(() => {}) })
      : originalFetch(...args);
  });
  await stalledPage.goto(`${base}/?nointro=1`, { waitUntil: 'domcontentloaded' });
  await stalledPage.waitForFunction(() => !!window.journey, null, { timeout: 45000 });
  const fallback = await stalledPage.evaluate(async () => {
    const baked = await import('/journey/lib/baked.js');
    await baked.ready;
    return ['owned', 'final', 'connect', 'inspire'].map(id => baked.isBaked(id));
  });
  assert.deepEqual(fallback, [false, false, false, false]);
  assert.deepEqual(stalledErrors, []);
  console.log('GPU/browser preparation: PASS (healthy boot, real GL loss/restoration, stalled manifest body live fallback)');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
