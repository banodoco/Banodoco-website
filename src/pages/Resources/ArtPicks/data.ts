export interface ArtPickVideo {
  title: string;
  creator: string;
  thumbnailUrl: string | null;
  videoUrl: string | null;
}

export interface ArtPickWeek {
  id: string;
  weekOf: string;
  title: string;
  introText: string;
  videos: ArtPickVideo[];
}

function formatWeekTitle(date: Date): string {
  return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getWeekId(date: Date): string {
  // ISO week number
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-w${String(weekNo).padStart(2, '0')}`;
}

export function generateWeeks(): ArtPickWeek[] {
  const weeks: ArtPickWeek[] = [];
  const now = new Date();

  // Find the most recent Monday
  const current = new Date(now);
  current.setHours(0, 0, 0, 0);
  const day = current.getDay();
  const diff = day === 0 ? 6 : day - 1; // days since Monday
  current.setDate(current.getDate() - diff);

  for (let i = 0; i < 104; i++) {
    const monday = new Date(current);
    monday.setDate(current.getDate() - i * 7);

    const videos: ArtPickVideo[] = Array.from({ length: 10 }, (_, j) => ({
      title: `Community Highlight #${j + 1}`,
      creator: `Artist Name`,
      thumbnailUrl: null,
      videoUrl: null,
    }));

    weeks.push({
      id: getWeekId(monday),
      weekOf: toISODate(monday),
      title: formatWeekTitle(monday),
      introText:
        'This week\'s top art picks showcase the incredible creativity of the Banodoco community. From stunning visual effects to experimental animations, these pieces represent the cutting edge of AI-assisted video art.',
      videos,
    });
  }

  return weeks;
}

let _cached: ArtPickWeek[] | null = null;
export function getWeeks(): ArtPickWeek[] {
  if (!_cached) _cached = generateWeeks();
  return _cached;
}
