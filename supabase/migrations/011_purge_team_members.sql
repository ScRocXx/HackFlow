-- Migration 011: Purge obsolete team_members table and standardize on event_participants

-- 1. Ensure any legacy team_members are migrated to event_participants if not already present
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'team_members') THEN
    INSERT INTO public.event_participants (event_id, user_id, role, joined_at)
    SELECT 
      tm.event_id, 
      tm.user_id, 
      CASE WHEN tm.role = 'owner' THEN 'lead' ELSE 'collaborator' END,
      COALESCE(tm.joined_at, tm.invited_at, now())
    FROM public.team_members tm
    WHERE tm.user_id IS NOT NULL
    ON CONFLICT (event_id, user_id) DO NOTHING;

    -- 2. Drop legacy team_members table and dependent foreign keys
    DROP TABLE public.team_members CASCADE;
  END IF;
END $$;
