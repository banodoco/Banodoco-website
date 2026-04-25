import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/useAuth';
import { PREVIEW_UNAPPROVED_KEY } from '@/contexts/AuthContext';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const ADMIN_SESSION_KEY = 'banodoco_admin_session';

function readPreviewUnapproved(): boolean {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(PREVIEW_UNAPPROVED_KEY) === '1';
}

interface SwitchableMember {
  id: string | null;
  memberId: string;
  displayName: string;
  discordUsername: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  hasAuth: boolean;
}

function readImpersonating(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.sessionStorage.getItem(ADMIN_SESSION_KEY));
}

export default function UserSwitcher() {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [members, setMembers] = useState<SwitchableMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [search, setSearch] = useState('');
  const [switching, setSwitching] = useState<string | null>(null);
  const [impersonating, setImpersonating] = useState(readImpersonating());
  const previewUnapproved = readPreviewUnapproved();
  const [error, setError] = useState<string | null>(null);

  const togglePreviewUnapproved = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (previewUnapproved) {
      window.sessionStorage.removeItem(PREVIEW_UNAPPROVED_KEY);
    } else {
      window.sessionStorage.setItem(PREVIEW_UNAPPROVED_KEY, '1');
    }
    window.location.reload();
  }, [previewUnapproved]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!saved) {
      setImpersonating(false);
      return;
    }
    // If the "saved admin session" matches the live session, it's stale from a
    // failed switch attempt — never an actual impersonation. Wipe it.
    (async () => {
      if (!supabase) return;
      try {
        const parsed = JSON.parse(saved) as { access_token?: string };
        const { data: { session } } = await supabase.auth.getSession();
        if (parsed.access_token && session?.access_token === parsed.access_token) {
          window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
          setImpersonating(false);
          return;
        }
        setImpersonating(true);
      } catch {
        setImpersonating(false);
      }
    })();
  }, [profile?.id]);

  const fetchMembers = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    if (members.length > 0 || loadingMembers) return;
    setLoadingMembers(true);
    try {
      const { data, error: queryError } = await supabase.rpc('list_switchable_members');
      if (queryError) throw queryError;
      setMembers(
        ((data ?? []) as Array<{
          id: string | null;
          member_id: string;
          discord_username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          is_admin: boolean | null;
          has_auth: boolean | null;
        }>).map((row): SwitchableMember => ({
          id: row.id,
          memberId: row.member_id,
          displayName: row.display_name || row.discord_username || 'Unknown',
          discordUsername: row.discord_username ?? null,
          avatarUrl: row.avatar_url ?? null,
          isAdmin: Boolean(row.is_admin),
          hasAuth: Boolean(row.has_auth),
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load members.');
    } finally {
      setLoadingMembers(false);
    }
  }, [members.length, loadingMembers]);

  const handleSwitch = useCallback(async (targetUserId: string) => {
    if (!isSupabaseConfigured || !supabase) return;
    setSwitching(targetUserId);
    setError(null);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.access_token) throw new Error('No active session — sign in first.');

      const savedAdmin = window.sessionStorage.getItem(ADMIN_SESSION_KEY);
      const adminToken = savedAdmin
        ? (JSON.parse(savedAdmin) as { access_token: string }).access_token
        : currentSession.access_token;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const url = `${supabaseUrl}/functions/v1/admin-switch-session`;

      console.info('[UserSwitcher] POST', url, 'target=', targetUserId);
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
          apikey: anonKey,
        },
        body: JSON.stringify({ target_user_id: targetUserId }),
      });

      const rawText = await resp.text();
      let payload: { access_token?: string; refresh_token?: string; error?: string } = {};
      try { payload = rawText ? JSON.parse(rawText) : {}; } catch { /* leave empty */ }

      if (!resp.ok) {
        console.error('[UserSwitcher] non-ok response', resp.status, rawText);
        throw new Error(payload.error ?? `HTTP ${resp.status}: ${rawText.slice(0, 160)}`);
      }
      if (!payload.access_token || !payload.refresh_token) {
        console.error('[UserSwitcher] missing tokens', payload);
        throw new Error('No session returned.');
      }

      // Only persist the admin session AFTER a confirmed successful swap, so
      // failed attempts don't leave a stale "Back to your account" affordance.
      if (!savedAdmin) {
        window.sessionStorage.setItem(
          ADMIN_SESSION_KEY,
          JSON.stringify({
            access_token: currentSession.access_token,
            refresh_token: currentSession.refresh_token,
          }),
        );
      }

      const { error: setErr } = await supabase.auth.setSession({
        access_token: payload.access_token,
        refresh_token: payload.refresh_token,
      });
      if (setErr) {
        console.error('[UserSwitcher] setSession failed', setErr);
        throw setErr;
      }
      console.info('[UserSwitcher] session swapped, reloading');
      window.location.reload();
    } catch (err) {
      console.error('[UserSwitcher] switch failed', err);
      setError(err instanceof Error ? err.message : 'Switch failed.');
    } finally {
      setSwitching(null);
    }
  }, []);

  const handleBackToAdmin = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    const saved = window.sessionStorage.getItem(ADMIN_SESSION_KEY);
    if (!saved) return;
    try {
      const { access_token, refresh_token } = JSON.parse(saved) as {
        access_token: string;
        refresh_token: string;
      };
      await supabase.auth.setSession({ access_token, refresh_token });
      window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
      window.location.reload();
    } catch {
      window.sessionStorage.removeItem(ADMIN_SESSION_KEY);
      await supabase.auth.signOut();
      window.location.reload();
    }
  }, []);

  if (!profile?.isAdmin && !impersonating) return null;

  const filtered = members.filter((m) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      m.displayName.toLowerCase().includes(q)
      || (m.discordUsername?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="fixed bottom-4 right-4 z-[9999]">
      {isOpen && (
        <div className="mb-2 w-72 overflow-hidden rounded-lg border border-white/10 bg-[#0b0b0f]/95 shadow-2xl backdrop-blur-lg">
          <div className="border-b border-white/10 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Switch user</p>
            {profile && (
              <p className="mt-0.5 text-[10px] text-zinc-500">
                Currently: {profile.displayName ?? profile.discordUsername ?? 'unknown'}
              </p>
            )}
          </div>

          <div className="space-y-2 p-3">
            {impersonating && (
              <button
                type="button"
                onClick={handleBackToAdmin}
                className="w-full rounded bg-amber-300/15 px-2 py-2 text-xs font-semibold text-amber-200 transition hover:bg-amber-300/25"
              >
                Back to your account
              </button>
            )}

            <button
              type="button"
              onClick={togglePreviewUnapproved}
              className={`w-full rounded px-2 py-2 text-xs font-semibold transition ${
                previewUnapproved
                  ? 'bg-amber-300/15 text-amber-200 hover:bg-amber-300/25'
                  : 'border border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/10'
              }`}
            >
              {previewUnapproved ? 'Stop previewing as unapproved' : 'Preview as unapproved'}
            </button>
            {!previewUnapproved && (
              <p className="text-[10px] leading-snug text-zinc-500">
                Forces <code className="text-zinc-400">isApproved=false</code> for this session — gates render as if you've never been approved. No DB writes.
              </p>
            )}

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
              className="w-full rounded border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-white/25 focus:outline-none"
            />

            {error && (
              <p className="text-[11px] text-red-300">{error}</p>
            )}

            <div className="max-h-72 space-y-0.5 overflow-y-auto">
              {loadingMembers && (
                <p className="py-2 text-center text-xs text-zinc-500">Loading users...</p>
              )}
              {!loadingMembers && filtered.length === 0 && (
                <p className="py-2 text-center text-xs text-zinc-500">No matches.</p>
              )}
              {filtered.map((m) => {
                const isMe = m.id !== null && m.id === profile?.id;
                const isLoading = m.id !== null && switching === m.id;
                const disabled = isLoading || isMe || !m.hasAuth || m.id === null;
                return (
                  <button
                    key={m.memberId}
                    type="button"
                    onClick={() => m.id && handleSwitch(m.id)}
                    disabled={disabled}
                    title={!m.hasAuth ? 'Has not logged in via Discord yet — cannot impersonate' : undefined}
                    className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition ${
                      isMe
                        ? 'cursor-default bg-amber-300/10 text-zinc-300'
                        : !m.hasAuth
                          ? 'cursor-not-allowed text-zinc-500'
                          : isLoading
                            ? 'bg-white/10 text-zinc-100'
                            : 'text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt="" className="h-5 w-5 shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className="h-5 w-5 shrink-0 rounded-full bg-white/10" />
                    )}
                    <span className="truncate">{m.displayName}</span>
                    {m.isAdmin && <span className="shrink-0 text-[9px] text-amber-300">admin</span>}
                    {isMe && <span className="shrink-0 text-[9px] text-zinc-500">you</span>}
                    {!m.hasAuth && !isMe && <span className="shrink-0 text-[9px] text-zinc-600">no login</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (next) fetchMembers();
        }}
        className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs shadow-lg backdrop-blur-lg transition ${
          impersonating || previewUnapproved
            ? 'border-amber-300/30 bg-amber-300/10 text-amber-200 hover:bg-amber-300/20'
            : 'border-white/10 bg-[#0b0b0f]/90 text-zinc-400 hover:bg-[#0b0b0f] hover:text-zinc-200'
        }`}
      >
        <span
          className={`h-2 w-2 animate-pulse rounded-full ${
            impersonating || previewUnapproved ? 'bg-amber-300' : 'bg-emerald-400'
          }`}
        />
        {impersonating
          ? `Viewing as ${profile?.displayName ?? 'user'}`
          : previewUnapproved
            ? 'Previewing as unapproved'
            : 'Admin'}
      </button>
    </div>
  );
}
