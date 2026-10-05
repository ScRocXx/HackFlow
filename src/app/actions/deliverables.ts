'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function toggleDeliverable(deliverableId: string, isDone: boolean) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    const updateData = isDone
      ? { is_done: true, done_by: user.id, done_at: new Date().toISOString() }
      : { is_done: false, done_by: null, done_at: null };

    const { data, error } = await supabase
      .from('stage_deliverables')
      .update(updateData)
      .eq('id', deliverableId)
      .select('stage_id')
      .single();

    if (error || !data) return { success: false, error: error?.message || 'Failed to update deliverable' };

    const { data: stage } = await supabase.from('event_stages').select('event_id').eq('id', data.stage_id).single();
    if (stage) {
      revalidatePath(`/events/${stage.event_id}`);
      revalidatePath('/dashboard');
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to toggle deliverable' };
  }
}

export async function claimDeliverable(deliverableId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: current, error: fetchErr } = await supabase
      .from('stage_deliverables')
      .select('assigned_to, done_by, stage_id')
      .eq('id', deliverableId)
      .single();

    if (fetchErr || !current) return { success: false, error: fetchErr?.message || 'Deliverable not found' };

    // Disambiguate ownership: use assigned_to as primary source of ownership
    const currentAssignee = current.assigned_to;
    const isAlreadyClaimedByUser = currentAssignee === user.id;
    const nextAssignee = isAlreadyClaimedByUser ? null : user.id;

    let updateRes = await supabase
      .from('stage_deliverables')
      .update({ assigned_to: nextAssignee })
      .eq('id', deliverableId);

    // Backward-compatibility: if assigned_to column is pending migration, fallback gracefully
    if (updateRes.error && updateRes.error.message?.includes('assigned_to')) {
      updateRes = await supabase
        .from('stage_deliverables')
        .update({ done_by: nextAssignee })
        .eq('id', deliverableId);
    }

    if (updateRes.error) return { success: false, error: updateRes.error.message };

    const { data: stage } = await supabase.from('event_stages').select('event_id').eq('id', current.stage_id).single();
    if (stage) {
      revalidatePath(`/events/${stage.event_id}`);
      revalidatePath('/dashboard');
    }

    return { success: true, claimed: !isAlreadyClaimedByUser, userId: isAlreadyClaimedByUser ? null : user.id };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to claim deliverable' };
  }
}

export async function addDeliverable(stageId: string, title: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: existing } = await supabase
      .from('stage_deliverables')
      .select('sort_order')
      .eq('stage_id', stageId)
      .order('sort_order', { ascending: false })
      .limit(1);

    const nextOrder = (existing && existing.length > 0) ? (existing[0].sort_order || 0) + 1 : 0;

    const { error } = await supabase
      .from('stage_deliverables')
      .insert({
        stage_id: stageId,
        title,
        sort_order: nextOrder,
        is_done: false
      });

    if (error) return { success: false, error: error.message };

    const { data: stage } = await supabase.from('event_stages').select('event_id').eq('id', stageId).single();
    if (stage) {
      revalidatePath(`/events/${stage.event_id}`);
      revalidatePath('/dashboard');
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to add deliverable' };
  }
}

export async function deleteDeliverable(deliverableId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: deliv } = await supabase
      .from('stage_deliverables')
      .select('stage_id')
      .eq('id', deliverableId)
      .single();

    if (!deliv) return { success: false, error: 'Deliverable not found' };

    const { error } = await supabase.from('stage_deliverables').delete().eq('id', deliverableId);
    if (error) return { success: false, error: error.message };

    const { data: stage } = await supabase.from('event_stages').select('event_id').eq('id', deliv.stage_id).single();
    if (stage) {
      revalidatePath(`/events/${stage.event_id}`);
      revalidatePath('/dashboard');
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete deliverable' };
  }
}
