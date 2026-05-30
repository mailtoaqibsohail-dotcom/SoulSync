"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { ProofRecord } from "@/lib/demo-store";
import { confirmPayment, rejectProof } from "@/app/(app)/invoices/verify-actions";

interface Props {
  proof: ProofRecord;
  invoiceId: string;
}

export function ProofVerificationPanel({ proof, invoiceId }: Props) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [verified, setVerified] = useState(false);
  const [internalNotes, setInternalNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [pending, startTransition] = useTransition();

  const isImage = proof.proof_file_data_url.startsWith("data:image/");
  const isPending = proof.status === "pending_verification";

  function doConfirm() {
    startTransition(async () => {
      await confirmPayment({
        invoice_id: invoiceId,
        proof_id: proof.id,
        agency_internal_notes: internalNotes,
      });
      setConfirmOpen(false);
      router.refresh();
    });
  }

  function doReject() {
    if (!rejectReason.trim()) return;
    startTransition(async () => {
      await rejectProof({
        invoice_id: invoiceId,
        proof_id: proof.id,
        rejection_reason: rejectReason,
      });
      setRejectOpen(false);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Submitted payment proof</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 text-sm">
          <Row label="Payment method" value={proof.payment_method} />
          <Row label="Payment date" value={formatDate(proof.payment_date)} />
          <Row
            label="Amount paid"
            value={formatCurrency(proof.amount_paid)}
          />
          <Row
            label="Transaction reference"
            value={proof.transaction_reference || "—"}
          />
          {proof.client_notes && (
            <Row
              label="Notes from client"
              value={proof.client_notes}
              full
            />
          )}
          <Row label="Submitted" value={formatDate(proof.submitted_at)} />
          <Row label="Status" value={proof.status} />
          {proof.rejection_reason && (
            <Row
              label="Rejection reason"
              value={proof.rejection_reason}
              full
            />
          )}
        </div>

        <div className="space-y-2">
          <Label>File</Label>
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={proof.proof_file_data_url}
              alt={proof.proof_file_name}
              className="max-h-96 rounded-md border"
            />
          ) : (
            <div className="rounded-md border p-4 text-sm">
              <a
                href={proof.proof_file_data_url}
                download={proof.proof_file_name}
                className="text-primary underline"
              >
                {proof.proof_file_name} (download)
              </a>
            </div>
          )}
          <a
            href={proof.proof_file_data_url}
            download={proof.proof_file_name}
            className="inline-block text-sm text-primary hover:underline"
          >
            Download proof
          </a>
        </div>

        {isPending && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button
              variant="outline"
              className="border-destructive/30 text-destructive hover:bg-destructive/10"
              onClick={() => setRejectOpen(true)}
            >
              Reject and Request Resubmission
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => setConfirmOpen(true)}
            >
              Confirm Payment Received
            </Button>
          </div>
        )}
      </CardContent>

      {/* Confirm modal */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm payment for {invoiceId}?</DialogTitle>
            <DialogDescription>
              This will mark the invoice as Paid and notify the client. Make
              sure you have verified the payment in your{" "}
              {proof.payment_method} account first.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-input"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
              />
              I have verified the payment in my account.
            </label>
            <div className="space-y-1.5">
              <Label>Internal notes (optional)</Label>
              <Textarea
                rows={2}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="e.g. Received in Wise account on May 28"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={doConfirm} disabled={!verified || pending}>
              {pending ? "Confirming…" : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject modal */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject payment proof?</DialogTitle>
            <DialogDescription>
              The client will receive an email with your reason and can submit
              new proof.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Reason for rejection</Label>
            <Textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Be specific so the client can fix it quickly."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={doReject}
              disabled={!rejectReason.trim() || pending}
            >
              {pending ? "Sending…" : "Reject and Notify Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Row({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}
