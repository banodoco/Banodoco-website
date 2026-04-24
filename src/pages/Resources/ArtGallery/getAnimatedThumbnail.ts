export function getAnimatedThumbnail(staticUrl: string): string {
  return staticUrl.replace('/thumbnail.jpg', '/thumbnail.gif?duration=4s&height=360');
}
