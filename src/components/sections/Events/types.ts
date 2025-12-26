export interface PhotoItem {
  src: string;
  rotation: number;
  x: number;
  y: number;
  caption: string;
}

export interface EventItem {
  id: string;
  label: string;
  year: string;
  date?: string;
  video?: string;
  poster?: string;
  photos?: PhotoItem[];
  comingSoon?: boolean;
}

