import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ImageIcon, Loader2, Plus, Trash2 } from 'lucide-react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { Seo } from '@/components/seo/Seo';
import { BioAutosaveEditor } from '@/components/profile/BioAutosaveEditor';
import { ProfileLinksEditor } from '@/components/profile/ProfileLinksEditor';
import { MediaUploader } from '@/components/forms/MediaUploader';
import { useAuth } from '@/contexts/useAuth';
import { createArtMedia, deleteUserUpload } from '@/lib/media';
import { saveResource } from '@/lib/resources';
import { HOME_PATH, profilePath } from '@/lib/routing';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { SubmitResourceForm, type SubmitResourceFormData } from '@/pages/SubmitResource';
import type { PendingApprovalRow } from '@/hooks/usePendingApproval';
import {
  loadPendingApplication,
  newApprovalDraft,
  type ArtworkDraft,
} from './loadPendingApplication';

type Step = 'human' | 'who' | 'thanks';

const newDraft = newApprovalDraft;

const duplicatePendingMessage = 'You already have a pending request.';

function isDuplicatePendingError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const record = error as { code?: string; message?: string; details?: string };
  const text = `${record.message ?? ''} ${record.details ?? ''}`.toLowerCase();
  return record.code === '23505'
    || text.includes('approval_requests_one_pending_per_member')
    || text.includes('duplicate key');
}

async function queryPendingApproval(memberId: string) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Approval service is not configured.');
  }
  const { data, error } = await supabase
    .from('approval_requests')
    .select('id, status, bio_snapshot, attached_media_id, attached_resource_id, posted_message_id, embed_dirty, embed_updated_at, created_at')
    .eq('member_id', memberId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as PendingApprovalRow | null;
}

async function insertApprovalRequest(input: {
  memberId: string;
  bioSnapshot: string;
  attachedMediaId?: string | null;
  attachedResourceId?: string | null;
}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Approval service is not configured.');
  }
  const { data, error } = await supabase
    .from('approval_requests')
    .insert({
      member_id: input.memberId,
      bio_snapshot: input.bioSnapshot,
      attached_media_id: input.attachedMediaId ?? null,
      attached_resource_id: input.attachedResourceId ?? null,
      status: 'pending',
    })
    .select('id')
    .single();
  if (error || !data) {
    const message = isDuplicatePendingError(error)
      ? duplicatePendingMessage
      : error?.message ?? 'Failed to submit approval request.';
    throw new Error(message);
  }
  return data as { id: string };
}

async function updateApprovalRequest(input: {
  id: string;
  bioSnapshot: string;
  attachedMediaId: string | null;
  attachedResourceId: string | null;
}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Approval service is not configured.');
  }

  const { error } = await supabase
    .from('approval_requests')
    .update({
      bio_snapshot: input.bioSnapshot,
      attached_media_id: input.attachedMediaId,
      attached_resource_id: input.attachedResourceId,
    })
    .eq('id', input.id)
    .eq('status', 'pending');

  if (error) {
    throw new Error(error.message);
  }
}

async function updateExistingArtMedia(input: {
  id: string;
  memberId: string;
  title: string;
  description: string;
  selfAttributed: boolean;
}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Approval service is not configured.');
  }

  const { error } = await supabase
    .from('media')
    .update({
      title: input.title.trim() || 'Untitled',
      description: input.description.trim() || null,
      self_attributed: input.selfAttributed,
    })
    .eq('id', input.id)
    .eq('member_id', input.memberId);

  if (error) {
    throw new Error(error.message);
  }
}

async function deleteHiddenArtMedia(input: {
  id: string;
  memberId: string;
}) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Approval service is not configured.');
  }

  const { error } = await supabase
    .from('media')
    .delete()
    .eq('id', input.id)
    .eq('member_id', input.memberId)
    .eq('admin_status', 'Hidden');

  if (error) {
    throw new Error(error.message);
  }
}

interface StepDotProps {
  number: number;
  label: string;
  active: boolean;
  done: boolean;
}

function StepDot({ number, label, active, done }: StepDotProps) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] font-semibold ${
          done
            ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200'
            : active
              ? 'border-amber-300/50 bg-amber-300/10 text-amber-200'
              : 'border-white/15 text-zinc-500'
        }`}
      >
        {done ? <Check size={11} /> : number}
      </span>
      <span className={`text-xs ${active ? 'text-zinc-200' : done ? 'text-zinc-400' : 'text-zinc-500'}`}>
        {label}
      </span>
    </div>
  );
}

interface ArtworkSlotProps {
  draft: ArtworkDraft;
  expanded: boolean;
  onExpand: () => void;
  onChange: (patch: Partial<ArtworkDraft>) => void;
  onRemove: () => void;
  onMarkPrimary: () => void;
  canRemove: boolean;
  index: number;
  memberId: string;
}

function ArtworkSlot({ draft, expanded, onExpand, onChange, onRemove, onMarkPrimary, canRemove, index, memberId }: ArtworkSlotProps) {
  const handleFilesSelected = useCallback(
    (files: File[]) => {
      if (files.length === 0) return;
      const file = files[0];
      const url = URL.createObjectURL(file);
      if (draft.thumbnailUrl && draft.file) URL.revokeObjectURL(draft.thumbnailUrl);
      onChange({ file, thumbnailUrl: url, editStatus: draft.editStatus === 'new' ? 'new' : 'edited' });
    },
    [draft.editStatus, draft.file, draft.thumbnailUrl, onChange],
  );

  const handleRemoveFile = useCallback(() => {
    if (draft.thumbnailUrl && draft.file) URL.revokeObjectURL(draft.thumbnailUrl);
    if (draft.existingMediaId) {
      onChange({ file: null, thumbnailUrl: null, editStatus: 'removed' });
      return;
    }
    onChange({ file: null, thumbnailUrl: null, editStatus: 'new' });
  }, [draft.existingMediaId, draft.file, draft.thumbnailUrl, onChange]);

  const handleResourceSubmit = useCallback(
    async (payload: SubmitResourceFormData) => {
      const result = await saveResource({
        id: draft.savedResourceId ?? undefined,
        memberId,
        name: payload.name,
        description: payload.description,
        type: payload.type,
        links: payload.links,
        primaryMediaId: payload.primaryMediaId,
        status: 'draft',
        selfAttributed: payload.selfAttributed,
        galleryItems: payload.galleryItems,
        modelItems: payload.modelItems,
      });

      onChange({
        savedResourceId: result.id,
        savedResourceName: null,
        editStatus: draft.editStatus === 'new' ? 'new' : 'edited',
        resourceDirty: false,
      });
    },
    [draft.editStatus, draft.savedResourceId, memberId, onChange],
  );

  if (!expanded) {
    const isResource = draft.creationType === 'resource';
    const fallbackTitle = `${isResource ? 'Resource' : 'Art'} ${index + 1}`;
    const collapsedTitle = isResource
      ? (draft.savedResourceName ?? fallbackTitle)
      : (draft.title.trim() || fallbackTitle);
    const collapsedSubtitle = isResource
      ? (draft.resourceDirty ? 'Unsaved changes' : draft.savedResourceId ? 'Saved as draft' : 'Not yet saved')
      : (draft.file ? draft.file.name : draft.existingMediaId ? 'Existing upload' : 'No file selected');
    return (
      <button
        type="button"
        onClick={onExpand}
        className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-left transition hover:border-white/20 hover:bg-white/[0.04]"
      >
        {draft.thumbnailUrl && (draft.existingMediaId || draft.file?.type.startsWith('image/')) ? (
          <img src={draft.thumbnailUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-white/5 text-zinc-600">
            <ImageIcon size={16} />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-zinc-200">{collapsedTitle}</p>
          <p className="truncate text-xs text-zinc-500">{collapsedSubtitle}</p>
        </div>
        <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] capitalize text-zinc-400">
          {draft.isPrimary ? 'Primary' : draft.creationType}
        </span>
        {!isResource && draft.file && !draft.selfAttributed && (
          <span className="shrink-0 text-[10px] text-amber-300/80">needs "I made this"</span>
        )}
      </button>
    );
  }

  const isResource = draft.creationType === 'resource';
  const hasArtMedia = Boolean(draft.file || draft.existingMediaId);

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 space-y-4">
      <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.02] p-1">
        {(['art', 'resource'] as const).map((kind) => (
          <button
            key={kind}
            type="button"
            onClick={() => onChange({ creationType: kind })}
            className={`flex-1 rounded px-3 py-1.5 text-xs font-medium capitalize transition ${
              draft.creationType === kind
                ? 'bg-amber-300/15 text-amber-100'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {kind}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-zinc-500">
          {draft.isPrimary ? 'Shown first to reviewers' : 'Secondary item'}
        </span>
        {!draft.isPrimary && draft.editStatus !== 'removed' && (
          <button
            type="button"
            onClick={onMarkPrimary}
            className="rounded border border-white/10 px-2 py-1 text-xs text-zinc-300 transition hover:border-amber-300/40 hover:text-amber-100"
          >
            Mark as primary
          </button>
        )}
      </div>

      {isResource ? (
        <>
          {draft.resourceDirty && (
            <div className="rounded border border-amber-300/25 bg-amber-300/[0.08] px-3 py-2 text-xs text-amber-100">
              Unsaved changes
            </div>
          )}
          <SubmitResourceForm
            inline
            mode="approval-request"
            submitLabel={draft.savedResourceId ? 'Update resource draft' : 'Save resource draft'}
            onSubmit={handleResourceSubmit}
            onDirtyChange={(dirty) => onChange({ resourceDirty: dirty })}
          />
        </>
      ) : !hasArtMedia ? (
        <MediaUploader
          files={[]}
          onFilesSelected={handleFilesSelected}
          onRemoveFile={() => undefined}
          maxFiles={1}
          accept="image/*,video/*"
        />
      ) : (
        <>
          <input
            type="text"
            value={draft.title}
            onChange={(e) => onChange({ title: e.target.value, editStatus: draft.editStatus === 'new' ? 'new' : 'edited' })}
            placeholder="Title (optional)"
            className="w-full rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-white/25 focus:outline-none"
          />

          <div className="flex items-center gap-3 rounded border border-white/10 bg-white/[0.03] p-3">
            {draft.thumbnailUrl && (draft.existingMediaId || draft.file?.type.startsWith('image/')) ? (
              <img src={draft.thumbnailUrl} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-white/5 text-zinc-600">
                <ImageIcon size={18} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-zinc-100">
                {draft.file?.name ?? (draft.title.trim() || 'Existing artwork')}
              </p>
              <p className="text-xs text-zinc-500">
                {draft.file ? `${(draft.file.size / 1024 / 1024).toFixed(2)} MB` : 'Saved upload'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="rounded p-1.5 text-zinc-500 transition hover:bg-white/10 hover:text-zinc-300"
              aria-label="Remove file"
            >
              <Trash2 size={14} />
            </button>
          </div>

          <textarea
            value={draft.description}
            onChange={(e) => onChange({ description: e.target.value, editStatus: draft.editStatus === 'new' ? 'new' : 'edited' })}
            placeholder="Anything you'd like to say about this..."
            rows={2}
            className="w-full resize-none rounded border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-white/25 focus:outline-none"
          />

          <label className="flex items-start gap-2 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={draft.selfAttributed}
              onChange={(e) => onChange({ selfAttributed: e.target.checked, editStatus: draft.editStatus === 'new' ? 'new' : 'edited' })}
              className="mt-0.5"
            />
            <span>I made this. (You personally made or agentically directed it.)</span>
          </label>
        </>
      )}

      {canRemove && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onRemove}
            className="text-xs text-zinc-500 transition hover:text-red-300"
          >
            Remove this {isResource ? 'resource' : 'artwork'}
          </button>
        </div>
      )}
    </div>
  );
}

interface Step1Props {
  drafts: ArtworkDraft[];
  expandedDraftId: string;
  isEditMode: boolean;
  onExpand: (id: string) => void;
  onChange: (id: string, patch: Partial<ArtworkDraft>) => void;
  onRemove: (id: string) => void;
  onMarkPrimary: (id: string) => void;
  onAddAnother: () => void;
  memberId: string;
}

function Step1({
  drafts,
  expandedDraftId,
  isEditMode,
  onExpand,
  onChange,
  onRemove,
  onMarkPrimary,
  onAddAnother,
  memberId,
}: Step1Props) {
  const visibleDrafts = drafts.filter((draft) => draft.editStatus !== 'removed');

  return (
    <>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-200/80">Step 1</p>
          {isEditMode && (
            <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-amber-100">
              Pending review
            </span>
          )}
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Prove you're a human who cares
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-zinc-300">
          Show us something useful, interesting, or beautiful you've made. This helps us know
          that you're human — or at least a very helpful robot.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
          Share something you made
        </h2>
        <div className="space-y-2">
          {visibleDrafts.map((draft, index) => (
            <ArtworkSlot
              key={draft.id}
              draft={draft}
              index={index}
              expanded={draft.id === expandedDraftId}
              onExpand={() => onExpand(draft.id)}
              onChange={(patch) => onChange(draft.id, patch)}
              onRemove={() => onRemove(draft.id)}
              onMarkPrimary={() => onMarkPrimary(draft.id)}
              canRemove={visibleDrafts.length > 1}
              memberId={memberId}
            />
          ))}

          <button
            type="button"
            onClick={onAddAnother}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 px-3 py-2.5 text-xs text-zinc-400 transition hover:border-white/30 hover:text-zinc-200"
          >
            <Plus size={14} />
            Add another
          </button>
        </div>
      </section>
    </>
  );
}

interface Step2Props {
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  bio: string;
  onBioChange: (next: string) => void;
  profileLinks: string[];
  submitError: string | null;
}

function Step2({ displayName, handle, avatarUrl, bio, onBioChange, profileLinks, submitError }: Step2Props) {
  return (
    <>
      <section className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-200/80">Step 2</p>
        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Share a bit more about who you are
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-zinc-400">
          Approvers want to know who they're letting in. A short bio plus links to your work elsewhere
          is usually enough.
        </p>
      </section>

      <section className="space-y-5">
        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] p-4">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-base font-semibold text-zinc-400">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-100">{displayName}</p>
            <p className="truncate text-sm text-zinc-500">{handle}</p>
          </div>
        </div>

        <div className="space-y-3">
          <label htmlFor="approval-bio" className="block text-sm font-medium text-zinc-300">
            Bio (optional)
          </label>
          <BioAutosaveEditor
            id="approval-bio"
            value={bio}
            onChange={onBioChange}
            minLength={0}
            placeholder="Tell us what you make, how you work, and what people should know about your practice."
          />
        </div>

        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-medium text-zinc-300">Profile links (optional)</h3>
            <p className="mt-1 text-xs text-zinc-500">
              Portfolio, socials, project pages, or other places reviewers can understand your work.
            </p>
          </div>
          <ProfileLinksEditor initial={profileLinks} />
        </div>
      </section>

      {submitError && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-300">{submitError}</p>
        </div>
      )}
    </>
  );
}

function Step3({ onEdit }: { onEdit: () => void }) {
  return (
    <section className="flex flex-col items-center gap-6 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-400/10 text-emerald-200">
        <Check size={22} />
      </div>
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Thank you</h1>
        <p className="mx-auto max-w-md text-base leading-relaxed text-zinc-400">
          Your application is in. Check the
          {' '}
          <a
            href="https://discord.gg/TKzTQ7eM2"
            target="_blank"
            rel="noopener"
            className="text-amber-200 hover:text-amber-100"
          >
            #introductions
          </a>
          {' '}
          channel of the Banodoco Discord — we'll tag you there for community review.
        </p>
        <p className="mx-auto max-w-md text-sm leading-relaxed text-zinc-500">
          You can keep editing your bio, artworks, or resources at any time — approvers see the latest version.
        </p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-zinc-200 transition hover:border-white/25 hover:bg-white/[0.06]"
      >
        Edit application
      </button>
    </section>
  );
}

function GetApprovedPage() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();
  const [step, setStep] = useState<Step>('human');
  const [drafts, setDrafts] = useState<ArtworkDraft[]>(() => [newDraft()]);
  const [expandedDraftId, setExpandedDraftId] = useState<string>(() => drafts[0]?.id ?? '');
  const [bio, setBio] = useState('');
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [pendingRow, setPendingRow] = useState<PendingApprovalRow | null>(null);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const originalSnapshotRef = useRef<ArtworkDraft[]>([]);

  useEffect(() => {
    if (!profile) return;
    setBio(profile.bio ?? '');
  }, [profile]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [step]);

  useEffect(() => {
    if (loading || !profile?.isApproved) return;
    const target = profile.discordUsername ? profilePath(profile.discordUsername) : HOME_PATH;
    navigate(target, { replace: true });
  }, [loading, navigate, profile]);

  useEffect(() => {
    if (!profile?.memberId || profile.isApproved) return;
    const memberId = profile.memberId;
    let cancelled = false;
    setPendingLoading(true);
    queryPendingApproval(memberId)
      .then(async (pending) => {
        if (cancelled) return;
        setPendingRequestId(pending?.id ?? null);
        setPendingRow(pending);
        if (pending?.id) {
          const hydrated = await loadPendingApplication(pending, memberId);
          if (cancelled) return;
          setBio(hydrated.bio || profile.bio || '');
          setDrafts(hydrated.drafts);
          originalSnapshotRef.current = hydrated.drafts;
          setExpandedDraftId(hydrated.drafts.find((draft) => draft.editStatus !== 'removed')?.id ?? hydrated.drafts[0]?.id ?? '');
          setStep('human');
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setSubmitError(error instanceof Error ? error.message : 'Failed to check approval status.');
      })
      .finally(() => {
        if (!cancelled) setPendingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.isApproved, profile?.memberId]);

  // Cleanup blob URLs on unmount only
  useEffect(() => {
    return () => {
      for (const d of drafts) {
        if (d.thumbnailUrl) URL.revokeObjectURL(d.thumbnailUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateDraft = useCallback((id: string, patch: Partial<ArtworkDraft>) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }, []);

  const removeDraft = useCallback((id: string) => {
    setDrafts((prev) => {
      const target = prev.find((d) => d.id === id);
      if (target?.thumbnailUrl && target.file) URL.revokeObjectURL(target.thumbnailUrl);
      const next = target?.existingMediaId || target?.savedResourceId
        ? prev.map((d) => (d.id === id ? { ...d, editStatus: 'removed' as const, isPrimary: false } : d))
        : prev.filter((d) => d.id !== id);
      const visibleNext = next.filter((d) => d.editStatus !== 'removed');
      if (visibleNext.length === 0) {
        const fresh = newDraft();
        setExpandedDraftId(fresh.id);
        return [...next, fresh];
      }
      const primaryNext = visibleNext.some((d) => d.isPrimary)
        ? next
        : next.map((d) => (d.id === visibleNext[0].id ? { ...d, isPrimary: true } : d));
      setExpandedDraftId((prevExpanded) => (prevExpanded === id ? visibleNext[0].id : prevExpanded));
      return primaryNext;
    });
  }, []);

  const addAnother = useCallback(() => {
    const fresh = { ...newDraft(), isPrimary: drafts.filter((d) => d.editStatus !== 'removed').length === 0 };
    setDrafts((prev) => [...prev, fresh]);
    setExpandedDraftId(fresh.id);
  }, [drafts]);

  const markPrimary = useCallback((id: string) => {
    setDrafts((prev) => prev.map((draft) => ({
      ...draft,
      isPrimary: draft.id === id,
      editStatus: draft.id === id && draft.editStatus !== 'new' ? 'edited' : draft.editStatus,
    })));
  }, []);

  const isDraftValid = (d: ArtworkDraft) =>
    d.creationType === 'resource'
      ? Boolean(d.savedResourceId && d.editStatus !== 'removed')
      : Boolean((d.file || d.existingMediaId) && d.selfAttributed && d.editStatus !== 'removed');
  const validDrafts = drafts.filter(isDraftValid);
  const canAdvanceStep1 = validDrafts.length > 0;
  const canSubmitStep2 = !submitting;

  const handleFinalSubmit = async () => {
    if (!user || !profile?.memberId) {
      setSubmitError('You must be signed in.');
      return;
    }
    if (validDrafts.length === 0) {
      setSubmitError('Add at least one artwork or generation.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const uploadedMedia: Array<{ id: string; storagePath: string; draftId: string }> = [];
    const createdResourceIds = validDrafts
      .filter((d) => d.creationType === 'resource' && d.savedResourceId && d.editStatus === 'new')
      .map((d) => d.savedResourceId as string);

    // Upload any 'art'-type drafts now. Resource drafts were already saved
    // via SubmitResourceForm when the user clicked their per-slot save button.
    try {
      for (const d of validDrafts) {
        if (d.creationType !== 'art') continue;
        const result = await createArtMedia({
          file: d.file as File,
          title: d.title.trim() || 'Untitled',
          description: d.description.trim() || null,
          memberId: profile.memberId,
          userId: user.id,
          hidden: true,
          selfAttributed: true,
          creationType: 'art',
        });
        uploadedMedia.push({ id: result.id, storagePath: result.storagePath, draftId: d.id });
      }
    } catch (err) {
      console.error('[GetApproved] media upload failed', err);
      for (const u of uploadedMedia) {
        try { await supabase?.from('media').delete().eq('id', u.id); } catch { /* best effort */ }
        try { await deleteUserUpload(u.storagePath); } catch { /* best effort */ }
      }
      setSubmitError(err instanceof Error ? err.message : 'Upload failed.');
      setSubmitting(false);
      return;
    }

    // Resolve the primary attachment from the FIRST valid draft, regardless of type.
    const firstDraft = validDrafts[0];
    let attachedMediaId: string | null = null;
    let attachedResourceId: string | null = null;
    if (firstDraft.creationType === 'resource') {
      attachedResourceId = firstDraft.savedResourceId;
    } else {
      const match = uploadedMedia.find((u) => u.draftId === firstDraft.id);
      attachedMediaId = match?.id ?? null;
    }

    if (!attachedMediaId && !attachedResourceId) {
      setSubmitError('Could not resolve a primary attachment.');
      setSubmitting(false);
      return;
    }

    try {
      const request = await insertApprovalRequest({
        memberId: profile.memberId,
        bioSnapshot: bio.trim(),
        attachedMediaId,
        attachedResourceId,
      });
      setPendingRequestId(request.id);
      setStep('thanks');
    } catch (err) {
      console.error('[GetApproved] approval insert failed', err);
      for (const u of uploadedMedia) {
        try { await supabase?.from('media').delete().eq('id', u.id); } catch { /* best effort */ }
        try { await deleteUserUpload(u.storagePath); } catch { /* best effort */ }
      }
      for (const resourceId of createdResourceIds) {
        try { await supabase?.from('assets').delete().eq('id', resourceId); } catch { /* best effort */ }
      }
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit.');
    } finally {
      setSubmitting(false);
    }
  };

  const cleanupUploadedMedia = async (uploads: Array<{ id: string; storagePath: string }>) => {
    for (const upload of uploads) {
      try { await supabase?.from('media').delete().eq('id', upload.id); } catch { /* best effort */ }
      try { await deleteUserUpload(upload.storagePath); } catch { /* best effort */ }
    }
  };

  const handleSave = async () => {
    if (!user || !profile?.memberId || !pendingRow) {
      setSubmitError('You must be signed in.');
      return;
    }
    if (validDrafts.length === 0) {
      setSubmitError('Add at least one artwork or generation.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const uploadedMedia: Array<{ id: string; storagePath: string }> = [];
    const pendingDeletes: Array<{
      id: string;
      storage: { storageBucket: string | null; storagePath: string | null };
    }> = [];
    const nextDrafts = drafts.map((draft) => ({ ...draft }));

    try {
      for (const draft of nextDrafts) {
        if (draft.editStatus !== 'removed' && !isDraftValid(draft)) {
          continue;
        }

        if (draft.creationType !== 'art') {
          if (draft.editStatus !== 'removed' && draft.savedResourceId) {
            draft.editStatus = 'unchanged';
          }
          continue;
        }

        if (draft.editStatus === 'removed') {
          if (draft.existingMediaId) {
            pendingDeletes.push({
              id: draft.existingMediaId,
              storage: {
                storageBucket: draft.storageBucket ?? null,
                storagePath: draft.storagePath ?? null,
              },
            });
          }
          continue;
        }

        if (draft.file) {
          const previousMediaId = draft.existingMediaId;
          const previousStorage = {
            storageBucket: draft.storageBucket ?? null,
            storagePath: draft.storagePath ?? null,
          };
          const result = await createArtMedia({
            file: draft.file,
            title: draft.title.trim() || 'Untitled',
            description: draft.description.trim() || null,
            memberId: profile.memberId,
            userId: user.id,
            hidden: true,
            selfAttributed: true,
            creationType: 'art',
          });

          uploadedMedia.push({ id: result.id, storagePath: result.storagePath });

          if (previousMediaId) {
            pendingDeletes.push({
              id: previousMediaId,
              storage: previousStorage,
            });
          }

          draft.existingMediaId = result.id;
          draft.storageBucket = 'user-uploads';
          draft.storagePath = result.storagePath;
          draft.file = null;
          draft.thumbnailUrl = result.url;
          draft.editStatus = 'unchanged';
          continue;
        }

        if (draft.editStatus === 'edited' && draft.existingMediaId) {
          await updateExistingArtMedia({
            id: draft.existingMediaId,
            memberId: profile.memberId,
            title: draft.title,
            description: draft.description,
            selfAttributed: draft.selfAttributed,
          });
          draft.editStatus = 'unchanged';
        }
      }

      const visibleDrafts = nextDrafts.filter((draft) => draft.editStatus !== 'removed');
      const primaryDraft = visibleDrafts.find((draft) => draft.isPrimary && isDraftValid(draft))
        ?? visibleDrafts.find(isDraftValid);
      let attachedMediaId: string | null = null;
      let attachedResourceId: string | null = null;

      if (primaryDraft?.creationType === 'resource') {
        attachedResourceId = primaryDraft.savedResourceId;
      } else if (primaryDraft?.creationType === 'art') {
        attachedMediaId = primaryDraft.existingMediaId ?? null;
      }

      if (!attachedMediaId && !attachedResourceId) {
        throw new Error('Could not resolve a primary attachment.');
      }

      await updateApprovalRequest({
        id: pendingRow.id,
        bioSnapshot: bio.trim(),
        attachedMediaId,
        attachedResourceId,
      });

      for (const pendingDelete of pendingDeletes) {
        try {
          await deleteHiddenArtMedia({ id: pendingDelete.id, memberId: profile.memberId });
        } catch (deleteError) {
          console.warn('[GetApproved] failed to delete replaced hidden media', deleteError);
        }

        if (pendingDelete.storage.storagePath && supabase) {
          const bucket = pendingDelete.storage.storageBucket || 'user-uploads';
          try {
            await supabase.storage.from(bucket).remove([pendingDelete.storage.storagePath]);
          } catch (storageError) {
            console.warn('[GetApproved] failed to remove replaced media storage', storageError);
          }
        }
      }

      const savedDrafts = visibleDrafts.length > 0
        ? visibleDrafts.map((draft) => ({
          ...draft,
          isPrimary: draft === primaryDraft,
          editStatus: isDraftValid(draft) ? 'unchanged' as const : draft.editStatus,
        }))
        : [newDraft()];

      setDrafts(savedDrafts);
      originalSnapshotRef.current = savedDrafts;
      setExpandedDraftId(primaryDraft?.id ?? savedDrafts[0]?.id ?? '');
      setPendingRow({
        ...pendingRow,
        bio_snapshot: bio.trim(),
        attached_media_id: attachedMediaId,
        attached_resource_id: attachedResourceId,
        embed_dirty: true,
      });
      setStep('thanks');
    } catch (err) {
      console.error('[GetApproved] approval update failed', err);
      await cleanupUploadedMedia(uploadedMedia);
      setSubmitError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayName = profile?.displayName ?? profile?.discordUsername ?? 'Creator';
  const handle = profile?.discordUsername ? `@${profile.discordUsername}` : '@discord';

  // Reference pendingRequestId to keep its setter usage clear (used to show step 3 on existing pending).
  void pendingRequestId;

  return (
    <div className="min-h-screen bg-[#0b0b0f] text-zinc-100">
      <Seo title="Get approved to post | Banodoco" />

      <div className="border-b border-amber-300/15 bg-amber-300/[0.05]">
        <p className="mx-auto max-w-2xl px-6 py-2 text-center text-[11px] text-amber-200/80">
          All information here is 100% public for anyone to view at any time. No DMs, no private fields.
        </p>
      </div>

      <div className="sticky top-[60px] z-30 border-b border-white/10 bg-[#0b0b0f]/85 backdrop-blur supports-[backdrop-filter]:bg-[#0b0b0f]/65">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-center gap-x-4 gap-y-2 px-6 py-3">
          <StepDot number={1} label="Prove you're human" active={step === 'human'} done={step !== 'human'} />
          <span className="hidden h-px w-6 bg-white/10 sm:block" />
          <StepDot number={2} label="Who you are" active={step === 'who'} done={step === 'thanks'} />
          <span className="hidden h-px w-6 bg-white/10 sm:block" />
          <StepDot number={3} label="Done" active={step === 'thanks'} done={false} />
        </div>
      </div>

      <main className="mx-auto flex max-w-2xl flex-col gap-8 px-6 pb-16 pt-12">
        {pendingLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-500">
            <Loader2 size={16} className="animate-spin" />
            Loading...
          </div>
        ) : step === 'human' ? (
          <Step1
            drafts={drafts}
            expandedDraftId={expandedDraftId}
            isEditMode={Boolean(pendingRow)}
            memberId={profile?.memberId ?? ''}
            onExpand={(id) => setExpandedDraftId(id)}
            onChange={updateDraft}
            onRemove={removeDraft}
            onMarkPrimary={markPrimary}
            onAddAnother={addAnother}
          />
        ) : step === 'who' ? (
          <Step2
            displayName={displayName}
            handle={handle}
            avatarUrl={profile?.avatarUrl ?? null}
            bio={bio}
            onBioChange={setBio}
            profileLinks={profile?.profileLinks ?? []}
            submitError={submitError}
          />
        ) : (
          <Step3 onEdit={() => setStep('human')} />
        )}
      </main>

      {step !== 'thanks' && !pendingLoading && (
        <div className="sticky bottom-0 z-40 border-t border-white/10 bg-[#0b0b0f]/90 backdrop-blur supports-[backdrop-filter]:bg-[#0b0b0f]/75">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-6 py-3">
            {step === 'who' ? (
              <button
                type="button"
                onClick={() => setStep('human')}
                disabled={submitting}
                className="rounded-lg px-4 py-2 text-sm text-zinc-400 transition hover:text-zinc-200 disabled:opacity-50"
              >
                Back
              </button>
            ) : (
              <span />
            )}
            {step === 'human' ? (
              <button
                type="button"
                onClick={() => setStep('who')}
                disabled={!canAdvanceStep1}
                title={canAdvanceStep1 ? undefined : 'Add at least one item with "I made this" checked'}
                className={`rounded-lg px-5 py-2.5 text-sm font-medium transition ${
                  canAdvanceStep1
                    ? 'bg-amber-300/15 text-amber-100 hover:bg-amber-300/25'
                    : 'cursor-not-allowed bg-white/5 text-zinc-500'
                }`}
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={pendingRow ? handleSave : handleFinalSubmit}
                disabled={!canSubmitStep2}
                className={`flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition ${
                  canSubmitStep2
                    ? 'bg-amber-300/15 text-amber-100 hover:bg-amber-300/25'
                    : 'cursor-not-allowed bg-white/5 text-zinc-500'
                }`}
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {submitting ? (pendingRow ? 'Saving...' : 'Submitting...') : (pendingRow ? 'Save changes' : 'Submit for review')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GetApproved() {
  return (
    <RequireAuth>
      <GetApprovedPage />
    </RequireAuth>
  );
}
