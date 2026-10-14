'use server';

import { createClient } from '@/lib/supabase/server';
import { computeActiveStage } from '@/lib/utils/active-stage';

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

    // Parallel Batch 2: Fetch squad, squad_members, creator profile, and active stage deliverables concurrently
    const activeStageId = event.active_stage_id || stages?.[0]?.id;
    const [squadRes, delivRes, creatorProfileRes, squadMembersRes] = await Promise.all([
      event.squad_id
        ? supabase.from('squads').select('*').eq('id', event.squad_id).maybeSingle()
        : Promise.resolve({ data: null }),
      activeStageId
        ? supabase.from('stage_deliverables').select('*').eq('stage_id', activeStageId).order('sort_order', { ascending: true })
        : Promise.resolve({ data: [] }),
      event.created_by
        ? supabase.from('profiles').select('id, email, full_name, avatar_url').eq('id', event.created_by).maybeSingle()
        : Promise.resolve({ data: null }),
      event.squad_id
        ? supabase.from('squad_members').select('id, squad_id, user_id, role, joined_at').eq('squad_id', event.squad_id)
        : Promise.resolve({ data: [] }),
    ]);

    const squad = squadRes?.data || null;
    const deliverables = delivRes?.data || [];
    const creatorProfile = creatorProfileRes?.data || null;
    const squadMembers = squadMembersRes?.data || [];

    // Build Profile Cache for all candidate roster members
    const profileMap = new Map<string, any>();
    if (creatorProfile) {
      profileMap.set(creatorProfile.id, creatorProfile);
    }
    (participants || []).forEach((p: any) => {
      if (p.profile && p.user_id) {
        profileMap.set(p.user_id, p.profile);
      }
    });

    // Check for any unpopulated profiles from squad members or logged in user
    const candidateUserIds = new Set<string>();
    if (event.created_by) candidateUserIds.add(event.created_by);
    if (user.id) candidateUserIds.add(user.id);
    squadMembers.forEach((sm: any) => {
      if (sm.user_id) candidateUserIds.add(sm.user_id);
    });
    (participants || []).forEach((p: any) => {
      if (p.user_id) candidateUserIds.add(p.user_id);
    });

    const missingProfileIds = Array.from(candidateUserIds).filter(id => !profileMap.has(id));
    if (missingProfileIds.length > 0) {
      const { data: fetchedProfiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .in('id', missingProfileIds);

      (fetchedProfiles || []).forEach((p: any) => {
        profileMap.set(p.id, p);
      });
    }

    // Deduplicate roster by user_id
    const teamMembersMap = new Map<string, any>();

    const addOrUpdateMember = (
      userId: string,
      details: {
        id?: string;
        role?: string;
        joined_at?: string;
        profile?: any;
      }
    ) => {
      if (!userId) return;
      const existing = teamMembersMap.get(userId);
      const profile = details.profile || profileMap.get(userId) || existing?.profile || null;
      const email = profile?.email || (userId === user.id ? user.email : '') || '';
      const fullName = profile?.full_name || profile?.email?.split('@')[0] || (userId === user.id ? (user.user_metadata?.full_name || user.email?.split('@')[0]) : '') || 'Team Member';
      const isCreator = userId === event.created_by;
      const isCurrentUser = userId === user.id;

      // Determine role: creator/lead takes priority
      let role = details.role || existing?.role || 'member';
      if (isCreator || role === 'lead' || role === 'leader' || role === 'owner') {
        role = 'lead';
      } else {
        role = 'member';
      }

      teamMembersMap.set(userId, {
        id: details.id || existing?.id || userId,
        event_id: eventId,
        user_id: userId,
        email,
        full_name: fullName,
        role,
        is_lead: role === 'lead',
        is_creator: isCreator,
        is_current_user: isCurrentUser,
        joined_at: details.joined_at || existing?.joined_at || event.created_at,
        profile: {
          id: userId,
          email,
          full_name: fullName,
          avatar_url: profile?.avatar_url || existing?.profile?.avatar_url || null,
        },
      });
    };

    // a) The event creator
    if (event.created_by) {
      addOrUpdateMember(event.created_by, {
        role: 'lead',
        joined_at: event.created_at,
        profile: creatorProfile,
      });
    }

    // b) Squad members (if squad_id present)
    (squadMembers || []).forEach((sm: any) => {
      addOrUpdateMember(sm.user_id, {
        id: sm.id,
        role: sm.role === 'leader' ? 'lead' : 'member',
        joined_at: sm.joined_at,
      });
    });

    // c) Event participants
    (participants || []).forEach((p: any) => {
      addOrUpdateMember(p.user_id, {
        id: p.id,
        role: p.role === 'lead' ? 'lead' : 'member',
        joined_at: p.joined_at,
        profile: p.profile,
      });
    });

    // Fallback: If still empty, add logged-in user so list is NEVER empty (0 MEMBERS)
    if (teamMembersMap.size === 0 && user.id) {
      addOrUpdateMember(user.id, {
        role: user.id === event.created_by ? 'lead' : 'member',
        joined_at: event.created_at,
      });
    }

    const teamMembersList = Array.from(teamMembersMap.values());
    teamMembersList.sort((a, b) => {
      if (a.is_creator && !b.is_creator) return -1;
      if (!a.is_creator && b.is_creator) return 1;
      if (a.is_lead && !b.is_lead) return -1;
      if (!a.is_lead && b.is_lead) return 1;
      if (a.is_current_user && !b.is_current_user) return -1;
      if (!a.is_current_user && b.is_current_user) return 1;
      return (a.full_name || '').localeCompare(b.full_name || '');
    });

    return { 
      success: true, 
      data: { 
        ...event, 
        current_user_id: user.id,
        stages: stages || [], 
        event_participants: teamMembersList,
        team_members: teamMembersList,
        squad: squad,
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
      .select(`
        *,
        stages:event_stages!event_stages_event_id_fkey(
          id, round_number, title, stage_type, deadline, 
          window_start, window_end, actionable_deadline, raw_date_snippet, is_completed,
          stage_deliverables(id, title, is_done)
        ),
        resources:event_resources(id, title, url, resource_type),
        squad:squads(id, name),
        participants:event_participants(id, user_id, role)
      `)
      .or(orClauses.join(','))
      .order('created_at', { ascending: false });

    if (eventsError || !events) {
      console.error('Error fetching user events:', eventsError);
      return { success: true, data: [] };
    }

    if (events.length === 0) return { success: true, data: [] };

    // Enrich each event directly from embedded relational data
    const enrichedEvents = events.map((event: any) => {
      const stagesForEvent = ((event.stages || []) as any[]).sort((a: any, b: any) => a.round_number - b.round_number);
      const resourcesForEvent = event.resources || [];
      
      // Determine active stage using centralized computation
      let activeStage = computeActiveStage(stagesForEvent, event.active_stage_id);

      // Calculate deliverables progress for active stage
      let deliverable_progress = { done: 0, total: 0 };
      if (activeStage) {
        const stageDelivs = (activeStage as any).stage_deliverables || [];
        const doneCount = stageDelivs.filter((d: any) => d.is_done).length;
        deliverable_progress = {
          done: doneCount,
          total: stageDelivs.length
        };
      }

      // Team count from event_participants
      const teamCount = (event.participants || []).length || 1;
      const squadName = event.squad?.name || null;

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
