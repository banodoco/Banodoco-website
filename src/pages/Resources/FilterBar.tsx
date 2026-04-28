import { TYPE_OPTIONS, BASE_MODEL_MAP } from './constants';
import type { ResourceFilters } from './types';

interface FilterBarProps {
  filters: ResourceFilters;
  searchInput: string;
  availableBaseModels: string[];
  onFilterChange: <K extends keyof ResourceFilters>(key: K, value: ResourceFilters[K]) => void;
  onSearchChange: (value: string) => void;
}

function getModelLabel(id: string): string {
  return BASE_MODEL_MAP.get(id)?.label ?? id.toUpperCase();
}

const selectClassName = 'h-8 cursor-pointer appearance-none rounded-lg border border-white/10 bg-white/5 px-2.5 pr-7 text-xs text-zinc-100 transition-colors focus:border-white/25 focus:outline-none focus:ring-1 focus:ring-white/10';
const optionClassName = 'bg-zinc-950 text-zinc-100';

/**
 * Compact filter row designed to sit inline with a section title and primary
 * action button. Status toggle + type pills + base-model dropdown + search.
 */
export const FilterBar = ({
  filters,
  searchInput,
  availableBaseModels,
  onFilterChange,
  onSearchChange,
}: FilterBarProps) => {
  const showBaseModel = filters.type !== 'workflow' && availableBaseModels.length > 0;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Status toggle */}
      <div className="flex gap-1 bg-white/5 rounded-lg p-1">
        <button
          onClick={() => onFilterChange('status', 'curated')}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
            filters.status === 'curated'
              ? 'bg-white/15 text-white'
              : 'text-white/50 hover:text-white/70'
          }`}
        >
          Curated
        </button>
        <button
          onClick={() => onFilterChange('status', 'all')}
          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
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
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              filters.type === opt.value
                ? 'bg-white/15 text-white'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Base model dropdown (LoRA-only) */}
      {showBaseModel && (
        <select
          value={filters.baseModel || ''}
          onChange={e => onFilterChange('baseModel', e.target.value || null)}
          className={selectClassName}
          aria-label="Base model"
        >
          <option value="" className={optionClassName}>All Base Models</option>
          {availableBaseModels.map(m => (
            <option key={m} value={m} className={optionClassName}>{getModelLabel(m)}</option>
          ))}
        </select>
      )}

      {/* Search */}
      <div className="relative w-full sm:w-44 md:w-52">
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={searchInput}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search…"
          className="w-full h-8 pl-8 pr-2.5 text-xs bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-white/25 transition-colors"
        />
      </div>
    </div>
  );
};
