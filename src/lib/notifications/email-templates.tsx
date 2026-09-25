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
  deliverablesDescription?: string | null;
  constraints?: {
    teamSize?: string;
    format?: string;
    duration?: string;
    fileLimit?: string;
  };
  meetUrl?: string | null;
  mode?: 'online' | 'in-person' | 'hybrid' | string | null;
  location?: string | null;
  prizePool?: string | null;
  timerGifUrl?: string | null;
}

/**
 * Renders the High-Urgency Action-First Deadline Reminder HTML email.
 * Styled with HackFlow signature neo-brutalist website palette:
 * #f7f7f2 warm cream card background, #10201d brutalist ink borders,
 * #f5b726 amber button, and native checkbox styling ([ ] red for pending, [✓] green for done).
 */
export function renderDeadlineReminderHtml(props: DeadlineReminderEmailProps): string {
  const safeEventUrl = ensureExternalUrl(props.eventUrl);
  const safeMeetUrl = props.meetUrl ? ensureExternalUrl(props.meetUrl) : null;

  // 1. Context Line: Mode & Prize Pool
  const modeText = props.mode === 'in-person'
    ? `📍 In-Person${props.location ? ` (${props.location})` : ''}`
    : props.mode === 'hybrid'
    ? `🌐 Hybrid${props.location ? ` (${props.location})` : ''}`
    : props.mode === 'online'
    ? `🌐 Online`
    : props.location
    ? `📍 ${props.location}`
    : null;

  const prizeText = props.prizePool ? `🏆 ${props.prizePool}` : null;

  const contextItems: string[] = [];
  if (modeText) contextItems.push(modeText);
  if (prizeText) contextItems.push(prizeText);
  const contextLine = contextItems.join(' &nbsp;&bull;&nbsp; ');

  // 2. Format cutoff date cleanly
  let formattedCutoff = props.cutoffDate || 'Check Workspace';
  if (props.timezone && !formattedCutoff.includes(props.timezone)) {
    formattedCutoff += ` ${props.timezone}`;
  }

  // 3. Compact Deliverables & Checklist
  const deliverables = props.deliverables || [];
  const pending = deliverables.filter(d => !d.is_done);
  const done = deliverables.filter(d => d.is_done);

  // 4. Combined Rules & Guidelines
  const rulesParts: string[] = [];
  if (props.constraints?.teamSize) {
    rulesParts.push(`Team of ${props.constraints.teamSize}`);
  }
  if (props.constraints?.format) {
    rulesParts.push(props.constraints.format);
  }
  if (props.constraints?.fileLimit) {
    rulesParts.push(`Max ${props.constraints.fileLimit}`);
  }
  if (props.deliverablesDescription && props.deliverablesDescription.trim().length > 0) {
    rulesParts.push(props.deliverablesDescription.trim());
  }
  const rulesLine = rulesParts.join(' &nbsp;&bull;&nbsp; ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(props.eventTitle)} - ${escapeHtml(props.stageName)}</title>
</head>
<body style="background-color: #f2f2eb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px 12px; color: #10201d;">
  <div style="background-color: #f7f7f2; max-width: 580px; margin: 0 auto; border: 2px solid #10201d; box-shadow: 6px 6px 0px #10201d; overflow: hidden;">
    
    <!-- 1. Header: Event Title, Stage Badge, Quick Context -->
    <div style="padding: 24px 26px 20px 26px; border-bottom: 2px solid #10201d; background-color: #f7f7f2;">
      <h1 style="margin: 0 0 6px 0; font-size: 24px; font-weight: 900; color: #10201d; letter-spacing: -0.5px; line-height: 1.25; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        ${escapeHtml(props.eventTitle)}
      </h1>
      <div style="margin: 4px 0 10px 0;">
        <span style="display: inline-block; background-color: #f5b726; color: #10201d; border: 1.5px solid #10201d; box-shadow: 2px 2px 0 #10201d; padding: 3px 10px; font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 12px; font-weight: 800;">
          STAGE: ${escapeHtml(props.stageName)}
        </span>
      </div>
      ${contextLine ? `
        <div style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 13px; font-weight: 600; color: #34433f; margin-top: 6px;">
          ${contextLine}
        </div>
      ` : ''}
    </div>

    <!-- 2. Countdown Box: Live Countdown GIF or Digital Clock -->
    <div style="background-color: #ffffff; padding: 20px 24px; border-bottom: 2px solid #10201d; text-align: center;">
      <div style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 12px; font-weight: 700; color: #57726d; margin-bottom: 6px;">
        ⌛ Portal closes in:
      </div>
      ${props.timerGifUrl ? `
        <div style="margin: 8px 0 12px 0;">
          <img src="${escapeHtml(props.timerGifUrl)}" alt="Live Countdown Timer" width="320" style="display: block; margin: 0 auto; max-width: 100%; border: 2px solid #10201d; box-shadow: 3px 3px 0 #10201d;" />
        </div>
      ` : `
        <div style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 24px; font-weight: 900; color: #10201d; letter-spacing: 1.5px; padding: 10px 18px; background-color: #f7f7f2; border: 2px solid #10201d; box-shadow: 3px 3px 0 #10201d; display: inline-block; margin: 6px 0 10px 0;">
          ${escapeHtml(props.timeRemaining.toUpperCase())}
        </div>
      `}
      <div style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 13px; font-weight: 700; color: #10201d; margin-top: 4px;">
        Deadline: <span style="font-weight: 900;">${escapeHtml(formattedCutoff)}</span>
      </div>
    </div>

    <!-- 3. Single Compact Card: Checklist, Pending Items (in red), & Guidelines -->
    <div style="padding: 22px 26px; border-bottom: 2px solid #10201d; background-color: #f7f7f2;">
      ${deliverables.length > 0 ? `
        ${pending.length > 0 ? `
          <div style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 13px; font-weight: 800; color: #10201d; margin-bottom: 10px;">
            What's left to submit (${pending.length} item${pending.length === 1 ? '' : 's'}):
          </div>
          <div style="margin-bottom: 12px;">
            ${pending.map(d => `
              <div style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 13px; line-height: 1.6; margin: 4px 0; color: #10201d;">
                <span style="color: #e53927; font-weight: 900; margin-right: 8px;">[ ]</span>
                <span style="font-weight: 700; color: #10201d;">${escapeHtml(d.title)}</span>
              </div>
            `).join('')}
          </div>
        ` : `
          <div style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 13px; color: #2e7d32; font-weight: 800; margin-bottom: 10px;">
            🎉 All stage deliverables completed!
          </div>
        `}

        ${done.length > 0 ? `
          <div style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 11px; font-weight: 700; color: #57726d; margin: 12px 0 6px 0; text-transform: uppercase;">
            Already done:
          </div>
          <div style="margin-bottom: 12px;">
            ${done.map(d => `
              <div style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 13px; line-height: 1.6; margin: 3px 0; color: #57726d;">
                <span style="color: #2e7d32; font-weight: 900; margin-right: 8px;">[✓]</span>
                <span style="text-decoration: line-through; color: #57726d;">${escapeHtml(d.title)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      ` : props.checklistProgress ? `
        <div style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 13px; font-weight: 700; color: #10201d; margin-bottom: 10px;">
          Checklist: <span style="font-weight: 800; color: #e53927;">${escapeHtml(props.checklistProgress)}</span>
        </div>
      ` : ''}

      ${rulesLine ? `
        <div style="margin-top: 14px; padding-top: 10px; border-top: 1.5px dashed #10201d; font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 11px; color: #34433f; line-height: 1.5;">
          <strong style="color: #10201d;">Rules:</strong> ${rulesLine}
        </div>
      ` : ''}
    </div>

    <!-- 4. Direct CTAs -->
    <div style="padding: 18px 24px; background-color: #f7f7f2;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding: 4px; ${safeMeetUrl ? 'width: 50%;' : 'width: 100%;'}">
            <a href="${safeEventUrl}" style="background-color: #f5b726; color: #10201d; border: 2px solid #10201d; box-shadow: 3px 3px 0 #10201d; padding: 12px 18px; font-weight: 900; font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 12px; text-decoration: none; text-transform: uppercase; display: block; text-align: center;">
              OPEN WORKSPACE &rarr;
            </a>
          </td>
          ${safeMeetUrl ? `
          <td align="center" style="padding: 4px; width: 50%;">
            <a href="${safeMeetUrl}" style="background-color: #ffffff; color: #10201d; border: 2px solid #10201d; box-shadow: 3px 3px 0 #10201d; padding: 12px 18px; font-weight: 900; font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 12px; text-decoration: none; text-transform: uppercase; display: block; text-align: center;">
              HOP ON GOOGLE MEET
            </a>
          </td>
          ` : ''}
        </tr>
      </table>
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
