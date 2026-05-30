import { createClient } from "@/lib/supabase/server";
import { decryptMaybe } from "@/lib/crypto";
import type { PlatformKey } from "@/lib/clients-data";

export interface ConnectionView {
  platform: PlatformKey;
  auth_type: "vault" | "oauth";
  handle: string;
  username: string; // decrypted (low-sensitivity; the agency must see which account)
  hasPassword: boolean;
  hasNotes: boolean;
  status: string;
  updated_at: string | null;
}

/**
 * Connections for a client, RLS-scoped (client-own / owner / assigned team).
 * Passwords are NEVER returned here — only handle + username + flags. Use the
 * revealConnectionSecret server action to fetch a password on demand.
 */
export async function getConnections(clientId: string): Promise<ConnectionView[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("social_connections")
    .select(
      "platform, auth_type, handle, username_encrypted, password_encrypted, notes_encrypted, status, updated_at"
    )
    .eq("client_id", clientId);

  return (data ?? []).map((r) => ({
    platform: r.platform as PlatformKey,
    auth_type: (r.auth_type as "vault" | "oauth") ?? "vault",
    handle: r.handle ?? "",
    username: safeDecrypt(r.username_encrypted),
    hasPassword: !!r.password_encrypted,
    hasNotes: !!r.notes_encrypted,
    status: r.status ?? "connected",
    updated_at: r.updated_at ?? null,
  }));
}

// Never let a decrypt failure (e.g. rotated key) crash the page.
function safeDecrypt(blob: string | null | undefined): string {
  try {
    return decryptMaybe(blob);
  } catch {
    return "";
  }
}
