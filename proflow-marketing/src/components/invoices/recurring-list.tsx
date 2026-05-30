"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MoreHorizontal } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { NewScheduleButton } from "./new-schedule-button";
import {
  describeSchedule,
  type RecurringSchedule,
} from "@/lib/recurring-data";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ClientRef {
  id: string;
  name: string;
  brand_color: string;
  initials: string;
  monthly_fee: number;
}

interface Props {
  schedules: RecurringSchedule[];
  clients: ClientRef[];
}

export function RecurringList({ schedules, clients }: Props) {
  const [toast, setToast] = useState<string | null>(null);
  const clientById = Object.fromEntries(clients.map((c) => [c.id, c]));

  function fire(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/invoices">
            <ArrowLeft className="h-4 w-4" />
            Back to invoices
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Recurring Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Set up automatic invoice generation on a schedule.
          </p>
        </div>
        <NewScheduleButton clients={clients} onSaved={() => fire("Schedule saved.")} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Schedule</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Next generation</th>
                  <th className="px-4 py-3 font-medium">Auto-send</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium w-10" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {schedules.map((s) => {
                  const c = clientById[s.client_id];
                  return (
                    <tr key={s.id} className="hover:bg-muted/40">
                      <td className="px-4 py-3">
                        {c && (
                          <div className="flex items-center gap-2">
                            <span
                              className="h-7 w-7 rounded grid place-items-center text-white text-[10px] font-semibold"
                              style={{ backgroundColor: c.brand_color }}
                            >
                              {c.initials}
                            </span>
                            <span className="font-medium">{c.name}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {describeSchedule(s)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(s.amount, s.currency)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(s.next_generation_date)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                          style={{
                            backgroundColor: s.auto_send ? "#D1FAE5" : "#F1F5F9",
                            color: s.auto_send ? "#065F46" : "#475569",
                          }}
                        >
                          {s.auto_send ? "Auto-send" : "Save as draft"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                          style={{
                            backgroundColor: s.is_active ? "#DBEAFE" : "#FEF3C7",
                            color: s.is_active ? "#1E40AF" : "#92400E",
                          }}
                        >
                          {s.is_active ? "Active" : "Paused"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onSelect={() => fire("Schedule edit lands with Supabase wiring.")}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() =>
                                fire(
                                  s.is_active
                                    ? "Paused. We will skip the next run."
                                    : "Reactivated."
                                )
                              }
                            >
                              {s.is_active ? "Pause" : "Resume"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-danger"
                              onSelect={() => fire("Schedule deleted.")}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
                {schedules.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-sm text-muted-foreground"
                    >
                      No recurring schedules yet. Hit{" "}
                      <strong>+ New Recurring Schedule</strong> to set one up.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Vercel Cron runs daily at <strong>6 AM Pakistan time</strong>
        (01:00 UTC). It generates invoices whose Next generation date is
        today, then emails them if Auto-send is on; otherwise they land in
        <Link href="/invoices" className="text-accent hover:underline">
          {" "}
          Invoices
        </Link>{" "}
        as Drafts.
      </p>

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-md bg-foreground text-background px-4 py-2 text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
