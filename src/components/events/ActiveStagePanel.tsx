'use client'

import { Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CountdownTimer } from '@/components/events/CountdownTimer'
import { StageChecklist } from '@/components/events/StageChecklist'
import { downloadIcsFile, getGoogleCalendarUrl } from '@/lib/calendar/calendar-sync'
import type { EventStage, StageDeliverable } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

interface ActiveStagePanelProps {
  currentDisplayStage: EventStage
  activeStage: EventStage | null
  focusedStageId: string | null
  eventTitle: string
  eventId: string
  eventMode?: string
  eventLocation?: string | null
  eventSourceUrl?: string | null
  eventCurrentStageDeliverables?: StageDeliverable[]
  isCompleting: boolean
  onCompleteStage: () => void
  className?: string
}

export function ActiveStagePanel({
  currentDisplayStage,
  activeStage,
  focusedStageId,
  eventTitle,
  eventId,
  eventMode,
  eventLocation,
  eventSourceUrl,
  eventCurrentStageDeliverables = [],
  isCompleting,
  onCompleteStage,
  className,
}: ActiveStagePanelProps) {
  const getGoogleCalLink = () => {
    const dlStr = currentDisplayStage.actionable_deadline || currentDisplayStage.window_end || currentDisplayStage.deadline
    if (!dlStr) return '#'

    const kickoff = currentDisplayStage.window_start ? new Date(currentDisplayStage.window_start) : null
    return getGoogleCalendarUrl({
      title: `${eventTitle} - ${currentDisplayStage.title} Cutoff`,
      description: `Submission deadline for ${eventTitle} (${currentDisplayStage.title}).\nAction required: Complete and submit deliverables before freeze.`,
      deadline: new Date(dlStr),
      kickoffDate: kickoff,
      eventUrl: typeof window !== 'undefined' ? window.location.href : undefined,
    })
  }

  const handleDownloadIcs = () => {
    const dlStr = currentDisplayStage.actionable_deadline || currentDisplayStage.window_end || currentDisplayStage.deadline
    if (!dlStr) return

    const cutoffDate = new Date(dlStr)
    const kickoff = currentDisplayStage.window_start ? new Date(currentDisplayStage.window_start) : null

    downloadIcsFile({
      title: `${eventTitle} - ${currentDisplayStage.title} Cutoff`,
      description: `Submission deadline for ${eventTitle} (${currentDisplayStage.title}).\nAction required: Complete and submit deliverables before portal cutoff.`,
      deadline: cutoffDate,
      kickoffDate: kickoff,
      eventUrl: typeof window !== 'undefined' ? window.location.href : undefined,
    })
  }

  const deliverables = currentDisplayStage.stage_deliverables || 
    currentDisplayStage.deliverables || 
    (currentDisplayStage.id === activeStage?.id ? eventCurrentStageDeliverables : []) || 
    []

  return (
    <div className={className}>
      <Card className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[5px_5px_0_#671912] sm:shadow-[7px_7px_0_#671912] overflow-hidden">
        <div className="bg-[#3d5f58] p-4 sm:p-6 border-b-2 border-[#10201d] text-[#f7f7f2]">
          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-2 border-[#10201d] bg-[#f5b726] text-[#10201d] shadow-[2px_2px_0_#10201d]">
                  {currentDisplayStage.stage_type}
                </span>
                {currentDisplayStage.raw_date_snippet && (
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border border-[#10201d] bg-[#f7f7f2] text-[#10201d]">
                    🗓️ {currentDisplayStage.raw_date_snippet}
                  </span>
                )}
                {focusedStageId && focusedStageId !== activeStage?.id && (
                  <span className="font-mono text-[10px] font-black uppercase tracking-wider px-2 py-0.5 border border-[#10201d] bg-[#8bb2de] text-[#10201d]">
                    Browsing Round {currentDisplayStage.round_number || ''}
                  </span>
                )}
              </div>
              <h2 className="font-display text-xl sm:text-3xl font-extrabold text-[#f7f7f2] tracking-tight">
                {currentDisplayStage.title}
              </h2>
              {currentDisplayStage.deliverables_description && (
                <p className="font-mono text-xs text-[#f7f7f2]/80 mt-1 max-w-xl">
                  {currentDisplayStage.deliverables_description}
                </p>
              )}
            </div>

            <div className="text-left sm:text-right flex flex-col sm:items-end">
              <CountdownTimer 
                deadline={currentDisplayStage.actionable_deadline || currentDisplayStage.deadline} 
                windowStart={currentDisplayStage.window_start}
                windowEnd={currentDisplayStage.window_end}
                showMilestoneLabel={Boolean(currentDisplayStage.actionable_deadline || currentDisplayStage.deadline || currentDisplayStage.window_start)}
                showTimezoneBadge={true}
              />

              {/* Calendar Sync Weapon: Google Calendar + Phone .ics Alarm */}
              <div className="flex items-center justify-start sm:justify-end gap-1.5 mt-2 flex-wrap">
                <a
                  href={getGoogleCalLink()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[10px] font-bold px-2 py-1 border-2 border-[#10201d] bg-[#f5b726] hover:bg-[#ffcf66] text-[#10201d] shadow-[2px_2px_0_#10201d] inline-flex items-center gap-1 transition-all"
                  title="Add cutoff to Google Calendar"
                >
                  <Calendar className="w-3 h-3" />
                  + G-Calendar
                </a>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadIcs}
                  className="font-mono text-[10px] font-bold border-2 border-[#10201d] bg-[#f7f7f2] hover:bg-[#8bb2de] text-[#10201d] shadow-[2px_2px_0_#10201d] h-7 px-2"
                  title="Download .ics alarm with -24h and -2h phone notifications"
                >
                  ⚡ Phone Alarm (.ics)
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <CardContent className="p-0">
          <StageChecklist 
            stageId={currentDisplayStage.id} 
            deliverables={deliverables} 
            eventId={eventId} 
          />
          
          <div className="p-3 sm:p-4 bg-[#f7f7f2] border-t-2 border-[#10201d] flex justify-end">
            <Button 
              onClick={onCompleteStage} 
              disabled={isCompleting || currentDisplayStage.is_completed}
              className="font-mono text-xs font-bold"
            >
              {currentDisplayStage.is_completed ? 'Stage Completed' : 'Mark Stage Complete'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
