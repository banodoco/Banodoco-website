import { ExternalLink, Plus, Trash2 } from 'lucide-react';
import type { ResourceLinkInput } from '@/lib/resources';

interface LinksEditorProps {
  links: ResourceLinkInput[];
  onChange: (links: ResourceLinkInput[]) => void;
  disabled?: boolean;
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function normalizeLinks(links: ResourceLinkInput[]): ResourceLinkInput[] {
  return links.length > 0 ? links : [{ label: '', url: '' }];
}

export function LinksEditor({
  links,
  onChange,
  disabled = false,
}: LinksEditorProps) {
  const safeLinks = normalizeLinks(links);

  const updateLink = (index: number, patch: Partial<ResourceLinkInput>) => {
    onChange(
      safeLinks.map((link, currentIndex) => (
        currentIndex === index ? { ...link, ...patch } : link
      )),
    );
  };

  const addLink = () => {
    onChange([...safeLinks, { label: '', url: '' }]);
  };

  const removeLink = (index: number) => {
    const nextLinks = safeLinks.filter((_, currentIndex) => currentIndex !== index);
    onChange(normalizeLinks(nextLinks));
  };

  return (
    <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ExternalLink size={16} className="text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-200">External links</h2>
        </div>
        <button
          type="button"
          onClick={addLink}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus size={12} />
          Add link
        </button>
      </div>

      <div className="space-y-3">
        {safeLinks.map((link, index) => {
          const hasPartialValue = Boolean(link.label.trim() || link.url.trim());
          const urlInvalid = Boolean(link.url.trim()) && !isValidUrl(link.url.trim());
          const labelMissing = Boolean(link.url.trim()) && !link.label.trim();

          return (
            <div
              key={`resource-link-${index}`}
              className="rounded-xl border border-white/8 bg-black/10 p-3"
            >
              <div className="grid gap-3 md:grid-cols-[1fr,1.6fr,auto] md:items-start">
                <input
                  type="text"
                  value={link.label}
                  onChange={(event) => updateLink(index, { label: event.target.value })}
                  disabled={disabled}
                  placeholder="Label"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
                <input
                  type="url"
                  value={link.url}
                  onChange={(event) => updateLink(index, { url: event.target.value })}
                  disabled={disabled}
                  placeholder="https://example.com/resource"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
                />
                <button
                  type="button"
                  onClick={() => removeLink(index)}
                  disabled={disabled || (safeLinks.length === 1 && !hasPartialValue)}
                  className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Remove link ${index + 1}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {(urlInvalid || labelMissing) && (
                <div className="mt-2 text-xs text-red-300">
                  {urlInvalid && <p>Use a full URL including `https://`.</p>}
                  {labelMissing && <p>Add a label so readers know what this link does.</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LinksEditor;
