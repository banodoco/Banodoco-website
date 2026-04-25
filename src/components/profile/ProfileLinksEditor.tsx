import { useEffect, useMemo, useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { updateProfileLinks } from '@/lib/profile';

interface ProfileLinksEditorProps {
  initial: string[];
  onSaved?: (links: string[]) => void;
}

const normalizeRows = (values: string[]): string[] => {
  const rows = [...values];
  while (rows.length > 0 && rows[rows.length - 1].trim() === '') {
    rows.pop();
  }
  rows.push('');
  return rows;
};

const filterSavableLinks = (values: string[]): string[] => (
  values
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && value.includes('.'))
);

export function ProfileLinksEditor({ initial, onSaved }: ProfileLinksEditorProps) {
  const initialKey = useMemo(() => JSON.stringify(filterSavableLinks(initial)), [initial]);
  const [links, setLinks] = useState<string[]>(() => normalizeRows(initial));
  const [lastSavedKey, setLastSavedKey] = useState(initialKey);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLinks(normalizeRows(initial));
    setLastSavedKey(initialKey);
  }, [initial, initialKey]);

  const updateRow = (index: number, value: string) => {
    setLinks((current) => {
      const next = [...current];
      next[index] = value;
      return normalizeRows(next);
    });
  };

  const removeRow = (index: number) => {
    setLinks((current) => normalizeRows(current.filter((_, currentIndex) => currentIndex !== index)));
  };

  useEffect(() => {
    const filtered = filterSavableLinks(links);
    const nextKey = JSON.stringify(filtered);
    if (nextKey === lastSavedKey) return undefined;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSaving(true);
      setError(null);

      updateProfileLinks(filtered)
        .then(() => {
          if (cancelled) return;
          setLastSavedKey(nextKey);
          onSaved?.(filtered);
        })
        .catch((saveError) => {
          if (cancelled) return;
          setError(saveError instanceof Error ? saveError.message : 'Failed to save profile links.');
        })
        .finally(() => {
          if (!cancelled) setSaving(false);
        });
    }, 600);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [lastSavedKey, links, onSaved]);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {links.map((link, index) => {
          const trimmed = link.trim();
          const invalid = trimmed.length > 0 && !trimmed.includes('.');
          return (
            <div key={index} className="space-y-1">
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={link}
                  onChange={(event) => updateRow(index, event.target.value)}
                  placeholder="https://example.com"
                  className="min-w-0 flex-1 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 transition-colors focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/50 text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-100"
                  aria-label="Remove profile link"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              {invalid && (
                <p className="text-xs text-amber-200/80">Add a dot for this to be saved.</p>
              )}
            </div>
          );
        })}
      </div>

      <div className="min-h-5">
        {saving && (
          <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
            <Loader2 size={12} className="animate-spin" />
            Saving links
          </span>
        )}
        {error && (
          <p className="text-xs text-red-300">{error}</p>
        )}
      </div>
    </div>
  );
}
