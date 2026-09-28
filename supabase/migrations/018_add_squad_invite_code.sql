-- ==============================================================================
-- 018_add_squad_invite_code.sql: Add invite code to squads for shareable links
-- ==============================================================================

-- Add invite code column to squads
ALTER TABLE public.squads
ADD COLUMN IF NOT EXISTS invite_code VARCHAR(8) UNIQUE;

-- Generate codes for existing squads
UPDATE public.squads
SET invite_code = UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8))
WHERE invite_code IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE public.squads
ALTER COLUMN invite_code SET NOT NULL;

-- Default for new squads
ALTER TABLE public.squads
ALTER COLUMN invite_code SET DEFAULT UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8));

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_squads_invite_code ON public.squads(invite_code);

-- Update squads select policy so anyone authenticated can lookup squads by invite code
DROP POLICY IF EXISTS "squads_select" ON public.squads;
CREATE POLICY "squads_select" ON public.squads
  FOR SELECT USING (
    created_by = auth.uid() 
    OR public.is_squad_member(id, auth.uid()) 
    OR invite_code IS NOT NULL
  );
