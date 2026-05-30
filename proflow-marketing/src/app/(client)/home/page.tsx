import Link from "next/link";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  CLIENT_PLATFORM_CARDS,
  CLIENT_ATTENTION,
  CLIENT_RECENT_WINS,
  WEEK_CHIPS,
} from "@/lib/dashboard-data";
import { CLIENT_PROFILE } from "@/lib/client-billing-data";
import { getClientDashboard, type ClientDashboard } from "@/lib/data/dashboard";
import { formatCurrency, formatDate, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PLATFORM_COLOR: Record<string, string> = {
  instagram: "#E4405F",
  tiktok: "#000000",
  youtube: "#FF0000",
  facebook: "#1877F2",
  linkedin: "#0A66C2",
  x: "#000000",
};

export default async function ClientOverviewPage() {
  const user = await getCurrentUser();
  const firstName = user.full_name.split(" ")[0];

  // Live, own-client-scoped data; sample data only in demo mode.
  const data: ClientDashboard = user.isDemo
    ? {
        profile: {
          plan_name: CLIENT_PROFILE.plan_name,
          monthly_fee: CLIENT_PROFILE.monthly_fee,
          next_invoice_date: CLIENT_PROFILE.next_invoice_date,
        },
        weekChips: WEEK_CHIPS,
        platformCards: CLIENT_PLATFORM_CARDS,
        attention: CLIENT_ATTENTION,
        recentWins: CLIENT_RECENT_WINS,
      }
    : await getClientDashboard(user);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {firstName}</h1>
        <p className="text-sm text-muted-foreground">
          Here is a snapshot of your social media this week.
        </p>
      </div>

      {/* Account banner */}
      {data.profile && (
        <div className="rounded-md border bg-[#F8FAFC] px-4 py-3 text-sm flex flex-wrap items-center gap-x-6 gap-y-1">
          {data.profile.plan_name && (
            <>
              <span>
                Your plan:{" "}
                <strong className="text-foreground">{data.profile.plan_name}</strong>
              </span>
              <span className="text-muted-foreground">|</span>
            </>
          )}
          {data.profile.next_invoice_date && (
            <>
              <span>
                Next billing:{" "}
                <strong className="text-foreground">
                  {formatDate(data.profile.next_invoice_date)}
                </strong>
                {data.profile.monthly_fee != null && (
                  <> ({formatCurrency(data.profile.monthly_fee)})</>
                )}
              </span>
              <span className="text-muted-foreground">|</span>
            </>
          )}
          <Link href="/billing" className="text-accent hover:underline">
            View billing
          </Link>
        </div>
      )}

      {/* Active platforms */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.platformCards.map((p) => {
          const color = PLATFORM_COLOR[p.platform];
          return (
            <Card key={p.platform}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm capitalize">{p.platform}</CardTitle>
                <span
                  className="h-6 w-6 rounded text-white grid place-items-center text-[10px] font-bold"
                  style={{ backgroundColor: color }}
                  aria-hidden
                >
                  {p.platform[0].toUpperCase()}
                </span>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">
                  {p.followers.toLocaleString()}
                </div>
                <div
                  className={cn(
                    "mt-1 inline-flex items-center gap-1 text-xs",
                    p.change_30d >= 0 ? "text-success" : "text-danger"
                  )}
                >
                  {p.change_30d >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {p.change_30d >= 0 ? "+" : ""}
                  {p.change_30d} this month
                </div>
                <Link
                  href="/calendar"
                  className="mt-2 inline-block text-xs text-accent hover:underline"
                >
                  View posts
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* This week + Needs your attention */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>This week&apos;s content</CardTitle>
            <Link href="/calendar" className="text-xs text-accent hover:underline">
              Open calendar
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-2 text-xs">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => {
                const chips = data.weekChips.filter((c) => c.day_offset === i);
                return (
                  <div
                    key={d}
                    className="min-h-32 rounded-md border bg-[#F8FAFC] p-2 space-y-1"
                  >
                    <div className="text-muted-foreground font-medium">{d}</div>
                    {chips.length === 0 ? (
                      <div className="text-[10px] text-muted-foreground italic">
                        No posts scheduled
                      </div>
                    ) : (
                      chips.map((c) => (
                        <div
                          key={c.id}
                          className="rounded px-1.5 py-1 text-[10px] truncate"
                          style={{
                            backgroundColor: `${c.client_color}15`,
                            borderLeft: `3px solid ${c.client_color}`,
                            color: c.client_color,
                          }}
                          title={c.caption}
                        >
                          {c.caption}
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Needs your attention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.attention.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                You are all caught up. Nice work.
              </div>
            ) : (
              data.attention.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-md border p-3"
                >
                  <span className="text-sm">{item.title}</span>
                  <Button asChild variant="outline" size="sm">
                    <Link href={item.href}>{item.cta}</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent wins */}
      <Card>
        <CardHeader>
          <CardTitle>Recent wins</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.recentWins.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Insights will appear here as your data comes in.
            </p>
          ) : (
            data.recentWins.map((line, i) => (
              <p key={i} className="text-sm">
                {line}
              </p>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
