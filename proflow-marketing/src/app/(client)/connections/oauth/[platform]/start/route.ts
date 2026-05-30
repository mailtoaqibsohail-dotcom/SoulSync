import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { authorizeUrlFor, isProviderConfigured } from "@/lib/oauth/providers";

// Kicks off an OAuth connect. Returns 501 until the platform's developer app
// is registered and its CLIENT_ID/CLIENT_SECRET env vars are set.
export async function GET(
  _req: Request,
  { params }: { params: { platform: string } }
) {
  const { platform } = params;
  if (!isProviderConfigured(platform)) {
    return NextResponse.json(
      { error: `${platform} OAuth isn't set up yet. Register a developer app and set its CLIENT_ID/CLIENT_SECRET.` },
      { status: 501 }
    );
  }
  const me = await getCurrentUser();
  if (!me.client_id) {
    return NextResponse.json({ error: "No client context for this user." }, { status: 400 });
  }
  return NextResponse.redirect(authorizeUrlFor(platform, me.client_id));
}
