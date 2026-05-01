import { Bot, ExternalLink, GitBranch, PackageCheck, Plus, ShieldCheck, Star, Workflow } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

import { logAgentNodesDebug } from '@/features/agentNodes/api';
import { useAgentNodeCatalog } from '@/features/agentNodes/useAgentNodeCatalog';
import type { AgentNodeCatalogItem, AgentNodeInstallTarget } from '@/features/agentNodes/types';

const sectionVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

function refLabel(target: AgentNodeInstallTarget): string {
  if ('commit_sha' in target.ref && target.ref.commit_sha) return target.ref.commit_sha.slice(0, 12);
  if ('tag' in target.ref && target.ref.tag) return target.ref.tag;
  if ('branch' in target.ref && target.ref.branch) return target.ref.branch;
  if ('source_ref' in target.ref && target.ref.source_ref) return target.ref.source_ref;
  return 'unresolved';
}

function nodeSummary(node: AgentNodeCatalogItem): string {
  return node.catalog.summary || node.short_description || node.description || 'No description provided yet.';
}

function AgentBadge({ node }: { node: AgentNodeCatalogItem }) {
  const isOrchestrator = node.node_type === 'orchestrator';
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[var(--rp-section-accent-border)] bg-[var(--rp-section-accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--rp-section-accent)]">
      {isOrchestrator ? <Workflow size={12} /> : <Bot size={12} />}
      {isOrchestrator ? 'Orchestrator' : 'Agent'}
    </span>
  );
}

function CatalogFlag({ children, tone }: { children: React.ReactNode; tone: 'red' | 'blue' | 'amber' }) {
  const toneClass = {
    red: 'border-red-300/35 bg-red-500/15 text-red-100',
    blue: 'border-blue-300/35 bg-blue-500/15 text-blue-100',
    amber: 'border-amber-300/35 bg-amber-400/15 text-amber-100',
  }[tone];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass}`}>
      {children}
    </span>
  );
}

export function AgentNodeCard({ node }: { node: AgentNodeCatalogItem }) {
  const target = node.install_targets[0];
  const creator = node.creator.display_name || node.creator.discord_id;

  return (
    <article className="flex h-full flex-col rounded-2xl border border-white/10 bg-black/25 p-5 shadow-2xl shadow-black/20">
      <div className="mb-4 flex flex-wrap gap-2">
        <AgentBadge node={node} />
        {node.catalog.mandatory && (
          <CatalogFlag tone="red"><ShieldCheck size={12} /> Mandatory</CatalogFlag>
        )}
        {node.catalog.default && (
          <CatalogFlag tone="blue"><PackageCheck size={12} /> Default</CatalogFlag>
        )}
        {node.catalog.featured && (
          <CatalogFlag tone="amber"><Star size={12} /> Featured</CatalogFlag>
        )}
      </div>

      <h3 className="text-xl font-black uppercase tracking-tight text-white">{node.name}</h3>
      {creator && <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/35">by {creator}</p>}
      <p className="mt-4 flex-1 text-sm leading-relaxed text-zinc-400">{nodeSummary(node)}</p>

      <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-zinc-500">
        {target ? (
          <div className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <GitBranch size={13} className="shrink-0 text-zinc-400" />
              <span className="truncate">{target.manifest_path || target.expected_node_id}</span>
            </span>
            <code className="shrink-0 rounded bg-white/10 px-2 py-1 text-[11px] text-zinc-300">{refLabel(target)}</code>
          </div>
        ) : (
          'Install target pending review'
        )}
      </div>

      <a
        href={node.repo_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-zinc-200 transition hover:text-white"
      >
        Repository
        <ExternalLink size={14} />
      </a>
    </article>
  );
}

export function AgentNodesSection() {
  const { data, loading, error } = useAgentNodeCatalog();
  const nodes = useMemo(() => data?.nodes ?? [], [data?.nodes]);
  const previewNodes = useMemo(() => nodes.slice(0, 6), [nodes]);

  useEffect(() => {
    const orchestrators = nodes.filter((node) => node.node_type === 'orchestrator').length;
    logAgentNodesDebug('2RP AgentNodesSection state', {
      path: window.location.pathname,
      loading,
      hasError: Boolean(error),
      nodeCount: nodes.length,
      previewCount: previewNodes.length,
      agents: nodes.length - orchestrators,
      orchestrators,
    });
  }, [error, loading, nodes, previewNodes.length]);

  return (
    <motion.section
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={sectionVariants}
      id="agents"
      className="space-y-10 rounded-2xl border border-white/10 bg-[#11151f] p-6 sm:p-8"
    >
      <div className="flex flex-col gap-3 border-b border-zinc-800 pb-5 md:pb-6 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div className="flex shrink-0 items-center gap-3">
          <div className="rp-section-icon rounded-lg p-2">
            <Bot size={20} />
          </div>
          <h2 className="rp-section-heading text-2xl font-black uppercase tracking-tight sm:text-4xl">
            Art Agents
          </h2>
        </div>
        <div className="flex-1 lg:px-4">
          <Link
            to="/art-agents"
            className="rp-secondary-action inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
          >
            Visit Art Agents
          </Link>
        </div>
        <Link
          to="/submit/art-agent"
          className="rp-secondary-action inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15 lg:self-auto"
        >
          <Plus size={16} />
          Add Art Agent
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-64 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-300/20 bg-red-950/20 p-6 text-sm text-red-100">
          {error}
        </div>
      ) : previewNodes.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-8 text-center">
          <Bot className="mx-auto h-10 w-10 text-white/30" />
          <h3 className="mt-4 text-xl font-black uppercase tracking-tight text-white">No approved agent nodes yet</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-500">
            Approved Agent and Orchestrator submissions will appear here once they are enabled in the Banodoco database.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {previewNodes.map((node) => (
            <AgentNodeCard key={node.id} node={node} />
          ))}
        </div>
      )}
    </motion.section>
  );
}
