import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";
import { NotificationsForm } from "@/components/settings/notifications-form";

export const dynamic = "force-dynamic";

const OWNER_TEAM_TRIGGERS = [
  { id: "new_approval", label: "A new post is ready for my approval" },
  { id: "post_published", label: "A post I approved goes live" },
  { id: "monthly_report", label: "My monthly report is ready" },
  { id: "mention", label: "Someone @mentions me in a comment" },
  { id: "changes_back", label: "My team requests changes I asked for" },
  { id: "weekly_summary", label: "Weekly summary of activity" },
];

const CLIENT_TRIGGERS = [
  { id: "new_approval", label: "A new post is ready for my approval" },
  { id: "post_published", label: "A post I approved goes live" },
  { id: "monthly_report", label: "My monthly report is ready" },
  { id: "mention", label: "Someone @mentions me in a comment" },
  { id: "weekly_summary", label: "Weekly summary of activity" },
];

export default async function NotificationsSettingsPage() {
  const user = await getCurrentUser();
  const triggers =
    user.role === "client" ? CLIENT_TRIGGERS : OWNER_TEAM_TRIGGERS;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
      </CardHeader>
      <CardContent>
        <NotificationsForm triggers={triggers} />
      </CardContent>
    </Card>
  );
}
