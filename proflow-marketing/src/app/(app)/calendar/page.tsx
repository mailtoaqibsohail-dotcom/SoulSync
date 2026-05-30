import { CalendarShell } from "@/components/calendar/calendar-shell";
import { CONTENT_ITEMS } from "@/lib/content-data";
import { CLIENTS, TEAM_DIRECTORY } from "@/lib/clients-data";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getContentItems, getClientRefs, getTeamRefs } from "@/lib/data/content";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const user = await getCurrentUser();

  if (user.isDemo) {
    return (
      <CalendarShell
        items={CONTENT_ITEMS}
        clients={CLIENTS.map((c) => ({
          id: c.id,
          name: c.name,
          brand_color: c.brand_color,
          initials: c.initials,
        }))}
        team={TEAM_DIRECTORY.map((t) => ({
          id: t.id,
          initials: t.initials,
          color: t.color,
          name: t.name,
        }))}
      />
    );
  }

  // Live: RLS scopes content & clients to this role (owner: all, team:
  // assigned, client: own).
  const [items, clients, team] = await Promise.all([
    getContentItems(user),
    getClientRefs(user),
    getTeamRefs(user),
  ]);

  return <CalendarShell items={items} clients={clients} team={team} />;
}
