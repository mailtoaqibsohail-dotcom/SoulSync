import { TeamTable } from "@/components/team/team-table";
import {
  TEAM_DIRECTORY,
  CLIENTS,
  type TeamMemberStatus,
  type TeamPerson,
} from "@/lib/clients-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

const AVATAR_COLORS = [
  "#0F172A", "#6366F1", "#0EA5E9", "#10B981", "#F59E0B",
  "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6", "#F97316",
];

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export default async function TeamPage() {
  const me = await getCurrentUser();
  const admin = createAdminClient();

  // Demo fallback: no backend configured → show the sample roster.
  if (me.isDemo || !admin) {
    const assignmentCounts: Record<string, number> = {};
    for (const c of CLIENTS) {
      if (c.status !== "active") continue;
      for (const uid of c.team_ids) {
        assignmentCounts[uid] = (assignmentCounts[uid] ?? 0) + 1;
      }
    }
    return (
      <TeamTable
        members={TEAM_DIRECTORY}
        assignmentCounts={assignmentCounts}
        clients={CLIENTS.map((c) => ({ id: c.id, name: c.name, team_ids: c.team_ids }))}
      />
    );
  }

  // Real data: org members (owners + team), client assignments, sign-in status.
  const [membersRes, clientsRes, assignRes, usersRes] = await Promise.all([
    admin
      .from("org_members")
      .select("user_id, role, full_name, email, is_active")
      .eq("org_id", me.org_id)
      .in("role", ["owner", "team"]),
    admin.from("clients").select("id, name, status").eq("org_id", me.org_id),
    admin.from("team_assignments").select("user_id, client_id"),
    admin.auth.admin.listUsers({ perPage: 200 }),
  ]);

  const assignments = assignRes.data ?? [];
  const activeClientIds = new Set(
    (clientsRes.data ?? []).filter((c) => c.status === "active").map((c) => c.id)
  );
  const lastSignInById = new Map<string, string | null>(
    (usersRes.data?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null])
  );

  // Count active-client assignments per member.
  const assignmentCounts: Record<string, number> = {};
  for (const a of assignments) {
    if (activeClientIds.has(a.client_id)) {
      assignmentCounts[a.user_id] = (assignmentCounts[a.user_id] ?? 0) + 1;
    }
  }

  const members: TeamPerson[] = (membersRes.data ?? []).map((m) => {
    const lastSignIn = lastSignInById.get(m.user_id) ?? null;
    const status: TeamMemberStatus = !m.is_active
      ? "suspended"
      : lastSignIn
        ? "active"
        : "invited";
    const name = m.full_name || m.email || "Member";
    return {
      id: m.user_id,
      initials: initialsOf(name),
      name,
      color: colorFor(m.user_id),
      role: (m.role === "owner" ? "owner" : "team") as TeamPerson["role"],
      email: m.email ?? "",
      status,
      last_active_at: lastSignIn,
    };
  });

  // Sort: owners first, then by name.
  members.sort((a, b) =>
    a.role === b.role ? a.name.localeCompare(b.name) : a.role === "owner" ? -1 : 1
  );

  // Clients list (with assigned member ids) for the invite dialog.
  const clientTeamIds: Record<string, string[]> = {};
  for (const a of assignments) {
    (clientTeamIds[a.client_id] ??= []).push(a.user_id);
  }
  const clients = (clientsRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    team_ids: clientTeamIds[c.id] ?? [],
  }));

  return (
    <TeamTable members={members} assignmentCounts={assignmentCounts} clients={clients} />
  );
}
