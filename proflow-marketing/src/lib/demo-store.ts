// Demo store — module singleton backed by globalThis so it survives Next.js
// dev HMR (each module re-eval keeps the same reference). This is the
// swap-in point for Supabase queries once auth lands.

import { CLIENT_INVOICES } from "./client-billing-data";
import type { InvoiceStatus } from "@/components/ui/badge";
import type { ContentStatus } from "./content-data";

export interface ProofRecord {
  id: string;
  invoice_id: string;
  payment_method: "wise" | "bank" | "payoneer";
  payment_date: string;
  amount_paid: number;
  transaction_reference: string;
  client_notes: string;
  proof_file_name: string;
  proof_file_data_url: string;
  submitted_at: string;
  status: "pending_verification" | "verified" | "rejected";
  rejection_reason?: string;
  reviewed_at?: string;
  agency_internal_notes?: string;
}

export interface ApprovalEvent {
  id: string;
  content_item_id: string;
  action: "approved" | "requested_changes";
  feedback?: string;
  by: string;
  at: string;
}

interface DemoStore {
  invoiceStatus: Map<string, InvoiceStatus>;
  proofsByInvoice: Map<string, ProofRecord[]>;
  contentStatus: Map<string, ContentStatus>;
  approvalsByContent: Map<string, ApprovalEvent[]>;
}

declare global {
  // eslint-disable-next-line no-var
  var __proflow_demo: DemoStore | undefined;
}

function init(): DemoStore {
  const s: DemoStore = {
    invoiceStatus: new Map(),
    proofsByInvoice: new Map(),
    contentStatus: new Map(),
    approvalsByContent: new Map(),
  };
  for (const inv of CLIENT_INVOICES) {
    s.invoiceStatus.set(inv.id, inv.status);
  }
  return s;
}

export const demo: DemoStore = (globalThis.__proflow_demo ??= init());

export function getInvoiceStatus(invoiceId: string): InvoiceStatus {
  return demo.invoiceStatus.get(invoiceId) ?? "sent";
}

export function setInvoiceStatus(invoiceId: string, status: InvoiceStatus) {
  demo.invoiceStatus.set(invoiceId, status);
}

export function listProofs(invoiceId: string): ProofRecord[] {
  return demo.proofsByInvoice.get(invoiceId) ?? [];
}

export function latestProof(invoiceId: string): ProofRecord | undefined {
  const arr = listProofs(invoiceId);
  return arr[arr.length - 1];
}

export function addProof(record: Omit<ProofRecord, "id" | "submitted_at" | "status">): ProofRecord {
  const full: ProofRecord = {
    ...record,
    id: crypto.randomUUID(),
    submitted_at: new Date().toISOString(),
    status: "pending_verification",
  };
  const existing = demo.proofsByInvoice.get(record.invoice_id) ?? [];
  demo.proofsByInvoice.set(record.invoice_id, [...existing, full]);
  return full;
}

export function reviewProof(
  proofId: string,
  patch: Partial<Pick<ProofRecord, "status" | "rejection_reason" | "agency_internal_notes" | "reviewed_at">>
): ProofRecord | undefined {
  for (const invId of Array.from(demo.proofsByInvoice.keys())) {
    const proofs = demo.proofsByInvoice.get(invId)!;
    const idx = proofs.findIndex((p) => p.id === proofId);
    if (idx !== -1) {
      const updated = { ...proofs[idx], ...patch, reviewed_at: new Date().toISOString() };
      const next = [...proofs];
      next[idx] = updated;
      demo.proofsByInvoice.set(invId, next);
      return updated;
    }
  }
  return undefined;
}

// Content status + approvals -------------------------------------------

export function getContentStatus(
  contentId: string,
  fallback: ContentStatus
): ContentStatus {
  return demo.contentStatus.get(contentId) ?? fallback;
}

export function setContentStatus(
  contentId: string,
  status: ContentStatus
) {
  demo.contentStatus.set(contentId, status);
}

export function listApprovals(contentId: string): ApprovalEvent[] {
  return demo.approvalsByContent.get(contentId) ?? [];
}

export function recordApproval(input: {
  content_item_id: string;
  action: "approved" | "requested_changes";
  feedback?: string;
  by: string;
}): ApprovalEvent {
  const ev: ApprovalEvent = {
    id: crypto.randomUUID(),
    content_item_id: input.content_item_id,
    action: input.action,
    feedback: input.feedback,
    by: input.by,
    at: new Date().toISOString(),
  };
  const existing = demo.approvalsByContent.get(input.content_item_id) ?? [];
  demo.approvalsByContent.set(input.content_item_id, [...existing, ev]);
  return ev;
}

// Comments ---------------------------------------------------------------

export interface CommentRecord {
  id: string;
  content_item_id: string;
  user_id: string;
  user_name: string;
  user_initials: string;
  user_color: string;
  user_role: "owner" | "team" | "client";
  body: string;
  attachments: string[];
  parent_id: string | null;
  created_at: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __proflow_comments: Map<string, CommentRecord[]> | undefined;
}

const commentStore: Map<string, CommentRecord[]> =
  (globalThis.__proflow_comments ??= new Map());

export function listComments(contentId: string): CommentRecord[] {
  return commentStore.get(contentId) ?? [];
}

export function addComment(input: Omit<CommentRecord, "id" | "created_at">): CommentRecord {
  const full: CommentRecord = {
    ...input,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  const existing = commentStore.get(input.content_item_id) ?? [];
  commentStore.set(input.content_item_id, [...existing, full]);
  return full;
}

export function deleteComment(commentId: string, byUserId: string): boolean {
  for (const key of Array.from(commentStore.keys())) {
    const arr = commentStore.get(key)!;
    const next = arr.filter((c) => !(c.id === commentId && c.user_id === byUserId));
    if (next.length !== arr.length) {
      commentStore.set(key, next);
      return true;
    }
  }
  return false;
}
