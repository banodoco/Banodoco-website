import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Download, ExternalLink, Loader2 } from 'lucide-react';
import { MediaUploader } from '@/components/forms/MediaUploader';
import { buildAgentPrompt } from '@/features/bundlePosts/agentPrompt';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { BundleManifestV1, PostBundleRow } from '@/types/post';

const BUNDLE_UPLOAD_ERRORS: Record<string, string> = {
  bundle_auth_required: 'Sign in again before uploading a bundle.',
  bundle_post_not_found: 'This post draft was not found or you do not have access to it.',
  bundle_not_zip: 'Upload a valid .zip archive.',
  bundle_zip_too_large: 'The zip exceeds the 20 MB upload limit.',
  bundle_too_many_entries: 'The archive contains more than 500 extracted files.',
  bundle_uncompressed_limit_exceeded: 'The extracted bundle exceeds the 20 MB total size limit.',
  bundle_file_too_large: 'One of the extracted files exceeds the 10 MB per-file limit.',
  bundle_ratio_exceeded: 'The archive expansion ratio exceeds the 50:1 safety cap.',
  bundle_invalid_path: 'The archive includes an invalid path. Remove absolute or traversal paths and try again.',
  bundle_symlink_disallowed: 'Symlinks are not allowed inside bundle archives.',
  bundle_extension_disallowed: 'The archive contains a file type that bundle mode does not allow.',
  bundle_manifest_missing: 'The zip must include a post.json manifest at the root.',
  bundle_manifest_invalid: 'The post.json manifest is invalid.',
  bundle_duplicate_upload: 'This exact bundle has already been uploaded for the post.',
  bundle_storage_write_failed: 'The upload could not be staged in storage. Try again.',
  bundle_register_failed: 'The bundle could not be registered. Try again.',
  bundle_promotion_failed: 'The bundle uploaded but could not be promoted into its final version.',
};

interface BundleUploadProps {
  postId: string | null;
  title?: string;
}

interface ProcessBundleResponse {
  bundleVersionId: string;
  previewUrl: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function shortenSha(sha: string): string {
  return sha.slice(0, 12);
}

function getReviewBadgeClass(status: PostBundleRow['review_status']): string {
  switch (status) {
    case 'approved':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200';
    case 'rejected':
      return 'border-red-500/30 bg-red-500/10 text-red-200';
    default:
      return 'border-amber-500/30 bg-amber-500/10 text-amber-100';
  }
}

async function getFunctionErrorCode(error: unknown): Promise<string | null> {
  if (!error || typeof error !== 'object') return null;

  const maybeContext = (error as { context?: Response }).context;
  if (maybeContext) {
    try {
      const payload = await maybeContext.clone().json() as {
        code?: unknown;
        error?: { code?: unknown } | string;
      };
      // process-bundle returns { error: { code, message } }; older surfaces
      // returned { code, ... }. Accept both shapes.
      if (
        payload.error &&
        typeof payload.error === 'object' &&
        typeof (payload.error as { code?: unknown }).code === 'string'
      ) {
        return (payload.error as { code: string }).code;
      }
      if (typeof payload.code === 'string') return payload.code;
    } catch {
      // Ignore invalid JSON payloads and fall back to message parsing below.
    }
  }

  const message = (error as { message?: unknown }).message;
  if (typeof message === 'string' && message in BUNDLE_UPLOAD_ERRORS) {
    return message;
  }

  return null;
}

function isBundleManifestV1(value: unknown): value is BundleManifestV1 {
  return Boolean(value && typeof value === 'object' && 'schemaVersion' in value);
}

export function BundleUpload({ postId, title = '' }: BundleUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [latestBundle, setLatestBundle] = useState<PostBundleRow | null>(null);
  const [loadingLatest, setLoadingLatest] = useState(false);

  const promptTitle = useMemo(() => title.trim() || 'Untitled bundle post', [title]);

  const loadLatestBundle = useCallback(async () => {
    if (!postId || !isSupabaseConfigured || !supabase) {
      setLatestBundle(null);
      return;
    }

    setLoadingLatest(true);

    const { data, error } = await supabase
      .from('post_bundles')
      .select('id, post_id, version, storage_prefix, manifest, size_bytes, file_count, sha256, review_status, review_notes, uploaded_by, uploaded_at, reviewed_by, reviewed_at')
      .eq('post_id', postId)
      .order('uploaded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      setLatestBundle(null);
      setLoadingLatest(false);
      return;
    }

    setLatestBundle(data as PostBundleRow);
    setLoadingLatest(false);
  }, [postId]);

  useEffect(() => {
    void loadLatestBundle();
  }, [loadLatestBundle]);

  const handleCopyPrompt = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(buildAgentPrompt({ postTitle: promptTitle }));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setErrorMessage('Could not copy the agent prompt. Copy it manually from the spec for now.');
    }
  }, [promptTitle]);

  const handleFilesSelected = useCallback(async (selectedFiles: File[]) => {
    const nextFile = selectedFiles[0];
    if (!nextFile) return;

    setFiles([nextFile]);
    setErrorMessage(null);
    setPreviewUrl(null);

    if (!postId) {
      setErrorMessage('Create the post draft before uploading a bundle.');
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage('Supabase is not configured.');
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append('postId', postId);
    formData.append('zip', nextFile);

    try {
      const { data, error } = await supabase.functions.invoke<ProcessBundleResponse>('process-bundle', {
        body: formData,
      });

      if (error || !data) {
        const code = await getFunctionErrorCode(error);
        setErrorMessage(code ? BUNDLE_UPLOAD_ERRORS[code] : 'Bundle upload failed. Try again.');
        return;
      }

      setPreviewUrl(data.previewUrl);
      setFiles([]);
      await loadLatestBundle();
    } catch (error) {
      const code = await getFunctionErrorCode(error);
      setErrorMessage(code ? BUNDLE_UPLOAD_ERRORS[code] : 'Bundle upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  }, [loadLatestBundle, postId]);

  const latestManifest = isBundleManifestV1(latestBundle?.manifest) ? latestBundle.manifest : null;

  return (
    <div className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">Bundle upload</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Upload a reviewed static bundle for this post. ZIP contents must include <code>post.json</code> and <code>index.html</code>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleCopyPrompt()}
            title="Copy a ready-made prompt for Claude Code, Cursor, Aider, or any coding agent. The prompt encodes all the validation rules and asks the agent to clone the starter repo as its starting point."
            className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(249,115,22,0.25)] transition-colors hover:bg-orange-500"
          >
            <Copy size={15} />
            {copied ? 'Copied' : 'Copy agent prompt'}
          </button>
          <a
            href="/bundle-starter.zip"
            download
            title="Download the same starter as a ZIP — same files as the GitHub repo, no Git required."
            className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-3 py-2 text-sm text-zinc-100 transition-colors hover:border-zinc-500 hover:bg-zinc-900"
          >
            <Download size={15} />
            Download starter (.zip)
          </a>
        </div>
      </div>

      <MediaUploader
        files={files}
        onFilesSelected={(selectedFiles) => {
          void handleFilesSelected(selectedFiles);
        }}
        onRemoveFile={() => {
          if (!uploading) setFiles([]);
        }}
        accept=".zip,application/zip"
        maxFiles={1}
        maxSizeMB={20}
      />

      {uploading && (
        <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-300">
          <Loader2 size={16} className="animate-spin" />
          Processing bundle archive and issuing preview...
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </div>
      )}

      {previewUrl && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          <p>Bundle uploaded successfully.</p>
          <a
            href={previewUrl}
            className="mt-2 inline-flex items-center gap-1 text-emerald-200 hover:text-white"
          >
            Open preview
            <ExternalLink size={14} />
          </a>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-zinc-100">Most recent bundle version</h3>
          {loadingLatest && <Loader2 size={16} className="animate-spin text-zinc-500" />}
        </div>

        {!loadingLatest && !latestBundle && (
          <p className="mt-3 text-sm text-zinc-500">No bundle versions uploaded yet.</p>
        )}

        {latestBundle && latestManifest && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${getReviewBadgeClass(latestBundle.review_status)}`}>
                {latestBundle.review_status}
              </span>
              <span className="text-xs text-zinc-500">Version {latestBundle.version}</span>
            </div>

            <div>
              <p className="text-sm font-medium text-zinc-100">{latestManifest.title}</p>
              {latestManifest.summary && (
                <p className="mt-1 text-sm text-zinc-400">{latestManifest.summary}</p>
              )}
            </div>

            <div className="grid gap-2 text-sm text-zinc-400 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Size</p>
                <p className="mt-1 text-zinc-200">{formatBytes(latestBundle.size_bytes)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Files</p>
                <p className="mt-1 text-zinc-200">{latestBundle.file_count}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">SHA-256</p>
                <p className="mt-1 font-mono text-zinc-200">{shortenSha(latestBundle.sha256)}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
