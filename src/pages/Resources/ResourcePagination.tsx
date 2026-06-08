import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ResourcePaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

// Active page pill uses the section accent theme, exactly like the active
// filter pills elsewhere on the 2RP page.
const activePageStyle = {
  backgroundColor: 'var(--rp-section-accent-soft)',
  boxShadow: 'inset 0 0 0 1px var(--rp-section-accent-border)',
  color: 'var(--rp-section-accent)',
};

/**
 * Build the list of page tokens to render: always include the first page, the
 * last page, the current page, and one neighbor on each side. Collapse any
 * remaining gaps into an ellipsis token.
 */
function buildPageItems(page: number, totalPages: number): Array<number | 'ellipsis'> {
  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const visible = [...pages]
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const items: Array<number | 'ellipsis'> = [];
  let previous = 0;
  for (const current of visible) {
    if (previous && current - previous > 1) {
      items.push('ellipsis');
    }
    items.push(current);
    previous = current;
  }
  return items;
}

export function ResourcePagination({
  page,
  totalPages,
  onPageChange,
  className,
}: ResourcePaginationProps) {
  if (totalPages <= 1) return null;

  const items = buildPageItems(page, totalPages);
  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  const navButtonClass =
    'rounded-full border border-white/10 p-2 text-white transition hover:border-white/25 disabled:cursor-not-allowed disabled:opacity-30';

  return (
    <div className={className ?? 'flex justify-center'}>
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-950/85 px-3 py-2 text-white shadow-2xl shadow-black/30 backdrop-blur">
        <button
          type="button"
          disabled={isFirst}
          onClick={() => onPageChange(Math.max(1, page - 1))}
          className={navButtonClass}
          aria-label="Previous page"
        >
          <ChevronLeft size={18} />
        </button>

        {items.map((item, index) =>
          item === 'ellipsis' ? (
            <span
              key={`ellipsis-${index}`}
              aria-hidden="true"
              className="px-1 text-sm font-bold text-zinc-600 select-none"
            >
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              aria-label={`Go to page ${item}`}
              aria-current={item === page ? 'page' : undefined}
              className={`min-w-9 rounded-full border px-3 py-1 text-sm font-bold transition ${
                item === page
                  ? 'border-transparent'
                  : 'border-white/10 text-zinc-200 hover:border-white/25'
              }`}
              style={item === page ? activePageStyle : undefined}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          disabled={isLast}
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          className={navButtonClass}
          aria-label="Next page"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
