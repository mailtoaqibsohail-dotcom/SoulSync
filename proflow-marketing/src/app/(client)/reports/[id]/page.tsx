import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReportShareButton } from "@/components/reports/report-share-button";
import {
  executiveSummary,
  getReport,
  reportTitle,
} from "@/lib/reports-data";
import { topPostsForClient } from "@/lib/analytics-data";
import { CLIENTS, PLATFORM_LABEL } from "@/lib/clients-data";
import { AGENCY_PROFILE } from "@/lib/sample-data";
import { getReportById } from "@/lib/data/records";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function clientNameFor(clientId: string): Promise<string | null> {
  const supabase = createClient();
  const { data } = await supabase.from("clients").select("name").eq("id", clientId).single();
  return data?.name ?? null;
}

export default async function ReportViewerPage({
  params,
}: {
  params: { id: string };
}) {
  // Live report (RLS-scoped to the caller's client) with sample fallback.
  const report = (await getReportById(params.id)) ?? getReport(params.id);
  if (!report) notFound();
  const sampleClient = CLIENTS.find((c) => c.id === report.client_id);
  const liveName = sampleClient ? null : (await clientNameFor(report.client_id)) ?? "Your brand";
  const client = sampleClient ?? {
    name: liveName as string,
    brand_color: "#6366F1",
    initials: (liveName as string)
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase(),
  };
  const topPosts = topPostsForClient(report.client_id)
    .slice()
    .sort(
      (a, b) =>
        (b.likes + b.comments) / b.reach - (a.likes + a.comments) / a.reach
    )
    .slice(0, 5);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button asChild variant="ghost" size="sm">
          <Link href="/reports">
            <ArrowLeft className="h-4 w-4" />
            Back to reports
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <a
              href={`/api/reports/${report.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          </Button>
          <ReportShareButton id={report.id} />
        </div>
      </div>

      {/* Cover */}
      <Card>
        <CardContent className="p-8 flex items-center justify-between gap-6 flex-wrap">
          <div
            className="h-14 w-14 rounded-lg grid place-items-center text-white text-lg font-semibold"
            style={{ backgroundColor: client.brand_color }}
          >
            {client.initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Monthly Report
            </div>
            <h1 className="text-3xl font-bold mt-0.5">
              {client.name} &middot; {reportTitle(report)}
            </h1>
            <div className="text-xs text-muted-foreground mt-1">
              Generated {formatDate(report.generated_on)} ·{" "}
              {AGENCY_PROFILE.name}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Executive summary */}
      <Section title="Executive summary">
        <p className="text-sm leading-relaxed">{executiveSummary(report)}</p>
      </Section>

      {/* Headline metrics */}
      <Section title="Headline metrics">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Headline
            label="Followers gained"
            value={`+${report.follower_change.toLocaleString()}`}
          />
          <Headline label="Posts published" value={report.posts.toString()} />
          <Headline
            label="Engagement rate"
            value={`${report.engagement_rate.toFixed(1)}%`}
          />
          <Headline
            label="Top platform"
            value={PLATFORM_LABEL[topPosts[0]?.platform ?? "instagram"]}
          />
        </div>
      </Section>

      {/* Top 5 posts */}
      <Section title="Top 5 posts of the month">
        <ul className="divide-y">
          {topPosts.map((p, i) => {
            const er = ((p.likes + p.comments) / p.reach) * 100;
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span className="h-6 w-6 rounded-full bg-muted text-xs grid place-items-center font-semibold">
                  {i + 1}
                </span>
                <span
                  className="h-10 w-10 rounded-md grid place-items-center text-white text-[10px] font-semibold"
                  style={{ backgroundColor: p.thumb_color }}
                >
                  {PLATFORM_LABEL[p.platform][0]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.caption}</div>
                  <div className="text-xs text-muted-foreground">
                    {PLATFORM_LABEL[p.platform]} · {formatDate(p.date)} ·{" "}
                    {p.reach.toLocaleString()} reach
                  </div>
                </div>
                <div className="text-sm font-semibold text-success inline-flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  {er.toFixed(1)}%
                </div>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* What we did */}
      <div className="grid gap-4 md:grid-cols-2">
        <Section title="What we did this month">
          <ul className="list-disc list-inside text-sm space-y-1">
            {report.what_we_did.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </Section>
        <Section title="What is coming next month">
          <ul className="list-disc list-inside text-sm space-y-1">
            {report.coming_next.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </Section>
      </div>

      <p className="text-xs text-muted-foreground text-center pt-2">
        {AGENCY_PROFILE.name} · {AGENCY_PROFILE.address}
      </p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Headline({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}
