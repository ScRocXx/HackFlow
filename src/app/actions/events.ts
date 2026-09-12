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
  prize_cash_pool?: number | null;
  prize_first_place?: number | null;
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
    deadline: string;
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

    // Sanitize source platform
    const allowedPlatforms = ['unstop', 'devfolio', 'devpost', 'mlh', 'hackerearth', 'internshala', 'custom'];
    const rawPlatform = (data.source_platform || 'custom').toLowerCase().trim();
    const sourcePlatform = allowedPlatforms.includes(rawPlatform) ? rawPlatform : 'custom';

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
        prize_cash_pool: data.prize_cash_pool ?? null,
        prize_first_place: data.prize_first_place ?? null,
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

    // 2. Prepare and Insert Stages
    const stagesData = (data.stages && data.stages.length > 0) 
      ? data.stages 
      : [{
          round_number: 1,
          title: 'Round 1: Final Submission',
          stage_type: 'prototype',
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          window_start: null,
          window_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          actionable_deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          raw_date_snippet: null,
          evaluation_format: 'Online Evaluation',
          deliverables_description: 'Working prototype and presentation'
        }];

    const stagesToInsert = stagesData.map((stage, idx) => ({
      event_id: event.id,
      round_number: stage.round_number || idx + 1,
      title: stage.title.trim() || `Round ${idx + 1}`,
      stage_type: stage.stage_type || 'other',
      deadline: stage.deadline,
      window_start: stage.window_start || null,
      window_end: stage.window_end || stage.deadline,
      actionable_deadline: stage.actionable_deadline || stage.deadline,
      raw_date_snippet: stage.raw_date_snippet || null,
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

    // Reset others to false
    await supabase
      .from('event_problem_statements')
      .update({ is_chosen: false })
      .eq('event_id', eventId);

    // Set target to true
    const { error } = await supabase
      .from('event_problem_statements')
      .update({ is_chosen: true })
      .eq('id', statementId)
      .eq('event_id', eventId);

    if (error) return { success: false, error: error.message };

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


