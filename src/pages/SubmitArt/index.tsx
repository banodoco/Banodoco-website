import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, ImagePlus } from 'lucide-react';
import { useAuth } from '@/contexts/useAuth';
import { RequireApproved } from '@/components/auth/RequireApproved';
import { MediaUploader } from '@/components/forms/MediaUploader';
import { Seo } from '@/components/seo/Seo';
import { createArtMedia } from '@/lib/media';
import { buildArtPath } from '@/lib/routing';

export interface SubmitArtFormData {
  file: File;
  title: string;
  description: string;
  selfAttributed: true;
}

export interface SubmitArtFormProps {
  inline?: boolean;
  mode?: 'publish' | 'approval-request';
  onSubmit: (data: SubmitArtFormData) => Promise<void>;
  submitDisabled?: boolean;
  submitLabel?: string;
  submitTitle?: string;
  onValidityChange?: (valid: boolean) => void;
  onBack?: () => void;
}

export function SubmitArtForm({
  inline = false,
  mode = 'publish',
  onSubmit,
  submitDisabled = false,
  submitLabel = 'Submit Art',
  submitTitle,
  onValidityChange,
  onBack,
}: SubmitArtFormProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selfAttributed, setSelfAttributed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formValid = files.length > 0 && Boolean(title.trim()) && selfAttributed;

  useEffect(() => {
    onValidityChange?.(formValid);
  }, [formValid, onValidityChange]);

  const handleFilesSelected = useCallback((incoming: File[]) => {
    setFiles(prev => [...prev, ...incoming]);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (files.length === 0) {
      setError('Please select at least one media file.');
      return;
    }

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError('Please add a title.');
      return;
    }

    if (!selfAttributed) {
      setError('Please confirm that you made this.');
      return;
    }

    setSubmitting(true);

    try {
      const file = files[0];
      await onSubmit({
        file,
        title: trimmedTitle,
        description,
        selfAttributed: true,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  const suppressChrome = inline || mode === 'approval-request';
  const pageWrapperClass = suppressChrome
    ? 'space-y-6'
    : 'bg-[#0b0b0f] text-zinc-100 min-h-screen';
  const contentWrapperClass = suppressChrome
    ? ''
    : 'max-w-2xl mx-auto px-6 pt-24 pb-16 sm:pt-28 sm:pb-24';

  return (
    <div className={pageWrapperClass}>
      {!suppressChrome && <Seo title="Submit Art | Banodoco" />}
      <div className={contentWrapperClass}>
        <motion.div
          initial={suppressChrome ? false : { opacity: 0, y: 20 }}
          animate={suppressChrome ? undefined : { opacity: 1, y: 0 }}
          transition={suppressChrome ? undefined : { duration: 0.5 }}
        >
          {/* Header */}
          {!suppressChrome && <div className="flex items-center gap-3 mb-8">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/70 text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
                aria-label="Go back"
              >
                <ArrowLeft size={18} />
              </button>
            )}
            <div className="p-2 bg-zinc-900 rounded-lg">
              <ImagePlus size={20} className="text-zinc-100" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Submit Art
            </h1>
          </div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="art-title" className="block text-sm font-medium text-zinc-300 mb-2">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                id="art-title"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                disabled={submitting}
                placeholder="Give your artwork a title"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            {/* Media Upload */}
            <fieldset disabled={submitting}>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Media <span className="text-red-400">*</span>
              </label>
              <MediaUploader
                files={files}
                onFilesSelected={handleFilesSelected}
                onRemoveFile={handleRemoveFile}
                accept="image/*,video/*"
                maxFiles={1}
                maxSizeMB={50}
              />
            </fieldset>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-zinc-300 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={e => setDescription(e.target.value)}
                disabled={submitting}
                rows={3}
                placeholder="Describe your artwork..."
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-colors resize-y"
              />
            </div>

            <label className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <input
                type="checkbox"
                checked={selfAttributed}
                onChange={(event) => setSelfAttributed(event.target.checked)}
                disabled={submitting}
                required
                className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-orange-500 focus:ring-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <span>
                <span className="block text-sm font-medium text-zinc-200">I made this.</span>
                <span className="mt-1 block text-xs text-zinc-500">
                  Only share things you personally made or agentically directed.
                </span>
              </span>
            </label>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || submitDisabled || !formValid}
              title={submitTitle}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                submitLabel
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

export default function SubmitArt() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const handlePublish = async (data: SubmitArtFormData) => {
    if (!user || !profile?.memberId) {
      throw new Error('You must be signed in with a linked Discord account to submit art.');
    }

    const created = await createArtMedia({
      file: data.file,
      title: data.title,
      description: data.description,
      memberId: profile.memberId,
      userId: user.id,
      hidden: false,
      selfAttributed: data.selfAttributed,
    });

    navigate(buildArtPath(created.id, data.title, profile.discordUsername ?? null));
  };

  return (
    <RequireApproved>
      <SubmitArtForm onSubmit={handlePublish} onBack={() => navigate(-1)} />
    </RequireApproved>
  );
}
