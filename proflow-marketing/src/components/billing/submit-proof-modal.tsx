"use client";

import { useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { PaymentMethodKey } from "@/lib/types";
import { submitProof } from "@/app/(client)/billing/actions";

const METHOD_LABELS: Record<PaymentMethodKey, string> = {
  wise: "Wise",
  bank: "Bank Transfer",
  payoneer: "Payoneer",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: {
    id: string;
    number: string;
    amount: number;
    currency: string;
    enabled_methods: PaymentMethodKey[];
  };
  onSubmitted?: () => void;
}

export function SubmitProofModal({
  open,
  onOpenChange,
  invoice,
  onSubmitted,
}: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [method, setMethod] = useState<PaymentMethodKey>(
    invoice.enabled_methods[0] ?? "wise"
  );
  const [paymentDate, setPaymentDate] = useState(today);
  const [amount, setAmount] = useState<number>(invoice.amount);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setMethod(invoice.enabled_methods[0] ?? "wise");
    setPaymentDate(today);
    setAmount(invoice.amount);
    setReference("");
    setNotes("");
    setFile(null);
    setError(null);
  }

  async function fileToDataUrl(f: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(f);
    });
  }

  function handleSubmit() {
    if (!file) {
      setError("Please attach a payment proof (screenshot or PDF).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File is too large (max 10MB).");
      return;
    }
    setError(null);
    startTransition(async () => {
      const dataUrl = await fileToDataUrl(file);
      const res = await submitProof({
        invoice_id: invoice.id,
        payment_method: method,
        payment_date: paymentDate,
        amount_paid: amount,
        transaction_reference: reference,
        client_notes: notes,
        proof_file_name: file.name,
        proof_file_data_url: dataUrl,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onOpenChange(false);
      reset();
      onSubmitted?.();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Submit payment proof</DialogTitle>
          <DialogDescription>
            Upload a screenshot or document confirming your payment. We will
            verify and mark this invoice as paid within 24 hours.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Payment method used</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {invoice.enabled_methods.map((m) => (
                <label
                  key={m}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 border rounded-md cursor-pointer text-sm",
                    method === m
                      ? "border-primary bg-primary/5"
                      : "hover:bg-accent"
                  )}
                >
                  <input
                    type="radio"
                    name="method"
                    checked={method === m}
                    onChange={() => setMethod(m)}
                    className="h-3 w-3"
                  />
                  {METHOD_LABELS[m]}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-3 grid-cols-2">
            <div className="space-y-1.5">
              <Label>Payment date</Label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Amount paid ({invoice.currency})</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Transaction reference / ID</Label>
            <Input
              placeholder="Wise transfer ID, bank reference, or Payoneer txn ID"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Payment proof</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,application/pdf"
              hidden
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "w-full border-2 border-dashed rounded-md p-6 text-sm",
                file
                  ? "border-primary/40 bg-primary/5"
                  : "border-input hover:bg-accent"
              )}
            >
              <div className="flex flex-col items-center gap-1">
                <Upload className="h-5 w-5 text-muted-foreground" />
                {file ? (
                  <>
                    <span className="font-medium">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      Click to replace
                    </span>
                  </>
                ) : (
                  <>
                    <span>Drop screenshot or PDF, or click to browse.</span>
                    <span className="text-xs text-muted-foreground">
                      Max 10MB. JPG, PNG, PDF accepted.
                    </span>
                  </>
                )}
              </div>
            </button>
          </div>

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              rows={2}
              placeholder="Anything we should know about this payment"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={pending}>
            {pending ? "Submitting…" : "Submit Proof"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
