import type { ComponentType, ReactNode } from 'react';

export type Components = Partial<
  Record<
    'a' | 'blockquote' | 'code' | 'del' | 'em' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'img' | 'li' | 'ol' | 'p' | 'strong' | 'ul',
    ComponentType<Record<string, unknown>>
  >
>;

export interface ReactMarkdownProps {
  children?: string;
  components?: Components;
  remarkPlugins?: unknown[];
}

declare function ReactMarkdown(props: ReactMarkdownProps): ReactNode;

export default ReactMarkdown;
