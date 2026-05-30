# Changelog

All notable changes to the ProFlow Marketing platform are recorded here. We
build one section of the main spec (or addendum) per session and log what
shipped.

## Day 21, Polish + deploy guide (MVP closeout)

- README rewritten to reflect the full feature surface, the real
  stack, and the demo-mode behavior when env vars are missing.
- New `DEPLOY.md` walks through Vercel + Supabase + Resend +
  Anthropic provisioning, env-var table, migration order, cron
  verification, and the first-deploy smoke test.
- New `ONBOARDING.md` is the first-client playbook (Add Client &rarr;
  fill Brand Guidelines &rarr; upload assets &rarr; draft first
  posts &rarr; payment methods &rarr; recurring schedule &rarr;
  welcome email).
- Final `next build` passes with every route compiled.

**MVP is complete.** Days 1-21 of the main spec and Days 20-24 of
the billing-module addendum all ship in this repo.

## Day 24 (addendum), Recurring invoices + Vercel Cron

- `/invoices/recurring` page lists every active schedule with the
  spec columns: Client + brand initials, Schedule description
  ("Monthly on day 5", "Every 2 weeks", &hellip;), Amount, Next
  generation date, Auto-send pill (green when on, grey
  "Save as draft" when off), Active/Paused status, per-row
  Edit / Pause-Resume / Delete actions.
- "+ New Recurring Schedule" opens a 640px slide-out with the
  spec fields: Client, Frequency (Weekly / Bi-weekly / Monthly /
  Quarterly / Yearly), Generate on (day-of-week for
  weekly+biweekly, day-of-month otherwise), Start date, optional
  End date, Auto-send toggle, and an invoice-template section
  (amount, notes).
- Two Vercel Cron endpoints, gated by `CRON_SECRET`:
  - `GET /api/cron/generate-invoices` — finds schedules due
    today, returns the would-be generated invoices, marks the
    Supabase persistence path with a TODO.
  - `GET /api/cron/invoice-reminders` — scans sent/overdue
    invoices, maps each one's `due_date - today` to one of the
    five spec reminder kinds (3 days before / on due date / 3 /
    7 / 14 days overdue), returns the planned send list.
- `vercel.json` schedules both cron jobs at `0 1 * * *` (6 AM
  Pakistan time / 01:00 UTC) per the spec.
- `lib/recurring-data.ts` seeds three schedules (Acme Solar,
  Luvelie Beauty, Benny Co.) plus the `describeSchedule` helper
  the table uses.
- The Invoices page already links to `/invoices/recurring` via
  its "Recurring Invoices" button (added Day 20 of the addendum
  back when the list shell first landed).

## Day 20, Settings polish for all three roles

- `(app)/settings/layout.tsx` is now role-aware: header copy
  changes per role; the tab nav (`<SettingsTabs>`) renders the
  exact tab sets from Section 13.1:
  - Owner: Profile / Agency / Payment Methods / Notifications /
    Integrations / Billing / Security.
  - Team Member: Profile / Notifications / Security.
  - Client: Profile / Team Access / Approval Preferences /
    Notifications / Security.
- `/settings` (Profile, all roles): avatar with Upload photo,
  Full name + Email fields wired to `getCurrentUser`, side-by-side
  Change password card with the spec password requirements line.
- `/settings/notifications` (all roles): trigger table from
  Section 13.2 with per-row Email + In-app toggles; client role
  sees the client-scoped trigger set.
- `/settings/security` (all roles): 2FA card with toggle stub,
  Active sessions list (current device pinned), and an Owner-only
  Audit log card.
- Owner-only tabs: `/settings/agency` (name, address, tagline,
  logo, paired brand color pickers, about),
  `/settings/integrations` (four Coming Soon cards: Meta, LinkedIn,
  TikTok, YouTube), `/settings/billing` (own ProFlow plan + invoice
  history hand-off).
- Client-only tabs: `/settings/team-access` (read-only list of
  assigned ProFlow team), `/settings/approval-preferences`
  (per-post vs batch mode radio + auto-approve repeat-content
  switches).

## Day 19, AI Caption Assistant

- `/ai` page (Section 11) with the spec's title + subtitle and four
  tabs (Caption Writer live; Hook Generator / Hashtag Builder /
  Repurpose Long Content stubbed with Coming-Soon cards).
- Caption Writer brief covers every Section 11.1 field: Client,
  Platform, "What is this post about?", Tone (Friendly /
  Professional / Bold / Inspirational / Educational / Funny), Goal
  (Build awareness / Drive engagement / Educate / Sell / Build
  community), Include CTA + CTA text, Variations slider (1-5,
  default 3).
- `generateCaptions` server action builds a brand-voice system
  prompt from the client's Brand Guidelines (audience, words to use,
  words to avoid, content pillars, platform character limit) and
  calls Claude via `@anthropic-ai/sdk` with model
  `ANTHROPIC_MODEL` (defaults to claude-sonnet-4-5). When no
  `ANTHROPIC_API_KEY` is configured, a deterministic local
  fallback writes brand-aware drafts and the UI surfaces an
  amber banner explaining how to switch to live Claude.
- Output cards show the generated text, char count vs platform
  limit, and Copy / Use in New Post / Refine actions.
- Inline AI: the New Post drawer's "Generate with AI" button now
  opens a compact `<InlineAiPopover>` (Section 11.2) that calls
  the same `generateCaptions` server action and drops the chosen
  caption straight into the drawer's textarea.

## Day 18, Monthly Reports + PDF export

- `/reports` list page (Section 9.2) with the spec title + subtitle,
  one card per past report showing month, generated date, and the
  quick stats preview ("+312 followers, 14 posts, 8.2% engagement"),
  plus View / Download PDF / Share link actions per row.
- `/reports/[id]` viewer renders the spec's full report: cover
  (client logo, name, month, agency line), Executive summary auto-
  generated from snapshot data, four Headline metrics, ranked Top 5
  posts of the month, two-up "What we did this month" /
  "What is coming next month" lists, and an agency footer.
- New react-pdf template `lib/pdf/report-pdf.tsx` mirrors the same
  layout. `GET /api/reports/[id]/pdf` streams the PDF for both the
  list-page Download buttons and the viewer's header action.
- `<ReportShareButton>` copies the deep link to the report.
- Typed sample data in `lib/reports-data.ts` seeds the last 6
  monthly reports per major client and includes a helper for the
  executive-summary copy.

## Day 17, CSV import for metrics

- New 4-step wizard `<CsvImportButton>` next to "Update metrics" on
  the Analytics page. Steps: 1. Select (platform picker + drop
  zone) &rarr; 2. Match columns (auto-detected with manual override
  per snapshot field) &rarr; 3. Preview (first 5 rows mapped to
  ProFlow fields) &rarr; 4. Import (success state with "Imported N
  rows successfully." per spec copy).
- `lib/csv.ts` ships a tiny RFC-4180-ish parser that handles quoted
  fields, doubled quotes, and CRLF / LF line endings, plus an
  `autoMap` helper with column-name heuristics for Meta Business
  Suite, Creator Studio, TikTok Insights, and LinkedIn exports.
- Wizard validates that the Date column is mapped before allowing
  Import, shows active filename + row count in the footer, and
  marks the Supabase upsert path with a TODO.

## Day 16, Analytics + manual metrics entry

- `/analytics` page (Section 9.1) with the full filter row: client
  switcher, platform chips (active chip paints in the platform's
  brand color), Last 7 / 30 / 90 days range, Compare to previous
  period toggle.
- Section A: four Headline cards (Total Followers, Total Reach,
  Engagement Rate, Posts Published) — each with current value,
  vs-previous change in green/red with arrow, and an inline
  Recharts area sparkline.
- Section B: full-width "Follower growth over time" line chart with
  one line per active platform (Recharts), platform-colored series.
- Section C: two-up grid — Engagement-rate-by-platform bar chart +
  "Best time to post" 7&times;6 heatmap (day-of-week &times; hour
  bucket) with intensity-scaled cells and a star marking the top
  buckets.
- Section D: Top performing posts table sorted by engagement rate
  (Post / Platform / Date / Likes / Comments / Reach / ER%).
- Manual metrics entry modal (Section 9.3) with one tab per active
  platform, fields per spec (Date / Followers / Following / Reach 7d
  / Profile visits 7d / Website clicks 7d) and a Save Metrics
  action. Stubbed Supabase persistence path documented in the
  action.
- Recharts installed. Deterministic sample data in
  `lib/analytics-data.ts` generates 90 days of per-platform
  snapshots + top posts + heatmap intensities per client so charts
  are stable across reloads.

## Day 15, Brand Guidelines

- `<BrandGuidelines>` component covers every Section 10.2 section:
  About the brand, Target audience, Brand voice and tone (Words we
  use / Words we avoid as positive/negative chip groups), Visual
  identity (color swatches with hex + logos + fonts), Content
  pillars, Dos and Don&apos;ts (side-by-side success / danger
  bordered cards), Hashtag strategy (Branded / Niche / Broad
  columns), Competitors to watch, Key links.
- Header surfaces Edit (team-only, toggles inline edit mode on prose
  sections), Download as PDF (stubbed for the PDF pipeline), and
  Share link (copies the current URL with a copied-confirmation
  state).
- Wired at `/brand` for clients (scoped to the current user's
  `client_id`) and at `/clients/[id]/brand` as the agency-side tab.
- Typed sample guidelines for Acme Solar, Luvelie Beauty, and
  Benny Co. in `lib/brand-data.ts` so the page always feels lived-in.

## Day 14, Asset Library

- `/assets` page (Section 10.1) with the spec's left sidebar (240px)
  listing all eight folders (All Assets / Logos & Branding / Product
  Photos / Lifestyle Photos / Video Clips / Templates / Stock /
  Archived) with per-client counts, and a tag cloud sourced from the
  current client's assets that toggles a tag filter.
- Per-client switcher in the header (lets the team flip between
  Acme Solar, Luvelie Beauty, Benny Co., etc.). Sidebar counts +
  tag cloud + grid all re-derive when the client changes.
- Grid view: 4-up cards on desktop with gradient placeholder
  thumbnail in the asset's brand tone, filename, file type, size,
  tag chips. Hover overlay surfaces a "Use in Post" pill and a
  3-dot menu (Rename / Move to folder / Add tags / Download /
  Delete per spec).
- List view shows the same data as a table (Name / Folder / Type /
  Tags / Size).
- Top bar: search-by-name-or-tag (spec placeholder), sort dropdown
  (Newest / Oldest / Name A-Z / Size), grid/list toggle.
- Upload Assets modal: drop zone with the spec copy, accepts
  multiple files, per-file metadata batch form (Folder select, Tags
  input that accepts Enter-to-add chips, Description textarea),
  Save All button. Submit is a TODO marker for Supabase Storage
  upload + `assets` insert, with a toast confirming the staged
  count.
- Typed sample data in `lib/assets-data.ts` seeds 18 assets across
  3 clients so the library always looks lived-in.

## Day 13, Comment thread

- New `<CommentThread>` (Section 8.2) replaces the Day 13 placeholder
  in the Approval tab. Each comment renders Slack-style with the
  author's colored avatar (32px), name + role badge (Owner / Team /
  Client in spec-style chips) + relative timestamp, the body with
  inline `@mention` highlighting, attachment chips, and a 3-dot menu
  on the author's own comments offering Delete.
- Composer with the spec placeholder ("Add a comment..."), inline
  `@`-trigger that surfaces a mention dropdown sourced from the
  team directory, paperclip attachment picker capped at 3 files
  per spec, and a Post Comment button that stays disabled until the
  textarea has content.
- Demo store extended with `commentsByContent`, `listComments`,
  `addComment`, `deleteComment`. New server actions `postComment` /
  `removeComment` validate inputs, attribute the comment to the
  current user (including role-driven badge color), revalidate
  `/approvals` and `/calendar`, and surface inline errors.
- Approvals card's Comment button now opens the content detail
  drawer so the thread lives in one place across the calendar and
  the approvals list. Approval tab loads comments on mount via the
  `getComments` server action.

## Day 12, Approvals workflow

- `/approvals` page (Section 8.1) with role-aware header — clients
  see "Posts waiting for your approval" plus the spec sub-copy,
  team/owner see "Pending Approvals". Status tab toggle (Pending /
  Approved / Needs Changes / All), client dropdown (hidden for
  client role), sort dropdown (Oldest first / Newest first /
  Scheduled date).
- Approval card layout per spec: left ~40% renders the platform-
  accurate preview (reusing the Day 11 PreviewTab), right ~60% shows
  client name, platform color tag, post type, scheduled date+time,
  current status pill, full caption + hashtags, and the three footer
  buttons — Request Changes (outline), Comment (ghost, disabled
  until Day 13), Approve (green primary).
- Approve fires the `approvePost` server action which records the
  approval, flips the content status to `scheduled`, and shows the
  spec-mandated toast "Post approved. It will go live on
  [date/time]."
- Request Changes opens a modal with the exact spec copy
  ("What needs to change?", "Tell your team what you would like
  changed", and the example placeholder) and fires `requestChanges`,
  which flips the post to `needs_changes`.
- `lib/demo-store.ts` now tracks `contentStatus` + `approvalsByContent`
  so status changes survive the session and propagate to the calendar
  (which already reads from the demo store).

## Day 11, Content detail drawer

- 640px slide-out drawer (Section 7.3) opens on chip click in the
  Month view and row click in the List view. Header shows the
  caption summary, client name, platform with color dot, current
  status pill, and a 3-dot actions menu (Duplicate / Move /
  Mark as published / Delete with a confirmation dialog).
- Tabs: Preview, Details, Approval, History.
- Preview tab renders a platform-accurate mockup: IG square + TikTok
  vertical reel frames with profile row, gradient media block, like
  / comment / share / save icons and caption; LinkedIn/Facebook feed
  card with Sponsored line, body copy, 16:9 media, Like/Comment/Share
  footer; X tweet card; YouTube 16:9 thumbnail with title and
  channel.
- Details tab shows the full record (Client, Platform, Post type,
  Scheduled date+time, Assigned to, Caption, Hashtags) in
  read-only rows with a hand-off note that editing arrives with the
  Supabase wiring.
- Approval tab surfaces the status pill in spec colors, Approve /
  Request Changes buttons when the post is pending or in
  needs_changes, and a Day 13 placeholder where the comment thread
  will go.
- History tab renders a timeline with team avatars and relative
  timestamps (Created draft / Edited caption / Sent for approval).
- Hashtags field added to the `ContentItem` shape so the detail
  drawer renders cleanly.

## Day 10, New Post drawer

- 640px slide-out drawer (Section 7.2) with every spec field:
  Client select, Platforms multi-select (active chips paint in
  the platform's brand color), Post type filtered to types the
  selected platforms all support, Caption textarea with a live
  character counter that respects each platform's limit (IG/TikTok
  2200, X 280, etc) and surfaces which platform is gating the
  number, "Generate with AI" button stubbed for Day 19, Hashtags
  textarea with its own counter, Media uploader with the spec's
  exact helper text (JPG/PNG/MP4/MOV, max 100MB per file), per-file
  remove buttons, "Pull from Asset Library" link, First comment
  textarea, datetime-local Schedule input defaulting to the next
  hour, Assigned to select, Internal notes textarea.
- Sticky footer with the three spec actions: Save as Draft
  (secondary), Send for Approval (accent-border outline), and
  Schedule Post (primary). All three call `createPost` and map to
  the right `content_status` (draft / pending_approval / scheduled).
  Toast confirms how many posts were created (one per selected
  platform).
- `createPost` server action validates inputs (client, platforms,
  caption, media, schedule), marked as the Supabase
  persistence + Storage upload swap-in point.
- "+ New Post" on the calendar and "+ New Content" on the Owner
  dashboard both open the drawer via a shared `<NewPostButton>`.

## Day 9, Content Calendar shell

- `/calendar` page (Section 7.1): header with "Import CSV" +
  "+ New Post" buttons, filter bar with All-clients dropdown,
  platform chips (All / IG / TikTok / YouTube / Facebook / LinkedIn /
  X) — active chip paints itself in that platform's brand color,
  status chips for all six content states, Month/List view toggle.
- Month view: Monday-first grid for the current month with day cells
  showing up to 3 platform-colored chips (status dot + caption snip,
  hover tooltip with client + scheduled time + caption), "+N more"
  overflow link, today's cell highlighted with accent border.
- Date navigator: Previous / Today / Next buttons, current month
  label, live "N posts in view" count.
- List view: Date / Time / Client (with brand initials) / Platform
  (with color dot) / Caption (truncated) / Status pill / Assigned
  member avatar — sorted by scheduled time.
- `lib/content-data.ts` seeds 22 content_items spanning all six
  clients, all platforms, all statuses, computed off the current
  month so the calendar always looks alive.

## Day 8, Team page + Invite Team Member

- `/team` page (Section 6.4) with the spec's full table: avatar +
  name, email, role (Owner / Team Member), Assigned Clients clickable
  count link, Status pill (Active green / Invited blue / Suspended
  red), Last active relative timestamp ("Just now", "4 hr ago",
  "Never" for invited), and a per-row actions menu (Edit / Reassign
  clients / Suspend / Remove).
- TEAM_DIRECTORY extended with `email`, `status`, and
  `last_active_at` to match Section 16's `users` shape; `Jordan Doe`
  seeded as an `invited` member with null last-active so the badge +
  "Never" copy can be exercised.
- `lib/relative-time.ts` adds a tiny relative-time formatter shared
  by the team table (and future activity feeds).
- Invite Team Member modal with every Section 6.4 field (Full name,
  Email, Role select, Assign to clients multi-select) wired to a
  server action that fires the invitation email via Resend when
  configured. Toast confirms send (or that send was simulated when no
  RESEND_API_KEY is present).

## Day 7, Client detail tabs

- `/clients/[id]` shell with brand-colored avatar header, plan +
  industry meta, platform chips, status pill, and the spec's six
  tabs (Overview / Content / Analytics / Brand / Team / Settings).
- Overview tab: Upcoming this week list, Key facts panel (plan,
  monthly fee, posts/week, industry, platforms), recent activity
  feed, assigned team panel.
- Team tab: two-column UI listing assigned members with Remove
  buttons next to a candidate pool with Assign buttons.
- Settings tab: editable client fields (name, industry, plan, fee,
  brand color picker with hex echo, platform toggles, notes) and a
  bordered "Danger zone" card with Archive client action.
- Content / Analytics / Brand tabs link to their respective build
  days (9 / 16 / 15) via the shared placeholder component.

## Day 6, Clients list + Add Client modal

- `/clients` page (Section 6.2): header + "+ Add Client" primary
  button, filter bar (search input with icon, status dropdown
  All/Active/Paused/Archived, Grid/Table view toggle), responsive
  3-up grid of client cards, and a sortable table view.
- Each client card shows: brand-colored initials avatar, name,
  industry badge, status pill (Active green / Paused amber / Archived
  grey per spec), platform-colored chips, "N posts this week" stat,
  stacked team-member avatars (max 3 + overflow). Cards link to
  `/clients/[id]`.
- Add Client modal with every Section 6.2 field: required Client
  name, Primary contact name, Primary contact email, Industry
  (8 options per spec), Active platforms multi-select, per-platform
  monthly quota inputs (default 12), team-member multi-select with
  colored avatars, paired brand colors with native picker + hex
  field, Notes textarea. Submit calls a server action that fires the
  invitation email via Resend (when configured) and shows the
  spec-mandated toast "Client added. Invitation email sent to
  [email]."
- New typed sample data in `lib/clients-data.ts` (7 clients
  spanning all statuses + a full team directory) feeds both the list
  and the assignment selector.

## Day 5, Dashboard shells for all three roles

- Owner Dashboard (Section 6.1): time-of-day greeting
  ("Good morning|afternoon|evening, [First Name]"), "+ New Content"
  primary button, 4 stat cards (Active Clients, Posts This Week,
  Pending Approvals, Overdue Tasks) with up/down trend arrows, "Needs
  your attention" 3-up list with colored client avatars and the spec's
  three issue-type badges (Approval Overdue / Client Replied / Failed
  to Publish) plus Review buttons, "This week" mini-calendar with
  platform-colored chips, and "Recent team activity" feed.
- Team Member `/work`: greeting, 4 stat cards (Posts in progress,
  Today's to-dos, Client feedback, Approvals awaiting), today/this
  week task list with red "Today" labels and per-row Open buttons.
- Client Overview (Section 12.1): "Welcome back, [First Name]"
  greeting, account status banner (plan + next billing + amount +
  view billing link), 4 platform cards with platform-color badges
  and 30-day follower delta arrows, "This week's content" grid that
  prints "No posts scheduled" on empty days per spec, "Needs your
  attention" action cards, "Recent wins" paragraphs.
- `lib/dashboard-data.ts` holds typed sample data + the
  `timeOfDayGreeting` helper. Swap to Supabase queries once content,
  approvals, and activity tables are populated.

## Day 4, Role-based shell + sidebars + top bar

- `getCurrentUser` helper (`src/lib/auth/current-user.ts`) reads the
  Supabase session, joins it to `org_members`, and falls back to a demo
  owner / team / client persona when Supabase isn't configured. The
  demo role is overridable via a `proflow_demo_role` cookie or the
  top-bar role switcher.
- Sidebar rewritten as a role-driven component with all three variants
  matching Section 4.1-4.3 verbatim. Active state, hover, and the
  workspace footer label change with role.
- New TopBar (Section 4.4): page title resolved from the route, search
  trigger with `⌘K` kbd hint, notification bell with unread badge,
  user avatar dropdown with My Profile / Account Settings /
  Help &amp; Support / Sign Out. Demo-mode users get an inline "Demo:
  Owner|Team|Client" role-switcher pill next to the avatar.
- New `AppShell` component composes Sidebar + TopBar + main and is
  used by both the `(app)` and `(client)` layouts so all roles share
  the same chrome.
- `(client)/page.tsx` is the new root client Overview (replaces the
  old `src/app/page.tsx` redirect-to-dashboard stub).
- DropdownMenu primitive added under `components/ui` for the avatar
  and role-switcher menus.
- `middleware.ts` upgraded: signed-out users on protected routes get
  redirected to `/sign-in?next=...`; signed-in users hitting
  `/sign-in` or `/forgot-password` are bounced home. Still no-ops when
  Supabase env vars are missing so the demo keeps working.
- Placeholder pages added for every route in the three sidebars
  (`/clients`, `/team`, `/calendar`, `/approvals`, `/analytics`,
  `/assets`, `/ai`, `/activity`, `/work`, `/feedback`, `/time`,
  `/reports`, `/brand`) — each calls out the day they get built out
  for real.

## Day 3, Authentication

- New `(auth)` route group with the spec's 400px centered card layout
  on `background-alt` (`#F8FAFC`).
- `/sign-in` — Section 5.1 copy verbatim ("Welcome back" / "Sign in to
  your ProFlow account", "Forgot password?" inline link in accent
  color, "Need an account? Contact your account manager.").
- `/forgot-password` — Section 5.2 copy plus the success state ("Check
  your email" / "If an account exists for this email, we have sent a
  reset link. The link expires in 1 hour.").
- `/set-password` — Section 5.3 copy with the password requirement
  hint ("Must be at least 8 characters with one number and one
  symbol.").
- Server actions in `(auth)/actions.ts` call Supabase
  `signInWithPassword`, `resetPasswordForEmail`, and `updateUser`, and
  map Supabase errors to the three spec-mandated error strings
  (invalid credentials / account locked / network).
- `/auth/callback` exchanges the email-link `code` for a session and
  forwards to the `next` destination.
- `/sign-out` POST/GET route signs out and redirects back to
  `/sign-in`.
- `middleware.ts` keeps the Supabase session cookies refreshed across
  all non-static routes via `@supabase/ssr`. Falls back to a no-op if
  Supabase env vars are missing so the dev demo still works.

## Day 2, Supabase setup

- New migration `0003_main_schema.sql` adds the rest of the Section 16
  schema on top of the billing tables: extends `org_members` with
  `email`/`full_name`/`avatar_url`/`is_active`/`last_active_at` so it
  matches the spec's `users` shape (exposed as the `public.users` view),
  extends `clients` with `logo_url`/`industry`/`brand_primary`/
  `brand_accent`/`plan_name`/`status`, and creates `client_platforms`,
  `team_assignments`, `content_items`, `content_item_platforms`,
  `approvals`, `comments`, `metrics_snapshots`, `post_metrics`, `assets`,
  `brand_guidelines`, `activity_log`, `notifications` plus the supporting
  enums (`client_status`, `social_platform`, `content_status`,
  `post_type`, `approval_action`) and indexes.
- New migration `0004_main_rls.sql` adds the spec's row-level security
  policies via two SECURITY DEFINER helpers (`can_read_client`,
  `can_write_client`) that resolve owner / team-assigned /
  client-own-record access in one place.
- Renamed `.env.example` to `.env.local.example` to match the spec's
  Day 2 prompt.
- New `supabase/seed.sql` with one org (ProFlow Marketing), an owner
  membership row (placeholder UUID swap-in), Wise payment defaults, two
  clients (Acme Solar, Bluefield Energy) with platforms and brand
  guidelines stubs.

## Day 1, Foundation (catch-up)

- Repainted Tailwind tokens to the exact Section 3 hex values: `primary`
  (#0F172A), `accent` (#2563EB), `background-alt` (#F8FAFC), `border`
  (#E2E8F0), `muted`/`muted-foreground` (#F1F5F9/#64748B), `success`
  (#10B981), `warning` (#F59E0B), `danger` (#EF4444), `info` (#3B82F6).
- Added Section 3.1 platform colors: `platform-instagram` (#E4405F),
  `platform-tiktok` (#000000), `platform-youtube` (#FF0000),
  `platform-facebook` (#1877F2), `platform-linkedin` (#0A66C2),
  `platform-x` (#000000).
- Wired Inter from `next/font/google` via the `--font-inter` CSS variable
  and applied it as the default sans family in Tailwind.
- Removed the temporary HSL-variable shim from `globals.css` so colors come
  straight from `tailwind.config.ts`.
- Added this `CHANGELOG.md`.

## Already shipped (out-of-order, before catch-up began)

Built before we returned to Day 1 of the main spec. These sit on top of the
foundation and were guided by the billing-module addendum.

### Day 20: Payment Methods settings + Invoices list shell

- Settings layout with Agency / Payment Methods / Notifications tabs.
- Payment Methods form covering Wise (primary), Bank Transfer, Payoneer,
  display preferences (method order, recommended flag, default currency),
  sticky save bar, server action upsert.
- Invoices page shell: stat cards (Outstanding, Overdue, Paid This Month,
  Awaiting Verification), status filter tabs, search + filters, status
  badges per spec colors.
- Owner sidebar with Dashboard, Clients, Analytics, Invoices, Asset
  Library, Settings links.
- Supabase migrations: `agency_payment_methods`, `invoices`,
  `invoice_line_items`, `payment_proofs`, `recurring_invoice_schedules`,
  `invoice_reminders_sent`, plus org/client/membership scaffolding. RLS
  policies enforce owner/team vs client read/write boundaries.

### Day 21: New Invoice drawer + react-pdf

- New Invoice slide-out drawer (720px): Client, Invoice details, Line
  items + "Insert template" (Monthly retainer / Reels / Strategy call /
  Setup fee), Totals (discount fixed-or-percent, tax % + label), Payment
  methods toggles, Notes (client + internal), live total tally, sticky
  Save Draft / Preview PDF / Send Invoice footer with confirmation
  dialog.
- react-pdf invoice template: branded header with INVOICE word in
  accent color, Bill To, zebra-striped line items, totals box with
  primary-color Total Due block, per-method payment boxes with
  Recommended chip, notes, portal CTA footer.
- `POST /api/invoices/preview` endpoint streaming the PDF for the
  drawer's Preview button.

### Day 22: Resend email + client `/billing` portal

- `lib/email.ts` with a lazy Resend client that no-ops when
  `RESEND_API_KEY` is missing, plus the "new invoice" HTML template.
- `sendInvoice` server action renders the PDF, base64-attaches it,
  emails the client, returns `{ ok, simulated, id }`.
- Separate `(client)` route group with a slim portal layout (Billing /
  Messages / Deliverables top nav).
- `/billing` page: Account summary (plan, monthly fee, next invoice,
  YTD paid), Outstanding cards with "Due in N days" / overdue
  countdowns, full invoice history table.

### Day 23: Payment proof submission + agency verification

- In-memory demo store (globalThis-backed) tracking invoice status and
  proofs across both the agency and client views. Marked as the
  swap-in point for Supabase queries.
- Submit Payment Proof modal: method radios (only enabled methods),
  payment date, editable amount (pre-filled with invoice total for
  partial-payment support), transaction reference, 10MB JPG/PNG/PDF
  uploader, notes.
- `submitProof` server action flips invoice to `proof_uploaded` and
  emails the agency owner.
- Agency invoice detail page `/invoices/[id]` with amber "Payment
  proof awaiting verification" banner per spec colors, full submitted
  proof panel (file preview, all fields), Confirm Payment Received +
  Reject buttons with their confirm dialogs.
- `confirmPayment` and `rejectProof` server actions flip statuses
  and email the client (Payment received / Action needed).
- Invoices list rows now link to the detail page and read live status
  from the store.

## Outstanding

All Build Brief sections shipped. Post-MVP, the most impactful
follow-ups are direct social posting (Meta / TikTok / LinkedIn /
YouTube), white-label theming for resale, and a mobile-first PWA
of the Client portal.
- Day 6-8: Clients list + Add Client modal, Client detail tabs, Team page
- Day 9-10: Content Calendar + New Post drawer
- Day 11-15: Approvals, Comments, Asset Library, Brand Guidelines
- Day 16-19: Analytics, CSV import, Reports, AI Assistant
- Day 24 (addendum): Recurring invoices + Vercel Cron reminders
