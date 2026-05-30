import type { InvoiceStatus } from "@/components/ui/badge";

export interface ClientInvoiceRow {
  id: string;
  number: string;
  issue_date: string;
  due_date: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  proof_submitted_at?: string;
}

export const CLIENT_PROFILE = {
  client_name: "Acme Solar",
  plan_name: "Growth Package",
  monthly_fee: 1500,
  next_invoice_date: "2026-06-01",
  ytd_paid: 7500,
};

export const CLIENT_INVOICES: ClientInvoiceRow[] = [
  {
    id: "INV-2026-0042",
    number: "INV-2026-0042",
    issue_date: "2026-05-20",
    due_date: "2026-06-03",
    amount: 1500,
    currency: "USD",
    status: "sent",
  },
  {
    id: "INV-2026-0036",
    number: "INV-2026-0036",
    issue_date: "2026-05-15",
    due_date: "2026-05-22",
    amount: 1500,
    currency: "USD",
    status: "overdue",
  },
  {
    id: "INV-2026-0030",
    number: "INV-2026-0030",
    issue_date: "2026-04-01",
    due_date: "2026-04-08",
    amount: 1500,
    currency: "USD",
    status: "paid",
  },
  {
    id: "INV-2026-0022",
    number: "INV-2026-0022",
    issue_date: "2026-03-01",
    due_date: "2026-03-08",
    amount: 1500,
    currency: "USD",
    status: "paid",
  },
  {
    id: "INV-2026-0014",
    number: "INV-2026-0014",
    issue_date: "2026-02-01",
    due_date: "2026-02-08",
    amount: 1500,
    currency: "USD",
    status: "paid",
  },
];
