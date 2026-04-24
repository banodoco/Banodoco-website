/**
 * Vibe Mode — client-side image ingest pipeline.
 *
 * If an image is > MAX_BYTES (5MB) OR has a longest edge > MAX_EDGE
 * (1920px), downscale via <canvas> with aspect preserved BEFORE
 * IDB write / agent forward. Non-images pass through unchanged.
 *
 * The server-side agent-proxy enforces the same 5MB / 1920px caps
 * (T4's `validateImagesServerSide`); this client-side pipeline is
 * the UX-friendly first line of defence so authors don't burn a
 * round-trip on a rejected payload.
 */

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_EDGE = 1920;

export interface DownscaledImage {
  readonly blob: Blob;
  readonly bytes: ArrayBuffer;
  readonly width: number;
  readonly height: number;
  readonly mime: string;
  readonly originalFilename: string;
  readonly wasDownscaled: boolean;
}

const needsDownscale = (file: File): Promise<boolean> => {
  if (!file.type.startsWith('image/')) return Promise.resolve(false);
  if (file.size > MAX_IMAGE_BYTES) return Promise.resolve(true);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(Math.max(img.naturalWidth, img.naturalHeight) > MAX_IMAGE_EDGE);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(false);
    };
    img.src = url;
  });
};

const downscaleFile = async (file: File): Promise<DownscaledImage> => {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error(`Failed to load ${file.name}`));
      i.src = url;
    });
    const ratio = Math.min(MAX_IMAGE_EDGE / img.naturalWidth, MAX_IMAGE_EDGE / img.naturalHeight, 1);
    const targetW = Math.max(1, Math.round(img.naturalWidth * ratio));
    const targetH = Math.max(1, Math.round(img.naturalHeight * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2d context unavailable');
    ctx.drawImage(img, 0, 0, targetW, targetH);
    // Prefer webp for smaller payloads; fall back to jpeg.
    const outType = file.type === 'image/png' || file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), outType, 0.9);
    });
    const bytes = await blob.arrayBuffer();
    return {
      blob,
      bytes,
      width: targetW,
      height: targetH,
      mime: outType,
      originalFilename: file.name,
      wasDownscaled: true,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
};

const passthrough = async (file: File): Promise<DownscaledImage> => {
  const bytes = await file.arrayBuffer();
  // We still need dimensions for non-downscaled images so the agent
  // receives correct metadata.
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error(`Failed to load ${file.name}`));
      i.src = url;
    });
    return {
      blob: file,
      bytes,
      width: img.naturalWidth,
      height: img.naturalHeight,
      mime: file.type || 'application/octet-stream',
      originalFilename: file.name,
      wasDownscaled: false,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
};

/**
 * Accept a File and return a `DownscaledImage` record: bytes, blob,
 * dimensions, mime, filename, and whether the pipeline had to shrink
 * it. Non-image files return as passthrough with best-effort metadata.
 */
export const processImageFile = async (file: File): Promise<DownscaledImage> => {
  if (!file.type.startsWith('image/')) {
    const bytes = await file.arrayBuffer();
    return {
      blob: file,
      bytes,
      width: 0,
      height: 0,
      mime: file.type || 'application/octet-stream',
      originalFilename: file.name,
      wasDownscaled: false,
    };
  }
  const shouldDownscale = await needsDownscale(file);
  return shouldDownscale ? downscaleFile(file) : passthrough(file);
};

/** Convert a Blob to a `data:` URL for ChatBar image forwarding. */
export const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error ?? new Error('FileReader failed'));
    fr.readAsDataURL(blob);
  });
