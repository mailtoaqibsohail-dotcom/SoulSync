// OAuth provider config for the "Connect" buttons. Each provider is INERT
// until its CLIENT_ID/CLIENT_SECRET env vars are set — registering the
// developer apps with each platform is a separate, manual step.
//
// Instagram + Facebook share one Meta app. The redirect URI for each platform
// must be added to the provider's allow-list:
//   {NEXT_PUBLIC_APP_URL}/connections/oauth/{platform}/callback

type ProviderKey = "meta" | "tiktok" | "google" | "linkedin" | "x";

interface Provider {
  key: ProviderKey;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string;
  clientIdEnv: string;
  clientSecretEnv: string;
}

const PROVIDERS: Record<ProviderKey, Provider> = {
  meta: {
    key: "meta",
    authorizeUrl: "https://www.facebook.com/v19.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v19.0/oauth/access_token",
    scopes: "pages_show_list,instagram_basic,pages_read_engagement,business_management",
    clientIdEnv: "META_CLIENT_ID",
    clientSecretEnv: "META_CLIENT_SECRET",
  },
  tiktok: {
    key: "tiktok",
    authorizeUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    scopes: "user.info.basic,video.list",
    clientIdEnv: "TIKTOK_CLIENT_ID",
    clientSecretEnv: "TIKTOK_CLIENT_SECRET",
  },
  google: {
    key: "google",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: "https://www.googleapis.com/auth/youtube.readonly",
    clientIdEnv: "GOOGLE_CLIENT_ID",
    clientSecretEnv: "GOOGLE_CLIENT_SECRET",
  },
  linkedin: {
    key: "linkedin",
    authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: "r_liteprofile,w_member_social",
    clientIdEnv: "LINKEDIN_CLIENT_ID",
    clientSecretEnv: "LINKEDIN_CLIENT_SECRET",
  },
  x: {
    key: "x",
    authorizeUrl: "https://twitter.com/i/oauth2/authorize",
    tokenUrl: "https://api.twitter.com/2/oauth2/token",
    scopes: "tweet.read users.read offline.access",
    clientIdEnv: "X_CLIENT_ID",
    clientSecretEnv: "X_CLIENT_SECRET",
  },
};

const PLATFORM_TO_PROVIDER: Record<string, ProviderKey> = {
  instagram: "meta",
  facebook: "meta",
  tiktok: "tiktok",
  youtube: "google",
  linkedin: "linkedin",
  x: "x",
};

export function providerFor(platform: string): Provider | null {
  const key = PLATFORM_TO_PROVIDER[platform];
  return key ? PROVIDERS[key] : null;
}

export function isProviderConfigured(platform: string): boolean {
  const p = providerFor(platform);
  if (!p) return false;
  return !!process.env[p.clientIdEnv] && !!process.env[p.clientSecretEnv];
}

function redirectUri(platform: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}/connections/oauth/${platform}/callback`;
}

/** Build the provider authorize URL. State carries the platform + client id. */
export function authorizeUrlFor(platform: string, clientId: string): string {
  const p = providerFor(platform);
  if (!p) throw new Error("Unknown platform");
  const state = Buffer.from(JSON.stringify({ platform, clientId })).toString("base64url");
  const params = new URLSearchParams({
    client_id: process.env[p.clientIdEnv] ?? "",
    redirect_uri: redirectUri(platform),
    response_type: "code",
    scope: p.scopes,
    state,
  });
  return `${p.authorizeUrl}?${params.toString()}`;
}
