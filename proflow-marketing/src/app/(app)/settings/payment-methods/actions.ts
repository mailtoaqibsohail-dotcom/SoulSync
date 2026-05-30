"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { AgencyPaymentMethods } from "@/lib/types";

export async function savePaymentMethods(
  orgId: string,
  data: AgencyPaymentMethods
) {
  const supabase = createClient();

  const payload = {
    org_id: orgId,
    wise_enabled: data.wise_enabled,
    wise_details: data.wise_details,
    bank_enabled: data.bank_enabled,
    bank_details: data.bank_details,
    payoneer_enabled: data.payoneer_enabled,
    payoneer_details: data.payoneer_details,
    default_currency: data.default_currency,
    method_order: data.method_order,
    recommended_method: data.recommended_method,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("agency_payment_methods")
    .upsert(payload, { onConflict: "org_id" });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  revalidatePath("/settings/payment-methods");
  return { ok: true as const };
}
