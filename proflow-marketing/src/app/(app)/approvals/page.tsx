import { ApprovalsBoard } from "@/components/approvals/approvals-board";
import { CONTENT_ITEMS } from "@/lib/content-data";
import { CLIENTS } from "@/lib/clients-data";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getContentStatus } from "@/lib/demo-store";
import { getContentItems, getClientRefs } from "@/lib/data/content";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const user = await getCurrentUser();

  if (user.isDemo) {
    const items = CONTENT_ITEMS.map((i) => ({
      ...i,
      status: getContentStatus(i.id, i.status),
    })).filter((i) => (user.role === "client" ? i.client_id === user.client_id : true));
    return (
      <ApprovalsBoard
        role={user.role}
        items={items}
        clients={CLIENTS.map((c) => ({
          id: c.id,
          name: c.name,
          brand_color: c.brand_color,
          initials: c.initials,
        }))}
      />
    );
  }

  // Live: RLS already scopes items to what this role may see.
  const [items, clients] = await Promise.all([
    getContentItems(user),
    getClientRefs(user),
  ]);

  return <ApprovalsBoard role={user.role} items={items} clients={clients} />;
}
