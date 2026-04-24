import type { ReactNode } from 'react';

interface ToolbarButtonProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}

export function ToolbarButton({ icon, label, onClick, active = false }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
        active
          ? 'border-orange-400 bg-orange-500/10 text-orange-200'
          : 'border-zinc-800 bg-zinc-950/70 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-900'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
