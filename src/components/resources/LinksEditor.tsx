import { useState } from 'react';
import { ExternalLink, FileArchive, Link2, Loader2, Trash2, Upload } from 'lucide-react';
import { MediaUploader } from '@/components/forms/MediaUploader';
import type { ResourceLinkInput } from '@/lib/resources';

type ResourceMode = 'link' | 'upload';

interface LinksEditorProps {
  links: ResourceLinkInput[];
  onChange: (links: ResourceLinkInput[]) => void;
  disabled?: boolean;
  mode: ResourceMode;
  onModeChange: (mode: ResourceMode) => void;
  resourceType: string;
  onUpload: (files: File[]) => Promise<ResourceLinkInput[]>;
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function normalizeLinkMode(links: ResourceLinkInput[]): ResourceLinkInput[] {
  return links.length > 0 ? links : [{ label: 'Resource', url: '', source: 'link' }];
}

function acceptedTypesFor(resourceType: string): string {
  if (resourceType === 'workflow') return '.json,.zip,.yaml,.yml,.txt';
  return '.safetensors,.ckpt,.pt,.pth,.bin,.zip,.json,.txt';
}

function resourceHint(resourceType: string): string {
  if (resourceType === 'workflow') {
    return 'Upload workflow JSON, ZIP packs, or supporting files. Each file can have its own optional name and description.';
  }

  return 'For LoRA/model resources, a Hugging Face repo URL is usually best. If you upload files here, they are listed together as one resource with file links.';
}

export function LinksEditor({
  links,
  onChange,
  disabled = false,
  mode,
  onModeChange,
  resourceType,
  onUpload,
}: LinksEditorProps) {
  const safeLinks = normalizeLinkMode(links);
  const primaryLink = safeLinks[0] ?? { label: 'Resource', url: '', source: 'link' };
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchMode = (nextMode: ResourceMode) => {
    setError(null);
    onModeChange(nextMode);
    if (nextMode === 'link') {
      onChange([{ label: 'Resource', url: '', source: 'link' }]);
    } else if (safeLinks.length === 1 && !safeLinks[0].url.trim()) {
      onChange([]);
    }
  };

  const updateLink = (index: number, patch: Partial<ResourceLinkInput>) => {
    onChange(
      safeLinks.map((link, currentIndex) => (
        currentIndex === index ? { ...link, ...patch } : link
      )),
    );
  };

  const removeLink = (index: number) => {
    onChange(safeLinks.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleFilesSelected = async (files: File[]) => {
    setPendingFiles((current) => [...current, ...files]);
    setUploading(true);
    setError(null);

    try {
      const uploadedLinks = await onUpload(files);
      onChange([...safeLinks.filter((link) => link.url.trim()), ...uploadedLinks]);
      setPendingFiles([]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Failed to upload resource files.');
      setPendingFiles([]);
    } finally {
      setUploading(false);
    }
  };

  const linkInvalid = Boolean(primaryLink.url.trim()) && !isValidUrl(primaryLink.url.trim());

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ExternalLink size={16} className="text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-200">Resource</h2>
        </div>
        <div className="inline-grid grid-cols-2 rounded-lg border border-white/10 bg-zinc-950/50 p-1 text-xs">
          <button
            type="button"
            onClick={() => switchMode('link')}
            disabled={disabled || uploading}
            className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${
              mode === 'link'
                ? 'bg-white/10 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-100'
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <Link2 size={12} />
            Link
          </button>
          <button
            type="button"
            onClick={() => switchMode('upload')}
            disabled={disabled || uploading}
            className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition ${
              mode === 'upload'
                ? 'bg-white/10 text-zinc-100'
                : 'text-zinc-400 hover:text-zinc-100'
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <Upload size={12} />
            Upload
          </button>
        </div>
      </div>

      <p className="text-xs text-zinc-500">{resourceHint(resourceType)}</p>

      {mode === 'link' ? (
        <div className="space-y-2">
          <input
            type="text"
            value={primaryLink.label}
            onChange={(event) => onChange([{
              ...primaryLink,
              label: event.target.value,
              source: 'link',
            }])}
            disabled={disabled}
            placeholder="Label"
            className="sr-only"
            aria-hidden="true"
            tabIndex={-1}
          />
          <input
            type="url"
            value={primaryLink.url}
            onChange={(event) => onChange([{
              ...primaryLink,
              label: primaryLink.label.trim() || 'Resource',
              url: event.target.value,
              source: 'link',
            }])}
            disabled={disabled}
            placeholder="https://example.com/resource"
            className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 disabled:cursor-not-allowed disabled:opacity-60"
          />
          {linkInvalid && (
            <p className="text-xs text-red-300">Use a full URL including `https://`.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <MediaUploader
            files={pendingFiles}
            onFilesSelected={handleFilesSelected}
            onRemoveFile={(index) => {
              setPendingFiles((current) => current.filter((_, currentIndex) => currentIndex !== index));
            }}
            accept={acceptedTypesFor(resourceType)}
            maxFiles={resourceType === 'workflow' ? 12 : 8}
            maxSizeMB={500}
          />

          {uploading && (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Loader2 size={16} className="animate-spin" />
              Uploading resource files...
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-300">
              {error}
            </div>
          )}

          {safeLinks.some((link) => link.url.trim()) && (
            <div className="space-y-3">
              {safeLinks.map((link, index) => {
                if (!link.url.trim()) return null;

                return (
                  <div key={`${link.url}-${index}`} className="grid gap-3 rounded-xl border border-white/8 bg-white/[0.03] p-3 md:grid-cols-[1fr,1.5fr,auto]">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-950 text-zinc-300">
                        <FileArchive size={18} />
                      </div>
                      <div className="min-w-0">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block truncate text-sm font-medium text-zinc-100 hover:text-white"
                        >
                          {link.fileName ?? link.label}
                        </a>
                        <p className="truncate text-xs text-zinc-500">{link.url}</p>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <input
                        type="text"
                        value={link.label}
                        onChange={(event) => updateLink(index, { label: event.target.value })}
                        disabled={disabled}
                        placeholder="Name (optional)"
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                      <textarea
                        value={link.description ?? ''}
                        onChange={(event) => updateLink(index, { description: event.target.value })}
                        disabled={disabled}
                        rows={2}
                        placeholder="Description (optional)"
                        className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeLink(index)}
                      disabled={disabled || uploading}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={`Remove uploaded file ${index + 1}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default LinksEditor;
