'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { getDefaultDeliverables } from '@/lib/deliverables/templates';
import { createInAppNotification, createBatchInAppNotifications } from '@/lib/notifications/in-app';
import { sendTeamInviteEmail } from '@/lib/notifications/send-email';

export type CreateEventInput = {
  title: string;
  organizer?: string;
  source_url?: string;
  source_platform?: string;
  mode?: string;
  location?: string;
  banner_url?: string;
  prize_pool?: string;
  prize_cash_pool?: number | string | null;
  prize_first_place?: number | string | null;
  has_perks_or_credits?: boolean;
  raw_prize_text?: string | null;
  prize_display_summary?: string | null;
  overview?: string;
  eligibility?: string;
  team_size_min?: number;
  team_size_max?: number;
  squad_id?: string | null;
  stages: {
    round_number: number;
    title: string;
    stage_type: string;
    deadline?: string | null;
    window_start?: string | null;
    window_end?: string | null;
    actionable_deadline?: string | null;
    raw_date_snippet?: string | null;
    evaluation_format?: string;
    deliverables_description?: string;
    deliverables?: string[];
  }[];
  resources?: {
    title: string;
    url: string;
    resource_type: string;
    is_official?: boolean;
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

    // 0. Ensure user profile exists to prevent foreign key violation on events.created_by
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'HackFlow Member',
        avatar_url: user.user_metadata?.avatar_url || null,
      }, { onConflict: 'id' });

    if (profileError) {
      console.warn('Profile sync warning:', profileError);
    }

    // Universal source platform support (preserves any competition host/domain)
    const sourcePlatform = (data.source_platform || 'independent').toLowerCase().trim();

    // Check if an event with this source_url already exists
    if (data.source_url?.trim()) {
      const { data: existingEvent } = await supabase
        .from('events')
        .select('id, title')
        .eq('source_url', data.source_url.trim())
        .maybeSingle();

      if (existingEvent?.id) {
        revalidatePath('/dashboard');
        revalidatePath(`/events/${existingEvent.id}`);
        return { success: true, data: { id: existingEvent.id, title: existingEvent.title } };
      }
    }

    // 1. Insert Event with active_stage_id explicitly NULL (avoids circular FK violation)
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        title: data.title.trim(),
        organizer: data.organizer || '',
        source_url: data.source_url?.trim() || null,
        source_platform: sourcePlatform,
        mode: data.mode || 'online',
        location: data.location || '',
        banner_url: data.banner_url || '',
        prize_pool: data.prize_pool || '',
        prize_cash_pool: data.prize_cash_pool !== null && data.prize_cash_pool !== undefined ? String(data.prize_cash_pool) : null,
        prize_first_place: data.prize_first_place !== null && data.prize_first_place !== undefined ? String(data.prize_first_place) : null,
        has_perks_or_credits: data.has_perks_or_credits ?? false,
        raw_prize_text: data.raw_prize_text || null,
        prize_display_summary: data.prize_display_summary || null,
        overview: data.overview || '',
        eligibility: data.eligibility || '',
        team_size_min: data.team_size_min || 1,
        team_size_max: data.team_size_max || 4,
        created_by: user.id,
        squad_id: data.squad_id || null,
        status: 'registered',
        active_stage_id: null, // explicitly NULL initially
      })
      .select('*')
      .single();

    if (eventError || !event) {
      if (eventError?.message?.includes('infinite recursion')) {
        return {
          success: false,
          error: 'Database policy recursion: Please run supabase/fix_schema_and_rls.sql in your Supabase SQL editor.'
        };
      }
      const detail = eventError?.details ? ` (${eventError.details})` : '';
      const hint = eventError?.hint ? ` [Hint: ${eventError.hint}]` : '';
      return { 
        success: false, 
        error: `Database error creating event: ${eventError?.message || 'Unknown PostgreSQL error'}${detail}${hint}` 
      };
    }

    // 2. Prepare and Insert Stages (Safeguard: Zero synthetic date fabrication)
    const stagesData = (data.stages && data.stages.length > 0) 
      ? data.stages 
      : [{
          round_number: 1,
          title: 'Round 1: Final Submission',
          stage_type: 'prototype',
          deadline: null,
          window_start: null,
          window_end: null,
          actionable_deadline: null,
          raw_date_snippet: 'TBA',
          evaluation_format: 'Online Evaluation',
          deliverables_description: 'Working prototype and presentation'
        }];

    const stagesToInsert = stagesData.map((stage, idx) => {
      const effectiveDeadline = stage.deadline || null;
      const effectiveEnd = stage.window_end || effectiveDeadline;
      const effectiveActionable = stage.actionable_deadline || stage.window_start || effectiveDeadline;
      const rawSnippet = stage.raw_date_snippet || (!effectiveDeadline ? 'TBA' : null);

      return {
        event_id: event.id,
        round_number: stage.round_number || idx + 1,
        title: stage.title.trim() || `Round ${idx + 1}`,
        stage_type: stage.stage_type || 'other',
        deadline: effectiveDeadline,
        window_start: stage.window_start || null,
        window_end: effectiveEnd,
        actionable_deadline: effectiveActionable,
        raw_date_snippet: rawSnippet,
        evaluation_format: stage.evaluation_format || '',
        deliverables_description: stage.deliverables_description || '',
        is_completed: false,
      };
    });

    const { data: stages, error: stagesError } = await supabase
      .from('event_stages')
      .insert(stagesToInsert)
      .select('*')
      .order('round_number', { ascending: true });

    if (stagesError || !stages || stages.length === 0) {
      // Rollback the created event to prevent orphaned records
      await supabase.from('events').delete().eq('id', event.id);
      const detail = stagesError?.details ? ` (${stagesError.details})` : '';
      return { 
        success: false, 
        error: `Database error inserting event stages: ${stagesError?.message || 'Unknown error'}${detail}` 
      };
    }

    const firstStage = stages[0];

    // 3. Update the event's active_stage_id to the ID of the first stage
    const { error: updateStageError } = await supabase
      .from('events')
      .update({ active_stage_id: firstStage.id })
      .eq('id', event.id);

    if (updateStageError) {
      console.error('Failed to link active stage ID:', updateStageError);
      return {
        success: false,
        error: `Database error linking active stage: ${updateStageError.message}`
      };
    }

    // 4. Insert stage_deliverables for EACH stage
    const allDeliverables: Array<{
      stage_id: string;
      title: string;
      sort_order: number;
      is_done: boolean;
    }> = [];

    stages.forEach((insertedStage, stageIdx) => {
      const stageInput = stagesData[stageIdx];
      let deliverablesTitles: string[] = [];

      if (stageInput?.deliverables && stageInput.deliverables.length > 0) {
        deliverablesTitles = stageInput.deliverables;
      } else if (stageInput?.deliverables_description) {
        deliverablesTitles = stageInput.deliverables_description
          .split(/[,;\n]+/)
          .map(s => s.trim())
          .filter(Boolean);
      }

      if (deliverablesTitles.length === 0) {
        deliverablesTitles = getDefaultDeliverables(insertedStage.stage_type);
      }

      deliverablesTitles.forEach((title, dIdx) => {
        allDeliverables.push({
          stage_id: insertedStage.id,
          title: title.trim(),
          sort_order: dIdx,
          is_done: false,
        });
      });
    });

    if (allDeliverables.length > 0) {
      const { error: deliverablesError } = await supabase
        .from('stage_deliverables')
        .insert(allDeliverables);

      if (deliverablesError) {
        console.warn('Deliverables insertion warning:', deliverablesError);
      }
    }

    // 5. Insert event_resources if any links were extracted
    if (data.resources && data.resources.length > 0) {
      const validResources = data.resources
        .filter(r => r.title?.trim() && r.url?.trim())
        .map(r => ({
          event_id: event.id,
          title: r.title.trim(),
          url: r.url.trim(),
          resource_type: (r.resource_type as any) || 'other',
          is_official: r.is_official !== undefined ? r.is_official : true,
        }));

      if (validResources.length > 0) {
        const { error: resourcesError } = await supabase
          .from('event_resources')
          .insert(validResources);

        if (resourcesError) {
          console.warn('Event resources insertion warning:', resourcesError);
        }
      }
    }

    // 6. Add Participants to event_participants (single source of truth for event roster)
    const participantsToInsert: {
      event_id: string;
      user_id: string;
      role: 'lead' | 'collaborator';
      joined_at: string;
    }[] = [
      {
        event_id: event.id,
        user_id: user.id,
        role: 'lead',
        joined_at: new Date().toISOString(),
      },
    ];

    if (data.squad_id) {
      const { data: squadMembers } = await supabase
        .from('squad_members')
        .select('user_id')
        .eq('squad_id', data.squad_id);

      squadMembers?.forEach((sm) => {
        if (sm.user_id !== user.id) {
          participantsToInsert.push({
            event_id: event.id,
            user_id: sm.user_id,
            role: 'collaborator',
            joined_at: new Date().toISOString(),
          });
        }
      });
    }

    const { error: partError } = await supabase
      .from('event_participants')
      .insert(participantsToInsert);

    if (partError) {
      console.warn('Event participants insertion warning:', partError);
    } else if (data.squad_id && participantsToInsert.length > 1) {
      // Notify all other squad members that they were added to the hackathon
      try {
        const { data: creatorProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        const creatorName = creatorProfile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'Your squad leader';
        const otherUserIds = participantsToInsert.filter(p => p.user_id !== user.id).map(p => p.user_id);

        if (otherUserIds.length > 0) {
          await createBatchInAppNotifications(
            otherUserIds.map(uid => ({
              userId: uid,
              title: `New Hackathon: ${event.title}`,
              body: `${creatorName} registered your squad for "${event.title}". Check out the timeline and rounds!`,
              link: `/events/${event.id}`,
            }))
          );
        }
      } catch (notifErr) {
        console.error('Error dispatching squad event notifications:', notifErr);
      }
    }

    revalidatePath('/dashboard');
    revalidatePath('/events');
    revalidatePath(`/events/${event.id}`);
    return { success: true, data: { ...event, active_stage_id: firstStage.id } };
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

export type UpdateEventInput = {
  eventId: string;
  title?: string;
  organizer?: string;
  mode?: string;
  location?: string;
  prize_pool?: string;
  prize_cash_pool?: number | string | null;
  prize_first_place?: number | string | null;
  has_perks_or_credits?: boolean;
  raw_prize_text?: string | null;
  prize_display_summary?: string | null;
  overview?: string;
  eligibility?: string;
  status?: string;
  stages?: {
    id?: string;
    round_number: number;
    title: string;
    stage_type: string;
    deadline?: string | null;
    window_start?: string | null;
    window_end?: string | null;
    actionable_deadline?: string | null;
    raw_date_snippet?: string | null;
    evaluation_format?: string;
    deliverables_description?: string;
  }[];
};

export async function updateEvent(input: UpdateEventInput) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    const { eventId, stages, ...eventFields } = input;

    // Verify user is an authorized participant or the event creator
    const { data: participant } = await supabase
      .from('event_participants')
      .select('id, role')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: ev } = await supabase
      .from('events')
      .select('created_by')
      .eq('id', eventId)
      .maybeSingle();

    if (!participant && ev?.created_by !== user.id) {
      return { success: false, error: 'Forbidden: You are not authorized to edit this event' };
    }

    // 1. Update events table
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (eventFields.title !== undefined) updatePayload.title = eventFields.title.trim();
    if (eventFields.organizer !== undefined) updatePayload.organizer = eventFields.organizer.trim();
    if (eventFields.mode !== undefined) updatePayload.mode = eventFields.mode;
    if (eventFields.location !== undefined) updatePayload.location = eventFields.location;
    if (eventFields.prize_pool !== undefined) updatePayload.prize_pool = eventFields.prize_pool;
    if (eventFields.prize_cash_pool !== undefined) updatePayload.prize_cash_pool = eventFields.prize_cash_pool !== null ? String(eventFields.prize_cash_pool) : null;
    if (eventFields.prize_first_place !== undefined) updatePayload.prize_first_place = eventFields.prize_first_place !== null ? String(eventFields.prize_first_place) : null;
    if (eventFields.has_perks_or_credits !== undefined) updatePayload.has_perks_or_credits = eventFields.has_perks_or_credits;
    if (eventFields.raw_prize_text !== undefined) updatePayload.raw_prize_text = eventFields.raw_prize_text;
    if (eventFields.prize_display_summary !== undefined) updatePayload.prize_display_summary = eventFields.prize_display_summary;
    if (eventFields.overview !== undefined) updatePayload.overview = eventFields.overview;
    if (eventFields.eligibility !== undefined) updatePayload.eligibility = eventFields.eligibility;
    if (eventFields.status !== undefined) updatePayload.status = eventFields.status;

    const { error: eventUpdateError } = await supabase
      .from('events')
      .update(updatePayload)
      .eq('id', eventId);

    if (eventUpdateError) {
      return { success: false, error: eventUpdateError.message };
    }

    // 2. Update stages if provided
    if (stages && Array.isArray(stages)) {
      const { data: existingStages } = await supabase
        .from('event_stages')
        .select('id')
        .eq('event_id', eventId);

      const existingIds = new Set((existingStages || []).map(s => s.id));
      const incomingIds = new Set(stages.filter(s => !!s.id).map(s => s.id!));

      // Delete removed stages
      const idsToDelete = Array.from(existingIds).filter(id => !incomingIds.has(id));
      if (idsToDelete.length > 0) {
        await supabase
          .from('event_stages')
          .delete()
          .in('id', idsToDelete);
      }

      // Upsert / update stages in parallel batches
      const stagesToInsert: any[] = [];
      const updatePromises: PromiseLike<any>[] = [];

      for (const stg of stages) {
        const effectiveDeadline = stg.deadline || null;
        const effectiveEnd = stg.window_end || effectiveDeadline;
        const effectiveActionable = stg.actionable_deadline || stg.window_start || effectiveDeadline;
        const rawSnippet = stg.raw_date_snippet || (!effectiveDeadline ? 'TBA' : null);

        if (stg.id && existingIds.has(stg.id)) {
          updatePromises.push(
            supabase
              .from('event_stages')
              .update({
                round_number: stg.round_number,
                title: stg.title.trim(),
                stage_type: stg.stage_type || 'other',
                deadline: effectiveDeadline,
                window_start: stg.window_start || null,
                window_end: effectiveEnd,
                actionable_deadline: effectiveActionable,
                raw_date_snippet: rawSnippet,
                evaluation_format: stg.evaluation_format || '',
                deliverables_description: stg.deliverables_description || '',
              })
              .eq('id', stg.id)
          );
        } else {
          stagesToInsert.push({
            event_id: eventId,
            round_number: stg.round_number,
            title: stg.title.trim(),
            stage_type: stg.stage_type || 'other',
            deadline: effectiveDeadline,
            window_start: stg.window_start || null,
            window_end: effectiveEnd,
            actionable_deadline: effectiveActionable,
            raw_date_snippet: rawSnippet,
            evaluation_format: stg.evaluation_format || '',
            deliverables_description: stg.deliverables_description || '',
            is_completed: false,
          });
        }
      }

      const stageOperations: PromiseLike<any>[] = [...updatePromises];
      if (stagesToInsert.length > 0) {
        stageOperations.push(supabase.from('event_stages').insert(stagesToInsert));
      }
      await Promise.all(stageOperations);

      // Ensure active_stage_id points to lowest uncompleted stage
      const { data: updatedStages } = await supabase
        .from('event_stages')
        .select('id, round_number, is_completed')
        .eq('event_id', eventId)
        .order('round_number', { ascending: true });

      if (updatedStages && updatedStages.length > 0) {
        const nextActive = updatedStages.find(s => !s.is_completed) || updatedStages[0];
        await supabase
          .from('events')
          .update({ active_stage_id: nextActive.id })
          .eq('id', eventId);
      }
    }

    revalidatePath('/dashboard');
    revalidatePath('/events');
    revalidatePath(`/events/${eventId}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error in updateEvent:', error);
    return { success: false, error: error.message || 'Failed to update event' };
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
      const { data: participant } = await supabase
        .from('event_participants')
        .select('role')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (participant?.role !== 'lead') {
        return { success: false, error: 'Only event leads can delete events' };
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

    // Parallel Batch 1: Fetch event, stages, participants, resources, and problem statements concurrently
    const [
      { data: event, error: eventError },
      { data: stages },
      { data: participants },
      { data: resources },
      { data: problemStatements }
    ] = await Promise.all([
      supabase.from('events').select('*').eq('id', eventId).maybeSingle(),
      supabase.from('event_stages').select('*').eq('event_id', eventId).order('round_number', { ascending: true }),
      supabase.from('event_participants').select(`
        *,
        profile:profiles(id, email, full_name, avatar_url)
      `).eq('event_id', eventId),
      supabase.from('event_resources').select('*').eq('event_id', eventId).order('created_at', { ascending: true }),
      supabase.from('event_problem_statements').select('*').eq('event_id', eventId).order('created_at', { ascending: true }),
    ]);

    if (eventError || !event) {
      return { success: false, error: eventError?.message || 'Event not found' };
    }

    // Parallel Batch 2: Fetch squad (if assigned) and deliverables for active stage concurrently
    const activeStageId = event.active_stage_id || stages?.[0]?.id;
    const [squadRes, delivRes] = await Promise.all([
      event.squad_id
        ? supabase.from('squads').select('*').eq('id', event.squad_id).maybeSingle()
        : Promise.resolve({ data: null }),
      activeStageId
        ? supabase.from('stage_deliverables').select('*').eq('stage_id', activeStageId).order('sort_order', { ascending: true })
        : Promise.resolve({ data: [] }),
    ]);

    const squad = squadRes?.data || null;
    const deliverables = delivRes?.data || [];

    return { 
      success: true, 
      data: { 
        ...event, 
        stages: stages || [], 
        event_participants: participants || [],
        squad: squad,
        team_members: (participants || []).map((p: any) => ({
          id: p.id,
          event_id: p.event_id,
          user_id: p.user_id,
          email: p.profile?.email || '',
          role: p.role === 'lead' ? 'owner' : 'member',
          invited_at: p.joined_at,
          joined_at: p.joined_at,
          profile: p.profile,
        })),
        current_stage_deliverables: deliverables,
        resources: resources || [],
        problem_statements: problemStatements || []
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

    // 1. Parallel Batch 1: Get event IDs from event_participants AND squads concurrently
    const [
      { data: participants },
      { data: userSquads }
    ] = await Promise.all([
      supabase.from('event_participants').select('event_id').eq('user_id', user.id),
      supabase.from('squad_members').select('squad_id').eq('user_id', user.id),
    ]);

    const participantEventIds = participants?.map(p => p.event_id) || [];
    const userSquadIds = userSquads?.map(s => s.squad_id) || [];

    // 2. Fetch events where user is creator OR in event_participants OR in squad
    const orClauses = [`created_by.eq.${user.id}`];
    if (participantEventIds.length > 0) {
      orClauses.push(`id.in.(${participantEventIds.join(',')})`);
    }
    if (userSquadIds.length > 0) {
      orClauses.push(`squad_id.in.(${userSquadIds.join(',')})`);
    }

    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')
      .or(orClauses.join(','))
      .order('created_at', { ascending: false });

    if (eventsError || !events) {
      console.error('Error fetching user events:', eventsError);
      return { success: true, data: [] };
    }

    if (events.length === 0) return { success: true, data: [] };

    const eventIds = events.map(e => e.id);
    const activeStageIds = events.map(e => e.active_stage_id).filter(Boolean) as string[];
    const squadIds = Array.from(new Set(events.map(e => e.squad_id).filter(Boolean))) as string[];

    // 3. Parallel Batch 2: Fetch stages, participants, deliverables, resources, and squads concurrently
    const [
      { data: allStages },
      { data: allParticipants },
      delivRes,
      { data: allResources },
      squadsRes
    ] = await Promise.all([
      supabase.from('event_stages').select('*').in('event_id', eventIds).order('round_number', { ascending: true }),
      supabase.from('event_participants').select('event_id, id').in('event_id', eventIds),
      activeStageIds.length > 0
        ? supabase.from('stage_deliverables').select('stage_id, is_done').in('stage_id', activeStageIds)
        : Promise.resolve({ data: [] }),
      supabase.from('event_resources').select('*').in('event_id', eventIds).order('created_at', { ascending: true }),
      squadIds.length > 0
        ? supabase.from('squads').select('id, name').in('id', squadIds)
        : Promise.resolve({ data: [] })
    ]);

    const allDeliverables = delivRes?.data || [];
    const squadMap = new Map((squadsRes?.data || []).map((s: any) => [s.id, s.name]));

    // 8. Enrich each event
    const enrichedEvents = events.map(event => {
      const stagesForEvent = allStages?.filter(s => s.event_id === event.id) || [];
      const resourcesForEvent = allResources?.filter(r => r.event_id === event.id) || [];
      
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

      // Team count from event_participants
      const teamCount = allParticipants?.filter(p => p.event_id === event.id).length || 1;
      const squadName = event.squad_id ? (squadMap.get(event.squad_id) || null) : null;

      return {
        ...event,
        active_stage: activeStage,
        stages: stagesForEvent,
        resources: resourcesForEvent,
        deliverable_progress,
        team_count: teamCount,
        squad_name: squadName
      };
    });

    // Sort events by nearest active deadline (Safeguard 2: TBA events with null deadlines sort last)
    const sortedEvents = enrichedEvents.sort((a, b) => {
      const targetA = a.active_stage?.actionable_deadline || a.active_stage?.deadline;
      const targetB = b.active_stage?.actionable_deadline || b.active_stage?.deadline;
      const deadlineA = targetA ? new Date(targetA).getTime() : Infinity;
      const deadlineB = targetB ? new Date(targetB).getTime() : Infinity;
      return deadlineA - deadlineB;
    });
    return { success: true, data: sortedEvents };
  } catch (error: any) {
    console.error('Error in getUserEvents:', error);
    return { success: false, error: error.message || 'Failed to fetch user events' };
  }
}

export async function addEventResource(eventId: string, resource: {
  title: string;
  url: string;
  resource_type: string;
  is_official?: boolean;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    if (!resource.title?.trim() || !resource.url?.trim()) {
      return { success: false, error: 'Title and URL are required' };
    }

    const { data, error } = await supabase
      .from('event_resources')
      .insert({
        event_id: eventId,
        title: resource.title.trim(),
        url: resource.url.trim(),
        resource_type: (resource.resource_type as any) || 'other',
        is_official: resource.is_official !== undefined ? resource.is_official : false,
      })
      .select('*')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Dispatch notifications to all event collaborators (excluding the uploader)
    try {
      const { data: event } = await supabase.from('events').select('title, created_by').eq('id', eventId).single();
      const { data: uploaderProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
      const uploaderName = uploaderProfile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'A teammate';
      const eventTitle = event?.title || 'Hackathon';

      const recipientIds = new Set<string>();
      if (event?.created_by && event.created_by !== user.id) {
        recipientIds.add(event.created_by);
      }

      const { data: participants } = await supabase
        .from('event_participants')
        .select('user_id')
        .eq('event_id', eventId);
      participants?.forEach((p) => {
        if (p.user_id && p.user_id !== user.id) recipientIds.add(p.user_id);
      });

      if (recipientIds.size > 0) {
        const resourceTypeLabel = resource.resource_type === 'problem_statement'
          ? 'Problem Statement'
          : resource.resource_type === 'rulebook'
          ? 'Rulebook'
          : resource.resource_type === 'template'
          ? 'Pitch Deck'
          : resource.resource_type === 'dataset'
          ? 'Dataset'
          : 'Resource';

        await createBatchInAppNotifications(
          Array.from(recipientIds).map((uid) => ({
            userId: uid,
            title: `New ${resourceTypeLabel}: ${eventTitle}`,
            body: `${uploaderName} uploaded "${resource.title.trim()}" to ${eventTitle}.`,
            link: `/events/${eventId}`,
          }))
        );
      }
    } catch (notifErr) {
      console.error('Error dispatching resource notifications:', notifErr);
    }

    revalidatePath(`/events/${eventId}`);
    revalidatePath('/dashboard');
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to add resource' };
  }
}

export async function deleteEventResource(resourceId: string, eventId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Unauthorized' };

    const { error } = await supabase
      .from('event_resources')
      .delete()
      .eq('id', resourceId)
      .eq('event_id', eventId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/events/${eventId}`);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete resource' };
  }
}

// -------------------------------------------------------------
// Meet Companion & Post-Submission Actions
// -------------------------------------------------------------

export async function updateEventMeetUrl(eventId: string, meetUrl: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { error } = await supabase
      .from('events')
      .update({ meet_url: meetUrl.trim() || null })
      .eq('id', eventId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/events/${eventId}`);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update meet link' };
  }
}

export async function updatePostSubmissionDetails(eventId: string, details: {
  submission_receipt?: string;
  submission_notes?: string;
  result_date?: string;
  prize_details?: string;
  retro_notes?: string;
  demo_url?: string;
  github_repo_url?: string;
  pitch_deck_url?: string;
  status?: string;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const updatePayload: Record<string, any> = {};
    if (details.submission_receipt !== undefined) updatePayload.submission_receipt = details.submission_receipt;
    if (details.submission_notes !== undefined) updatePayload.submission_notes = details.submission_notes;
    if (details.result_date !== undefined) updatePayload.result_date = details.result_date || null;
    if (details.prize_details !== undefined) updatePayload.prize_details = details.prize_details;
    if (details.retro_notes !== undefined) updatePayload.retro_notes = details.retro_notes;
    if (details.demo_url !== undefined) updatePayload.demo_url = details.demo_url;
    if (details.github_repo_url !== undefined) updatePayload.github_repo_url = details.github_repo_url;
    if (details.pitch_deck_url !== undefined) updatePayload.pitch_deck_url = details.pitch_deck_url;
    if (details.status) updatePayload.status = details.status;

    const { error } = await supabase
      .from('events')
      .update(updatePayload)
      .eq('id', eventId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/events/${eventId}`);
    revalidatePath('/dashboard');
    revalidatePath('/archive');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update post-submission details' };
  }
}

// -------------------------------------------------------------
// Idea Sandbox (Problem Statements) Actions
// -------------------------------------------------------------

export async function addProblemStatement(eventId: string, statement: {
  title: string;
  description?: string;
  category?: string;
  solution_bullets?: string[];
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Authorization check
    const { data: participant } = await supabase
      .from('event_participants')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: ev } = await supabase
      .from('events')
      .select('created_by')
      .eq('id', eventId)
      .maybeSingle();

    if (!participant && ev?.created_by !== user.id) {
      return { success: false, error: 'Forbidden: You are not authorized for this event' };
    }

    if (!statement.title?.trim()) {
      return { success: false, error: 'Title is required for problem statement' };
    }

    const { data, error } = await supabase
      .from('event_problem_statements')
      .insert({
        event_id: eventId,
        title: statement.title.trim(),
        description: statement.description?.trim() || null,
        category: statement.category?.trim() || null,
        solution_bullets: statement.solution_bullets || [],
        is_chosen: false,
      })
      .select('*')
      .single();

    if (error) return { success: false, error: error.message };

    revalidatePath(`/events/${eventId}`);
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to add problem statement' };
  }
}

export async function chooseProblemStatement(eventId: string, statementId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Authorization check
    const { data: participant } = await supabase
      .from('event_participants')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: ev } = await supabase
      .from('events')
      .select('created_by')
      .eq('id', eventId)
      .maybeSingle();

    if (!participant && ev?.created_by !== user.id) {
      return { success: false, error: 'Forbidden: You are not a member of this event.' };
    }

    // Try atomic RPC first
    const { error: rpcError } = await supabase.rpc('choose_problem_statement', {
      p_event_id: eventId,
      p_statement_id: statementId,
    });

    if (rpcError) {
      // Fallback: Batch update both sets concurrently
      await Promise.all([
        supabase
          .from('event_problem_statements')
          .update({ is_chosen: false })
          .eq('event_id', eventId)
          .neq('id', statementId),
        supabase
          .from('event_problem_statements')
          .update({ is_chosen: true })
          .eq('id', statementId)
          .eq('event_id', eventId),
      ]);
    }

    revalidatePath(`/events/${eventId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to select problem statement' };
  }
}

export async function updateProblemStatement(statementId: string, eventId: string, updates: {
  title?: string;
  description?: string;
  category?: string;
  solution_bullets?: string[];
  is_chosen?: boolean;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    // Authorization check
    const { data: participant } = await supabase
      .from('event_participants')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: ev } = await supabase
      .from('events')
      .select('created_by')
      .eq('id', eventId)
      .maybeSingle();

    if (!participant && ev?.created_by !== user.id) {
      return { success: false, error: 'Forbidden: You are not authorized for this event' };
    }

    const { error } = await supabase
      .from('event_problem_statements')
      .update(updates)
      .eq('id', statementId)
      .eq('event_id', eventId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/events/${eventId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update problem statement' };
  }
}

export async function deleteProblemStatement(statementId: string, eventId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { error } = await supabase
      .from('event_problem_statements')
      .delete()
      .eq('id', statementId)
      .eq('event_id', eventId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/events/${eventId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete problem statement' };
  }
}

export async function addEventParticipant(eventId: string, userId: string, role: 'lead' | 'collaborator' = 'collaborator') {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { error } = await supabase
      .from('event_participants')
      .insert({
        event_id: eventId,
        user_id: userId,
        role: role,
        joined_at: new Date().toISOString(),
      });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'User is already a participant in this event' };
      }
      return { success: false, error: error.message };
    }

    // Dispatch in-app notification & email to added participant
    if (userId !== user.id) {
      try {
        const { data: event } = await supabase.from('events').select('title').eq('id', eventId).single();
        const { data: adderProfile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single();
        const adderName = adderProfile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'A teammate';
        const eventTitle = event?.title || 'Hackathon';
        const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const eventUrl = `${appBaseUrl}/events/${eventId}`;

        await createInAppNotification({
          userId: userId,
          title: `Added to Team: ${eventTitle}`,
          body: `${adderName} added you to the hackathon team for "${eventTitle}" as a ${role}.`,
          link: `/events/${eventId}`,
        });

        const { data: targetProfile } = await supabase.from('profiles').select('email').eq('id', userId).single();
        if (targetProfile?.email) {
          await sendTeamInviteEmail({
            to: targetProfile.email,
            inviterName: adderName,
            eventTitle: eventTitle,
            inviteUrl: eventUrl,
          });
        }
      } catch (notifErr) {
        console.error('Error sending participant notification:', notifErr);
      }
    }

    revalidatePath(`/events/${eventId}`);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function removeEventParticipant(eventId: string, userId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { error } = await supabase
      .from('event_participants')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/events/${eventId}`);
    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}


