export const getHeaderHeightPx = (): number => {
  const headerHeightVal = getComputedStyle(document.documentElement)
    .getPropertyValue('--header-height')
    .trim();

  return headerHeightVal.endsWith('px')
    ? parseFloat(headerHeightVal)
    : 80;
};
