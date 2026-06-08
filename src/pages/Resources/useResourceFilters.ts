import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { BASE_MODEL_MAP, BASE_MODELS, STATUS_ORDER } from './constants';
import type { Asset, ResourceFilters } from './types';

const DEBOUNCE_MS = 300;

const DEFAULT_FILTERS: ResourceFilters = {
  type: 'all',
  status: 'curated',
  mediaType: 'all',
  baseModel: null,
  loraType: null,
  search: '',
};

const MUSIC_KEYWORDS = ['music', 'audio', 'song', 'sound', 'udio', 'suno', 'musicgen', 'stable-audio', 'riffusion', 'audioldm'];
const VIDEO_KEYWORDS = ['video', 'wan', 'ltx', 'hunyuan', 'cogvideo', 'animatediff', 'kling', 'veo'];
const IMAGE_KEYWORDS = ['image', 'flux', 'sdxl', 'stable-diffusion', 'stable diffusion', 'midjourney'];

function getMediaTypeFromText(value: string | null | undefined): 'video' | 'image' | 'music' | null {
  if (!value) return null;
  const text = value.toLowerCase();
  if (MUSIC_KEYWORDS.some((keyword) => text.includes(keyword))) return 'music';
  if (VIDEO_KEYWORDS.some((keyword) => text.includes(keyword))) return 'video';
  if (IMAGE_KEYWORDS.some((keyword) => text.includes(keyword))) return 'image';
  return null;
}

function getModelMediaType(baseModel: string | null): 'video' | 'image' | 'music' | null {
  if (!baseModel) return null;
  const normalized = baseModel.toLowerCase();
  return BASE_MODEL_MAP.get(baseModel)?.mediaType
    ?? BASE_MODEL_MAP.get(normalized)?.mediaType
    ?? getMediaTypeFromText(baseModel);
}

function inferAssetMediaType(asset: Asset): 'video' | 'image' | 'music' | null {
  const fromBaseModel = getModelMediaType(asset.lora_base_model);
  if (fromBaseModel) return fromBaseModel;

  const media = Array.isArray(asset.media) ? asset.media[0] : asset.media;
  if (media?.type) {
    const mediaType = getMediaTypeFromText(media.type);
    if (mediaType) return mediaType;
  }

  if (media?.metadata) {
    const metadataType = getMediaTypeFromText(JSON.stringify(media.metadata));
    if (metadataType) return metadataType;
  }

  const textType = getMediaTypeFromText([
    asset.type,
    asset.lora_type,
    asset.model_variant,
    asset.name,
    asset.description,
  ].filter(Boolean).join(' '));

  return textType;
}

export function useResourceFilters(assets: Asset[]) {
  // Filters live in local component state, not the URL. Selecting a filter
  // updates state in place and never touches the address bar (no ?status=…&q=…).
  const [filters, setFilters] = useState<ResourceFilters>(DEFAULT_FILTERS);

  const [searchInput, setSearchInput] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const setFilter = useCallback(<K extends keyof ResourceFilters>(
    key: K,
    value: ResourceFilters[K]
  ) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value };
      // Reset dependent filters
      if (key === 'type' && value !== 'lora') {
        next.baseModel = null;
        next.loraType = null;
        next.mediaType = 'all';
      }
      // Reset base model if switching media type and current base model doesn't match
      if (key === 'mediaType' && next.baseModel) {
        const modelType = getModelMediaType(next.baseModel);
        if (value !== 'all' && modelType !== value) {
          next.baseModel = null;
        }
      }
      return next;
    });
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setFilter('search', value);
    }, DEBOUNCE_MS);
  }, [setFilter]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  // Derive available filter options from data, combining DB values with known models
  const availableBaseModels = useMemo(() => {
    const fromData = new Set<string>();
    assets.forEach(a => {
      if (a.type === 'lora' && a.lora_base_model) fromData.add(a.lora_base_model);
    });

    // Include all known models (even if no assets yet) plus any from data
    const allIds = new Set([...BASE_MODELS.map(m => m.id), ...fromData]);

    // Filter by selected media type
    const filtered = [...allIds].filter(id => {
      if (filters.mediaType === 'all') return true;
      const modelType = getModelMediaType(id);
      return modelType === filters.mediaType;
    });

    return filtered.sort();
  }, [assets, filters.mediaType]);

  const availableLoraTypes = useMemo(() => {
    const types = new Set<string>();
    assets.forEach(a => {
      if (a.type === 'lora' && a.lora_type) types.add(a.lora_type);
    });
    return [...types].sort();
  }, [assets]);

  // Apply filters
  const filtered = useMemo(() => {
    const searchLower = filters.search.toLowerCase();

    const matched = assets.filter(asset => {
      if (filters.status === 'curated' && asset.admin_status === 'Listed') return false;

      if (filters.type === 'lora' && asset.type !== 'lora') return false;
      if (filters.type === 'workflow' && asset.type !== 'workflow') return false;

      // Media type filter (video/image/music)
      if (filters.mediaType !== 'all') {
        const assetMediaType = inferAssetMediaType(asset);
        if (assetMediaType !== filters.mediaType) return false;
      }

      if (filters.baseModel && asset.lora_base_model !== filters.baseModel) return false;

      if (filters.loraType && asset.lora_type !== filters.loraType) return false;

      if (searchLower) {
        const nameMatch = asset.name.toLowerCase().includes(searchLower);
        const descMatch = asset.description?.toLowerCase().includes(searchLower);
        const creatorMatch = asset.creator?.toLowerCase().includes(searchLower);
        if (!nameMatch && !descMatch && !creatorMatch) return false;
      }

      return true;
    });

    const byDateDesc = (a: Asset, b: Asset) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime();

    // Sort a copy so we never mutate the upstream `assets` array.
    if (filters.status === 'all') {
      // "All" mode is dominated by ~122 Listed community imports vs ~10 Curated
      // entries. Sorting curated-first would bury the freshest community
      // resources past page 1, so "All" sorts purely newest-first by recency.
      return [...matched].sort(byDateDesc);
    }

    // "Curated" mode keeps the editorial Curated-first ordering, then date-desc.
    return [...matched].sort((a, b) => {
      const rankA = STATUS_ORDER[a.admin_status ?? 'Listed'] ?? STATUS_ORDER.Listed;
      const rankB = STATUS_ORDER[b.admin_status ?? 'Listed'] ?? STATUS_ORDER.Listed;
      if (rankA !== rankB) return rankA - rankB;
      return byDateDesc(a, b);
    });
  }, [assets, filters]);

  return {
    filters,
    searchInput,
    filtered,
    setFilter,
    handleSearchChange,
    availableBaseModels,
    availableLoraTypes,
  };
}
