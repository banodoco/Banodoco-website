import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Bot, Loader2 } from 'lucide-react';
import { RequireApproved } from '@/components/auth/RequireApproved';
import { Seo } from '@/components/seo/Seo';
import { useAuth } from '@/contexts/useAuth';
import { createAgentNodeSubmission } from '@/features/agentNodes/submissions';

type NodeType = 'agent' | 'orchestrator';
type RefKind = 'branch' | 'tag' | 'commit_sha' | 'source_ref';

const REF_OPTIONS: Array<{ value: RefKind; label: string; placeholder: string }> = [
  { value: 'branch', label: 'Branch', placeholder: 'main' },
  { value: 'tag', label: 'Tag', placeholder: 'v1.0.0' },
  { value: 'commit_sha', label: 'Commit SHA', placeholder: '40 character git commit SHA' },
  { value: 'source_ref', label: 'Source ref', placeholder: 'refs/heads/main' },
];

function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function SubmitAgentNodePageContent() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [name, setName] = useState('');
  const [nodeType, setNodeType] = useState<NodeType>('agent');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [expectedManifestId, setExpectedManifestId] = useState('');
  const [creatorDiscordId, setCreatorDiscordId] = useState(profile?.memberId ?? '');
  const [creatorDisplayName, setCreatorDisplayName] = useState(profile?.displayName ?? profile?.discordUsername ?? '');
  const [manifestPath, setManifestPath] = useState('node.json');
  const [refKind, setRefKind] = useState<RefKind>('branch');
  const [refValue, setRefValue] = useState('main');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const selectedRefOption = REF_OPTIONS.find((option) => option.value === refKind) ?? REF_OPTIONS[0];

  const validate = (): string | null => {
    if (!user) return 'You must be signed in to submit an art agent.';
    if (!name.trim()) return 'Name is required.';
    if (!repoUrl.trim() || !isValidUrl(repoUrl.trim())) return 'A valid git repository URL is required.';
    if (!expectedManifestId.trim()) return 'Expected manifest ID is required.';
    if (!manifestPath.trim()) return 'Manifest path is required.';
    if (!refValue.trim()) return `${selectedRefOption.label} is required.`;
    if (refKind === 'commit_sha' && !/^[0-9a-f]{40}$/i.test(refValue.trim())) {
      return 'Commit SHA must be a 40 character git SHA.';
    }
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      await createAgentNodeSubmission({
        ownerUserId: user!.id,
        name: name.trim(),
        nodeType,
        shortDescription: shortDescription.trim(),
        description: description.trim(),
        repoUrl: repoUrl.trim(),
        expectedManifestId: expectedManifestId.trim(),
        creatorDiscordId: creatorDiscordId.trim(),
        creatorDisplayName: creatorDisplayName.trim(),
        manifestPath: manifestPath.trim(),
        refKind,
        refValue: refValue.trim(),
      });
      setSaved(true);
      setName('');
      setShortDescription('');
      setDescription('');
      setRepoUrl('');
      setExpectedManifestId('');
      setManifestPath('node.json');
      setRefKind('branch');
      setRefValue('main');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to submit art agent.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0b0f] px-6 pb-16 pt-24 text-zinc-100 sm:pt-28">
      <Seo title="Submit Art Agent | Banodoco" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto max-w-4xl space-y-8"
      >
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900/70 text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="rounded-lg bg-zinc-900 p-2">
            <Bot size={20} className="text-zinc-100" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Submit Art Agent</h1>
            <p className="mt-1 text-sm text-zinc-500">Add a git-backed Agent or Orchestrator for catalog review.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-zinc-800 bg-zinc-950/55 p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-300">Name</span>
              <input className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm outline-none focus:border-zinc-600" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-300">Type</span>
              <select className="h-[46px] w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm outline-none focus:border-zinc-600" value={nodeType} onChange={(event) => setNodeType(event.target.value as NodeType)}>
                <option value="agent">Agent</option>
                <option value="orchestrator">Orchestrator</option>
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-300">Short description</span>
            <input className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm outline-none focus:border-zinc-600" value={shortDescription} onChange={(event) => setShortDescription(event.target.value)} />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-300">Description</span>
            <textarea className="min-h-28 w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm outline-none focus:border-zinc-600" value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>

          <div className="grid gap-6 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-300">Git repo URL</span>
              <input className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm outline-none focus:border-zinc-600" value={repoUrl} onChange={(event) => setRepoUrl(event.target.value)} placeholder="https://github.com/org/repo" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-300">Expected manifest ID</span>
              <input className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm outline-none focus:border-zinc-600" value={expectedManifestId} onChange={(event) => setExpectedManifestId(event.target.value)} placeholder="my-art-agent" />
            </label>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-300">Manifest path</span>
              <input className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm outline-none focus:border-zinc-600" value={manifestPath} onChange={(event) => setManifestPath(event.target.value)} />
            </label>
            <div className="grid grid-cols-[10rem_1fr] gap-3">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-300">Git ref</span>
                <select className="h-[46px] w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-3 text-sm outline-none focus:border-zinc-600" value={refKind} onChange={(event) => {
                  const nextKind = event.target.value as RefKind;
                  setRefKind(nextKind);
                  setRefValue(nextKind === 'branch' ? 'main' : '');
                }}>
                  {REF_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-zinc-300">&nbsp;</span>
                <input className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm outline-none focus:border-zinc-600" value={refValue} onChange={(event) => setRefValue(event.target.value)} placeholder={selectedRefOption.placeholder} />
              </label>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-300">Creator Discord ID</span>
              <input className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm outline-none focus:border-zinc-600" value={creatorDiscordId} onChange={(event) => setCreatorDiscordId(event.target.value)} />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-zinc-300">Creator display name</span>
              <input className="w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm outline-none focus:border-zinc-600" value={creatorDisplayName} onChange={(event) => setCreatorDisplayName(event.target.value)} />
            </label>
          </div>

          {error && <div className="rounded-lg border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200">{error}</div>}
          {saved && <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm text-emerald-200">Art agent submitted for review.</div>}

          <button disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60">
            {saving && <Loader2 size={16} className="animate-spin" />}
            Submit Art Agent
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default function SubmitAgentNodePage() {
  return (
    <RequireApproved>
      <SubmitAgentNodePageContent />
    </RequireApproved>
  );
}
