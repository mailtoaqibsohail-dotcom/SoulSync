// Sample data powering the Day 5 dashboard shells. Swap to Supabase
// queries once content_items / approvals / activity_log are populated.

export function timeOfDayGreeting(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export const OWNER_STATS = {
  active_clients: 12,
  posts_this_week: 47,
  pending_approvals: 6,
  overdue_tasks: 2,
};

export type AttentionType =
  | "Approval Overdue"
  | "Client Replied"
  | "Failed to Publish";

export interface AttentionItem {
  id: string;
  client_name: string;
  client_initials: string;
  client_color: string;
  type: AttentionType;
  description: string;
}

export const OWNER_ATTENTION: AttentionItem[] = [
  {
    id: "a1",
    client_name: "Luvelie Beauty",
    client_initials: "LB",
    client_color: "#EC4899",
    type: "Approval Overdue",
    description:
      "Instagram post for Tuesday has been pending approval for 3 days.",
  },
  {
    id: "a2",
    client_name: "Benny Co.",
    client_initials: "BC",
    client_color: "#0EA5E9",
    type: "Client Replied",
    description: "Asked for a tweak on the Wednesday reel caption.",
  },
  {
    id: "a3",
    client_name: "Acme Solar",
    client_initials: "AS",
    client_color: "#16A34A",
    type: "Failed to Publish",
    description: "LinkedIn post hit a 422 error at the scheduled time.",
  },
];

export interface CalendarChip {
  id: string;
  client_name: string;
  client_color: string;
  caption: string;
  platform: "instagram" | "tiktok" | "youtube" | "facebook" | "linkedin" | "x";
  day_offset: number; // days from Monday of current week
  hour: number;
}

export const WEEK_CHIPS: CalendarChip[] = [
  {
    id: "c1",
    client_name: "Acme Solar",
    client_color: "#16A34A",
    caption: "5 reasons your AZ home is solar-ready",
    platform: "instagram",
    day_offset: 0,
    hour: 9,
  },
  {
    id: "c2",
    client_name: "Bluefield Energy",
    client_color: "#1E40AF",
    caption: "Onsite generation case study",
    platform: "linkedin",
    day_offset: 1,
    hour: 14,
  },
  {
    id: "c3",
    client_name: "Luvelie Beauty",
    client_color: "#EC4899",
    caption: "Glow-from-within routine reel",
    platform: "instagram",
    day_offset: 2,
    hour: 11,
  },
  {
    id: "c4",
    client_name: "Benny Co.",
    client_color: "#0EA5E9",
    caption: "Founder Q&A part 2",
    platform: "tiktok",
    day_offset: 3,
    hour: 17,
  },
  {
    id: "c5",
    client_name: "Acme Solar",
    client_color: "#16A34A",
    caption: "Tax credit deadline reminder",
    platform: "facebook",
    day_offset: 4,
    hour: 12,
  },
];

export interface ActivityEvent {
  id: string;
  actor_initials: string;
  actor_color: string;
  sentence: string;
  time_ago: string;
}

export const RECENT_TEAM_ACTIVITY: ActivityEvent[] = [
  {
    id: "e1",
    actor_initials: "SC",
    actor_color: "#6366F1",
    sentence: "Sarah created a draft post for Luvelie Beauty.",
    time_ago: "2 hours ago",
  },
  {
    id: "e2",
    actor_initials: "AK",
    actor_color: "#10B981",
    sentence: "Ahmed scheduled 5 posts for Benny Co.",
    time_ago: "3 hours ago",
  },
  {
    id: "e3",
    actor_initials: "JC",
    actor_color: "#F59E0B",
    sentence: "Jane (Acme Solar) approved INV-2026-0042.",
    time_ago: "5 hours ago",
  },
  {
    id: "e4",
    actor_initials: "SC",
    actor_color: "#6366F1",
    sentence: "Sarah uploaded 14 new assets to GreenGrid Co.",
    time_ago: "Yesterday",
  },
  {
    id: "e5",
    actor_initials: "MR",
    actor_color: "#EF4444",
    sentence: "Mariam requested changes on Bluefield reel.",
    time_ago: "Yesterday",
  },
];

// Team member dashboard ---------------------------------------------------

export const TEAM_STATS = {
  posts_in_progress: 7,
  todays_todos: 4,
  client_feedback: 2,
  approvals_pending_review: 3,
};

export const TEAM_TODO: Array<{ id: string; title: string; client: string; due: string }> = [
  { id: "t1", title: "Finish 3 reels for Luvelie Beauty", client: "Luvelie Beauty", due: "Today" },
  { id: "t2", title: "Apply caption tweak on Wednesday post", client: "Benny Co.", due: "Today" },
  { id: "t3", title: "Schedule Q&A series for Acme Solar", client: "Acme Solar", due: "Tomorrow" },
  { id: "t4", title: "Write Bluefield case study", client: "Bluefield Energy", due: "Thursday" },
];

// Client overview ---------------------------------------------------------

export const CLIENT_PLATFORM_CARDS: Array<{
  platform: "instagram" | "tiktok" | "youtube" | "facebook" | "linkedin" | "x";
  followers: number;
  change_30d: number;
}> = [
  { platform: "instagram", followers: 12480, change_30d: 312 },
  { platform: "tiktok", followers: 4820, change_30d: 215 },
  { platform: "linkedin", followers: 1980, change_30d: 47 },
  { platform: "facebook", followers: 7245, change_30d: -18 },
];

export const CLIENT_ATTENTION: Array<{
  id: string;
  title: string;
  cta: string;
  href: string;
}> = [
  { id: "1", title: "3 posts waiting for approval", cta: "Review now", href: "/approvals" },
  { id: "2", title: "Monthly report ready", cta: "View May report", href: "/reports" },
  { id: "3", title: "Brand guidelines updated", cta: "See changes", href: "/brand" },
];

export const CLIENT_RECENT_WINS: string[] = [
  "Your Reel from May 14 reached 18,400 people, your best this month.",
  "You gained 312 followers on Instagram this month, up 24% from April.",
  "Your most-saved post: \"5 reasons your AZ home is solar-ready\" (47 saves).",
];
