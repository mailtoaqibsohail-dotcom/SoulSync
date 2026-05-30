# Deploying ProFlow Marketing

Target stack: **Vercel + Supabase + Resend + Anthropic**. No
infrastructure to run yourself.

## 1. Create the upstream accounts

1. **Supabase project** — pick the closest region. Save the Project URL,
   anon key, and service-role key from Settings &rarr; API.
2. **Resend account** — verify a sending domain (e.g. `proflow.example`).
   Save the API key and the verified `From` email.
3. **Anthropic console** — generate an API key. Pick a model
   (`claude-sonnet-4-5` is the default the app uses).
4. **GitHub repo** — push this codebase to a private repo so Vercel can
   pull it.

## 2. Apply the database

In the Supabase dashboard SQL editor, run the migrations in order:

1. `supabase/migrations/0001_init.sql`
2. `supabase/migrations/0002_rls.sql`
3. `supabase/migrations/0003_main_schema.sql`
4. `supabase/migrations/0004_main_rls.sql`

Then (optional but recommended):

1. Create your owner user in Authentication &rarr; Users. Note the UUID.
2. Find/replace `00000000-0000-0000-0000-000000000001` in
   `supabase/seed.sql` with that UUID.
3. Run `supabase/seed.sql` to bootstrap the org + two sample clients +
   Wise payment defaults.

## 3. Configure environment variables

Copy `.env.local.example` and set:

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Browser-safe key |
| `SUPABASE_SERVICE_ROLE_KEY` | yes (server only) | Used by admin-side server actions |
| `RESEND_API_KEY` | yes for email | Invoices, proofs, reminders, invites |
| `RESEND_FROM_EMAIL` | yes for email | `"ProFlow Marketing <billing@proflow.example>"` |
| `ANTHROPIC_API_KEY` | optional | AI Caption Assistant; without it, the local fallback runs |
| `ANTHROPIC_MODEL` | optional | Defaults to `claude-sonnet-4-5` |
| `CRON_SECRET` | yes for cron | Long random string, also configured in Vercel |
| `NEXT_PUBLIC_APP_URL` | yes | e.g. `https://app.proflow.example` |

## 4. Deploy to Vercel

1. **Import** the GitHub repo in the Vercel dashboard.
2. **Framework preset:** Next.js. Build command `next build`, output
   `.next`. Node 18+.
3. **Environment variables:** paste every entry from the table above into
   Project Settings &rarr; Environment Variables. Add `CRON_SECRET` here
   too &mdash; Vercel attaches it automatically as the `Authorization:
   Bearer …` header on cron invocations.
4. **Deploy.** First deploy may take a few minutes because of
   `@react-pdf/renderer` font hydration.
5. **Custom domain:** point your DNS to Vercel and add the domain.

## 5. Verify the cron schedule

`vercel.json` already declares two cron jobs at `0 1 * * *`
(01:00 UTC, which is 6 AM Pakistan time):

- `/api/cron/generate-invoices` &mdash; runs Day-24 recurring schedules
  that are due today.
- `/api/cron/invoice-reminders` &mdash; emails clients at 3 days
  before / on due date / 3, 7, and 14 days overdue.

After the first deploy, open Vercel &rarr; Project &rarr; Crons. You
should see both jobs listed with the next run time. To trigger one
manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://app.proflow.example/api/cron/generate-invoices
```

## 6. Smoke test

1. Sign in as your owner user.
2. **Settings &rarr; Payment Methods** &mdash; fill in your Wise details
   and save.
3. **Invoices &rarr; + New Invoice** &mdash; build an invoice, preview
   the PDF, send to a test email.
4. **Reports &rarr; pick a month &rarr; Download PDF** &mdash; confirm
   the branded report renders.
5. **AI Assistant &rarr; Caption Writer** &mdash; generate captions
   (verify the brand-voice flavor matches the client&apos;s guidelines).
6. **/api/cron/generate-invoices** &mdash; hit it with your
   `CRON_SECRET` and confirm the JSON response.

## 7. Operational notes

- Set up a Resend webhook for bounces if you want to expose them in the
  app later.
- Supabase Storage buckets used: `media` (post media), `proofs`
  (payment proofs). Create them with public-read off; signed URLs are
  generated server-side.
- `@react-pdf/renderer` is forced onto the Node runtime (see
  `runtime = "nodejs"` in the PDF routes). Keep that as-is.
