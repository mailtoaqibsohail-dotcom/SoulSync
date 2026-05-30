import * as React from "react";
import { cn } from "@/lib/utils";

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "proof_uploaded"
  | "paid"
  | "overdue"
  | "cancelled";

const STATUS_STYLES: Record<InvoiceStatus, { bg: string; fg: string; label: string }> = {
  draft: { bg: "#F1F5F9", fg: "#475569", label: "Draft" },
  sent: { bg: "#DBEAFE", fg: "#1E40AF", label: "Sent" },
  proof_uploaded: { bg: "#FEF3C7", fg: "#92400E", label: "Verify Payment" },
  paid: { bg: "#D1FAE5", fg: "#065F46", label: "Paid" },
  overdue: { bg: "#FEE2E2", fg: "#991B1B", label: "Overdue" },
  cancelled: { bg: "#E5E7EB", fg: "#6B7280", label: "Cancelled" },
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

export function Badge({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground",
        className
      )}
    >
      {children}
    </span>
  );
}
