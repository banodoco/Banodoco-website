import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BASE_MODEL_MAP, BASE_MODELS } from './constants';
import type { Asset, ResourceFilters } from './types';

const DEBOUNCE_MS = 300;

function parseFilters(params: URLSearchParams): ResourceFilters {
  return {
    type: (['all', 'lora', 'workflow'].includes(params.get('type') ?? '')
      ? params.get('type') as ResourceFilters['type']
      : 'all'),
    status: params.get('status') === 'all' ? 'all' : 'featured',
    mediaType: (['all', 'video', 'image'].includes(params.get('mediaType') ?? '')
      ? params.get('mediaType') as ResourceFilters['mediaType']
      : 'all'),
    baseModel: params.get('baseModel') || null,
    loraType: params.get('loraType') || null,
    search: params.get('q') || '',
  };
}

function filtersToParams(filters: ResourceFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.type !== 'all') params.set('type', filters.type);
  if (filters.status !== 'featured') params.set('status', filters.status);
  if (filters.mediaType !== 'all') params.set('mediaType', filters.mediaType);
  if (filters.baseModel) params.set('baseModel', filters.baseModel);
  if (filters.loraType) params.set('loraType', filters.loraType);
  if (filters.search) params.set('q', filters.search);
  return params;
}

function getModelMediaType(baseModel: string | null): 'video' | 'image' | null {
  if (!baseModel) return null;
  return BASE_MODEL_MAP.get(baseModel)?.mediaType ?? null;
}

export function useResourceFilters(assets: Asset[]) {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = parseFilters(searchParams);

  const [searchInput, setSearchInput] = useState(filters.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const urlSearch = searchParams.get('q') || '';
    setSearchInput(urlSearch);
  }, [searchParams]);

  const setFilter = useCallback(<K extends keyof ResourceFilters>(
    key: K,
    value: ResourceFilters[K]
  ) => {
    const next = { ...parseFilters(searchParams), [key]: value };
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
    setSearchParams(filtersToParams(next), { replace: true });
  }, [searchParams, setSearchParams]);

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
      const info = BASE_MODEL_MAP.get(id);
      return info ? info.mediaType === filters.mediaType : true;
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

    return assets.filter(asset => {
      if (filters.status === 'featured' && asset.admin_status === 'Listed') return false;

      if (filters.type === 'lora' && asset.type !== 'lora') return false;
      if (filters.type === 'workflow' && asset.type !== 'workflow') return false;

      // Media type filter (based on the asset's base model)
      if (filters.mediaType !== 'all' && asset.lora_base_model) {
        const modelType = getModelMediaType(asset.lora_base_model);
        if (modelType && modelType !== filters.mediaType) return false;
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
