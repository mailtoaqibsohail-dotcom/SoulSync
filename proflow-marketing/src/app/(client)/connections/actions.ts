"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { encryptMaybe, decryptMaybe, isEncryptionConfigured } from "@/lib/crypto";
import { authorizeUrlFor, isProviderConfigured } from "@/lib/oauth/providers";

const PLATFORMS = ["instagram", "tiktok", "youtube", "facebook", "linkedin", "x"] as const;
type Platform = (typeof PLATFORMS)[number];

export type ActionResult = { ok: true } | { ok: false; error: string };

export interface SaveConnectionInput {
  clientId: string;
  platform: string;
  handle?: string;
  username?: string;
  password?: string;
  notes?: string;
}

function validPlatform(p: string): p is Platform {
  return (PLATFORMS as readonly string[]).includes(p);
}

export async function saveConnection(input: SaveConnectionInput): Promise<ActionResult> {
  if (!validPlatform(input.platform)) return { ok: false, error: "Unknown platform." };
  if (!isEncryptionConfigured()) {
    return { ok: false, error: "Credential encryption isn't configured on the server (CONNECTIONS_ENC_KEY)." };
  }
  if (!(input.username || input.password || input.handle)) {
    return { ok: false, error: "Enter at least a handle or login." };
  }

  const supabase = createClient();
  const me = await getCurrentUser();

  // Preserve an existing password/notes when the field is left blank on edit.
  const { data: existing } = await supabase
    .from("social_connections")
    .select("password_encrypted, notes_encrypted")
    .eq("client_id", input.clientId)
    .eq("platform", input.platform)
    .maybeSingle();

  const password_encrypted = input.password
    ? encryptMaybe(input.password)
    : existing?.password_encrypted ?? null;
  const notes_encrypted =
    input.notes !== undefined && input.notes !== ""
      ? encryptMaybe(input.notes)
      : existing?.notes_encrypted ?? null;

  const { error } = await supabase.from("social_connections").upsert(
    {
      client_id: input.clientId,
      platform: input.platform,
      auth_type: "vault",
      handle: input.handle?.trim() || null,
      username_encrypted: encryptMaybe(input.username),
      password_encrypted,
      notes_encrypted,
      status: "connected",
      created_by: me.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id,platform" }
  );

  if (error) {
    // RLS denial surfaces here for a user without access to this client.
    return { ok: false, error: error.message };
  }
  revalidatePath("/connections");
  revalidatePath(`/clients/${input.clientId}/connections`);
  return { ok: true };
}

export async function deleteConnection(clientId: string, platform: string): Promise<ActionResult> {
  if (!validPlatform(platform)) return { ok: false, error: "Unknown platform." };
  const supabase = createClient();
  const { error } = await supabase
    .from("social_connections")
    .delete()
    .eq("client_id", clientId)
    .eq("platform", platform);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/connections");
  revalidatePath(`/clients/${clientId}/connections`);
  return { ok: true };
}

export type RevealResult =
  | { ok: true; username: string; password: string; notes: string }
  | { ok: false; error: string };

export async function revealConnectionSecret(
  clientId: string,
  platform: string
): Promise<RevealResult> {
  if (!validPlatform(platform)) return { ok: false, error: "Unknown platform." };
  const supabase = createClient();
  const { data, error } = await supabase
    .from("social_connections")
    .select("username_encrypted, password_encrypted, notes_encrypted")
    .eq("client_id", clientId)
    .eq("platform", platform)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "No saved login for this platform." };
  try {
    return {
      ok: true,
      username: decryptMaybe(data.username_encrypted),
      password: decryptMaybe(data.password_encrypted),
      notes: decryptMaybe(data.notes_encrypted),
    };
  } catch {
    return { ok: false, error: "Could not decrypt — the encryption key may have changed." };
  }
}

export type OAuthStartResult = { ok: true; url: string } | { ok: false; error: string };

export async function startOAuth(clientId: string, platform: string): Promise<OAuthStartResult> {
  if (!validPlatform(platform)) return { ok: false, error: "Unknown platform." };
  if (!isProviderConfigured(platform)) {
    return { ok: false, error: `${platform} OAuth isn't set up yet. Register a developer app first.` };
  }
  return { ok: true, url: authorizeUrlFor(platform, clientId) };
}
