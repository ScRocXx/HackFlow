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
    deliverables?: string[];
  }[];
};

export async function createEvent(data: CreateEventInput) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { success: false, error: 'You must be signed in to create an event' };
    }

    if (!data.title || data.title.trim().length === 0) {
      return { success: false, error: 'Event title is required' };
    }

    // 1. Insert Event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        title: data.title.trim(),
        organizer: data.organizer || '',
        source_url: data.source_url || null,
        source_platform: data.source_platform || 'custom',
        mode: data.mode || 'online',
        location: data.location || '',
        banner_url: data.banner_url || '',
        prize_pool: data.prize_pool || '',
        overview: data.overview || '',
        eligibility: data.eligibility || '',
        team_size_min: data.team_size_min || 1,
        team_size_max: data.team_size_max || 4,
        created_by: user.id,
        status: 'registered'
      })
      .select('*')
      .single();

    if (eventError || !event) {
      return { success: false, error: `Failed to create event: ${eventError?.message || 'Database error'}` };
    }

    // 2. Prepare and Insert Stages
    const stagesData = (data.stages && data.stages.length > 0) 
      ? data.stages 
      : [{
          round_number: 1,
          title: 'Round 1: Final Submission',
          stage_type: 'prototype',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          evaluation_format: 'Online Evaluation',
          deliverables_description: 'Working prototype and presentation'
        }];

    const stagesToInsert = stagesData.map((stage, idx) => ({
      event_id: event.id,
      round_number: stage.round_number || idx + 1,
      title: stage.title.trim() || `Round ${idx + 1}`,
      stage_type: stage.stage_type || 'other',
      deadline: stage.deadline,
      evaluation_format: stage.evaluation_format || '',
      deliverables_description: stage.deliverables_description || '',
      is_completed: false,
    }));

    const { data: stages, error: stagesError } = await supabase
      .from('event_stages')
      .insert(stagesToInsert)
      .select('*')
      .order('round_number', { ascending: true });

    if (stagesError || !stages || stages.length === 0) {
      // Rollback the created event to prevent orphan
      await supabase.from('events').delete().eq('id', event.id);
      return { success: false, error: `Failed to create event stages: ${stagesError?.message || 'Database error'}` };
    }

    const firstStage = stages[0];

    // 3. Set Active Stage ID
    const { error: updateError } = await supabase
      .from('events')
      .update({ active_stage_id: firstStage.id })
      .eq('id', event.id);

    if (updateError) {
      console.error('Failed to set active stage:', updateError);
    }

    // 4. Generate deliverables for the first stage
    let deliverablesTitles: string[] = [];
    if (stagesData[0]?.deliverables && stagesData[0].deliverables.length > 0) {
      deliverablesTitles = stagesData[0].deliverables;
    } else if (stagesData[0]?.deliverables_description) {
      deliverablesTitles = stagesData[0].deliverables_description
        .split(/[,;\n]+/)
        .map(s => s.trim())
        .filter(Boolean);
    }
    
    if (deliverablesTitles.length === 0) {
      deliverablesTitles = getDefaultDeliverables(firstStage.stage_type);
    }

    if (deliverablesTitles.length > 0) {
      const deliverablesToInsert = deliverablesTitles.map((title, index) => ({
        stage_id: firstStage.id,
        title,
        sort_order: index,
        is_done: false,
      }));

      await supabase.from('stage_deliverables').insert(deliverablesToInsert);
    }

    // 5. Add Creator to Team Members
    await supabase.from('team_members').insert({
      event_id: event.id,
      user_id: user.id,
      email: user.email || '',
      role: 'owner',
      joined_at: new Date().toISOString()
    });

    revalidatePath('/dashboard');
    return { success: true, data: event };
  } catch (error: any) {
    console.error('Error creating event:', error);
    return { success: false, error: error.message || 'An unexpected error occurred while saving the event' };
  }
}

export async function updateEventStatus(eventId: string, status: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    // Update status
    const { data: event, error: updateError } = await supabase
      .from('events')
      .update({ status })
      .eq('id', eventId)
      .select('*')
      .single();

    if (updateError) return { success: false, error: updateError.message };

    // If status updated to 'registered' and no active stage, assign first stage
    if (status === 'registered' && !event.active_stage_id) {
      const { data: firstStage } = await supabase
        .from('event_stages')
        .select('id')
        .eq('event_id', eventId)
        .order('round_number', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (firstStage) {
        await supabase
          .from('events')
          .update({ active_stage_id: firstStage.id })
          .eq('id', eventId);
      }
    }

    revalidatePath('/dashboard');
    revalidatePath(`/events/${eventId}`);
    return { success: true, data: event };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update event status' };
  }
}

export async function deleteEvent(eventId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    // Check if user is owner or creator
    const { data: event } = await supabase
      .from('events')
      .select('created_by')
      .eq('id', eventId)
      .single();

    if (event?.created_by !== user.id) {
      const { data: member } = await supabase
        .from('team_members')
        .select('role')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (member?.role !== 'owner') {
        return { success: false, error: 'Only team owners can delete events' };
      }
    }

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

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

    // Fetch event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError || !event) {
      return { success: false, error: eventError?.message || 'Event not found' };
    }

    // Fetch stages
    const { data: stages } = await supabase
      .from('event_stages')
      .select('*')
      .eq('event_id', eventId)
      .order('round_number', { ascending: true });

    // Fetch team members with profile information
    const { data: teamMembers } = await supabase
      .from('team_members')
      .select(`
        *,
        profile:profiles(full_name, avatar_url)
      `)
      .eq('event_id', eventId);

    // Fetch deliverables for active stage
    let deliverables: any[] = [];
    const activeStageId = event.active_stage_id || stages?.[0]?.id;
    if (activeStageId) {
      const { data: delivData } = await supabase
        .from('stage_deliverables')
        .select('*')
        .eq('stage_id', activeStageId)
        .order('sort_order', { ascending: true });
      if (delivData) deliverables = delivData;
    }

    return { 
      success: true, 
      data: { 
        ...event, 
        stages: stages || [], 
        team_members: teamMembers || [],
        current_stage_deliverables: deliverables 
      } 
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch event details' };
  }
}

export async function getUserEvents() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    // 1. Get event IDs from team_members
    const { data: members } = await supabase
      .from('team_members')
      .select('event_id')
      .eq('user_id', user.id);

    const memberEventIds = members?.map(m => m.event_id) || [];

    // 2. Fetch events where user is creator OR in team_members
    let query = supabase.from('events').select('*');
    if (memberEventIds.length > 0) {
      query = query.or(`created_by.eq.${user.id},id.in.(${memberEventIds.join(',')})`);
    } else {
      query = query.eq('created_by', user.id);
    }

    const { data: events, error: eventsError } = await query.order('created_at', { ascending: false });

    if (eventsError || !events) {
      console.error('Error fetching user events:', eventsError);
      return { success: true, data: [] };
    }

    if (events.length === 0) return { success: true, data: [] };

    const eventIds = events.map(e => e.id);

    // 3. Fetch all stages for these events
    const { data: allStages } = await supabase
      .from('event_stages')
      .select('*')
      .in('event_id', eventIds)
      .order('round_number', { ascending: true });

    // 4. Fetch team members count for these events
    const { data: allTeamMembers } = await supabase
      .from('team_members')
      .select('event_id, id')
      .in('event_id', eventIds);

    // 5. Fetch deliverables for all active stages
    const activeStageIds = events.map(e => e.active_stage_id).filter(Boolean);
    let allDeliverables: any[] = [];
    if (activeStageIds.length > 0) {
      const { data: delivs } = await supabase
        .from('stage_deliverables')
        .select('stage_id, is_done')
        .in('stage_id', activeStageIds);
      if (delivs) allDeliverables = delivs;
    }

    // 6. Enrich each event
    const enrichedEvents = events.map(event => {
      const stagesForEvent = allStages?.filter(s => s.event_id === event.id) || [];
      
      // Determine active stage: matching active_stage_id or first non-completed stage or first stage
      let activeStage = stagesForEvent.find(s => s.id === event.active_stage_id);
      if (!activeStage && stagesForEvent.length > 0) {
        activeStage = stagesForEvent.find(s => !s.is_completed) || stagesForEvent[0];
      }

      // Calculate deliverables progress for active stage
      let deliverable_progress = { done: 0, total: 0 };
      if (activeStage) {
        const stageDelivs = allDeliverables.filter(d => d.stage_id === activeStage.id);
        const doneCount = stageDelivs.filter(d => d.is_done).length;
        deliverable_progress = {
          done: doneCount,
          total: stageDelivs.length
        };
      }

      // Team count
      const teamCount = allTeamMembers?.filter(m => m.event_id === event.id).length || 1;

      return {
        ...event,
        active_stage: activeStage,
        stages: stagesForEvent,
        deliverable_progress,
        team_count: teamCount
      };
    });

    // Sort events by nearest active deadline
    const sortedEvents = enrichedEvents.sort((a, b) => {
      const deadlineA = a.active_stage?.deadline ? new Date(a.active_stage.deadline).getTime() : Infinity;
      const deadlineB = b.active_stage?.deadline ? new Date(b.active_stage.deadline).getTime() : Infinity;
      return deadlineA - deadlineB;
    });

    return { success: true, data: sortedEvents };
  } catch (error: any) {
    console.error('Error in getUserEvents:', error);
    return { success: false, error: error.message || 'Failed to fetch user events' };
  }
}
