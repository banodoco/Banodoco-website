// Actual shader regression: the two welcomes coexist and contribute visible
// pixels. Needs the local server; checks ordinary tap uniforms remain separate.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 664 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${process.env.TEST_URL || 'http://localhost:8137'}/?nointro=1`);
  await page.waitForFunction(() => window.journey, null, { timeout: 60000 });
  await page.waitForTimeout(3500);
  const result = await page.evaluate(async () => {
    const api = window.sceneApi, journey = window.journey;
    let uniform;
    api.scene.traverse(o => { if (!uniform && o.material?.uniforms?.uWelcomeT) uniform = o.material.uniforms; });
    const calls = [], original = api.welcomeFrom;
    api.welcomeFrom = (world, profile, slot, delay) => {
      original(world, profile, slot, delay);
      calls.push({ slot, ages: uniform.uWelcomeT.value.toArray() });
    };
    journey.flyTo('equip');
    const deadline = performance.now() + 12000;
    while (calls.length < 2 && performance.now() < deadline) await new Promise(requestAnimationFrame);
    await new Promise(r => setTimeout(r, 350));
    const ages = uniform.uWelcomeT.value.toArray();
    const { renderer, scene, camera } = api;
    const priorTarget = renderer.getRenderTarget(); renderer.setRenderTarget(null);
    const gl = renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    function pixels() {
      renderer.render(scene, camera);
      const bytes = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
      return bytes;
    }
    const lit = pixels();
    uniform.uWelcomeT.value.set(1000, 1000);
    const ambient = pixels();
    uniform.uWelcomeT.value.fromArray(ages); renderer.setRenderTarget(priorTarget);
    let brighter = 0;
    for (let i = 0; i < lit.length; i += 4) {
      if (lit[i] + lit[i + 1] + lit[i + 2] > ambient[i] + ambient[i + 1] + ambient[i + 2] + 3) brighter++;
    }
    api.welcomeFrom = original;
    return { calls, ages, brighter };
  });
  console.log(JSON.stringify(result));
  assert.deepEqual(result.calls.map(c => c.slot), [0, 1]);
  assert.ok(result.calls[1].ages[0] > .5, 'gill welcome does not restart the stalk');
  assert.ok(result.calls.every(c => c.ages[c.slot] === -.22), 'each welcome waits for the forming icon');
  assert.ok(result.ages[0] > result.ages[1] + .7, 'waves retain independent ages');
  assert.ok(result.brighter > 100, `welcome must render visible light: ${JSON.stringify(result)}`);
  assert.deepEqual(errors, []);
  console.log('PASS Equip independent visible welcome waves', result);
  await page.evaluate(() => window.journey.flyTo('inspire'));
  await page.waitForTimeout(7000);
  const markers = await page.evaluate(() => window.journey.ui.hotspots.filter(h => h.chapter === 'inspire')
    .map(h => ({ id: h.id, opacity: h.a, suppressed: h.sup, left: h.btn.getBoundingClientRect().left,
      right: h.btn.getBoundingClientRect().right })));
  assert.ok(markers.every(h => h.opacity > .99 && !h.suppressed && h.left >= 0 && h.right <= 390),
    `all Inspire markers fit a short phone: ${JSON.stringify(markers)}`);
  await page.screenshot({ path: '/tmp/inspire-final-390-short.png' });
  console.log('PASS short-phone Inspire framing', markers);
} finally { await browser.close(); }
