-- ==============================================================================
-- HackFlow Complete Database Setup
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. EXTENSIONS & TABLES
create extension if not exists "uuid-ossp";

-- Profiles table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Events table
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  organizer text,
  source_url text unique,
  source_platform text check (source_platform in ('unstop', 'devfolio', 'devpost', 'mlh', 'hackerearth', 'custom')),
  mode text check (mode in ('online', 'in-person', 'hybrid')),
  location text,
  banner_url text,
  prize_pool text,
  overview text,
  eligibility text,
  team_size_min int default 1,
  team_size_max int default 4,
  status text default 'bookmarked' check (status in ('bookmarked', 'registered', 'building', 'submitted')),
  active_stage_id uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Event stages (rounds)
create table if not exists public.event_stages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade not null,
  round_number int not null,
  title text not null,
  stage_type text check (stage_type in ('quiz', 'ppt_submission', 'prototype', 'presentation', 'other')),
  deadline timestamptz not null,
  evaluation_format text,
  deliverables_description text,
  is_completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

-- Note: events.active_stage_id is left unconstrained to avoid circular foreign key deadlocks.


-- Stage deliverables (checklist items)
create table if not exists public.stage_deliverables (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid references public.event_stages(id) on delete cascade not null,
  title text not null,
  is_done boolean default false,
  done_by uuid references public.profiles(id) on delete set null,
  done_at timestamptz,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Team members
create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete set null,
  email text not null,
  role text default 'member' check (role in ('owner', 'member')),
  invited_at timestamptz default now(),
  joined_at timestamptz,
  unique(event_id, email)
);

-- Notification logs (idempotency)
create table if not exists public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid references public.event_stages(id) on delete cascade not null,
  interval_key text not null check (interval_key in ('7d', '3d', '24h', '6h')),
  channel text not null check (channel in ('email', 'in_app')),
  sent_at timestamptz default now(),
  recipient_email text not null,
  unique(stage_id, interval_key, channel, recipient_email)
);

-- In-app notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  body text,
  link text,
  read boolean default false,
  created_at timestamptz default now()
);

-- Event resources (problem statements, rulebooks, templates, datasets, links)
create table if not exists public.event_resources (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade not null,
  title text not null,
  url text not null,
  resource_type text check (resource_type in ('problem_statement', 'rulebook', 'template', 'dataset', 'reference', 'other')) default 'other',
  is_official boolean default true,
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_events_created_by on public.events(created_by);
create index if not exists idx_events_status on public.events(status);
create index if not exists idx_event_stages_event_id on public.event_stages(event_id);
create index if not exists idx_event_stages_deadline on public.event_stages(deadline);
create index if not exists idx_stage_deliverables_stage_id on public.stage_deliverables(stage_id);
create index if not exists idx_event_resources_event_id on public.event_resources(event_id);
create index if not exists idx_team_members_event_id on public.team_members(event_id);
create index if not exists idx_team_members_user_id on public.team_members(user_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notification_logs_stage_id on public.notification_logs(stage_id);

-- 2. ROW LEVEL SECURITY (RLS)
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_stages enable row level security;
alter table public.stage_deliverables enable row level security;
alter table public.event_resources enable row level security;
alter table public.team_members enable row level security;
alter table public.notification_logs enable row level security;
alter table public.notifications enable row level security;


-- Drop existing policies to allow idempotent execution
drop policy if exists "Profiles are viewable by everyone" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can view events they are a team member of" on public.events;
drop policy if exists "Users can create events" on public.events;
drop policy if exists "Users can update events they are a team member of" on public.events;
drop policy if exists "Users can delete events they created" on public.events;
drop policy if exists "Users can view stages for their events" on public.event_stages;
drop policy if exists "Users can insert stages for their events" on public.event_stages;
drop policy if exists "Users can update stages for their events" on public.event_stages;
drop policy if exists "Users can delete stages for their events" on public.event_stages;
drop policy if exists "Users can view deliverables for their events" on public.stage_deliverables;
drop policy if exists "Users can manage deliverables for their events" on public.stage_deliverables;
drop policy if exists "Users can view resources for their events" on public.event_resources;
drop policy if exists "Users can insert resources for their events" on public.event_resources;
drop policy if exists "Users can delete resources for their events" on public.event_resources;
drop policy if exists "Members can view their teams" on public.team_members;
drop policy if exists "Event owners can insert team members" on public.team_members;
drop policy if exists "Event owners can update team members" on public.team_members;
drop policy if exists "Event owners can delete team members" on public.team_members;
drop policy if exists "Authenticated users can insert notification logs" on public.notification_logs;
drop policy if exists "Users can view notification logs for their events" on public.notification_logs;
drop policy if exists "Users can view their own notifications" on public.notifications;
drop policy if exists "Users can update their own notifications" on public.notifications;
drop policy if exists "Users can delete their own notifications" on public.notifications;

-- Profiles Policies
create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- Events Policies
create policy "Users can view events they are a team member of" on public.events
  for select using (
    exists (
      select 1 from public.team_members 
      where team_members.event_id = events.id 
      and team_members.user_id = auth.uid()
    )
    or created_by = auth.uid()
  );

create policy "Users can create events" on public.events
  for insert with check (auth.uid() = created_by);

create policy "Users can update events they are a team member of" on public.events
  for update using (
    exists (
      select 1 from public.team_members 
      where team_members.event_id = events.id 
      and team_members.user_id = auth.uid()
    )
    or created_by = auth.uid()
  );

create policy "Users can delete events they created" on public.events
  for delete using (created_by = auth.uid());

-- Event Stages Policies
create policy "Users can view stages for their events" on public.event_stages
  for select using (
    exists (
      select 1 from public.events
      left join public.team_members on team_members.event_id = events.id
      where events.id = event_stages.event_id
      and (events.created_by = auth.uid() or team_members.user_id = auth.uid())
    )
  );

create policy "Users can insert stages for their events" on public.event_stages
  for insert with check (
    exists (
      select 1 from public.events
      left join public.team_members on team_members.event_id = events.id
      where events.id = event_stages.event_id
      and (events.created_by = auth.uid() or team_members.user_id = auth.uid())
    )
  );

create policy "Users can update stages for their events" on public.event_stages
  for update using (
    exists (
      select 1 from public.events
      left join public.team_members on team_members.event_id = events.id
      where events.id = event_stages.event_id
      and (events.created_by = auth.uid() or team_members.user_id = auth.uid())
    )
  );

create policy "Users can delete stages for their events" on public.event_stages
  for delete using (
    exists (
      select 1 from public.events
      left join public.team_members on team_members.event_id = events.id
      where events.id = event_stages.event_id
      and (events.created_by = auth.uid() or team_members.user_id = auth.uid())
    )
  );

-- Deliverables Policies
create policy "Users can view deliverables for their events" on public.stage_deliverables
  for select using (
    exists (
      select 1 from public.event_stages
      join public.events on events.id = event_stages.event_id
      left join public.team_members on team_members.event_id = events.id
      where event_stages.id = stage_deliverables.stage_id
      and (events.created_by = auth.uid() or team_members.user_id = auth.uid())
    )
  );

create policy "Users can manage deliverables for their events" on public.stage_deliverables
  for all using (
    exists (
      select 1 from public.event_stages
      join public.events on events.id = event_stages.event_id
      left join public.team_members on team_members.event_id = events.id
      where event_stages.id = stage_deliverables.stage_id
      and (events.created_by = auth.uid() or team_members.user_id = auth.uid())
    )
  );

-- Event Resources Policies
create policy "Users can view resources for their events" on public.event_resources
  for select using (
    exists (
      select 1 from public.events
      left join public.team_members on team_members.event_id = events.id
      where events.id = event_resources.event_id
      and (events.created_by = auth.uid() or team_members.user_id = auth.uid())
    )
  );

create policy "Users can insert resources for their events" on public.event_resources
  for insert with check (
    exists (
      select 1 from public.events
      left join public.team_members on team_members.event_id = events.id
      where events.id = event_resources.event_id
      and (events.created_by = auth.uid() or team_members.user_id = auth.uid())
    )
  );

create policy "Users can delete resources for their events" on public.event_resources
  for delete using (
    exists (
      select 1 from public.events
      left join public.team_members on team_members.event_id = events.id
      where events.id = event_resources.event_id
      and (events.created_by = auth.uid() or team_members.user_id = auth.uid())
    )
  );

-- Team Members Policies
create policy "Members can view their teams" on public.team_members
  for select using (
    user_id = auth.uid() or 
    exists (
      select 1 from public.events 
      where events.id = team_members.event_id 
      and events.created_by = auth.uid()
    ) or
    exists (
      select 1 from public.team_members tm 
      where tm.event_id = team_members.event_id 
      and tm.user_id = auth.uid()
    )
  );

create policy "Event owners can insert team members" on public.team_members
  for insert with check (
    exists (
      select 1 from public.events 
      where events.id = team_members.event_id 
      and events.created_by = auth.uid()
    )
  );

create policy "Event owners can update team members" on public.team_members
  for update using (
    exists (
      select 1 from public.events 
      where events.id = team_members.event_id 
      and events.created_by = auth.uid()
    )
  );

create policy "Event owners can delete team members" on public.team_members
  for delete using (
    exists (
      select 1 from public.events 
      where events.id = team_members.event_id 
      and events.created_by = auth.uid()
    )
  );

-- Notification Policies
create policy "Authenticated users can insert notification logs" on public.notification_logs
  for insert with check (auth.role() = 'authenticated');

create policy "Users can view notification logs for their events" on public.notification_logs
  for select using (
    exists (
      select 1 from public.event_stages
      join public.events on events.id = event_stages.event_id
      left join public.team_members on team_members.event_id = events.id
      where event_stages.id = notification_logs.stage_id
      and (events.created_by = auth.uid() or team_members.user_id = auth.uid())
    )
  );

create policy "Users can view their own notifications" on public.notifications
  for select using (user_id = auth.uid());

create policy "Users can update their own notifications" on public.notifications
  for update using (user_id = auth.uid());

create policy "Users can delete their own notifications" on public.notifications
  for delete using (user_id = auth.uid());

-- 3. FUNCTIONS & TRIGGERS
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
  before update on public.events
  for each row execute procedure public.set_updated_at();

create or replace function public.handle_event_status_change()
returns trigger as $$
declare
  first_stage_id uuid;
begin
  if new.status = 'registered' and (old.status is null or old.status != 'registered') and new.active_stage_id is null then
    select id into first_stage_id
    from public.event_stages
    where event_id = new.id
    order by round_number asc
    limit 1;
    
    if first_stage_id is not null then
      new.active_stage_id = first_stage_id;
    end if;
  end if;
  
  return new;
end;
$$ language plpgsql;

drop trigger if exists on_event_status_registered on public.events;
create trigger on_event_status_registered
  before update on public.events
  for each row execute procedure public.handle_event_status_change();

-- 4. REALTIME PUBLICATION
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end $$;

alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.event_stages;
alter publication supabase_realtime add table public.stage_deliverables;
alter publication supabase_realtime add table public.team_members;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.event_resources;
-- 006_vault_and_lifecycle.sql

-- 1. Expand Lifecycle Statuses on events
DO $$ 
BEGIN
  -- Drop existing status check constraint if exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_status_check'
  ) THEN
    ALTER TABLE public.events DROP CONSTRAINT events_status_check;
  END IF;

  -- Add updated check constraint for full lifecycle
  ALTER TABLE public.events ADD CONSTRAINT events_status_check 
    CHECK (status IN (
      'bookmarked', 
      'registered', 
      'building', 
      'submitted', 
      'under_review', 
      'finalist', 
      'winner', 
      'runner_up', 
      'participated', 
      'archived'
    ));

  -- Relax source_platform constraint to allow any platform (e.g. internshala)
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'events_source_platform_check'
  ) THEN
    ALTER TABLE public.events DROP CONSTRAINT events_source_platform_check;
  END IF;
END $$;

-- 2. Add Companion & Post-Submission Columns to events
ALTER TABLE public.events 
  ADD COLUMN IF NOT EXISTS meet_url text,
  ADD COLUMN IF NOT EXISTS submission_receipt text,
  ADD COLUMN IF NOT EXISTS submission_notes text,
  ADD COLUMN IF NOT EXISTS result_date timestamptz,
  ADD COLUMN IF NOT EXISTS prize_details text,
  ADD COLUMN IF NOT EXISTS retro_notes text,
  ADD COLUMN IF NOT EXISTS demo_url text,
  ADD COLUMN IF NOT EXISTS github_repo_url text,
  ADD COLUMN IF NOT EXISTS pitch_deck_url text;

-- 3. Event Problem Statements Table (Idea Sandbox)
CREATE TABLE IF NOT EXISTS public.event_problem_statements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text,
  category text,
  is_chosen boolean DEFAULT false,
  solution_bullets text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_problem_statements_event_id ON public.event_problem_statements(event_id);

-- 4. Team Vault Profiles Table (Quick-Fill Member Records)
CREATE TABLE IF NOT EXISTS public.team_vault_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  college text,
  roll_number text,
  github_url text,
  linkedin_url text,
  portfolio_url text,
  resume_url text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_vault_profiles_user_id ON public.team_vault_profiles(user_id);

-- 5. Team Vault Assets Table (Reusable Decks, Figma Kits, Boilerplates)
CREATE TABLE IF NOT EXISTS public.team_vault_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  asset_type text NOT NULL CHECK (asset_type IN ('pitch_deck', 'figma_kit', 'boilerplate', 'diagram', 'other')),
  url text NOT NULL,
  description text,
  tags text[] DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vault_assets_type ON public.team_vault_assets(asset_type);

-- 6. Enable RLS
ALTER TABLE public.event_problem_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_vault_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_vault_assets ENABLE ROW LEVEL SECURITY;

-- Problem Statements Policies
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Team members can view problem statements') THEN
    CREATE POLICY "Team members can view problem statements"
      ON public.event_problem_statements FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Team members can manage problem statements') THEN
    CREATE POLICY "Team members can manage problem statements"
      ON public.event_problem_statements FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Team Vault Profiles Policies:
-- ALL authenticated squad members can view (SELECT)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Squad can view all vault profiles') THEN
    CREATE POLICY "Squad can view all vault profiles"
      ON public.team_vault_profiles FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert their own profile') THEN
    CREATE POLICY "Users can insert their own profile"
      ON public.team_vault_profiles FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own profile') THEN
    CREATE POLICY "Users can update their own profile"
      ON public.team_vault_profiles FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own profile') THEN
    CREATE POLICY "Users can delete their own profile"
      ON public.team_vault_profiles FOR DELETE
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Team Vault Assets Policies:
-- ALL authenticated squad members can view (SELECT)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Squad can view all vault assets') THEN
    CREATE POLICY "Squad can view all vault assets"
      ON public.team_vault_assets FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can create vault assets') THEN
    CREATE POLICY "Authenticated users can create vault assets"
      ON public.team_vault_assets FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = created_by);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own vault assets') THEN
    CREATE POLICY "Users can update their own vault assets"
      ON public.team_vault_assets FOR UPDATE
      TO authenticated
      USING (auth.uid() = created_by);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete their own vault assets') THEN
    CREATE POLICY "Users can delete their own vault assets"
      ON public.team_vault_assets FOR DELETE
      TO authenticated
      USING (auth.uid() = created_by);
  END IF;
END $$;

-- 7. Add to Realtime
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.event_problem_statements;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_vault_profiles;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.team_vault_assets;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
END $$;

-- 8. Atomic Event Creation RPC
CREATE OR REPLACE FUNCTION public.create_event_with_stages(
  p_event JSONB,
  p_stages JSONB,
  p_deliverables JSONB DEFAULT '[]'::JSONB,
  p_resources JSONB DEFAULT '[]'::JSONB,
  p_creator_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
  v_first_stage_id UUID;
  v_stage_record JSONB;
  v_inserted_stage_id UUID;
  v_deliverable_record JSONB;
  v_resource_record JSONB;
  v_stage_id_by_round JSONB := '{}'::JSONB;
  v_stage_round INT;
BEGIN
  IF p_creator_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- 1. Insert Event
  INSERT INTO public.events (
    created_by,
    title,
    organizer,
    source_url,
    source_platform,
    mode,
    location,
    banner_url,
    prize_pool,
    prize_cash_pool,
    prize_first_place,
    has_perks_or_credits,
    raw_prize_text,
    prize_display_summary,
    overview,
    eligibility,
    team_size_min,
    team_size_max,
    squad_id,
    status,
    active_stage_id
  ) VALUES (
    p_creator_id,
    COALESCE(p_event->>'title', 'Untitled Event'),
    COALESCE(p_event->>'organizer', ''),
    NULLIF(p_event->>'source_url', ''),
    COALESCE(p_event->>'source_platform', 'custom'),
    COALESCE(p_event->>'mode', 'online'),
    COALESCE(p_event->>'location', ''),
    COALESCE(p_event->>'banner_url', ''),
    COALESCE(p_event->>'prize_pool', ''),
    p_event->>'prize_cash_pool',
    p_event->>'prize_first_place',
    COALESCE((p_event->>'has_perks_or_credits')::BOOLEAN, false),
    p_event->>'raw_prize_text',
    p_event->>'prize_display_summary',
    COALESCE(p_event->>'overview', ''),
    COALESCE(p_event->>'eligibility', ''),
    COALESCE((p_event->>'team_size_min')::INT, 1),
    COALESCE((p_event->>'team_size_max')::INT, 4),
    NULLIF(p_event->>'squad_id', '')::UUID,
    COALESCE(p_event->>'status', 'registered'),
    NULL
  )
  RETURNING id INTO v_event_id;

  -- 2. Insert Stages
  FOR v_stage_record IN SELECT * FROM jsonb_array_elements(p_stages)
  LOOP
    v_stage_round := COALESCE((v_stage_record->>'round_number')::INT, 1);
    
    INSERT INTO public.event_stages (
      event_id,
      round_number,
      title,
      stage_type,
      deadline,
      window_start,
      window_end,
      actionable_deadline,
      raw_date_snippet,
      evaluation_format,
      deliverables_description,
      is_completed
    ) VALUES (
      v_event_id,
      v_stage_round,
      COALESCE(v_stage_record->>'title', 'Stage'),
      COALESCE(v_stage_record->>'stage_type', 'other'),
      (v_stage_record->>'deadline')::TIMESTAMPTZ,
      (v_stage_record->>'window_start')::TIMESTAMPTZ,
      (v_stage_record->>'window_end')::TIMESTAMPTZ,
      (v_stage_record->>'actionable_deadline')::TIMESTAMPTZ,
      v_stage_record->>'raw_date_snippet',
      COALESCE(v_stage_record->>'evaluation_format', ''),
      COALESCE(v_stage_record->>'deliverables_description', ''),
      false
    )
    RETURNING id INTO v_inserted_stage_id;

    v_stage_id_by_round := jsonb_set(
      v_stage_id_by_round, 
      ARRAY[v_stage_round::TEXT], 
      to_jsonb(v_inserted_stage_id::TEXT)
    );

    IF v_first_stage_id IS NULL THEN
      v_first_stage_id := v_inserted_stage_id;
    END IF;
  END LOOP;

  -- 3. Link active_stage_id to first stage
  IF v_first_stage_id IS NOT NULL THEN
    UPDATE public.events 
    SET active_stage_id = v_first_stage_id 
    WHERE id = v_event_id;
  END IF;

  -- 4. Insert Deliverables
  IF p_deliverables IS NOT NULL AND jsonb_array_length(p_deliverables) > 0 THEN
    FOR v_deliverable_record IN SELECT * FROM jsonb_array_elements(p_deliverables)
    LOOP
      DECLARE
        v_target_stage_id UUID;
        v_round_key TEXT := v_deliverable_record->>'round_number';
      BEGIN
        IF v_round_key IS NOT NULL AND v_stage_id_by_round ? v_round_key THEN
          v_target_stage_id := (v_stage_id_by_round->>v_round_key)::UUID;
        ELSE
          v_target_stage_id := v_first_stage_id;
        END IF;

        IF v_target_stage_id IS NOT NULL THEN
          INSERT INTO public.stage_deliverables (
            stage_id,
            title,
            sort_order,
            is_done
          ) VALUES (
            v_target_stage_id,
            COALESCE(v_deliverable_record->>'title', 'Deliverable'),
            COALESCE((v_deliverable_record->>'sort_order')::INT, 0),
            false
          );
        END IF;
      END;
    END LOOP;
  END IF;

  -- 5. Insert Resources
  IF p_resources IS NOT NULL AND jsonb_array_length(p_resources) > 0 THEN
    FOR v_resource_record IN SELECT * FROM jsonb_array_elements(p_resources)
    LOOP
      INSERT INTO public.event_resources (
        event_id,
        title,
        url,
        resource_type
      ) VALUES (
        v_event_id,
        COALESCE(v_resource_record->>'title', 'Resource'),
        COALESCE(v_resource_record->>'url', ''),
        COALESCE(v_resource_record->>'resource_type', 'other')
      );
    END LOOP;
  END IF;

  -- 6. Insert Creator Participant
  INSERT INTO public.event_participants (
    event_id,
    user_id,
    role
  ) VALUES (
    v_event_id,
    p_creator_id,
    'lead'
  )
  ON CONFLICT DO NOTHING;

  -- 7. Add Squad Members if squad_id specified
  IF NULLIF(p_event->>'squad_id', '') IS NOT NULL THEN
    INSERT INTO public.event_participants (event_id, user_id, role)
    SELECT v_event_id, sm.user_id, 'collaborator'
    FROM public.squad_members sm
    WHERE sm.squad_id = (p_event->>'squad_id')::UUID
      AND sm.user_id != p_creator_id
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'id', v_event_id,
    'title', p_event->>'title',
    'active_stage_id', v_first_stage_id
  );
END;
$$;

-- 9. Squad Sprint Scratchpad Table (Shared sprint pinboard for staging, credentials, and notes)
CREATE TABLE IF NOT EXISTS public.squad_scratchpads (
  squad_id uuid PRIMARY KEY REFERENCES public.squads(id) ON DELETE CASCADE,
  meet_url text,
  chat_channel_url text,
  staging_url text,
  test_credentials text,
  notes text,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_squad_scratchpads_squad_id ON public.squad_scratchpads(squad_id);

ALTER TABLE public.squad_scratchpads ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'squad_scratchpads_select' AND tablename = 'squad_scratchpads') THEN
    CREATE POLICY "squad_scratchpads_select" ON public.squad_scratchpads
      FOR SELECT USING (public.is_squad_member(squad_id, auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'squad_scratchpads_insert' AND tablename = 'squad_scratchpads') THEN
    CREATE POLICY "squad_scratchpads_insert" ON public.squad_scratchpads
      FOR INSERT WITH CHECK (public.is_squad_member(squad_id, auth.uid()));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'squad_scratchpads_update' AND tablename = 'squad_scratchpads') THEN
    CREATE POLICY "squad_scratchpads_update" ON public.squad_scratchpads
      FOR UPDATE USING (public.is_squad_member(squad_id, auth.uid()));
  END IF;
END $$;

