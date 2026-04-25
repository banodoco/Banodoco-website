// Compatibility shim: home page scroll-snap now lives on the document body
// (snap classes applied to <html>) instead of an internal scrolling div.
// `getHomeScrollContainer` returns `document.documentElement` so existing
// callers that read `.scrollTop` / `.clientHeight` / `.scrollHeight` keep working.
//
// IMPORTANT: scroll *events* on the body/document fire on `window`, not on
// `document.documentElement`. Callers that listen for scroll should attach
// their listener to `window` (see DesktopScrollVideo, CrossfadeScrollVideo,
// LayoutContext for examples).

// Kept as a no-op constant for any lingering references; the element with
// this id no longer exists in the DOM after the refactor.
export const HOME_SCROLL_CONTAINER_ID = 'home-scroll-container';

export const getHomeScrollContainer = (): HTMLElement | null =>
  typeof document !== 'undefined' ? document.documentElement : null;
