import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, BookOpen } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { RequireAuth } from '@/components/auth/RequireAuth';

const RESOURCE_TYPES = [
  { value: 'lora', label: 'LoRA' },
  { value: 'workflow', label: 'Workflow' },
] as const;

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

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loraLink, setLoraLink] = useState('');
  const [resourceType, setResourceType] = useState<string>('lora');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }

    if (loraLink.trim() && !isValidUrl(loraLink.trim())) {
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
      const { data: insertData, error: insertError } = await supabase
        .from('assets')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          type: resourceType,
          lora_link: loraLink.trim() || null,
          user_id: user.id,
          admin_status: 'Listed',
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
      <div className="max-w-2xl mx-auto px-6 pt-24 pb-16 sm:pt-28 sm:pb-24">
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
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-2">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                disabled={submitting}
                placeholder="Resource name"
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

            {/* Link */}
            <div>
              <label htmlFor="lora-link" className="block text-sm font-medium text-zinc-300 mb-2">
                Link
              </label>
              <input
                id="lora-link"
                type="url"
                value={loraLink}
                onChange={e => setLoraLink(e.target.value)}
                disabled={submitting}
                placeholder="https://..."
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-colors"
              />
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

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || !name.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Submitting...
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
