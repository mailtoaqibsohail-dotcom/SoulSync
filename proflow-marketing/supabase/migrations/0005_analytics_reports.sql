-- 0005_analytics_reports.sql
-- Backing tables for the Analytics and Reports features, which previously
-- rendered computed sample data with no DB backing.
--
-- Analytics reuses the existing public.metrics_snapshots table (already
-- RLS-protected via can_read_client in 0004); we only add the two metrics the
-- analytics UI needs. Reports get a new public.monthly_reports table.
--
-- Reuses helpers from 0002_rls.sql / 0004_main_rls.sql:
--   public.can_read_client(client_id)  -> owner: all, team: assigned, client: own
--   public.can_write_client(client_id) -> owner/team only

-- 1. Analytics: extend daily snapshots ------------------------------------
alter table public.metrics_snapshots
  add column if not exists engaged int,
  add column if not exists posts int;

-- 2. Monthly reports ------------------------------------------------------
create table if not exists public.monthly_reports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  month int not null check (month between 1 and 12),
  year int not null,
  generated_on date not null default current_date,
  follower_change int,
  posts int,
  engagement_rate numeric(6,2),
  what_we_did text,
  coming_next text,
  deliverables jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(client_id, year, month)
);
create index if not exists idx_monthly_reports_client on public.monthly_reports(client_id);

alter table public.monthly_reports enable row level security;

drop policy if exists mr_select on public.monthly_reports;
create policy mr_select on public.monthly_reports
  for select using (public.can_read_client(client_id));

drop policy if exists mr_write on public.monthly_reports;
create policy mr_write on public.monthly_reports
  for all using (public.can_write_client(client_id))
  with check (public.can_write_client(client_id));

-- 3. Tighten roster/invoice visibility for team members -------------------
-- The original clients_select / invoices_select (0002_rls.sql) let ANY
-- owner-or-team member read every client and invoice in the org. Product
-- intent is that a team member only sees the clients they're assigned to
-- (the "My Clients" page) and never the agency's invoices. Owners keep full
-- access; clients keep access to their own rows.

drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients
  for select using (
    public.current_user_role_in(org_id) = 'owner'
    or (public.current_user_role_in(org_id) = 'team' and public.is_assigned_to(id))
    or id = public.current_user_client_id_in(org_id)
  );

drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices
  for select using (
    public.current_user_role_in(org_id) = 'owner'
    or client_id = public.current_user_client_id_in(org_id)
  );

-- The *_modify policies are FOR ALL, which also grants SELECT and was
-- OR-ing the tightened select policies back open. Scope them to match:
-- team may only write clients they're assigned to; invoices are owner-only.
drop policy if exists clients_modify on public.clients;
create policy clients_modify on public.clients
  for all using (
    public.current_user_role_in(org_id) = 'owner'
    or (public.current_user_role_in(org_id) = 'team' and public.is_assigned_to(id))
  ) with check (
    public.current_user_role_in(org_id) = 'owner'
    or (public.current_user_role_in(org_id) = 'team' and public.is_assigned_to(id))
  );

drop policy if exists invoices_modify on public.invoices;
create policy invoices_modify on public.invoices
  for all using (public.current_user_role_in(org_id) = 'owner')
  with check (public.current_user_role_in(org_id) = 'owner');
