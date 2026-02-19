export const STATUS_ORDER: Record<string, number> = {
  Featured: 0,
  Curated: 1,
  Listed: 2,
};

export const TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'lora', label: 'LoRAs' },
  { value: 'workflow', label: 'Workflows' },
] as const;

interface BaseModelInfo {
  id: string;
  label: string;
  mediaType: 'video' | 'image';
}

/** Known base models with display info and media type */
export const BASE_MODELS: BaseModelInfo[] = [
  { id: 'wan', label: 'Wan', mediaType: 'video' },
  { id: 'ltxv', label: 'LTXV', mediaType: 'video' },
  { id: 'ltx2', label: 'LTX2', mediaType: 'video' },
  { id: 'hunyuan', label: 'Hunyuan', mediaType: 'video' },
  { id: 'cogvideox', label: 'CogVideoX', mediaType: 'video' },
  { id: 'flux', label: 'Flux', mediaType: 'image' },
  { id: 'stable-diffusion', label: 'Stable Diffusion', mediaType: 'image' },
  { id: 'sdxl', label: 'SDXL', mediaType: 'image' },
];

/** Lookup map for quick access */
export const BASE_MODEL_MAP = new Map(BASE_MODELS.map(m => [m.id, m]));

export const MEDIA_TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'video', label: 'Video' },
  { value: 'image', label: 'Image' },
] as const;
