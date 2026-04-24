// @vitest-environment happy-dom

import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MarkdownRenderer } from './MarkdownRenderer';

describe('MarkdownRenderer', () => {
  test('renders plain markdown image syntax as an img element', () => {
    render(<MarkdownRenderer variant="detail" content="![alt](https://example.com/foo.webp)" />);

    const image = screen.getByRole('img', { name: 'alt' }) as HTMLImageElement;
    expect(image.getAttribute('src')).toBe('https://example.com/foo.webp');
    expect(image.getAttribute('alt')).toBe('alt');
    expect(image.className).toContain('w-full');
    expect(image.className).toContain('rounded-xl');
    expect(image.className).toContain('border-white/10');
  });
});
