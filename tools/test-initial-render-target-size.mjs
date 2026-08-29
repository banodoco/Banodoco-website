import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(join(root, 'organism/organism.js'), 'utf8');

const composerConstruction = source.indexOf('const composer = new EffectComposer');
const logicalSizeNormalization = source.indexOf(
  'composer.setSize(_cssSize.width, _cssSize.height)');
const taaRegistration = source.indexOf('composer.addPass(taaPass)');
assert.ok(composerConstruction >= 0
  && logicalSizeNormalization > composerConstruction
  && logicalSizeNormalization < taaRegistration,
  'the composer logical CSS size must be normalized before TAA is registered');
assert.match(source,
  /const _cssSize = renderer\.getSize\(new THREE\.Vector2\(\)\);/,
  'initial logical sizing must come from the renderer');
assert.match(source,
  /const _dbSize = renderer\.getDrawingBufferSize\(new THREE\.Vector2\(\)\);/,
  'initial physical sizing must come from the renderer drawing buffer');
assert.match(source,
  /composer\.addPass\(bloom\);[\s\S]*?bloom\.setSize\(_cssSize\.width, _cssSize\.height\);/,
  'initial bloom sizing must match the CSS-pixel resize contract');
assert.match(source,
  /function syncRenderSizes\(\) {[\s\S]*?const db = renderer\.getDrawingBufferSize\(new THREE\.Vector2\(\)\);[\s\S]*?taaPass\.setSize\(db\.width, db\.height\);/,
  'resize must keep sizing TAA from the renderer drawing buffer');

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

function target() {
  return {
    width: 0,
    height: 0,
    setSize(width, height) { this.width = width; this.height = height; },
  };
}

const css = { width: 1440, height: 900 };
for (const dpr of [1, 2]) {
  const drawingBuffer = {
    width: css.width * dpr,
    height: css.height * dpr,
  };

  const composer = new ComposerContract(drawingBuffer, dpr);
  composer.setSize(css.width, css.height);
  const taa = target();
  composer.addPass(taa);

  const initial = { width: taa.width, height: taa.height };
  const resize = drawingBuffer;
  assert.deepEqual(composer.targets, drawingBuffer,
    `DPR${dpr} composer targets must match the drawing buffer`);
  assert.deepEqual(initial, drawingBuffer,
    `DPR${dpr} initial TAA must match the drawing buffer`);
  assert.deepEqual(initial, resize,
    `DPR${dpr} initial and resize sizing must have parity`);

  const priorComposer = new ComposerContract(drawingBuffer, dpr);
  const priorTaa = target();
  priorComposer.addPass(priorTaa);
  if (dpr === 2) {
    assert.equal(priorTaa.width * priorTaa.height,
      initial.width * initial.height * 4,
      'the prior DPR2 contract allocated four times the intended TAA pixels');
  }
}

console.log('initial render-target sizing: PASS');
