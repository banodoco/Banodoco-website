import type { EventItem } from './types';

export const events: EventItem[] = [
  {
    id: 'paris-2025',
    label: 'Paris',
    year: '2025',
    date: '28-29 March 2025',
    video: '/events/paris-2025-video-720p.mp4',
    poster: '/events/paris-2025-poster.jpg',
    photos: [
      { src: '/events/paris-2024-1.jpg', rotation: -12, x: 8, y: 68, caption: 'Group photo at ADOS' },
      { src: '/events/paris-2024-2.jpg', rotation: 8, x: 18, y: 62, caption: 'Closing remarks' },
      { src: '/events/paris-2024-3.jpg', rotation: -5, x: 12, y: 78, caption: 'Reviewing the entries' },
      { src: '/events/paris-2024-4.jpg', rotation: 15, x: 25, y: 72, caption: 'Hackathon underway' },
      { src: '/events/paris-2024-5.jpg', rotation: -3, x: 20, y: 85, caption: 'Live demo session' },
    ],
  },
  {
    id: 'la-2025',
    label: 'LA',
    year: '2025',
    date: 'November 7th',
    video: '/events/la-2025-video-720p.mp4',
    poster: '/events/la-2025-poster.jpg',
    photos: [
      { src: '/events/la-2025-1.jpg', rotation: 10, x: 10, y: 65, caption: 'Night out at ADOS' },
      { src: '/events/la-2025-2.jpg', rotation: -8, x: 20, y: 72, caption: 'ComfyUI demo' },
      { src: '/events/la-2025-3.jpg', rotation: 6, x: 15, y: 80, caption: 'After party' },
      { src: '/events/la-2025-4.jpg', rotation: -14, x: 28, y: 68, caption: 'The venue' },
      { src: '/events/la-2025-5.jpg', rotation: 4, x: 22, y: 88, caption: 'Panel discussion' },
    ],
  },
  {
    id: 'paris-2026',
    label: 'Paris',
    year: '2026',
    date: '16—19 April.',
    video: '/events/paris-2026-720p.mp4',
  },
];


