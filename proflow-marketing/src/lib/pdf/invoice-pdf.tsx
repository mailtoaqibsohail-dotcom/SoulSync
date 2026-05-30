import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import {
  type InvoiceDraft,
  calcTotals,
  lineItemTotal,
} from "@/lib/invoice";
import type { PaymentMethodKey } from "@/lib/types";

const BRAND = "#6366F1";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    color: "#0f172a",
    fontFamily: "Helvetica",
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between" },
  agencyName: { fontSize: 14, fontWeight: 700 },
  agencyMeta: { fontSize: 9, color: "#475569", marginTop: 2 },
  invoiceWord: { fontSize: 26, fontWeight: 700, color: BRAND, textAlign: "right" },
  invMeta: { fontSize: 9, color: "#475569", textAlign: "right", marginTop: 2 },
  section: { marginTop: 24 },
  label: { fontSize: 8, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 },
  billTo: { fontSize: 11, fontWeight: 700, marginTop: 4 },
  meta: { fontSize: 9, color: "#475569", marginTop: 2 },
  table: { marginTop: 8, borderTop: "1pt solid #e2e8f0" },
  tr: { flexDirection: "row", borderBottom: "1pt solid #e2e8f0", paddingVertical: 6 },
  th: { fontSize: 9, color: "#64748b", fontWeight: 700, paddingHorizontal: 4 },
  td: { fontSize: 10, paddingHorizontal: 4 },
  zebra: { backgroundColor: "#f8fafc" },
  totalsBox: { marginTop: 16, alignSelf: "flex-end", width: 240 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalsLabel: { color: "#475569" },
  totalDueBox: {
    backgroundColor: BRAND,
    color: "#ffffff",
    padding: 8,
    marginTop: 6,
    borderRadius: 4,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalDueLabel: { color: "#ffffff", fontWeight: 700 },
  totalDueValue: { color: "#ffffff", fontWeight: 700, fontSize: 12 },
  paymentMethodsHeading: { fontSize: 12, fontWeight: 700, marginTop: 28 },
  methodBox: {
    border: "1pt solid #e2e8f0",
    borderRadius: 4,
    padding: 10,
    marginTop: 8,
  },
  methodHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  methodTitle: { fontSize: 11, fontWeight: 700 },
  recommended: {
    fontSize: 8,
    color: "#ffffff",
    backgroundColor: BRAND,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
  },
  methodLine: { fontSize: 9, color: "#334155", marginTop: 2 },
  footer: { marginTop: 28, fontSize: 8, color: "#94a3b8" },
});

const METHOD_LABELS: Record<PaymentMethodKey, string> = {
  wise: "WISE",
  bank: "BANK TRANSFER",
  payoneer: "PAYONEER",
};

function fmtCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function fmtDate(d: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function MethodBox({
  method,
  draft,
  recommended,
}: {
  method: PaymentMethodKey;
  draft: InvoiceDraft;
  recommended: boolean;
}) {
  const pm = draft.payment_methods;
  const lines: Array<[string, string | undefined]> = [];

  if (method === "wise") {
    const d = pm.wise_details;
    lines.push(
      ["Account Holder", d.account_holder],
      ["USD Account Number", d.usd_account_number],
      ["Routing (ACH)", d.routing_ach],
      ["Wire Routing", d.routing_wire],
      ["SWIFT/BIC", d.swift],
      ["Bank", d.bank_name_address],
      ["Payment link", d.payment_link],
      ["Notes", d.instructions]
    );
  } else if (method === "bank") {
    const d = pm.bank_details;
    lines.push(
      ["Account Holder", d.account_holder],
      ["Bank", d.bank_name],
      ["Account Number", d.account_number],
      ["IBAN", d.iban],
      ["SWIFT/BIC", d.swift],
      ["Branch", d.branch_code],
      ["Bank Address", d.bank_address],
      ["Currencies", d.currencies?.join(", ")],
      ["Notes", d.instructions]
    );
  } else {
    const d = pm.payoneer_details;
    lines.push(
      ["Payoneer Email", d.email],
      ["Payment Request", d.payment_request_link],
      ["Notes", d.instructions]
    );
  }

  return (
    <View style={styles.methodBox}>
      <View style={styles.methodHeader}>
        <Text style={styles.methodTitle}>{METHOD_LABELS[method]}</Text>
        {recommended && <Text style={styles.recommended}>Recommended</Text>}
      </View>
      {lines
        .filter(([, v]) => v && String(v).trim().length > 0)
        .map(([k, v]) => (
          <Text style={styles.methodLine} key={k}>
            {k}: {v}
          </Text>
        ))}
      <Text style={styles.methodLine}>
        Reference: Please include invoice number {draft.invoice_number}
      </Text>
    </View>
  );
}

export function InvoicePdf({ draft }: { draft: InvoiceDraft }) {
  const totals = calcTotals(draft);
  const methodsToShow = draft.payment_methods.method_order.filter(
    (m) =>
      draft.enabled_payment_methods.includes(m) &&
      ((m === "wise" && draft.payment_methods.wise_enabled) ||
        (m === "bank" && draft.payment_methods.bank_enabled) ||
        (m === "payoneer" && draft.payment_methods.payoneer_enabled))
  );

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.agencyName}>{draft.agency.name}</Text>
            {draft.agency.address && (
              <Text style={styles.agencyMeta}>{draft.agency.address}</Text>
            )}
            {draft.agency.tagline && (
              <Text style={styles.agencyMeta}>{draft.agency.tagline}</Text>
            )}
          </View>
          <View>
            <Text style={styles.invoiceWord}>INVOICE</Text>
            <Text style={styles.invMeta}>#{draft.invoice_number}</Text>
            <Text style={styles.invMeta}>
              Issued {fmtDate(draft.issue_date)}
            </Text>
            <Text style={styles.invMeta}>Due {fmtDate(draft.due_date)}</Text>
          </View>
        </View>

        {/* Bill To */}
        <View style={styles.section}>
          <Text style={styles.label}>Bill To</Text>
          <Text style={styles.billTo}>
            {draft.client.company || draft.client.name}
          </Text>
          {draft.client.contact && (
            <Text style={styles.meta}>{draft.client.contact}</Text>
          )}
          {draft.client.billing_email && (
            <Text style={styles.meta}>{draft.client.billing_email}</Text>
          )}
          {draft.reference_number && (
            <Text style={styles.meta}>Ref: {draft.reference_number}</Text>
          )}
        </View>

        {/* Line items */}
        <View style={styles.section}>
          <View style={[styles.tr, { borderBottomWidth: 1 }]}>
            <Text style={[styles.th, { flex: 4 }]}>Description</Text>
            <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Qty</Text>
            <Text style={[styles.th, { flex: 1.5, textAlign: "right" }]}>
              Unit price
            </Text>
            <Text style={[styles.th, { flex: 1.5, textAlign: "right" }]}>
              Total
            </Text>
          </View>
          {draft.line_items.map((li, i) => (
            <View
              key={i}
              style={[styles.tr, i % 2 === 1 ? styles.zebra : {}]}
            >
              <Text style={[styles.td, { flex: 4 }]}>{li.description}</Text>
              <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>
                {li.quantity}
              </Text>
              <Text style={[styles.td, { flex: 1.5, textAlign: "right" }]}>
                {fmtCurrency(li.unit_price, draft.currency)}
              </Text>
              <Text style={[styles.td, { flex: 1.5, textAlign: "right" }]}>
                {fmtCurrency(lineItemTotal(li), draft.currency)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text>{fmtCurrency(totals.subtotal, draft.currency)}</Text>
          </View>
          {totals.discount > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Discount</Text>
              <Text>-{fmtCurrency(totals.discount, draft.currency)}</Text>
            </View>
          )}
          {totals.tax > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>
                Tax{draft.tax_label ? ` (${draft.tax_label})` : ""}
              </Text>
              <Text>{fmtCurrency(totals.tax, draft.currency)}</Text>
            </View>
          )}
          <View style={styles.totalDueBox}>
            <Text style={styles.totalDueLabel}>Total Due</Text>
            <Text style={styles.totalDueValue}>
              {fmtCurrency(totals.total, draft.currency)}
            </Text>
          </View>
        </View>

        {/* Payment methods */}
        <Text style={styles.paymentMethodsHeading}>Payment Methods</Text>
        {methodsToShow.map((m) => (
          <MethodBox
            key={m}
            method={m}
            draft={draft}
            recommended={draft.payment_methods.recommended_method === m}
          />
        ))}

        {/* Notes + Footer */}
        {draft.notes_to_client && (
          <View style={styles.section}>
            <Text style={styles.label}>Notes</Text>
            <Text style={styles.meta}>{draft.notes_to_client}</Text>
          </View>
        )}

        <Text style={styles.footer}>
          Once payment is sent, please upload payment proof in your client
          portal. Thank you for your business.
        </Text>
      </Page>
    </Document>
  );
}
