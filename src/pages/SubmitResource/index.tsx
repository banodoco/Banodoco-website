import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, BookOpen } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { MediaUploader } from '@/components/forms/MediaUploader';

const RESOURCE_TYPES = [
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'tool', label: 'Tool' },
  { value: 'model', label: 'Model' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'other', label: 'Other' },
] as const;

function getFileExtension(file: File): string {
  const parts = file.name.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : 'bin';
}

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function SubmitResourceForm() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [primaryUrl, setPrimaryUrl] = useState('');
  const [additionalUrlsInput, setAdditionalUrlsInput] = useState('');
  const [resourceType, setResourceType] = useState<string>('tutorial');
  const [tagsInput, setTagsInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
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

    if (!title.trim()) {
      setError('Title is required.');
      return;
    }

    if (!primaryUrl.trim()) {
      setError('Primary URL is required.');
      return;
    }

    if (!isValidUrl(primaryUrl.trim())) {
      setError('Please enter a valid URL (including https://).');
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setError('Upload service is not configured.');
      return;
    }

    if (!user) {
      setError('You must be signed in to submit a resource.');
      return;
    }

    setSubmitting(true);

    try {
      let mediaUrls: string[] = [];
      let mediaTypes: string[] = [];
      let thumbnailUrl: string | null = null;

      // Upload media files if any
      if (files.length > 0) {
        for (const file of files) {
          const ext = getFileExtension(file);
          const fileName = `${crypto.randomUUID()}.${ext}`;
          const storagePath = `${user.id}/resources/${fileName}`;

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

        // Thumbnail: first image, or first file
        const firstImageIndex = mediaTypes.findIndex(t => t.startsWith('image/'));
        thumbnailUrl = firstImageIndex >= 0 ? mediaUrls[firstImageIndex] : mediaUrls[0];
      }

      // Parse additional URLs
      const additionalUrls = additionalUrlsInput
        .split('\n')
        .map(u => u.trim())
        .filter(Boolean);

      // Parse tags
      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      // Insert into community_resources
      const { data: insertData, error: insertError } = await supabase
        .from('community_resources')
        .insert({
          source_type: 'upload',
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          primary_url: primaryUrl.trim(),
          additional_urls: additionalUrls.length > 0 ? additionalUrls : null,
          resource_type: resourceType,
          tags: tags.length > 0 ? tags : null,
          media_urls: mediaUrls.length > 0 ? mediaUrls : null,
          media_types: mediaTypes.length > 0 ? mediaTypes : null,
          thumbnail_url: thumbnailUrl,
          status: 'published',
        })
        .select('id')
        .single();

      if (insertError) {
        throw new Error(`Failed to save: ${insertError.message}`);
      }

      const newId = insertData.id;
      const username = profile?.username ?? user.id;
      navigate(`/u/${username}/resources/${newId}`);
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
              <BookOpen size={20} className="text-zinc-100" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Submit Resource
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-zinc-300 mb-2">
                Title <span className="text-red-400">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                disabled={submitting}
                placeholder="Resource title"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-colors"
              />
            </div>

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
                rows={4}
                placeholder="Describe this resource..."
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-colors resize-y"
              />
            </div>

            {/* Primary URL */}
            <div>
              <label htmlFor="primary-url" className="block text-sm font-medium text-zinc-300 mb-2">
                Primary URL <span className="text-red-400">*</span>
              </label>
              <input
                id="primary-url"
                type="url"
                value={primaryUrl}
                onChange={e => setPrimaryUrl(e.target.value)}
                disabled={submitting}
                placeholder="https://..."
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-colors"
              />
            </div>

            {/* Additional URLs */}
            <div>
              <label htmlFor="additional-urls" className="block text-sm font-medium text-zinc-300 mb-2">
                Additional URLs
              </label>
              <textarea
                id="additional-urls"
                value={additionalUrlsInput}
                onChange={e => setAdditionalUrlsInput(e.target.value)}
                disabled={submitting}
                rows={3}
                placeholder={"https://example.com/related\nhttps://example.com/docs"}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-colors resize-y"
              />
              <p className="text-xs text-zinc-600 mt-1">One URL per line</p>
            </div>

            {/* Resource Type */}
            <div>
              <label htmlFor="resource-type" className="block text-sm font-medium text-zinc-300 mb-2">
                Resource Type
              </label>
              <select
                id="resource-type"
                value={resourceType}
                onChange={e => setResourceType(e.target.value)}
                disabled={submitting}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-colors appearance-none"
              >
                {RESOURCE_TYPES.map(rt => (
                  <option key={rt.value} value={rt.value}>
                    {rt.label}
                  </option>
                ))}
              </select>
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
                placeholder="e.g. comfyui, animation, lora"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-colors"
              />
              <p className="text-xs text-zinc-600 mt-1">Comma-separated</p>
            </div>

            {/* Media Upload */}
            <fieldset disabled={submitting}>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Media (optional)
              </label>
              <MediaUploader
                files={files}
                onFilesSelected={handleFilesSelected}
                onRemoveFile={handleRemoveFile}
                accept="image/*,video/*"
                maxFiles={3}
                maxSizeMB={50}
              />
            </fieldset>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !title.trim() || !primaryUrl.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Uploading...
                </>
              ) : (
                'Submit Resource'
              )}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

export default function SubmitResource() {
  return (
    <RequireAuth>
      <SubmitResourceForm />
    </RequireAuth>
  );
}
