import { createClient } from '@supabase/supabase-js';
import { sendDeadlineEmail } from './send-email';
import { createInAppNotification } from './in-app';
import { differenceInMilliseconds } from 'date-fns';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
);

const INTERVALS = [
  { key: '7d', ms: 7 * 24 * 60 * 60 * 1000 },
  { key: '3d', ms: 3 * 24 * 60 * 60 * 1000 },
  { key: '24h', ms: 24 * 60 * 60 * 1000 },
  { key: '6h', ms: 6 * 60 * 60 * 1000 },
];

export function getTriggeredIntervals(deadline: Date): string[] {
  const now = new Date();
  const timeRemainingMs = deadline.getTime() - now.getTime();
  
  if (timeRemainingMs < 0) return [];

  return INTERVALS.filter(interval => timeRemainingMs <= interval.ms).map(i => i.key);
}

export function getIntervalMessage(intervalKey: string, stageName: string, eventTitle: string): { subject: string; body: string } {
  switch (intervalKey) {
    case '7d':
      return {
        subject: `[Kickoff] ${eventTitle}: ${stageName} due in 7 days`,
        body: `[Kickoff] ${eventTitle}: ${stageName} due in 7 days — review requirements and start planning`
      };
    case '3d':
      return {
        subject: `[Midpoint] ${eventTitle}: ${stageName} due in 3 days`,
        body: `[Midpoint] ${eventTitle}: ${stageName} due in 3 days — verify drafts and progress`
      };
    case '24h':
      return {
        subject: `[Freeze Warning] ${eventTitle}: ${stageName} due TOMORROW`,
        body: `[Freeze Warning] ${eventTitle}: ${stageName} due TOMORROW — finalize all content`
      };
    case '6h':
      return {
        subject: `🚨 [Critical] ${eventTitle}: ${stageName} due in 6 HOURS`,
        body: `🚨 [Critical] ${eventTitle}: ${stageName} due in 6 HOURS — final submission checklist`
      };
    default:
      return {
        subject: `${eventTitle}: ${stageName} reminder`,
        body: `${eventTitle}: ${stageName} is approaching its deadline.`
      };
  }
}

export async function evaluateAndDispatchNotifications() {
  let evaluated = 0;
  let dispatched = 0;

  // 1. Query pending event stages
  const { data: stages, error: stagesError } = await supabaseAdmin
    .from('event_stages')
    .select('id, name, deadline, event_id, events(title, id)')
    .eq('is_completed', false)
    .gt('deadline', new Date().toISOString());

  if (stagesError || !stages) {
    console.error('Error fetching stages:', stagesError);
    return { evaluated, dispatched };
  }

  for (const stage of stages) {
    evaluated++;
    const deadline = new Date(stage.deadline);
    const triggeredIntervals = getTriggeredIntervals(deadline);

    if (triggeredIntervals.length === 0) continue;

    const eventId = stage.event_id;
    const eventTitle = Array.isArray(stage.events) ? stage.events[0]?.title : (stage.events as any)?.title || 'Event';
    
    // Get confirmed participants for this event from event_participants (single source of truth)
    const { data: participants, error: membersError } = await supabaseAdmin
      .from('event_participants')
      .select('user_id, profiles(email, full_name)')
      .eq('event_id', eventId);

    if (membersError || !participants) continue;

    for (const intervalKey of triggeredIntervals) {
      // Check if this interval was already logged for this stage
      const { data: existingLogs } = await supabaseAdmin
        .from('notification_logs')
        .select('id')
        .eq('stage_id', stage.id)
        .eq('interval_key', intervalKey)
        .eq('channel', 'email')
        .limit(1);

      if (existingLogs && existingLogs.length > 0) {
        continue; // Already processed
      }

      const message = getIntervalMessage(intervalKey, stage.name, eventTitle);

      for (const participant of participants) {
        const profile = Array.isArray(participant.profiles) ? participant.profiles[0] : (participant.profiles as any);
        const email = profile?.email;
        if (!email) continue;

        const timeRemaining = intervalKey; // Simplified for now
        const checklistProgress = '0/0'; // You might want to fetch actual progress
        const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL}/events/${eventId}`;

        // Dispatch Email
        await sendDeadlineEmail({
          to: email,
          eventTitle,
          stageName: stage.name,
          timeRemaining,
          checklistProgress,
          eventUrl,
          intervalKey
        });

        // Dispatch In-App
        await createInAppNotification({
          userId: participant.user_id,
          title: message.subject,
          body: message.body,
          link: eventUrl
        });

        dispatched += 2; // Email + InApp
      }

      // Log the dispatch
      await supabaseAdmin
        .from('notification_logs')
        .insert({
          stage_id: stage.id,
          interval_key: intervalKey,
          channel: 'email',
          event_id: eventId
        });
    }
  }

  return { evaluated, dispatched };
}
