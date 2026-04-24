import React, { Fragment, createElement } from 'react';

function renderElement(tag, components, props, children = []) {
  const Component = components?.[tag] ?? tag;
  return createElement(Component, props, ...children);
}

function renderInline(text, components, keyPrefix) {
  const nodes = [];
  const pattern =
    /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|~~([^~]+)~~|`([^`]+)`|\*([^*]+)\*|_([^_]+)_|\n/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    if (match[0] === '\n') {
      nodes.push(createElement('br', { key: `${keyPrefix}-br-${match.index}` }));
    } else if (match[1] !== undefined) {
      nodes.push(
        renderElement(
          'img',
          components,
          {
            key: `${keyPrefix}-img-${match.index}`,
            src: match[2],
            alt: match[1],
          },
          [],
        ),
      );
    } else if (match[3] !== undefined) {
      nodes.push(
        renderElement(
          'a',
          components,
          {
            key: `${keyPrefix}-a-${match.index}`,
            href: match[4],
          },
          renderInline(match[3], components, `${keyPrefix}-a-${match.index}`),
        ),
      );
    } else if (match[5] !== undefined) {
      nodes.push(
        renderElement(
          'strong',
          components,
          { key: `${keyPrefix}-strong-${match.index}` },
          renderInline(match[5], components, `${keyPrefix}-strong-${match.index}`),
        ),
      );
    } else if (match[6] !== undefined) {
      nodes.push(
        renderElement(
          'del',
          components,
          { key: `${keyPrefix}-del-${match.index}` },
          renderInline(match[6], components, `${keyPrefix}-del-${match.index}`),
        ),
      );
    } else if (match[7] !== undefined) {
      nodes.push(
        renderElement(
          'code',
          components,
          { key: `${keyPrefix}-code-${match.index}` },
          [match[7]],
        ),
      );
    } else {
      const emphasis = match[8] ?? match[9];
      nodes.push(
        renderElement(
          'em',
          components,
          { key: `${keyPrefix}-em-${match.index}` },
          renderInline(emphasis, components, `${keyPrefix}-em-${match.index}`),
        ),
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

function parseBlocks(markdown) {
  return markdown
    .replace(/\r\n?/g, '\n')
    .trim()
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

export default function ReactMarkdown({ children = '', components = {} }) {
  const blocks = parseBlocks(children);

  return createElement(
    Fragment,
    null,
    ...blocks.map((block, index) => {
      const imageMatch = block.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imageMatch) {
        return renderElement(
          'img',
          components,
          {
            key: `img-${index}`,
            src: imageMatch[2],
            alt: imageMatch[1],
          },
          [],
        );
      }

      const headingMatch = block.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const tag = `h${headingMatch[1].length}`;
        return renderElement(
          tag,
          components,
          { key: `${tag}-${index}` },
          renderInline(headingMatch[2], components, `${tag}-${index}`),
        );
      }

      const lines = block.split('\n');

      if (lines.every((line) => /^>\s?/.test(line))) {
        const content = lines.map((line) => line.replace(/^>\s?/, '')).join('\n');
        return renderElement(
          'blockquote',
          components,
          { key: `blockquote-${index}` },
          renderInline(content, components, `blockquote-${index}`),
        );
      }

      if (lines.every((line) => /^[-*+]\s+/.test(line))) {
        return renderElement(
          'ul',
          components,
          { key: `ul-${index}` },
          lines.map((line, lineIndex) =>
            renderElement(
              'li',
              components,
              { key: `ul-${index}-${lineIndex}` },
              renderInline(line.replace(/^[-*+]\s+/, ''), components, `ul-${index}-${lineIndex}`),
            ),
          ),
        );
      }

      if (lines.every((line) => /^\d+\.\s+/.test(line))) {
        return renderElement(
          'ol',
          components,
          { key: `ol-${index}` },
          lines.map((line, lineIndex) =>
            renderElement(
              'li',
              components,
              { key: `ol-${index}-${lineIndex}` },
              renderInline(line.replace(/^\d+\.\s+/, ''), components, `ol-${index}-${lineIndex}`),
            ),
          ),
        );
      }

      return renderElement(
        'p',
        components,
        { key: `p-${index}` },
        renderInline(block, components, `p-${index}`),
      );
    }),
  );
}
