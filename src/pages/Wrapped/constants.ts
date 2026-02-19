
import type { AppData } from './types';
import { WRAPPED_ASSET_URLS } from '@/lib/externalLinks';

// Sprite grid config
export const SPRITE_URL = WRAPPED_ASSET_URLS.sprite;
export const SPRITE_COLS = 20;
export const SPRITE_ROWS = 10;
export const TOTAL_ITEMS = 140;
export const demoData: AppData = {
  totalMessages: 1000000,
  totalMembers: 12847,
  totalChannels: 45,
  dateRange: { start: "2022-03-15", end: "2025-01-28" },

  milestones: [
    { count: 100000, date: "2023-03-20", daysFromStart: 370, label: "The First 100K" },
    { count: 250000, date: "2023-08-15", daysFromStart: 518, label: "Scaling Up" },
    { count: 500000, date: "2024-01-10", daysFromStart: 666, label: "Halfway There!" },
    { count: 750000, date: "2024-07-22", daysFromStart: 860, label: "Exponential Growth" },
    { count: 1000000, date: "2025-01-15", daysFromStart: 1037, label: "THE MILLION!" },
  ],

  cumulativeMessages: [
    { date: "2022-03-21", cumulative: 500 },
    { date: "2022-06-15", cumulative: 15000 },
    { date: "2022-09-15", cumulative: 40000 },
    { date: "2022-12-15", cumulative: 70000 },
    { date: "2023-03-20", cumulative: 100000 },
    { date: "2023-06-15", cumulative: 180000 },
    { date: "2023-08-15", cumulative: 250000 },
    { date: "2023-12-15", cumulative: 420000 },
    { date: "2024-01-10", cumulative: 500000 },
    { date: "2024-04-15", cumulative: 620000 },
    { date: "2024-07-22", cumulative: 750000 },
    { date: "2024-10-15", cumulative: 880000 },
    { date: "2025-01-15", cumulative: 1000000 },
  ],

  topContributors: [
    { rank: 1, username: "Kijai", messages: 45200, avatar: "#7C3AED" },
    { rank: 2, username: "ComfyMaster", messages: 32100, avatar: "#10B981" },
    { rank: 3, username: "FluxFan", messages: 28500, avatar: "#F59E0B" },
    { rank: 4, username: "WanExplorer", messages: 24300, avatar: "#EF4444" },
    { rank: 5, username: "AIArtist42", messages: 21800, avatar: "#3B82F6" },
  ],

  awards: {
    mostHelpful: { username: "Kijai", count: 2341, metric: "helpful replies" },
    mostThankful: { username: "GratefulUser", count: 1823, metric: "thank yous" },
    nightOwl: { username: "NightCoder", avgTime: "3:24 AM", timezone: "UTC" },
    earlyBird: { username: "MorningPerson", avgTime: "6:15 AM", timezone: "UTC" },
    allNighter: { username: "NocturnalArtist", count: 1542, metric: "late night messages" },
  },

  mostThanked: [
    { rank: 1, username: "Kijai", thanks: 2247 },
    { rank: 2, username: "pom", thanks: 424 },
    { rank: 3, username: "Kosinkadink", thanks: 363 },
    { rank: 4, username: "mel", thanks: 319 },
    { rank: 5, username: "Ablejones", thanks: 297 },
  ],

  modelTrends: [
    { month: "2023-01", sd: 65, animatediff: 15, flux: 0, wan: 0, cogvideo: 0, hunyuan: 0, ltx: 0 },
    { month: "2023-06", sd: 55, animatediff: 20, flux: 0, wan: 0, cogvideo: 5, hunyuan: 0, ltx: 0 },
    { month: "2024-01", sd: 35, animatediff: 10, flux: 15, wan: 5, cogvideo: 10, hunyuan: 5, ltx: 0 },
    { month: "2024-06", sd: 20, animatediff: 5, flux: 30, wan: 12, cogvideo: 12, hunyuan: 8, ltx: 3 },
    { month: "2024-09", sd: 12, animatediff: 3, flux: 35, wan: 20, cogvideo: 10, hunyuan: 10, ltx: 5 },
    { month: "2025-01", sd: 8, animatediff: 2, flux: 28, wan: 30, cogvideo: 8, hunyuan: 12, ltx: 7 },
  ],

  activityHeatmap: [
    { hour: 0, data: [120, 115, 118, 122, 130, 180, 175] },
    { hour: 3, data: [60, 55, 65, 58, 70, 90, 85] },
    { hour: 6, data: [45, 48, 42, 50, 55, 40, 35] },
    { hour: 9, data: [110, 120, 115, 130, 125, 80, 75] },
    { hour: 12, data: [220, 235, 228, 240, 210, 150, 140] },
    { hour: 15, data: [310, 320, 315, 330, 300, 240, 230] },
    { hour: 18, data: [380, 395, 385, 400, 360, 320, 310] },
    { hour: 21, data: [350, 340, 360, 355, 380, 390, 370] },
  ],

  channelStats: [
    { name: "#general", messages: 230000, percentage: 23 },
    { name: "#comfy-help", messages: 180000, percentage: 18 },
    { name: "#showcase", messages: 150000, percentage: 15 },
    { name: "#wan-discussion", messages: 120000, percentage: 12 },
    { name: "#flux", messages: 90000, percentage: 9 },
    { name: "Other", messages: 230000, percentage: 23 },
  ],

  funStats: {
    longestMessage: { chars: 4892, username: "DetailedExplainer" },
    mostRepliedThread: { replies: 156, topic: "Flux vs SD debate" },
    busiestDay: { date: "2024-08-01", messages: 847, reason: "Flux release day" },
    mostUsedEmoji: { emoji: "🔥", count: 45230 },
    mostUsedWord: { word: "workflow", count: 89450 },
  },

  millionthMessage: {
    author: "LuckyUser",
    channel: "#general",
    content: "Has anyone tried the new Wan 2.2 update? The quality is insane!",
    timestamp: "2025-01-15T14:32:18Z",
  },

  topGenerations: [
    {
      month: "2024-06",
      message_id: "demo1",
      author: "ArtistOne",
      avatarUrl: "",
      channel: "#flux_gens",
      created_at: "2024-06-15T12:00:00Z",
      reaction_count: 42,
      mediaUrl: WRAPPED_ASSET_URLS.demoFluxImage,
      mediaType: "image",
      content: "My best Flux generation yet!",
    },
    {
      month: "2024-09",
      message_id: "demo2",
      author: "CreatorTwo",
      avatarUrl: "",
      channel: "#wan_gens",
      created_at: "2024-09-20T18:30:00Z",
      reaction_count: 38,
      mediaUrl: WRAPPED_ASSET_URLS.demoWanVideo,
      mediaType: "video",
      content: "Wan video generation - incredible quality",
    },
  ],
};
