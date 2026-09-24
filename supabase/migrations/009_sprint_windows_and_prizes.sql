-- 009_sprint_windows_and_prizes.sql
-- Supports multi-day sprint windows (Kickoff vs Submission cutoff) and verified cash vs vanity perk prize pools

-- 1. Extend event_stages with explicit operational boundaries
ALTER TABLE public.event_stages
  ADD COLUMN IF NOT EXISTS window_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS window_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actionable_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS raw_date_snippet TEXT;

-- Backfill actionable_deadline and window_end with existing deadline where null
UPDATE public.event_stages
SET 
  actionable_deadline = COALESCE(actionable_deadline, deadline),
  window_end = COALESCE(window_end, deadline)
WHERE actionable_deadline IS NULL OR window_end IS NULL;

-- 2. Extend events with structured prize pool metrics
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS prize_cash_pool TEXT,
  ADD COLUMN IF NOT EXISTS prize_first_place TEXT,
  ADD COLUMN IF NOT EXISTS has_perks_or_credits BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS raw_prize_text TEXT,
  ADD COLUMN IF NOT EXISTS prize_display_summary TEXT;

-- Backfill prize_display_summary with existing prize_pool where null
UPDATE public.events
SET prize_display_summary = COALESCE(prize_display_summary, prize_pool)
WHERE prize_display_summary IS NULL;

-- Create index on actionable_deadline for high-performance cron reminder evaluations
CREATE INDEX IF NOT EXISTS idx_event_stages_actionable_deadline ON public.event_stages(actionable_deadline);
CREATE INDEX IF NOT EXISTS idx_event_stages_window_start ON public.event_stages(window_start);
