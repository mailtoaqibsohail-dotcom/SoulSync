// Sample client roster powering the Day 6 Clients page until Supabase
// reads are wired up. Mirrors the shape of the spec's `clients` +
// `client_platforms` + `team_assignments` tables.

import type { AppRole } from "./auth/current-user";

export type PlatformKey =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "facebook"
  | "linkedin"
  | "x";

export const INDUSTRIES = [
  "E-commerce",
  "SaaS",
  "Agency",
  "Coaching",
  "Healthcare",
  "Real Estate",
  "Restaurant",
  "Other",
] as const;
export type Industry = (typeof INDUSTRIES)[number];

export type ClientStatus = "active" | "paused" | "archived";

export type TeamMemberStatus = "active" | "invited" | "suspended";

export interface TeamPerson {
  id: string;
  initials: string;
  name: string;
  color: string;
  role: Exclude<AppRole, "client">;
  email: string;
  status: TeamMemberStatus;
  last_active_at: string | null; // ISO string, null for invited
}

export const TEAM_DIRECTORY: TeamPerson[] = [
  {
    id: "u1",
    initials: "AS",
    name: "Aqib Sohail",
    color: "#0F172A",
    role: "owner",
    email: "aqib@proflow.example",
    status: "active",
    last_active_at: "2026-05-29T07:30:00Z",
  },
  {
    id: "u2",
    initials: "SC",
    name: "Sarah Chen",
    color: "#6366F1",
    role: "team",
    email: "sarah@proflow.example",
    status: "active",
    last_active_at: "2026-05-29T05:14:00Z",
  },
  {
    id: "u3",
    initials: "AK",
    name: "Ahmed Khan",
    color: "#10B981",
    role: "team",
    email: "ahmed@proflow.example",
    status: "active",
    last_active_at: "2026-05-28T22:02:00Z",
  },
  {
    id: "u4",
    initials: "MR",
    name: "Mariam Reza",
    color: "#EF4444",
    role: "team",
    email: "mariam@proflow.example",
    status: "active",
    last_active_at: "2026-05-28T16:48:00Z",
  },
  {
    id: "u5",
    initials: "JD",
    name: "Jordan Doe",
    color: "#F59E0B",
    role: "team",
    email: "jordan@proflow.example",
    status: "invited",
    last_active_at: null,
  },
];

export interface ClientRow {
  id: string;
  name: string;
  initials: string;
  industry: Industry;
  brand_color: string;
  platforms: PlatformKey[];
  posts_this_week: number;
  team_ids: string[];
  status: ClientStatus;
  plan_name: string;
  monthly_fee: number;
}

export const CLIENTS: ClientRow[] = [
  {
    id: "00000000-0000-0000-0000-000000000101",
    name: "Acme Solar",
    initials: "AS",
    industry: "Other",
    brand_color: "#16A34A",
    platforms: ["instagram", "tiktok", "linkedin"],
    posts_this_week: 4,
    team_ids: ["u2", "u3"],
    status: "active",
    plan_name: "Growth Package",
    monthly_fee: 1500,
  },
  {
    id: "00000000-0000-0000-0000-000000000102",
    name: "Bluefield Energy",
    initials: "BE",
    industry: "Other",
    brand_color: "#1E40AF",
    platforms: ["instagram", "linkedin"],
    posts_this_week: 2,
    team_ids: ["u3"],
    status: "active",
    plan_name: "Starter Package",
    monthly_fee: 900,
  },
  {
    id: "00000000-0000-0000-0000-000000000103",
    name: "Luvelie Beauty",
    initials: "LB",
    industry: "E-commerce",
    brand_color: "#EC4899",
    platforms: ["instagram", "tiktok", "youtube"],
    posts_this_week: 6,
    team_ids: ["u2", "u4"],
    status: "active",
    plan_name: "Growth Package",
    monthly_fee: 1800,
  },
  {
    id: "00000000-0000-0000-0000-000000000104",
    name: "Benny Co.",
    initials: "BC",
    industry: "SaaS",
    brand_color: "#0EA5E9",
    platforms: ["linkedin", "x"],
    posts_this_week: 3,
    team_ids: ["u3", "u5"],
    status: "active",
    plan_name: "Starter Package",
    monthly_fee: 1100,
  },
  {
    id: "00000000-0000-0000-0000-000000000105",
    name: "GreenGrid Co.",
    initials: "GG",
    industry: "Other",
    brand_color: "#15803D",
    platforms: ["instagram", "linkedin", "facebook"],
    posts_this_week: 5,
    team_ids: ["u2"],
    status: "active",
    plan_name: "Growth Package",
    monthly_fee: 1500,
  },
  {
    id: "00000000-0000-0000-0000-000000000106",
    name: "Nimbus Coaching",
    initials: "NC",
    industry: "Coaching",
    brand_color: "#7C3AED",
    platforms: ["instagram", "tiktok", "linkedin"],
    posts_this_week: 4,
    team_ids: ["u4"],
    status: "paused",
    plan_name: "Starter Package",
    monthly_fee: 900,
  },
  {
    id: "00000000-0000-0000-0000-000000000107",
    name: "Pioneer Realty",
    initials: "PR",
    industry: "Real Estate",
    brand_color: "#B45309",
    platforms: ["instagram", "facebook", "youtube"],
    posts_this_week: 0,
    team_ids: ["u5"],
    status: "archived",
    plan_name: "Archived",
    monthly_fee: 0,
  },
];

export const PLATFORM_COLOR: Record<PlatformKey, string> = {
  instagram: "#E4405F",
  tiktok: "#000000",
  youtube: "#FF0000",
  facebook: "#1877F2",
  linkedin: "#0A66C2",
  x: "#000000",
};

export const PLATFORM_LABEL: Record<PlatformKey, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  x: "X",
};
