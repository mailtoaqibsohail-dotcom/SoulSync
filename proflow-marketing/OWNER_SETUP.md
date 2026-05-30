# Owner login & account creation

The owner signs in once, then creates **client** and **employee** logins from
inside the app. All invite / reset / billing email is sent from the agency
mailbox over SMTP.

## 1. Configure `.env.local`

Copy `.env.local.example` → `.env.local` and fill in:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — **required** to create accounts (server-only secret)
- SMTP block (already pre-filled with the agency mailbox):
  - `SMTP_HOST=mail.proflowenergy.org`
  - `SMTP_PORT=587`
  - `SMTP_USER=agency@proflowenergy.org`
  - `SMTP_PASS=Allah786`
  - `SMTP_FROM="ProFlow Agency <agency@proflowenergy.org>"`
- `NEXT_PUBLIC_APP_URL` — the public URL (used in email links)

Run the database migrations in `supabase/migrations/` against your Supabase
project first (Supabase SQL editor or CLI).

## 2. Create the owner login

```bash
npm run create-owner
```

This creates the organization (if missing), the owner auth user, and the
`org_members` row. Defaults:

- Email: `agency@proflowenergy.org`
- Password: `Allah786`

Override with `OWNER_EMAIL=… OWNER_PASSWORD=… npm run create-owner`.

## 3. Sign in and create accounts

- Sign in at `/sign-in` with the owner credentials.
- **Clients** page → *Add Client*: creates the client record + a portal login
  for the primary contact and emails them a set-password link.
- **Team** page → *Invite Team Member*: creates an employee (or owner) login and
  emails them a set-password link.
- **Forgot password** sends a reset link from the agency mailbox.

## How it works

- `src/lib/email.ts` — SMTP transport (nodemailer) + email templates.
- `src/lib/supabase/admin.ts` — service-role client (bypasses RLS).
- `src/lib/auth/accounts.ts` — `requireOwner()` guard + `createOrgAccount()`
  (creates the auth user, attaches `org_members`, emails the invite link).
- Account creation is owner-only and idempotent (re-inviting is safe).

If SMTP or Supabase isn't configured, the app falls back to demo behavior and
account actions return a clear error instead of crashing.
