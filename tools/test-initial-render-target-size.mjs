import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const organismSource = await readFile(join(root, 'organism/organism.js'), 'utf8');
const rendererSource = await readFile(join(root, 'organism/renderer.js'), 'utf8');

// Initial construction has two size spaces. The supplied composer target and
// TAA history are physical drawing-buffer pixels; composer bookkeeping and
// bloom remain CSS pixels.
const composerConstruction = organismSource.indexOf('const composer = new EffectComposer');
const logicalSizeNormalization = organismSource.indexOf(
  'composer.setSize(_cssSize.width, _cssSize.height)');
const taaRegistration = organismSource.indexOf('composer.addPass(taaPass)');
assert.ok(composerConstruction >= 0
  && logicalSizeNormalization > composerConstruction
  && logicalSizeNormalization < taaRegistration,
'the composer logical CSS size must be normalized before TAA is registered');
assert.match(organismSource,
  /const _cssSize = renderer\.getSize\(new THREE\.Vector2\(\)\);/,
  'initial logical sizing must come from the renderer');
assert.match(organismSource,
  /const _dbSize = renderer\.getDrawingBufferSize\(new THREE\.Vector2\(\)\);/,
  'initial physical sizing must come from the renderer drawing buffer');
assert.match(organismSource,
  /new THREE\.WebGLRenderTarget\([\s\S]{0,300}?_dbSize\.width, _dbSize\.height,/,
  'initial composer targets must be allocated at drawing-buffer dimensions');
assert.match(organismSource,
  /const taaPass = new TemporalAccumulatePass\(_dbSize\.width, _dbSize\.height\);/,
  'initial TAA history must be allocated at drawing-buffer dimensions');
assert.match(organismSource,
  /composer\.addPass\(bloom\);[\s\S]*?bloom\.setSize\(_cssSize\.width, _cssSize\.height\);/,
  'initial bloom sizing must match the CSS-pixel contract');

// The merged refactor owns subsequent sizing in createViewportSync. Assert the
// production wiring, including both callers: window resize and adaptive DPR.
const viewportStart = organismSource.indexOf('const viewport = createViewportSync({');
const viewportEnd = organismSource.indexOf('\n});', viewportStart);
assert.ok(viewportStart >= 0 && viewportEnd > viewportStart,
  'organism must construct the shared viewport synchronizer');
const viewportBlock = organismSource.slice(viewportStart, viewportEnd + 4);
for (const [pattern, message] of [
  [/composer\.renderTarget1\.setSize\(db\.width, db\.height\);/,
    'renderTarget1 must take drawing-buffer dimensions'],
  [/composer\.renderTarget2\.setSize\(db\.width, db\.height\);/,
    'renderTarget2 must take drawing-buffer dimensions'],
  [/taaPass\.setSize\(db\.width, db\.height\);/,
    'TAA must take drawing-buffer dimensions'],
  [/bloom\.setSize\(cssW, cssH\);/,
    'bloom must take CSS dimensions'],
  [/_denseMats\) m\.uniforms\.uRes\.value\.set\(db\.width, db\.height\);/,
    'dense-line uRes must take drawing-buffer dimensions'],
]) {
  assert.match(viewportBlock, pattern, message);
}
assert.match(organismSource, /addEventListener\('resize', viewport\.resize\);/,
  'window resize must route through viewport.resize');
assert.match(organismSource,
  /createAdaptiveResolution\(\{[\s\S]*?syncSizes: viewport\.sync,/,
  'adaptive pixel-ratio changes must route through viewport.sync');
assert.match(rendererSource,
  /function sync\(\) \{\s*renderer\.setSize\(innerWidth, innerHeight\);\s*onSize\(renderer\.getDrawingBufferSize\(new THREE\.Vector2\(\)\), innerWidth, innerHeight\);\s*\}/,
  'viewport sync must read authoritative drawing-buffer dimensions after renderer.setSize');
assert.match(rendererSource,
  /function resize\(\) \{[\s\S]*?camera\.updateProjectionMatrix\(\);\s*sync\(\);\s*\}/,
  'viewport resize must update camera CSS aspect before shared size synchronization');

// Load createViewportSync itself with its browser-only imports replaced by
// inert bindings. This exercises the refactored production function rather
// than duplicating its sequencing in the test.
const executableRendererSource = rendererSource
  .replace("import * as THREE from 'three';",
    'const THREE = { Vector2: class Vector2 { set(x, y) { this.x = x; this.y = y; return this; } } };')
  .replace("import { OrbitControls } from 'three/addons/controls/OrbitControls.js';",
    'class OrbitControls {}')
  .replace("import { createPixelRatioPolicy } from './performance.js';",
    'function createPixelRatioPolicy() { throw new Error("not used by viewport contract"); }');
const rendererModuleUrl = `data:text/javascript;base64,${Buffer.from(executableRendererSource).toString('base64')}`;
const { createViewportSync } = await import(rendererModuleUrl);

function sizeTarget() {
  return {
    width: 0,
    height: 0,
    calls: [],
    setSize(width, height) {
      this.width = width;
      this.height = height;
      this.calls.push([width, height]);
    },
  };
}

function vectorTarget() {
  return {
    x: 0,
    y: 0,
    calls: [],
    set(x, y) {
      this.x = x;
      this.y = y;
      this.calls.push([x, y]);
    },
  };
}

const originalWidth = globalThis.innerWidth;
const originalHeight = globalThis.innerHeight;
try {
  for (const initialDpr of [1, 2]) {
    globalThis.innerWidth = 1440;
    globalThis.innerHeight = 900;

    const renderer = {
      dpr: initialDpr,
      cssWidth: 0,
      cssHeight: 0,
      setSize(width, height) {
        this.cssWidth = width;
        this.cssHeight = height;
      },
      getDrawingBufferSize(out) {
        return out.set(this.cssWidth * this.dpr, this.cssHeight * this.dpr);
      },
    };
    const camera = {
      aspect: 0,
      projectionUpdates: 0,
      updateProjectionMatrix() { this.projectionUpdates += 1; },
    };
    const composer = {
      renderTarget1: sizeTarget(),
      renderTarget2: sizeTarget(),
    };
    const taa = sizeTarget();
    const bloom = sizeTarget();
    const uRes = vectorTarget();
    const onSizeCalls = [];
    const viewport = createViewportSync({
      renderer,
      camera,
      onSize(db, cssWidth, cssHeight) {
        onSizeCalls.push({
          db: { width: db.x, height: db.y },
          css: { width: cssWidth, height: cssHeight },
        });
        composer.renderTarget1.setSize(db.x, db.y);
        composer.renderTarget2.setSize(db.x, db.y);
        taa.setSize(db.x, db.y);
        bloom.setSize(cssWidth, cssHeight);
        uRes.set(db.x, db.y);
      },
    });

    viewport.sync();
    const initialBuffer = {
      width: 1440 * initialDpr,
      height: 900 * initialDpr,
    };
    assert.deepEqual(onSizeCalls.at(-1), {
      db: initialBuffer,
      css: { width: 1440, height: 900 },
    }, `DPR${initialDpr} initial sync must separate drawing-buffer and CSS sizes`);
    assert.deepEqual(
      [composer.renderTarget1.width, composer.renderTarget1.height],
      [initialBuffer.width, initialBuffer.height],
      `DPR${initialDpr} composer target 1 must equal the renderer drawing buffer`);
    assert.deepEqual(
      [composer.renderTarget2.width, composer.renderTarget2.height],
      [initialBuffer.width, initialBuffer.height],
      `DPR${initialDpr} composer target 2 must equal the renderer drawing buffer`);
    assert.deepEqual([taa.width, taa.height], [initialBuffer.width, initialBuffer.height],
      `DPR${initialDpr} TAA must equal the renderer drawing buffer`);
    assert.deepEqual([uRes.x, uRes.y], [initialBuffer.width, initialBuffer.height],
      `DPR${initialDpr} uRes must equal the renderer drawing buffer`);
    assert.deepEqual([bloom.width, bloom.height], [1440, 900],
      `DPR${initialDpr} bloom must remain in CSS pixels`);

    // Adaptive DPR changes call viewport.sync without changing camera aspect.
    renderer.dpr = initialDpr === 1 ? 2 : 1.5;
    viewport.sync();
    assert.deepEqual([taa.width, taa.height],
      [1440 * renderer.dpr, 900 * renderer.dpr],
      'adaptive sync must re-read the new renderer drawing buffer');
    assert.deepEqual([bloom.width, bloom.height], [1440, 900],
      'adaptive sync must keep bloom in CSS pixels');
    assert.equal(camera.projectionUpdates, 0,
      'adaptive sync must not rebuild an unchanged camera projection');

    // A window resize uses the same physical/CSS routing after updating aspect.
    globalThis.innerWidth = 1200;
    globalThis.innerHeight = 800;
    viewport.resize();
    assert.equal(camera.aspect, 1.5);
    assert.equal(camera.projectionUpdates, 1);
    assert.deepEqual([composer.renderTarget1.width, composer.renderTarget1.height],
      [1200 * renderer.dpr, 800 * renderer.dpr],
      'resize must route drawing-buffer dimensions to composer targets');
    assert.deepEqual([taa.width, taa.height],
      [1200 * renderer.dpr, 800 * renderer.dpr],
      'resize must route drawing-buffer dimensions to TAA');
    assert.deepEqual([uRes.x, uRes.y],
      [1200 * renderer.dpr, 800 * renderer.dpr],
      'resize must route drawing-buffer dimensions to uRes');
    assert.deepEqual([bloom.width, bloom.height], [1200, 800],
      'resize must route CSS dimensions to bloom');
  }
} finally {
  globalThis.innerWidth = originalWidth;
  globalThis.innerHeight = originalHeight;
}

// EffectComposer treats a supplied target's dimensions as its logical size.
// Normalizing to CSS before pass registration prevents multiplying a target
// that is already physical by DPR a second time.
class ComposerContract {
  constructor(target, pixelRatio) {
    this.logical = { ...target };
    this.pixelRatio = pixelRatio;
    this.targets = { ...target };
  }

  setSize(width, height) {
    this.logical = { width, height };
    this.targets = {
      width: width * this.pixelRatio,
      height: height * this.pixelRatio,
    };
  }

  addPass(pass) {
    pass.setSize(
      this.logical.width * this.pixelRatio,
      this.logical.height * this.pixelRatio,
    );
  }
}

const css = { width: 1440, height: 900 };
for (const dpr of [1, 2]) {
  const drawingBuffer = {
    width: css.width * dpr,
    height: css.height * dpr,
  };

  const composer = new ComposerContract(drawingBuffer, dpr);
  composer.setSize(css.width, css.height);
  const taa = sizeTarget();
  composer.addPass(taa);

  assert.deepEqual(composer.targets, drawingBuffer,
    `DPR${dpr} initial composer targets must match the drawing buffer`);
  assert.deepEqual({ width: taa.width, height: taa.height }, drawingBuffer,
    `DPR${dpr} initial TAA must match the drawing buffer`);

  const priorComposer = new ComposerContract(drawingBuffer, dpr);
  const priorTaa = sizeTarget();
  priorComposer.addPass(priorTaa);
  if (dpr === 2) {
    assert.equal(priorTaa.width * priorTaa.height,
      taa.width * taa.height * 4,
      'without CSS normalization, DPR2 allocates four times the intended TAA pixels');
  }
}

console.log('initial render-target sizing: PASS');
