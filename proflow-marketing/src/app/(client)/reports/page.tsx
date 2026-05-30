import Link from "next/link";
import { FileText, Download, ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReportShareButton } from "@/components/reports/report-share-button";
import { reportsForClient, reportTitle } from "@/lib/reports-data";
import { CLIENTS } from "@/lib/clients-data";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getClientReports } from "@/lib/data/records";
import { getVisibleClients } from "@/lib/data/clients";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReportsListPage() {
  const user = await getCurrentUser();

  let client: { brand_color?: string } | undefined;
  let reports;
  if (user.isDemo) {
    const clientId = user.client_id ?? CLIENTS[0].id;
    client = CLIENTS.find((c) => c.id === clientId);
    reports = reportsForClient(clientId);
  } else {
    const { byId } = await getVisibleClients(user);
    const c = user.client_id ? byId.get(user.client_id) : undefined;
    client = c ? { brand_color: c.color } : undefined;
    reports = await getClientReports(user);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Monthly Reports</h1>
        <p className="text-sm text-muted-foreground">
          Detailed performance summaries from your social media activity.
        </p>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            No reports yet. Your first monthly summary will appear here at the
            end of the cycle.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => (
            <li key={r.id}>
              <Card>
                <CardContent className="p-5 flex items-center gap-4 flex-wrap">
                  <div
                    className="h-10 w-10 rounded-md grid place-items-center"
                    style={{
                      backgroundColor: `${client?.brand_color}15`,
                      color: client?.brand_color,
                    }}
                  >
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{reportTitle(r)}</div>
                    <div className="text-xs text-muted-foreground">
                      Generated on {formatDate(r.generated_on)} ·{" "}
                      <span className="text-success">
                        +{r.follower_change.toLocaleString()} followers
                      </span>
                      , {r.posts} posts, {r.engagement_rate.toFixed(1)}%
                      engagement
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/reports/${r.id}`}>
                        <ExternalLink className="h-3.5 w-3.5" />
                        View
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <a
                        href={`/api/reports/${r.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download PDF
                      </a>
                    </Button>
                    <ReportShareButton id={r.id} />
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
