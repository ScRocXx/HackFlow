-- ==============================================================================
-- 015_remedy_architecture.sql: Multi-Tenant Isolation, Scoped Realtime & Stage Integrity
-- ==============================================================================

-- 1. Remove dangerous global unique constraint on source_url
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_source_url_key;

-- 2. Scope uniqueness per squad or creator (multi-tenant safe)
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_squad_source_url 
ON public.events (squad_id, source_url) 
WHERE squad_id IS NOT NULL AND source_url IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_creator_source_url 
ON public.events (created_by, source_url) 
WHERE squad_id IS NULL AND source_url IS NOT NULL;

-- 3. Restore foreign key on active_stage_id with ON DELETE SET NULL
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_events_active_stage' AND table_name = 'events'
  ) THEN
    ALTER TABLE public.events 
      ADD CONSTRAINT fk_events_active_stage 
      FOREIGN KEY (active_stage_id) 
      REFERENCES public.event_stages(id) 
      ON DELETE SET NULL;
  END IF;
END $$;

-- 4. Add nullable event_id to stage_deliverables for scoped Realtime & tenant safety
-- NOTE: Kept nullable to preserve compatibility with existing RPCs and inserts
ALTER TABLE public.stage_deliverables 
  ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE CASCADE;

-- Backfill event_id from parent stage
UPDATE public.stage_deliverables sd
SET event_id = es.event_id
FROM public.event_stages es
WHERE sd.stage_id = es.id AND sd.event_id IS NULL;

-- Index for fast filtered lookups and Realtime scoping
CREATE INDEX IF NOT EXISTS idx_stage_deliverables_event_id 
ON public.stage_deliverables(event_id);

-- 5. Trigger to automatically backfill event_id if an insert specifies only stage_id
CREATE OR REPLACE FUNCTION public.trg_fn_set_stage_deliverable_event_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_id IS NULL AND NEW.stage_id IS NOT NULL THEN
    SELECT event_id INTO NEW.event_id
    FROM public.event_stages
    WHERE id = NEW.stage_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_stage_deliverable_event_id ON public.stage_deliverables;
CREATE TRIGGER trg_set_stage_deliverable_event_id
BEFORE INSERT ON public.stage_deliverables
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_set_stage_deliverable_event_id();

-- 6. Atomic active_stage_id recompute trigger
CREATE OR REPLACE FUNCTION public.trg_fn_recompute_active_stage()
RETURNS TRIGGER AS $$
DECLARE
  v_target_event_id UUID;
  v_next_stage_id UUID;
BEGIN
  v_target_event_id := COALESCE(NEW.event_id, OLD.event_id);

  -- Pick lowest uncompleted round, or fallback to lowest round overall
  SELECT id INTO v_next_stage_id
  FROM public.event_stages
  WHERE event_id = v_target_event_id AND is_completed = false
  ORDER BY round_number ASC
  LIMIT 1;

  IF v_next_stage_id IS NULL THEN
    SELECT id INTO v_next_stage_id
    FROM public.event_stages
    WHERE event_id = v_target_event_id
    ORDER BY round_number ASC
    LIMIT 1;
  END IF;

  UPDATE public.events
  SET active_stage_id = v_next_stage_id
  WHERE id = v_target_event_id;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_recompute_active_stage ON public.event_stages;
CREATE TRIGGER trg_recompute_active_stage
AFTER INSERT OR UPDATE OF is_completed OR DELETE ON public.event_stages
FOR EACH ROW EXECUTE FUNCTION public.trg_fn_recompute_active_stage();

-- 7. Update create_event_with_stages RPC to explicitly supply event_id to stage_deliverables
CREATE OR REPLACE FUNCTION public.create_event_with_stages(
  p_event JSONB,
  p_stages JSONB,
  p_deliverables JSONB DEFAULT '[]'::JSONB,
  p_resources JSONB DEFAULT '[]'::JSONB,
  p_creator_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_event_id UUID;
  v_first_stage_id UUID;
  v_stage_record JSONB;
  v_inserted_stage_id UUID;
  v_deliverable_record JSONB;
  v_resource_record JSONB;
  v_stage_id_by_round JSONB := '{}'::JSONB;
  v_stage_round INT;
BEGIN
  IF p_creator_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- 1. Insert Event
  INSERT INTO public.events (
    created_by,
    title,
    organizer,
    source_url,
    source_platform,
    mode,
    location,
    banner_url,
    prize_pool,
    prize_cash_pool,
    prize_first_place,
    has_perks_or_credits,
    raw_prize_text,
    prize_display_summary,
    overview,
    eligibility,
    team_size_min,
    team_size_max,
    squad_id,
    status,
    active_stage_id
  ) VALUES (
    p_creator_id,
    COALESCE(p_event->>'title', 'Untitled Event'),
    COALESCE(p_event->>'organizer', ''),
    NULLIF(p_event->>'source_url', ''),
    COALESCE(p_event->>'source_platform', 'custom'),
    COALESCE(p_event->>'mode', 'online'),
    COALESCE(p_event->>'location', ''),
    COALESCE(p_event->>'banner_url', ''),
    COALESCE(p_event->>'prize_pool', ''),
    p_event->>'prize_cash_pool',
    p_event->>'prize_first_place',
    COALESCE((p_event->>'has_perks_or_credits')::BOOLEAN, false),
    p_event->>'raw_prize_text',
    p_event->>'prize_display_summary',
    COALESCE(p_event->>'overview', ''),
    COALESCE(p_event->>'eligibility', ''),
    COALESCE((p_event->>'team_size_min')::INT, 1),
    COALESCE((p_event->>'team_size_max')::INT, 4),
    NULLIF(p_event->>'squad_id', '')::UUID,
    COALESCE(p_event->>'status', 'registered'),
    NULL
  )
  RETURNING id INTO v_event_id;

  -- 2. Insert Stages
  FOR v_stage_record IN SELECT * FROM jsonb_array_elements(p_stages)
  LOOP
    v_stage_round := COALESCE((v_stage_record->>'round_number')::INT, 1);
    
    INSERT INTO public.event_stages (
      event_id,
      round_number,
      title,
      stage_type,
      deadline,
      window_start,
      window_end,
      actionable_deadline,
      raw_date_snippet,
      evaluation_format,
      deliverables_description,
      is_completed
    ) VALUES (
      v_event_id,
      v_stage_round,
      COALESCE(v_stage_record->>'title', 'Stage'),
      COALESCE(v_stage_record->>'stage_type', 'other'),
      (v_stage_record->>'deadline')::TIMESTAMPTZ,
      (v_stage_record->>'window_start')::TIMESTAMPTZ,
      (v_stage_record->>'window_end')::TIMESTAMPTZ,
      (v_stage_record->>'actionable_deadline')::TIMESTAMPTZ,
      v_stage_record->>'raw_date_snippet',
      COALESCE(v_stage_record->>'evaluation_format', ''),
      COALESCE(v_stage_record->>'deliverables_description', ''),
      false
    )
    RETURNING id INTO v_inserted_stage_id;

    v_stage_id_by_round := jsonb_set(
      v_stage_id_by_round, 
      ARRAY[v_stage_round::TEXT], 
      to_jsonb(v_inserted_stage_id::TEXT)
    );

    IF v_first_stage_id IS NULL THEN
      v_first_stage_id := v_inserted_stage_id;
    END IF;
  END LOOP;

  -- 3. Link active_stage_id to first stage
  IF v_first_stage_id IS NOT NULL THEN
    UPDATE public.events 
    SET active_stage_id = v_first_stage_id 
    WHERE id = v_event_id;
  END IF;

  -- 4. Insert Deliverables (with explicit event_id)
  IF p_deliverables IS NOT NULL AND jsonb_array_length(p_deliverables) > 0 THEN
    FOR v_deliverable_record IN SELECT * FROM jsonb_array_elements(p_deliverables)
    LOOP
      DECLARE
        v_target_stage_id UUID;
        v_round_key TEXT := v_deliverable_record->>'round_number';
      BEGIN
        IF v_round_key IS NOT NULL AND v_stage_id_by_round ? v_round_key THEN
          v_target_stage_id := (v_stage_id_by_round->>v_round_key)::UUID;
        ELSE
          v_target_stage_id := v_first_stage_id;
        END IF;

        IF v_target_stage_id IS NOT NULL THEN
          INSERT INTO public.stage_deliverables (
            stage_id,
            event_id,
            title,
            sort_order,
            is_done
          ) VALUES (
            v_target_stage_id,
            v_event_id,
            COALESCE(v_deliverable_record->>'title', 'Deliverable'),
            COALESCE((v_deliverable_record->>'sort_order')::INT, 0),
            false
          );
        END IF;
      END;
    END LOOP;
  END IF;

  -- 5. Insert Resources
  IF p_resources IS NOT NULL AND jsonb_array_length(p_resources) > 0 THEN
    FOR v_resource_record IN SELECT * FROM jsonb_array_elements(p_resources)
    LOOP
      INSERT INTO public.event_resources (
        event_id,
        title,
        url,
        resource_type
      ) VALUES (
        v_event_id,
        COALESCE(v_resource_record->>'title', 'Resource'),
        COALESCE(v_resource_record->>'url', ''),
        COALESCE(v_resource_record->>'resource_type', 'other')
      );
    END LOOP;
  END IF;

  -- 6. Insert Creator Participant
  INSERT INTO public.event_participants (
    event_id,
    user_id,
    role
  ) VALUES (
    v_event_id,
    p_creator_id,
    'lead'
  )
  ON CONFLICT DO NOTHING;

  -- 7. Add Squad Members if squad_id specified
  IF NULLIF(p_event->>'squad_id', '') IS NOT NULL THEN
    INSERT INTO public.event_participants (event_id, user_id, role)
    SELECT v_event_id, sm.user_id, 'collaborator'
    FROM public.squad_members sm
    WHERE sm.squad_id = (p_event->>'squad_id')::UUID
      AND sm.user_id != p_creator_id
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'id', v_event_id,
    'title', p_event->>'title',
    'active_stage_id', v_first_stage_id
  );
END;
$$;
