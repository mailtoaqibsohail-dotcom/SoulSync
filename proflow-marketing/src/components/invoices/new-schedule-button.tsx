"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  FREQUENCY_LABEL,
  type Frequency,
} from "@/lib/recurring-data";

interface ClientRef {
  id: string;
  name: string;
  monthly_fee: number;
}

interface Props {
  clients: ClientRef[];
  onSaved?: () => void;
}

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function NewScheduleButton({ clients, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [day, setDay] = useState(1);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [endDate, setEndDate] = useState("");
  const [autoSend, setAutoSend] = useState(true);
  const [amount, setAmount] = useState(1500);
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      // TODO: persist via Supabase
      await new Promise((r) => setTimeout(r, 400));
      setOpen(false);
      onSaved?.();
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={clients.length === 0}>
        <Plus className="h-4 w-4" />
        New Recurring Schedule
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent width="640px" className="p-0">
          <SheetHeader>
            <SheetTitle>New recurring schedule</SheetTitle>
            <SheetDescription>
              We will generate an invoice on the cadence you set. Auto-send
              emails it; otherwise it lands as a Draft for your review.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            <Field label="Client" required>
              <select
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  const c = clients.find((x) => x.id === e.target.value);
                  if (c) setAmount(c.monthly_fee);
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Frequency">
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as Frequency)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {(Object.keys(FREQUENCY_LABEL) as Frequency[]).map((f) => (
                    <option key={f} value={f}>
                      {FREQUENCY_LABEL[f]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Generate on">
                {frequency === "weekly" || frequency === "biweekly" ? (
                  <select
                    value={day}
                    onChange={(e) => setDay(Number(e.target.value))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {DAYS_OF_WEEK.map((d, i) => (
                      <option key={d} value={i}>
                        {d}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type="number"
                    min={1}
                    max={28}
                    value={day}
                    onChange={(e) => setDay(Number(e.target.value))}
                  />
                )}
              </Field>
              <Field label="Start date">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </Field>
              <Field
                label="End date (optional)"
                hint="Leave blank to continue indefinitely."
              >
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </Field>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">Auto-send when generated</div>
                <p className="text-xs text-muted-foreground">
                  Off = save as Draft for your review first.
                </p>
              </div>
              <Switch checked={autoSend} onCheckedChange={setAutoSend} />
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Invoice template
              </div>
              <Field
                label="Amount (USD)"
                hint="Pre-filled from this client's monthly fee. Edit individual invoices after generation."
              >
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                />
              </Field>
              <Field label="Notes to client">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Reused on every generated invoice."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </Field>
            </div>
          </div>

          <div className="border-t bg-card px-6 py-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Line items, payment methods, and notes inherit from the Day 21
              New Invoice template once Supabase wiring lands.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={save} disabled={pending || !clientId}>
                {pending ? "Saving…" : "Save Schedule"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label} {required && <span className="text-danger">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
