-- RLS for the main platform tables (Section 16 key policies).
--
-- Reuses helpers from 0002_rls.sql:
--   public.current_user_role_in(org_id)   -> 'owner' | 'team' | 'client'
--   public.current_user_client_id_in(org_id) -> uuid (if role = client)
--
-- Common helpers below for "is the current user assigned to this client" and
-- "what org owns this client".

create or replace function public.client_org(p_client uuid)
returns uuid language sql security definer set search_path = public as $$
  select org_id from public.clients where id = p_client
$$;

create or replace function public.is_assigned_to(p_client uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.team_assignments
    where user_id = auth.uid() and client_id = p_client
  )
$$;

create or replace function public.can_read_client(p_client uuid)
returns boolean language sql security definer set search_path = public as $$
  select
    case public.current_user_role_in(public.client_org(p_client))
      when 'owner' then true
      when 'team' then public.is_assigned_to(p_client)
      when 'client' then p_client = public.current_user_client_id_in(public.client_org(p_client))
      else false
    end
$$;

create or replace function public.can_write_client(p_client uuid)
returns boolean language sql security definer set search_path = public as $$
  select
    case public.current_user_role_in(public.client_org(p_client))
      when 'owner' then true
      when 'team' then public.is_assigned_to(p_client)
      else false
    end
$$;

-- Enable RLS --------------------------------------------------------------

alter table public.client_platforms     enable row level security;
alter table public.team_assignments     enable row level security;
alter table public.content_items        enable row level security;
alter table public.content_item_platforms enable row level security;
alter table public.approvals            enable row level security;
alter table public.comments             enable row level security;
alter table public.metrics_snapshots    enable row level security;
alter table public.post_metrics         enable row level security;
alter table public.assets               enable row level security;
alter table public.brand_guidelines     enable row level security;
alter table public.activity_log         enable row level security;
alter table public.notifications        enable row level security;

-- client_platforms --------------------------------------------------------

drop policy if exists cp_select on public.client_platforms;
create policy cp_select on public.client_platforms
  for select using (public.can_read_client(client_id));

drop policy if exists cp_write on public.client_platforms;
create policy cp_write on public.client_platforms
  for all using (public.can_write_client(client_id))
  with check (public.can_write_client(client_id));

-- team_assignments: owner manages, team can see their own ---------------

drop policy if exists ta_select on public.team_assignments;
create policy ta_select on public.team_assignments
  for select using (
    user_id = auth.uid()
    or public.current_user_role_in(public.client_org(client_id)) = 'owner'
  );

drop policy if exists ta_modify on public.team_assignments;
create policy ta_modify on public.team_assignments
  for all using (public.current_user_role_in(public.client_org(client_id)) = 'owner')
  with check (public.current_user_role_in(public.client_org(client_id)) = 'owner');

-- content_items -----------------------------------------------------------

drop policy if exists ci_select on public.content_items;
create policy ci_select on public.content_items
  for select using (public.can_read_client(client_id));

drop policy if exists ci_write on public.content_items;
create policy ci_write on public.content_items
  for all using (public.can_write_client(client_id))
  with check (public.can_write_client(client_id));

-- content_item_platforms (piggyback) -------------------------------------

drop policy if exists cip_select on public.content_item_platforms;
create policy cip_select on public.content_item_platforms
  for select using (
    exists (
      select 1 from public.content_items ci
      where ci.id = content_item_id and public.can_read_client(ci.client_id)
    )
  );

drop policy if exists cip_write on public.content_item_platforms;
create policy cip_write on public.content_item_platforms
  for all using (
    exists (
      select 1 from public.content_items ci
      where ci.id = content_item_id and public.can_write_client(ci.client_id)
    )
  ) with check (
    exists (
      select 1 from public.content_items ci
      where ci.id = content_item_id and public.can_write_client(ci.client_id)
    )
  );

-- approvals: select by anyone with content access; insert by anyone who can
-- read (client can approve their own; team/owner can approve any of theirs).

drop policy if exists ap_select on public.approvals;
create policy ap_select on public.approvals
  for select using (
    exists (select 1 from public.content_items ci
            where ci.id = content_item_id and public.can_read_client(ci.client_id))
  );

drop policy if exists ap_insert on public.approvals;
create policy ap_insert on public.approvals
  for insert with check (
    exists (select 1 from public.content_items ci
            where ci.id = content_item_id and public.can_read_client(ci.client_id))
  );

-- comments ----------------------------------------------------------------

drop policy if exists co_select on public.comments;
create policy co_select on public.comments
  for select using (
    exists (select 1 from public.content_items ci
            where ci.id = content_item_id and public.can_read_client(ci.client_id))
  );

drop policy if exists co_insert on public.comments;
create policy co_insert on public.comments
  for insert with check (
    user_id = auth.uid()
    and exists (select 1 from public.content_items ci
                where ci.id = content_item_id and public.can_read_client(ci.client_id))
  );

drop policy if exists co_update on public.comments;
create policy co_update on public.comments
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists co_delete on public.comments;
create policy co_delete on public.comments
  for delete using (user_id = auth.uid());

-- metrics + post_metrics: same client visibility ------------------------

drop policy if exists ms_select on public.metrics_snapshots;
create policy ms_select on public.metrics_snapshots
  for select using (public.can_read_client(client_id));

drop policy if exists ms_write on public.metrics_snapshots;
create policy ms_write on public.metrics_snapshots
  for all using (public.can_write_client(client_id))
  with check (public.can_write_client(client_id));

drop policy if exists pm_select on public.post_metrics;
create policy pm_select on public.post_metrics
  for select using (
    exists (select 1 from public.content_items ci
            where ci.id = content_item_id and public.can_read_client(ci.client_id))
  );

drop policy if exists pm_write on public.post_metrics;
create policy pm_write on public.post_metrics
  for all using (
    exists (select 1 from public.content_items ci
            where ci.id = content_item_id and public.can_write_client(ci.client_id))
  ) with check (
    exists (select 1 from public.content_items ci
            where ci.id = content_item_id and public.can_write_client(ci.client_id))
  );

-- assets ------------------------------------------------------------------

drop policy if exists assets_select on public.assets;
create policy assets_select on public.assets
  for select using (public.can_read_client(client_id));

drop policy if exists assets_write on public.assets;
create policy assets_write on public.assets
  for all using (public.can_write_client(client_id))
  with check (public.can_write_client(client_id));

-- brand_guidelines: read for everyone with client access, write team/owner

drop policy if exists bg_select on public.brand_guidelines;
create policy bg_select on public.brand_guidelines
  for select using (public.can_read_client(client_id));

drop policy if exists bg_write on public.brand_guidelines;
create policy bg_write on public.brand_guidelines
  for all using (public.can_write_client(client_id))
  with check (public.can_write_client(client_id));

-- activity_log: owners see all; team sees own + assigned clients --------

drop policy if exists al_select on public.activity_log;
create policy al_select on public.activity_log
  for select using (
    public.current_user_role_in(org_id) = 'owner'
    or user_id = auth.uid()
    or (client_id is not null and public.is_assigned_to(client_id))
  );

drop policy if exists al_insert on public.activity_log;
create policy al_insert on public.activity_log
  for insert with check (
    public.current_user_role_in(org_id) in ('owner','team')
  );

-- notifications: each user sees their own ------------------------------

drop policy if exists notif_select on public.notifications;
create policy notif_select on public.notifications
  for select using (user_id = auth.uid());

drop policy if exists notif_update on public.notifications;
create policy notif_update on public.notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());
