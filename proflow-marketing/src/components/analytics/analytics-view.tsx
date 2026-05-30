"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  buildClientSnapshots,
  buildHeatmap,
  HEATMAP_LABELS,
  topPostsForClient,
  type DailySnapshot,
} from "@/lib/analytics-data";
import {
  PLATFORM_COLOR,
  PLATFORM_LABEL,
  type PlatformKey,
} from "@/lib/clients-data";
import { ManualMetricsButton } from "./manual-metrics-button";
import { CsvImportButton } from "./csv-import-button";
import { cn } from "@/lib/utils";

type Range = "7d" | "30d" | "90d";

interface ClientRef {
  id: string;
  name: string;
  brand_color: string;
  initials: string;
  platforms: PlatformKey[];
}

interface Props {
  clients: ClientRef[];
}

export function AnalyticsView({ clients }: Props) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [platform, setPlatform] = useState<"all" | PlatformKey>("all");
  const [range, setRange] = useState<Range>("30d");
  const [compare, setCompare] = useState(false);

  const client = clients.find((c) => c.id === clientId);
  const snapshots = useMemo(
    () => buildClientSnapshots(clientId),
    [clientId]
  );
  const topPosts = useMemo(() => topPostsForClient(clientId), [clientId]);
  const heatmap = useMemo(() => buildHeatmap(clientId), [clientId]);

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const filtered = useMemo(() => {
    const sliced = snapshots.filter((s) => {
      if (platform !== "all" && s.platform !== platform) return false;
      const diff = Math.round(
        (Date.now() - new Date(s.date).getTime()) / 86400000
      );
      return diff < days;
    });
    return sliced;
  }, [snapshots, platform, days]);

  const previous = useMemo(() => {
    if (!compare) return [] as DailySnapshot[];
    return snapshots.filter((s) => {
      if (platform !== "all" && s.platform !== platform) return false;
      const diff = Math.round(
        (Date.now() - new Date(s.date).getTime()) / 86400000
      );
      return diff >= days && diff < days * 2;
    });
  }, [snapshots, platform, days, compare]);

  const stats = useMemo(() => computeStats(filtered, previous), [
    filtered,
    previous,
  ]);

  // Growth chart series: pivot by platform → cumulative followers per day
  const growthSeries = useMemo(() => {
    const days = Array.from(new Set(filtered.map((s) => s.date))).sort();
    return days.map((d) => {
      const row: Record<string, string | number> = { date: d };
      for (const s of filtered) {
        if (s.date === d) row[s.platform] = s.followers;
      }
      return row;
    });
  }, [filtered]);

  const activePlatforms = useMemo(() => {
    const set = new Set<PlatformKey>();
    for (const s of filtered) set.add(s.platform);
    return Array.from(set);
  }, [filtered]);

  // Engagement by post type — group top posts by platform as a stand-in.
  const engagementByPostType = useMemo(() => {
    const byPlat = new Map<PlatformKey, number>();
    for (const p of topPosts) {
      const er = (p.likes + p.comments) / Math.max(1, p.reach);
      byPlat.set(p.platform, (byPlat.get(p.platform) ?? 0) + er * 100);
    }
    return Array.from(byPlat.entries()).map(([k, v]) => ({
      platform: PLATFORM_LABEL[k],
      rate: Number((v / topPosts.filter((tp) => tp.platform === k).length).toFixed(2)),
      fill: PLATFORM_COLOR[k],
    }));
  }, [topPosts]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Cross-platform performance for {client?.name ?? "your clients"}.
          </p>
        </div>
        <div className="flex gap-2">
          <CsvImportButton
            clientId={clientId}
            platforms={client?.platforms ?? []}
          />
          <ManualMetricsButton
            clientId={clientId}
            platforms={client?.platforms ?? []}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-3 flex flex-wrap items-center gap-3">
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="flex flex-wrap gap-1">
            {(["all", ...(client?.platforms ?? [])] as Array<"all" | PlatformKey>).map(
              (p) => {
                const active = platform === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlatform(p)}
                    className={cn(
                      "px-2.5 py-1 rounded-full border text-xs",
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "bg-background hover:bg-accent/5"
                    )}
                    style={
                      active && p !== "all"
                        ? {
                            backgroundColor: PLATFORM_COLOR[p as PlatformKey],
                            borderColor: PLATFORM_COLOR[p as PlatformKey],
                            color: "white",
                          }
                        : undefined
                    }
                  >
                    {p === "all" ? "All platforms" : PLATFORM_LABEL[p as PlatformKey]}
                  </button>
                );
              }
            )}
          </div>

          <select
            value={range}
            onChange={(e) => setRange(e.target.value as Range)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm ml-auto"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <label className="text-xs inline-flex items-center gap-1.5 text-muted-foreground">
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
            />
            Compare to previous period
          </label>
        </CardContent>
      </Card>

      {/* Headline metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Headline
          label="Total Followers"
          value={stats.followers.toLocaleString()}
          change={stats.followers_change}
          sparkline={stats.sparkline.followers}
        />
        <Headline
          label="Total Reach"
          value={stats.reach.toLocaleString()}
          change={stats.reach_change}
          sparkline={stats.sparkline.reach}
        />
        <Headline
          label="Engagement Rate"
          value={`${stats.engagement_rate.toFixed(2)}%`}
          change={stats.er_change}
          sparkline={stats.sparkline.er}
        />
        <Headline
          label="Posts Published"
          value={String(stats.posts)}
          change={stats.posts_change}
          sparkline={stats.sparkline.posts}
        />
      </div>

      {/* Growth chart */}
      <Card>
        <CardHeader>
          <CardTitle>Follower growth over time</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={growthSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis
                dataKey="date"
                stroke="#64748B"
                fontSize={11}
                tickFormatter={(d: string) =>
                  new Date(d).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }
              />
              <YAxis stroke="#64748B" fontSize={11} />
              <Tooltip />
              <Legend />
              {activePlatforms.map((p) => (
                <Line
                  key={p}
                  type="monotone"
                  dataKey={p}
                  name={PLATFORM_LABEL[p]}
                  stroke={PLATFORM_COLOR[p]}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Engagement breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Engagement rate by platform</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={engagementByPostType}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="platform" stroke="#64748B" fontSize={11} />
                <YAxis
                  stroke="#64748B"
                  fontSize={11}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                  {engagementByPostType.map((d) => (
                    <rect key={d.platform} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Best time to post</CardTitle>
          </CardHeader>
          <CardContent>
            <Heatmap data={heatmap} />
          </CardContent>
        </Card>
      </div>

      {/* Top posts */}
      <Card>
        <CardHeader>
          <CardTitle>Top performing posts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Post</th>
                  <th className="px-4 py-3 font-medium">Platform</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-right">Likes</th>
                  <th className="px-4 py-3 font-medium text-right">Comments</th>
                  <th className="px-4 py-3 font-medium text-right">Reach</th>
                  <th className="px-4 py-3 font-medium text-right">ER</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {topPosts
                  .slice()
                  .sort(
                    (a, b) =>
                      (b.likes + b.comments) / b.reach -
                      (a.likes + a.comments) / a.reach
                  )
                  .slice(0, 8)
                  .map((p) => {
                    const er = ((p.likes + p.comments) / p.reach) * 100;
                    return (
                      <tr key={p.id} className="hover:bg-muted/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="h-8 w-8 rounded grid place-items-center text-white text-[10px] font-semibold"
                              style={{ backgroundColor: p.thumb_color }}
                            >
                              {PLATFORM_LABEL[p.platform][0]}
                            </span>
                            <span className="truncate max-w-[260px]">
                              {p.caption}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {PLATFORM_LABEL[p.platform]}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(p.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {p.likes.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {p.comments.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {p.reach.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {er.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Headline({
  label,
  value,
  change,
  sparkline,
}: {
  label: string;
  value: string;
  change: number;
  sparkline: number[];
}) {
  const positive = change >= 0;
  const data = sparkline.map((v, i) => ({ x: i, v }));
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="text-2xl font-semibold">{value}</div>
            <div
              className={cn(
                "mt-1 inline-flex items-center gap-1 text-xs",
                positive ? "text-success" : "text-danger"
              )}
            >
              {positive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {positive ? "+" : ""}
              {change.toFixed(1)}%
            </div>
          </div>
          <div className="h-12 w-24">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={positive ? "#10B981" : "#EF4444"}
                  fill={positive ? "#10B98122" : "#EF444422"}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Heatmap({ data }: { data: number[][] }) {
  const flat = data.flat();
  const max = Math.max(...flat, 1);
  return (
    <div className="overflow-x-auto">
      <table className="text-[11px] mx-auto">
        <thead>
          <tr>
            <th className="w-10" />
            {HEATMAP_LABELS.cols.map((c) => (
              <th key={c} className="px-1.5 py-1 text-muted-foreground">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, r) => (
            <tr key={r}>
              <th className="text-right pr-2 text-muted-foreground font-medium">
                {HEATMAP_LABELS.rows[r]}
              </th>
              {row.map((v, c) => {
                const intensity = v / max;
                const bg = `rgba(37, 99, 235, ${0.08 + intensity * 0.7})`;
                return (
                  <td
                    key={c}
                    className="h-8 w-12 align-middle text-center text-foreground/80"
                    style={{ backgroundColor: bg }}
                    title={`${HEATMAP_LABELS.rows[r]} ${HEATMAP_LABELS.cols[c]} — ${v.toLocaleString()} engaged`}
                  >
                    {v >= max * 0.85 ? "★" : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function computeStats(
  current: DailySnapshot[],
  previous: DailySnapshot[]
) {
  const sumPrev = (key: keyof DailySnapshot) =>
    previous.reduce((s, r) => s + (r[key] as number), 0);
  const sumCur = (key: keyof DailySnapshot) =>
    current.reduce((s, r) => s + (r[key] as number), 0);

  // Followers = latest per platform
  const latestByPlatform = new Map<string, number>();
  const earliestByPlatform = new Map<string, number>();
  const sorted = [...current].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  for (const s of sorted) {
    if (!earliestByPlatform.has(s.platform))
      earliestByPlatform.set(s.platform, s.followers);
    latestByPlatform.set(s.platform, s.followers);
  }
  const followers = Array.from(latestByPlatform.values()).reduce(
    (s, v) => s + v,
    0
  );
  const followersStart = Array.from(earliestByPlatform.values()).reduce(
    (s, v) => s + v,
    0
  );
  const followersChange = followersStart
    ? ((followers - followersStart) / followersStart) * 100
    : 0;

  const reach = sumCur("reach");
  const reachPrev = sumPrev("reach");
  const reachChange = reachPrev ? ((reach - reachPrev) / reachPrev) * 100 : 0;

  const engaged = sumCur("engaged");
  const er = reach > 0 ? (engaged / reach) * 100 : 0;
  const engagedPrev = sumPrev("engaged");
  const erPrev = reachPrev > 0 ? (engagedPrev / reachPrev) * 100 : 0;
  const erChange = erPrev ? ((er - erPrev) / erPrev) * 100 : 0;

  const posts = sumCur("posts");
  const postsPrev = sumPrev("posts");
  const postsChange = postsPrev ? ((posts - postsPrev) / postsPrev) * 100 : 0;

  // Sparkline buckets: collapse to ~10 points so it stays clean.
  const buckets = (key: keyof DailySnapshot) => {
    const daily = new Map<string, number>();
    for (const r of sorted) {
      daily.set(r.date, (daily.get(r.date) ?? 0) + (r[key] as number));
    }
    const values = Array.from(daily.values());
    if (values.length <= 12) return values;
    const groupSize = Math.ceil(values.length / 12);
    const grouped: number[] = [];
    for (let i = 0; i < values.length; i += groupSize) {
      const slice = values.slice(i, i + groupSize);
      grouped.push(slice.reduce((s, v) => s + v, 0) / slice.length);
    }
    return grouped;
  };

  return {
    followers,
    followers_change: followersChange,
    reach,
    reach_change: reachChange,
    engagement_rate: er,
    er_change: erChange,
    posts,
    posts_change: postsChange,
    sparkline: {
      followers: buckets("followers"),
      reach: buckets("reach"),
      er: buckets("engaged"),
      posts: buckets("posts"),
    },
  };
}
