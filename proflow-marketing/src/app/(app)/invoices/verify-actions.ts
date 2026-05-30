"use server";

import { revalidatePath } from "next/cache";
import { reviewProof, setInvoiceStatus } from "@/lib/demo-store";
import { APP_URL, FROM, emailShell, sendMail } from "@/lib/email";

const CLIENT_NOTIFY_EMAIL =
  process.env.CLIENT_NOTIFY_EMAIL || "billing@acmesolar.example";

export async function confirmPayment(input: {
  invoice_id: string;
  proof_id: string;
  agency_internal_notes?: string;
}) {
  reviewProof(input.proof_id, {
    status: "verified",
    agency_internal_notes: input.agency_internal_notes,
  });
  setInvoiceStatus(input.invoice_id, "paid");

  await sendMail({
    from: FROM,
    to: CLIENT_NOTIFY_EMAIL,
    subject: `Payment received: ${input.invoice_id}`,
    html: emailShell(`
      <p>Thank you — your payment for invoice
      <strong>${input.invoice_id}</strong> has been received and verified.</p>
      <p>You can view your full billing history in the portal:
      <a href="${APP_URL}/billing">${APP_URL}/billing</a></p>
      <p>— ProFlow Marketing</p>
    `),
  });

  revalidatePath(`/invoices/${input.invoice_id}`);
  revalidatePath("/invoices");
  revalidatePath("/billing");
  return { ok: true as const };
}

export async function rejectProof(input: {
  invoice_id: string;
  proof_id: string;
  rejection_reason: string;
}) {
  reviewProof(input.proof_id, {
    status: "rejected",
    rejection_reason: input.rejection_reason,
  });
  setInvoiceStatus(input.invoice_id, "sent");

  await sendMail({
    from: FROM,
    to: CLIENT_NOTIFY_EMAIL,
    subject: `Action needed: Payment proof for ${input.invoice_id}`,
    html: emailShell(`
      <p>We were not able to verify the payment proof you submitted for
      invoice <strong>${input.invoice_id}</strong>.</p>
      <p><strong>Reason:</strong> ${input.rejection_reason}</p>
      <p>You can submit new proof in the portal:
      <a href="${APP_URL}/billing">${APP_URL}/billing</a></p>
      <p>— ProFlow Marketing</p>
    `),
  });

  revalidatePath(`/invoices/${input.invoice_id}`);
  revalidatePath("/invoices");
  revalidatePath("/billing");
  return { ok: true as const };
}
