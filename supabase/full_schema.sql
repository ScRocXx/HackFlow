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

-- Add FK for active_stage_id after event_stages exists
do $$ 
begin
  if not exists (
    select 1 from information_schema.table_constraints 
    where constraint_name = 'fk_active_stage' and table_name = 'events'
  ) then
    alter table public.events 
      add constraint fk_active_stage 
      foreign key (active_stage_id) 
      references public.event_stages(id) 
      on delete set null;
  end if;
end $$;

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
