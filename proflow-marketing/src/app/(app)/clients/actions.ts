"use server";

import { revalidatePath } from "next/cache";
import { createOrgAccount, requireOwner } from "@/lib/auth/accounts";
import { INDUSTRIES, type Industry, type PlatformKey } from "@/lib/clients-data";

export interface AddClientInput {
  name: string;
  primary_contact_name: string;
  primary_contact_email: string;
  industry: Industry;
  platforms: PlatformKey[];
  monthly_quotas: Record<PlatformKey, number>;
  team_ids: string[];
  brand_primary: string;
  brand_accent: string;
  notes: string;
  /** When true, create a portal login for the primary contact and email them. */
  create_login?: boolean;
}

export type AddClientResult =
  | { ok: true; email_sent: boolean; email_error?: string; client_id: string }
  | { ok: false; error: string };

export async function addClient(input: AddClientInput): Promise<AddClientResult> {
  if (!input.name.trim()) {
    return { ok: false, error: "Client name is required." };
  }
  if (!input.primary_contact_name.trim()) {
    return { ok: false, error: "Primary contact name is required." };
  }
  if (!/^\S+@\S+\.\S+$/.test(input.primary_contact_email)) {
    return { ok: false, error: "Please provide a valid contact email." };
  }
  if (!INDUSTRIES.includes(input.industry)) {
    return { ok: false, error: "Pick an industry." };
  }
  if (input.platforms.length === 0) {
    return { ok: false, error: "Select at least one active platform." };
  }

  const ctx = await requireOwner();
  if ("error" in ctx) return { ok: false, error: ctx.error };
  const { admin, org_id } = ctx;

  // 1. Create the client record.
  const { data: client, error: clientErr } = await admin
    .from("clients")
    .insert({
      org_id,
      name: input.name.trim(),
      primary_contact: input.primary_contact_name.trim(),
      billing_email: input.primary_contact_email.trim().toLowerCase(),
      industry: input.industry,
      brand_primary: input.brand_primary || null,
      brand_accent: input.brand_accent || null,
      status: "active",
      is_active: true,
    })
    .select("id")
    .single();
  if (clientErr || !client) {
    return { ok: false, error: clientErr?.message ?? "Could not create the client." };
  }

  // 2. Platforms + quotas.
  const platformRows = input.platforms.map((platform) => ({
    client_id: client.id,
    platform,
    monthly_quota: input.monthly_quotas[platform] ?? 12,
    is_active: true,
  }));
  if (platformRows.length) {
    await admin.from("client_platforms").upsert(platformRows, {
      onConflict: "client_id,platform",
    });
  }

  // 3. Assign internal team members to this client.
  if (input.team_ids.length) {
    await admin.from("team_assignments").upsert(
      input.team_ids.map((user_id) => ({ user_id, client_id: client.id })),
      { onConflict: "user_id,client_id" }
    );
  }

  // 4. Optionally create a portal login for the client contact.
  let emailSent = false;
  let emailError: string | undefined;
  if (input.create_login !== false) {
    const account = await createOrgAccount({
      admin,
      org_id,
      email: input.primary_contact_email,
      full_name: input.primary_contact_name,
      role: "client",
      client_id: client.id,
    });
    if (!account.ok) {
      // Client + setup succeeded; surface the login problem without rolling back.
      revalidatePath("/clients");
      return { ok: false, error: `Client created, but login failed: ${account.error}` };
    }
    emailSent = account.email_sent;
    emailError = account.email_error;
  }

  revalidatePath("/clients");
  return { ok: true, email_sent: emailSent, email_error: emailError, client_id: client.id };
}
