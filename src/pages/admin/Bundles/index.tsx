import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { PostBundleRow, PostStatus, PostAdminStatus } from '@/types/post';

interface PendingBundleRow extends PostBundleRow {
  posts: {
    id: string;
    title: string;
    slug: string | null;
    status: PostStatus;
    admin_status: PostAdminStatus | null;
    member_id: string | null;
  } | null;
  uploader: {
    username: string | null;
    global_name: string | null;
  } | null;
}

interface MemberLookupRow {
  auth_user_id: string | null;
  username: string | null;
  global_name: string | null;
  member_id: string;
}

interface RejectModalState {
  bundleId: string;
  notes: string;
  submitting: boolean;
  error: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function shortSha(sha: string): string {
  return sha ? sha.slice(0, 12) : '';
}

function uploaderLabel(row: PendingBundleRow): string {
  const name = row.uploader?.global_name ?? row.uploader?.username ?? null;
  return name ?? 'Unknown uploader';
}

const AdminBundles = () => {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rows, setRows] = useState<PendingBundleRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionState, setActionState] = useState<{ id: string; verb: 'approving' } | null>(null);
  const [rejectModal, setRejectModal] = useState<RejectModalState | null>(null);

  // Admin gate: inline rpc('is_admin') check, no new useAdmin hook.
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!supabase) {
        navigate('/', { replace: true });
        return;
      }
      const { data, error: rpcError } = await supabase.rpc('is_admin');
      if (cancelled) return;
      if (rpcError || !data) {
        navigate('/', { replace: true });
        return;
      }
      setIsAdmin(true);
      setAuthChecked(true);
    };
    check();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const loadQueue = useCallback(async () => {
    setError(null);
    if (!supabase) {
      setError('Supabase is not configured.');
      setRows([]);
      return;
    }
    const { data, error: queryError } = await supabase
      .from('post_bundles')
      .select(
        'id, post_id, version, storage_prefix, manifest, size_bytes, file_count, sha256, review_status, review_notes, uploaded_by, uploaded_at, reviewed_by, reviewed_at, posts:post_id (id, title, slug, status, admin_status, member_id:member_id::text)',
      )
      .eq('review_status', 'pending')
      .order('uploaded_at', { ascending: true });
    if (queryError) {
      setError(queryError.message);
      setRows([]);
      return;
    }
    const normalizedWithoutUploader = (data ?? []).map((row) => {
      const r = row as unknown as PendingBundleRow & {
        posts: PendingBundleRow['posts'] | PendingBundleRow['posts'][];
      };
      const posts = Array.isArray(r.posts) ? (r.posts[0] ?? null) : (r.posts ?? null);
      return { ...r, posts, uploader: null } as PendingBundleRow;
    });

    // Resolve uploader usernames via members.auth_user_id.
    const authIds = Array.from(
      new Set(normalizedWithoutUploader.map((r) => r.uploaded_by).filter(Boolean)),
    );
    const memberMap = new Map<string, MemberLookupRow>();
    if (authIds.length > 0) {
      const { data: memberRows } = await supabase
        .from('members')
        .select('member_id:member_id::text, username, global_name, auth_user_id')
        .in('auth_user_id', authIds);
      for (const m of (memberRows ?? []) as MemberLookupRow[]) {
        if (m.auth_user_id) memberMap.set(m.auth_user_id, m);
      }
    }

    const normalized = normalizedWithoutUploader.map((r) => ({
      ...r,
      uploader: r.uploaded_by
        ? {
            username: memberMap.get(r.uploaded_by)?.username ?? null,
            global_name: memberMap.get(r.uploaded_by)?.global_name ?? null,
          }
        : null,
    })) as PendingBundleRow[];
    setRows(normalized);
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    void loadQueue();
  }, [isAdmin, loadQueue]);

  const handleApprove = async (bundleId: string) => {
    if (!supabase) return;
    setActionState({ id: bundleId, verb: 'approving' });
    setError(null);
    const priorRows = rows;
    // Optimistic removal.
    setRows((prev) => (prev ? prev.filter((r) => r.id !== bundleId) : prev));
    const { error: rpcError } = await supabase.rpc('approve_bundle', { p_bundle_id: bundleId });
    setActionState(null);
    if (rpcError) {
      setError(rpcError.message);
      setRows(priorRows ?? null);
      await loadQueue();
    }
  };

  const openRejectModal = (bundleId: string) => {
    setRejectModal({ bundleId, notes: '', submitting: false, error: null });
  };

  const closeRejectModal = () => {
    setRejectModal(null);
  };

  const submitReject = async () => {
    if (!rejectModal || !supabase) return;
    const { bundleId, notes } = rejectModal;
    setRejectModal({ ...rejectModal, submitting: true, error: null });
    const priorRows = rows;
    // Optimistic removal.
    setRows((prev) => (prev ? prev.filter((r) => r.id !== bundleId) : prev));
    const { error: rpcError } = await supabase.rpc('reject_bundle', {
      p_bundle_id: bundleId,
      p_review_notes: notes,
    });
    if (rpcError) {
      setRejectModal({ ...rejectModal, submitting: false, error: rpcError.message });
      setRows(priorRows ?? null);
      await loadQueue();
      return;
    }
    setRejectModal(null);
  };

  const queue = useMemo(() => rows ?? [], [rows]);

  if (!authChecked) {
    return (
      <div className="min-h-[60vh] px-6 py-20 text-sm text-zinc-500">
        Verifying admin access…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-zinc-100">
      <div className="mx-auto max-w-5xl px-6 pb-20 pt-20 md:pt-24">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Bundle review</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Pending bundle versions awaiting moderation. Approving makes one specific bundle
              version the public active version for its parent post; rejecting requires review
              notes that the uploader can see. Bundle review and post-level{' '}
              <code className="rounded bg-white/5 px-1 py-0.5 text-xs">admin_status</code> are
              independent gates — an approved bundle on a Hidden post still stays dark.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadQueue()}
            className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/10"
          >
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {rows === null && (
          <div className="rounded-2xl border border-white/10 bg-[#101821] p-8 text-sm text-zinc-400">
            Loading queue…
          </div>
        )}

        {rows !== null && queue.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-[#101821] p-8 text-sm text-zinc-400">
            No pending bundles right now.
          </div>
        )}

        <div className="space-y-4">
          {queue.map((row) => {
            const post = row.posts;
            const previewHref = `/posts/id/${row.post_id}?preview=${row.id}`;
            const isHidden = post?.admin_status === 'Hidden';
            const isPosting = actionState?.id === row.id;

            return (
              <article
                key={row.id}
                className="rounded-2xl border border-white/10 bg-[#101821] p-6 sm:p-8"
              >
                <header className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1">
                    <h2 className="truncate text-lg font-semibold text-white">
                      {row.manifest?.title ?? post?.title ?? 'Untitled bundle'}
                    </h2>
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      version {row.version} • uploaded{' '}
                      {new Date(row.uploaded_at).toLocaleString()} • by{' '}
                      <span className="text-zinc-300">{uploaderLabel(row)}</span>
                    </p>
                    {row.manifest?.summary && (
                      <p className="line-clamp-2 max-w-2xl text-sm text-zinc-400">
                        {row.manifest.summary}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]">
                    {row.manifest?.source === 'vibe' && (
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-zinc-300">
                        Vibe
                      </span>
                    )}
                    {post?.status && (
                      <span className="rounded-full bg-white/5 px-2 py-0.5 text-zinc-300">
                        post: {post.status}
                      </span>
                    )}
                    {isHidden && (
                      <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-red-300">
                        hidden
                      </span>
                    )}
                  </div>
                </header>

                <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-xs sm:grid-cols-4">
                  <div>
                    <dt className="text-zinc-500">Size</dt>
                    <dd className="text-zinc-200">{formatBytes(row.size_bytes)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Files</dt>
                    <dd className="text-zinc-200">{row.file_count}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">SHA-256</dt>
                    <dd className="font-mono text-zinc-300">{shortSha(row.sha256)}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Layout</dt>
                    <dd className="text-zinc-200">{row.manifest?.layout?.mode ?? '—'}</dd>
                  </div>
                </dl>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link
                    to={previewHref}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/10"
                  >
                    Preview ↗
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleApprove(row.id)}
                    disabled={isPosting}
                    className="rounded-md border border-emerald-500/40 bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-100 transition hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPosting && actionState?.verb === 'approving' ? 'Approving…' : 'Approve'}
                  </button>
                  <button
                    type="button"
                    onClick={() => openRejectModal(row.id)}
                    className="rounded-md border border-red-500/40 bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-100 transition hover:bg-red-500/25"
                  >
                    Reject
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {rejectModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeRejectModal();
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101821] p-6 text-sm text-zinc-100 shadow-2xl">
            <h2 className="text-base font-semibold text-white">Reject bundle</h2>
            <p className="mt-1 text-xs text-zinc-400">
              Provide review notes. These are stored on the bundle row and are visible to the
              uploader.
            </p>
            <textarea
              className="mt-4 h-32 w-full resize-none rounded-lg border border-white/10 bg-black/40 p-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-white/20 focus:outline-none"
              placeholder="e.g. index.html references an off-bundle CDN — allowlist only same-origin fetches."
              value={rejectModal.notes}
              onChange={(event) =>
                setRejectModal((prev) => (prev ? { ...prev, notes: event.target.value } : prev))
              }
              disabled={rejectModal.submitting}
            />
            {rejectModal.error && (
              <p className="mt-2 text-xs text-red-300">{rejectModal.error}</p>
            )}
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeRejectModal}
                disabled={rejectModal.submitting}
                className="rounded-md border border-white/10 bg-transparent px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitReject()}
                disabled={rejectModal.submitting || rejectModal.notes.trim().length === 0}
                className="rounded-md border border-red-500/40 bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-100 transition hover:bg-red-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {rejectModal.submitting ? 'Rejecting…' : 'Reject bundle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBundles;
