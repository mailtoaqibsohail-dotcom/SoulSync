-- 0006_social_connections.sql
-- A client's social-account access for the agency: either an encrypted
-- credential vault (username/password) or an OAuth connection (tokens).
-- Secrets are stored encrypted by the app (AES-256-GCM); the DB only ever
-- holds ciphertext. Access is RLS-scoped: the client themselves, the org
-- owner, and assigned team members.

create table if not exists public.social_connections (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  platform public.social_platform not null,
  auth_type text not null default 'vault' check (auth_type in ('vault','oauth')),

  -- Vault (encrypted by the app — never plaintext at rest)
  handle text,
  username_encrypted text,
  password_encrypted text,
  notes_encrypted text,

  -- OAuth (future; encrypted tokens)
  access_token_encrypted text,
  refresh_token_encrypted text,
  oauth_expires_at timestamptz,
  oauth_scope text,
  external_account_id text,

  status text not null default 'connected',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(client_id, platform)
);
create index if not exists idx_social_connections_client on public.social_connections(client_id);

-- Who may manage a client's connections: owner, assigned team, OR the client
-- themselves. (can_write_client from 0004 excludes the client role, so we
-- need this broader helper.)
create or replace function public.can_manage_connection(p_client uuid)
returns boolean language sql security definer set search_path = public as $$
  select
    case public.current_user_role_in(public.client_org(p_client))
      when 'owner' then true
      when 'team' then public.is_assigned_to(p_client)
      when 'client' then p_client = public.current_user_client_id_in(public.client_org(p_client))
      else false
    end
$$;

alter table public.social_connections enable row level security;

drop policy if exists sc_select on public.social_connections;
create policy sc_select on public.social_connections
  for select using (public.can_read_client(client_id));

drop policy if exists sc_write on public.social_connections;
create policy sc_write on public.social_connections
  for all using (public.can_manage_connection(client_id))
  with check (public.can_manage_connection(client_id));

drop trigger if exists trg_social_connections_updated_at on public.social_connections;
create trigger trg_social_connections_updated_at before update on public.social_connections
  for each row execute function public.set_updated_at();
