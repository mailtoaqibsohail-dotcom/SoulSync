import { PaymentMethodsForm } from "./form";
import type { AgencyPaymentMethods } from "@/lib/types";

const DEFAULTS: AgencyPaymentMethods = {
  wise_enabled: true,
  wise_details: {
    bank_name_address:
      "Wise US Inc., 30 W 26th Street, Floor 6, New York, NY 10010, USA",
  },
  bank_enabled: false,
  bank_details: { currencies: ["USD"] },
  payoneer_enabled: false,
  payoneer_details: {},
  default_currency: "USD",
  method_order: ["wise", "bank", "payoneer"],
  recommended_method: "wise",
};

export default async function PaymentMethodsPage() {
  // TODO: load the current org's row from Supabase once auth wiring lands.
  // Until then, render the form with the spec's defaults so the UI is fully
  // functional and the save action persists once env vars are set.
  const initial = DEFAULTS;
  const orgId = "00000000-0000-0000-0000-000000000000";

  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-xl font-semibold">Payment Methods</h2>
        <p className="text-sm text-muted-foreground">
          Set up how clients can pay you. These details appear on every invoice
          you send.
        </p>
      </div>
      <PaymentMethodsForm orgId={orgId} initial={initial} />
    </div>
  );
}
