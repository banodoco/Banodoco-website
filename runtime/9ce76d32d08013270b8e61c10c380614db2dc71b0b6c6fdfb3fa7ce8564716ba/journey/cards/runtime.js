/** Live reduced-motion query, shared by card builders. */
export const REDUCE = typeof matchMedia === 'function'
  ? matchMedia('(prefers-reduced-motion: reduce)')
  : { matches: false, addEventListener() {} };

/** Root-relative asset base — index.html is served from glowshroom/. */
export const CARD_ASSETS = './assets/cards';
