import { notFound } from "next/navigation";
import { BrandGuidelines } from "@/components/brand/brand-guidelines";
import { getBrandGuideline } from "@/lib/brand-data";
import { getCurrentUser } from "@/lib/auth/current-user";
import { CLIENTS } from "@/lib/clients-data";
import { getBrandGuidelineLive } from "@/lib/data/records";
import { getVisibleClients } from "@/lib/data/clients";

export const dynamic = "force-dynamic";

export default async function ClientBrandPage() {
  const user = await getCurrentUser();
  if (!user.client_id) notFound();

  if (user.isDemo) {
    const guideline = getBrandGuideline(user.client_id);
    const client = CLIENTS.find((c) => c.id === user.client_id);
    if (!guideline || !client) notFound();
    return <BrandGuidelines guideline={guideline} clientName={client.name} canEdit={false} />;
  }

  // Live: own client's guideline only (RLS).
  const [guideline, { byId }] = await Promise.all([
    getBrandGuidelineLive(user.client_id),
    getVisibleClients(user),
  ]);
  if (!guideline) notFound();
  const clientName = byId.get(user.client_id)?.name ?? "Your brand";
  return <BrandGuidelines guideline={guideline} clientName={clientName} canEdit={false} />;
}
