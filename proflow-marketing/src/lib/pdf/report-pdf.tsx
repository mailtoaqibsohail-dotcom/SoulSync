import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { MonthlyReport } from "@/lib/reports-data";
import { reportTitle, executiveSummary } from "@/lib/reports-data";

const BRAND = "#2563EB";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    color: "#0f172a",
    fontFamily: "Helvetica",
  },
  cover: {
    borderBottom: "2pt solid " + BRAND,
    paddingBottom: 18,
    marginBottom: 18,
  },
  brandLabel: {
    fontSize: 9,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  title: { fontSize: 22, fontWeight: 700, marginTop: 4 },
  meta: { fontSize: 9, color: "#475569", marginTop: 4 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginTop: 14,
    marginBottom: 6,
  },
  body: { lineHeight: 1.5 },
  statsRow: { flexDirection: "row", marginTop: 4, marginBottom: 4 },
  stat: {
    flex: 1,
    border: "1pt solid #e2e8f0",
    padding: 8,
    marginRight: 6,
  },
  statLabel: {
    fontSize: 8,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statValue: { fontSize: 14, fontWeight: 700, marginTop: 2 },
  list: { marginTop: 4 },
  listItem: { marginBottom: 3 },
  twoCol: { flexDirection: "row", marginTop: 4 },
  col: { flex: 1, marginRight: 8 },
  footer: { marginTop: 22, fontSize: 8, color: "#94a3b8", textAlign: "center" },
});

interface ReportPdfProps {
  report: MonthlyReport;
  clientName: string;
  agencyName: string;
  agencyAddress: string;
  topPosts: Array<{
    caption: string;
    platform: string;
    reach: number;
    er: number;
  }>;
}

export function ReportPdf({
  report,
  clientName,
  agencyName,
  agencyAddress,
  topPosts,
}: ReportPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.cover}>
          <Text style={styles.brandLabel}>Monthly report</Text>
          <Text style={styles.title}>
            {clientName} - {reportTitle(report)}
          </Text>
          <Text style={styles.meta}>
            Prepared by {agencyName} - {agencyAddress}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Executive summary</Text>
        <Text style={styles.body}>{executiveSummary(report)}</Text>

        <Text style={styles.sectionTitle}>Headline metrics</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Followers gained</Text>
            <Text style={styles.statValue}>
              +{report.follower_change.toLocaleString()}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statLabel}>Posts published</Text>
            <Text style={styles.statValue}>{report.posts}</Text>
          </View>
          <View style={[styles.stat, { marginRight: 0 }]}>
            <Text style={styles.statLabel}>Engagement rate</Text>
            <Text style={styles.statValue}>
              {report.engagement_rate.toFixed(1)}%
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Top 5 posts of the month</Text>
        <View style={styles.list}>
          {topPosts.map((p, i) => (
            <Text key={i} style={styles.listItem}>
              {i + 1}. {p.caption} - {p.platform} - {p.reach.toLocaleString()}{" "}
              reach - {p.er.toFixed(1)}% ER
            </Text>
          ))}
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>What we did this month</Text>
            <View style={styles.list}>
              {report.what_we_did.map((x, i) => (
                <Text key={i} style={styles.listItem}>
                  - {x}
                </Text>
              ))}
            </View>
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>What is coming next month</Text>
            <View style={styles.list}>
              {report.coming_next.map((x, i) => (
                <Text key={i} style={styles.listItem}>
                  - {x}
                </Text>
              ))}
            </View>
          </View>
        </View>

        <Text style={styles.footer}>
          {agencyName} - {agencyAddress}
        </Text>
      </Page>
    </Document>
  );
}
