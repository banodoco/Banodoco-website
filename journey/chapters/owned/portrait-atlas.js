import * as THREE from 'three';

/** Paints cells in index order and returns the configured GPU canvas texture. */
export function makePortraitAtlas(cells, columns, cellSize, draw, specs) {
  const canvas = document.createElement('canvas');
  canvas.width = columns * cellSize;
  canvas.height = Math.ceil(cells / columns) * cellSize;
  const context = canvas.getContext('2d');
  context.imageSmoothingQuality = 'high';
  context.clearRect(0, 0, canvas.width, canvas.height);
  for (let index = 0; index < cells; index++) {
    draw(
      context,
      (index % columns) * cellSize,
      Math.floor(index / columns) * cellSize,
      cellSize,
      specs[index],
    );
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}
