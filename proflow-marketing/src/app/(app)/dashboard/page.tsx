import Link from "next/link";
import { TrendingUp, TrendingDown } from "lucide-react";
import { NewPostButton } from "@/components/calendar/new-post-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  timeOfDayGreeting,
  OWNER_STATS,
  OWNER_ATTENTION,
  WEEK_CHIPS,
  RECENT_TEAM_ACTIVITY,
  type AttentionItem,
  type CalendarChip,
  type ActivityEvent,
} from "@/lib/dashboard-data";
import { getOwnerDashboard, type OwnerDashboard } from "@/lib/data/dashboard";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  const firstName = user.full_name.split(" ")[0];

  // Live, org-scoped data for a real owner; sample data only in demo mode.
  const data: OwnerDashboard = user.isDemo
    ? {
        stats: OWNER_STATS,
        attention: OWNER_ATTENTION,
        weekChips: WEEK_CHIPS,
        activity: RECENT_TEAM_ACTIVITY,
      }
    : await getOwnerDashboard(user);

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">
            {timeOfDayGreeting()}, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Here is what is happening across your agency today.
          </p>
        </div>
        <NewPostButton label="New Content" />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active Clients" value={data.stats.active_clients} />
        <Stat label="Posts This Week" value={data.stats.posts_this_week} />
        <Stat label="Pending Approvals" value={data.stats.pending_approvals} />
        <Stat
          label="Overdue Tasks"
          value={data.stats.overdue_tasks}
          highlight={data.stats.overdue_tasks > 0}
        />
      </div>

      {/* Attention + This week */}
      <div className="grid gap-6 lg:grid-cols-5">
        <NeedsAttention items={data.attention} />
        <ThisWeekCalendar chips={data.weekChips} />
      </div>

      <TeamActivityFeed events={data.activity} />
    </div>
  );
}

function Stat({
  label,
  value,
  trend,
  highlight,
}: {
  label: string;
  value: number;
  trend?: { direction: "up" | "down"; value: number };
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "text-3xl font-semibold",
            highlight ? "text-danger" : "text-foreground"
          )}
        >
          {value}
        </div>
        {trend && (
          <div
            className={cn(
              "mt-1 inline-flex items-center gap-1 text-xs",
              trend.direction === "up" ? "text-success" : "text-danger"
            )}
          >
            {trend.direction === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {trend.value}% vs last week
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NeedsAttention({ items }: { items: AttentionItem[] }) {
  return (
    <Card className="lg:col-span-3">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Needs your attention</CardTitle>
        <Link href="/approvals" className="text-xs text-accent hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">
            All clear! Nothing urgent right now.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-start gap-3 rounded-md border p-3"
            >
              <div
                className="h-9 w-9 rounded-full grid place-items-center text-white text-xs font-semibold shrink-0"
                style={{ backgroundColor: item.client_color }}
              >
                {item.client_initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm">{item.client_name}</span>
                  <span
                    className={cn(
                      "text-[11px] px-2 py-0.5 rounded font-medium",
                      item.type === "Approval Overdue" &&
                        "bg-warning/10 text-[#92400E]",
                      item.type === "Client Replied" &&
                        "bg-info/10 text-[#1E40AF]",
                      item.type === "Failed to Publish" &&
                        "bg-danger/10 text-[#991B1B]"
                    )}
                  >
                    {item.type}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {item.description}
                </p>
              </div>
              <Button variant="outline" size="sm">
                Review
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function ThisWeekCalendar({ chips }: { chips: CalendarChip[] }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>This week</CardTitle>
        <Link href="/calendar" className="text-xs text-accent hover:underline">
          Open full calendar
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2 text-xs">
          {days.map((d, i) => {
            const dayChips = chips.filter((c) => c.day_offset === i);
            return (
              <div
                key={d}
                className="min-h-32 rounded-md border bg-[#F8FAFC] p-2 space-y-1"
              >
                <div className="text-muted-foreground font-medium">{d}</div>
                {dayChips.map((c) => (
                  <div
                    key={c.id}
                    className="rounded px-1.5 py-1 text-[10px] truncate"
                    style={{
                      backgroundColor: `${c.client_color}15`,
                      borderLeft: `3px solid ${c.client_color}`,
                      color: c.client_color,
                    }}
                    title={`${c.client_name}: ${c.caption}`}
                  >
                    {c.caption}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function TeamActivityFeed({ events }: { events: ActivityEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent team activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">
            No recent activity yet.
          </div>
        ) : (
          events.map((e) => (
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
  );
}
