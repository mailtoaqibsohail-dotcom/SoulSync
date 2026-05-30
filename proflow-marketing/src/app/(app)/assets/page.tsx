import { AssetLibrary } from "@/components/assets/asset-library";
import { ASSETS } from "@/lib/assets-data";
import { CLIENTS } from "@/lib/clients-data";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getAssets } from "@/lib/data/records";
import { getClientRefs } from "@/lib/data/content";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const user = await getCurrentUser();

  if (user.isDemo) {
    return (
      <AssetLibrary
        assets={ASSETS}
        clients={CLIENTS.filter((c) => c.status !== "archived").map((c) => ({
          id: c.id,
          name: c.name,
          brand_color: c.brand_color,
          initials: c.initials,
        }))}
      />
    );
  }

  // Live: assets + client list scoped by RLS (owner: all, team: assigned, client: own).
  const [assets, clients] = await Promise.all([getAssets(user), getClientRefs(user)]);
  return <AssetLibrary assets={assets} clients={clients} />;
}
