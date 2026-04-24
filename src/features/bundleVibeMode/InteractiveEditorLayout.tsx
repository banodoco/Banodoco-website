import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { Wrench } from 'lucide-react';
import {
  MAX_DRAWER_WIDTH,
  MIN_DRAWER_WIDTH,
  useDrawerState,
} from './drawerState';

export interface InteractiveEditorLayoutProps {
  postId: string;
  defaultOpen: boolean;
  canvas: ReactNode;
  drawer: ReactNode;
  renderDrawer?(controls: { closeDrawer: () => void }): ReactNode;
}

const MOBILE_BREAKPOINT = 768;

const clampWidth = (value: number): number =>
  Math.min(MAX_DRAWER_WIDTH, Math.max(MIN_DRAWER_WIDTH, Math.round(value)));

const isTypingTarget = (element: Element | null): boolean => {
  if (!(element instanceof HTMLElement)) return false;
  const tagName = element.tagName.toLowerCase();
  return (
    tagName === 'input'
    || tagName === 'textarea'
    || element.isContentEditable
    || element.getAttribute('contenteditable') === 'true'
  );
};

export function InteractiveEditorLayout({
  postId,
  defaultOpen,
  canvas,
  drawer,
  renderDrawer,
}: InteractiveEditorLayoutProps) {
  const { open, setOpen, width, setWidth } = useDrawerState({ postId, defaultOpen });
  const [liveWidth, setLiveWidth] = useState(width);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false,
  );
  const drawerRef = useRef<HTMLElement | null>(null);
  const toggleRef = useRef<HTMLButtonElement | null>(null);
  const previousOpenRef = useRef(open);
  const resizePointerIdRef = useRef<number | null>(null);
  const resizeHandleRef = useRef<HTMLDivElement | null>(null);
  const liveWidthRef = useRef(width);

  useEffect(() => {
    setLiveWidth(width);
    liveWidthRef.current = width;
  }, [width]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const updateIsMobile = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

  const closeDrawer = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  useEffect(() => {
    const wasOpen = previousOpenRef.current;
    previousOpenRef.current = open;

    if (open && !wasOpen) {
      const focusTarget = drawerRef.current?.querySelector<HTMLElement>('[data-drawer-focusable]');
      focusTarget?.focus();
      return;
    }

    if (!open && wasOpen) {
      toggleRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if ((!event.metaKey && !event.ctrlKey) || event.key !== '\\') return;
      if (isTypingTarget(document.activeElement)) return;
      event.preventDefault();
      setOpen(!open);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, setOpen]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (isMobile) return;

    resizePointerIdRef.current = event.pointerId;
    resizeHandleRef.current = event.currentTarget;
    event.currentTarget.setPointerCapture(event.pointerId);

    const onPointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = clampWidth(window.innerWidth - moveEvent.clientX);
      liveWidthRef.current = nextWidth;
      setLiveWidth(nextWidth);
    };

    const onPointerUp = (upEvent: PointerEvent) => {
      if (resizePointerIdRef.current !== upEvent.pointerId) return;
      const handle = resizeHandleRef.current;
      if (handle?.hasPointerCapture(upEvent.pointerId)) {
        handle.releasePointerCapture(upEvent.pointerId);
      }
      resizePointerIdRef.current = null;
      resizeHandleRef.current = null;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      setWidth(liveWidthRef.current);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }, [isMobile, setWidth]);

  const drawerStyle = useMemo((): CSSProperties => {
    if (isMobile) {
      return {
        transform: open ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 180ms ease',
      };
    }

    return {
      width: liveWidth,
      transform: open ? 'translateX(0)' : 'translateX(100%)',
      transition: 'transform 180ms ease',
    };
  }, [isMobile, liveWidth, open]);

  const toggleStyle = useMemo((): CSSProperties => {
    if (isMobile) return { right: 0 };
    return { right: open ? liveWidth : 0, transition: 'right 180ms ease' };
  }, [isMobile, liveWidth, open]);

  // Canvas pushes inward (its right edge animates to drawer width) instead
  // of being overlaid. Stays below the site header at top:60. On mobile the
  // drawer is a bottom sheet, so the canvas keeps the full width.
  const canvasStyle = useMemo((): CSSProperties => {
    if (isMobile) return {};
    return { right: open ? liveWidth : 0, transition: 'right 180ms ease' };
  }, [isMobile, liveWidth, open]);

  return (
    <div className="fixed inset-0 overflow-hidden">
      <div className="absolute bottom-0 left-0 top-[60px]" style={canvasStyle}>
        {canvas}
      </div>

      {open && isMobile && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden"
          onClick={closeDrawer}
          aria-hidden="true"
        />
      )}

      <aside
        ref={drawerRef}
        role="complementary"
        tabIndex={-1}
        className="fixed right-0 bottom-0 top-0 z-50 flex flex-col border-l border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl max-md:left-0 max-md:top-auto max-md:h-[80vh] max-md:border-l-0 max-md:border-t"
        style={drawerStyle}
      >
        {!isMobile && (
          <div
            data-testid="drawer-resize-handle"
            className="absolute bottom-0 left-0 top-0 w-1 cursor-col-resize bg-transparent transition hover:bg-zinc-700/60"
            onPointerDown={handlePointerDown}
            aria-hidden="true"
          />
        )}
        <div className="flex min-h-0 flex-1 flex-col">
          {renderDrawer ? renderDrawer({ closeDrawer }) : drawer}
        </div>
      </aside>

      <button
        ref={toggleRef}
        type="button"
        aria-label={open ? 'Close editor drawer' : 'Open editor drawer'}
        onClick={() => setOpen(!open)}
        className="fixed top-1/2 z-[60] flex h-16 w-8 -translate-y-1/2 items-center justify-center rounded-l-full border border-r-0 border-zinc-700 bg-zinc-950/90 text-zinc-200 shadow-lg transition-colors hover:bg-zinc-900"
        style={toggleStyle}
      >
        {open ? (
          <span aria-hidden="true" className="text-lg leading-none">
            &gt;
          </span>
        ) : (
          <Wrench size={16} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

export default InteractiveEditorLayout;
