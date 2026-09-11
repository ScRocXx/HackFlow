-- ==============================================================================
-- 008_friends_and_squads.sql: Friends, Multi-Squad Vaults & Event Participation
-- ==============================================================================

-- 1. Social Layer: Friendships
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references auth.users(id) on delete cascade not null,
  receiver_email text not null,
  receiver_id uuid references auth.users(id) on delete cascade,
  status text check (status in ('pending', 'accepted', 'declined')) default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(sender_id, receiver_email)
);

-- 2. Squad Layer: Squads & Squad Members
create table if not exists public.squads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id) on delete cascade not null,
  created_at timestamptz default now()
);

create table if not exists public.squad_members (
  id uuid primary key default gen_random_uuid(),
  squad_id uuid references public.squads(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text check (role in ('leader', 'member')) default 'member',
  joined_at timestamptz default now(),
  unique(squad_id, user_id)
);

-- 3. Execution Layer: Event Participants (Single source of truth for rosters)
create table if not exists public.event_participants (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text check (role in ('lead', 'collaborator')) default 'collaborator',
  joined_at timestamptz default now(),
  unique(event_id, user_id)
);

-- 4. Scope Vault Assets & Events to Squads
alter table public.team_vault_assets add column if not exists squad_id uuid references public.squads(id) on delete cascade;
alter table public.events add column if not exists squad_id uuid references public.squads(id) on delete set null;

-- 5. Backfill existing team_members to event_participants if any exist
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'team_members') then
    insert into public.event_participants (event_id, user_id, role, joined_at)
    select event_id, user_id, case when role = 'owner' then 'lead' else 'collaborator' end, coalesce(joined_at, invited_at, now())
    from public.team_members
    where user_id is not null
    on conflict (event_id, user_id) do nothing;
  end if;
end $$;

-- 6. Helper Security Definer Functions (No circular recursion in RLS)
create or replace function public.is_squad_member(p_squad_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.squad_members
    where squad_id = p_squad_id and user_id = p_user_id
  );
$$;

create or replace function public.is_event_participant(p_event_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.event_participants
    where event_id = p_event_id and user_id = p_user_id
  );
$$;

-- Update is_event_team_member to check event_participants as primary source of truth
create or replace function public.is_event_team_member(p_event_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.event_participants
    where event_id = p_event_id and user_id = p_user_id
  ) or exists (
    select 1 from public.team_members
    where event_id = p_event_id and user_id = p_user_id
  );
$$;

-- 7. Row Level Security Policies

-- Friendships RLS
alter table public.friendships enable row level security;

drop policy if exists "friendships_select" on public.friendships;
create policy "friendships_select" on public.friendships
  for select using (
    auth.uid() = sender_id or auth.uid() = receiver_id or receiver_email = auth.jwt()->>'email'
  );

drop policy if exists "friendships_insert" on public.friendships;
create policy "friendships_insert" on public.friendships
  for insert with check (
    auth.uid() = sender_id
  );

drop policy if exists "friendships_update" on public.friendships;
create policy "friendships_update" on public.friendships
  for update using (
    auth.uid() = sender_id or auth.uid() = receiver_id or receiver_email = auth.jwt()->>'email'
  );

drop policy if exists "friendships_delete" on public.friendships;
create policy "friendships_delete" on public.friendships
  for delete using (
    auth.uid() = sender_id or auth.uid() = receiver_id
  );

-- Squads RLS
alter table public.squads enable row level security;

drop policy if exists "squads_select" on public.squads;
create policy "squads_select" on public.squads
  for select using (
    created_by = auth.uid() or public.is_squad_member(id, auth.uid())
  );

drop policy if exists "squads_insert" on public.squads;
create policy "squads_insert" on public.squads
  for insert with check (
    auth.uid() = created_by
  );

drop policy if exists "squads_update" on public.squads;
create policy "squads_update" on public.squads
  for update using (
    created_by = auth.uid()
  );

drop policy if exists "squads_delete" on public.squads;
create policy "squads_delete" on public.squads
  for delete using (
    created_by = auth.uid()
  );

-- Squad Members RLS
alter table public.squad_members enable row level security;

drop policy if exists "squad_members_select" on public.squad_members;
create policy "squad_members_select" on public.squad_members
  for select using (
    user_id = auth.uid() or public.is_squad_member(squad_id, auth.uid())
  );

drop policy if exists "squad_members_insert" on public.squad_members;
create policy "squad_members_insert" on public.squad_members
  for insert with check (
    exists (select 1 from public.squads where id = squad_id and created_by = auth.uid())
    or auth.uid() = user_id
  );

drop policy if exists "squad_members_update" on public.squad_members;
create policy "squad_members_update" on public.squad_members
  for update using (
    exists (select 1 from public.squads where id = squad_id and created_by = auth.uid())
  );

drop policy if exists "squad_members_delete" on public.squad_members;
create policy "squad_members_delete" on public.squad_members
  for delete using (
    user_id = auth.uid() or exists (select 1 from public.squads where id = squad_id and created_by = auth.uid())
  );

-- Event Participants RLS
alter table public.event_participants enable row level security;

drop policy if exists "event_participants_select" on public.event_participants;
create policy "event_participants_select" on public.event_participants
  for select using (
    user_id = auth.uid() or public.is_event_creator(event_id, auth.uid()) or public.is_event_participant(event_id, auth.uid())
  );

drop policy if exists "event_participants_insert" on public.event_participants;
create policy "event_participants_insert" on public.event_participants
  for insert with check (
    public.is_event_creator(event_id, auth.uid()) or auth.uid() = user_id
  );

drop policy if exists "event_participants_update" on public.event_participants;
create policy "event_participants_update" on public.event_participants
  for update using (
    public.is_event_creator(event_id, auth.uid())
  );

drop policy if exists "event_participants_delete" on public.event_participants;
create policy "event_participants_delete" on public.event_participants
  for delete using (
    auth.uid() = user_id or public.is_event_creator(event_id, auth.uid())
  );

-- Team Vault Assets RLS update:
-- Personal assets (squad_id IS NULL) are visible ONLY to creator.
-- Squad assets (squad_id IS NOT NULL) are visible to members of that squad.
drop policy if exists "vault_assets_select" on public.team_vault_assets;
drop policy if exists "team_vault_assets_select" on public.team_vault_assets;
create policy "team_vault_assets_select" on public.team_vault_assets
  for select using (
    (squad_id is null and created_by = auth.uid())
    or (squad_id is not null and public.is_squad_member(squad_id, auth.uid()))
  );

drop policy if exists "vault_assets_insert" on public.team_vault_assets;
drop policy if exists "team_vault_assets_insert" on public.team_vault_assets;
create policy "team_vault_assets_insert" on public.team_vault_assets
  for insert with check (
    auth.uid() = created_by and (
      squad_id is null or public.is_squad_member(squad_id, auth.uid())
    )
  );

drop policy if exists "vault_assets_update" on public.team_vault_assets;
drop policy if exists "team_vault_assets_update" on public.team_vault_assets;
create policy "team_vault_assets_update" on public.team_vault_assets
  for update using (
    auth.uid() = created_by
  );

drop policy if exists "vault_assets_delete" on public.team_vault_assets;
drop policy if exists "team_vault_assets_delete" on public.team_vault_assets;
create policy "team_vault_assets_delete" on public.team_vault_assets
  for delete using (
    auth.uid() = created_by
  );

-- 8. Auth Trigger: Update handle_new_user() with SECURITY DEFINER SET search_path = public
-- Also auto-links pending friend requests to newly registered users!
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'HackFlow Member'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);

  -- Auto-link any pending friend requests for this email
  update public.friendships
  set receiver_id = new.id,
      updated_at = now()
  where lower(receiver_email) = lower(new.email) and receiver_id is null;

  return new;
end;
$$;

-- 9. Realtime Publication
do $$
begin
  begin
    alter publication supabase_realtime add table public.friendships;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.squads;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.squad_members;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.event_participants;
  exception when duplicate_object then null;
  end;
end $$;
