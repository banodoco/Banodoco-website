// @vitest-environment happy-dom

import { type ChangeEvent, useState } from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('@/components/posts/MarkdownRenderer', () => ({
  MarkdownRenderer: ({ content }: { content: string }) => (
    <div data-testid="markdown-renderer">{content}</div>
  ),
}));

vi.mock('./PreviewPanel', () => ({
  PreviewPanel: ({ body }: { body: string }) => <div data-testid="preview-panel">{body}</div>,
}));

import { MarkdownEditor, type MarkdownEditorProps } from './MarkdownEditor';

afterEach(() => {
  cleanup();
});

function Harness({
  initialValue = '',
  onChangeSpy,
  ...props
}: Omit<MarkdownEditorProps, 'value' | 'onChange'> & {
  initialValue?: string;
  onChangeSpy?: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <MarkdownEditor
      {...props}
      value={value}
      onChange={(nextValue) => {
        setValue(nextValue);
        onChangeSpy?.(nextValue);
      }}
    />
  );
}

function selectRange(textarea: HTMLTextAreaElement, start: number, end: number) {
  textarea.focus();
  textarea.setSelectionRange(start, end);
}

function getTextarea(): HTMLTextAreaElement {
  return screen.getByPlaceholderText(/start writing in markdown/i) as HTMLTextAreaElement;
}

function getFileInput(): HTMLInputElement {
  const input = document.querySelector('input[type="file"]');
  if (!input) {
    throw new Error('file input not found');
  }
  return input as HTMLInputElement;
}

describe('MarkdownEditor', () => {
  test('wraps selected text in bold markdown', () => {
    render(<Harness initialValue="hello world" />);

    const textarea = getTextarea();
    selectRange(textarea, 0, 5);
    fireEvent.click(screen.getByRole('button', { name: /bold/i }));

    expect(textarea.value).toBe('**hello** world');
  });

  test('wraps selected text in italic markdown', () => {
    render(<Harness initialValue="hello world" />);

    const textarea = getTextarea();
    selectRange(textarea, 6, 11);
    fireEvent.click(screen.getByRole('button', { name: /italic/i }));

    expect(textarea.value).toBe('hello *world*');
  });

  test('prefixes the current line with a heading marker', () => {
    render(<Harness initialValue="headline" />);

    const textarea = getTextarea();
    selectRange(textarea, 0, textarea.value.length);
    fireEvent.click(screen.getByRole('button', { name: /heading/i }));

    expect(textarea.value).toBe('## headline');
  });

  test('prefixes the current line with a quote marker', () => {
    render(<Harness initialValue="quoted" />);

    const textarea = getTextarea();
    selectRange(textarea, 0, textarea.value.length);
    fireEvent.click(screen.getByRole('button', { name: /quote/i }));

    expect(textarea.value).toBe('> quoted');
  });

  test('prefixes the current line with a list marker', () => {
    render(<Harness initialValue="item" />);

    const textarea = getTextarea();
    selectRange(textarea, 0, textarea.value.length);
    fireEvent.click(screen.getByRole('button', { name: /^list$/i }));

    expect(textarea.value).toBe('- item');
  });

  test('inserts a link template', () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole('button', { name: /link/i }));

    expect(getTextarea().value).toBe('[text](url)');
  });

  test('fires onChange while typing', () => {
    const onChangeSpy = vi.fn();
    render(<Harness onChangeSpy={onChangeSpy} />);

    fireEvent.change(getTextarea(), { target: { value: 'typed value' } });

    expect(onChangeSpy).toHaveBeenCalledWith('typed value');
  });

  test('renders MarkdownRenderer preview when embeds are disabled', () => {
    render(<Harness initialValue="plain markdown" enableEmbeds={false} />);

    expect(screen.getByTestId('markdown-renderer').textContent).toBe('plain markdown');
    expect(screen.queryByTestId('preview-panel')).toBeNull();
  });

  test('renders PreviewPanel when embeds are enabled', () => {
    render(<Harness initialValue="::media[123]" enableEmbeds />);

    expect(screen.getByTestId('preview-panel').textContent).toBe('::media[123]');
    expect(screen.queryByTestId('markdown-renderer')).toBeNull();
  });

  test('hides embed picker buttons when embeds are disabled', () => {
    render(<Harness enableEmbeds={false} />);

    expect(screen.queryByRole('button', { name: /^art$/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /^resource$/i })).toBeNull();
  });

  test('hides the media button when inline media is disabled', () => {
    render(<Harness enableInlineMedia={false} />);

    expect(screen.queryByRole('button', { name: /^media$/i })).toBeNull();
  });

  test('inserts uploaded inline markdown at the cursor when onInlineUpload returns a string', async () => {
    const file = new File(['image-bytes'], 'demo.png', { type: 'image/png' });
    const handleInlineUpload = vi.fn().mockResolvedValue('\n\n![demo](https://example.com/demo.png)\n\n');
    render(<Harness initialValue="hello" enableEmbeds={false} onInlineUpload={handleInlineUpload} />);

    const textarea = getTextarea();
    selectRange(textarea, 5, 5);
    fireEvent.click(screen.getByRole('button', { name: /^media$/i }));

    await waitFor(() => {
      expect(document.querySelector('input[type="file"]')).toBeTruthy();
    });
    const input = getFileInput();
    fireEvent.change(input, {
      target: {
        files: [file] as unknown as FileList,
      } satisfies Partial<ChangeEvent<HTMLInputElement>['target']>,
    });

    await waitFor(() => {
      expect(getTextarea().value).toBe('hello\n\n![demo](https://example.com/demo.png)\n\n');
    });
  });

  test('leaves editor state unchanged when onInlineUpload returns null', async () => {
    const file = new File(['image-bytes'], 'demo.png', { type: 'image/png' });
    const handleInlineUpload = vi.fn().mockResolvedValue(null);
    render(<Harness initialValue="hello" enableEmbeds onInlineUpload={handleInlineUpload} />);

    const textarea = getTextarea();
    selectRange(textarea, 5, 5);
    fireEvent.click(screen.getByRole('button', { name: /^media$/i }));

    await waitFor(() => {
      expect(document.querySelector('input[type="file"]')).toBeTruthy();
    });
    const input = getFileInput();
    fireEvent.change(input, {
      target: {
        files: [file] as unknown as FileList,
      } satisfies Partial<ChangeEvent<HTMLInputElement>['target']>,
    });

    await waitFor(() => {
      expect(handleInlineUpload).toHaveBeenCalledTimes(1);
    });
    expect(getTextarea().value).toBe('hello');
  });
});
