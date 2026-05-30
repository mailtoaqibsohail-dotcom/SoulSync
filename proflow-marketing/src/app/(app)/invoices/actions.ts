"use server";

import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePdf } from "@/lib/pdf/invoice-pdf";
import { calcTotals, type InvoiceDraft } from "@/lib/invoice";
import { APP_URL, FROM, getMailer, invoiceSentEmail, sendMail } from "@/lib/email";

export async function sendInvoice(draft: InvoiceDraft) {
  if (!draft.client.billing_email) {
    return { ok: false as const, error: "Client has no billing email." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(InvoicePdf, { draft }) as any;
  const pdf = await renderToBuffer(element);

  const totals = calcTotals(draft);
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: draft.currency,
  }).format(totals.total);

  if (!getMailer()) {
    return {
      ok: true as const,
      simulated: true as const,
      message:
        "SMTP not configured — email was simulated. PDF generated successfully.",
      pdf_size: pdf.byteLength,
    };
  }

  const res = await sendMail({
    from: FROM,
    to: draft.client.billing_email,
    subject: `New invoice from ProFlow Marketing: ${draft.invoice_number}`,
    html: invoiceSentEmail({
      client: draft.client.contact || draft.client.name,
      invoice_number: draft.invoice_number,
      amount,
      due_date: new Date(draft.due_date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      portal_url: `${APP_URL}/billing`,
    }),
    attachments: [
      {
        filename: `${draft.invoice_number}.pdf`,
        content: Buffer.from(pdf),
        contentType: "application/pdf",
      },
    ],
  });

  if (!res.sent) {
    return { ok: false as const, error: res.error ?? "Could not send the invoice email." };
  }

  return { ok: true as const, simulated: false as const };
}
