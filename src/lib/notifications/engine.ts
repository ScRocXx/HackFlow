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

  // 1. Query pending event stages
  const { data: stages, error: stagesError } = await supabaseAdmin
    .from('event_stages')
    .select('id, title, deadline, event_id, events(id, title, created_by)')
    .eq('is_completed', false)
    .gt('deadline', new Date().toISOString());

  if (stagesError || !stages) {
    console.error('[NotificationEngine] Error fetching stages:', stagesError);
    return { evaluated, dispatched };
  }

  for (const stage of stages) {
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
      .select('user_id, profiles(id, email, full_name)')
      .eq('event_id', eventId);

    if (membersError) {
      console.warn(`[NotificationEngine] Error fetching participants for event ${eventId}:`, membersError);
    }

    const recipientsMap = new Map<string, { user_id: string; email: string; full_name?: string }>();

    if (participants && participants.length > 0) {
      for (const p of participants) {
        const profile = Array.isArray(p.profiles) ? p.profiles[0] : (p.profiles as any);
        if (profile?.email) {
          recipientsMap.set(profile.email.toLowerCase(), {
            user_id: p.user_id || profile.id,
            email: profile.email,
            full_name: profile.full_name || ''
          });
        }
      }
    }

    // Fallback: if event_participants has no rows, check event creator
    if (recipientsMap.size === 0 && eventCreatorId) {
      const { data: creatorProfile } = await supabaseAdmin
        .from('profiles')
        .select('id, email, full_name')
        .eq('id', eventCreatorId)
        .maybeSingle();

      if (creatorProfile?.email) {
        recipientsMap.set(creatorProfile.email.toLowerCase(), {
          user_id: creatorProfile.id,
          email: creatorProfile.email,
          full_name: creatorProfile.full_name || ''
        });
      }
    }

    const recipients = Array.from(recipientsMap.values());
    if (recipients.length === 0) continue;

    for (const intervalKey of triggeredIntervals) {
      const message = getIntervalMessage(intervalKey, stage.title, eventTitle);
      const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const eventUrl = `${appBaseUrl}/events/${eventId}`;

      for (const recipient of recipients) {
        const email = recipient.email;

        // --- Channel A: Email ---
        const { data: existingEmailLog } = await supabaseAdmin
          .from('notification_logs')
          .select('id')
          .eq('stage_id', stage.id)
          .eq('interval_key', intervalKey)
          .eq('channel', 'email')
          .eq('recipient_email', email)
          .maybeSingle();

        if (!existingEmailLog) {
          try {
            await sendDeadlineEmail({
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

            dispatched++;
          } catch (emailErr) {
            console.error(`[NotificationEngine] Failed to dispatch email to ${email}:`, emailErr);
          }
        }

        // --- Channel B: In-App ---
        const { data: existingInAppLog } = await supabaseAdmin
          .from('notification_logs')
          .select('id')
          .eq('stage_id', stage.id)
          .eq('interval_key', intervalKey)
          .eq('channel', 'in_app')
          .eq('recipient_email', email)
          .maybeSingle();

        if (!existingInAppLog) {
          try {
            await createInAppNotification({
              userId: recipient.user_id,
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
            console.error(`[NotificationEngine] Failed to create in-app notification for ${recipient.user_id}:`, inAppErr);
          }
        }
      }
    }
  }

  return { evaluated, dispatched };
}

