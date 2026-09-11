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
