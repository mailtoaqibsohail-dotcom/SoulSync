import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { ReportPdf } from "@/lib/pdf/report-pdf";
import { getReport, reportTitle } from "@/lib/reports-data";
import { CLIENTS, PLATFORM_LABEL } from "@/lib/clients-data";
import { topPostsForClient } from "@/lib/analytics-data";
import { AGENCY_PROFILE } from "@/lib/sample-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const report = getReport(params.id);
  if (!report) {
    return new Response("Report not found", { status: 404 });
  }
  const client = CLIENTS.find((c) => c.id === report.client_id);
  if (!client) {
    return new Response("Client not found", { status: 404 });
  }
  const topPosts = topPostsForClient(client.id)
    .slice()
    .sort(
      (a, b) =>
        (b.likes + b.comments) / b.reach - (a.likes + a.comments) / a.reach
    )
    .slice(0, 5)
    .map((p) => ({
      caption: p.caption,
      platform: PLATFORM_LABEL[p.platform],
      reach: p.reach,
      er: ((p.likes + p.comments) / p.reach) * 100,
    }));

  const element = React.createElement(ReportPdf, {
    report,
    clientName: client.name,
    agencyName: AGENCY_PROFILE.name,
    agencyAddress: AGENCY_PROFILE.address ?? "",
    topPosts,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

  const pdf = await renderToBuffer(element);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${client.name.replace(/\s+/g, "-")}-${reportTitle(report).replace(/\s+/g, "-")}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
