"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import { cn, formatCurrency } from "@/lib/utils";
import type { Currency, PaymentMethodKey } from "@/lib/types";
import {
  LINE_ITEM_TEMPLATES,
  calcTotals,
  lineItemTotal,
  type InvoiceDraft,
  type InvoiceLineItem,
} from "@/lib/invoice";
import {
  SAMPLE_CLIENTS,
  DEFAULT_PAYMENT_METHODS,
  AGENCY_PROFILE,
} from "@/lib/sample-data";
import { sendInvoice } from "@/app/(app)/invoices/actions";

const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "PKR", "AED"];

function nextInvoiceNumber() {
  const year = new Date().getFullYear();
  const seq = Math.floor(1000 + Math.random() * 9000);
  return `INV-${year}-${seq}`;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x.toISOString().slice(0, 10);
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewInvoiceDrawer({ open, onOpenChange }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [clientId, setClientId] = useState<string>(SAMPLE_CLIENTS[0].id);
  const [invoiceNumber, setInvoiceNumber] = useState(nextInvoiceNumber);
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(addDays(new Date(), 7));
  const [currency, setCurrency] = useState<Currency>("USD");
  const [refNumber, setRefNumber] = useState("");
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { description: "Monthly marketing retainer", quantity: 1, unit_price: 1500 },
  ]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountType, setDiscountType] = useState<"fixed" | "percentage">(
    "fixed"
  );
  const [taxRate, setTaxRate] = useState<number>(0);
  const [taxLabel, setTaxLabel] = useState<string>("");
  const [enabledMethods, setEnabledMethods] = useState<PaymentMethodKey[]>([
    "wise",
    "bank",
    "payoneer",
  ]);
  const [notes, setNotes] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState<"idle" | "draft" | "preview" | "send">(
    "idle"
  );
  const [toast, setToast] = useState<string | null>(null);

  const client = useMemo(
    () => SAMPLE_CLIENTS.find((c) => c.id === clientId)!,
    [clientId]
  );

  const draft: InvoiceDraft = useMemo(
    () => ({
      invoice_number: invoiceNumber,
      issue_date: issueDate,
      due_date: dueDate,
      currency,
      reference_number: refNumber || undefined,
      client: {
        name: client.name,
        company: client.company_name,
        contact: client.primary_contact,
        billing_email: client.billing_email,
      },
      agency: AGENCY_PROFILE,
      line_items: lineItems,
      discount_amount: discountAmount || undefined,
      discount_type: discountType,
      tax_amount: taxRate || undefined,
      tax_label: taxLabel || undefined,
      notes_to_client: notes || undefined,
      enabled_payment_methods: enabledMethods,
      payment_methods: DEFAULT_PAYMENT_METHODS,
    }),
    [
      invoiceNumber,
      issueDate,
      dueDate,
      currency,
      refNumber,
      client,
      lineItems,
      discountAmount,
      discountType,
      taxRate,
      taxLabel,
      notes,
      enabledMethods,
    ]
  );

  const totals = calcTotals(draft);

  function addLineItem() {
    setLineItems((items) => [
      ...items,
      { description: "", quantity: 1, unit_price: 0 },
    ]);
  }

  function updateLineItem(idx: number, patch: Partial<InvoiceLineItem>) {
    setLineItems((items) =>
      items.map((it, i) => (i === idx ? { ...it, ...patch } : it))
    );
  }

  function removeLineItem(idx: number) {
    setLineItems((items) => items.filter((_, i) => i !== idx));
  }

  function insertTemplate(templateLabel: string) {
    const t = LINE_ITEM_TEMPLATES.find((x) => x.label === templateLabel);
    if (!t) return;
    setLineItems((items) => [
      ...items,
      {
        description: t.description,
        quantity: t.quantity,
        unit_price: t.unit_price,
      },
    ]);
  }

  function toggleMethod(m: PaymentMethodKey) {
    setEnabledMethods((arr) =>
      arr.includes(m) ? arr.filter((x) => x !== m) : [...arr, m]
    );
  }

  async function previewPdf() {
    setBusy("preview");
    try {
      const res = await fetch("/api/invoices/preview", {
        method: "POST",
        body: JSON.stringify(draft),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setToast("Failed to render PDF preview.");
      console.error(err);
    } finally {
      setBusy("idle");
    }
  }

  function saveDraft() {
    setBusy("draft");
    setTimeout(() => {
      setBusy("idle");
      setToast(`Saved draft ${draft.invoice_number}.`);
      setTimeout(() => setToast(null), 3000);
    }, 400);
  }

  async function handleSendInvoice() {
    setBusy("send");
    try {
      const res = await sendInvoice(draft);
      if (!res.ok) {
        setToast(`Failed to send: ${res.error}`);
        return;
      }
      setConfirmOpen(false);
      setToast(
        res.simulated
          ? `Draft ready (simulated — configure SMTP to send for real).`
          : `Invoice ${draft.invoice_number} sent to ${client.name}.`
      );
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      setToast("Failed to send invoice.");
    } finally {
      setBusy("idle");
      setTimeout(() => setToast(null), 5000);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent width="720px" className="p-0">
        <SheetHeader>
          <SheetTitle>Create new invoice</SheetTitle>
          <SheetDescription>
            Build the invoice, preview the PDF, then send it to your client.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-8">
          {/* Client */}
          <Section title="Client">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Client">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                >
                  {SAMPLE_CLIENTS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Billing email">
                <Input value={client.billing_email} readOnly />
              </Field>
            </div>
          </Section>

          {/* Invoice details */}
          <Section title="Invoice details">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Invoice number">
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </Field>
              <Field label="Currency">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as Currency)}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Issue date">
                <Input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </Field>
              <Field label="Due date">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </Field>
              <Field
                label="Reference / PO number"
                hint="Add a client-specific reference for their records."
                className="md:col-span-2"
              >
                <Input
                  value={refNumber}
                  onChange={(e) => setRefNumber(e.target.value)}
                />
              </Field>
            </div>
          </Section>

          {/* Line items */}
          <Section
            title="Line items"
            right={
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                onChange={(e) => {
                  if (e.target.value) {
                    insertTemplate(e.target.value);
                    e.target.value = "";
                  }
                }}
              >
                <option value="">Insert template…</option>
                {LINE_ITEM_TEMPLATES.map((t) => (
                  <option key={t.label} value={t.label}>
                    {t.label}
                  </option>
                ))}
              </select>
            }
          >
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">Description</th>
                    <th className="px-3 py-2 font-medium w-20 text-right">
                      Qty
                    </th>
                    <th className="px-3 py-2 font-medium w-32 text-right">
                      Unit price
                    </th>
                    <th className="px-3 py-2 font-medium w-32 text-right">
                      Total
                    </th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lineItems.map((li, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">
                        <Input
                          value={li.description}
                          onChange={(e) =>
                            updateLineItem(i, { description: e.target.value })
                          }
                          placeholder="Description"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={li.quantity}
                          onChange={(e) =>
                            updateLineItem(i, {
                              quantity: Number(e.target.value),
                            })
                          }
                          className="text-right"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={li.unit_price}
                          onChange={(e) =>
                            updateLineItem(i, {
                              unit_price: Number(e.target.value),
                            })
                          }
                          className="text-right"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatCurrency(lineItemTotal(li), currency)}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeLineItem(i)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Remove line item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addLineItem}
              className="mt-2"
            >
              <Plus className="h-4 w-4" />
              Add line item
            </Button>
          </Section>

          {/* Totals + discount/tax */}
          <Section title="Totals">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Discount">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={discountAmount || ""}
                    onChange={(e) =>
                      setDiscountAmount(Number(e.target.value) || 0)
                    }
                    placeholder="0.00"
                  />
                  <select
                    value={discountType}
                    onChange={(e) =>
                      setDiscountType(
                        e.target.value as "fixed" | "percentage"
                      )
                    }
                    className="h-10 rounded-md border border-input bg-background px-2 text-sm"
                  >
                    <option value="fixed">Fixed</option>
                    <option value="percentage">%</option>
                  </select>
                </div>
              </Field>
              <Field label="Tax">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={taxRate || ""}
                    onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
                    placeholder="0"
                  />
                  <Input
                    value={taxLabel}
                    onChange={(e) => setTaxLabel(e.target.value)}
                    placeholder="GST/VAT label"
                  />
                </div>
              </Field>
            </div>
            <div className="ml-auto max-w-xs mt-4 space-y-2 text-sm">
              <Row label="Subtotal" value={formatCurrency(totals.subtotal, currency)} />
              {totals.discount > 0 && (
                <Row
                  label="Discount"
                  value={`-${formatCurrency(totals.discount, currency)}`}
                />
              )}
              {totals.tax > 0 && (
                <Row
                  label={`Tax${taxLabel ? ` (${taxLabel})` : ""}`}
                  value={formatCurrency(totals.tax, currency)}
                />
              )}
              <div className="flex justify-between items-center pt-2 border-t font-semibold text-base">
                <span>Total</span>
                <span>{formatCurrency(totals.total, currency)}</span>
              </div>
            </div>
          </Section>

          {/* Payment methods */}
          <Section
            title="Payment methods on this invoice"
            description="Uncheck any methods you don't want shown on this specific invoice."
          >
            <div className="flex flex-wrap gap-3">
              {(["wise", "bank", "payoneer"] as PaymentMethodKey[]).map(
                (m) => {
                  const checked = enabledMethods.includes(m);
                  const label =
                    m === "wise"
                      ? "Wise"
                      : m === "bank"
                      ? "Bank Transfer"
                      : "Payoneer";
                  return (
                    <label
                      key={m}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 border rounded-md cursor-pointer text-sm",
                        checked
                          ? "border-primary bg-primary/5"
                          : "hover:bg-accent"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMethod(m)}
                        className="h-4 w-4 rounded border-input"
                      />
                      {label}
                    </label>
                  );
                }
              )}
            </div>
          </Section>

          {/* Notes */}
          <Section title="Notes">
            <div className="grid gap-4">
              <Field
                label="Notes to client"
                hint="Appears at the bottom of the invoice PDF."
              >
                <Textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>
              <Field
                label="Internal notes"
                hint="Only visible to your team."
              >
                <Textarea
                  rows={2}
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                />
              </Field>
            </div>
          </Section>
        </div>

        {/* Footer */}
        <div className="border-t bg-card px-6 py-3 flex items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">{toast ?? " "}</div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={saveDraft}
              disabled={busy !== "idle"}
            >
              {busy === "draft" ? "Saving…" : "Save as Draft"}
            </Button>
            <Button
              variant="outline"
              onClick={previewPdf}
              disabled={busy !== "idle"}
            >
              {busy === "preview" ? "Rendering…" : "Preview PDF"}
            </Button>
            <Button
              onClick={() => setConfirmOpen(true)}
              disabled={busy !== "idle"}
            >
              Send Invoice
            </Button>
          </div>
        </div>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send invoice to {client.name}?</DialogTitle>
              <DialogDescription>
                An email will be sent to {client.billing_email} with the
                invoice PDF attached. They will also see it in their billing
                portal.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setConfirmOpen(false)}
                disabled={busy === "send"}
              >
                Cancel
              </Button>
              <Button onClick={handleSendInvoice} disabled={busy === "send"}>
                {busy === "send" ? "Sending…" : "Send Now"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  description,
  right,
  children,
}: {
  title: string;
  description?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}
