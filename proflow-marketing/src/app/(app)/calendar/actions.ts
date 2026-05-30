"use server";

import { revalidatePath } from "next/cache";
import type { ContentStatus, PostType } from "@/lib/content-data";
import type { PlatformKey } from "@/lib/clients-data";

export interface CreatePostInput {
  client_id: string;
  platforms: PlatformKey[];
  post_type: PostType;
  caption: string;
  hashtags: string;
  first_comment: string;
  media_filenames: string[]; // names only; Supabase Storage upload comes later
  scheduled_at: string; // ISO
  assigned_to: string;
  internal_notes: string;
  intent: "draft" | "approval" | "schedule";
}

export type CreatePostResult =
  | { ok: true; status: ContentStatus; created_count: number }
  | { ok: false; error: string };

const INTENT_TO_STATUS: Record<CreatePostInput["intent"], ContentStatus> = {
  draft: "draft",
  approval: "pending_approval",
  schedule: "scheduled",
};

export async function createPost(input: CreatePostInput): Promise<CreatePostResult> {
  if (!input.client_id) return { ok: false, error: "Pick a client." };
  if (input.platforms.length === 0)
    return { ok: false, error: "Select at least one platform." };
  if (!input.caption.trim())
    return { ok: false, error: "Caption is required." };
  if (input.media_filenames.length === 0)
    return { ok: false, error: "Attach at least one media file." };
  if (!input.scheduled_at)
    return { ok: false, error: "Pick a date and time." };

  const status = INTENT_TO_STATUS[input.intent];

  // TODO Day 10+: persist via Supabase + upload media to Storage
  //   const supabase = createClient();
  //   const { data: post } = await supabase.from('content_items').insert({...}).select().single();
  //   await supabase.from('content_item_platforms').insert(input.platforms.map(p => ({...})));
  //   for (const file of input.media_files) {
  //     await supabase.storage.from('media').upload(`${post.id}/${file.name}`, file);
  //   }
  // Selecting multiple platforms creates one linked post per platform.

  revalidatePath("/calendar");
  return {
    ok: true,
    status,
    created_count: input.platforms.length,
  };
}
