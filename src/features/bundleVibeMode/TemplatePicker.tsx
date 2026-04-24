/**
 * Vibe Mode — starter-template picker.
 *
 * Shown when the virtual file tree is empty. Uses `import.meta.glob`
 * to statically bundle the five templates + their `_meta.json`s at
 * build time (so tree-shakability stays hermetic — templates ship in
 * the lazy BundleAgentEditor chunk, not the main chunk).
 */

import { useMemo } from 'react';
import { listTemplateEntries, type TemplateEntry } from './templates';

export interface TemplatePickerProps {
  onPick(entry: TemplateEntry): void;
  onStartBlank?(): void;
  onImportZip?(): void;
}

export function TemplatePicker({ onPick, onStartBlank, onImportZip }: TemplatePickerProps) {
  const entries = useMemo(() => listTemplateEntries(), []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-zinc-100">Pick a starter</h2>
        <p className="mt-1 text-sm text-zinc-400">Or start blank and describe what you want in chat.</p>
      </div>
      <div className="grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2">
        {entries.map((entry) => (
          <button
            key={entry.meta.id}
            type="button"
            onClick={() => onPick(entry)}
            className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-4 text-left transition hover:border-zinc-500 hover:bg-zinc-800/70"
          >
            <div className="text-sm font-semibold text-zinc-100">{entry.meta.label}</div>
            <div className="mt-1 text-xs text-zinc-400">{entry.meta.description}</div>
          </button>
        ))}
      </div>
      {(onStartBlank || onImportZip) && (
        <div className="flex items-center gap-4">
          {onStartBlank && (
            <button
              type="button"
              onClick={onStartBlank}
              className="text-xs text-zinc-400 underline-offset-4 hover:text-zinc-200 hover:underline"
            >
              Start blank
            </button>
          )}
          {onImportZip && (
            <button
              type="button"
              onClick={onImportZip}
              className="text-xs text-zinc-400 underline-offset-4 hover:text-zinc-200 hover:underline"
            >
              Import .zip
            </button>
          )}
        </div>
      )}
    </div>
  );
}
