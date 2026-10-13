import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`${process.env.TEST_URL || 'http://localhost:8137'}/?nointro=1&pose=equip`);
  await page.waitForFunction(() => window.journey, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const result = await page.evaluate(async () => {
    const T = await import('three'), { CAP_CLEARANCE_GLSL } = await import('/journey/cap-occlusion.js');
    const { capUnderPt, capTopPt } = await import('/journey/anatomy.js');
    const api = window.sceneApi; api.freezeTime(0); api.scene.updateMatrixWorld(true);
    const positions = [], expected = [], kinds = [], radii = [];
    const append = (point, mask, kind, radius = .02) => { radii.push(radius); positions.push(...point.applyMatrix4(api.groups.mushroom.matrixWorld).toArray()); expected.push(mask); kinds.push(kind); };
    for (let k = 0; k < 32; k++) for (const u of [.15, .35, .55, .75, .94]) {
      const a = k * Math.PI / 16, under = capUnderPt(u, a);
      for (const radius of [.02, .08]) {
        append(under.clone().add(new T.Vector3(0, -.056 - radius - .05, 0)), 0, 'clear-air', radius);
        append(under.clone().add(new T.Vector3(0, -.056 - radius + .005, 0)), 1, 'gill-contact', radius);
      }
      append(under.clone().add(new T.Vector3(0, .04, 0)), 1, 'tissue');
      append(capTopPt(u, a).add(new T.Vector3(0, .15, 0)), 0, 'above');
    }
    for (let k = 0; k < 32; k++) append(capUnderPt(1.15, k * Math.PI / 16), 0, 'outside');
    const count = expected.length, geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('coreRadius', new T.Float32BufferAttribute(radii, 1));
    geometry.setAttribute('indexInRow', new T.Float32BufferAttribute(expected.map((_, i) => i), 1));
    const material = new T.ShaderMaterial({
      uniforms: { worldToCap: { value: api.groups.mushroom.matrixWorld.clone().invert() }, count: { value: count } },
      vertexShader: `${CAP_CLEARANCE_GLSL}\nuniform mat4 worldToCap; uniform float count; attribute float indexInRow; attribute float coreRadius; varying float mask; void main(){ mask=capTissueMask((worldToCap*vec4(position,1.0)).xyz,coreRadius); gl_PointSize=1.0; gl_Position=vec4((indexInRow+.5)/count*2.0-1.0,0.0,0.0,1.0); }`,
      fragmentShader: 'varying float mask; void main(){gl_FragColor=vec4(mask,mask,mask,1.0);}', depthTest: false, depthWrite: false,
    });
    const scene = new T.Scene(); scene.add(new T.Points(geometry, material));
    const target = new T.WebGLRenderTarget(count, 1), prior = api.renderer.getRenderTarget();
    api.renderer.setRenderTarget(target); api.renderer.render(scene, new T.Camera());
    const bytes = new Uint8Array(count * 4); api.renderer.readRenderTargetPixels(target, 0, 0, count, 1, bytes);
    api.renderer.setRenderTarget(prior); target.dispose(); geometry.dispose(); material.dispose();
    const failures = expected.flatMap((mask, i) => Math.abs(bytes[i * 4] / 255 - mask) > .02 ? [{ i, kind: kinds[i], actual: bytes[i * 4] / 255, expected: mask }] : []);
    return { count, failures };
  });
  assert.deepEqual(result.failures, [], 'real GPU clearance matches authored cap surface');
  assert.deepEqual(errors, []);
  console.log(`PASS ${result.count} rendered cap-local tissue/below/above/outside samples through actual tilt/bend/sway matrix`);
} finally { await browser.close(); }
