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
}

/**
 * Returns actionable milestone protocols explaining exactly what the squad must do right now.
 */
function getMilestoneProtocol(intervalKey: string): { title: string; subtitle: string; tips: string[] } {
  switch (intervalKey) {
    case '6h':
      return {
        title: '🚨 CRITICAL SUBMISSION LOCK (FINAL 6 HOURS)',
        subtitle: 'Do not start new features! Verify links and submit early to avoid portal crashes.',
        tips: [
          'Submit your entry NOW — do not wait for the final 30 minutes when servers get congested.',
          'Verify that your GitHub repository is strictly PUBLIC (not private).',
          'Confirm that demo video permissions (YouTube/Loom/Drive) are set to "Anyone with the link".',
          'Make sure all team members are listed and confirmed on the organizer portal.',
        ],
      };
    case '24h':
      return {
        title: '⚡ 24-HOUR CODE FREEZE & SUBMISSION PREP',
        subtitle: 'Core development should be freezing. Shift focus to presentation, video, and testing.',
        tips: [
          'Code Freeze: Stop adding complex new features and focus on stability and bug fixes.',
          'Presentation & Demo: Build your slide deck and record a 2–3 minute video demo.',
          'Portal Walkthrough: Review all submission questions, character limits, and upload fields.',
          'Squad Sync: Check off all pending deliverables below with your teammates.',
        ],
      };
    case '3d':
      return {
        title: '⏳ MIDPOINT SPRINT & PROTOTYPE CHECK',
        subtitle: 'Halfway mark. Your core MVP user flow should be working end-to-end.',
        tips: [
          'MVP Validation: Confirm your core prototype demo flow works without critical crashes.',
          'Slide Deck Draft: Create the initial presentation outline and problem-solution pitch.',
          'Task Rebalance: Reassign stalled tasks among squad members to ensure full coverage.',
        ],
      };
    case '7d':
    default:
      return {
        title: '🚀 SPRINT KICKOFF & ARCHITECTURE SETUP',
        subtitle: 'Round is officially open. Align squad roles, architecture, and schedule.',
        tips: [
          'Problem Breakdown: Clarify problem statement requirements and judging rubrics.',
          'Tech Setup: Initialize your repository, configure environment keys, and set boilerplate.',
          'Deliverable Checklist: Break down the stage into assigned checklist items in HackFlow.',
        ],
      };
  }
}

/**
 * Renders the High-Urgency Action-First Emergency Heads-Up Display (HUD) HTML email.
 * Styled with HackFlow signature palette matching the notification bell:
 * #2e4742 / #3d5f58 spruce slate header, #f7f7f2 warm cream background, #10201d brutalist ink borders,
 * #e97b77 coral action button, and high-contrast status tags (#f5b726 amber / #e53927 urgent red).
 */
export function renderDeadlineReminderHtml(props: DeadlineReminderEmailProps): string {
  const safeEventUrl = ensureExternalUrl(props.eventUrl);
  const safeMeetUrl = props.meetUrl ? ensureExternalUrl(props.meetUrl) : null;
  const protocol = getMilestoneProtocol(props.intervalKey);

  // Milestone Tag styling matching NotificationBell.tsx
  const badgeBg = props.intervalKey === '6h' ? '#e53927' : props.intervalKey === '24h' ? '#f5b726' : props.intervalKey === '3d' ? '#8bb2de' : '#52b788';
  const badgeTextColor = props.intervalKey === '6h' ? '#ffffff' : '#10201d';
  const badgeLabel = props.intervalKey === '6h' ? 'CRITICAL 6H' : props.intervalKey === '24h' ? '24H FREEZE' : props.intervalKey === '3d' ? '3 DAYS LEFT' : 'STAGE KICKOFF';

  // Format cutoff string cleanly (prevent duplicate 'IST (IST)')
  let formattedCutoff = props.cutoffDate || 'CHECK WORKSPACE';
  if (props.timezone && !formattedCutoff.includes(props.timezone)) {
    formattedCutoff += ` ${props.timezone}`;
  }

  // Deliverables checklist section
  let deliverablesHtml = '';
  if (props.deliverables && props.deliverables.length > 0) {
    const sorted = [...props.deliverables].sort((a, b) => (a.is_done === b.is_done ? 0 : a.is_done ? 1 : -1));
    const pendingCount = sorted.filter(d => !d.is_done).length;
    const doneCount = sorted.filter(d => d.is_done).length;

    deliverablesHtml = `
      <div style="margin: 24px 0;">
        <div style="background-color: #10201d; color: #f7f7f2; padding: 8px 12px; font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; display: flex; justify-content: space-between; align-items: center;">
          <span>Action Deliverables Checklist</span>
          <span style="color: ${pendingCount > 0 ? '#f5b726' : '#52b788'}; font-weight: 900;">${pendingCount} Pending / ${doneCount} Complete</span>
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse: separate; border-spacing: 0 6px; margin-top: 8px;">
          ${sorted.slice(0, 10).map(d => `
            <tr>
              <td style="padding: 10px 14px; background-color: ${d.is_done ? '#eaf4f0' : '#fff1f0'}; border: 2px solid ${d.is_done ? '#2e4742' : '#e53927'}; font-family: 'SF Mono', Consolas, Monaco, monospace;">
                <span style="color: ${d.is_done ? '#1b4332' : '#e53927'}; font-weight: 900; font-size: 12px; margin-right: 10px; display: inline-block;">
                  ${d.is_done ? '[✓] DONE' : '[!] PENDING'}
                </span>
                <span style="color: ${d.is_done ? '#57726d' : '#10201d'}; font-size: 13px; font-weight: ${d.is_done ? 'normal' : 'bold'}; ${d.is_done ? 'text-decoration: line-through;' : ''}">
                  ${escapeHtml(d.title)}
                </span>
              </td>
            </tr>
          `).join('')}
        </table>
        ${sorted.length > 10 ? `
          <div style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 11px; color: #57726d; margin-top: 6px; text-align: right;">
            + ${sorted.length - 10} more deliverables in workspace
          </div>
        ` : ''}
      </div>
    `;
  } else if (props.checklistProgress) {
    deliverablesHtml = `
      <div style="background-color: #ffffff; padding: 14px 18px; border: 2px solid #10201d; border-left: 6px solid #2e4742; margin: 20px 0; font-family: 'SF Mono', Consolas, monospace; font-size: 13px; color: #10201d;">
        <span style="color: #2e4742; font-weight: 800; text-transform: uppercase;">Checklist Status:</span> ${escapeHtml(props.checklistProgress)}
      </div>
    `;
  }

  // Stage description / instructions box (if available)
  let descriptionHtml = '';
  if (props.deliverablesDescription && props.deliverablesDescription.trim().length > 0) {
    descriptionHtml = `
      <div style="background-color: #ffffff; border: 2px solid #10201d; padding: 16px 18px; margin: 20px 0; box-shadow: 3px 3px 0 #10201d;">
        <div style="font-family: 'SF Mono', Consolas, monospace; font-size: 11px; font-weight: 900; color: #2e4742; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
          📋 Stage Guidelines &amp; Submission Rubric
        </div>
        <div style="font-size: 13px; line-height: 1.5; color: #34433f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          ${escapeHtml(props.deliverablesDescription)}
        </div>
      </div>
    `;
  }

  // Constraints section
  let constraintsHtml = '';
  if (props.constraints && Object.values(props.constraints).some(Boolean)) {
    constraintsHtml = `
      <div style="background-color: #ffffff; border: 2px dashed #10201d; padding: 14px 16px; margin: 20px 0;">
        <div style="font-family: 'SF Mono', Consolas, monospace; font-size: 11px; font-weight: 800; color: #10201d; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
          ⚙️ Stage Format &amp; Constraints
        </div>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family: 'SF Mono', Consolas, monospace; font-size: 12px; color: #10201d;">
          ${props.constraints.format ? `<tr><td style="padding: 3px 0; width: 120px; color: #57726d;">Format:</td><td style="color: #10201d; font-weight: bold;">${escapeHtml(props.constraints.format)}</td></tr>` : ''}
          ${props.constraints.teamSize ? `<tr><td style="padding: 3px 0; color: #57726d;">Squad Size:</td><td style="color: #10201d; font-weight: bold;">${escapeHtml(props.constraints.teamSize)}</td></tr>` : ''}
          ${props.constraints.fileLimit ? `<tr><td style="padding: 3px 0; color: #57726d;">Size Limit:</td><td style="color: #10201d; font-weight: bold;">${escapeHtml(props.constraints.fileLimit)}</td></tr>` : ''}
        </table>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(props.eventTitle)} - HackFlow</title>
</head>
<body style="background-color: #f2f2eb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 24px; color: #10201d;">
  <div style="background-color: #f7f7f2; max-width: 620px; margin: 0 auto; border: 2px solid #10201d; box-shadow: 6px 6px 0px #10201d; overflow: hidden;">
    
    <!-- 1. Top Navbar: Exact HackFlow Website Navbar (#3d5f58) with HACKFLOW Wordmark and Brand Squares -->
    <div style="background-color: #3d5f58; color: #f7f7f2; padding: 14px 22px; border-bottom: 2px solid #10201d;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="left" style="vertical-align: middle;">
            <div style="display: inline-block; vertical-align: middle;">
              <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 18px; font-weight: 900; letter-spacing: -0.5px; color: #f7f7f2; text-transform: uppercase;">
                HACK<span style="color: #e53927;">FLOW</span>
              </span>
              <span style="display: inline-block; vertical-align: middle; margin-left: 6px; margin-bottom: 2px;">
                <span style="display: inline-block; width: 6px; height: 6px; background-color: #e53927; border: 1px solid #10201d; margin-right: 1px;"></span>
                <span style="display: inline-block; width: 6px; height: 6px; background-color: #8bb2de; border: 1px solid #10201d; margin-right: 1px;"></span>
                <span style="display: inline-block; width: 6px; height: 6px; background-color: #f5b726; border: 1px solid #10201d; margin-right: 1px;"></span>
                <span style="display: inline-block; width: 6px; height: 6px; background-color: #e97b77; border: 1px solid #10201d;"></span>
              </span>
            </div>
          </td>
          <td align="right" style="vertical-align: middle;">
            <span style="background-color: ${badgeBg}; color: ${badgeTextColor}; border: 2px solid #10201d; box-shadow: 2px 2px 0 #10201d; padding: 4px 10px; font-weight: 900; font-size: 11px; letter-spacing: 1px; font-family: 'SF Mono', Consolas, Monaco, monospace; text-transform: uppercase; display: inline-block;">
              ${badgeLabel}
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- 2. Website Announcement Ribbon (#8bb2de) -->
    <div style="background-color: #8bb2de; color: #10201d; padding: 8px 22px; font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 11px; font-weight: 800; border-bottom: 2px solid #10201d; letter-spacing: 0.5px;">
      ⚡ SPRINT DEADLINE NOTIFICATION // TIME-SENSITIVE WORKSPACE UPDATE
    </div>

    <!-- 3. Event & Stage Header -->
    <div style="padding: 24px 28px 18px 28px; border-bottom: 2px solid #10201d; background-color: #f7f7f2;">
      <span style="display: inline-block; background-color: #e4e5da; color: #2e4742; border: 1px solid #10201d; padding: 2px 8px; font-family: 'SF Mono', Consolas, monospace; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px;">
        ACTIVE SPRINT
      </span>
      <h1 style="margin: 0 0 6px 0; font-size: 24px; font-weight: 900; color: #10201d; letter-spacing: -0.5px; line-height: 1.25;">
        ${escapeHtml(props.eventTitle)}
      </h1>
      <div style="font-family: 'SF Mono', Consolas, monospace; font-size: 14px; font-weight: 800; color: #e53927; text-transform: uppercase; letter-spacing: 0.5px;">
        ROUND: ${escapeHtml(props.stageName)}
      </div>
    </div>

    <!-- 4. Countdown & Hard Cutoff Box (Website Brutalist Card) -->
    <div style="background-color: #ffffff; padding: 22px 28px; border-bottom: 2px solid #10201d; text-align: center;">
      <div style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #57726d; letter-spacing: 1.5px; margin-bottom: 6px;">
        TIME REMAINING UNTIL STAGE LOCK
      </div>
      <div style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 34px; font-weight: 900; color: #10201d; letter-spacing: 0.5px; margin: 4px 0 12px 0;">
        ⏳ ${escapeHtml(props.timeRemaining.toUpperCase())}
      </div>
      <div style="font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 12px; font-weight: bold; color: #f7f7f2; background-color: #10201d; padding: 7px 16px; border: 2px solid #10201d; display: inline-block;">
        HARD CUTOFF: <strong style="color: #ffffff;">${escapeHtml(formattedCutoff)}</strong>
      </div>
    </div>

    <!-- 5. What You Need To Do Right Now (Protocol Guide) -->
    <div style="background-color: #e4e5da; border-bottom: 2px solid #10201d; padding: 18px 28px;">
      <div style="font-family: 'SF Mono', Consolas, monospace; font-size: 12px; font-weight: 900; color: #10201d; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
        ${protocol.title}
      </div>
      <p style="margin: 0 0 12px 0; font-size: 13px; color: #34433f; line-height: 1.45;">
        ${protocol.subtitle}
      </p>
      <ul style="margin: 0; padding-left: 18px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #10201d; line-height: 1.6;">
        ${protocol.tips.map(tip => `<li style="margin-bottom: 4px;">${escapeHtml(tip)}</li>`).join('')}
      </ul>
    </div>

    <!-- 6. Deliverables & Constraints Body -->
    <div style="padding: 24px 28px;">
      ${descriptionHtml}
      ${deliverablesHtml}
      ${constraintsHtml}

      <!-- Action-First CTAs -->
      <div style="margin: 32px 0 16px 0; text-align: center;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding-bottom: 12px;">
              <a href="${safeEventUrl}" style="background-color: #e97b77; color: #10201d; padding: 15px 32px; text-decoration: none; font-family: 'SF Mono', Consolas, Monaco, monospace; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; display: block; border: 2px solid #10201d; box-shadow: 4px 4px 0 #10201d;">
                🚀 OPEN WORKSPACE &amp; SUBMIT DELIVERABLES &rarr;
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

    <!-- 7. Notification Footer matching Website Footer (#2e4742) -->
    <div style="background-color: #2e4742; border-top: 2px solid #10201d; padding: 18px 24px; text-align: center; font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 11px; color: #f7f7f2; letter-spacing: 1px;">
      HACK<span style="color: #e97b77;">FLOW</span> // SQUAD DEADLINE NOTIFICATION ENGINE
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
