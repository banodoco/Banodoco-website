import { Bot, ExternalLink, GitBranch, Workflow } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Seo } from '@/components/seo/Seo';
import { useAgentNodeCatalog } from '@/features/agentNodes/useAgentNodeCatalog';
import { agentNodeMediaUrl, agentNodePreviewImage, agentNodeSummary } from '@/features/agentNodes/media';
import type { AgentNodeInstallTarget } from '@/features/agentNodes/types';

function refLabel(target: AgentNodeInstallTarget): string {
  if ('commit_sha' in target.ref && target.ref.commit_sha) return target.ref.commit_sha.slice(0, 12);
  if ('tag' in target.ref && target.ref.tag) return target.ref.tag;
  if ('branch' in target.ref && target.ref.branch) return target.ref.branch;
  if ('source_ref' in target.ref && target.ref.source_ref) return target.ref.source_ref;
  return 'unresolved';
}

export default function AgentNodeDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data, loading, error } = useAgentNodeCatalog();
  const node = data?.nodes.find((candidate) => candidate.slug === slug) ?? null;
  const creator = node?.creator.display_name || node?.creator.discord_id || null;
  const summary = node ? agentNodeSummary(node) : '';
  const previewImage = node ? agentNodePreviewImage(node) : null;
  const canonicalUrl = slug ? new URL(`/art-agents/${slug}`, window.location.origin).toString() : undefined;

  return (
    <div className="min-h-screen bg-[#0b0b0f] px-6 pb-16 pt-24 text-zinc-100 sm:pt-28">
      {node && (
        <Seo
          title={`${node.name} | Art Agents`}
          description={summary}
          image={previewImage ?? '/2rp-social-card.jpg'}
          url={canonicalUrl}
        />
      )}

      <main className="mx-auto max-w-5xl space-y-8">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-zinc-500 transition hover:text-zinc-300"
        >
          Back
        </button>

        {loading ? (
          <div className="h-72 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
        ) : error || !node ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-10 text-center">
            <Bot className="mx-auto h-12 w-12 text-white/30" />
            <h1 className="mt-4 text-2xl font-black uppercase tracking-tight text-white">
              {error ? 'Could not load agent' : 'Agent not found'}
            </h1>
            <Link to="/art-agents" className="mt-4 inline-block text-sm text-zinc-300 hover:text-white">
              View all art agents
            </Link>
          </div>
        ) : (
          <>
            <section className="grid gap-8 border-b border-zinc-800 pb-8 lg:grid-cols-[1fr_360px] lg:items-start">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--rp-section-accent-border)] bg-[var(--rp-section-accent-soft)] px-3 py-1 text-sm font-semibold text-[var(--rp-section-accent)]">
                  {node.node_type === 'orchestrator' ? <Workflow size={14} /> : <Bot size={14} />}
                  {node.node_type === 'orchestrator' ? 'Orchestrator' : 'Agent'}
                </div>
                <h1 className="text-4xl font-black uppercase tracking-tight text-white sm:text-6xl">
                  {node.name}
                </h1>
                {creator && <p className="mt-3 text-xs uppercase tracking-[0.18em] text-white/35">by {creator}</p>}
                <p className="mt-6 max-w-3xl text-base leading-relaxed text-zinc-300">{summary}</p>
                {node.description && node.description !== summary && (
                  <p className="mt-5 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-zinc-500">
                    {node.description}
                  </p>
                )}
              </div>

              {previewImage && (
                <img
                  src={previewImage}
                  alt={node.media[0]?.alt_text ?? node.name}
                  className="aspect-video w-full rounded-2xl border border-white/10 bg-black object-cover"
                />
              )}
            </section>

            {node.media.length > 1 && (
              <section className="grid gap-4 sm:grid-cols-2">
                {node.media.map((item) => {
                  const url = agentNodeMediaUrl(item);
                  if (!url) return null;
                  return item.type === 'video' ? (
                    <video
                      key={item.id}
                      src={url}
                      controls
                      className="aspect-video w-full rounded-2xl border border-white/10 bg-black object-cover"
                    />
                  ) : (
                    <img
                      key={item.id}
                      src={url}
                      alt={item.alt_text ?? item.caption ?? node.name}
                      className="aspect-video w-full rounded-2xl border border-white/10 bg-black object-cover"
                    />
                  );
                })}
              </section>
            )}

            <section className="rounded-2xl border border-white/10 bg-black/25 p-5">
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">Install Targets</h2>
              <div className="mt-4 space-y-3">
                {node.install_targets.map((target) => (
                  <div key={target.id} className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
                    <span className="flex min-w-0 items-center gap-2">
                      <GitBranch size={14} className="shrink-0 text-zinc-500" />
                      <span className="truncate">{target.manifest_path || target.expected_node_id}</span>
                    </span>
                    <code className="w-fit rounded bg-white/10 px-2 py-1 text-xs text-zinc-300">{refLabel(target)}</code>
                  </div>
                ))}
              </div>

              <a
                href={node.repo_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-zinc-200 transition hover:text-white"
              >
                Repository
                <ExternalLink size={14} />
              </a>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
