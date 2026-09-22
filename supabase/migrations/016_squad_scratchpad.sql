-- ==============================================================================
-- 016_squad_scratchpad.sql: Squad Sprint Scratchpad & Pinboard
-- ==============================================================================

-- 1. Squad Sprint Scratchpad Table (High-utility shared pinboard for staging, credentials, meet links, and notes)
create table if not exists public.squad_scratchpads (
  squad_id uuid primary key references public.squads(id) on delete cascade,
  meet_url text,
  chat_channel_url text,
  staging_url text,
  test_credentials text,
  notes text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz default now()
);

-- Index for squad lookup
create index if not exists idx_squad_scratchpads_squad_id on public.squad_scratchpads(squad_id);

-- 2. Enable Row Level Security
alter table public.squad_scratchpads enable row level security;

-- Squad members can view scratchpad
drop policy if exists "squad_scratchpads_select" on public.squad_scratchpads;
create policy "squad_scratchpads_select" on public.squad_scratchpads
  for select using (
    public.is_squad_member(squad_id, auth.uid())
  );

-- Squad members can insert scratchpad
drop policy if exists "squad_scratchpads_insert" on public.squad_scratchpads;
create policy "squad_scratchpads_insert" on public.squad_scratchpads
  for insert with check (
    public.is_squad_member(squad_id, auth.uid())
  );

-- Squad members can update scratchpad
drop policy if exists "squad_scratchpads_update" on public.squad_scratchpads;
create policy "squad_scratchpads_update" on public.squad_scratchpads
  for update using (
    public.is_squad_member(squad_id, auth.uid())
  );

-- Note: In-app notifications insert policy remains restricted to server actions
-- to prevent client notification spam. Nudges are validated with squad membership
-- and 15-minute rate-limiting in nudgeTeammateProfile.
