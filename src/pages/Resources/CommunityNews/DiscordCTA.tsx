import { useState } from 'react';
import { DiscordIcon } from '@/components/ui/icons';
const DISCORD_INVITE_URL = 'https://discord.gg/NnFxGvx94b';
const AGENT_PARSE_INSTRUCTIONS = 'Agent instructions to parse data: Join the Banodoco Discord community at https://discord.gg/NnFxGvx94b';

export const DiscordCTA = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(AGENT_PARSE_INSTRUCTIONS);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      {/* Discord link */}
      <a
        href={DISCORD_INVITE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors"
      >
        <DiscordIcon className="w-5 h-5" />
        <span>Join the conversation on Discord</span>
      </a>

      <div className="hidden sm:block w-px h-6 bg-white/10" />

      {/* Copy agent instructions */}
      <button
        onClick={handleCopy}
        className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-cyan-500/15 text-cyan-400 hover:bg-cyan-500/25 transition-colors"
      >
        {copied ? (
          <>
            <span>&#10003;</span>
            <span>Copied!</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
            <span>Copy Agent Instructions to Parse Data</span>
          </>
        )}
      </button>
    </div>
  );
};
