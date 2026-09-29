'use client'

import { MapPin, Globe, MoreHorizontal, Edit3, Trash2, ExternalLink, Calendar } from 'lucide-react'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { StatusPills } from '@/components/events/StatusPills'
import { MeetCompanionBar } from '@/components/events/MeetCompanionBar'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { getPlatformBadge } from '@/lib/utils/platform'
import { ensureExternalUrl } from '@/lib/utils/url'
import { downloadIcsFile, getGoogleCalendarUrl } from '@/lib/calendar/calendar-sync'
import type { EventWithRelations, EventStage } from '@/lib/supabase/types'

interface WorkspaceHeaderProps {
  event: EventWithRelations
  activeStage: EventStage | null
  onEditClick: () => void
  onDeleteClick: () => void
}

export function WorkspaceHeader({
  event,
  activeStage,
  onEditClick,
  onDeleteClick,
}: WorkspaceHeaderProps) {
  const platformBadge = getPlatformBadge(event.source_platform)

  const getGoogleCalLink = () => {
    if (!activeStage) return '#'
    const dlStr = activeStage.actionable_deadline || activeStage.window_end || activeStage.deadline
    if (!dlStr) return '#'

    const kickoff = activeStage.window_start ? new Date(activeStage.window_start) : null
    return getGoogleCalendarUrl({
      title: `${event.title} - ${activeStage.title} Cutoff`,
      description: `Submission deadline for ${event.title} (${activeStage.title}).\nAction required: Complete and submit deliverables before freeze.`,
      deadline: new Date(dlStr),
      kickoffDate: kickoff,
      eventUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      meetUrl: event.meet_url,
    })
  }

  const handleDownloadIcs = () => {
    if (!activeStage) return
    const dlStr = activeStage.actionable_deadline || activeStage.window_end || activeStage.deadline
    if (!dlStr) return

    const cutoffDate = new Date(dlStr)
    const kickoff = activeStage.window_start ? new Date(activeStage.window_start) : null

    downloadIcsFile({
      title: `${event.title} - ${activeStage.title} Cutoff`,
      description: `Submission deadline for ${event.title} (${activeStage.title}).\nAction required: Complete and submit deliverables before portal cutoff.`,
      deadline: cutoffDate,
      kickoffDate: kickoff,
      eventUrl: typeof window !== 'undefined' ? window.location.href : undefined,
      meetUrl: event.meet_url,
    })
  }

  return (
    <div className="border-2 border-hack-ink bg-hack-panel p-4 sm:p-6 shadow-[5px_5px_0_#671912] sm:shadow-[7px_7px_0_#671912] space-y-4">
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={cn(
                "font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 border-2 border-hack-ink shadow-hack-sm",
                platformBadge.className
              )}
            >
              {platformBadge.label}
            </span>
            {event.mode && (
              <span className="font-mono text-xs font-bold uppercase tracking-wider px-2 py-0.5 border-2 border-hack-ink bg-hack-panel text-hack-ink shadow-hack-sm flex items-center">
                {event.mode === 'in-person' ? <MapPin className="w-3 h-3 mr-1" /> : <Globe className="w-3 h-3 mr-1" />}
                <span className="capitalize">{event.mode}</span>
              </span>
            )}
            {(event.prize_display_summary || event.prize_pool) && (
              <span className="font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 border-2 border-hack-ink bg-hack-yellow text-hack-ink shadow-hack-sm flex items-center gap-1">
                🏆 {event.prize_display_summary || event.prize_pool}
              </span>
            )}
          </div>
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold text-hack-ink tracking-tight">{event.title}</h1>
          <p className="font-mono text-xs text-hack-subtext font-bold">{event.organizer || 'Independent Hackathon'}</p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start">
          <div className="w-full sm:w-auto">
            <StatusPills eventId={event.id} currentStatus={event.status || 'registered'} />
          </div>

          {/* Overflow Options Menu (...) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                title="Hackathon options"
                aria-label="Hackathon options"
                className="p-2 border-2 border-hack-ink bg-hack-panel hover:bg-hack-muted active:scale-95 text-hack-ink shadow-hack-sm transition-all touch-manipulation h-10 w-10 flex items-center justify-center shrink-0"
              >
                <MoreHorizontal className="w-4 h-4" />
                <span className="sr-only">More options</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="border-2 border-hack-ink bg-hack-panel shadow-hack-sm font-mono text-xs w-48">
              <DropdownMenuItem
                onClick={onEditClick}
                className="cursor-pointer font-bold text-hack-ink hover:bg-hack-muted"
              >
                <Edit3 className="w-3.5 h-3.5 mr-2 text-hack-subtext" /> Edit Hackathon
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDeleteClick}
                className="cursor-pointer font-bold text-hack-red hover:bg-hack-pink"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2 text-hack-red" /> Delete Hackathon
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Prominent Next Actionable Deadline Strip */}
      <div className="border-2 border-hack-ink bg-hack-sand p-3 sm:p-4 shadow-hack-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="font-mono text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-hack-subtext block">
            Next Actionable Deadline
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-sm sm:text-base font-extrabold text-hack-red">
              {(activeStage?.actionable_deadline || activeStage?.deadline)
                ? format(new Date((activeStage.actionable_deadline || activeStage.deadline)!), 'dd MMM yyyy · HH:mm')
                : (activeStage?.raw_date_snippet || 'TBA')}
            </span>
            {activeStage?.title && (
              <span className="font-mono text-xs text-hack-subtext font-bold">
                ({activeStage.title})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {event.source_url && (
            <a
              href={ensureExternalUrl(event.source_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs font-bold px-3 py-1.5 border-2 border-hack-ink bg-hack-panel hover:bg-hack-sky text-hack-ink shadow-hack-sm inline-flex items-center gap-1.5 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open Portal
            </a>
          )}
          <a
            href={getGoogleCalLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs font-bold px-3 py-1.5 border-2 border-hack-ink bg-hack-yellow hover:bg-[#ffcf66] text-hack-ink shadow-hack-sm inline-flex items-center gap-1.5 transition-all"
          >
            <Calendar className="w-3.5 h-3.5" /> + Calendar
          </a>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleDownloadIcs}
            className="font-mono text-xs font-bold border-2 border-hack-ink bg-hack-panel hover:bg-hack-mint text-hack-ink shadow-hack-sm h-8 px-2.5"
          >
            ⚡ Alarm (.ics)
          </Button>
        </div>
      </div>

      {/* Collapsible/Compact MeetCompanionBar */}
      <div className="pt-1">
        <MeetCompanionBar eventId={event.id} meetUrl={event.meet_url} />
      </div>
    </div>
  )
}
