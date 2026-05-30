-- ProFlow Marketing — Billing module schema
-- Run on a fresh Supabase project. Assumes Supabase auth.users exists.

create extension if not exists "pgcrypto";

-- Orgs and membership ------------------------------------------------------

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  address text,
  tagline text,
  created_at timestamptz not null default now()
);

create type public.org_role as enum ('owner', 'team', 'client');

create table if not exists public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.org_role not null default 'team',
  client_id uuid,
  created_at timestamptz not null default now(),
  unique(org_id, user_id)
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  company_name text,
  primary_contact text,
  billing_email text,
  monthly_fee numeric(12,2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_clients_org on public.clients(org_id);

-- Agency payment methods ---------------------------------------------------

create table if not exists public.agency_payment_methods (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references public.organizations(id) on delete cascade,
  wise_enabled boolean not null default true,
  wise_details jsonb not null default '{}'::jsonb,
  bank_enabled boolean not null default false,
  bank_details jsonb not null default '{}'::jsonb,
  payoneer_enabled boolean not null default false,
  payoneer_details jsonb not null default '{}'::jsonb,
  default_currency text not null default 'USD',
  method_order text[] not null default array['wise','bank','payoneer']::text[],
  recommended_method text,
  updated_at timestamptz not null default now()
);

-- Invoices -----------------------------------------------------------------

create type public.invoice_status as enum (
  'draft','sent','proof_uploaded','paid','overdue','cancelled'
);
create type public.discount_kind as enum ('fixed','percentage');

create table if not exists public.recurring_invoice_schedules (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  frequency text not null check (frequency in ('weekly','biweekly','monthly','quarterly','yearly')),
  generation_day int,
  start_date date not null,
  end_date date,
  auto_send boolean not null default true,
  next_generation_date date not null,
  is_active boolean not null default true,
  template_data jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  invoice_number text not null,
  issue_date date not null,
  due_date date not null,
  currency text not null default 'USD',
  subtotal numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  discount_type public.discount_kind not null default 'fixed',
  tax_amount numeric(12,2) not null default 0,
  tax_label text,
  total numeric(12,2) not null default 0,
  status public.invoice_status not null default 'draft',
  reference_number text,
  notes_to_client text,
  internal_notes text,
  enabled_payment_methods text[] not null default array['wise','bank','payoneer']::text[],
  recurring_schedule_id uuid references public.recurring_invoice_schedules(id) on delete set null,
  pdf_url text,
  sent_at timestamptz,
  paid_at timestamptz,
  paid_by uuid references auth.users(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, invoice_number)
);

create index if not exists idx_invoices_org_status on public.invoices(org_id, status);
create index if not exists idx_invoices_client on public.invoices(client_id);
create index if not exists idx_invoices_due on public.invoices(due_date);

create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  sort_order int not null default 0
);

create index if not exists idx_line_items_invoice on public.invoice_line_items(invoice_id);

-- Payment proofs -----------------------------------------------------------

create type public.proof_status as enum ('pending_verification','verified','rejected');

create table if not exists public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  submitted_by uuid references auth.users(id),
  payment_method text not null check (payment_method in ('wise','bank','payoneer')),
  payment_date date not null,
  amount_paid numeric(12,2) not null,
  transaction_reference text,
  proof_file_url text not null,
  client_notes text,
  status public.proof_status not null default 'pending_verification',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  rejection_reason text,
  agency_internal_notes text,
  submitted_at timestamptz not null default now()
);

create index if not exists idx_proofs_invoice on public.payment_proofs(invoice_id);

-- Reminders sent (idempotency) ---------------------------------------------

create type public.reminder_kind as enum (
  '3_days_before','on_due_date','3_days_overdue','7_days_overdue','14_days_overdue'
);

create table if not exists public.invoice_reminders_sent (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  reminder_type public.reminder_kind not null,
  sent_at timestamptz not null default now(),
  unique(invoice_id, reminder_type)
);

-- updated_at trigger -------------------------------------------------------

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_invoices_updated_at on public.invoices;
create trigger trg_invoices_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();

drop trigger if exists trg_clients_updated_at on public.clients;
create trigger trg_clients_updated_at before update on public.clients
  for each row execute function public.set_updated_at();

drop trigger if exists trg_recurring_updated_at on public.recurring_invoice_schedules;
create trigger trg_recurring_updated_at before update on public.recurring_invoice_schedules
  for each row execute function public.set_updated_at();
