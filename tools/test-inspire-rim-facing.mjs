import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const width of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 800 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(`${process.env.TEST_URL || 'http://localhost:8137'}/?nointro=1&pose=inspire`);
    await page.waitForFunction(() => window.journey, null, { timeout: 60000 });
    await page.waitForTimeout(1700);
    const result = await page.evaluate(async () => {
      const T = await import('three'), api = window.sceneApi, chapter = window.journey.chapters.inspire;
      const lips = [], sources = [];
      api.scene.traverse(o => {
        if (o.isSprite && Math.abs(o.scale.x - .7) < .001 && Math.abs(o.scale.y - .7) < .001) lips.push(o);
      });
      chapter.group.traverse(o => { if (o.material?.userData.baseOpacity === .5) sources.push(o.material); });
      const normals = chapter.exits.map(e => new T.Vector3(Math.cos(e.az), 0, Math.sin(e.az))
        .transformDirection(api.groups.mushroom.matrix));
      const measure = () => lips.map((lip, i) => ({
        dot: api.camera.position.clone().sub(lip.position).normalize().dot(normals[i]),
        lip: lip.material.opacity, source: sources[i].uniforms.uOpacity.value,
        reveal: sources[i].uniforms.uFade.value,
      }));
      const rest = measure();
      window.journey.flyTo('equip');
      const start = performance.now(), inward = [];
      while (performance.now() - start < 1800) {
        await new Promise(requestAnimationFrame);
        for (const sample of measure()) if (sample.dot < -.005 && sample.reveal > .01) inward.push(sample);
      }
      api.freezeTime(0); api.camera.position.set(0, 1, 0); chapter.snap();
      const snap = measure();
      return { rest, inward, snap, transform: chapter.transform };
    });
    assert.equal(result.rest.length, 3);
    for (const source of result.rest) {
      assert.ok(source.dot > .12, 'all three exterior lights retain full facing weight');
      assert.equal(source.lip, .22 * result.transform, 'original lip brightness retained');
      assert.equal(source.source, .5 * result.transform, 'original source brightness retained');
    }
    assert.ok(result.inward.length > 0, 'actual entry exposes the previously lit inner fan');
    for (const source of [...result.inward, ...result.snap]) {
      assert.equal(source.lip, 0, 'no lip light from inside');
      assert.equal(source.source, 0, 'no white source fan from inside');
    }
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}: all exterior lights unchanged; ${result.inward.length} actual inward frames and snap remain dark`);
    await page.close();
  }
} finally { await browser.close(); }
