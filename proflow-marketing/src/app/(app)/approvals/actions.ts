"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  recordApproval,
  setContentStatus,
} from "@/lib/demo-store";

export type ApprovalActionResult =
  | { ok: true; status: "scheduled" | "needs_changes"; scheduled_at?: string }
  | { ok: false; error: string };

export async function approvePost(input: {
  content_item_id: string;
  scheduled_at: string;
}): Promise<ApprovalActionResult> {
  const user = await getCurrentUser();
  // TODO: enforce role-based access via Supabase RLS
  recordApproval({
    content_item_id: input.content_item_id,
    action: "approved",
    by: user.id,
  });
  setContentStatus(input.content_item_id, "scheduled");
  revalidatePath("/approvals");
  revalidatePath("/calendar");
  return { ok: true, status: "scheduled", scheduled_at: input.scheduled_at };
}

export async function requestChanges(input: {
  content_item_id: string;
  feedback: string;
}): Promise<ApprovalActionResult> {
  if (!input.feedback.trim()) {
    return { ok: false, error: "Tell your team what you would like changed." };
  }
  const user = await getCurrentUser();
  recordApproval({
    content_item_id: input.content_item_id,
    action: "requested_changes",
    feedback: input.feedback,
    by: user.id,
  });
  setContentStatus(input.content_item_id, "needs_changes");
  revalidatePath("/approvals");
  revalidatePath("/calendar");
  return { ok: true, status: "needs_changes" };
}
