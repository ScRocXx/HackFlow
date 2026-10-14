-- ==============================================================================
-- 020_fix_vault_rls.sql: Restrict Vault Profiles & Assets to Squad Teammates
-- ==============================================================================

-- 1. Helper function to check if two users share at least one squad
CREATE OR REPLACE FUNCTION public.shares_squad_with(target_user_id uuid, check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.squad_members sm1
    JOIN public.squad_members sm2 ON sm1.squad_id = sm2.squad_id
    WHERE sm1.user_id = target_user_id
      AND sm2.user_id = check_user_id
  );
$$;

-- 2. Restrict team_vault_profiles SELECT policy
DROP POLICY IF EXISTS "Squad can view all vault profiles" ON public.team_vault_profiles;
DROP POLICY IF EXISTS "Users and squad teammates can view vault profiles" ON public.team_vault_profiles;

CREATE POLICY "Users and squad teammates can view vault profiles"
  ON public.team_vault_profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR public.shares_squad_with(user_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.friendships
      WHERE status = 'accepted'
        AND ((sender_id = auth.uid() AND receiver_id = team_vault_profiles.user_id)
          OR (receiver_id = auth.uid() AND sender_id = team_vault_profiles.user_id))
    )
  );

-- 3. Restrict team_vault_assets SELECT policy
DROP POLICY IF EXISTS "Squad can view all vault assets" ON public.team_vault_assets;
DROP POLICY IF EXISTS "Users and squad teammates can view vault assets" ON public.team_vault_assets;

CREATE POLICY "Users and squad teammates can view vault assets"
  ON public.team_vault_assets FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR (squad_id IS NOT NULL AND public.is_squad_member(squad_id, auth.uid()))
  );
