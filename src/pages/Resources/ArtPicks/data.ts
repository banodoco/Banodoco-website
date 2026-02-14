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

const creators = ['Aether', 'Lumina', 'Zephyr', 'Kael', 'Nyx', 'Oberon', 'Silas', 'Vesper', 'Cyrus', 'Elysia'];
const adjectives = ['Ethereal', 'Cinematic', 'Surreal', 'Gothic', 'Noir', 'Vibrant', 'Liminal', 'Hyper-realistic'];
const subjects = ['Portraits', 'Cityscapes', 'Anomalies', 'Visions', 'Dreams', 'Realms', 'Echoes', 'Frequencies'];

function getWeekId(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-w${String(weekNo).padStart(2, '0')}`;
}

function generateWeeks(): ArtPickWeek[] {
  const weeks: ArtPickWeek[] = [];
  const now = new Date();

  // Find the most recent Monday
  const current = new Date(now);
  current.setHours(0, 0, 0, 0);
  const day = current.getDay();
  const diff = day === 0 ? 6 : day - 1;
  current.setDate(current.getDate() - diff);

  for (let i = 0; i < 104; i++) {
    const monday = new Date(current);
    monday.setDate(current.getDate() - i * 7);

    const dateStr = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const weekNum = 104 - i;

    const videos: ArtPickVideo[] = Array.from({ length: 10 }, (_, j) => ({
      title: `${adjectives[j % adjectives.length]} ${subjects[j % subjects.length]} #${weekNum}-${j + 1}`,
      creator: creators[j % creators.length],
      thumbnailUrl: null,
      videoUrl: null,
    }));

    weeks.push({
      id: getWeekId(monday),
      weekOf: monday.toISOString().slice(0, 10),
      title: `Week of ${dateStr}`,
      introText: `A collection of the most stunning AI-generated visuals from our community members for this week. Featuring explorations into ${adjectives[i % 8].toLowerCase()} textures and ${subjects[i % 8].toLowerCase()} that push the boundaries of current generation models.`,
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
