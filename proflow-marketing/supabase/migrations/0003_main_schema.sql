-- Day 2: ProFlow Agency Platform main schema (Section 16 of the spec).
-- Sits on top of 0001_init.sql / 0002_rls.sql, which already created
-- organizations, org_members (Section 16's "users" table) and the billing
-- module. This migration adds everything else.

create extension if not exists "pgcrypto";

-- Extend org_members so it matches the spec's `users` shape -----------------

alter table public.org_members
  add column if not exists email text,
  add column if not exists full_name text,
  add column if not exists avatar_url text,
  add column if not exists is_active boolean not null default true,
  add column if not exists last_active_at timestamptz;

-- A friendly view named exactly `users` per Section 16. RLS lives on the
-- underlying table so the view inherits access control.
drop view if exists public.users cascade;
create view public.users as
  select
    m.user_id           as id,
    m.org_id            as org_id,
    coalesce(m.email, au.email) as email,
    m.full_name         as full_name,
    m.avatar_url        as avatar_url,
    m.role              as role,
    m.client_id         as client_id,
    m.is_active         as is_active,
    m.last_active_at    as last_active_at,
    m.created_at        as created_at
  from public.org_members m
  left join auth.users au on au.id = m.user_id;

-- Extend clients to match Section 16 --------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'client_status') then
    create type public.client_status as enum ('active','paused','archived');
  end if;
end$$;

alter table public.clients
  add column if not exists logo_url text,
  add column if not exists industry text,
  add column if not exists brand_primary text,
  add column if not exists brand_accent text,
  add column if not exists plan_name text,
  add column if not exists status public.client_status not null default 'active';

-- client_platforms --------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'social_platform') then
    create type public.social_platform as enum
      ('instagram','tiktok','youtube','facebook','linkedin','x');
  end if;
end$$;

create table if not exists public.client_platforms (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  platform public.social_platform not null,
  handle text,
  monthly_quota int not null default 12,
  is_active boolean not null default true,
  unique(client_id, platform)
);
create index if not exists idx_client_platforms_client on public.client_platforms(client_id);

-- team_assignments --------------------------------------------------------

create table if not exists public.team_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  unique(user_id, client_id)
);
create index if not exists idx_team_assignments_user on public.team_assignments(user_id);
create index if not exists idx_team_assignments_client on public.team_assignments(client_id);

-- content_items + status / post type --------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'content_status') then
    create type public.content_status as enum
      ('draft','pending_approval','approved','scheduled','published','needs_changes');
  end if;
  if not exists (select 1 from pg_type where typname = 'post_type') then
    create type public.post_type as enum
      ('feed','reel','story','carousel','video','short');
  end if;
end$$;

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  created_by uuid references auth.users(id),
  assigned_to uuid references auth.users(id),
  post_type public.post_type not null default 'feed',
  caption text,
  hashtags text,
  first_comment text,
  media_urls text[] not null default '{}',
  scheduled_at timestamptz,
  published_at timestamptz,
  status public.content_status not null default 'draft',
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_content_items_client on public.content_items(client_id);
create index if not exists idx_content_items_status on public.content_items(status);
create index if not exists idx_content_items_scheduled on public.content_items(scheduled_at);

create table if not exists public.content_item_platforms (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  platform public.social_platform not null,
  platform_post_id text,
  unique(content_item_id, platform)
);

-- approvals + comments ----------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_type where typname = 'approval_action') then
    create type public.approval_action as enum ('approved','requested_changes');
  end if;
end$$;

create table if not exists public.approvals (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  action public.approval_action not null,
  action_by uuid not null references auth.users(id),
  feedback text,
  created_at timestamptz not null default now()
);
create index if not exists idx_approvals_content on public.approvals(content_item_id);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null,
  attachments text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_comments_content on public.comments(content_item_id);

-- metrics -----------------------------------------------------------------

create table if not exists public.metrics_snapshots (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  platform public.social_platform not null,
  snapshot_date date not null,
  followers int,
  following int,
  reach int,
  profile_visits int,
  website_clicks int,
  created_at timestamptz not null default now(),
  unique(client_id, platform, snapshot_date)
);
create index if not exists idx_metrics_snapshots_client on public.metrics_snapshots(client_id);

create table if not exists public.post_metrics (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items(id) on delete cascade,
  platform public.social_platform not null,
  likes int default 0,
  comments int default 0,
  shares int default 0,
  saves int default 0,
  reach int default 0,
  impressions int default 0,
  updated_at timestamptz not null default now(),
  unique(content_item_id, platform)
);

-- assets ------------------------------------------------------------------

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  folder text,
  filename text not null,
  file_url text not null,
  file_type text,
  file_size int,
  tags text[] not null default '{}',
  description text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_assets_client on public.assets(client_id);

-- brand_guidelines (one row per client) -----------------------------------

create table if not exists public.brand_guidelines (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null unique references public.clients(id) on delete cascade,
  about text,
  target_audience text,
  voice_tone text,
  visual_identity jsonb not null default '{}'::jsonb,
  content_pillars text[] not null default '{}',
  dos text[] not null default '{}',
  donts text[] not null default '{}',
  hashtag_sets jsonb not null default '{}'::jsonb,
  competitors jsonb not null default '[]'::jsonb,
  key_links jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- activity_log ------------------------------------------------------------

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  description text,
  created_at timestamptz not null default now()
);
create index if not exists idx_activity_org on public.activity_log(org_id, created_at desc);

-- notifications -----------------------------------------------------------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user_unread
  on public.notifications(user_id) where is_read = false;

-- updated_at triggers for new tables --------------------------------------

drop trigger if exists trg_content_items_updated_at on public.content_items;
create trigger trg_content_items_updated_at before update on public.content_items
  for each row execute function public.set_updated_at();

drop trigger if exists trg_comments_updated_at on public.comments;
create trigger trg_comments_updated_at before update on public.comments
  for each row execute function public.set_updated_at();

drop trigger if exists trg_post_metrics_updated_at on public.post_metrics;
create trigger trg_post_metrics_updated_at before update on public.post_metrics
  for each row execute function public.set_updated_at();

drop trigger if exists trg_brand_guidelines_updated_at on public.brand_guidelines;
create trigger trg_brand_guidelines_updated_at before update on public.brand_guidelines
  for each row execute function public.set_updated_at();
