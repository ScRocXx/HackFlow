import { createClient } from '@supabase/supabase-js';
import { sendDeadlineEmail } from './send-email';
import { createInAppNotification } from './in-app';
import { sendDiscordDeadlineAlert } from './discord';
import { getServerBaseUrl } from '@/lib/utils/url-server';
import { ensureExternalUrl } from '@/lib/utils/url';

function getSupabaseAdmin() {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://llyzvbwmktztyyrpcydp.supabase.co').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  return createClient(supabaseUrl, serviceKey || (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

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

export async function evaluateAndDispatchNotifications(options?: { baseUrl?: string }) {
  let evaluated = 0;
  let dispatched = 0;

  // STRICT FAIL-CLOSED: Refuse to run without service role key!
  // Running with anon key causes Postgres RLS to hide logs, which causes repeated duplicate email bursts.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[NotificationEngine] CRITICAL FAIL-CLOSED: SUPABASE_SERVICE_ROLE_KEY is not configured in environment variables. Refusing to run to prevent duplicate email bursts.');
    return {
      evaluated: 0,
      dispatched: 0,
      error: 'SUPABASE_SERVICE_ROLE_KEY environment variable is required to execute notification engine safely.'
    };
  }

  const supabaseAdmin = getSupabaseAdmin();

  // 1. Query pending event stages (strictly ignore TBA stages with null deadlines)
  const { data: stages, error: stagesError } = await supabaseAdmin
    .from('event_stages')
    .select('id, title, stage_type, evaluation_format, deliverables_description, deadline, event_id, events!event_stages_event_id_fkey(id, title, created_by, team_size_min, team_size_max, meet_url)')
    .eq('is_completed', false)
    .not('deadline', 'is', null)
    .gt('deadline', new Date().toISOString());

  if (stagesError || !stages) {
    console.error('[NotificationEngine] Error fetching stages:', stagesError);
    return { evaluated, dispatched, error: stagesError?.message };
  }

  const eventIds = Array.from(new Set(stages.map(s => s.event_id)));
  const stageIds = stages.map(s => s.id);

  if (stageIds.length === 0) {
    return { evaluated: 0, dispatched: 0 };
  }

  // 2. BULK PRE-LOAD: Pre-fetch all participants, deliverables, and notification logs for active stages
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [logsRes, participantsRes, deliverablesRes, recentInAppRes] = await Promise.all([
    supabaseAdmin
      .from('notification_logs')
      .select('stage_id, interval_key, channel, recipient_email')
      .in('stage_id', stageIds),
    supabaseAdmin.from('event_participants').select('event_id, user_id').in('event_id', eventIds),
    supabaseAdmin.from('stage_deliverables').select('stage_id, title, is_done, sort_order').in('stage_id', stageIds),
    supabaseAdmin.from('notifications').select('user_id, title, link').gte('created_at', sevenDaysAgo),
  ]);

  // FAIL-CLOSED SAFEGUARD: If notification_logs cannot be queried, abort to prevent sending duplicate notifications!
  if (logsRes.error) {
    console.error('[NotificationEngine] CRITICAL: Failed to query notification_logs, aborting to prevent duplicate spam:', logsRes.error);
    return { evaluated, dispatched: 0, error: logsRes.error.message };
  }

  const allLogs = logsRes.data || [];
  const logSet = new Set(
    allLogs.map(l => [l.stage_id, l.interval_key, l.channel, (l.recipient_email || '').toLowerCase().trim()].join('_'))
  );

  // Secondary in-app deduplication cache
  const existingInAppSet = new Set(
    (recentInAppRes.data || []).map(n => [n.user_id, n.title, n.link].join('_'))
  );

  // Group participants by eventId
  const participantsByEvent = new Map<string, Set<string>>();
  for (const s of stages) {
    const ev = Array.isArray(s.events) ? s.events[0] : (s.events as any);
    if (!participantsByEvent.has(s.event_id)) {
      participantsByEvent.set(s.event_id, new Set());
    }
    if (ev?.created_by) {
      participantsByEvent.get(s.event_id)!.add(ev.created_by);
    }
  }

  (participantsRes.data || []).forEach(p => {
    if (p.event_id && p.user_id) {
      if (!participantsByEvent.has(p.event_id)) {
        participantsByEvent.set(p.event_id, new Set());
      }
      participantsByEvent.get(p.event_id)!.add(p.user_id);
    }
  });

  // Collect all unique user IDs across all events to fetch profiles in 1 query
  const allUserIds = new Set<string>();
  participantsByEvent.forEach(uSet => uSet.forEach(uid => allUserIds.add(uid)));

  const { data: profilesData } = allUserIds.size > 0
    ? await supabaseAdmin.from('profiles').select('id, email, full_name').in('id', Array.from(allUserIds))
    : { data: [] };

  const profilesById = new Map<string, { id: string; email: string; full_name: string }>();
  (profilesData || []).forEach(p => {
    if (p.id && p.email) {
      profilesById.set(p.id, {
        id: p.id,
        email: p.email.trim(),
        full_name: p.full_name || 'Hacker',
      });
    }
  });

  // Group deliverables by stage_id
  const deliverablesByStage = new Map<string, { title: string; is_done: boolean }[]>();
  (deliverablesRes.data || [])
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    .forEach(d => {
      if (!deliverablesByStage.has(d.stage_id)) {
        deliverablesByStage.set(d.stage_id, []);
      }
      deliverablesByStage.get(d.stage_id)!.push({
        title: d.title,
        is_done: Boolean(d.is_done),
      });
    });

  // 3. In-memory stage evaluation loop
  for (const stage of stages) {
    if (!stage.deadline) continue;
    evaluated++;
    const deadline = new Date(stage.deadline);
    const triggeredIntervals = getTriggeredIntervals(deadline);

    if (triggeredIntervals.length === 0) continue;

    const eventId = stage.event_id;
    const eventData = Array.isArray(stage.events) ? stage.events[0] : (stage.events as any);
    const eventTitle = eventData?.title || 'Hackathon Event';

    const memberIds = participantsByEvent.get(eventId);
    if (!memberIds || memberIds.size === 0) continue;

    const recipients = Array.from(memberIds)
      .map(uid => profilesById.get(uid))
      .filter((p): p is { id: string; email: string; full_name: string } => !!p && !!p.email);

    if (recipients.length === 0) continue;

    const deliverables = deliverablesByStage.get(stage.id) || [];
    const doneCount = deliverables.filter(d => d.is_done).length;
    const checklistProgress = deliverables.length > 0
      ? `${doneCount}/${deliverables.length} Deliverables Complete`
      : 'Action items pending in workspace';

    let cutoffDate = 'TBA';
    try {
      cutoffDate = deadline.toLocaleString('en-US', {
        timeZone: 'Asia/Kolkata',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }) + ' IST';
    } catch {
      cutoffDate = stage.deadline;
    }

    const constraints = {
      teamSize: eventData?.team_size_min || eventData?.team_size_max
        ? `${eventData?.team_size_min || 1} - ${eventData?.team_size_max || 4} Members`
        : undefined,
      format: stage.stage_type === 'ppt_submission'
        ? 'Slide Deck / PDF'
        : stage.stage_type === 'prototype'
        ? 'GitHub Repo + Live Demo'
        : stage.evaluation_format || undefined,
    };

    for (const intervalKey of triggeredIntervals) {
      const message = getIntervalMessage(intervalKey, stage.title, eventTitle);
      const appBaseUrl = options?.baseUrl || getServerBaseUrl();
      const eventUrl = `${appBaseUrl}/events/${eventId}`;
      const meetUrl = (eventData as any)?.meet_url ? ensureExternalUrl((eventData as any).meet_url) : undefined;

      for (const recipient of recipients) {
        const normalizedEmail = recipient.email.toLowerCase().trim();
        const emailKey = [stage.id, intervalKey, 'email', normalizedEmail].join('_');
        const inAppKey = [stage.id, intervalKey, 'in_app', normalizedEmail].join('_');
        const inAppDedupeKey = [recipient.id, message.subject, `/events/${eventId}`].join('_');

        // --- Channel A: Email (Atomic Guaranteed Idempotency) ---
        if (!logSet.has(emailKey)) {
          logSet.add(emailKey); // Immediately mark in memory to prevent duplicate loops within same run

          // ATOMIC INSERT LOCK: Insert record first.
          // If a prior run or concurrent thread already created it, Postgres unique constraint rejects it with 23505.
          const { data: insertLog, error: logErr } = await supabaseAdmin
            .from('notification_logs')
            .insert({
              stage_id: stage.id,
              interval_key: intervalKey,
              channel: 'email',
              recipient_email: normalizedEmail,
            })
            .select('id');

          if (logErr) {
            // Postgres code 23505 = unique_violation (already sent & locked in a prior cron run)
            if (logErr.code === '23505') {
              console.log(`[NotificationEngine] Email already sent and locked for ${normalizedEmail} (stage: ${stage.id}, interval: ${intervalKey}). Skipping.`);
              continue;
            }

            // STRICT FAIL-CLOSED: If DB write fails for ANY reason, NEVER send the email to avoid duplicate bursting!
            console.error(`[NotificationEngine] CRITICAL: DB log insert failed for ${normalizedEmail} (${intervalKey}). Refusing to send email:`, logErr);
            continue;
          }

          const lockId = insertLog?.[0]?.id;

          try {
            const emailResult = await sendDeadlineEmail({
              to: normalizedEmail,
              eventTitle,
              stageName: stage.title,
              timeRemaining: intervalKey,
              checklistProgress,
              eventUrl,
              intervalKey,
              cutoffDate,
              timezone: 'IST',
              deliverables,
              deliverablesDescription: stage.deliverables_description,
              constraints,
              meetUrl,
            });

            if (emailResult?.success) {
              dispatched++;
            } else {
              // Sending failed at provider level: remove lock so it can retry on next schedule
              console.warn(`[NotificationEngine] Email provider rejected delivery to ${normalizedEmail}. Rolling back lock:`, emailResult?.error);
              if (lockId) {
                await supabaseAdmin.from('notification_logs').delete().eq('id', lockId);
              }
            }
          } catch (emailErr) {
            console.error(`[NotificationEngine] Failed to dispatch email to ${normalizedEmail}. Rolling back lock:`, emailErr);
            if (lockId) {
              await supabaseAdmin.from('notification_logs').delete().eq('id', lockId);
            }
          }
        }

        // --- Channel B: In-App (Dual-Layer Deduplication: logSet + notifications table) ---
        if (!logSet.has(inAppKey) && !existingInAppSet.has(inAppDedupeKey)) {
          logSet.add(inAppKey);
          existingInAppSet.add(inAppDedupeKey);

          // Atomic insert lock for in-app notification
          const { error: inAppLogErr } = await supabaseAdmin
            .from('notification_logs')
            .insert({
              stage_id: stage.id,
              interval_key: intervalKey,
              channel: 'in_app',
              recipient_email: normalizedEmail,
            });

          if (inAppLogErr) {
            if (inAppLogErr.code === '23505') {
              // Already logged in prior run
              continue;
            }
            console.error('[NotificationEngine] In-app notification lock failed, skipping:', inAppLogErr);
            continue;
          }

          try {
            await createInAppNotification({
              userId: recipient.id,
              title: message.subject,
              body: message.body,
              link: `/events/${eventId}`
            });
            dispatched++;
          } catch (inAppErr) {
            console.error(`[NotificationEngine] Failed to create in-app notification for ${recipient.id}:`, inAppErr);
          }
        }
      }

      // --- Channel C: Discord Squad Webhook ---
      const discordKey = [stage.id, intervalKey, 'discord'].join('_');
      if (!logSet.has(discordKey) && process.env.DISCORD_WEBHOOK_URL) {
        logSet.add(discordKey);
        try {
          await sendDiscordDeadlineAlert({
            eventTitle,
            stageName: stage.title,
            timeRemaining: intervalKey,
            eventUrl,
            intervalKey,
            checklistProgress,
            cutoffDate,
          });
        } catch (discordErr) {
          console.error('[NotificationEngine] Failed to dispatch Discord alert:', discordErr);
        }
      }
    }
  }

  return { evaluated, dispatched, totalLogged: logSet.size };
}

let lastEvaluationTimestamp = 0;
const EVALUATION_COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

export async function triggerThrottledDeadlineEvaluation(): Promise<{ triggered: boolean; result?: any }> {
  const now = Date.now();
  if (now - lastEvaluationTimestamp < EVALUATION_COOLDOWN_MS) {
    return { triggered: false };
  }
  lastEvaluationTimestamp = now;

  try {
    const result = await evaluateAndDispatchNotifications();
    return { triggered: true, result };
  } catch (err) {
    console.error('[NotificationEngine] Background evaluation error:', err);
    return { triggered: false };
  }
}
