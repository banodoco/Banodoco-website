export const HOME_SCROLL_CONTAINER_ID = 'home-scroll-container';

export const getHomeScrollContainer = (): HTMLElement | null =>
  document.getElementById(HOME_SCROLL_CONTAINER_ID);
