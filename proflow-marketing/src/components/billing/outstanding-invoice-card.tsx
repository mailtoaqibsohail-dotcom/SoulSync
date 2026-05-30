"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge, type InvoiceStatus } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { SubmitProofModal } from "./submit-proof-modal";
import type { PaymentMethodKey } from "@/lib/types";

interface Props {
  inv: {
    id: string;
    number: string;
    issue_date: string;
    due_date: string;
    amount: number;
    currency: string;
    status: InvoiceStatus;
    enabled_methods: PaymentMethodKey[];
    proof_submitted_at?: string;
  };
}

function daysUntil(dateStr: string) {
  const due = new Date(dateStr);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff > 0)
    return {
      label: `Due in ${diff} day${diff === 1 ? "" : "s"}`,
      overdue: false,
    };
  if (diff === 0) return { label: "Due today", overdue: false };
  return {
    label: `${Math.abs(diff)} day${Math.abs(diff) === 1 ? "" : "s"} overdue`,
    overdue: true,
  };
}

export function OutstandingInvoiceCard({ inv }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const cd = daysUntil(inv.due_date);
  const awaiting = inv.status === "proof_uploaded";

  return (
    <>
      <Card>
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm text-muted-foreground">{inv.number}</div>
              <div className="text-xs text-muted-foreground">
                Issued {formatDate(inv.issue_date)}
              </div>
            </div>
            <StatusBadge status={inv.status} />
          </div>
          <div>
            <div className="text-3xl font-semibold">
              {formatCurrency(inv.amount, inv.currency)}
            </div>
            <div
              className={`text-sm mt-1 ${
                cd.overdue
                  ? "text-red-600 font-medium"
                  : "text-muted-foreground"
              }`}
            >
              {awaiting && inv.proof_submitted_at
                ? `Awaiting verification (submitted ${formatDate(
                    inv.proof_submitted_at
                  )})`
                : cd.label}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              View Invoice
            </Button>
            <Button
              size="sm"
              disabled={awaiting}
              onClick={() => setOpen(true)}
            >
              {awaiting ? "Proof submitted" : "Submit Payment Proof"}
            </Button>
          </div>
        </CardContent>
      </Card>
      <SubmitProofModal
        open={open}
        onOpenChange={setOpen}
        invoice={{
          id: inv.id,
          number: inv.number,
          amount: inv.amount,
          currency: inv.currency,
          enabled_methods: inv.enabled_methods,
        }}
        onSubmitted={() => router.refresh()}
      />
    </>
  );
}
