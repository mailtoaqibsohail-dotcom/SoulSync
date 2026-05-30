import Link from "next/link";
import { Repeat, Search } from "lucide-react";
import { NewInvoiceButton } from "@/components/invoices/new-invoice-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge, type InvoiceStatus } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CLIENT_INVOICES } from "@/lib/client-billing-data";
import { getInvoiceStatus } from "@/lib/demo-store";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getOwnerInvoiceRows } from "@/lib/data/records";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  number: string;
  client: string;
  issue_date: string;
  due_date: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
};

const ROWS: Row[] = CLIENT_INVOICES.map((inv) => ({
  id: inv.id,
  number: inv.number,
  client: "Acme Solar",
  issue_date: inv.issue_date,
  due_date: inv.due_date,
  amount: inv.amount,
  currency: inv.currency,
  status: inv.status,
}));

const STATUS_TABS: Array<{ label: string; value: InvoiceStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Proof Uploaded", value: "proof_uploaded" },
  { label: "Paid", value: "paid" },
  { label: "Overdue", value: "overdue" },
  { label: "Cancelled", value: "cancelled" },
];

export default async function InvoicesPage() {
  const user = await getCurrentUser();
  const rows: Row[] = user.isDemo
    ? ROWS.map((r) => ({ ...r, status: getInvoiceStatus(r.id) }))
    : await getOwnerInvoiceRows(user);
  const outstanding = rows.filter(
    (r) => r.status === "sent" || r.status === "proof_uploaded" || r.status === "overdue"
  ).reduce((s, r) => s + r.amount, 0);
  const overdue = rows.filter((r) => r.status === "overdue").reduce(
    (s, r) => s + r.amount,
    0
  );
  const paidThisMonth = rows.filter((r) => r.status === "paid").reduce(
    (s, r) => s + r.amount,
    0
  );
  const awaiting = rows.filter((r) => r.status === "proof_uploaded").length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Create, send, and track client invoices.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/invoices/recurring">
              <Repeat className="h-4 w-4" />
              Recurring Invoices
            </Link>
          </Button>
          <NewInvoiceButton />
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Outstanding"
          value={formatCurrency(outstanding)}
          description="Unpaid invoices total"
        />
        <Stat
          label="Overdue"
          value={formatCurrency(overdue)}
          description="Past their due date"
          valueClass="text-red-600"
        />
        <Stat
          label="Paid This Month"
          value={formatCurrency(paidThisMonth)}
          description="Confirmed receipts"
        />
        <Stat
          label="Awaiting Verification"
          value={String(awaiting)}
          description="Proof uploaded by clients"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {STATUS_TABS.map((t) => (
              <button
                key={t.value}
                className="px-3 py-1.5 rounded-full text-sm border bg-background hover:bg-accent data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:border-primary"
                data-active={t.value === "all" ? "true" : undefined}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by client name or invoice number..."
                className="pl-9"
              />
            </div>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option>All clients</option>
            </select>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option>Any date</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
              <option>This year</option>
            </select>
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option>Newest first</option>
              <option>Oldest first</option>
              <option>Amount high to low</option>
              <option>Due date</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr className="text-left">
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" className="rounded border-input" />
                  </th>
                  <th className="px-4 py-3 font-medium">Invoice #</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Issued</th>
                  <th className="px-4 py-3 font-medium">Due</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium w-10" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/40">
                    <td className="px-4 py-3">
                      <input type="checkbox" className="rounded border-input" />
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/invoices/${r.id}`}
                        className="text-primary hover:underline"
                      >
                        {r.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{r.client}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(r.issue_date)}
                    </td>
                    <td
                      className={
                        r.status === "overdue"
                          ? "px-4 py-3 text-red-600"
                          : "px-4 py-3 text-muted-foreground"
                      }
                    >
                      {formatDate(r.due_date)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(r.amount, r.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">⋯</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Day 20 build status</CardTitle>
          <CardDescription>
            Settings → Payment Methods is wired up; invoice creation, PDF
            generation, and client billing land in Day 21-24.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  description,
  valueClass,
}: {
  label: string;
  value: string;
  description: string;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-semibold ${valueClass ?? ""}`}>
          {value}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}
