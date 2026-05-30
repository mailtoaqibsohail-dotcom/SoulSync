"use server";

import { revalidatePath } from "next/cache";
import { addProof, setInvoiceStatus } from "@/lib/demo-store";
import { APP_URL, FROM, emailShell, sendMail } from "@/lib/email";
import type { PaymentMethodKey } from "@/lib/types";

const OWNER_NOTIFY_EMAIL =
  process.env.OWNER_NOTIFY_EMAIL || "owner@proflow.example";

interface SubmitProofInput {
  invoice_id: string;
  payment_method: PaymentMethodKey;
  payment_date: string;
  amount_paid: number;
  transaction_reference: string;
  client_notes: string;
  proof_file_name: string;
  proof_file_data_url: string;
}

export async function submitProof(input: SubmitProofInput) {
  if (!input.proof_file_data_url) {
    return { ok: false as const, error: "Missing proof file." };
  }

  const proof = addProof(input);
  setInvoiceStatus(input.invoice_id, "proof_uploaded");

  // Email notify the agency owner.
  {
    const verifyUrl = `${APP_URL}/invoices/${input.invoice_id}`;
    const amount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(input.amount_paid);

    await sendMail({
      from: FROM,
      to: OWNER_NOTIFY_EMAIL,
      subject: `Payment proof submitted for ${input.invoice_id}`,
      html: emailShell(`
        <p>A client just submitted payment proof for invoice
        <strong>${input.invoice_id}</strong>.</p>
        <p>Amount: <strong>${amount}</strong><br/>
        Payment method: <strong>${input.payment_method}</strong><br/>
        Payment date: <strong>${input.payment_date}</strong><br/>
        Transaction reference: ${input.transaction_reference || "—"}</p>
        <p><a href="${verifyUrl}">Verify the payment in ProFlow</a></p>
      `),
    });
  }

  revalidatePath("/billing");
  revalidatePath(`/invoices/${input.invoice_id}`);
  return { ok: true as const, proof_id: proof.id };
}
