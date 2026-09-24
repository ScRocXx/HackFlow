-- 013_drop_circular_fk.sql
-- Drops the circular foreign key fk_active_stage on events(active_stage_id)
-- leaving active_stage_id as an unconstrained UUID to eliminate insertion deadlocks and circular dependency issues.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_active_stage' AND table_name = 'events'
  ) THEN
    ALTER TABLE public.events DROP CONSTRAINT fk_active_stage;
  END IF;
END $$;
