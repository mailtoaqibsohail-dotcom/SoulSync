import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CLIENTS, TEAM_DIRECTORY } from "@/lib/clients-data";
import { RECENT_TEAM_ACTIVITY, WEEK_CHIPS } from "@/lib/dashboard-data";
import { formatCurrency } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getClientRows, getTeamPeople } from "@/lib/data/clients";
import { getContentItems } from "@/lib/data/content";

export default async function ClientOverviewTab({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();

  // Demo: original sample rendering.
  if (user.isDemo) {
    const client = CLIENTS.find((c) => c.id === params.id);
    if (!client) notFound();
    const team = TEAM_DIRECTORY.filter((t) => client.team_ids.includes(t.id));
    return (
      <Overview
        client={client}
        team={team.map((t) => ({ id: t.id, name: t.name, color: t.color, initials: t.initials, role: t.role }))}
        upcoming={WEEK_CHIPS.slice(0, 5).map((c) => ({
          id: c.id,
          caption: c.caption,
          platform: c.platform,
          color: c.client_color,
        }))}
        activity={RECENT_TEAM_ACTIVITY.slice(0, 4)}
      />
    );
  }

  // Live, RLS-scoped.
  const rows = await getClientRows(user);
  const client = rows.find((c) => c.id === params.id);
  if (!client) notFound();
  const [people, items] = await Promise.all([getTeamPeople(user), getContentItems(user)]);
  const team = people
    .filter((p) => client.team_ids.includes(p.id))
    .map((t) => ({ id: t.id, name: t.name, color: t.color, initials: t.initials, role: t.role }));
  const upcoming = items
    .filter((i) => i.client_id === client.id)
    .slice(0, 5)
    .map((i) => ({ id: i.id, caption: i.caption, platform: i.platform, color: client.brand_color }));

  return <Overview client={client} team={team} upcoming={upcoming} activity={[]} />;
}

function Overview({
  client,
  team,
  upcoming,
  activity,
}: {
  client: { plan_name: string; monthly_fee: number; posts_this_week: number; industry: string; platforms: string[] };
  team: { id: string; name: string; color: string; initials: string; role: string }[];
  upcoming: { id: string; caption: string; platform: string; color: string }[];
  activity: { id: string; actor_color: string; actor_initials: string; sentence: string; time_ago: string }[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Upcoming this week</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No upcoming posts.</p>
          ) : (
            upcoming.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
              >
                <div>
                  <div className="text-sm font-medium">{c.caption}</div>
                  <div className="text-xs text-muted-foreground capitalize">{c.platform}</div>
                </div>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Key facts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Plan" value={client.plan_name || "—"} />
          <Row label="Monthly fee" value={formatCurrency(client.monthly_fee)} />
          <Row label="Posts this week" value={String(client.posts_this_week)} />
          <Row label="Industry" value={client.industry} />
          <Row label="Platforms" value={client.platforms.join(", ") || "—"} />
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            activity.map((e) => (
              <div key={e.id} className="flex items-start gap-3">
                <div
                  className="h-8 w-8 rounded-full grid place-items-center text-white text-xs font-semibold shrink-0"
                  style={{ backgroundColor: e.actor_color }}
                >
                  {e.actor_initials}
                </div>
                <div className="flex-1">
                  <p className="text-sm">{e.sentence}</p>
                  <p className="text-xs text-muted-foreground">{e.time_ago}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Assigned team</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {team.map((t) => (
            <div key={t.id} className="flex items-center gap-3 text-sm">
              <span
                className="h-7 w-7 rounded-full grid place-items-center text-white text-xs font-semibold"
                style={{ backgroundColor: t.color }}
              >
                {t.initials}
              </span>
              <div>
                <div className="font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground capitalize">{t.role}</div>
              </div>
            </div>
          ))}
          {team.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No one is assigned to this client yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
