import { notFound } from "next/navigation";
import { BrandGuidelines } from "@/components/brand/brand-guidelines";
import { getBrandGuideline } from "@/lib/brand-data";
import { CLIENTS } from "@/lib/clients-data";
import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

export default async function ClientBrandTab({
  params,
}: {
  params: { id: string };
}) {
  const client = CLIENTS.find((c) => c.id === params.id);
  if (!client) notFound();
  const guideline = getBrandGuideline(client.id);
  if (!guideline) {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        No brand guidelines on file for {client.name} yet. Create one by
        editing this section once the rich text editor lands.
      </div>
    );
  }
  const user = await getCurrentUser();
  const canEdit = user.role === "owner" || user.role === "team";
  return (
    <BrandGuidelines
      guideline={guideline}
      clientName={client.name}
      canEdit={canEdit}
    />
  );
}
