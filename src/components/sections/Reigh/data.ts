import type { TravelExample } from './TravelSelector';

export const travelExamples: TravelExample[] = [
  {
    id: '2-images',
    label: '2 Images',
    images: [
      '/example-image1.jpg',
      '/example-image2.jpg',
    ],
    video: '/example-video.mp4',
  },
  {
    id: '4-images',
    label: '4 Images',
    images: [
      '/916-1.jpg',
      '/916-2.jpg',
      '/916-3.jpg',
      '/916-4.jpg',
    ],
    video: '/916-output.mp4',
    poster: '/916-output-poster.jpg',
  },
  {
    id: '7-images',
    label: '7 Images',
    images: [
      '/h1-crop.webp',
      '/h2-crop.webp',
      '/h3-crop.webp',
      '/h4-crop.webp',
      '/h5-crop.webp',
      '/h6-crop.webp',
      '/h7-crop.webp',
    ],
    video: '/upscaled-h1.mp4',
    poster: '/h-output-poster.jpg',
  },
];


