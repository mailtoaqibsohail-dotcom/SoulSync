import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CLIENT_INVOICES } from "@/lib/client-billing-data";
import { getInvoiceStatus, latestProof } from "@/lib/demo-store";
import { ProofVerificationPanel } from "@/components/invoices/proof-verification-panel";

export const dynamic = "force-dynamic";

export default function InvoiceDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const base = CLIENT_INVOICES.find((c) => c.id === params.id);
  if (!base) notFound();

  const status = getInvoiceStatus(base.id);
  const proof = latestProof(base.id);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/invoices">
            <ArrowLeft className="h-4 w-4" />
            Back to invoices
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{base.number}</h1>
          <p className="text-sm text-muted-foreground">
            Issued {formatDate(base.issue_date)} · Due{" "}
            {formatDate(base.due_date)}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      {status === "proof_uploaded" && proof && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-900">
              Payment proof awaiting verification
            </div>
            <div className="text-sm text-amber-900/80 mt-0.5">
              Submitted {formatDate(proof.submitted_at)}. Please verify the
              payment in your {proof.payment_method} account before confirming.
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Amount
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {formatCurrency(base.amount, base.currency)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Client
            </CardTitle>
          </CardHeader>
          <CardContent>Acme Solar</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Currency
            </CardTitle>
          </CardHeader>
          <CardContent>{base.currency}</CardContent>
        </Card>
      </div>

      {proof && <ProofVerificationPanel proof={proof} invoiceId={base.id} />}

      {!proof && (
        <Card>
          <CardHeader>
            <CardTitle>Payment proof</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            No payment proof submitted yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
