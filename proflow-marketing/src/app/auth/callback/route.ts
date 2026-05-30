import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Supabase Auth redirects users here after email links (password reset,
// invitation, OAuth). Exchange the code for a session, then forward to
// the destination (`next` query param, default /dashboard).
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Behind a proxy, url.origin is the internal bind address; prefer the
  // configured public URL so the post-login redirect stays on the real domain.
  const base = process.env.NEXT_PUBLIC_APP_URL || url.origin;
  return NextResponse.redirect(new URL(next, base));
}
