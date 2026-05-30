import { NextResponse } from "next/server";

function looksLikeRealSupabase(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return (
    !!url &&
    !!key &&
    /^https:\/\//.test(url) &&
    !url.includes("example.supabase.co") &&
    !url.includes("placeholder")
  );
}

function publicBase(req: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  // Fall back to forwarded headers Apache/Nginx send when proxying.
  const fwdHost = req.headers.get("x-forwarded-host");
  const fwdProto = req.headers.get("x-forwarded-proto") ?? "https";
  if (fwdHost) return `${fwdProto}://${fwdHost}`;

  return new URL(req.url).origin;
}

async function buildResponse(req: Request) {
  if (looksLikeRealSupabase()) {
    try {
      const { createClient } = await import("@/lib/supabase/server");
      await createClient().auth.signOut();
    } catch {
      // Best effort — still clear the demo cookie below.
    }
  }
  const res = NextResponse.redirect(`${publicBase(req)}/sign-in`);
  res.cookies.set("proflow_demo_role", "", { path: "/", maxAge: 0 });
  return res;
}

export async function POST(req: Request) {
  return buildResponse(req);
}

export async function GET(req: Request) {
  return buildResponse(req);
}
