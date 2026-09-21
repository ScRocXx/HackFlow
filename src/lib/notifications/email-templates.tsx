import { ensureExternalUrl } from '@/lib/utils/url';

export interface DeliverableItem {
  title: string;
  is_done: boolean;
}

export interface DeadlineReminderEmailProps {
  eventTitle: string;
  stageName: string;
  timeRemaining: string;
  checklistProgress?: string;
  eventUrl: string;
  intervalKey: string;
  cutoffDate?: string;
  timezone?: string;
  deliverables?: DeliverableItem[];
  constraints?: {
    teamSize?: string;
    format?: string;
    duration?: string;
    fileLimit?: string;
  };
  meetUrl?: string | null;
}

/**
 * Renders the High-Urgency Action-First Emergency Heads-Up Display (HUD) HTML email.
 * Styled with HackFlow signature palette matching the notification icon:
 * #f7f7f2 warm cream background, #10201d brutalist ink borders, #e53927 / #2e4742 accents.
 */
export function renderDeadlineReminderHtml(props: DeadlineReminderEmailProps): string {
  const safeEventUrl = ensureExternalUrl(props.eventUrl);
  const safeMeetUrl = props.meetUrl ? ensureExternalUrl(props.meetUrl) : null;
  const accentColor = props.intervalKey === '6h' ? '#e53927' : props.intervalKey === '24h' ? '#f97316' : props.intervalKey === '3d' ? '#f5b726' : '#2e4742';

  // Sort deliverables: pending items FIRST ([!]), completed items last ([✓])
  let deliverablesHtml = '';
  if (props.deliverables && props.deliverables.length > 0) {
    const sorted = [...props.deliverables].sort((a, b) => (a.is_done === b.is_done ? 0 : a.is_done ? 1 : -1));
    const pendingCount = sorted.filter(d => !d.is_done).length;
    const doneCount = sorted.filter(d => d.is_done).length;

    deliverablesHtml = `
      <div style="margin: 24px 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
          <span style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #2e4742; letter-spacing: 1px;">
            Action Deliverables (${pendingCount} Pending / ${doneCount} Complete)
          </span>
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: separate; border-spacing: 0 6px;">
          ${sorted.slice(0, 8).map(d => `
            <tr>
              <td style="padding: 10px 14px; background-color: ${d.is_done ? '#eaf4f0' : '#fef2f2'}; border: 1px solid ${d.is_done ? '#2e4742' : '#e53927'}; font-family: 'SF Mono', Consolas, Monaco, monospace;">
                <span style="color: ${d.is_done ? '#1b4332' : '#e53927'}; font-weight: 900; font-size: 12px; margin-right: 8px;">
                  ${d.is_done ? '[✓] DONE' : '[!] PENDING'}
                </span>
                <span style="color: ${d.is_done ? '#57726d' : '#10201d'}; font-size: 13px; font-weight: ${d.is_done ? 'normal' : 'bold'}; ${d.is_done ? 'text-decoration: line-through;' : ''}">
                  ${escapeHtml(d.title)}
                </span>
              </td>
            </tr>
          `).join('')}
        </table>
        ${sorted.length > 8 ? `
          <div style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 11px; color: #57726d; margin-top: 6px; text-align: right;">
            + ${sorted.length - 8} more deliverables in workspace
          </div>
        ` : ''}
      </div>
    `;
  } else if (props.checklistProgress) {
    deliverablesHtml = `
      <div style="background-color: #ffffff; padding: 14px 18px; border-left: 4px solid ${accentColor}; border: 1px solid #10201d; margin: 20px 0; font-family: 'SF Mono', Consolas, monospace; font-size: 13px; color: #10201d;">
        <span style="color: #2e4742; font-weight: bold; text-transform: uppercase;">Checklist Status:</span> ${escapeHtml(props.checklistProgress)}
      </div>
    `;
  }

  // Constraints section
  let constraintsHtml = '';
  if (props.constraints && Object.values(props.constraints).some(Boolean)) {
    constraintsHtml = `
      <div style="background-color: #ffffff; border: 2px dashed #10201d; padding: 14px 16px; margin: 20px 0;">
        <div style="font-family: 'SF Mono', Consolas, monospace; font-size: 11px; font-weight: 800; color: #c02616; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
          ⚠ Stage Constraints & Limits
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family: 'SF Mono', Consolas, monospace; font-size: 12px; color: #10201d;">
          ${props.constraints.format ? `<tr><td style="padding: 2px 0; width: 120px; color: #57726d;">Format:</td><td style="color: #10201d; font-weight: bold;">${escapeHtml(props.constraints.format)}</td></tr>` : ''}
          ${props.constraints.teamSize ? `<tr><td style="padding: 2px 0; color: #57726d;">Squad Size:</td><td style="color: #10201d; font-weight: bold;">${escapeHtml(props.constraints.teamSize)}</td></tr>` : ''}
          ${props.constraints.fileLimit ? `<tr><td style="padding: 2px 0; color: #57726d;">Size Limit:</td><td style="color: #10201d; font-weight: bold;">${escapeHtml(props.constraints.fileLimit)}</td></tr>` : ''}
        </table>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(props.eventTitle)} - Urgent HUD</title>
</head>
<body style="background-color: #f2f2eb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #10201d;">
  <div style="background-color: #f7f7f2; max-width: 600px; margin: 0 auto; border: 2px solid #10201d; box-shadow: 6px 6px 0px #10201d; overflow: hidden;">
    
    <!-- Top Emergency Bar -->
    <div style="background-color: ${accentColor}; color: #ffffff; padding: 12px 18px; font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 11px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #10201d;">
      <span>🚨 DEADLINE DISPATCH // HUD</span>
      <span style="background-color: rgba(0,0,0,0.25); padding: 2px 8px; border-radius: 2px;">ROUND: ${props.intervalKey.toUpperCase()}</span>
    </div>

    <!-- Header Section -->
    <div style="padding: 24px 28px 16px 28px; border-bottom: 2px solid #10201d; background-color: #f7f7f2;">
      <div style="font-family: 'SF Mono', Consolas, monospace; font-size: 12px; font-weight: 800; color: #2e4742; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">
        HackFlow Active Sprint
      </div>
      <h1 style="margin: 0 0 6px 0; font-size: 24px; font-weight: 900; color: #10201d; letter-spacing: -0.5px;">
        ${escapeHtml(props.eventTitle)}
      </h1>
      <div style="font-family: 'SF Mono', Consolas, monospace; font-size: 14px; font-weight: bold; color: #e53927;">
        ${escapeHtml(props.stageName)}
      </div>
    </div>

    <!-- Countdown & Cutoff HUD -->
    <div style="background-color: #ffffff; padding: 22px 28px; border-bottom: 2px solid #10201d; text-align: center;">
      <div style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 12px; font-weight: 800; text-transform: uppercase; color: #e53927; letter-spacing: 2px; margin-bottom: 6px;">
        Time to Hard Cutoff
      </div>
      <div style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 32px; font-weight: 900; color: #10201d; letter-spacing: 1px; margin: 4px 0 10px 0;">
        ⏳ ${escapeHtml(props.timeRemaining.toUpperCase())}
      </div>
      <div style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 12px; font-weight: bold; color: #f7f7f2; background-color: #10201d; padding: 6px 14px; display: inline-block;">
        HARD CUTOFF: <strong style="color: #ffffff;">${escapeHtml(props.cutoffDate || 'CHECK WORKSPACE')}</strong> ${props.timezone ? `(${escapeHtml(props.timezone)})` : ''}
      </div>
    </div>

    <!-- Deliverables & Constraints Body -->
    <div style="padding: 24px 28px;">
      ${deliverablesHtml}
      ${constraintsHtml}

      <!-- Action-First CTAs -->
      <div style="margin: 32px 0 16px 0; text-align: center;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding-bottom: 12px;">
              <a href="${safeEventUrl}" style="background-color: #e53927; color: #ffffff; padding: 15px 32px; text-decoration: none; font-family: 'SF Mono', Consolas, Monaco, monospace; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; display: block; border: 2px solid #10201d; box-shadow: 4px 4px 0 #10201d;">
                OPEN EVENT WORKSPACE &rarr;
              </a>
            </td>
          </tr>
          ${safeMeetUrl ? `
            <tr>
              <td align="center">
                <a href="${safeMeetUrl}" style="background-color: #2e4742; color: #f7f7f2; padding: 12px 28px; text-decoration: none; font-family: 'SF Mono', Consolas, Monaco, monospace; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; display: block; border: 2px solid #10201d; box-shadow: 3px 3px 0 #10201d;">
                  🎙️ JOIN SQUAD MEET / HUDDLE &rarr;
                </a>
              </td>
            </tr>
          ` : ''}
        </table>
      </div>
    </div>

    <!-- Notification Footer -->
    <div style="background-color: #2e4742; border-top: 2px solid #10201d; padding: 16px 24px; text-align: center; font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 10px; color: #f7f7f2; letter-spacing: 1px;">
      HACKFLOW // SQUAD DEADLINE NOTIFICATION ENGINE
    </div>

  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface TeamInviteEmailProps {
  inviterName: string;
  eventTitle: string;
  inviteUrl: string;
}

export function renderTeamInviteHtml(props: TeamInviteEmailProps): string {
  const safeInviteUrl = ensureExternalUrl(props.inviteUrl);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've been invited to ${escapeHtml(props.eventTitle)}</title>
</head>
<body style="background-color: #f2f2eb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #10201d;">
  <div style="background-color: #f7f7f2; max-width: 580px; margin: 0 auto; border: 2px solid #10201d; box-shadow: 6px 6px 0 #10201d; overflow: hidden;">
    <div style="background-color: #2e4742; padding: 20px; text-align: center; border-bottom: 2px solid #10201d;">
      <h1 style="color: #f7f7f2; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">⚡ HackFlow</h1>
    </div>
    <div style="padding: 32px 28px;">
      <h2 style="color: #10201d; margin-top: 0; font-size: 20px; font-weight: 800;">You're Invited to Join a Hackathon Squad!</h2>
      <p style="font-size: 15px; color: #34433f; line-height: 1.6;">
        <strong style="color: #10201d;">${escapeHtml(props.inviterName)}</strong> has invited you to collaborate on <strong style="color: #10201d;">${escapeHtml(props.eventTitle)}</strong> on HackFlow.
      </p>
      <p style="font-size: 14px; color: #57726d; line-height: 1.5;">
        Coordinate round deliverables, sync sprint checklists, monitor live cutoffs, and manage your team vault together.
      </p>
      <div style="text-align: center; margin: 32px 0 20px;">
        <a href="${safeInviteUrl}" style="background-color: #e53927; color: #ffffff; padding: 14px 28px; text-decoration: none; font-family: 'SF Mono', Consolas, monospace; font-weight: bold; font-size: 14px; display: inline-block; border: 2px solid #10201d; box-shadow: 4px 4px 0 #10201d; text-transform: uppercase;">
          Join Squad Workspace &rarr;
        </a>
      </div>
    </div>
    <div style="border-top: 2px solid #10201d; padding: 16px; text-align: center; font-family: 'SF Mono', Consolas, monospace; font-size: 11px; color: #f7f7f2; background-color: #2e4742;">
      Sent automatically by HackFlow
    </div>
  </div>
</body>
</html>`;
}

export interface StageCompletedEmailProps {
  eventTitle: string;
  completedStage: string;
  nextStage?: string;
  eventUrl: string;
}

export function renderStageCompletedHtml(props: StageCompletedEmailProps): string {
  const safeEventUrl = ensureExternalUrl(props.eventUrl);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(props.completedStage)} Completed - ${escapeHtml(props.eventTitle)}</title>
</head>
<body style="background-color: #f2f2eb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #10201d;">
  <div style="background-color: #f7f7f2; max-width: 580px; margin: 0 auto; border: 2px solid #10201d; box-shadow: 6px 6px 0 #10201d; overflow: hidden;">
    <div style="background-color: #52b788; color: #10201d; padding: 14px 18px; font-family: 'SF Mono', Consolas, monospace; font-size: 12px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; border-bottom: 2px solid #10201d;">
      ✓ STAGE MILESTONE COMPLETED
    </div>
    <div style="padding: 32px 28px;">
      <h2 style="color: #10201d; margin-top: 0; font-size: 22px; font-weight: 800;">${escapeHtml(props.completedStage)} Locked & Submitted!</h2>
      <p style="font-size: 15px; color: #34433f; line-height: 1.6;">
        Outstanding work! Your squad completed all deliverables for this round in <strong style="color: #10201d;">${escapeHtml(props.eventTitle)}</strong>.
      </p>
      ${props.nextStage ? `
        <div style="background-color: #ffffff; border: 1px solid #10201d; border-left: 4px solid #2e4742; padding: 12px 16px; margin: 20px 0; font-family: 'SF Mono', Consolas, monospace; font-size: 13px;">
          <span style="color: #2e4742; font-weight: bold; text-transform: uppercase;">Next Milestone:</span> ${escapeHtml(props.nextStage)}
        </div>
      ` : ''}
      <div style="text-align: center; margin: 32px 0 20px;">
        <a href="${safeEventUrl}" style="background-color: #2e4742; color: #f7f7f2; padding: 14px 28px; text-decoration: none; font-family: 'SF Mono', Consolas, monospace; font-weight: bold; font-size: 14px; display: inline-block; border: 2px solid #10201d; box-shadow: 4px 4px 0 #10201d;">
          Open Next Round &rarr;
        </a>
      </div>
    </div>
    <div style="border-top: 2px solid #10201d; padding: 16px; text-align: center; font-family: 'SF Mono', Consolas, monospace; font-size: 11px; color: #f7f7f2; background-color: #2e4742;">
      Sent automatically by HackFlow
    </div>
  </div>
</body>
</html>`;
}
