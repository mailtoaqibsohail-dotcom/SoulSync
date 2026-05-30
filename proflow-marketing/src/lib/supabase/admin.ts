import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for privileged server-side work: creating auth
 * users, generating invite / password-reset links, and writing rows that RLS
 * would otherwise block. NEVER import this from client components — the
 * service-role key must stay on the server.
 *
 * Returns null when the project isn't configured yet (so callers can fall back
 * to demo behavior instead of crashing).
 */
export function createAdminClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const looksReal =
    !!url &&
    !!key &&
    /^https:\/\//.test(url) &&
    !url.includes("example.supabase.co") &&
    !url.includes("placeholder") &&
    key !== "your-service-role-key";
  if (!looksReal) return null;
  return createClient(url!, key!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
