import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { InvoicePdf } from "@/lib/pdf/invoice-pdf";
import type { InvoiceDraft } from "@/lib/invoice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const draft = (await req.json()) as InvoiceDraft;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(InvoicePdf, { draft }) as any;
  const buffer = await renderToBuffer(element);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${draft.invoice_number || "invoice"}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
