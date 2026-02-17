import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ImagePlus } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { MediaUploader } from '@/components/forms/MediaUploader';
import { BASE_MODELS } from '@/pages/Resources/constants';

function getFileExtension(file: File): string {
  const parts = file.name.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'bin';
}

function SubmitArtForm() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [files, setFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [modelId, setModelId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    if (!isSupabaseConfigured || !supabase) {
      setError('Upload service is not configured.');
      return;
    }

    if (!user) {
      setError('You must be signed in to submit art.');
      return;
    }

    setSubmitting(true);

    try {
      const mediaUrls: string[] = [];
      const mediaTypes: string[] = [];

      // Upload each file to Supabase Storage
      for (const file of files) {
        const ext = getFileExtension(file);
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const storagePath = `${user.id}/art/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('user-uploads')
          .upload(storagePath, file, {
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) {
          throw new Error(`Failed to upload "${file.name}": ${uploadError.message}`);
        }

        const { data: publicUrlData } = supabase.storage
          .from('user-uploads')
          .getPublicUrl(storagePath);

        mediaUrls.push(publicUrlData.publicUrl);
        mediaTypes.push(file.type);
      }

      // Determine thumbnail: first image, or first file if no images
      const firstImageIndex = mediaTypes.findIndex(t => t.startsWith('image/'));
      const thumbnailUrl = firstImageIndex >= 0 ? mediaUrls[firstImageIndex] : mediaUrls[0];

      // Parse tags
      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      // Insert into art_pieces
      const { data: insertData, error: insertError } = await supabase
        .from('art_pieces')
        .insert({
          source_type: 'upload',
          user_id: user.id,
          media_urls: mediaUrls,
          media_types: mediaTypes,
          thumbnail_url: thumbnailUrl,
          caption: caption || null,
          tags: tags.length > 0 ? tags : null,
          associated_asset_id: modelId || null,
          status: 'published',
        })
        .select('id')
        .single();

      if (insertError) {
        throw new Error(`Failed to save: ${insertError.message}`);
      }

      const newId = insertData.id;
      const username = profile?.username ?? user.id;
      navigate(`/u/${username}/art/${newId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#0b0b0f] text-zinc-100 min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-16 sm:py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-zinc-900 rounded-lg">
              <ImagePlus size={20} className="text-zinc-100" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Submit Art
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
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
                maxFiles={5}
                maxSizeMB={50}
              />
            </fieldset>

            {/* Caption */}
            <div>
              <label htmlFor="caption" className="block text-sm font-medium text-zinc-300 mb-2">
                Caption
              </label>
              <textarea
                id="caption"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                disabled={submitting}
                rows={3}
                placeholder="Describe your artwork..."
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-colors resize-y"
              />
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-zinc-300 mb-2">
                Tags
              </label>
              <input
                id="tags"
                type="text"
                value={tagsInput}
                onChange={e => setTagsInput(e.target.value)}
                disabled={submitting}
                placeholder="e.g. landscape, surreal, portrait"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-colors"
              />
              <p className="text-xs text-zinc-600 mt-1">Comma-separated</p>
            </div>

            {/* Model Association */}
            <div>
              <label htmlFor="model" className="block text-sm font-medium text-zinc-300 mb-2">
                Model Association
              </label>
              <select
                id="model"
                value={modelId}
                onChange={e => setModelId(e.target.value)}
                disabled={submitting}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-colors appearance-none"
              >
                <option value="">None</option>
                {BASE_MODELS.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.mediaType})
                  </option>
                ))}
              </select>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || files.length === 0}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                'Submit Art'
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

export default function SubmitArt() {
  return (
    <RequireAuth>
      <SubmitArtForm />
    </RequireAuth>
  );
}
