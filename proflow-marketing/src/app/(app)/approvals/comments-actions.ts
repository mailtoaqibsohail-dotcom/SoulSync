"use server";

import { revalidatePath } from "next/cache";
import { addComment, deleteComment } from "@/lib/demo-store";
import { getCurrentUser } from "@/lib/auth/current-user";
import { TEAM_DIRECTORY } from "@/lib/clients-data";

const ROLE_COLOR: Record<"owner" | "team" | "client", string> = {
  owner: "#0F172A",
  team: "#6366F1",
  client: "#EC4899",
};

export type CommentResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function postComment(input: {
  content_item_id: string;
  body: string;
  attachments?: string[];
  parent_id?: string | null;
}): Promise<CommentResult> {
  const body = input.body.trim();
  if (!body) {
    return { ok: false, error: "Write something first." };
  }
  if ((input.attachments?.length ?? 0) > 3) {
    return { ok: false, error: "Max 3 attachments per comment." };
  }
  const user = await getCurrentUser();
  // Mirror the team-directory avatar color when the user exists in it.
  const directory = TEAM_DIRECTORY.find((t) => t.id === user.id);
  const initials =
    directory?.initials ??
    user.full_name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("");
  const color = directory?.color ?? ROLE_COLOR[user.role];

  const created = addComment({
    content_item_id: input.content_item_id,
    user_id: user.id,
    user_name: user.full_name,
    user_initials: initials || "U",
    user_color: color,
    user_role: user.role,
    body,
    attachments: input.attachments ?? [],
    parent_id: input.parent_id ?? null,
  });

  revalidatePath("/approvals");
  revalidatePath("/calendar");
  return { ok: true, id: created.id };
}

export async function removeComment(commentId: string): Promise<CommentResult> {
  const user = await getCurrentUser();
  const ok = deleteComment(commentId, user.id);
  if (!ok) return { ok: false, error: "Comment not found or not yours." };
  revalidatePath("/approvals");
  revalidatePath("/calendar");
  return { ok: true, id: commentId };
}

export async function getComments(contentId: string): Promise<{
  comments: import("@/lib/demo-store").CommentRecord[];
  current_user_id: string;
}> {
  const { listComments } = await import("@/lib/demo-store");
  const user = await getCurrentUser();
  return { comments: listComments(contentId), current_user_id: user.id };
}
