import { CLIENTS, PLATFORM_COLOR, type PlatformKey } from "./clients-data";

export interface DailySnapshot {
  date: string; // YYYY-MM-DD
  platform: PlatformKey;
  followers: number;
  reach: number;
  engaged: number; // sum of likes+comments+saves+shares
  posts: number;
}

export interface TopPost {
  id: string;
  client_id: string;
  platform: PlatformKey;
  date: string;
  caption: string;
  likes: number;
  comments: number;
  reach: number;
  thumb_color: string;
}

function isoDay(daysAgo: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// Deterministic pseudo-random for stable charts across reloads.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

interface PlatformSeed {
  platform: PlatformKey;
  startFollowers: number;
  reachBase: number;
  engagedBase: number;
  postCadence: number; // posts per week
  growth: number;     // followers / day baseline
  seed: number;
}

const CLIENT_SEEDS: Record<string, PlatformSeed[]> = {
  [CLIENTS[0].id]: [
    { platform: "instagram", startFollowers: 12000, reachBase: 4200, engagedBase: 280, postCadence: 4, growth: 12, seed: 1 },
    { platform: "tiktok",    startFollowers:  4600, reachBase: 6800, engagedBase: 420, postCadence: 3, growth:  9, seed: 2 },
    { platform: "linkedin",  startFollowers:  1900, reachBase: 1200, engagedBase:  85, postCadence: 2, growth:  3, seed: 3 },
    { platform: "facebook",  startFollowers:  7250, reachBase: 2400, engagedBase: 110, postCadence: 1, growth: -1, seed: 4 },
  ],
  [CLIENTS[2].id]: [
    { platform: "instagram", startFollowers: 24500, reachBase: 9800, engagedBase: 620, postCadence: 5, growth: 18, seed: 5 },
    { platform: "tiktok",    startFollowers: 11200, reachBase: 15400, engagedBase: 1100, postCadence: 5, growth: 36, seed: 6 },
    { platform: "youtube",   startFollowers:  3200, reachBase: 2800, engagedBase: 180, postCadence: 1, growth:  6, seed: 7 },
  ],
  [CLIENTS[3].id]: [
    { platform: "linkedin",  startFollowers:  6400, reachBase: 5200, engagedBase: 320, postCadence: 3, growth: 14, seed: 8 },
    { platform: "x",         startFollowers:  3100, reachBase: 4400, engagedBase: 290, postCadence: 5, growth:  8, seed: 9 },
  ],
};

/** Build 90 days of daily snapshots per (client, platform). */
export function buildClientSnapshots(clientId: string): DailySnapshot[] {
  const seeds = CLIENT_SEEDS[clientId] ?? [];
  const out: DailySnapshot[] = [];
  for (const seed of seeds) {
    const rand = rng(seed.seed);
    let followers = seed.startFollowers;
    for (let d = 89; d >= 0; d--) {
      // Daily growth wiggle.
      followers = Math.max(
        0,
        Math.round(followers + seed.growth + (rand() - 0.5) * seed.growth * 2)
      );
      const dayOfWeek = (new Date(isoDay(d)).getDay() + 6) % 7; // Mon=0
      const weekend = dayOfWeek >= 5 ? 0.7 : 1.1;
      const reach = Math.round(seed.reachBase * weekend * (0.7 + rand()));
      const engaged = Math.round(seed.engagedBase * weekend * (0.6 + rand()));
      const posts =
        rand() < seed.postCadence / 7 ? 1 : 0;
      out.push({
        date: isoDay(d),
        platform: seed.platform,
        followers,
        reach,
        engaged,
        posts,
      });
    }
  }
  return out;
}

export function topPostsForClient(clientId: string): TopPost[] {
  const seeds = CLIENT_SEEDS[clientId] ?? [];
  const out: TopPost[] = [];
  let id = 1;
  for (const seed of seeds) {
    const rand = rng(seed.seed + 100);
    for (let i = 0; i < 4; i++) {
      const reach = Math.round(seed.reachBase * (1.5 + rand() * 4));
      const likes = Math.round(reach * (0.06 + rand() * 0.04));
      const comments = Math.round(likes * (0.05 + rand() * 0.08));
      out.push({
        id: `tp${id++}`,
        client_id: clientId,
        platform: seed.platform,
        date: isoDay(Math.floor(rand() * 28) + 2),
        caption: `${seed.platform.toUpperCase()} hero post #${i + 1}`,
        likes,
        comments,
        reach,
        thumb_color: PLATFORM_COLOR[seed.platform],
      });
    }
  }
  return out;
}

export const ANALYTICS_CLIENT_IDS = Object.keys(CLIENT_SEEDS);

/** "Best time to post" — engagement by day-of-week × hour bucket. */
export function buildHeatmap(clientId: string): number[][] {
  // 7 rows (Mon..Sun) × 6 cols (0-3h, 4-7h, 8-11h, 12-15h, 16-19h, 20-23h)
  const rows = 7;
  const cols = 6;
  const data: number[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(0)
  );
  const seeds = CLIENT_SEEDS[clientId] ?? [];
  for (const seed of seeds) {
    const rand = rng(seed.seed + 50);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const weekend = r >= 5 ? 0.6 : 1;
        const middayBoost = c === 2 || c === 4 ? 1.4 : 1;
        data[r][c] += Math.round(seed.engagedBase * weekend * middayBoost * (0.5 + rand()));
      }
    }
  }
  return data;
}

export const HEATMAP_LABELS = {
  rows: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  cols: ["0-3", "4-7", "8-11", "12-15", "16-19", "20-23"],
};
