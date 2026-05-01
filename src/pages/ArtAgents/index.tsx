import { Bot, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Seo } from '@/components/seo/Seo';
import { useAgentNodeCatalog } from '@/features/agentNodes/useAgentNodeCatalog';
import { AgentNodeCard } from '@/pages/Resources/AgentNodesSection';

const pageVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

export default function ArtAgentsPage() {
  const { data, loading, error } = useAgentNodeCatalog();
  const nodes = data?.nodes ?? [];

  return (
    <div className="min-h-screen bg-[#0b0b0f] px-6 pb-16 pt-24 text-zinc-100 sm:pt-28">
      <Seo
        title="Art Agents | Banodoco"
        description="Installable Agent and Orchestrator nodes for ArtAgents. Approved entries from the Banodoco catalog appear here."
        image="/2rp-social-card.jpg"
        url="https://banodoco.ai/art-agents"
      />
      <motion.div
        initial="hidden"
        animate="visible"
        variants={pageVariants}
        className="mx-auto max-w-[1400px] space-y-8"
      >
        <div className="flex flex-col gap-5 border-b border-zinc-800 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <div className="rp-section-icon rounded-lg p-2">
                <Bot size={20} />
              </div>
              <h1 className="rp-section-heading text-3xl font-black uppercase tracking-tight sm:text-5xl">
                Art Agents
              </h1>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              Installable Agent and Orchestrator nodes for ArtAgents. Approved entries from the Banodoco catalog appear here.
            </p>
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
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-64 animate-pulse rounded-2xl border border-white/10 bg-white/[0.04]" />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-300/20 bg-red-950/20 p-6 text-sm text-red-100">
            {error}
          </div>
        ) : nodes.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-10 text-center">
            <Bot className="mx-auto h-12 w-12 text-white/30" />
            <h2 className="mt-4 text-2xl font-black uppercase tracking-tight text-white">No approved art agents yet</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-zinc-500">
              Approved Agent and Orchestrator submissions will appear here once they are enabled in the Banodoco database.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {nodes.map((node) => (
              <AgentNodeCard key={node.id} node={node} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
