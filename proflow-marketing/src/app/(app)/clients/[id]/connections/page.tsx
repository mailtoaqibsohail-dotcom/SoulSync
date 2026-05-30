import { ConnectionsManager } from "@/components/connections/connections-manager";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getConnections } from "@/lib/data/connections";

export const dynamic = "force-dynamic";

export default async function ClientConnectionsTab({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  // Owner/team manage; RLS still scopes which clients are reachable (the
  // detail layout 404s a team member on an unassigned client).
  const canEdit = user.role === "owner" || user.role === "team";
  const connections = user.isDemo ? [] : await getConnections(params.id);

  return (
    <ConnectionsManager
      clientId={params.id}
      connections={connections}
      canEdit={canEdit}
      showHeader={false}
    />
  );
}
