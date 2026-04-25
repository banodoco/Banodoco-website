import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/useAuth';
import { updateBio } from '@/lib/profile';

interface BioAutosaveEditorProps {
  value: string;
  onChange: (next: string) => void;
  onSaved?: (saved: string) => void;
  minLength?: number;
  placeholder?: string;
  rows?: number;
  id?: string;
}

export function BioAutosaveEditor({
  value,
  onChange,
  onSaved,
  minLength = 120,
  placeholder = 'Tell the community what you make, what you are exploring, and what kind of work people can expect from you.',
  rows = 5,
  id,
}: BioAutosaveEditorProps) {
  const { refreshProfile } = useAuth();
  const [lastSaved, setLastSaved] = useState(value);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (value === lastSaved) return undefined;

    let cancelled = false;
    let flashTimer: number | undefined;
    const timer = window.setTimeout(() => {
      setSaving(true);
      setError(null);

      updateBio(value)
        .then(() => refreshProfile())
        .then(() => {
          if (cancelled) return;
          setLastSaved(value);
          onSaved?.(value);
          setSavedFlash(true);
          flashTimer = window.setTimeout(() => {
            if (!cancelled) setSavedFlash(false);
          }, 1800);
        })
        .catch((saveError) => {
          if (cancelled) return;
          setError(saveError instanceof Error ? saveError.message : 'Failed to save bio.');
        })
        .finally(() => {
          if (!cancelled) setSaving(false);
        });
    }, 600);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (flashTimer !== undefined) window.clearTimeout(flashTimer);
    };
  }, [lastSaved, onSaved, refreshProfile, value]);

  const complete = value.length >= minLength;

  return (
    <div className="space-y-2">
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 transition-colors focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
      />
      <div className="flex min-h-6 items-center justify-between gap-3">
        {minLength > 0 ? (
          <p className={`text-xs ${complete ? 'text-zinc-400' : 'text-red-300'}`}>
            {value.length} / {minLength}
          </p>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          {saving && (
            <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
              <Loader2 size={12} className="animate-spin" />
              Saving
            </span>
          )}
          <span
            className={`rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-xs text-emerald-200 transition-opacity duration-300 ${savedFlash ? 'opacity-100' : 'opacity-0'}`}
            aria-live="polite"
          >
            Saved
          </span>
        </div>
      </div>
      {error && (
        <p className="text-xs text-red-300">{error}</p>
      )}
    </div>
  );
}
