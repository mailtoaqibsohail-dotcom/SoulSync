import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

// Routes that do not require a signed-in user.
const PUBLIC_PATHS = [
  "/sign-in",
  "/forgot-password",
  "/set-password",
  "/auth/callback",
  "/auth/confirm",
];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return true;
  }
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return true;
  }
  return false;
}

type Role = "owner" | "team" | "client";

function homeFor(role: Role | null | undefined): string {
  return role === "client" ? "/home" : role === "team" ? "/work" : "/dashboard";
}

// Owner-only agency pages — never visible to team or client.
const OWNER_ONLY = [
  "/dashboard",
  "/team",
  "/invoices",
  "/activity",
  "/settings/payment-methods",
  "/settings/agency",
  "/settings/billing",
  "/settings/integrations",
  "/settings/team-access",
  "/settings/approval-preferences",
];
// Owner + team only (client has no access).
const OWNER_TEAM = ["/clients", "/work", "/time", "/ai", "/feedback"];
// Owner + client only (team has no agency-wide analytics).
const OWNER_CLIENT = ["/analytics"];

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** Centralized path-based RBAC. Owner sees all; others are restricted. */
function isAllowed(pathname: string, role: Role): boolean {
  if (role === "owner") return true;
  if (startsWithAny(pathname, OWNER_ONLY)) return false;
  if (startsWithAny(pathname, OWNER_TEAM)) return role === "team";
  if (startsWithAny(pathname, OWNER_CLIENT)) return role === "client";
  return true; // shared pages (calendar, approvals, assets, settings, client portal)
}

export async function middleware(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const pathname = req.nextUrl.pathname;

  // Without Supabase configured we leave demo routing untouched. The
  // (app) and (client) layouts run their own role-based redirects via
  // the demo getCurrentUser helper.
  const looksReal =
    url &&
    key &&
    /^https:\/\//.test(url) &&
    !url.includes("example.supabase.co") &&
    !url.includes("placeholder");
  if (!looksReal) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createServerClient(url, key, {
    cookies: {
      get(name: string) {
        return req.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        res.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        res.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  const user = data.user;

  // Behind a reverse proxy, Next standalone builds req.url from the internal
  // bind address (localhost:3030), so redirects would point there. Use the
  // configured public URL as the redirect base instead.
  const base = process.env.NEXT_PUBLIC_APP_URL || req.url;

  // Signed-out: allow the public landing and the auth routes; gate the rest.
  if (!user) {
    if (pathname === "/" || isPublic(pathname)) return res;
    const signInUrl = new URL("/sign-in", base);
    signInUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Resolve the signed-in user's role once (their own org_members row is
  // readable under RLS). Used for both auth-page routing and access guards.
  const { data: row } = await supabase
    .from("org_members")
    .select("role")
    .eq("user_id", user.id)
    .single();
  const role = (row?.role ?? "owner") as Role;

  // Signed-in user landing on an auth page: send them to their own home
  // (owner→/dashboard, team→/work, client→/home).
  if (pathname === "/sign-in" || pathname === "/forgot-password") {
    return NextResponse.redirect(new URL(homeFor(role), base));
  }

  // Role-based access control: bounce a user who reaches a page outside their
  // role to their own home. Prevents a client/team member from viewing
  // owner-only pages (dashboard, clients, invoices, …) via a direct URL.
  if (!isAllowed(pathname, role)) {
    return NextResponse.redirect(new URL(homeFor(role), base));
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|fonts|.*\\..*).*)",
  ],
};

export { PUBLIC_PATHS };
