export type Currency = "USD" | "EUR" | "GBP" | "PKR" | "AED";

export type PaymentMethodKey = "wise" | "bank" | "payoneer";

export interface WiseDetails {
  account_holder?: string;
  usd_account_number?: string;
  routing_ach?: string;
  routing_wire?: string;
  swift?: string;
  bank_name_address?: string;
  payment_link?: string;
  instructions?: string;
}

export interface BankDetails {
  account_holder?: string;
  bank_name?: string;
  account_number?: string;
  iban?: string;
  swift?: string;
  bank_address?: string;
  branch_code?: string;
  currencies?: Currency[];
  instructions?: string;
}

export interface PayoneerDetails {
  email?: string;
  payment_request_link?: string;
  instructions?: string;
}

export interface AgencyPaymentMethods {
  id?: string;
  org_id?: string;
  wise_enabled: boolean;
  wise_details: WiseDetails;
  bank_enabled: boolean;
  bank_details: BankDetails;
  payoneer_enabled: boolean;
  payoneer_details: PayoneerDetails;
  default_currency: Currency;
  method_order: PaymentMethodKey[];
  recommended_method: PaymentMethodKey | null;
  updated_at?: string;
}

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "proof_uploaded"
  | "paid"
  | "overdue"
  | "cancelled";

export interface Invoice {
  id: string;
  org_id: string;
  client_id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  currency: Currency;
  subtotal: number;
  discount_amount: number;
  discount_type: "fixed" | "percentage";
  tax_amount: number;
  tax_label: string | null;
  total: number;
  status: InvoiceStatus;
  reference_number: string | null;
  notes_to_client: string | null;
  internal_notes: string | null;
  enabled_payment_methods: PaymentMethodKey[];
  recurring_schedule_id: string | null;
  pdf_url: string | null;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  client_name?: string;
}
