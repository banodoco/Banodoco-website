type CreateScrollObserverArgs = {
  sectionIds: readonly string[];
  onChange: (sectionId: string) => void;
};

type ScrollObserver = {
  destroy(): void;
};

// Debounce changes so brief intersection flips during snap motion don't fire
// a new transition request. Only emit when the candidate has been stable for this long.
const STABILITY_MS = 150;

export const createScrollObserver = ({
  sectionIds,
  onChange,
}: CreateScrollObserverArgs): ScrollObserver => {
  const elements = sectionIds
    .map(id => document.getElementById(id))
    .filter((element): element is HTMLElement => element !== null);
  const intersectingIds = new Set<string>();
  let currentId: string | null = null;
  let pendingId: string | null = null;
  let stabilityTimer: ReturnType<typeof setTimeout> | null = null;
  let rafId: number | null = null;

  const emit = (id: string) => {
    if (id === currentId) {
      // Cancel any pending change away from the current id.
      if (stabilityTimer !== null) {
        clearTimeout(stabilityTimer);
        stabilityTimer = null;
        pendingId = null;
      }
      return;
    }
    if (id === pendingId) return;
    pendingId = id;
    if (stabilityTimer !== null) clearTimeout(stabilityTimer);
    stabilityTimer = setTimeout(() => {
      stabilityTimer = null;
      const next = pendingId;
      pendingId = null;
      if (next !== null && next !== currentId) {
        currentId = next;
        onChange(next);
      }
    }, STABILITY_MS);
  };

  const pickMidlineSection = () => {
    const viewportMidline = window.innerHeight / 2;
    const straddling = elements.find(element => {
      const rect = element.getBoundingClientRect();
      return rect.top <= viewportMidline && rect.bottom >= viewportMidline;
    });

    if (straddling?.id) {
      emit(straddling.id);
    }
  };

  const scheduleFallback = () => {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      if (intersectingIds.size === 0) {
        pickMidlineSection();
      }
    });
  };

  // IntersectionObserver gives the same section answer as scrollY midpoint math with less per-scroll work.
  const observer = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        const id = entry.target.id;
        if (entry.isIntersecting) {
          intersectingIds.add(id);
          emit(id);
        } else {
          intersectingIds.delete(id);
        }
      });

      if (intersectingIds.size === 0) {
        pickMidlineSection();
      }
    },
    { root: null, rootMargin: '-50% 0px -50% 0px', threshold: 0 }
  );

  elements.forEach(element => observer.observe(element));
  window.addEventListener('scroll', scheduleFallback, { passive: true });
  pickMidlineSection();

  return {
    destroy() {
      observer.disconnect();
      window.removeEventListener('scroll', scheduleFallback);
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      if (stabilityTimer !== null) {
        clearTimeout(stabilityTimer);
      }
    },
  };
};
