// Sample content_items for the Day 9 calendar. Mirrors the Section 16
// shape so the calendar can later swap to a Supabase query without UI
// changes.

import { CLIENTS, type PlatformKey } from "./clients-data";

export type ContentStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "scheduled"
  | "published"
  | "needs_changes";

export type PostType = "feed" | "reel" | "story" | "carousel" | "video" | "short";

export interface ContentItem {
  id: string;
  client_id: string;
  platform: PlatformKey;
  post_type: PostType;
  caption: string;
  hashtags?: string;
  status: ContentStatus;
  scheduled_at: string; // ISO
  assigned_to: string; // team user id
}

// Build 22 items spanning the current month so the calendar always
// looks populated. Dates are computed from today so the grid stays in
// sync with the browser's "now".
function isoFromOffset(daysFromMonthStart: number, hour: number): string {
  const now = new Date();
  const d = new Date(now.getFullYear(), now.getMonth(), 1 + daysFromMonthStart, hour, 0, 0);
  return d.toISOString();
}

const RAW: Array<Omit<ContentItem, "id" | "scheduled_at"> & {
  day: number;
  hour: number;
}> = [
  { client_id: CLIENTS[0].id, platform: "instagram", post_type: "feed",     caption: "5 reasons your AZ home is solar-ready", status: "scheduled",         assigned_to: "u2", day: 2,  hour: 9 },
  { client_id: CLIENTS[0].id, platform: "tiktok",    post_type: "reel",     caption: "Solar install day-in-the-life",       status: "pending_approval",  assigned_to: "u2", day: 3,  hour: 17 },
  { client_id: CLIENTS[0].id, platform: "linkedin",  post_type: "feed",     caption: "AZ tax credit deadline reminder",      status: "approved",          assigned_to: "u3", day: 4,  hour: 12 },
  { client_id: CLIENTS[0].id, platform: "instagram", post_type: "carousel", caption: "Customer testimonial carousel",         status: "draft",             assigned_to: "u4", day: 8,  hour: 10 },
  { client_id: CLIENTS[0].id, platform: "facebook",  post_type: "feed",     caption: "Spring promo announcement",             status: "scheduled",         assigned_to: "u2", day: 10, hour: 14 },
  { client_id: CLIENTS[0].id, platform: "tiktok",    post_type: "reel",     caption: "Bill comparison: before vs after",     status: "published",         assigned_to: "u4", day: 14, hour: 18 },

  { client_id: CLIENTS[1].id, platform: "instagram", post_type: "feed",     caption: "Onsite generation case study teaser", status: "pending_approval",  assigned_to: "u3", day: 1,  hour: 11 },
  { client_id: CLIENTS[1].id, platform: "linkedin",  post_type: "feed",     caption: "Manufacturing CFO ROI breakdown",      status: "scheduled",         assigned_to: "u3", day: 5,  hour: 9 },
  { client_id: CLIENTS[1].id, platform: "linkedin",  post_type: "carousel", caption: "Industry benchmarks Q2",                status: "draft",             assigned_to: "u3", day: 9,  hour: 15 },

  { client_id: CLIENTS[2].id, platform: "instagram", post_type: "reel",     caption: "Glow-from-within routine reel",        status: "needs_changes",     assigned_to: "u4", day: 2,  hour: 11 },
  { client_id: CLIENTS[2].id, platform: "tiktok",    post_type: "reel",     caption: "60-second skincare hack",              status: "scheduled",         assigned_to: "u2", day: 5,  hour: 19 },
  { client_id: CLIENTS[2].id, platform: "youtube",   post_type: "video",    caption: "Founder interview, full version",      status: "draft",             assigned_to: "u4", day: 12, hour: 13 },
  { client_id: CLIENTS[2].id, platform: "instagram", post_type: "feed",     caption: "Product hero shot",                    status: "approved",          assigned_to: "u4", day: 18, hour: 8 },

  { client_id: CLIENTS[3].id, platform: "linkedin",  post_type: "feed",     caption: "Founder Q&A part 2",                   status: "scheduled",         assigned_to: "u3", day: 3,  hour: 17 },
  { client_id: CLIENTS[3].id, platform: "x",         post_type: "feed",     caption: "Thread: how we cut our SaaS CAC",       status: "approved",          assigned_to: "u5", day: 6,  hour: 10 },
  { client_id: CLIENTS[3].id, platform: "linkedin",  post_type: "feed",     caption: "Hiring announcement",                  status: "pending_approval",  assigned_to: "u3", day: 16, hour: 14 },

  { client_id: CLIENTS[4].id, platform: "instagram", post_type: "feed",     caption: "Energy storage 101 explainer",         status: "scheduled",         assigned_to: "u2", day: 4,  hour: 9 },
  { client_id: CLIENTS[4].id, platform: "linkedin",  post_type: "feed",     caption: "Conference recap with photos",         status: "published",         assigned_to: "u2", day: 7,  hour: 11 },
  { client_id: CLIENTS[4].id, platform: "facebook",  post_type: "feed",     caption: "Community event recap",                status: "scheduled",         assigned_to: "u2", day: 11, hour: 16 },
  { client_id: CLIENTS[4].id, platform: "instagram", post_type: "carousel", caption: "Behind the scenes carousel",           status: "draft",             assigned_to: "u2", day: 22, hour: 12 },

  { client_id: CLIENTS[5].id, platform: "instagram", post_type: "reel",     caption: "Morning routine reel",                  status: "draft",             assigned_to: "u4", day: 13, hour: 7 },
  { client_id: CLIENTS[5].id, platform: "linkedin",  post_type: "feed",     caption: "Coaching cohort kickoff",              status: "scheduled",         assigned_to: "u4", day: 19, hour: 13 },
];

export const CONTENT_ITEMS: ContentItem[] = RAW.map((r, i) => ({
  id: `ci_${i + 1}`,
  client_id: r.client_id,
  platform: r.platform,
  post_type: r.post_type,
  caption: r.caption,
  status: r.status,
  assigned_to: r.assigned_to,
  scheduled_at: isoFromOffset(r.day - 1, r.hour),
}));

export const CONTENT_STATUS_LABEL: Record<ContentStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  needs_changes: "Needs Changes",
};

// Platform-aware caption character limits.
export const CAPTION_LIMITS: Record<PlatformKey, number> = {
  instagram: 2200,
  tiktok: 2200,
  youtube: 5000,
  facebook: 63206,
  linkedin: 3000,
  x: 280,
};

// Post types available per platform.
export const POST_TYPES_BY_PLATFORM: Record<PlatformKey, PostType[]> = {
  instagram: ["feed", "reel", "story", "carousel"],
  tiktok: ["reel", "video"],
  youtube: ["video", "short"],
  facebook: ["feed", "video", "story"],
  linkedin: ["feed", "carousel", "video"],
  x: ["feed"],
};

export const POST_TYPE_LABEL: Record<PostType, string> = {
  feed: "Feed Post",
  reel: "Reel",
  story: "Story",
  carousel: "Carousel",
  video: "Video",
  short: "Short",
};

export const CONTENT_STATUS_STYLE: Record<
  ContentStatus,
  { bg: string; fg: string }
> = {
  draft:            { bg: "#F1F5F9", fg: "#475569" },
  pending_approval: { bg: "#FEF3C7", fg: "#92400E" },
  approved:         { bg: "#D1FAE5", fg: "#065F46" },
  scheduled:        { bg: "#DBEAFE", fg: "#1E40AF" },
  published:        { bg: "#E5E7EB", fg: "#374151" },
  needs_changes:    { bg: "#FEE2E2", fg: "#991B1B" },
};
