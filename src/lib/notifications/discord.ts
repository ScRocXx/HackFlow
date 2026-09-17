/**
 * Discord Webhook Alert Dispatcher for HackFlow Squads.
 * Sends high-urgency embed alerts to a squad's Discord channel when deadlines approach
 * or team deliverables are completed.
 */

export interface DiscordEmbedField {
  name: string
  value: string
  inline?: boolean
}

export interface DiscordEmbed {
  title?: string
  description?: string
  url?: string
  color?: number // Integer color code (e.g. 0xe53927 for red)
  fields?: DiscordEmbedField[]
  footer?: { text: string; icon_url?: string }
  timestamp?: string
}

export interface DiscordWebhookPayload {
  username?: string
  avatar_url?: string
  content?: string
  embeds?: DiscordEmbed[]
}

/**
 * Sends a generic webhook payload to a Discord Webhook URL.
 */
export async function sendDiscordWebhook(
  webhookUrl: string,
  payload: DiscordWebhookPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!webhookUrl || !webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
      return { success: false, error: 'Invalid Discord Webhook URL' }
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: payload.username || 'HackFlow Telemetry',
        avatar_url: payload.avatar_url || 'https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/zap.png',
        ...payload,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error(`[DiscordAlert] Webhook returned HTTP ${response.status}:`, errText)
      return { success: false, error: errText }
    }

    return { success: true }
  } catch (err: any) {
    console.error('[DiscordAlert] Failed to dispatch Discord alert:', err)
    return { success: false, error: err?.message || 'Network error dispatching Discord webhook' }
  }
}

/**
 * Dispatches a high-urgency deadline alert embed to Discord.
 */
export async function sendDiscordDeadlineAlert(params: {
  webhookUrl?: string | null
  eventTitle: string
  stageName: string
  timeRemaining: string
  eventUrl: string
  intervalKey: string
  checklistProgress?: string
  cutoffDate?: string
}) {
  const targetUrl = params.webhookUrl || process.env.DISCORD_WEBHOOK_URL
  if (!targetUrl) {
    return { success: false, error: 'No Discord webhook URL configured.' }
  }

  const getColor = (key: string): number => {
    switch (key) {
      case '6h': return 0xe53927 // Blood Red
      case '24h': return 0xf97316 // Orange
      case '3d': return 0xf5b726 // Yellow
      case '7d': return 0x52b788 // Green
      default: return 0x8bb2de // Blue
    }
  }

  const embed: DiscordEmbed = {
    title: `🚨 [${params.intervalKey.toUpperCase()}] ${params.eventTitle}`,
    description: `Active Stage: **${params.stageName}** is approaching its hard submission cutoff.`,
    url: params.eventUrl,
    color: getColor(params.intervalKey),
    fields: [
      {
        name: '⏳ Time Remaining',
        value: `**${params.timeRemaining.toUpperCase()}**`,
        inline: true,
      },
      {
        name: '📅 Hard Cutoff',
        value: params.cutoffDate || 'Check Workspace',
        inline: true,
      },
      {
        name: '📋 Deliverables Status',
        value: params.checklistProgress || 'Pending Checklist Items',
        inline: false,
      },
      {
        name: '⚡ Action Directive',
        value: `[Open HackFlow War-Room Workspace](${params.eventUrl})`,
        inline: false,
      },
    ],
    footer: {
      text: 'HackFlow Squad Telemetry Engine',
    },
    timestamp: new Date().toISOString(),
  }

  return sendDiscordWebhook(targetUrl, {
    embeds: [embed],
  })
}

/**
 * Dispatches a deliverable task update alert to Discord.
 */
export async function sendDiscordDeliverableAlert(params: {
  webhookUrl?: string | null
  eventTitle: string
  deliverableTitle: string
  isDone: boolean
  doneByName?: string
  eventUrl: string
}) {
  const targetUrl = params.webhookUrl || process.env.DISCORD_WEBHOOK_URL
  if (!targetUrl) return { success: false, error: 'No webhook configured' }

  const color = params.isDone ? 0x52b788 : 0x8bb2de
  const statusLabel = params.isDone ? 'COMPLETED' : 'REOPENED'

  const embed: DiscordEmbed = {
    title: `📋 Deliverable ${statusLabel}: ${params.eventTitle}`,
    description: `Task: **${params.deliverableTitle}**`,
    url: params.eventUrl,
    color,
    fields: [
      {
        name: 'Updated By',
        value: params.doneByName || 'Teammate',
        inline: true,
      },
      {
        name: 'Workspace',
        value: `[Open Event](${params.eventUrl})`,
        inline: true,
      },
    ],
    footer: { text: 'HackFlow Sprint Tracker' },
    timestamp: new Date().toISOString(),
  }

  return sendDiscordWebhook(targetUrl, {
    embeds: [embed],
  })
}
