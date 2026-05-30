import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Invite / password-reset links point here. We verify the one-time token
// server-side (which sets the session cookie via @supabase/ssr), then forward
// the user to `next` (usually /set-password). This is Supabase's recommended
// SSR flow — it avoids the implicit hash-token flow the cookie client can't read.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = url.searchParams.get("next") ?? "/dashboard";

  // Behind the proxy, url.origin is the internal bind address — use the public URL.
  const base = process.env.NEXT_PUBLIC_APP_URL || url.origin;

  if (token_hash && type) {
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(next, base));
    }
  }

  const signIn = new URL("/sign-in", base);
  signIn.searchParams.set("error", "This link is invalid or has expired.");
  return NextResponse.redirect(signIn);
}
