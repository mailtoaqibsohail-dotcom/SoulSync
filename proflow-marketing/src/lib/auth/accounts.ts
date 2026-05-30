import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, type AppRole, type CurrentUser } from "./current-user";
import { APP_URL, FROM, inviteEmail, sendMail } from "@/lib/email";

export type OwnerContext = {
  me: CurrentUser;
  admin: SupabaseClient;
  org_id: string;
};

/**
 * Resolve the signed-in owner together with a service-role client. Only owners
 * may create accounts. Returns a string error message when the caller isn't an
 * owner or the backend isn't configured.
 */
export async function requireOwner(): Promise<OwnerContext | { error: string }> {
  const me = await getCurrentUser();
  if (me.role !== "owner") {
    return { error: "Only an owner can create or invite accounts." };
  }
  const admin = createAdminClient();
  if (!admin) {
    return {
      error:
        "Backend not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    };
  }
  return { me, admin, org_id: me.org_id };
}

const ROLE_LABEL: Record<AppRole, string> = {
  owner: "an Owner",
  team: "a Team Member",
  client: "a Client",
};

export type CreateAccountResult =
  | { ok: true; user_id: string; email_sent: boolean; email_error?: string }
  | { ok: false; error: string };

/**
 * Create (or reuse) a Supabase auth user, attach them to the org via
 * org_members, then email a "set your password" link from the agency mailbox.
 *
 * Idempotent on email: if the auth user already exists we reuse it and just
 * (re)send the invite, so re-inviting someone is safe.
 */
export async function createOrgAccount(opts: {
  admin: SupabaseClient;
  org_id: string;
  org_name?: string;
  email: string;
  full_name: string;
  role: AppRole;
  client_id?: string | null;
}): Promise<CreateAccountResult> {
  const email = opts.email.trim().toLowerCase();

  // 1. Create the auth user (email pre-confirmed; they set a password via link).
  let userId: string | null = null;
  const created = await opts.admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: opts.full_name },
  });

  if (created.error) {
    // Already registered → look the existing user up and reuse it.
    const msg = created.error.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      const existing = await findUserByEmail(opts.admin, email);
      if (!existing) {
        return { ok: false, error: `That email is already registered but could not be loaded.` };
      }
      userId = existing;
    } else {
      return { ok: false, error: created.error.message };
    }
  } else {
    userId = created.data.user?.id ?? null;
  }

  if (!userId) return { ok: false, error: "Could not create the account." };

  // 2. Attach to the org (upsert so re-invites don't error on the unique index).
  const { error: memberErr } = await opts.admin.from("org_members").upsert(
    {
      org_id: opts.org_id,
      user_id: userId,
      role: opts.role,
      client_id: opts.client_id ?? null,
      email,
      full_name: opts.full_name,
      is_active: true,
    },
    { onConflict: "org_id,user_id" }
  );
  if (memberErr) return { ok: false, error: memberErr.message };

  // 3. Generate a set-password (recovery) link and email it.
  const { data: linkData, error: linkErr } = await opts.admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${APP_URL}/set-password` },
  });

  let emailSent = false;
  let emailError: string | undefined;
  if (linkErr || !linkData?.properties?.hashed_token) {
    emailError = linkErr?.message ?? "Could not generate a sign-in link.";
  } else {
    // Verify the token on our own server route (sets the session cookie),
    // then land on /set-password.
    const action_link = `${APP_URL}/auth/confirm?token_hash=${linkData.properties.hashed_token}&type=recovery&next=${encodeURIComponent("/set-password")}`;
    const res = await sendMail({
      from: FROM,
      to: email,
      subject: "You've been invited to ProFlow",
      html: inviteEmail({
        full_name: opts.full_name,
        roleLabel: ROLE_LABEL[opts.role],
        action_link,
        org_name: opts.org_name,
      }),
    });
    emailSent = res.sent;
    emailError = res.error;
  }

  return { ok: true, user_id: userId, email_sent: emailSent, email_error: emailError };
}

/** Find an auth user id by email, paging through the admin list. */
async function findUserByEmail(
  admin: SupabaseClient,
  email: string
): Promise<string | null> {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) return null;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}
