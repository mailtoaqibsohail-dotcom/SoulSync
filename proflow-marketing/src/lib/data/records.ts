import { createClient } from "@/lib/supabase/server";
import type { CurrentUser } from "@/lib/auth/current-user";
import type { ClientInvoiceRow } from "@/lib/client-billing-data";
import type { MonthlyReport } from "@/lib/reports-data";
import type { BrandGuideline } from "@/lib/brand-data";
import type { AssetRecord } from "@/lib/assets-data";
import type { InvoiceStatus } from "@/components/ui/badge";
import { colorFor } from "@/lib/data/clients";

// ---- Billing (client portal) ---------------------------------------------

export interface ClientBilling {
  profile: { plan_name: string; monthly_fee: number; next_invoice_date: string; ytd_paid: number };
  invoices: ClientInvoiceRow[];
}

export async function getClientBilling(user: CurrentUser): Promise<ClientBilling | null> {
  const supabase = createClient();
  const clientId = user.client_id;
  if (!clientId) return null;

  const [clientRes, invRes] = await Promise.all([
    supabase.from("clients").select("plan_name, monthly_fee").eq("id", clientId).single(),
    supabase
      .from("invoices")
      .select("id, invoice_number, issue_date, due_date, total, currency, status")
      .eq("client_id", clientId)
      .order("issue_date", { ascending: false }),
  ]);

  const rows = invRes.data ?? [];
  const invoices: ClientInvoiceRow[] = rows.map((r) => ({
    id: r.id,
    number: r.invoice_number,
    issue_date: r.issue_date,
    due_date: r.due_date,
    amount: Number(r.total),
    currency: r.currency ?? "USD",
    status: r.status as InvoiceStatus,
  }));

  const thisYear = new Date().getFullYear();
  const ytd_paid = rows
    .filter((r) => r.status === "paid" && new Date(r.issue_date).getFullYear() === thisYear)
    .reduce((s, r) => s + Number(r.total), 0);
  const nextUnpaid = [...rows]
    .filter((r) => r.status !== "paid" && r.status !== "cancelled")
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];

  return {
    profile: {
      plan_name: (clientRes.data?.plan_name as string | null) ?? "—",
      monthly_fee: Number(clientRes.data?.monthly_fee ?? 0),
      next_invoice_date: nextUnpaid?.due_date ?? "",
      ytd_paid,
    },
    invoices,
  };
}

// ---- Invoices (owner) -----------------------------------------------------

export interface OwnerInvoiceRow {
  id: string;
  number: string;
  client: string;
  issue_date: string;
  due_date: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
}

export async function getOwnerInvoiceRows(_user: CurrentUser): Promise<OwnerInvoiceRow[]> {
  const supabase = createClient();
  const [invRes, clientsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, client_id, issue_date, due_date, total, currency, status")
      .order("issue_date", { ascending: false }),
    supabase.from("clients").select("id, name"),
  ]);
  const nameById = new Map((clientsRes.data ?? []).map((c) => [c.id, c.name]));
  return (invRes.data ?? []).map((r) => ({
    id: r.id,
    number: r.invoice_number,
    client: nameById.get(r.client_id) ?? "Client",
    issue_date: r.issue_date,
    due_date: r.due_date,
    amount: Number(r.total),
    currency: r.currency ?? "USD",
    status: r.status as InvoiceStatus,
  }));
}

// ---- Reports --------------------------------------------------------------

function splitText(t: string | null): string[] {
  if (!t) return [];
  return t.split(/(?<=\.)\s+/).map((s) => s.trim()).filter(Boolean);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toReport(r: any): MonthlyReport {
  return {
    id: r.id,
    client_id: r.client_id,
    month: (r.month ?? 1) - 1, // DB is 1-12; interface is 0-11
    year: r.year,
    generated_on: r.generated_on,
    follower_change: r.follower_change ?? 0,
    posts: r.posts ?? 0,
    engagement_rate: Number(r.engagement_rate ?? 0),
    what_we_did: splitText(r.what_we_did),
    coming_next: splitText(r.coming_next),
  };
}

export async function getClientReports(_user: CurrentUser): Promise<MonthlyReport[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("monthly_reports")
    .select("*")
    .order("year", { ascending: false })
    .order("month", { ascending: false });
  return (data ?? []).map(toReport);
}

export async function getReportById(id: string): Promise<MonthlyReport | null> {
  const supabase = createClient();
  const { data } = await supabase.from("monthly_reports").select("*").eq("id", id).single();
  return data ? toReport(data) : null;
}

// ---- Brand guidelines -----------------------------------------------------

export async function getBrandGuidelineLive(clientId: string): Promise<BrandGuideline | null> {
  const supabase = createClient();
  const { data: r } = await supabase
    .from("brand_guidelines")
    .select("*")
    .eq("client_id", clientId)
    .single();
  if (!r) return null;

  const vi = (r.visual_identity ?? {}) as Record<string, unknown>;
  const hs = (r.hashtag_sets ?? {}) as Record<string, unknown>;
  return {
    client_id: r.client_id,
    about: r.about ?? "",
    target_audience: r.target_audience ?? "",
    voice_words_use: (r.voice_tone ?? "")
      .split(/[,;]/)
      .map((s: string) => s.trim())
      .filter(Boolean),
    voice_words_avoid: [],
    visual_identity: {
      colors: Array.isArray(vi.colors) ? (vi.colors as { name: string; hex: string }[]) : [],
      logos: Array.isArray(vi.logos) ? (vi.logos as string[]) : [],
      fonts: Array.isArray(vi.fonts) ? (vi.fonts as string[]) : [],
    },
    content_pillars: r.content_pillars ?? [],
    dos: r.dos ?? [],
    donts: r.donts ?? [],
    hashtag_sets: {
      branded: Array.isArray(hs.branded) ? (hs.branded as string[]) : [],
      niche: Array.isArray(hs.niche) ? (hs.niche as string[]) : [],
      broad: Array.isArray(hs.broad) ? (hs.broad as string[]) : [],
    },
    competitors: Array.isArray(r.competitors) ? r.competitors : [],
    key_links: Array.isArray(r.key_links) ? r.key_links : [],
    updated_at: r.updated_at,
  };
}

// ---- Assets ---------------------------------------------------------------

export async function getAssets(_user: CurrentUser): Promise<AssetRecord[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("assets")
    .select("id, client_id, filename, folder, file_type, file_size, tags, description, created_at")
    .order("created_at", { ascending: false });
  return (data ?? []).map((r) => ({
    id: r.id,
    client_id: r.client_id,
    filename: r.filename,
    folder: (r.folder as AssetRecord["folder"]) ?? "Product Photos",
    file_type: (r.file_type as AssetRecord["file_type"]) ?? "image",
    size_bytes: r.file_size ?? 0,
    tags: r.tags ?? [],
    description: r.description ?? undefined,
    uploaded_at: r.created_at,
    thumb_color: colorFor(r.id),
  }));
}
