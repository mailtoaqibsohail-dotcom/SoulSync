import { NextRequest, NextResponse } from "next/server";
import { RECURRING_SCHEDULES, type Frequency } from "@/lib/recurring-data";
import { CLIENTS } from "@/lib/clients-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Vercel Cron hits this daily at 6 AM PKT (01:00 UTC) — see vercel.json.
// Public requests are rejected; we check the Vercel Cron secret.
function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // dev fallback
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

function nextDateAfter(date: Date, freq: Frequency): Date {
  const d = new Date(date);
  switch (freq) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "biweekly":
      d.setDate(d.getDate() + 14);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "quarterly":
      d.setMonth(d.getMonth() + 3);
      break;
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;
  }
  return d;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  const today = new Date().toISOString().slice(0, 10);
  const due = RECURRING_SCHEDULES.filter(
    (s) =>
      s.is_active &&
      s.next_generation_date <= today &&
      (!s.end_date || s.end_date >= today)
  );

  // TODO when Supabase lands:
  //   1. SELECT * FROM recurring_invoice_schedules WHERE is_active AND next_generation_date <= today
  //   2. For each schedule, INSERT into invoices using template_data + auto-increment invoice_number
  //   3. If auto_send: render PDF + Resend email; else status='draft'
  //   4. UPDATE schedule.next_generation_date = nextDateAfter(today, frequency)
  //   5. INSERT activity_log row

  const generated = due.map((s) => {
    const client = CLIENTS.find((c) => c.id === s.client_id);
    const nextRun = nextDateAfter(new Date(s.next_generation_date), s.frequency);
    const sample = `INV-${new Date().getFullYear()}-${Math.floor(
      1000 + Math.random() * 9000
    )}`;
    return {
      schedule_id: s.id,
      client: client?.name,
      invoice_number: sample,
      amount: s.amount,
      currency: s.currency,
      auto_sent: s.auto_send,
      next_generation_date: nextRun.toISOString().slice(0, 10),
    };
  });

  return NextResponse.json({
    ran_at: new Date().toISOString(),
    today,
    found_due: due.length,
    generated,
    note:
      "Demo run — Supabase persistence + Resend send fire once the cron is wired to a real DB.",
  });
}
