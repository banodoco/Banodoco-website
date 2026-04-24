// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { InteractiveEditorLayout } from './InteractiveEditorLayout';

const POST_ID = 'p1';

const renderLayout = (defaultOpen: boolean, withTextarea = false) =>
  render(
    <InteractiveEditorLayout
      postId={POST_ID}
      defaultOpen={defaultOpen}
      canvas={
        <div data-testid="canvas">
          {withTextarea ? <textarea data-testid="guard" /> : null}
        </div>
      }
      drawer={<div data-testid="drawer-content">Drawer</div>}
    />,
  );

beforeEach(() => {
  window.localStorage.clear();
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: 1200,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('InteractiveEditorLayout', () => {
  test('shows the drawer by default when defaultOpen is true', () => {
    renderLayout(true);

    const drawer = screen.getByRole('complementary');
    expect(drawer).toBeTruthy();
    expect((drawer as HTMLElement).style.transform).toBe('translateX(0)');
  });

  test('clicking the toggle closes the drawer and persists false to localStorage', () => {
    renderLayout(true);

    fireEvent.click(screen.getByRole('button', { name: /close editor drawer/i }));

    expect((screen.getByRole('complementary') as HTMLElement).style.transform).toBe('translateX(100%)');
    expect(window.localStorage.getItem('vibe:drawer-open:p1')).toBe('false');
  });

  test('Cmd/Ctrl+\\ toggles outside textareas but not inside them', () => {
    renderLayout(true, true);

    fireEvent.keyDown(document, { metaKey: true, key: '\\' });
    expect((screen.getByRole('complementary') as HTMLElement).style.transform).toBe('translateX(100%)');

    fireEvent.keyDown(document, { metaKey: true, key: '\\' });
    expect((screen.getByRole('complementary') as HTMLElement).style.transform).toBe('translateX(0)');

    const textarea = screen.getByTestId('guard');
    textarea.focus();
    fireEvent.keyDown(document, { metaKey: true, key: '\\' });
    expect((screen.getByRole('complementary') as HTMLElement).style.transform).toBe('translateX(0)');
  });

  test('resizing the drawer persists width 550 to localStorage', () => {
    renderLayout(true);

    const handle = screen.getByTestId('drawer-resize-handle') as HTMLDivElement & {
      setPointerCapture?: (pointerId: number) => void;
      releasePointerCapture?: (pointerId: number) => void;
      hasPointerCapture?: (pointerId: number) => boolean;
    };
    handle.setPointerCapture = vi.fn();
    handle.releasePointerCapture = vi.fn();
    handle.hasPointerCapture = vi.fn(() => true);

    fireEvent.pointerDown(handle, { pointerId: 1, clientX: 720 });
    fireEvent.pointerMove(window, { pointerId: 1, clientX: window.innerWidth - 550 });
    fireEvent.pointerUp(window, { pointerId: 1 });

    expect((screen.getByRole('complementary') as HTMLElement).style.width).toBe('550px');
    expect(window.localStorage.getItem('vibe:drawer-width')).toBe('550');
  });

  test('stays closed when defaultOpen is false and nothing is stored', () => {
    renderLayout(false);

    expect((screen.getByRole('complementary') as HTMLElement).style.transform).toBe('translateX(100%)');
  });
});
