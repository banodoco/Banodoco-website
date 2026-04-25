import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export interface PendingApprovalRow {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  bio_snapshot?: string | null;
  attached_media_id: string | null;
  attached_resource_id: string | null;
  posted_message_id: number | null;
  embed_dirty?: boolean;
  embed_updated_at?: string | null;
  created_at: string;
}

interface UsePendingApprovalResult {
  pendingApproval: PendingApprovalRow | null;
  loading: boolean;
  error: string | null;
}

export const usePendingApproval = (
  memberId: string | null | undefined,
): UsePendingApprovalResult => {
  const [pendingApproval, setPendingApproval] = useState<PendingApprovalRow | null>(null);
  const [loading, setLoading] = useState(Boolean(memberId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = supabase;

    if (!memberId) {
      setPendingApproval(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured || !client) {
      setPendingApproval(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchPendingApproval = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await client
          .from('approval_requests')
          .select('id, status, bio_snapshot, attached_media_id, attached_resource_id, posted_message_id, embed_dirty, embed_updated_at, created_at')
          .eq('member_id', memberId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!cancelled) {
          setPendingApproval((data ?? null) as PendingApprovalRow | null);
        }
      } catch {
        if (!cancelled) {
          setPendingApproval(null);
          setError('Failed to load approval status.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchPendingApproval();

    return () => {
      cancelled = true;
    };
  }, [memberId]);

  return { pendingApproval, loading, error };
};
