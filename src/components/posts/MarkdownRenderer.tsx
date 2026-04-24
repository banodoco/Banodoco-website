import { Fragment, type ComponentPropsWithoutRef } from 'react';
import ReactMarkdown, { type ReactMarkdownProps } from 'react-markdown';
import remarkGfm from 'remark-gfm';

type MarkdownRendererVariant = 'detail' | 'preview';

interface MarkdownRendererProps {
  content: string;
  emptyMessage?: string;
  variant?: MarkdownRendererVariant;
}

const VARIANT_STYLES: Record<
  MarkdownRendererVariant,
  {
    container: string;
    image: string;
    h1: string;
    h2: string;
    h3: string;
    quote: string;
    list: string;
    paragraph: string;
    empty: string;
  }
> = {
  detail: {
    container: 'space-y-4',
    image: 'w-full rounded-xl border border-white/10',
    h1: 'text-4xl font-bold text-white',
    h2: 'text-3xl font-semibold text-white',
    h3: 'text-2xl font-semibold text-white',
    quote: 'border-l-2 border-orange-400/50 pl-4 text-lg italic text-zinc-300',
    list: 'list-disc space-y-2 pl-6 text-zinc-300',
    paragraph: 'whitespace-pre-wrap text-base leading-8 text-zinc-300',
    empty: 'text-zinc-500',
  },
  preview: {
    container: 'space-y-3',
    image: 'w-full rounded-lg border border-zinc-800',
    h1: 'text-2xl font-bold text-zinc-100',
    h2: 'text-xl font-semibold text-zinc-100',
    h3: 'text-lg font-semibold text-zinc-100',
    quote: 'border-l-2 border-orange-400/40 pl-3 text-sm italic text-zinc-300',
    list: 'list-disc space-y-1.5 pl-5 text-sm text-zinc-200',
    paragraph: 'whitespace-pre-wrap break-words text-sm leading-6 text-zinc-200',
    empty: 'text-sm text-zinc-500',
  },
};

export function MarkdownRenderer({
  content,
  emptyMessage,
  variant = 'detail',
}: MarkdownRendererProps) {
  const styles = VARIANT_STYLES[variant];
  const trimmedContent = content.trim();

  if (!trimmedContent) {
    return emptyMessage ? <p className={styles.empty}>{emptyMessage}</p> : null;
  }

  const components = {
    a: ({ children, href, ...props }: ComponentPropsWithoutRef<'a'>) => (
      <a
        {...props}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-orange-300 underline decoration-orange-400/40 underline-offset-4 transition hover:text-orange-200"
      >
        {children}
      </a>
    ),
    blockquote: ({ children, ...props }: ComponentPropsWithoutRef<'blockquote'>) => (
      <blockquote {...props} className={styles.quote}>
        {children}
      </blockquote>
    ),
    h1: ({ children, ...props }: ComponentPropsWithoutRef<'h1'>) => (
      <h1 {...props} className={styles.h1}>
        {children}
      </h1>
    ),
    h2: ({ children, ...props }: ComponentPropsWithoutRef<'h2'>) => (
      <h2 {...props} className={styles.h2}>
        {children}
      </h2>
    ),
    h3: ({ children, ...props }: ComponentPropsWithoutRef<'h3'>) => (
      <h3 {...props} className={styles.h3}>
        {children}
      </h3>
    ),
    img: ({ alt, src, ...props }: ComponentPropsWithoutRef<'img'>) => (
      <img
        {...props}
        src={src ?? ''}
        alt={alt ?? ''}
        className={styles.image}
        loading="lazy"
      />
    ),
    li: ({ children, ...props }: ComponentPropsWithoutRef<'li'>) => <li {...props}>{children}</li>,
    ol: ({ children, ...props }: ComponentPropsWithoutRef<'ol'>) => (
      <ol {...props} className={styles.list}>
        {children}
      </ol>
    ),
    p: ({ children, ...props }: ComponentPropsWithoutRef<'p'>) => (
      <p {...props} className={styles.paragraph}>
        {children}
      </p>
    ),
    ul: ({ children, ...props }: ComponentPropsWithoutRef<'ul'>) => (
      <ul {...props} className={styles.list}>
        {children}
      </ul>
    ),
  } as unknown as NonNullable<ReactMarkdownProps['components']>;

  return (
    <div className={styles.container}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {trimmedContent}
      </ReactMarkdown>
    </div>
  );
}

export function MarkdownTextSegment({ content }: { content: string }) {
  if (!content.trim()) {
    return <Fragment />;
  }

  return <MarkdownRenderer content={content} variant="detail" />;
}
