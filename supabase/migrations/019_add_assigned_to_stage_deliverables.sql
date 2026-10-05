-- Migration 019: Separate deliverable claiming from completion tracking
-- Adds assigned_to for task ownership, while preserving done_by/done_at for completion history.

ALTER TABLE public.stage_deliverables 
ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stage_deliverables_assigned_to 
ON public.stage_deliverables(assigned_to);

COMMENT ON COLUMN public.stage_deliverables.assigned_to IS 'User profile assigned/claiming ownership of this deliverable';
COMMENT ON COLUMN public.stage_deliverables.done_by IS 'User profile who marked this deliverable as completed';
COMMENT ON COLUMN public.stage_deliverables.done_at IS 'Timestamp when this deliverable was marked as completed';
