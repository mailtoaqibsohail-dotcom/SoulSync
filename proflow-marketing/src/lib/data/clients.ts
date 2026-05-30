import { createClient } from "@/lib/supabase/server";
import type { CurrentUser } from "@/lib/auth/current-user";
import type {
  ClientRow,
  TeamPerson,
  PlatformKey,
  ClientStatus,
  Industry,
} from "@/lib/clients-data";

const AVATAR_COLORS = [
  "#0F172A", "#6366F1", "#0EA5E9", "#10B981", "#F59E0B",
  "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316",
];

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export interface ClientLite {
  id: string;
  name: string;
  initials: string;
  color: string;
  status: string;
}

/**
 * Clients visible to the current user, scoped by RLS:
 *   owner  → all clients in the org
 *   team   → only clients they're assigned to
 *   client → only their own client row
 * Returns a map keyed by client id plus a flat list.
 */
export async function getVisibleClients(
  _user: CurrentUser
): Promise<{ list: ClientLite[]; byId: Map<string, ClientLite> }> {
  const supabase = createClient();
  const { data } = await supabase
    .from("clients")
    .select("id, name, brand_primary, status")
    .order("name");

  const list: ClientLite[] = (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    initials: initialsOf(c.name),
    color: (c.brand_primary as string | null) || colorFor(c.id),
    status: (c.status as string | null) ?? "active",
  }));
  const byId = new Map(list.map((c) => [c.id, c]));
  return { list, byId };
}

function weekBounds(now: Date = new Date()): { start: Date; end: Date } {
  const d = new Date(now);
  const dow = (d.getDay() + 6) % 7;
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(d.getDate() - dow);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

/** Full ClientRow[] for the Clients list, RLS-scoped (owner: all, team: assigned). */
export async function getClientRows(_user: CurrentUser): Promise<ClientRow[]> {
  const supabase = createClient();
  const { start, end } = weekBounds();
  const [clientsRes, platsRes, assignRes, weekContentRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, industry, brand_primary, status, plan_name, monthly_fee")
      .order("name"),
    supabase.from("client_platforms").select("client_id, platform"),
    supabase.from("team_assignments").select("client_id, user_id"),
    supabase
      .from("content_items")
      .select("client_id")
      .gte("scheduled_at", start.toISOString())
      .lt("scheduled_at", end.toISOString()),
  ]);

  const platforms: Record<string, PlatformKey[]> = {};
  for (const p of platsRes.data ?? [])
    (platforms[p.client_id] ??= []).push(p.platform as PlatformKey);
  const teamIds: Record<string, string[]> = {};
  for (const a of assignRes.data ?? []) (teamIds[a.client_id] ??= []).push(a.user_id);
  const postsThisWeek: Record<string, number> = {};
  for (const c of weekContentRes.data ?? [])
    postsThisWeek[c.client_id] = (postsThisWeek[c.client_id] ?? 0) + 1;

  return (clientsRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    initials: initialsOf(c.name),
    industry: ((c.industry as string | null) ?? "Other") as Industry,
    brand_color: (c.brand_primary as string | null) || colorFor(c.id),
    platforms: platforms[c.id] ?? [],
    posts_this_week: postsThisWeek[c.id] ?? 0,
    team_ids: teamIds[c.id] ?? [],
    status: ((c.status as string | null) ?? "active") as ClientStatus,
    plan_name: (c.plan_name as string | null) ?? "",
    monthly_fee: (c.monthly_fee as number | null) ?? 0,
  }));
}

/** Org members (owner + team) shaped as TeamPerson[] for roster avatars. */
export async function getTeamPeople(_user: CurrentUser): Promise<TeamPerson[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("org_members")
    .select("user_id, full_name, email, role, is_active")
    .in("role", ["owner", "team"]);
  return (data ?? []).map((m) => {
    const name = m.full_name || m.email || "Member";
    return {
      id: m.user_id,
      initials: initialsOf(name),
      name,
      color: colorFor(m.user_id),
      role: (m.role === "owner" ? "owner" : "team") as TeamPerson["role"],
      email: m.email ?? "",
      status: m.is_active === false ? "suspended" : "active",
      last_active_at: null,
    };
  });
}
