-- ==============================================================================
-- 017_mission_brief.sql: 4-Part Mission Brief Upgrade
-- ==============================================================================

-- 1. Add mission_brief JSONB column to public.events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS mission_brief JSONB DEFAULT NULL;

-- 2. Add GIN index for querying mission_brief JSONB
CREATE INDEX IF NOT EXISTS idx_events_mission_brief
  ON public.events USING GIN (mission_brief);

-- 3. Update create_event_with_stages RPC to persist mission_brief
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
    active_stage_id,
    mission_brief
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
    NULL,
    p_event->'mission_brief'
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

  -- 4. Insert Deliverables
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
            title,
            sort_order,
            is_done
          ) VALUES (
            v_target_stage_id,
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
