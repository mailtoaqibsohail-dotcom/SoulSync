import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ShieldCheck, Monitor, History } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";

const SAMPLE_SESSIONS = [
  {
    id: "s1",
    device: "MacBook Pro · Chrome",
    location: "Lahore, PK",
    last_active: "Just now",
    current: true,
  },
  {
    id: "s2",
    device: "iPhone 15 · Safari",
    location: "Lahore, PK",
    last_active: "2 hours ago",
    current: false,
  },
];

export default async function SecuritySettingsPage() {
  const user = await getCurrentUser();
  return (
    <div className="grid gap-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Two-factor authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Authenticator app</div>
              <p className="text-muted-foreground">
                Adds a one-time code to every sign-in.
              </p>
            </div>
            <Switch checked={false} onCheckedChange={() => {}} />
          </div>
          <Button variant="outline" size="sm" disabled>
            Set up authenticator
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Active sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {SAMPLE_SESSIONS.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 px-6 py-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{s.device}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.location} · {s.last_active}
                    {s.current && (
                      <span className="ml-2 text-success">
                        · This device
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" disabled={s.current}>
                  {s.current ? "Active" : "Sign out"}
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {user.role === "owner" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Audit log
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Full audit log of authentication events, permission changes, and
            destructive actions lives in the Activity Log. Audit-grade export
            arrives with the security review later in MVP.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
