import * as THREE from 'three';

/** Paints cells in index order and returns the configured GPU canvas texture. */
export function makePortraitAtlas(cells, columns, cellSize, draw, specs) {
  const canvas = document.createElement('canvas');
  canvas.width = columns * cellSize;
  canvas.height = Math.ceil(cells / columns) * cellSize;
  /* PAINTED ON THE CPU, NOT THE GPU (2026-10-04 — load lag). An accelerated
     2D canvas rasterises its draw calls in the GPU process, on the same
     thread every WebGL context's commands wait behind: this atlas — a few
     thousand gradient, image and composite calls over a 2048-px sheet —
     was a single 60 ms GPU task in the middle of the cold load, the one
     dropped frame left in the load prelude's worker. `willReadFrequently`
     is the standard way to ask for a CPU-backed canvas: the painting now
     costs the page's own thread, which nothing on screen depends on while
     it runs, and the GPU only ever sees the finished sheet as a texture
     upload. */
  const context = canvas.getContext('2d', { willReadFrequently: true });
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
