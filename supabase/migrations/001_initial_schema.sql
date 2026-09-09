-- 001_initial_schema.sql

-- Profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Events table
create table public.events (
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
create table public.event_stages (
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
alter table public.events 
  add constraint fk_active_stage 
  foreign key (active_stage_id) 
  references public.event_stages(id) 
  on delete set null;

-- Stage deliverables (checklist items)
create table public.stage_deliverables (
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
create table public.team_members (
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
create table public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  stage_id uuid references public.event_stages(id) on delete cascade not null,
  interval_key text not null check (interval_key in ('7d', '3d', '24h', '6h')),
  channel text not null check (channel in ('email', 'in_app')),
  sent_at timestamptz default now(),
  recipient_email text not null,
  unique(stage_id, interval_key, channel, recipient_email)
);

-- In-app notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  body text,
  link text,
  read boolean default false,
  created_at timestamptz default now()
);

-- Indexes
create index idx_events_created_by on public.events(created_by);
create index idx_events_status on public.events(status);
create index idx_event_stages_event_id on public.event_stages(event_id);
create index idx_event_stages_deadline on public.event_stages(deadline);
create index idx_stage_deliverables_stage_id on public.stage_deliverables(stage_id);
create index idx_team_members_event_id on public.team_members(event_id);
create index idx_team_members_user_id on public.team_members(user_id);
create index idx_notifications_user_id on public.notifications(user_id);
create index idx_notification_logs_stage_id on public.notification_logs(stage_id);
