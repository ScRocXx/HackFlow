-- 010_universal_parser_and_tba_dates.sql
-- Supports competitions with unannounced/TBA dates and universal platforms

-- 1. Make deadline column nullable in event_stages
ALTER TABLE public.event_stages ALTER COLUMN deadline DROP NOT NULL;

-- 2. Drop restrictive stage_type check constraint if present to allow 'hackathon_sprint' and custom stages
ALTER TABLE public.event_stages DROP CONSTRAINT IF EXISTS event_stages_stage_type_check;

-- 3. Drop restrictive source_platform check constraint if present to allow any platform/domain
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_source_platform_check;
