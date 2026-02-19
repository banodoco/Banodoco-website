import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ImagePlus } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { MediaUploader } from '@/components/forms/MediaUploader';
import { buildArtPath } from '@/lib/routing';

function SubmitArtForm() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [files, setFiles] = useState<File[]>([]);
  const [description, setDescription] = useState('');
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
      // For each file, insert a row into media table
      // For now we support single-file upload (first file)
      const file = files[0];
      const isVideo = file.type.startsWith('video/');
      const mediaType = isVideo ? 'video' : 'image';

      // Upload file to Supabase Storage
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin';
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

      const fileUrl = publicUrlData.publicUrl;

      // Insert into media table
      const { data: insertData, error: insertError } = await supabase
        .from('media')
        .insert({
          type: mediaType,
          description: description || null,
          user_id: user.id,
          admin_status: 'Listed',
          user_status: 'Listed',
          cloudflare_thumbnail_url: fileUrl,
        })
        .select('id')
        .single();

      if (insertError) {
        throw new Error(`Failed to save: ${insertError.message}`);
      }

      const newId = insertData.id;
      navigate(buildArtPath(newId, description || file.name, profile?.username ?? null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#0b0b0f] text-zinc-100 min-h-screen">
      <div className="max-w-2xl mx-auto px-6 pt-24 pb-16 sm:pt-28 sm:pb-24">
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
