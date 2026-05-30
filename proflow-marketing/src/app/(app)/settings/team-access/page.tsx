import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TEAM_DIRECTORY } from "@/lib/clients-data";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<"owner" | "team", string> = {
  owner: "Account lead",
  team: "Strategist",
};

export default function ClientTeamAccessPage() {
  const team = TEAM_DIRECTORY;
  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>Team access</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          These ProFlow team members have access to your account. They created
          your content, replied to comments on your behalf, and pulled the
          metrics in your reports.
        </p>
        <ul className="divide-y">
          {team.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
            >
              <span
                className="h-9 w-9 rounded-full grid place-items-center text-white text-xs font-semibold"
                style={{ backgroundColor: t.color }}
              >
                {t.initials}
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.email}</div>
              </div>
              <span className="text-xs text-muted-foreground">
                {ROLE_LABEL[t.role]}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
