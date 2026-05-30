import type {
  AgencyPaymentMethods,
  Currency,
  PaymentMethodKey,
} from "./types";

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export interface InvoiceDraft {
  invoice_number: string;
  issue_date: string;
  due_date: string;
  currency: Currency;
  reference_number?: string;
  client: {
    name: string;
    company?: string;
    contact?: string;
    billing_email?: string;
  };
  agency: {
    name: string;
    address?: string;
    tagline?: string;
    logo_url?: string;
  };
  line_items: InvoiceLineItem[];
  discount_amount?: number;
  discount_type?: "fixed" | "percentage";
  tax_amount?: number;
  tax_label?: string;
  notes_to_client?: string;
  enabled_payment_methods: PaymentMethodKey[];
  payment_methods: AgencyPaymentMethods;
}

export function lineItemTotal(item: InvoiceLineItem) {
  return Number((item.quantity * item.unit_price).toFixed(2));
}

export function calcTotals(draft: InvoiceDraft) {
  const subtotal = draft.line_items.reduce((s, l) => s + lineItemTotal(l), 0);

  let discount = 0;
  if (draft.discount_amount) {
    discount =
      draft.discount_type === "percentage"
        ? subtotal * (draft.discount_amount / 100)
        : draft.discount_amount;
  }

  const taxableBase = subtotal - discount;
  const tax = draft.tax_amount
    ? taxableBase * (draft.tax_amount / 100)
    : 0;

  const total = Math.max(0, taxableBase + tax);

  return {
    subtotal: round(subtotal),
    discount: round(discount),
    tax: round(tax),
    total: round(total),
  };
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}

export const LINE_ITEM_TEMPLATES: Array<{
  label: string;
  description: string;
  quantity: number;
  unit_price: number;
}> = [
  {
    label: "Monthly retainer",
    description: "Monthly marketing retainer",
    quantity: 1,
    unit_price: 1500,
  },
  {
    label: "Reels production",
    description: "Short-form video production (per reel)",
    quantity: 4,
    unit_price: 150,
  },
  {
    label: "Strategy call",
    description: "Strategy call and report",
    quantity: 1,
    unit_price: 250,
  },
  {
    label: "Setup fee",
    description: "One-time onboarding and setup",
    quantity: 1,
    unit_price: 500,
  },
];
