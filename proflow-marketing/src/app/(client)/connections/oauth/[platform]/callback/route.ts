import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { encryptMaybe } from "@/lib/crypto";
import { providerFor, isProviderConfigured } from "@/lib/oauth/providers";

// OAuth redirect target. Exchanges the code for tokens, encrypts them, and
// upserts the connection. Inert until the provider is configured.
export async function GET(
  req: Request,
  { params }: { params: { platform: string } }
) {
  const { platform } = params;
  const provider = providerFor(platform);
  if (!provider || !isProviderConfigured(platform)) {
    return NextResponse.json({ error: `${platform} OAuth isn't set up.` }, { status: 501 });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  if (!code || !stateRaw) {
    return NextResponse.json({ error: "Missing code/state." }, { status: 400 });
  }

  let clientId: string;
  try {
    const state = JSON.parse(Buffer.from(stateRaw, "base64url").toString("utf8"));
    clientId = state.clientId;
  } catch {
    return NextResponse.json({ error: "Invalid state." }, { status: 400 });
  }

  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const body = new URLSearchParams({
    client_id: process.env[provider.clientIdEnv] ?? "",
    client_secret: process.env[provider.clientSecretEnv] ?? "",
    code,
    grant_type: "authorization_code",
    redirect_uri: `${base}/connections/oauth/${platform}/callback`,
  });

  let token: { access_token?: string; refresh_token?: string; expires_in?: number; scope?: string };
  try {
    const resp = await fetch(provider.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body,
    });
    token = await resp.json();
    if (!resp.ok || !token.access_token) {
      return NextResponse.json({ error: "Token exchange failed." }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: "Token exchange error." }, { status: 502 });
  }

  const me = await getCurrentUser();
  const supabase = createClient();
  const expiresAt = token.expires_in
    ? new Date(Date.now() + token.expires_in * 1000).toISOString()
    : null;

  const { error } = await supabase.from("social_connections").upsert(
    {
      client_id: clientId,
      platform,
      auth_type: "oauth",
      access_token_encrypted: encryptMaybe(token.access_token),
      refresh_token_encrypted: encryptMaybe(token.refresh_token),
      oauth_expires_at: expiresAt,
      oauth_scope: token.scope ?? provider.scopes,
      status: "connected",
      created_by: me.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id,platform" }
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.redirect(new URL("/connections", base));
}
