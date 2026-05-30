import { CLIENTS } from "./clients-data";

export interface MonthlyReport {
  id: string;
  client_id: string;
  month: number; // 0-11
  year: number;
  generated_on: string; // ISO
  follower_change: number;
  posts: number;
  engagement_rate: number; // %
  what_we_did: string[];
  coming_next: string[];
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function reportTitle(r: MonthlyReport): string {
  return `${MONTHS[r.month]} ${r.year}`;
}

// Build the last 6 monthly reports for each major client off the
// current month, so /reports always feels populated.
function build(clientId: string, seed: number): MonthlyReport[] {
  const now = new Date();
  const out: MonthlyReport[] = [];
  let s = seed;
  for (let i = 1; i <= 6; i++) {
    const month = now.getMonth() - i;
    const date = new Date(now.getFullYear(), month, 5);
    s = (s * 9301 + 49297) % 233280;
    const r = s / 233280;
    out.push({
      id: `r_${clientId.slice(-4)}_${date.getFullYear()}_${date.getMonth() + 1}`,
      client_id: clientId,
      month: date.getMonth(),
      year: date.getFullYear(),
      generated_on: new Date(
        date.getFullYear(),
        date.getMonth(),
        Math.floor(r * 6) + 1
      ).toISOString(),
      follower_change: Math.round(80 + r * 360),
      posts: Math.round(8 + r * 14),
      engagement_rate: Number((4 + r * 6).toFixed(1)),
      what_we_did: [
        "Produced and scheduled all monthly content per the agreed mix",
        "Ran 2 reel-led campaigns and 1 lifecycle email tie-in",
        "Refreshed the brand asset folder with new lifestyle photography",
      ],
      coming_next: [
        "Launch the seasonal carousel series",
        "Test 3 new TikTok hooks against the current high-performer",
        "Sit-down with leadership for next-quarter content pillars",
      ],
    });
  }
  return out;
}

export const REPORTS: MonthlyReport[] = [
  ...build(CLIENTS[0].id, 11),
  ...build(CLIENTS[2].id, 23),
  ...build(CLIENTS[3].id, 37),
];

export function reportsForClient(clientId: string): MonthlyReport[] {
  return REPORTS.filter((r) => r.client_id === clientId).sort((a, b) => {
    return (
      new Date(b.year, b.month).getTime() -
      new Date(a.year, a.month).getTime()
    );
  });
}

export function getReport(id: string): MonthlyReport | undefined {
  return REPORTS.find((r) => r.id === id);
}

export function executiveSummary(r: MonthlyReport): string {
  return (
    `${reportTitle(r)} was a steady month: ${r.posts} posts published, ` +
    `+${r.follower_change.toLocaleString()} new followers, and an average ` +
    `engagement rate of ${r.engagement_rate.toFixed(1)}%. The strongest ` +
    `gains came from short-form video, with carousels close behind. ` +
    `Next month focuses on testing new hooks and locking in the ` +
    `seasonal series.`
  );
}
