-- 004_realtime.sql

-- Enable realtime publication for specific tables
begin;
  -- Remove the supabase_realtime publication if it exists to recreate it cleanly
  drop publication if exists supabase_realtime;
  
  -- Create the publication
  create publication supabase_realtime;
  
  -- Add tables to the publication
  alter publication supabase_realtime add table public.events;
  alter publication supabase_realtime add table public.event_stages;
  alter publication supabase_realtime add table public.stage_deliverables;
  alter publication supabase_realtime add table public.team_members;
  alter publication supabase_realtime add table public.notifications;
commit;
