'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getDefaultDeliverables } from '@/lib/deliverables/templates';

export async function completeStage(stageId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    // 1. Fetch current stage and event info BEFORE any update
    const { data: currentStage, error: stageError } = await supabase
      .from('event_stages')
      .select('*, events!event_stages_event_id_fkey(id, created_by, squad_id)')
      .eq('id', stageId)
      .single();

    if (stageError || !currentStage) return { success: false, error: stageError?.message || 'Stage not found' };

    // 2. Strict authorization: Verify user is event creator, participant, or squad member
    const eventData = (currentStage as any).events;
    const isCreator = eventData?.created_by === user.id;

    let isAuthorized = isCreator;
    if (!isAuthorized) {
      const [participantRes, squadRes] = await Promise.all([
        supabase
          .from('event_participants')
          .select('id')
          .eq('event_id', currentStage.event_id)
          .eq('user_id', user.id)
          .maybeSingle(),
        eventData?.squad_id
          ? supabase
              .from('squad_members')
              .select('id')
              .eq('squad_id', eventData.squad_id)
              .eq('user_id', user.id)
              .maybeSingle()
          : Promise.resolve({ data: null })
      ]);

      if (participantRes.data || squadRes.data) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return { success: false, error: 'You are not authorized to modify this event' };
    }

    // 3. Mark current stage completed
    const { error: updateError } = await supabase
      .from('event_stages')
      .update({ is_completed: true, completed_at: new Date().toISOString() })
      .eq('id', stageId);

    if (updateError) return { success: false, error: updateError.message };

    // 4. Get all stages for event to find the next one
    const { data: allStages } = await supabase
      .from('event_stages')
      .select('*')
      .eq('event_id', currentStage.event_id)
      .order('round_number', { ascending: true });

    if (!allStages) return { success: false, error: 'Failed to fetch event stages' };

    const nextStage = allStages.find(s => s.round_number > currentStage.round_number);

    if (nextStage) {
      // Move to next stage
      await supabase
        .from('events')
        .update({ active_stage_id: nextStage.id })
        .eq('id', currentStage.event_id);

      // Guard: only insert default deliverables if no deliverables already exist for this stage
      const { count } = await supabase
        .from('stage_deliverables')
        .select('*', { count: 'exact', head: true })
        .eq('stage_id', nextStage.id);

      if (!count || count === 0) {
        const defaultDeliverables = getDefaultDeliverables(nextStage.stage_type);
        if (defaultDeliverables && defaultDeliverables.length > 0) {
          const deliverablesToInsert = defaultDeliverables.map((title, index) => ({
            stage_id: nextStage.id,
            event_id: currentStage.event_id,
            title,
            sort_order: index,
            is_done: false,
          }));
          await supabase.from('stage_deliverables').insert(deliverablesToInsert);
        }
      }
    } else {
      // Event complete
      await supabase
        .from('events')
        .update({ active_stage_id: null, status: 'submitted' })
        .eq('id', currentStage.event_id);
    }

    revalidatePath(`/events/${currentStage.event_id}`);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to complete stage' };
  }
}

export async function updateStageDeadline(stageId: string, newDeadline: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: stage } = await supabase
      .from('event_stages')
      .select('event_id')
      .eq('id', stageId)
      .single();

    if (!stage) return { success: false, error: 'Stage not found' };

    // Verify participant or creator
    const { data: participant } = await supabase
      .from('event_participants')
      .select('id')
      .eq('event_id', stage.event_id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!participant) {
      const { data: ev } = await supabase
        .from('events')
        .select('created_by')
        .eq('id', stage.event_id)
        .single();
      if (ev?.created_by !== user.id) {
        return { success: false, error: 'Not a team participant' };
      }
    }

    const { error } = await supabase
      .from('event_stages')
      .update({ deadline: newDeadline })
      .eq('id', stageId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/events/${stage.event_id}`);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update stage deadline' };
  }
}
