import { useState } from 'react';
import { TYPE_OPTIONS, MEDIA_TYPE_OPTIONS, BASE_MODEL_MAP } from './constants';
import type { ResourceFilters } from './types';

interface FilterBarProps {
  filters: ResourceFilters;
  searchInput: string;
  resultCount: number;
  availableBaseModels: string[];
  availableLoraTypes: string[];
  onFilterChange: <K extends keyof ResourceFilters>(key: K, value: ResourceFilters[K]) => void;
  onSearchChange: (value: string) => void;
}

function getModelLabel(id: string): string {
  return BASE_MODEL_MAP.get(id)?.label ?? id.toUpperCase();
}

export const FilterBar = ({
  filters,
  searchInput,
  resultCount,
  availableBaseModels,
  availableLoraTypes,
  onFilterChange,
  onSearchChange,
}: FilterBarProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const showLoraFilters = filters.type !== 'workflow';
  const hasExtraFilters = showLoraFilters && (availableBaseModels.length > 0 || availableLoraTypes.length > 0);

  return (
    <div className="space-y-4">
      {/* Top row: status toggle + type pills + search */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status toggle */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          <button
            onClick={() => onFilterChange('status', 'featured')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filters.status === 'featured'
                ? 'bg-white/15 text-white'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            Curated
          </button>
          <button
            onClick={() => onFilterChange('status', 'all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filters.status === 'all'
                ? 'bg-white/15 text-white'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            All
          </button>
        </div>

        {/* Type pills */}
        <div className="flex gap-1 bg-white/5 rounded-lg p-1">
          {TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => onFilterChange('type', opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filters.type === opt.value
                  ? 'bg-white/15 text-white'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Media type pills (All / Video / Image / Music) */}
        {showLoraFilters && (
          <div className="flex gap-1 bg-white/5 rounded-lg p-1">
            {MEDIA_TYPE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => onFilterChange('mediaType', opt.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  filters.mediaType === opt.value
                    ? 'bg-white/15 text-white'
                    : 'text-white/50 hover:text-white/70'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {/* Search */}
        <div className="relative flex-1 min-w-[160px] sm:min-w-[200px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search resources..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/25 transition-colors"
          />
        </div>

        {/* Mobile filter toggle */}
        {hasExtraFilters && (
          <button
            onClick={() => setMobileOpen(prev => !prev)}
            className="md:hidden px-3 py-2 text-xs font-medium bg-white/5 border border-white/10 rounded-lg text-white/60 hover:text-white/80 transition-colors"
          >
            Filters {mobileOpen ? '▲' : '▼'}
          </button>
        )}
      </div>

      {/* Dropdowns row */}
      {hasExtraFilters && (
        <div className={`flex flex-wrap gap-3 ${mobileOpen ? '' : 'hidden md:flex'}`}>
          {availableBaseModels.length > 0 && (
            <select
              value={filters.baseModel || ''}
              onChange={e => onFilterChange('baseModel', e.target.value || null)}
              className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white/70 focus:outline-none focus:border-white/25 transition-colors appearance-none cursor-pointer"
            >
              <option value="">All Base Models</option>
              {availableBaseModels.map(m => (
                <option key={m} value={m}>{getModelLabel(m)}</option>
              ))}
            </select>
          )}

          {availableLoraTypes.length > 0 && (
            <select
              value={filters.loraType || ''}
              onChange={e => onFilterChange('loraType', e.target.value || null)}
              className="px-3 py-1.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white/70 focus:outline-none focus:border-white/25 transition-colors appearance-none cursor-pointer"
            >
              <option value="">All LoRA Types</option>
              {availableLoraTypes.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Result count */}
      <p className="text-xs text-white/30">
        Showing {resultCount} resource{resultCount !== 1 ? 's' : ''}
      </p>
    </div>
  );
};
