// @vitest-environment happy-dom

import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ChatMessage, VirtualFileTree } from '@/types/vibe';
import BundleAgentEditor from './BundleAgentEditor';
import type { UseVibeSessionResult } from './useVibeSession';

vi.mock('@/pages/SubmitPost/CoverSection', () => ({ __esModule: true, default: () => null }));
vi.mock('./ChatBar', () => ({ ChatBar: () => <div data-testid="chat-bar" /> }));
vi.mock('./SnapshotGraph', () => ({ SnapshotGraph: () => <div data-testid="snapshot-graph" /> }));

const tree: VirtualFileTree = {
  'index.html': { path: 'index.html', kind: 'text', mime: 'text/html; charset=utf-8', content: '<main />' },
};

const turn = (
  id: string,
  userText: string,
  assistantText: string,
  summary: string,
  assistantParts: ChatMessage['parts'] = [{ type: 'text', text: assistantText }],
): ChatMessage[] => [
  { id: `${id}-user`, role: 'user', createdAt: `2026-04-22T00:00:0${id}Z`, parts: [{ type: 'text', text: userText }] },
  { id: `${id}-assistant`, role: 'assistant', createdAt: `2026-04-22T00:00:1${id}Z`, parts: assistantParts, summary },
];

const chat: ChatMessage[] = [
  ...turn('1', 'First request body', 'First assistant text', 'First finished turn'),
  ...turn('2', 'Second request body', 'Second assistant text', 'Second finished turn', [
    { type: 'tool_call', tool: 'write_file', path: 'index.html' },
    { type: 'text', text: 'Second assistant text' },
  ]),
  ...turn('3', 'Third request body', 'Streaming assistant text', 'Working on preview'),
];

const makeSession = (pending: boolean): UseVibeSessionResult => ({
  tree,
  snapshots: [],
  chat,
  usage: null,
  pending,
  error: null,
  model: 'claude-sonnet-4-6',
  activeSnapshotId: null,
  showProCodePanel: false,
  sessionTokensUsed: 0,
  budgetState: 'ok',
  hydrated: true,
  sendTurn: vi.fn(async () => undefined),
  abortTurn: vi.fn(),
  pickSnapshot: vi.fn(async () => undefined),
  fork: vi.fn(async () => undefined),
  commitTree: vi.fn(async () => undefined),
  slashCommand: vi.fn(async () => undefined),
  exportZip: vi.fn(async () => new Blob()),
});

const renderEditor = (session: UseVibeSessionResult) =>
  render(<BundleAgentEditor postId="post-1" title="Test post" onShipped={vi.fn()} session={session} />);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('BundleAgentEditor', () => {
  test('shows only the streaming turn body by default, keeps older turns behind the expander, and expands a collapsed turn on click', () => {
    renderEditor(makeSession(true));

    expect(screen.getByRole('button', { name: /see 1 more turn/i })).toBeTruthy();
    expect(screen.getByText('Second finished turn')).toBeTruthy();
    expect(screen.getByText('Working on preview')).toBeTruthy();
    expect(screen.getByText('Streaming assistant text')).toBeTruthy();
    expect(screen.queryByText('Second assistant text')).toBeNull();
    expect(screen.queryByText('First finished turn')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /see 1 more turn/i }));

    expect(screen.getByText('First finished turn')).toBeTruthy();
    expect(screen.queryByText('First assistant text')).toBeNull();
    expect(screen.queryByText('Second assistant text')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /first finished turn/i }));

    expect(screen.getByText('First assistant text')).toBeTruthy();
  });

  test('auto-collapses the streaming turn when pending flips to false', async () => {
    const { rerender } = renderEditor(makeSession(true));

    expect(screen.getByText('Streaming assistant text')).toBeTruthy();

    rerender(<BundleAgentEditor postId="post-1" title="Test post" onShipped={vi.fn()} session={makeSession(false)} />);

    await waitFor(() => {
      expect(screen.queryByText('Streaming assistant text')).toBeNull();
    });
    expect(screen.getByText('Working on preview')).toBeTruthy();
  });

  test('preserves an explicit streaming-turn toggle when pending flips to false', () => {
    const { rerender } = renderEditor(makeSession(true));

    fireEvent.click(screen.getByRole('button', { name: /working on preview/i }));
    expect(screen.queryByText('Streaming assistant text')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /working on preview/i }));
    expect(screen.getByText('Streaming assistant text')).toBeTruthy();

    rerender(<BundleAgentEditor postId="post-1" title="Test post" onShipped={vi.fn()} session={makeSession(false)} />);

    expect(screen.getByText('Streaming assistant text')).toBeTruthy();
  });
});
