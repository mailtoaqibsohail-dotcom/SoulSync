import { Download, ExternalLink } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  CLIENT_PROFILE,
  CLIENT_INVOICES,
} from "@/lib/client-billing-data";
import { OutstandingInvoiceCard } from "@/components/billing/outstanding-invoice-card";
import { getInvoiceStatus, latestProof } from "@/lib/demo-store";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getClientBilling } from "@/lib/data/records";
import type { PaymentMethodKey } from "@/lib/types";

export const dynamic = "force-dynamic";

const DEFAULT_METHODS: PaymentMethodKey[] = ["wise", "bank", "payoneer"];
const OUTSTANDING = new Set(["sent", "overdue", "proof_uploaded"]);

export default async function BillingPage() {
  const user = await getCurrentUser();

  // Live, own-invoices only (RLS); sample data in demo mode.
  const billing = user.isDemo ? null : await getClientBilling(user);
  const profile = billing?.profile ?? CLIENT_PROFILE;
  const invoices = billing?.invoices ?? CLIENT_INVOICES;

  const live = invoices.map((inv) => {
    const status = user.isDemo ? getInvoiceStatus(inv.id) : inv.status;
    const proof = user.isDemo ? latestProof(inv.id) : null;
    return {
      ...inv,
      status,
      enabled_methods: DEFAULT_METHODS,
      proof_submitted_at: proof?.submitted_at,
    };
  });

  const outstanding = live.filter((r) => OUTSTANDING.has(r.status));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Billing</h1>
        <p className="text-sm text-muted-foreground">
          View your invoices and submit payment proof.
        </p>
      </div>

      {/* Account summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <Summary label="Plan" value={profile.plan_name} />
            <Summary
              label="Monthly fee"
              value={formatCurrency(profile.monthly_fee)}
            />
            <Summary
              label="Next invoice"
              value={profile.next_invoice_date ? formatDate(profile.next_invoice_date) : "—"}
            />
            <Summary
              label="Paid YTD"
              value={formatCurrency(profile.ytd_paid)}
            />
          </div>
        </CardContent>
      </Card>

      {outstanding.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Outstanding</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {outstanding.map((inv) => (
              <OutstandingInvoiceCard key={inv.id} inv={inv} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">All invoices</h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-left">
                  <tr>
                    <th className="px-4 py-3 font-medium">Invoice #</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium text-right">
                      Amount
                    </th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {live.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3 font-medium">{inv.number}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(inv.issue_date)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(inv.amount, inv.currency)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex gap-1">
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                            <span className="sr-only">Download</span>
                          </Button>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                            <span className="sr-only">View</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}
