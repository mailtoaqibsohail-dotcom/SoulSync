import { ClientsList } from "@/components/clients/clients-list";
import { CLIENTS, TEAM_DIRECTORY } from "@/lib/clients-data";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getClientRows, getTeamPeople } from "@/lib/data/clients";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const user = await getCurrentUser();

  if (user.isDemo) {
    return <ClientsList clients={CLIENTS} team={TEAM_DIRECTORY} />;
  }

  // Live: RLS scopes the roster (owner: all clients, team: assigned only).
  const [clients, team] = await Promise.all([
    getClientRows(user),
    getTeamPeople(user),
  ]);
  return <ClientsList clients={clients} team={team} />;
}
