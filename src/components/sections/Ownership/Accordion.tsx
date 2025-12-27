import { useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AccordionItemProps {
  header: ReactNode;
  content: ReactNode;
  defaultOpen?: boolean;
}

export const AccordionItem = ({ header, content, defaultOpen = false }: AccordionItemProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-4 border border-gray-300 rounded overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full px-4 py-3 text-left transition-colors",
          "flex items-center justify-between gap-4",
          isOpen 
            ? "bg-gray-50" 
            : "bg-white hover:bg-gray-50"
        )}
      >
        <span className="font-medium text-gray-900 pr-4">{header}</span>
        <svg
          className={cn(
            "w-5 h-5 shrink-0 transition-transform duration-200",
            isOpen ? "rotate-180" : "",
            "text-gray-500"
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-4 py-3 bg-white border-t border-gray-300">
          <div className="text-gray-700 leading-relaxed">{content}</div>
        </div>
      )}
    </div>
  );
};

