import { AnalyticsView } from "@/components/analytics/analytics-view";
import { CLIENTS } from "@/lib/clients-data";
import { ANALYTICS_CLIENT_IDS } from "@/lib/analytics-data";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getClientRows } from "@/lib/data/clients";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = await getCurrentUser();

  if (user.isDemo) {
    const eligible = CLIENTS.filter(
      (c) => ANALYTICS_CLIENT_IDS.includes(c.id) && c.status !== "archived"
    );
    return (
      <AnalyticsView
        clients={eligible.map((c) => ({
          id: c.id,
          name: c.name,
          brand_color: c.brand_color,
          initials: c.initials,
          platforms: c.platforms,
        }))}
      />
    );
  }

  // Live: the client selector is scoped by RLS (owner: all, client: own).
  // NOTE: the in-chart series are still illustrative; wiring AnalyticsView's
  // internals to metrics_snapshots is a follow-up (it computes data from ids).
  const rows = (await getClientRows(user)).filter((c) => c.status !== "archived");
  return (
    <AnalyticsView
      clients={rows.map((c) => ({
        id: c.id,
        name: c.name,
        brand_color: c.brand_color,
        initials: c.initials,
        platforms: c.platforms,
      }))}
    />
  );
}
