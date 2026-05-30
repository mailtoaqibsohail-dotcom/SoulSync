"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { APP_URL, FROM, resetEmail, sendMail } from "@/lib/email";
import { getCurrentUser, homePathForRole } from "@/lib/auth/current-user";

export type AuthResult = { ok: true } | { ok: false; error: string };

function mapSignInError(message: string): string {
  // Map Supabase error messages to spec-mandated copy (Section 5.1).
  const m = message.toLowerCase();
  if (m.includes("invalid") || m.includes("credentials")) {
    return "The email or password you entered is incorrect. Please try again.";
  }
  if (m.includes("rate") || m.includes("too many")) {
    return "Too many failed attempts. Please reset your password or try again in 15 minutes.";
  }
  if (m.includes("network") || m.includes("fetch")) {
    return "Could not connect. Please check your internet and try again.";
  }
  return message;
}

export async function signIn(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return {
      ok: false,
      error: "The email or password you entered is incorrect. Please try again.",
    };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, error: mapSignInError(error.message) };
  }

  // Route each role to its own home: owner→/dashboard, team→/work, client→/home.
  const me = await getCurrentUser();
  redirect(homePathForRole(me.role));
}

export async function sendResetLink(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return {
      ok: false,
      error: "Could not connect. Please check your internet and try again.",
    };
  }

  const redirectTo = `${APP_URL}/set-password`;

  // Prefer sending the reset link from the agency mailbox (SMTP). This needs
  // the service-role key to mint the link. Falls back to Supabase's built-in
  // reset email when the admin client isn't configured.
  const admin = createAdminClient();
  if (admin) {
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo },
    });
    // Only email if the account actually exists (no error + token present).
    if (!error && data?.properties?.hashed_token) {
      const action_link = `${APP_URL}/auth/confirm?token_hash=${data.properties.hashed_token}&type=recovery&next=${encodeURIComponent("/set-password")}`;
      await sendMail({
        from: FROM,
        to: email,
        subject: "Reset your ProFlow password",
        html: resetEmail({ action_link }),
      });
    }
    // Always succeed visually to avoid leaking which emails exist.
    return { ok: true };
  }

  const supabase = createClient();
  // Always succeed visually to avoid leaking which emails exist.
  await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  return { ok: true };
}

export async function setPassword(
  _prev: AuthResult | null,
  formData: FormData
): Promise<AuthResult> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8 || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return {
      ok: false,
      error: "Must be at least 8 characters with one number and one symbol.",
    };
  }
  if (password !== confirm) {
    return { ok: false, error: "Passwords do not match." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { ok: false, error: error.message };
  }
  const me = await getCurrentUser();
  redirect(homePathForRole(me.role));
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/sign-in");
}
