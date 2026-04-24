import { useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { AssetModelInput } from '@/lib/resources';

interface ModelOption {
  id: string;
  display_name: string | null;
  default_variant: string | null;
}

interface ModelCompatibilityPickerProps {
  items: AssetModelInput[];
  onChange: (items: AssetModelInput[]) => void;
  disabled?: boolean;
}

export function ModelCompatibilityPicker({
  items,
  onChange,
  disabled = false,
}: ModelCompatibilityPickerProps) {
  const [models, setModels] = useState<ModelOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedModelId, setExpandedModelId] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;

    if (!isSupabaseConfigured || !client) {
      setLoading(false);
      setModels([]);
      return;
    }

    const fetchModels = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await client
        .from('models')
        .select('id, display_name, default_variant')
        .order('display_name', { ascending: true });

      if (fetchError) {
        setError('Failed to load models.');
        setModels([]);
        setLoading(false);
        return;
      }

      setModels((data ?? []) as ModelOption[]);
      setLoading(false);
    };

    fetchModels();
  }, []);

  const selectedIds = useMemo(() => new Set(items.map((item) => item.modelId)), [items]);
  const modelById = useMemo(() => new Map(models.map((m) => [m.id, m])), [models]);
  const availableModels = useMemo(
    () => models.filter((model) => !selectedIds.has(model.id)),
    [models, selectedIds],
  );

  const handleAdd = (modelId: string) => {
    if (!modelId) return;
    if (selectedIds.has(modelId)) return;
    onChange([...items, { modelId, compatibilityNote: null }]);
  };

  const handleRemove = (modelId: string) => {
    onChange(items.filter((item) => item.modelId !== modelId));
    if (expandedModelId === modelId) setExpandedModelId(null);
  };

  const updateNote = (modelId: string, compatibilityNote: string) => {
    onChange(
      items.map((item) => (
        item.modelId === modelId
          ? { ...item, compatibilityNote: compatibilityNote.trim() || null }
          : item
      )),
    );
  };

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-200">Model compatibility</h2>
        <p className="mt-1 text-xs text-zinc-500">Add every model this resource was tested against.</p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 size={16} className="animate-spin" />
          Loading models...
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <select
            aria-label="Model compatibility"
            value=""
            onChange={(event) => {
              handleAdd(event.target.value);
              event.target.value = '';
            }}
            disabled={disabled || availableModels.length === 0}
            className="w-full rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">
              {models.length === 0
                ? 'No models available'
                : availableModels.length === 0
                  ? 'All models added'
                  : 'Add a compatible model...'}
            </option>
            {availableModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.display_name ?? model.id}
                {model.default_variant ? ` (${model.default_variant})` : ''}
              </option>
            ))}
          </select>

          {items.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {items.map((item) => {
                const model = modelById.get(item.modelId);
                const label = model?.display_name ?? item.modelId;
                const expanded = expandedModelId === item.modelId;
                const hasNote = Boolean(item.compatibilityNote);

                return (
                  <div key={item.modelId} className="flex w-full flex-col gap-2 rounded-xl border border-white/8 bg-white/[0.04] px-3 py-2 sm:w-auto">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedModelId(expanded ? null : item.modelId)}
                        disabled={disabled}
                        className="text-sm font-medium text-zinc-100 transition hover:text-white"
                      >
                        {label}
                        {hasNote && <span className="ml-1 text-xs text-zinc-500">(note)</span>}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(item.modelId)}
                        disabled={disabled}
                        aria-label={`Remove ${label}`}
                        className="inline-flex items-center justify-center rounded-full p-1 text-zinc-500 transition hover:bg-white/10 hover:text-zinc-200"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    {expanded && (
                      <textarea
                        value={item.compatibilityNote ?? ''}
                        onChange={(event) => updateNote(item.modelId, event.target.value)}
                        disabled={disabled}
                        rows={2}
                        placeholder="Compatibility note (optional)"
                        className="w-full min-w-[16rem] rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ModelCompatibilityPicker;
