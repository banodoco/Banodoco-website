import { Suspense, lazy, useCallback, useRef, useState } from 'react';
import {
  Bold,
  Heading1,
  ImagePlus,
  Italic,
  Link2,
  List,
  Loader2,
  Newspaper,
  Palette,
  Paperclip,
  Quote,
} from 'lucide-react';
import { MarkdownRenderer } from '@/components/posts/MarkdownRenderer';
import type { PostAssetItem, PostMediaItem } from '@/hooks/usePost';
import type { EditorPickerItem } from './PickerGrid';
import { PreviewPanel } from './PreviewPanel';
import { ToolbarButton } from './ToolbarButton';

const EmbedPickerModal = lazy(() =>
  import('./EmbedPickerModal').then((module) => ({ default: module.EmbedPickerModal })),
);

export interface MarkdownEditorProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minRows?: number;
  enableEmbeds?: boolean;
  enableInlineMedia?: boolean;
  onInlineUpload?: (files: File[]) => Promise<string | null>;
  uploadedMedia?: EditorPickerItem[];
  previewMediaById?: Record<string, PostMediaItem>;
  previewAssetsById?: Record<string, PostAssetItem>;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Start writing in Markdown…',
  minRows = 22,
  enableEmbeds = false,
  enableInlineMedia = true,
  onInlineUpload,
  uploadedMedia = [],
  previewMediaById = {},
  previewAssetsById = {},
}: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [openPicker, setOpenPicker] = useState<'art' | 'resource' | 'media' | null>(null);
  const [inlineUploading, setInlineUploading] = useState(false);

  const setEditorState = useCallback(
    (nextValue: string, selectionStart?: number, selectionEnd?: number) => {
      onChange(nextValue);

      window.requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.focus();
        if (selectionStart === undefined || selectionEnd === undefined) return;
        textarea.setSelectionRange(selectionStart, selectionEnd);
      });
    },
    [onChange],
  );

  const insertAtCursor = useCallback(
    (text: string) => {
      const textarea = textareaRef.current;
      const start = textarea?.selectionStart ?? value.length;
      const end = textarea?.selectionEnd ?? value.length;
      const nextValue = `${value.slice(0, start)}${text}${value.slice(end)}`;
      const nextCursor = start + text.length;
      setEditorState(nextValue, nextCursor, nextCursor);
    },
    [setEditorState, value],
  );

  const wrapSelection = useCallback(
    (prefix: string, suffix: string, placeholderText: string) => {
      const textarea = textareaRef.current;
      const start = textarea?.selectionStart ?? value.length;
      const end = textarea?.selectionEnd ?? value.length;
      const selectedText = value.slice(start, end);
      const content = selectedText || placeholderText;
      const insertion = `${prefix}${content}${suffix}`;
      const nextValue = `${value.slice(0, start)}${insertion}${value.slice(end)}`;
      const contentStart = start + prefix.length;
      const contentEnd = contentStart + content.length;
      setEditorState(nextValue, contentStart, contentEnd);
    },
    [setEditorState, value],
  );

  const prefixSelectedLines = useCallback(
    (prefix: string) => {
      const textarea = textareaRef.current;
      const start = textarea?.selectionStart ?? value.length;
      const end = textarea?.selectionEnd ?? value.length;
      const lineStart = value.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
      const lineEndCandidate = value.indexOf('\n', end);
      const lineEnd = lineEndCandidate === -1 ? value.length : lineEndCandidate;
      const selectedLines = value.slice(lineStart, lineEnd) || '';
      const transformed = selectedLines
        .split('\n')
        .map((line) => `${prefix}${line}`)
        .join('\n');
      const nextValue = `${value.slice(0, lineStart)}${transformed}${value.slice(lineEnd)}`;
      setEditorState(nextValue, lineStart, lineStart + transformed.length);
    },
    [setEditorState, value],
  );

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <ToolbarButton icon={<Bold size={14} />} label="Bold" onClick={() => wrapSelection('**', '**', 'bold text')} />
        <ToolbarButton icon={<Italic size={14} />} label="Italic" onClick={() => wrapSelection('*', '*', 'italic text')} />
        <ToolbarButton icon={<Heading1 size={14} />} label="Heading" onClick={() => prefixSelectedLines('## ')} />
        <ToolbarButton icon={<Quote size={14} />} label="Quote" onClick={() => prefixSelectedLines('> ')} />
        <ToolbarButton icon={<List size={14} />} label="List" onClick={() => prefixSelectedLines('- ')} />
        <ToolbarButton
          icon={<Link2 size={14} />}
          label="Link"
          onClick={() => wrapSelection('[', '](url)', 'text')}
        />
        {(enableEmbeds || enableInlineMedia) && <span className="mx-1 h-6 w-px bg-zinc-800" aria-hidden />}
        {enableEmbeds && (
          <>
            <ToolbarButton
              icon={<Palette size={14} />}
              label="Art"
              active={openPicker === 'art'}
              onClick={() => setOpenPicker(openPicker === 'art' ? null : 'art')}
            />
            <ToolbarButton
              icon={<Newspaper size={14} />}
              label="Resource"
              active={openPicker === 'resource'}
              onClick={() => setOpenPicker(openPicker === 'resource' ? null : 'resource')}
            />
          </>
        )}
        {enableInlineMedia && (
          <ToolbarButton
            icon={<Paperclip size={14} />}
            label="Media"
            active={openPicker === 'media'}
            onClick={() => setOpenPicker(openPicker === 'media' ? null : 'media')}
          />
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={minRows}
          placeholder={placeholder}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-4 font-mono text-sm leading-6 text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600"
        />

        {enableEmbeds ? (
          <PreviewPanel
            body={value}
            mediaById={previewMediaById}
            assetsById={previewAssetsById}
          />
        ) : (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-200">
              <ImagePlus size={16} />
              Live Preview
            </div>
            <MarkdownRenderer content={value} variant="detail" emptyMessage="Preview updates as you type." />
          </div>
        )}
      </div>

      {(enableEmbeds || enableInlineMedia) && (
        <Suspense
          fallback={
            <div className="mt-4 flex items-center gap-2 text-sm text-zinc-400">
              <Loader2 size={16} className="animate-spin" />
              Loading editor tools…
            </div>
          }
        >
          <EmbedPickerModal
            open={openPicker}
            onClose={() => setOpenPicker(null)}
            enableEmbeds={enableEmbeds}
            uploadedMedia={uploadedMedia}
            inlineUploading={inlineUploading}
            onInlineUpload={
              onInlineUpload
                ? async (files) => {
                    setInlineUploading(true);
                    try {
                      return await onInlineUpload(files);
                    } finally {
                      setInlineUploading(false);
                    }
                  }
                : undefined
            }
            onInsert={(token) => {
              insertAtCursor(token);
              setOpenPicker(null);
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
