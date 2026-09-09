'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getDefaultDeliverables } from '@/lib/deliverables/templates';

export type CreateEventInput = {
  title: string;
  organizer?: string;
  source_url?: string;
  source_platform?: string;
  mode?: string;
  location?: string;
  banner_url?: string;
  prize_pool?: string;
  overview?: string;
  eligibility?: string;
  team_size_min?: number;
  team_size_max?: number;
  stages: {
    round_number: number;
    title: string;
    stage_type: string;
    deadline: string;
    evaluation_format?: string;
    deliverables_description?: string;
  }[];
};

export async function createEvent(data: CreateEventInput) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Insert event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        title: data.title,
        organizer: data.organizer,
        source_url: data.source_url,
        source_platform: data.source_platform,
        mode: data.mode,
        location: data.location,
        banner_url: data.banner_url,
        prize_pool: data.prize_pool,
        overview: data.overview,
        eligibility: data.eligibility,
        team_size_min: data.team_size_min,
        team_size_max: data.team_size_max,
        created_by: user.id,
        status: 'registered'
      })
      .select('*')
      .single();

    if (eventError || !event) {
      return { success: false, error: eventError?.message || 'Failed to create event' };
    }

    // Insert stages
    const stagesToInsert = data.stages.map((stage) => ({
      ...stage,
      event_id: event.id,
      is_completed: false,
    }));

    const { data: stages, error: stagesError } = await supabase
      .from('event_stages')
      .insert(stagesToInsert)
      .select('*')
      .order('round_number', { ascending: true });

    if (stagesError || !stages || stages.length === 0) {
      return { success: false, error: stagesError?.message || 'Failed to create stages' };
    }

    const firstStage = stages[0];

    // Set active stage ID
    const { error: updateError } = await supabase
      .from('events')
      .update({ active_stage_id: firstStage.id })
      .eq('id', event.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Generate deliverables
    const defaultDeliverables = getDefaultDeliverables(firstStage.stage_type);
    if (defaultDeliverables && defaultDeliverables.length > 0) {
      const deliverablesToInsert = defaultDeliverables.map((title, index) => ({
        stage_id: firstStage.id,
        title,
        sort_order: index,
        is_done: false,
      }));

      await supabase.from('stage_deliverables').insert(deliverablesToInsert);
    }

    // Insert creator as owner
    await supabase.from('team_members').insert({
      event_id: event.id,
      user_id: user.id,
      role: 'owner',
      joined_at: new Date().toISOString()
    });

    revalidatePath('/dashboard');
    return { success: true, data: event };
  } catch (error: any) {
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}

export async function updateEventStatus(eventId: string, status: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    // Verify member
    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) return { success: false, error: 'Not a team member' };

    const { data: event } = await supabase.from('events').select('active_stage_id').eq('id', eventId).single();

    let updateData: any = { status };

    if (status === 'registered' && event && !event.active_stage_id) {
      const { data: stages } = await supabase
        .from('event_stages')
        .select('id')
        .eq('event_id', eventId)
        .order('round_number', { ascending: true })
        .limit(1);

      if (stages && stages.length > 0) {
        updateData.active_stage_id = stages[0].id;
      }
    }

    const { error } = await supabase.from('events').update(updateData).eq('id', eventId);
    if (error) return { success: false, error: error.message };

    revalidatePath('/dashboard');
    revalidatePath(`/events/${eventId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update event status' };
  }
}

export async function deleteEvent(eventId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: member, error: memberError } = await supabase
      .from('team_members')
      .select('role')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member || member.role !== 'owner') {
      return { success: false, error: 'Only the team owner can delete the event' };
    }

    const { error } = await supabase.from('events').delete().eq('id', eventId);
    if (error) return { success: false, error: error.message };

    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete event' };
  }
}

export async function getEventWithDetails(eventId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: member } = await supabase
      .from('team_members')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .single();

    if (!member) return { success: false, error: 'Access denied' };

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select(`
        *,
        stages:event_stages(*),
        team_members:team_members(*)
      `)
      .eq('id', eventId)
      .single();

    if (eventError || !event) return { success: false, error: eventError?.message || 'Event not found' };

    let deliverables = [];
    if (event.active_stage_id) {
      const { data: delivData } = await supabase
        .from('stage_deliverables')
        .select('*')
        .eq('stage_id', event.active_stage_id)
        .order('sort_order', { ascending: true });
      if (delivData) deliverables = delivData;
    }

    return { success: true, data: { ...event, current_stage_deliverables: deliverables } };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch event details' };
  }
}

export async function getUserEvents() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: members, error: membersError } = await supabase
      .from('team_members')
      .select('event_id')
      .eq('user_id', user.id);

    if (membersError || !members) return { success: false, error: membersError?.message || 'Failed to fetch events' };

    const eventIds = members.map(m => m.event_id);

    if (eventIds.length === 0) return { success: true, data: [] };

    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select(`
        *,
        active_stage:event_stages!events_active_stage_id_fkey(title, deadline)
      `)
      .in('id', eventIds);

    if (eventsError) return { success: false, error: eventsError.message };

    const sortedEvents = (events || []).sort((a, b) => {
      const deadlineA = a.active_stage?.deadline ? new Date(a.active_stage.deadline).getTime() : Infinity;
      const deadlineB = b.active_stage?.deadline ? new Date(b.active_stage.deadline).getTime() : Infinity;
      return deadlineA - deadlineB;
    });

    return { success: true, data: sortedEvents };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch user events' };
  }
}
