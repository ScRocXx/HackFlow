-- 002_rls_policies.sql

-- Enable RLS on all tables
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_stages enable row level security;
alter table public.stage_deliverables enable row level security;
alter table public.team_members enable row level security;
alter table public.notification_logs enable row level security;
alter table public.notifications enable row level security;

-- Profiles: users can read all profiles, update only their own
create policy "Profiles are viewable by everyone" on public.profiles
  for select using (true);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- Events: users can CRUD events where they are a team member (via team_members join). 
-- For INSERT, allow any authenticated user.
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

-- Event stages: inherit access from parent event via team_members
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

-- Stage deliverables: inherit access from parent event_stage -> event
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

-- Team members: owners can manage (insert/delete), members can view their own event's team
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

-- Notification logs: allow insert for authenticated users
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

-- Notifications: users can only see/update their own notifications
create policy "Users can view their own notifications" on public.notifications
  for select using (user_id = auth.uid());

create policy "Users can update their own notifications" on public.notifications
  for update using (user_id = auth.uid());

create policy "Users can delete their own notifications" on public.notifications
  for delete using (user_id = auth.uid());
