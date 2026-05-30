import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import type { CurrentUser } from "@/lib/auth/current-user";
import { getVisibleClients, initialsOf, colorFor } from "@/lib/data/clients";
import type {
  AttentionItem,
  CalendarChip,
  ActivityEvent,
} from "@/lib/dashboard-data";

function weekBounds(now: Date = new Date()): { start: Date; end: Date } {
  const d = new Date(now);
  const dow = (d.getDay() + 6) % 7; // 0 = Monday
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  start.setDate(d.getDate() - dow);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start, end };
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

// ---- Owner dashboard ------------------------------------------------------

export interface OwnerDashboard {
  stats: {
    active_clients: number;
    posts_this_week: number;
    pending_approvals: number;
    overdue_tasks: number;
  };
  attention: AttentionItem[];
  weekChips: CalendarChip[];
  activity: ActivityEvent[];
}

export async function getOwnerDashboard(user: CurrentUser): Promise<OwnerDashboard> {
  const supabase = createClient();
  const { list: clients, byId } = await getVisibleClients(user);
  const { start, end } = weekBounds();
  const nowIso = new Date().toISOString();

  const [posts, pending, overdue, attentionRows, weekRows, activityRows, members] =
    await Promise.all([
      supabase
        .from("content_items")
        .select("id", { count: "exact", head: true })
        .gte("scheduled_at", start.toISOString())
        .lt("scheduled_at", end.toISOString()),
      supabase
        .from("content_items")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending_approval"),
      supabase
        .from("content_items")
        .select("id", { count: "exact", head: true })
        .lt("scheduled_at", nowIso)
        .neq("status", "published"),
      supabase
        .from("content_items")
        .select("id, status, caption, client_id, updated_at")
        .in("status", ["pending_approval", "needs_changes"])
        .order("updated_at", { ascending: false })
        .limit(6),
      supabase
        .from("content_items")
        .select("id, caption, client_id, scheduled_at")
        .gte("scheduled_at", start.toISOString())
        .lt("scheduled_at", end.toISOString())
        .order("scheduled_at"),
      supabase
        .from("activity_log")
        .select("id, action, description, user_id, created_at")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase.from("org_members").select("user_id, full_name"),
    ]);

  const memberName = new Map<string, string>(
    (members.data ?? []).map((m) => [m.user_id, m.full_name ?? "Member"])
  );

  const attention: AttentionItem[] = (attentionRows.data ?? []).map((r) => {
    const c = byId.get(r.client_id);
    return {
      id: r.id,
      client_name: c?.name ?? "Client",
      client_initials: c?.initials ?? "?",
      client_color: c?.color ?? "#64748B",
      type: r.status === "needs_changes" ? "Client Replied" : "Approval Overdue",
      description: r.caption?.slice(0, 120) ?? "Awaiting your review.",
    };
  });

  const weekChips: CalendarChip[] = (weekRows.data ?? []).map((r) => {
    const c = byId.get(r.client_id);
    const offset = r.scheduled_at
      ? Math.max(
          0,
          Math.min(
            6,
            Math.floor(
              (new Date(r.scheduled_at).getTime() - start.getTime()) / 86400000
            )
          )
        )
      : 0;
    return {
      id: r.id,
      client_name: c?.name ?? "Client",
      client_color: c?.color ?? "#64748B",
      caption: r.caption?.slice(0, 40) ?? "Untitled post",
      platform: "instagram",
      day_offset: offset,
      hour: r.scheduled_at ? new Date(r.scheduled_at).getHours() : 9,
    };
  });

  const activity: ActivityEvent[] = (activityRows.data ?? []).map((r) => {
    const name = r.user_id ? memberName.get(r.user_id) ?? "Someone" : "System";
    return {
      id: r.id,
      actor_initials: initialsOf(name),
      actor_color: colorFor(r.user_id ?? r.id),
      sentence: r.description ?? r.action,
      time_ago: timeAgo(r.created_at),
    };
  });

  return {
    stats: {
      active_clients: clients.filter((c) => c.status === "active").length,
      posts_this_week: posts.count ?? 0,
      pending_approvals: pending.count ?? 0,
      overdue_tasks: overdue.count ?? 0,
    },
    attention,
    weekChips,
    activity,
  };
}

// ---- Team dashboard -------------------------------------------------------

export interface TeamDashboard {
  stats: {
    posts_in_progress: number;
    todays_todos: number;
    client_feedback: number;
    approvals_pending_review: number;
  };
  todos: Array<{ id: string; title: string; client: string; due: string }>;
}

export async function getTeamDashboard(user: CurrentUser): Promise<TeamDashboard> {
  const supabase = createClient();
  const { byId } = await getVisibleClients(user);
  const { start, end } = weekBounds();
  const me = user.id;

  const [inProgress, feedback, pendingReview, todoRows] = await Promise.all([
    supabase
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to", me)
      .in("status", ["draft", "scheduled", "pending_approval", "needs_changes"]),
    supabase
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to", me)
      .eq("status", "needs_changes"),
    supabase
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to", me)
      .eq("status", "pending_approval"),
    supabase
      .from("content_items")
      .select("id, caption, client_id, scheduled_at, status")
      .eq("assigned_to", me)
      .neq("status", "published")
      .order("scheduled_at", { ascending: true })
      .limit(8),
  ]);

  const todaysTodos = (todoRows.data ?? []).filter(
    (r) =>
      r.scheduled_at &&
      new Date(r.scheduled_at) >= start &&
      new Date(r.scheduled_at) < end
  ).length;

  const todos = (todoRows.data ?? []).map((r) => ({
    id: r.id,
    title: r.caption?.slice(0, 80) ?? "Untitled task",
    client: byId.get(r.client_id)?.name ?? "Client",
    due: r.scheduled_at ? timeAgo(r.scheduled_at) : "No date",
  }));

  return {
    stats: {
      posts_in_progress: inProgress.count ?? 0,
      todays_todos: todaysTodos,
      client_feedback: feedback.count ?? 0,
      approvals_pending_review: pendingReview.count ?? 0,
    },
    todos,
  };
}

// ---- Client dashboard -----------------------------------------------------

export interface ClientDashboard {
  profile: { plan_name: string | null; monthly_fee: number | null; next_invoice_date: string | null } | null;
  weekChips: CalendarChip[];
  platformCards: Array<{
    platform: "instagram" | "tiktok" | "youtube" | "facebook" | "linkedin" | "x";
    followers: number;
    change_30d: number;
  }>;
  attention: Array<{ id: string; title: string; cta: string; href: string }>;
  recentWins: string[];
}

export async function getClientDashboard(user: CurrentUser): Promise<ClientDashboard> {
  const supabase = createClient();
  const clientId = user.client_id;
  if (!clientId)
    return { profile: null, weekChips: [], platformCards: [], attention: [], recentWins: [] };

  const { start, end } = weekBounds();
  const [snapsRes, pendingRes, reportRes, clientRes, invoiceRes, weekRes] = await Promise.all([
    supabase
      .from("metrics_snapshots")
      .select("platform, followers, reach, snapshot_date")
      .eq("client_id", clientId)
      .order("snapshot_date", { ascending: false })
      .limit(400),
    supabase
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .eq("client_id", clientId)
      .eq("status", "pending_approval"),
    supabase
      .from("monthly_reports")
      .select("id, month, year")
      .eq("client_id", clientId)
      .order("year", { ascending: false })
      .order("month", { ascending: false })
      .limit(1),
    supabase
      .from("clients")
      .select("name, plan_name, monthly_fee")
      .eq("id", clientId)
      .single(),
    supabase
      .from("invoices")
      .select("due_date, status")
      .eq("client_id", clientId)
      .neq("status", "paid")
      .order("due_date", { ascending: true })
      .limit(1),
    supabase
      .from("content_items")
      .select("id, caption, scheduled_at")
      .gte("scheduled_at", start.toISOString())
      .lt("scheduled_at", end.toISOString())
      .order("scheduled_at"),
  ]);

  // Latest follower count + 30-day change per platform.
  type Snap = { date: string; followers: number; reach: number };
  const snaps = snapsRes.data ?? [];
  const byPlatform: Record<string, Snap[]> = {};
  for (const s of snaps) {
    (byPlatform[s.platform] ??= []).push({
      date: s.snapshot_date,
      followers: s.followers ?? 0,
      reach: s.reach ?? 0,
    });
  }

  const platformCards: ClientDashboard["platformCards"] = [];
  let bestReach = 0;
  for (const platform of Object.keys(byPlatform)) {
    const rows = byPlatform[platform];
    rows.sort((a: Snap, b: Snap) => b.date.localeCompare(a.date)); // newest first
    const latest = rows[0];
    const monthAgo =
      rows.find(
        (r: Snap) =>
          new Date(latest.date).getTime() - new Date(r.date).getTime() >= 28 * 86400000
      ) ?? rows[rows.length - 1];
    bestReach = Math.max(bestReach, ...rows.map((r: Snap) => r.reach));
    platformCards.push({
      platform: platform as ClientDashboard["platformCards"][number]["platform"],
      followers: latest.followers,
      change_30d: latest.followers - monthAgo.followers,
    });
  }

  const pendingCount = pendingRes.count ?? 0;
  const attention: ClientDashboard["attention"] = [];
  if (pendingCount > 0) {
    attention.push({
      id: "pending",
      title: `${pendingCount} post${pendingCount === 1 ? "" : "s"} waiting for approval`,
      cta: "Review now",
      href: "/approvals",
    });
  }
  if (reportRes.data && reportRes.data.length > 0) {
    attention.push({
      id: "report",
      title: "Monthly report ready",
      cta: "View report",
      href: "/reports",
    });
  }

  const recentWins: string[] = [];
  const ig = platformCards.find((p) => p.change_30d > 0);
  if (ig) {
    recentWins.push(
      `You gained ${ig.change_30d.toLocaleString()} ${ig.platform} followers in the last 30 days.`
    );
  }
  if (bestReach > 0) {
    recentWins.push(`Your best post reached ${bestReach.toLocaleString()} people recently.`);
  }

  const profile = clientRes.data
    ? {
        plan_name: (clientRes.data.plan_name as string | null) ?? null,
        monthly_fee: (clientRes.data.monthly_fee as number | null) ?? null,
        next_invoice_date:
          (invoiceRes.data?.[0]?.due_date as string | null) ?? null,
      }
    : null;

  const weekChips: CalendarChip[] = (weekRes.data ?? []).map((r) => {
    const offset = r.scheduled_at
      ? Math.max(
          0,
          Math.min(
            6,
            Math.floor(
              (new Date(r.scheduled_at).getTime() - start.getTime()) / 86400000
            )
          )
        )
      : 0;
    return {
      id: r.id,
      client_name: "",
      client_color: "#6366F1",
      caption: r.caption?.slice(0, 40) ?? "Untitled post",
      platform: "instagram",
      day_offset: offset,
      hour: r.scheduled_at ? new Date(r.scheduled_at).getHours() : 9,
    };
  });

  return { profile, weekChips, platformCards, attention, recentWins };
}
