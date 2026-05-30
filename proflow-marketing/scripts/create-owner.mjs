/**
 * Create (or reset) the ProFlow owner account.
 *
 * Usage:
 *   node scripts/create-owner.mjs
 *
 * Reads Supabase credentials from .env.local. Creates an organization (if none
 * exists), an auth user for the owner, and the matching org_members row with
 * role 'owner'. Safe to re-run — it updates the password and membership rather
 * than failing if the account already exists.
 *
 * Override defaults with env vars:
 *   OWNER_EMAIL, OWNER_PASSWORD, OWNER_NAME, ORG_NAME
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Minimal .env.local loader (no extra dependency).
function loadEnv() {
  try {
    const raw = readFileSync(join(__dirname, "..", ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (!m) continue;
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(m[1] in process.env)) process.env[m[1]] = val;
    }
  } catch {
    // No .env.local — rely on the ambient environment.
  }
}

loadEnv();

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OWNER_EMAIL = (process.env.OWNER_EMAIL || "agency@proflowenergy.org").toLowerCase();
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || "Allah786";
const OWNER_NAME = process.env.OWNER_NAME || "ProFlow Agency";
const ORG_NAME = process.env.ORG_NAME || "ProFlow Marketing";

if (!URL || !KEY || KEY === "your-service-role-key") {
  console.error(
    "✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const admin = createClient(URL, KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function findUserByEmail(email) {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) return null;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function main() {
  // 1. Organization — reuse the first one, otherwise create it.
  let orgId = process.env.ORG_ID;
  if (!orgId) {
    const { data: orgs } = await admin
      .from("organizations")
      .select("id")
      .limit(1);
    if (orgs && orgs.length) {
      orgId = orgs[0].id;
    } else {
      const { data: org, error } = await admin
        .from("organizations")
        .insert({ name: ORG_NAME })
        .select("id")
        .single();
      if (error) throw error;
      orgId = org.id;
      console.log(`• Created organization "${ORG_NAME}" (${orgId})`);
    }
  }

  // 2. Owner auth user — create or reset password.
  let userId;
  const created = await admin.auth.admin.createUser({
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: OWNER_NAME },
  });
  if (created.error) {
    const existing = await findUserByEmail(OWNER_EMAIL);
    if (!existing) throw created.error;
    userId = existing.id;
    await admin.auth.admin.updateUser(userId, {
      password: OWNER_PASSWORD,
      email_confirm: true,
    });
    console.log(`• Reset password for existing user ${OWNER_EMAIL}`);
  } else {
    userId = created.data.user.id;
    console.log(`• Created auth user ${OWNER_EMAIL}`);
  }

  // 3. org_members row as owner.
  const { error: memberErr } = await admin.from("org_members").upsert(
    {
      org_id: orgId,
      user_id: userId,
      role: "owner",
      email: OWNER_EMAIL,
      full_name: OWNER_NAME,
      is_active: true,
    },
    { onConflict: "org_id,user_id" }
  );
  if (memberErr) throw memberErr;

  console.log("\n✓ Owner login ready");
  console.log(`  Email:    ${OWNER_EMAIL}`);
  console.log(`  Password: ${OWNER_PASSWORD}`);
  console.log("  Sign in at /sign-in, then add clients & team from the app.");
}

main().catch((e) => {
  console.error("✗ Failed:", e.message || e);
  process.exit(1);
});
