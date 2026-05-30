# ProFlow Marketing

Multi-tenant social-media operations platform for ProFlow Marketing. One
agency owner, a team of strategists, and a roster of B2B clients all share
the same app under three different role-aware shells.

The MVP covers every section of the Build Brief (Days 1-21) plus the
Wise/Bank/Payoneer billing addendum (Days 20-24).

## Capabilities

- **Three role-aware experiences** — Owner, Team Member, and Client get
  their own sidebars, top bar, and home pages.
- **Authentication** — Supabase Auth with Sign in, Forgot password, Set
  password, and middleware-level session refresh.
- **Clients** — Grid + table list, Add Client modal (with platforms,
  per-platform quotas, brand colors, team assignments, invitation
  email), tabbed detail page (Overview / Content / Analytics / Brand /
  Team / Settings).
- **Team** — Members table, Invite Team Member modal, role badges,
  status pills, relative last-active.
- **Content Calendar** — Month and List views with platform-colored
  chips, status dots, filters by client / platform / status, New Post
  drawer with per-platform caption limits, media uploader, AI
  generation, and a content-detail drawer (Preview / Details /
  Approval / History).
- **Approvals** — Section 8 approval flow with Approve and Request
  Changes actions, plus a Slack-style comment thread (avatars, role
  badges, @mentions, attachments) inside the post drawer.
- **Asset Library** — Per-client folders, tag cloud, grid + list views,
  hover overlay actions, batch upload modal.
- **Brand Guidelines** — All nine Section 10.2 sections per client
  (About, Audience, Voice, Visual identity, Pillars, Dos and Don'ts,
  Hashtag strategy, Competitors, Key links), Edit / Download PDF /
  Share link header.
- **Analytics** — Recharts dashboard with headline cards + sparklines,
  follower-growth lines, engagement-by-platform bar, best-time heatmap,
  top-posts table. Plus a four-step CSV import wizard and a manual
  metrics-entry modal.
- **Monthly Reports** — Generated viewer + react-pdf export endpoint.
- **AI Caption Assistant** — `/ai` page + inline popover in New Post,
  Anthropic SDK wired to a brand-voice system prompt with a
  deterministic local fallback.
- **Billing module (Wise / Bank / Payoneer)** — Owner Payment Methods
  settings, Invoices list + react-pdf templates + preview endpoint,
  Send via Resend, Client `/billing` portal with outstanding cards,
  Submit Payment Proof modal, agency Confirm / Reject verification,
  recurring schedules, and Vercel Cron generators + reminder cadence.
- **Settings** — Role-aware tabs covering Profile, Agency, Payment
  Methods, Notifications, Integrations, Billing, Security, Team Access,
  and Approval Preferences.

## Stack

- **Next.js 14** App Router, TypeScript
- **Tailwind CSS** with custom design tokens
- **Supabase** for Postgres + Auth + Storage + RLS
- **Resend** for transactional email
- **@react-pdf/renderer** for invoice and monthly-report PDFs
- **Recharts** for analytics
- **@anthropic-ai/sdk** for the AI Caption Assistant
- **Vercel Cron** for recurring invoices and payment reminders

## Quick start

```bash
cp .env.local.example .env.local      # fill in Supabase + Resend + Anthropic
npm install
npm run dev                            # http://localhost:3000
```

Without any env vars, the app runs in **demo mode**: the top bar shows a
"Demo: Owner|Team|Client" pill that lets you switch personas, sample data
populates every screen, and Resend / Anthropic / Supabase calls fall back
to local stubs.

## Database

Migrations live under [`supabase/migrations`](supabase/migrations):

- `0001_init.sql` — billing tables (orgs, clients, agency_payment_methods,
  invoices, line items, payment_proofs, recurring schedules, reminders).
- `0002_rls.sql` — RLS for the billing tables.
- `0003_main_schema.sql` — Section 16 main schema (users view,
  client_platforms, team_assignments, content_items, approvals, comments,
  metrics, post_metrics, assets, brand_guidelines, activity_log,
  notifications) + enums.
- `0004_main_rls.sql` — owner / team-assignment / client-own-record RLS
  via `can_read_client` / `can_write_client` helpers.

Apply with the Supabase CLI:

```bash
supabase db push
```

Or paste each file into the dashboard SQL editor. Seed data:
[`supabase/seed.sql`](supabase/seed.sql).

## Deploying

See [DEPLOY.md](DEPLOY.md) for the full Vercel + Supabase + Resend +
Anthropic ship-it walkthrough, including the Cron schedule and `CRON_SECRET`.

## Onboarding a real client

See [ONBOARDING.md](ONBOARDING.md) for the first-client playbook.

## Changelog

Day-by-day shipping log is in [CHANGELOG.md](CHANGELOG.md).
