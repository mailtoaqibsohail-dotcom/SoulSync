// Minimal CSV parser sufficient for Meta Business Suite, Creator Studio,
// TikTok Insights, and LinkedIn analytics exports. Handles quoted fields
// with embedded commas, doubled quotes, and \r\n / \n line endings.

export interface ParsedCsv {
  headers: string[];
  rows: string[][];
}

export function parseCsv(text: string): ParsedCsv {
  // Strip BOM if present.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }
    if (ch === "\n") {
      row.push(cell);
      out.push(row);
      row = [];
      cell = "";
      continue;
    }
    if (ch === "\r") {
      // Allow standalone \r as a line terminator too.
      if (text[i + 1] !== "\n") {
        row.push(cell);
        out.push(row);
        row = [];
        cell = "";
      }
      continue;
    }
    cell += ch;
  }
  // flush tail
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    out.push(row);
  }
  // Drop trailing empty lines
  while (out.length && out[out.length - 1].every((c) => c.trim() === "")) {
    out.pop();
  }
  const [headers = [], ...rows] = out;
  return { headers, rows };
}

// Canonical metric fields the platform stores. Matches the
// `metrics_snapshots` table.
export type SnapshotField =
  | "date"
  | "followers"
  | "following"
  | "reach"
  | "profile_visits"
  | "website_clicks";

export const FIELD_LABEL: Record<SnapshotField, string> = {
  date: "Date",
  followers: "Followers",
  following: "Following",
  reach: "Reach (7d)",
  profile_visits: "Profile visits (7d)",
  website_clicks: "Website clicks (7d)",
};

const SYNONYMS: Record<SnapshotField, string[]> = {
  date: ["date", "day", "snapshot", "report date"],
  followers: ["followers", "fans", "total followers", "subscribers"],
  following: ["following"],
  reach: ["reach", "accounts reached", "people reached"],
  profile_visits: ["profile visits", "profile views", "page views"],
  website_clicks: ["website clicks", "external link clicks", "link clicks"],
};

const FIELDS: SnapshotField[] = [
  "date",
  "followers",
  "following",
  "reach",
  "profile_visits",
  "website_clicks",
];

export function autoMap(headers: string[]): Partial<Record<SnapshotField, number>> {
  const mapping: Partial<Record<SnapshotField, number>> = {};
  const lc = headers.map((h) => h.trim().toLowerCase());
  for (const field of FIELDS) {
    const syns = SYNONYMS[field];
    const idx = lc.findIndex((h) => syns.some((s) => h.includes(s)));
    if (idx !== -1) mapping[field] = idx;
  }
  return mapping;
}

export const SNAPSHOT_FIELDS = FIELDS;
