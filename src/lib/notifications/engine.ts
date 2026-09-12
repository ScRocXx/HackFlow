import { createClient } from '@supabase/supabase-js';
import { sendDeadlineEmail } from './send-email';
import { createInAppNotification } from './in-app';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[NotificationEngine] SUPABASE_SERVICE_ROLE_KEY is not defined. Using anon key which may be blocked by Row-Level Security (RLS).');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export function getTriggeredIntervals(deadline: Date): string[] {
  const now = new Date();
  const timeRemainingMs = deadline.getTime() - now.getTime();
  
  if (timeRemainingMs <= 0) return [];

  const sixHoursMs = 6 * 60 * 60 * 1000;
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  if (timeRemainingMs <= sixHoursMs) {
    return ['6h'];
  } else if (timeRemainingMs <= twentyFourHoursMs) {
    return ['24h'];
  } else if (timeRemainingMs <= threeDaysMs) {
    return ['3d'];
  } else if (timeRemainingMs <= sevenDaysMs) {
    return ['7d'];
  }

  return [];
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

  // 1. Query pending event stages (Safeguard: strictly ignore TBA stages with null deadlines)
  const { data: stages, error: stagesError } = await supabaseAdmin
    .from('event_stages')
    .select('id, title, deadline, event_id, events!event_stages_event_id_fkey(id, title, created_by)')
    .eq('is_completed', false)
    .not('deadline', 'is', null)
    .gt('deadline', new Date().toISOString());

  if (stagesError || !stages) {
    console.error('[NotificationEngine] Error fetching stages:', stagesError);
    return { evaluated, dispatched, error: stagesError?.message };
  }

  // 2. Pre-load all notification logs into an in-memory set for instantaneous O(1) deduplication
  const { data: allLogs } = await supabaseAdmin
    .from('notification_logs')
    .select('stage_id, interval_key, channel, recipient_email');

  const logSet = new Set(
    (allLogs || []).map(l => [l.stage_id, l.interval_key, l.channel, (l.recipient_email || '').toLowerCase()].join('_'))
  );

  for (const stage of stages) {
    if (!stage.deadline) continue;
    evaluated++;
    const deadline = new Date(stage.deadline);
    const triggeredIntervals = getTriggeredIntervals(deadline);

    if (triggeredIntervals.length === 0) continue;

    const eventId = stage.event_id;
    const eventData = Array.isArray(stage.events) ? stage.events[0] : (stage.events as any);
    const eventTitle = eventData?.title || 'Hackathon Event';
    const eventCreatorId = eventData?.created_by;
    
    // Get confirmed participants for this event from event_participants
    const { data: participants, error: membersError } = await supabaseAdmin
      .from('event_participants')
      .select('user_id')
      .eq('event_id', eventId);

    if (membersError) {
      console.warn(`[NotificationEngine] Error fetching participants for event ${eventId}:`, membersError);
    }

    const userIds = new Set<string>();
    if (participants) {
      participants.forEach(p => {
        if (p.user_id) userIds.add(p.user_id);
      });
    }
    if (eventCreatorId) {
      userIds.add(eventCreatorId);
    }

    if (userIds.size === 0) continue;

    // Fetch user profiles for all collected user IDs
    const { data: profiles, error: profError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .in('id', Array.from(userIds));

    if (profError || !profiles || profiles.length === 0) continue;

    const recipients = profiles.filter(p => !!p.email);
    if (recipients.length === 0) continue;

    for (const intervalKey of triggeredIntervals) {
      const message = getIntervalMessage(intervalKey, stage.title, eventTitle);
      const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const eventUrl = `${appBaseUrl}/events/${eventId}`;

      for (const recipient of recipients) {
        const email = recipient.email;
        const emailKey = [stage.id, intervalKey, 'email', email.toLowerCase()].join('_');
        const inAppKey = [stage.id, intervalKey, 'in_app', email.toLowerCase()].join('_');

        // --- Channel A: Email ---
        if (!logSet.has(emailKey)) {
          try {
            logSet.add(emailKey);
            const emailResult = await sendDeadlineEmail({
              to: email,
              eventTitle,
              stageName: stage.title,
              timeRemaining: intervalKey,
              checklistProgress: 'Pending checklist',
              eventUrl,
              intervalKey
            });

            await supabaseAdmin
              .from('notification_logs')
              .insert({
                stage_id: stage.id,
                interval_key: intervalKey,
                channel: 'email',
                recipient_email: email
              });

            if (emailResult?.success) {
              dispatched++;
            }
          } catch (emailErr) {
            console.error(`[NotificationEngine] Failed to dispatch email to ${email}:`, emailErr);
          }
        }

        // --- Channel B: In-App ---
        if (!logSet.has(inAppKey)) {
          try {
            logSet.add(inAppKey);
            await createInAppNotification({
              userId: recipient.id,
              title: message.subject,
              body: message.body,
              link: eventUrl
            });

            await supabaseAdmin
              .from('notification_logs')
              .insert({
                stage_id: stage.id,
                interval_key: intervalKey,
                channel: 'in_app',
                recipient_email: email
              });

            dispatched++;
          } catch (inAppErr) {
            console.error(`[NotificationEngine] Failed to create in-app notification for ${recipient.id}:`, inAppErr);
          }
        }
      }
    }
  }

  return { evaluated, dispatched, totalLogged: logSet.size };
}

