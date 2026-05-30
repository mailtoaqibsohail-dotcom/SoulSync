-- Row-level security for the billing module.

-- Helper: org membership lookup --------------------------------------------

create or replace function public.current_user_role_in(p_org uuid)
returns public.org_role
language sql security definer set search_path = public as $$
  select role from public.org_members
  where org_id = p_org and user_id = auth.uid()
  limit 1
$$;

create or replace function public.current_user_client_id_in(p_org uuid)
returns uuid
language sql security definer set search_path = public as $$
  select client_id from public.org_members
  where org_id = p_org and user_id = auth.uid()
  limit 1
$$;

-- Enable RLS ---------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.clients enable row level security;
alter table public.agency_payment_methods enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.recurring_invoice_schedules enable row level security;
alter table public.invoice_reminders_sent enable row level security;

-- Organizations: members can see their own org ----------------------------

drop policy if exists org_select_members on public.organizations;
create policy org_select_members on public.organizations
  for select using (
    exists (select 1 from public.org_members m
            where m.org_id = id and m.user_id = auth.uid())
  );

-- Org members: members can see rows for their org -------------------------

drop policy if exists org_members_select on public.org_members;
create policy org_members_select on public.org_members
  for select using (
    user_id = auth.uid()
    or exists (select 1 from public.org_members me
               where me.org_id = org_members.org_id and me.user_id = auth.uid()
                 and me.role in ('owner','team'))
  );

-- Clients ------------------------------------------------------------------

drop policy if exists clients_select on public.clients;
create policy clients_select on public.clients
  for select using (
    public.current_user_role_in(org_id) in ('owner','team')
    or id = public.current_user_client_id_in(org_id)
  );

drop policy if exists clients_modify on public.clients;
create policy clients_modify on public.clients
  for all using (public.current_user_role_in(org_id) in ('owner','team'))
  with check (public.current_user_role_in(org_id) in ('owner','team'));

-- Agency payment methods: owner only --------------------------------------

drop policy if exists pm_select on public.agency_payment_methods;
create policy pm_select on public.agency_payment_methods
  for select using (public.current_user_role_in(org_id) = 'owner');

drop policy if exists pm_modify on public.agency_payment_methods;
create policy pm_modify on public.agency_payment_methods
  for all using (public.current_user_role_in(org_id) = 'owner')
  with check (public.current_user_role_in(org_id) = 'owner');

-- Invoices -----------------------------------------------------------------

drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices
  for select using (
    public.current_user_role_in(org_id) in ('owner','team')
    or client_id = public.current_user_client_id_in(org_id)
  );

drop policy if exists invoices_modify on public.invoices;
create policy invoices_modify on public.invoices
  for all using (public.current_user_role_in(org_id) in ('owner','team'))
  with check (public.current_user_role_in(org_id) in ('owner','team'));

-- Line items: piggyback on invoice access ---------------------------------

drop policy if exists li_select on public.invoice_line_items;
create policy li_select on public.invoice_line_items
  for select using (
    exists (select 1 from public.invoices i where i.id = invoice_id
            and (
              public.current_user_role_in(i.org_id) in ('owner','team')
              or i.client_id = public.current_user_client_id_in(i.org_id)
            ))
  );

drop policy if exists li_modify on public.invoice_line_items;
create policy li_modify on public.invoice_line_items
  for all using (
    exists (select 1 from public.invoices i where i.id = invoice_id
            and public.current_user_role_in(i.org_id) in ('owner','team'))
  ) with check (
    exists (select 1 from public.invoices i where i.id = invoice_id
            and public.current_user_role_in(i.org_id) in ('owner','team'))
  );

-- Payment proofs ----------------------------------------------------------

drop policy if exists proofs_select on public.payment_proofs;
create policy proofs_select on public.payment_proofs
  for select using (
    exists (select 1 from public.invoices i where i.id = invoice_id
            and (
              public.current_user_role_in(i.org_id) in ('owner','team')
              or i.client_id = public.current_user_client_id_in(i.org_id)
            ))
  );

drop policy if exists proofs_client_insert on public.payment_proofs;
create policy proofs_client_insert on public.payment_proofs
  for insert with check (
    exists (select 1 from public.invoices i where i.id = invoice_id
            and i.client_id = public.current_user_client_id_in(i.org_id))
  );

drop policy if exists proofs_agency_update on public.payment_proofs;
create policy proofs_agency_update on public.payment_proofs
  for update using (
    exists (select 1 from public.invoices i where i.id = invoice_id
            and public.current_user_role_in(i.org_id) in ('owner','team'))
  );

-- Recurring schedules -----------------------------------------------------

drop policy if exists rec_all on public.recurring_invoice_schedules;
create policy rec_all on public.recurring_invoice_schedules
  for all using (public.current_user_role_in(org_id) in ('owner','team'))
  with check (public.current_user_role_in(org_id) in ('owner','team'));

-- Reminders log -----------------------------------------------------------

drop policy if exists reminders_select on public.invoice_reminders_sent;
create policy reminders_select on public.invoice_reminders_sent
  for select using (
    exists (select 1 from public.invoices i where i.id = invoice_id
            and public.current_user_role_in(i.org_id) in ('owner','team'))
  );
