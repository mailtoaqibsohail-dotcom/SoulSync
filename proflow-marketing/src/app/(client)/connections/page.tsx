import { notFound } from "next/navigation";
import { ConnectionsManager } from "@/components/connections/connections-manager";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getConnections } from "@/lib/data/connections";

export const dynamic = "force-dynamic";

export default async function ClientConnectionsPage() {
  const user = await getCurrentUser();
  if (!user.client_id) notFound();

  // Demo mode has no backend; show an empty manager.
  const connections = user.isDemo ? [] : await getConnections(user.client_id);

  return <ConnectionsManager clientId={user.client_id} connections={connections} canEdit />;
}
