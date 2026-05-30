"use client";

import { useState, useTransition } from "react";
import { GripVertical, Star } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import type {
  AgencyPaymentMethods,
  Currency,
  PaymentMethodKey,
} from "@/lib/types";
import { savePaymentMethods } from "./actions";
import { cn } from "@/lib/utils";

const CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "PKR", "AED"];

const METHOD_LABELS: Record<PaymentMethodKey, string> = {
  wise: "Wise",
  bank: "Bank Transfer",
  payoneer: "Payoneer",
};

export function PaymentMethodsForm({
  orgId,
  initial,
}: {
  orgId: string;
  initial: AgencyPaymentMethods;
}) {
  const [state, setState] = useState<AgencyPaymentMethods>(initial);
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  function update<K extends keyof AgencyPaymentMethods>(
    key: K,
    value: AgencyPaymentMethods[K]
  ) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function updateDetails<
    K extends "wise_details" | "bank_details" | "payoneer_details",
  >(key: K, patch: Partial<AgencyPaymentMethods[K]>) {
    setState((s) => ({ ...s, [key]: { ...s[key], ...patch } }));
  }

  function moveMethod(idx: number, dir: -1 | 1) {
    const next = [...state.method_order];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    update("method_order", next);
  }

  function onSave() {
    startTransition(async () => {
      const res = await savePaymentMethods(orgId, state);
      if (res.ok) {
        setToast(
          "Payment methods updated. These will appear on all new invoices."
        );
      } else {
        setToast(`Failed to save: ${res.error}`);
      }
      setTimeout(() => setToast(null), 4000);
    });
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Wise */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Wise (Primary)</CardTitle>
            <CardDescription>
              Recommended for international wire and ACH receipts.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="wise-enabled">Enable Wise</Label>
            <Switch
              id="wise-enabled"
              checked={state.wise_enabled}
              onCheckedChange={(v) => update("wise_enabled", v)}
            />
          </div>
        </CardHeader>
        {state.wise_enabled && (
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Account holder name">
              <Input
                value={state.wise_details.account_holder ?? ""}
                onChange={(e) =>
                  updateDetails("wise_details", {
                    account_holder: e.target.value,
                  })
                }
              />
            </Field>
            <Field
              label="USD account number"
              hint="Your Wise USD account number for receiving payments"
            >
              <Input
                value={state.wise_details.usd_account_number ?? ""}
                onChange={(e) =>
                  updateDetails("wise_details", {
                    usd_account_number: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="Routing number (ACH)">
              <Input
                value={state.wise_details.routing_ach ?? ""}
                onChange={(e) =>
                  updateDetails("wise_details", {
                    routing_ach: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="Wire routing number (optional)">
              <Input
                value={state.wise_details.routing_wire ?? ""}
                onChange={(e) =>
                  updateDetails("wise_details", {
                    routing_wire: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="SWIFT / BIC code">
              <Input
                value={state.wise_details.swift ?? ""}
                onChange={(e) =>
                  updateDetails("wise_details", { swift: e.target.value })
                }
              />
            </Field>
            <Field
              label="Wise payment link (optional)"
              hint="Your personal Wise payment link if you have one"
            >
              <Input
                placeholder="wise.com/pay/..."
                value={state.wise_details.payment_link ?? ""}
                onChange={(e) =>
                  updateDetails("wise_details", {
                    payment_link: e.target.value,
                  })
                }
              />
            </Field>
            <Field
              label="Bank name and address"
              className="md:col-span-2"
              hint="Pre-filled with Wise's bank details — edit if needed."
            >
              <Textarea
                rows={3}
                value={state.wise_details.bank_name_address ?? ""}
                onChange={(e) =>
                  updateDetails("wise_details", {
                    bank_name_address: e.target.value,
                  })
                }
              />
            </Field>
            <Field
              label="Additional instructions"
              className="md:col-span-2"
              hint="Anything specific clients need to know, like reference numbers."
            >
              <Textarea
                rows={3}
                value={state.wise_details.instructions ?? ""}
                onChange={(e) =>
                  updateDetails("wise_details", {
                    instructions: e.target.value,
                  })
                }
              />
            </Field>
          </CardContent>
        )}
      </Card>

      {/* Bank */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Bank Transfer</CardTitle>
            <CardDescription>
              Useful as a backup or for clients who pay locally.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="bank-enabled">Enable Bank Transfer</Label>
            <Switch
              id="bank-enabled"
              checked={state.bank_enabled}
              onCheckedChange={(v) => update("bank_enabled", v)}
            />
          </div>
        </CardHeader>
        {state.bank_enabled && (
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field label="Account holder name">
              <Input
                value={state.bank_details.account_holder ?? ""}
                onChange={(e) =>
                  updateDetails("bank_details", {
                    account_holder: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="Bank name">
              <Input
                value={state.bank_details.bank_name ?? ""}
                onChange={(e) =>
                  updateDetails("bank_details", { bank_name: e.target.value })
                }
              />
            </Field>
            <Field label="Account number">
              <Input
                value={state.bank_details.account_number ?? ""}
                onChange={(e) =>
                  updateDetails("bank_details", {
                    account_number: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="IBAN (optional)">
              <Input
                value={state.bank_details.iban ?? ""}
                onChange={(e) =>
                  updateDetails("bank_details", { iban: e.target.value })
                }
              />
            </Field>
            <Field label="SWIFT / BIC code">
              <Input
                value={state.bank_details.swift ?? ""}
                onChange={(e) =>
                  updateDetails("bank_details", { swift: e.target.value })
                }
              />
            </Field>
            <Field label="Branch code (optional)">
              <Input
                value={state.bank_details.branch_code ?? ""}
                onChange={(e) =>
                  updateDetails("bank_details", {
                    branch_code: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="Bank address" className="md:col-span-2">
              <Textarea
                rows={3}
                value={state.bank_details.bank_address ?? ""}
                onChange={(e) =>
                  updateDetails("bank_details", {
                    bank_address: e.target.value,
                  })
                }
              />
            </Field>
            <Field
              label="Currencies accepted"
              hint="Toggle the currencies you can receive."
              className="md:col-span-2"
            >
              <div className="flex flex-wrap gap-2">
                {CURRENCIES.map((c) => {
                  const active = state.bank_details.currencies?.includes(c);
                  return (
                    <button
                      type="button"
                      key={c}
                      onClick={() => {
                        const cur = state.bank_details.currencies ?? [];
                        const next = active
                          ? cur.filter((x) => x !== c)
                          : [...cur, c];
                        updateDetails("bank_details", { currencies: next });
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-md border text-sm",
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-accent"
                      )}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field
              label="Additional instructions"
              className="md:col-span-2"
            >
              <Textarea
                rows={3}
                value={state.bank_details.instructions ?? ""}
                onChange={(e) =>
                  updateDetails("bank_details", {
                    instructions: e.target.value,
                  })
                }
              />
            </Field>
          </CardContent>
        )}
      </Card>

      {/* Payoneer */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle>Payoneer</CardTitle>
            <CardDescription>
              Add a Payoneer option for clients who prefer it.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="payoneer-enabled">Enable Payoneer</Label>
            <Switch
              id="payoneer-enabled"
              checked={state.payoneer_enabled}
              onCheckedChange={(v) => update("payoneer_enabled", v)}
            />
          </div>
        </CardHeader>
        {state.payoneer_enabled && (
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Field
              label="Payoneer email"
              hint="The email your clients will send payments to."
            >
              <Input
                type="email"
                value={state.payoneer_details.email ?? ""}
                onChange={(e) =>
                  updateDetails("payoneer_details", { email: e.target.value })
                }
              />
            </Field>
            <Field
              label="Payment request link (optional)"
              hint="Paste a Payoneer 'Request Payment' link if you use one."
            >
              <Input
                value={state.payoneer_details.payment_request_link ?? ""}
                onChange={(e) =>
                  updateDetails("payoneer_details", {
                    payment_request_link: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="Additional instructions" className="md:col-span-2">
              <Textarea
                rows={3}
                value={state.payoneer_details.instructions ?? ""}
                onChange={(e) =>
                  updateDetails("payoneer_details", {
                    instructions: e.target.value,
                  })
                }
              />
            </Field>
          </CardContent>
        )}
      </Card>

      {/* Display preferences */}
      <Card>
        <CardHeader>
          <CardTitle>How payment methods appear on invoices</CardTitle>
          <CardDescription>
            Reorder and choose which method is highlighted as recommended.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Default payment method order</Label>
            <ul className="border rounded-md divide-y">
              {state.method_order.map((m, idx) => (
                <li
                  key={m}
                  className="flex items-center justify-between px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {METHOD_LABELS[m]}
                    </span>
                    {state.recommended_method === m && (
                      <span className="text-xs inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5">
                        <Star className="h-3 w-3" /> Recommended
                      </span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => moveMethod(idx, -1)}
                      disabled={idx === 0}
                    >
                      Up
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => moveMethod(idx, 1)}
                      disabled={idx === state.method_order.length - 1}
                    >
                      Down
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="recommend-first"
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={
                state.recommended_method === state.method_order[0]
              }
              onChange={(e) =>
                update(
                  "recommended_method",
                  e.target.checked ? state.method_order[0] : null
                )
              }
            />
            <Label htmlFor="recommend-first">
              Mark the first method as &ldquo;Recommended&rdquo;
            </Label>
          </div>

          <div className="max-w-xs">
            <Field label="Currency for invoices">
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={state.default_currency}
                onChange={(e) =>
                  update("default_currency", e.target.value as Currency)
                }
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-card border-t px-6 py-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {toast ?? "Changes are saved when you click Save Payment Methods."}
        </div>
        <Button onClick={onSave} disabled={pending}>
          {pending ? "Saving…" : "Save Payment Methods"}
        </Button>
      </div>
    </div>
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
