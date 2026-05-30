import { CheckSquare, MessageSquare, Edit3, Inbox } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import { timeOfDayGreeting, TEAM_STATS, TEAM_TODO } from "@/lib/dashboard-data";
import { getTeamDashboard, type TeamDashboard } from "@/lib/data/dashboard";

export const dynamic = "force-dynamic";

export default async function WorkPage() {
  const user = await getCurrentUser();
  const firstName = user.full_name.split(" ")[0];

  // Live, assignment-scoped data for a real team member; sample in demo mode.
  const data: TeamDashboard = user.isDemo
    ? { stats: TEAM_STATS, todos: TEAM_TODO }
    : await getTeamDashboard(user);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          {timeOfDayGreeting()}, {firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Posts and tasks assigned to you across your clients.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Edit3}
          label="Posts in progress"
          value={data.stats.posts_in_progress}
        />
        <StatCard
          icon={CheckSquare}
          label="Today's to-dos"
          value={data.stats.todays_todos}
        />
        <StatCard
          icon={MessageSquare}
          label="Client feedback"
          value={data.stats.client_feedback}
        />
        <StatCard
          icon={Inbox}
          label="Approvals awaiting"
          value={data.stats.approvals_pending_review}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Today and this week</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          {data.todos.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">
              Nothing assigned to you right now.
            </div>
          ) : (
            data.todos.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <div className="font-medium text-sm">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{t.client}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{t.due}</span>
                  <Button variant="outline" size="sm">
                    Open
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}
