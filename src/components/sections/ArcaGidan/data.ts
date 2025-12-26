export interface ArtworkItem {
  id: string;
  name: string;
  poster: string;
  video: string;
}

export const artworks: ArtworkItem[] = [
  {
    id: '1',
    name: 'Francesco Petrarca',
    poster: '/arca-gidan/1_francesco_petrarca_poster.jpg',
    video: '/arca-gidan/1_francesco_petrarca_video.mp4',
  },
  {
    id: '2',
    name: 'Arnolfo di Cambio',
    poster: '/arca-gidan/2_arnolfo_di_cambio_poster.jpg',
    video: '/arca-gidan/2_arnolfo_di_cambio_video.mp4',
  },
  {
    id: '3',
    name: 'Giotto di Bondone',
    poster: '/arca-gidan/3_giotto_di_bondone_poster.jpg',
    video: '/arca-gidan/3_giotto_di_bondone_video.mp4',
  },
  {
    id: '4',
    name: 'Jean Buridan',
    poster: '/arca-gidan/4_jean_buridan_poster.jpg',
    video: '/arca-gidan/4_jean_buridan_video.mp4',
  },
];

