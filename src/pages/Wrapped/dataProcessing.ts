
import type {
  Milestone,
  Contributor,
  Award,
  ModelTrend,
  HeatmapData,
  ChannelStat,
} from './types';

// --- Lookup maps ---

interface RawMember {
  member_id: string;
  username: string;
  global_name: string | null;
  server_nick: string | null;
}

interface RawChannel {
  channel_id: string;
  channel_name: string;
}

export function buildMemberMap(members: RawMember[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of members) {
    map.set(m.member_id, m.server_nick || m.global_name || m.username);
  }
  return map;
}

export function buildChannelMap(channels: RawChannel[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of channels) {
    map.set(c.channel_id, `#${c.channel_name}`);
  }
  return map;
}

// --- Phase 2: Streaming accumulators ---

export interface Accumulators {
  authorCounts: Map<string, number>;
  channelCounts: Map<string, number>;
  dateCounts: Map<string, number>;
  heatmap: number[][]; // 24 hours x 7 days
  replyCounts: Map<string, number>; // author_id -> reply count (messages that are replies)
  referenceCounts: Map<string, number>; // reference_id -> reply count
  // Circular mean accumulators for night owl / early bird
  authorHourStats: Map<string, { sinSum: number; cosSum: number; n: number }>;
}

export function createAccumulators(): Accumulators {
  const heatmap: number[][] = [];
  for (let h = 0; h < 24; h++) {
    heatmap.push([0, 0, 0, 0, 0, 0, 0]);
  }
  return {
    authorCounts: new Map(),
    channelCounts: new Map(),
    dateCounts: new Map(),
    heatmap,
    replyCounts: new Map(),
    referenceCounts: new Map(),
    authorHourStats: new Map(),
  };
}

interface MessageRow {
  author_id: string;
  channel_id: string;
  created_at: string;
  reference_id: string | null;
}

export function processPage(acc: Accumulators, rows: MessageRow[]): void {
  for (const row of rows) {
    // Author counts
    acc.authorCounts.set(row.author_id, (acc.authorCounts.get(row.author_id) ?? 0) + 1);

    // Channel counts
    acc.channelCounts.set(row.channel_id, (acc.channelCounts.get(row.channel_id) ?? 0) + 1);

    // Date counts
    const dateStr = row.created_at.slice(0, 10); // YYYY-MM-DD
    acc.dateCounts.set(dateStr, (acc.dateCounts.get(dateStr) ?? 0) + 1);

    // Heatmap
    const d = new Date(row.created_at);
    const hour = d.getUTCHours();
    const day = d.getUTCDay(); // 0=Sun, 1=Mon...6=Sat
    // Convert to Mon=0 ... Sun=6
    const dayIdx = day === 0 ? 6 : day - 1;
    acc.heatmap[hour][dayIdx]++;

    // Reply tracking
    if (row.reference_id) {
      acc.replyCounts.set(row.author_id, (acc.replyCounts.get(row.author_id) ?? 0) + 1);
      acc.referenceCounts.set(row.reference_id, (acc.referenceCounts.get(row.reference_id) ?? 0) + 1);
    }

    // Circular hour stats for night owl / early bird
    const hourAngle = (hour / 24) * 2 * Math.PI;
    const stats = acc.authorHourStats.get(row.author_id) ?? { sinSum: 0, cosSum: 0, n: 0 };
    stats.sinSum += Math.sin(hourAngle);
    stats.cosSum += Math.cos(hourAngle);
    stats.n++;
    acc.authorHourStats.set(row.author_id, stats);
  }
}

// --- Phase 2: Derive results from accumulators ---

const AVATAR_COLORS = ['#7C3AED', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#8B5CF6', '#06B6D4', '#F97316', '#14B8A6'];

export function deriveTopContributors(
  authorCounts: Map<string, number>,
  memberMap: Map<string, string>,
): Contributor[] {
  const sorted = [...authorCounts.entries()].sort((a, b) => b[1] - a[1]);
  return sorted.slice(0, 5).map(([id, count], i) => ({
    rank: i + 1,
    username: memberMap.get(id) || id,
    messages: count,
    avatar: AVATAR_COLORS[i % AVATAR_COLORS.length],
  }));
}

export function deriveMilestones(
  dateCounts: Map<string, number>,
  startDate: string,
): Milestone[] {
  const targets = [100000, 250000, 500000, 750000, 1000000];
  const milestoneLabels = ['The First 100K', 'Scaling Up', 'Halfway There!', 'Exponential Growth', 'THE MILLION!'];
  const sortedDates = [...dateCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]));

  const start = new Date(startDate);
  let cumulative = 0;
  const milestones: Milestone[] = [];
  let targetIdx = 0;

  for (const [date, count] of sortedDates) {
    cumulative += count;
    while (targetIdx < targets.length && cumulative >= targets[targetIdx]) {
      const d = new Date(date);
      const daysFromStart = Math.round((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      milestones.push({
        count: targets[targetIdx],
        date,
        daysFromStart,
        label: milestoneLabels[targetIdx],
      });
      targetIdx++;
    }
    if (targetIdx >= targets.length) break;
  }

  return milestones;
}

export function deriveHeatmapData(heatmap: number[][]): HeatmapData[] {
  // Group into 3-hour blocks matching the demo format (0,3,6,9,12,15,18,21)
  const hours = [0, 3, 6, 9, 12, 15, 18, 21];
  return hours.map(h => {
    const data: number[] = [];
    for (let day = 0; day < 7; day++) {
      let sum = 0;
      for (let offset = 0; offset < 3; offset++) {
        sum += heatmap[(h + offset) % 24][day];
      }
      data.push(sum);
    }
    return { hour: h, data };
  });
}

export function deriveChannelStats(
  channelCounts: Map<string, number>,
  channelMap: Map<string, string>,
  totalMessages: number,
): ChannelStat[] {
  const sorted = [...channelCounts.entries()].sort((a, b) => b[1] - a[1]);
  const top5 = sorted.slice(0, 5);
  const otherCount = sorted.slice(5).reduce((sum, [, c]) => sum + c, 0);

  const stats: ChannelStat[] = top5.map(([id, count]) => ({
    name: channelMap.get(id) || id,
    messages: count,
    percentage: Math.round((count / totalMessages) * 100),
  }));

  if (otherCount > 0) {
    stats.push({
      name: 'Other',
      messages: otherCount,
      percentage: Math.round((otherCount / totalMessages) * 100),
    });
  }

  return stats;
}

export function deriveMostHelpful(
  replyCounts: Map<string, number>,
  memberMap: Map<string, string>,
): Award {
  let maxId = '';
  let maxCount = 0;
  for (const [id, count] of replyCounts) {
    if (count > maxCount) {
      maxCount = count;
      maxId = id;
    }
  }
  return {
    username: memberMap.get(maxId) || maxId,
    count: maxCount,
    metric: 'helpful replies',
  };
}

export function deriveMostRepliedThread(
  referenceCounts: Map<string, number>,
): { replies: number; topic: string; referenceId: string } {
  let maxId = '';
  let maxCount = 0;
  for (const [id, count] of referenceCounts) {
    if (count > maxCount) {
      maxCount = count;
      maxId = id;
    }
  }
  return { replies: maxCount, topic: 'Most discussed thread', referenceId: maxId };
}

export function deriveBusiestDay(
  dateCounts: Map<string, number>,
): { date: string; messages: number; reason: string } {
  let maxDate = '';
  let maxCount = 0;
  for (const [date, count] of dateCounts) {
    if (count > maxCount) {
      maxCount = count;
      maxDate = date;
    }
  }
  return { date: maxDate, messages: maxCount, reason: 'Peak activity day' };
}

function circularMeanHour(sinSum: number, cosSum: number): number {
  let angle = Math.atan2(sinSum, cosSum);
  if (angle < 0) angle += 2 * Math.PI;
  return (angle / (2 * Math.PI)) * 24;
}

function formatHourMinute(hourFloat: number): string {
  const h = Math.floor(hourFloat);
  const m = Math.round((hourFloat - h) * 60);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
}

export function deriveNightOwl(
  authorHourStats: Map<string, { sinSum: number; cosSum: number; n: number }>,
  memberMap: Map<string, string>,
  minMessages: number = 100,
): Award {
  // Night owl: average posting time closest to 3 AM (hour 3)
  const targetHour = 3;
  let bestId = '';
  let bestDist = Infinity;

  for (const [id, stats] of authorHourStats) {
    if (stats.n < minMessages) continue;
    const avgHour = circularMeanHour(stats.sinSum / stats.n, stats.cosSum / stats.n);
    // Circular distance to target
    let dist = Math.abs(avgHour - targetHour);
    if (dist > 12) dist = 24 - dist;
    if (dist < bestDist) {
      bestDist = dist;
      bestId = id;
    }
  }

  const stats = authorHourStats.get(bestId);
  const avgHour = stats ? circularMeanHour(stats.sinSum / stats.n, stats.cosSum / stats.n) : 3;

  return {
    username: memberMap.get(bestId) || bestId,
    avgTime: formatHourMinute(avgHour),
    timezone: 'UTC',
  };
}

export function deriveEarlyBird(
  authorHourStats: Map<string, { sinSum: number; cosSum: number; n: number }>,
  memberMap: Map<string, string>,
  minMessages: number = 100,
): Award {
  // Early bird: average posting time closest to 6 AM (hour 6)
  const targetHour = 6;
  let bestId = '';
  let bestDist = Infinity;

  for (const [id, stats] of authorHourStats) {
    if (stats.n < minMessages) continue;
    const avgHour = circularMeanHour(stats.sinSum / stats.n, stats.cosSum / stats.n);
    let dist = Math.abs(avgHour - targetHour);
    if (dist > 12) dist = 24 - dist;
    if (dist < bestDist) {
      bestDist = dist;
      bestId = id;
    }
  }

  const stats = authorHourStats.get(bestId);
  const avgHour = stats ? circularMeanHour(stats.sinSum / stats.n, stats.cosSum / stats.n) : 6;

  return {
    username: memberMap.get(bestId) || bestId,
    avgTime: formatHourMinute(avgHour),
    timezone: 'UTC',
  };
}

// --- Phase 3: Model trends ---

interface MonthlyMentionCounts {
  [month: string]: number;
}

export function buildModelTrends(
  modelResults: Map<string, { created_at: string }[]>,
): ModelTrend[] {
  const modelMonthCounts: Map<string, MonthlyMentionCounts> = new Map();
  const allMonths = new Set<string>();

  for (const [model, rows] of modelResults) {
    const counts: MonthlyMentionCounts = {};
    for (const row of rows) {
      const month = row.created_at.slice(0, 7); // YYYY-MM
      counts[month] = (counts[month] ?? 0) + 1;
      allMonths.add(month);
    }
    modelMonthCounts.set(model, counts);
  }

  const sortedMonths = [...allMonths].sort();

  return sortedMonths.map(month => ({
    month,
    sd: (modelMonthCounts.get('sd')?.[month] ?? 0) + (modelMonthCounts.get('sdxl')?.[month] ?? 0),
    flux: modelMonthCounts.get('flux')?.[month] ?? 0,
    wan: modelMonthCounts.get('wan')?.[month] ?? 0,
    animatediff: modelMonthCounts.get('animatediff')?.[month] ?? 0,
    cogvideo: modelMonthCounts.get('cogvideo')?.[month] ?? 0,
    hunyuan: modelMonthCounts.get('hunyuan')?.[month] ?? 0,
    ltx: modelMonthCounts.get('ltx')?.[month] ?? 0,
  }));
}

// --- Phase 3: Gratitude ---

export function deriveMostThankful(
  thankRows: { author_id: string }[],
  memberMap: Map<string, string>,
): Award {
  const counts = new Map<string, number>();
  for (const row of thankRows) {
    counts.set(row.author_id, (counts.get(row.author_id) ?? 0) + 1);
  }

  let maxId = '';
  let maxCount = 0;
  for (const [id, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      maxId = id;
    }
  }

  return {
    username: memberMap.get(maxId) || maxId,
    count: maxCount,
    metric: 'thank yous',
  };
}

// --- Phase 4: Fun stats from content samples ---

const STOP_WORDS = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see',
  'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over',
  'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work',
  'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these',
  'give', 'day', 'most', 'us', 'is', 'are', 'was', 'were', 'been', 'has',
  'had', 'did', 'does', 'am', 'im', "i'm", 'dont', "don't", 'cant', "can't",
  'its', "it's", 'thats', "that's", 'yeah', 'yes', 'no', 'ok', 'okay',
]);

export function deriveLongestMessage(
  rows: { content: string; author_id: string }[],
  memberMap: Map<string, string>,
): { chars: number; username: string } {
  let maxLen = 0;
  let maxAuthor = '';
  for (const row of rows) {
    if (row.content && row.content.length > maxLen) {
      maxLen = row.content.length;
      maxAuthor = row.author_id;
    }
  }
  return { chars: maxLen, username: memberMap.get(maxAuthor) || maxAuthor };
}

const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu;

export function deriveMostUsedEmoji(
  rows: { content: string }[],
): { emoji: string; count: number } {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.content) continue;
    const matches = row.content.match(EMOJI_REGEX);
    if (matches) {
      for (const emoji of matches) {
        counts.set(emoji, (counts.get(emoji) ?? 0) + 1);
      }
    }
  }

  let maxEmoji = '🔥';
  let maxCount = 0;
  for (const [emoji, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      maxEmoji = emoji;
    }
  }
  return { emoji: maxEmoji, count: maxCount };
}

export function deriveMostUsedWord(
  rows: { content: string }[],
): { word: string; count: number } {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.content) continue;
    const words = row.content.toLowerCase().split(/\s+/);
    for (const word of words) {
      const cleaned = word.replace(/[^a-z0-9'-]/g, '');
      if (cleaned.length < 3 || STOP_WORDS.has(cleaned)) continue;
      counts.set(cleaned, (counts.get(cleaned) ?? 0) + 1);
    }
  }

  let maxWord = '';
  let maxCount = 0;
  for (const [word, count] of counts) {
    if (count > maxCount) {
      maxCount = count;
      maxWord = word;
    }
  }
  return { word: maxWord, count: maxCount };
}
