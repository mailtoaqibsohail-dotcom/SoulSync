import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CLIENTS, TEAM_DIRECTORY } from "@/lib/clients-data";

export default function ClientTeamTab({
  params,
}: {
  params: { id: string };
}) {
  const client = CLIENTS.find((c) => c.id === params.id);
  if (!client) notFound();
  const assigned = TEAM_DIRECTORY.filter((t) =>
    client.team_ids.includes(t.id)
  );
  const available = TEAM_DIRECTORY.filter(
    (t) => !client.team_ids.includes(t.id)
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Assigned members ({assigned.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {assigned.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 py-1"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-8 w-8 rounded-full grid place-items-center text-white text-xs font-semibold"
                  style={{ backgroundColor: t.color }}
                >
                  {t.initials}
                </span>
                <div>
                  <div className="font-medium text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {t.role}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                Remove
              </Button>
            </div>
          ))}
          {assigned.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No one is assigned yet. Add a team member to start.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add team member</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {available.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 py-1"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-8 w-8 rounded-full grid place-items-center text-white text-xs font-semibold"
                  style={{ backgroundColor: t.color }}
                >
                  {t.initials}
                </span>
                <div>
                  <div className="font-medium text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {t.role}
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Assign
              </Button>
            </div>
          ))}
          {available.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Everyone in your agency is already on this client.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
