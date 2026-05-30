"use server";

import { revalidatePath } from "next/cache";
import { createOrgAccount, requireOwner } from "@/lib/auth/accounts";

export interface InviteTeamInput {
  full_name: string;
  email: string;
  role: "owner" | "team";
  client_ids: string[];
}

export type InviteTeamResult =
  | { ok: true; email_sent: boolean; email_error?: string }
  | { ok: false; error: string };

export async function inviteTeamMember(
  input: InviteTeamInput
): Promise<InviteTeamResult> {
  if (!input.full_name.trim()) {
    return { ok: false, error: "Full name is required." };
  }
  if (!/^\S+@\S+\.\S+$/.test(input.email)) {
    return { ok: false, error: "Please provide a valid email address." };
  }
  if (input.role !== "owner" && input.role !== "team") {
    return { ok: false, error: "Pick a role." };
  }

  const ctx = await requireOwner();
  if ("error" in ctx) return { ok: false, error: ctx.error };

  const account = await createOrgAccount({
    admin: ctx.admin,
    org_id: ctx.org_id,
    email: input.email,
    full_name: input.full_name,
    role: input.role,
  });
  if (!account.ok) return { ok: false, error: account.error };

  // Assign the teammate to the selected clients.
  if (input.role === "team" && input.client_ids.length > 0) {
    await ctx.admin.from("team_assignments").upsert(
      input.client_ids.map((client_id) => ({
        user_id: account.user_id,
        client_id,
      })),
      { onConflict: "user_id,client_id" }
    );
  }

  revalidatePath("/team");
  return { ok: true, email_sent: account.email_sent, email_error: account.email_error };
}
