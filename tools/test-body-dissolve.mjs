import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  // A lightweight same-origin page can import the production shader without
  // booting a second full mushroom scene alongside other browser checks.
  await page.goto(`${process.env.TEST_URL || 'http://localhost:8137'}/robots.txt`);
  await page.addScriptTag({ type: 'importmap', content: JSON.stringify({ imports: { three: '/vendor/three/three.module.js' } }) });
  const result = await page.evaluate(async () => {
    const THREE = await import('/vendor/three/three.module.js');
    const { BODY_DISSOLVE_GLSL } = await import('/journey/lib/body-dissolve.js');
    const renderer = new THREE.WebGLRenderer();
    const target = new THREE.WebGLRenderTarget(96, 96);
    renderer.setRenderTarget(target);
    renderer.setClearColor(0xffffff);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 2;
    const { cloneShellMat } = await import('/journey/chapters/final/clones-materials.js');
    const source = new THREE.MeshBasicMaterial({ color: 0x000000 });
    // Exercise the real fallback path: variation may be unavailable, but each
    // clone must still own and dissolve its shell without changing the hero.
    const material = cloneShellMat(source, {}, null, false);
    const geometry = new THREE.PlaneGeometry(2, 2);
    scene.add(new THREE.Mesh(geometry, material));
    const render = coverage => {
      material.opacity = coverage;
      renderer.render(scene, camera);
      const pixels = new Uint8Array(96 * 96 * 4);
      renderer.readRenderTargetPixels(target, 0, 0, 96, 96, pixels);
      return pixels;
    };
    const fractions = [0, 0.25, 0.5, 0.75, 1];
    const frames = fractions.map(render);
    const counts = frames.map(pixels => pixels.reduce((n, value, i) => n + (i % 4 === 0 && value < 10 ? 1 : 0), 0));
    const reverseIdentical = fractions.every((coverage, i) => render(coverage).every((value, p) => value === frames[i][p]));
    const sourceStable = !/gl_FragCoord|\btime\b/.test(BODY_DISSOLVE_GLSL);
    const sourceUntouched = source.opacity === 1 && source !== material;
    geometry.dispose(); material.dispose(); source.dispose(); target.dispose(); renderer.dispose();
    return { counts, reverseIdentical, sourceStable, sourceUntouched };
  });
  assert.equal(result.counts[0], 0, 'no dark body or depth remains at zero coverage');
  assert.equal(result.counts.at(-1), 96 * 96, 'resting body remains fully opaque');
  result.counts.slice(1).forEach((count, i) => assert.ok(count > result.counts[i], 'body coverage grows progressively'));
  assert.ok(result.sourceUntouched, 'fallback clone owns its shell without fading the original hero');
  assert.ok(result.reverseIdentical, 'reversing the reveal returns identical spatial patches');
  assert.ok(result.sourceStable, 'noise remains attached to body space, independent of time and camera pixels');
  console.log('Body dissolve: increasing opaque coverage, exact reversible pattern, fully solid rest:', result.counts);
} finally { await browser.close(); }
