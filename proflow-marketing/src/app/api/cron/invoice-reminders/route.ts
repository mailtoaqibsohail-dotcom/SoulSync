import { NextRequest, NextResponse } from "next/server";
import { CLIENT_INVOICES } from "@/lib/client-billing-data";
import { getInvoiceStatus } from "@/lib/demo-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReminderKind =
  | "3_days_before"
  | "on_due_date"
  | "3_days_overdue"
  | "7_days_overdue"
  | "14_days_overdue";

const SUBJECTS: Record<ReminderKind, (n: string) => string> = {
  "3_days_before": (n) => `Reminder: Invoice ${n} is due in 3 days`,
  on_due_date: (n) => `Due today: Invoice ${n}`,
  "3_days_overdue": (n) => `Friendly nudge: Invoice ${n} is now overdue`,
  "7_days_overdue": (n) => `Invoice ${n} is 7 days overdue`,
  "14_days_overdue": (n) => `Final notice: Invoice ${n}`,
};

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

function daysFrom(due: string): number {
  const d = new Date(due);
  const t = new Date();
  d.setHours(0, 0, 0, 0);
  t.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - t.getTime()) / 86400000);
}

function reminderForDelta(delta: number): ReminderKind | null {
  if (delta === 3) return "3_days_before";
  if (delta === 0) return "on_due_date";
  if (delta === -3) return "3_days_overdue";
  if (delta === -7) return "7_days_overdue";
  if (delta === -14) return "14_days_overdue";
  return null;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // TODO when Supabase lands:
  //   SELECT i.*
  //     FROM invoices i
  //     WHERE i.status in ('sent','overdue')
  //   For each row: compute delta = due_date - today
  //     match a reminder kind, skip if already sent (invoice_reminders_sent)
  //     send via Resend, then INSERT into invoice_reminders_sent.

  const todos: Array<{
    invoice_id: string;
    invoice_number: string;
    kind: ReminderKind;
    subject: string;
  }> = [];

  for (const inv of CLIENT_INVOICES) {
    const status = getInvoiceStatus(inv.id);
    if (status !== "sent" && status !== "overdue") continue;
    const delta = daysFrom(inv.due_date);
    const kind = reminderForDelta(delta);
    if (!kind) continue;
    todos.push({
      invoice_id: inv.id,
      invoice_number: inv.number,
      kind,
      subject: SUBJECTS[kind](inv.number),
    });
  }

  return NextResponse.json({
    ran_at: new Date().toISOString(),
    found: todos.length,
    sent: todos,
    note:
      "Demo run — Resend send + invoice_reminders_sent insert wire up with Supabase.",
  });
}
