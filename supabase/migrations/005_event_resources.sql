-- 005_event_resources.sql

-- Create event_resources table
create table if not exists public.event_resources (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.events(id) on delete cascade not null,
  title text not null,
  url text not null,
  resource_type text check (resource_type in ('problem_statement', 'rulebook', 'template', 'dataset', 'reference', 'other')) default 'other',
  is_official boolean default true,
  created_at timestamptz default now()
);

-- Index on event_id
create index if not exists idx_event_resources_event_id on public.event_resources(event_id);

-- Enable RLS
alter table public.event_resources enable row level security;

-- Drop existing policies if any
drop policy if exists "Users can view resources for their events" on public.event_resources;
drop policy if exists "Users can insert resources for their events" on public.event_resources;
drop policy if exists "Users can delete resources for their events" on public.event_resources;

-- RLS Policies
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

-- Realtime publication
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.event_resources;
  end if;
exception
  when duplicate_object then null;
end $$;
