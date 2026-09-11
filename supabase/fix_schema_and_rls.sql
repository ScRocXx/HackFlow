-- ==============================================================================
-- HackFlow Complete Database & RLS Fix
-- Run this in your Supabase Project -> SQL Editor -> New query -> Click "Run"
-- ==============================================================================

-- 1. Helper Security Definer Functions (Bypasses RLS to eliminate circular recursion)
create or replace function public.is_event_team_member(p_event_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.team_members
    where event_id = p_event_id and user_id = p_user_id
  );
$$;

create or replace function public.is_event_creator(p_event_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.events
    where id = p_event_id and created_by = p_user_id
  );
$$;

-- 2. Drop all conflicting/recursive policies
drop policy if exists "Users can view events they are a team member of" on public.events;
drop policy if exists "Users can create events" on public.events;
drop policy if exists "Users can update events they are a team member of" on public.events;
drop policy if exists "Users can delete events they created" on public.events;
drop policy if exists "events_select" on public.events;
drop policy if exists "events_insert" on public.events;
drop policy if exists "events_update" on public.events;
drop policy if exists "events_delete" on public.events;

drop policy if exists "Members can view their teams" on public.team_members;
drop policy if exists "Event owners can insert team members" on public.team_members;
drop policy if exists "Event owners can update team members" on public.team_members;
drop policy if exists "Event owners can delete team members" on public.team_members;
drop policy if exists "team_members_select" on public.team_members;
drop policy if exists "team_members_insert" on public.team_members;
drop policy if exists "team_members_update" on public.team_members;
drop policy if exists "team_members_delete" on public.team_members;

drop policy if exists "Users can view stages for their events" on public.event_stages;
drop policy if exists "Users can insert stages for their events" on public.event_stages;
drop policy if exists "Users can update stages for their events" on public.event_stages;
drop policy if exists "Users can delete stages for their events" on public.event_stages;
drop policy if exists "event_stages_select" on public.event_stages;
drop policy if exists "event_stages_insert" on public.event_stages;
drop policy if exists "event_stages_update" on public.event_stages;
drop policy if exists "event_stages_delete" on public.event_stages;

drop policy if exists "Users can view deliverables for their events" on public.stage_deliverables;
drop policy if exists "Users can manage deliverables for their events" on public.stage_deliverables;
drop policy if exists "stage_deliverables_all" on public.stage_deliverables;

drop policy if exists "Users can view event resources" on public.event_resources;
drop policy if exists "Users can manage event resources" on public.event_resources;
drop policy if exists "event_resources_all" on public.event_resources;

-- 3. Update events table schema (Relax constraints & add missing columns)
alter table public.events alter column source_platform drop not null;
alter table public.events drop constraint if exists events_source_platform_check;
alter table public.events drop constraint if exists events_status_check;
alter table public.events drop constraint if exists events_source_url_key;

alter table public.events add column if not exists meet_url text;
alter table public.events add column if not exists submission_receipt text;
alter table public.events add column if not exists submission_notes text;
alter table public.events add column if not exists result_date timestamptz;
alter table public.events add column if not exists prize_details text;
alter table public.events add column if not exists retro_notes text;
alter table public.events add column if not exists demo_url text;
alter table public.events add column if not exists github_repo_url text;
alter table public.events add column if not exists pitch_deck_url text;

-- 4. Create team_vault_profiles table
create table if not exists public.team_vault_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  full_name text not null,
  email text not null,
  phone text,
  college text,
  roll_number text,
  github_url text,
  linkedin_url text,
  portfolio_url text,
  resume_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.team_vault_profiles enable row level security;

create policy "team_vault_profiles_select" on public.team_vault_profiles
  for select using (auth.role() = 'authenticated');

create policy "team_vault_profiles_insert" on public.team_vault_profiles
  for insert with check (auth.uid() = user_id);

create policy "team_vault_profiles_update" on public.team_vault_profiles
  for update using (auth.uid() = user_id);

create policy "team_vault_profiles_delete" on public.team_vault_profiles
  for delete using (auth.uid() = user_id);

-- 5. Create team_vault_assets table
create table if not exists public.team_vault_assets (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  asset_type text not null check (asset_type in ('pitch_deck', 'figma_kit', 'boilerplate', 'diagram', 'other')),
  url text not null,
  description text,
  tags text[] default '{}',
  created_at timestamptz default now()
);

alter table public.team_vault_assets enable row level security;

create policy "team_vault_assets_select" on public.team_vault_assets
  for select using (auth.role() = 'authenticated');

create policy "team_vault_assets_insert" on public.team_vault_assets
  for insert with check (auth.uid() = created_by);

create policy "team_vault_assets_update" on public.team_vault_assets
  for update using (auth.uid() = created_by);

create policy "team_vault_assets_delete" on public.team_vault_assets
  for delete using (auth.uid() = created_by);

-- 6. Create event_problem_statements table
create table if not exists public.event_problem_statements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade not null,
  title text not null,
  category text,
  description text,
  solution_bullets text[] default '{}',
  is_chosen boolean default false,
  created_at timestamptz default now()
);

alter table public.event_problem_statements enable row level security;

create policy "event_problem_statements_all" on public.event_problem_statements
  for all using (
    public.is_event_creator(event_id, auth.uid()) or public.is_event_team_member(event_id, auth.uid())
  );

-- 7. Create event_resources table if not exists
create table if not exists public.event_resources (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade not null,
  title text not null,
  url text not null,
  resource_type text default 'other' check (resource_type in ('problem_statement', 'rulebook', 'template', 'dataset', 'reference', 'other')),
  is_official boolean default true,
  created_at timestamptz default now()
);

alter table public.event_resources enable row level security;

create policy "event_resources_all" on public.event_resources
  for all using (
    public.is_event_creator(event_id, auth.uid()) or public.is_event_team_member(event_id, auth.uid())
  );

-- 8. Clean Non-Recursive Policies for events and team_members
create policy "team_members_select" on public.team_members
  for select using (auth.role() = 'authenticated');

create policy "team_members_insert" on public.team_members
  for insert with check (auth.role() = 'authenticated');

create policy "team_members_update" on public.team_members
  for update using (user_id = auth.uid() or public.is_event_creator(event_id, auth.uid()));

create policy "team_members_delete" on public.team_members
  for delete using (user_id = auth.uid() or public.is_event_creator(event_id, auth.uid()));

create policy "events_select" on public.events
  for select using (
    created_by = auth.uid() or public.is_event_team_member(id, auth.uid())
  );

create policy "events_insert" on public.events
  for insert with check (
    auth.uid() = created_by
  );

create policy "events_update" on public.events
  for update using (
    created_by = auth.uid() or public.is_event_team_member(id, auth.uid())
  );

create policy "events_delete" on public.events
  for delete using (
    created_by = auth.uid()
  );

-- 9. Stage & Deliverable Non-Recursive Policies
create policy "event_stages_select" on public.event_stages
  for select using (
    public.is_event_creator(event_id, auth.uid()) or public.is_event_team_member(event_id, auth.uid())
  );

create policy "event_stages_insert" on public.event_stages
  for insert with check (
    public.is_event_creator(event_id, auth.uid()) or public.is_event_team_member(event_id, auth.uid())
  );

create policy "event_stages_update" on public.event_stages
  for update using (
    public.is_event_creator(event_id, auth.uid()) or public.is_event_team_member(event_id, auth.uid())
  );

create policy "event_stages_delete" on public.event_stages
  for delete using (
    public.is_event_creator(event_id, auth.uid())
  );

create policy "stage_deliverables_all" on public.stage_deliverables
  for all using (
    exists (
      select 1 from public.event_stages es
      where es.id = stage_deliverables.stage_id
      and (public.is_event_creator(es.event_id, auth.uid()) or public.is_event_team_member(es.event_id, auth.uid()))
    )
  );

-- 10. Enable realtime
do $$
begin
  alter publication supabase_realtime add table public.team_vault_profiles;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.team_vault_assets;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.event_problem_statements;
exception when others then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.event_resources;
exception when others then null;
end $$;
