import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "owner" | "team" | "client";

export interface CurrentUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  role: AppRole;
  org_id: string;
  client_id?: string | null;
  /** True when we fabricated a user because Supabase isn't configured yet. */
  isDemo: boolean;
}

const DEMO_OWNER: CurrentUser = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "aqib@proflow.example",
  full_name: "Aqib Sohail",
  role: "owner",
  org_id: "00000000-0000-0000-0000-000000000010",
  client_id: null,
  isDemo: true,
};

const DEMO_TEAM: CurrentUser = {
  ...DEMO_OWNER,
  id: "00000000-0000-0000-0000-000000000002",
  email: "sarah@proflow.example",
  full_name: "Sarah Chen",
  role: "team",
};

const DEMO_CLIENT: CurrentUser = {
  ...DEMO_OWNER,
  id: "00000000-0000-0000-0000-000000000003",
  email: "jane@acmesolar.example",
  full_name: "Jane Cooper",
  role: "client",
  client_id: "00000000-0000-0000-0000-000000000101",
};

const DEMO_USERS: Record<AppRole, CurrentUser> = {
  owner: DEMO_OWNER,
  team: DEMO_TEAM,
  client: DEMO_CLIENT,
};

/**
 * Resolve the current user. Prefers a real Supabase session, but falls back
 * to a demo role so the UI can be developed without auth.
 *
 * Override the demo role with `?role=owner|team|client` (Day 4 only) or via
 * the `proflow_demo_role` cookie set by the role switcher in the top bar.
 */
export async function getCurrentUser(opts?: { roleOverride?: string }): Promise<CurrentUser> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    url &&
    key &&
    /^https:\/\//.test(url) &&
    !url.includes("example.supabase.co") &&
    !url.includes("placeholder")
  ) {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (user) {
        const { data: row } = await supabase
          .from("org_members")
          .select("org_id, role, client_id, full_name, email, avatar_url")
          .eq("user_id", user.id)
          .single();
        if (row) {
          return {
            id: user.id,
            email: row.email ?? user.email ?? "",
            full_name: row.full_name ?? user.email ?? "Member",
            avatar_url: row.avatar_url,
            role: row.role as AppRole,
            org_id: row.org_id,
            client_id: row.client_id,
            isDemo: false,
          };
        }
      }
    } catch {
      // fall through to demo
    }
  }

  const override = opts?.roleOverride;
  if (override === "team" || override === "client" || override === "owner") {
    return DEMO_USERS[override];
  }
  const cookieRole = cookies().get("proflow_demo_role")?.value;
  if (cookieRole === "team" || cookieRole === "client" || cookieRole === "owner") {
    return DEMO_USERS[cookieRole];
  }
  return DEMO_OWNER;
}

/**
 * Variant that returns null when nobody is "signed in" — i.e. no
 * Supabase session and no demo cookie. Used by the (app) and (client)
 * layouts to bounce the user to /sign-in instead of silently treating
 * them as the demo owner. `getCurrentUser` keeps its always-on
 * behavior so the rest of the codebase doesn't have to deal with null.
 */
export async function getCurrentUserOrNull(): Promise<CurrentUser | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const looksReal =
    !!url &&
    !!key &&
    /^https:\/\//.test(url) &&
    !url.includes("example.supabase.co") &&
    !url.includes("placeholder");

  if (looksReal) {
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) return await getCurrentUser();
    } catch {
      // fall through to demo-cookie check
    }
  }

  const cookieRole = cookies().get("proflow_demo_role")?.value;
  if (cookieRole === "team" || cookieRole === "client" || cookieRole === "owner") {
    return DEMO_USERS[cookieRole];
  }
  return null;
}

export function homePathForRole(role: AppRole): string {
  switch (role) {
    case "owner":
      return "/dashboard";
    case "team":
      return "/work";
    case "client":
      return "/home";
  }
}
