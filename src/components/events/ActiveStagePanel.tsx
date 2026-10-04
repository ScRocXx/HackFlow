'use client'

import { Calendar, ChevronDown, Download } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { CountdownTimer } from '@/components/events/CountdownTimer'
import { StageChecklist } from '@/components/events/StageChecklist'
import { downloadIcsFile, getGoogleCalendarUrl } from '@/lib/calendar/calendar-sync'
import { cn } from '@/lib/utils'
import type { EventStage, StageDeliverable } from '@/lib/supabase/types'

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
      <Card className="border border-hack-muted/60 bg-hack-surface rounded-xl shadow-hack-card overflow-hidden">
        <div className="bg-hack-surface p-4 sm:p-6 border-b border-hack-muted/40 text-hack-ink">
          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border border-hack-coral/40 bg-hack-coral/15 text-hack-coral-dark">
                  WHAT MATTERS NOW
                </span>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border border-hack-gold/40 bg-hack-gold/15 text-hack-gold-dark">
                  {currentDisplayStage.stage_type}
                </span>
                {currentDisplayStage.raw_date_snippet && (
                  <span className="font-mono text-[10px] font-medium tracking-wider px-2 py-0.5 rounded-md border border-hack-muted bg-hack-sand text-hack-subtext">
                    🗓️ {currentDisplayStage.raw_date_snippet}
                  </span>
                )}
                {focusedStageId && focusedStageId !== activeStage?.id && (
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border border-hack-blue/50 bg-hack-blue/15 text-hack-blue-dark">
                    Viewing Round {currentDisplayStage.round_number || ''}
                  </span>
                )}
              </div>
              <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-hack-ink tracking-tight">
                {currentDisplayStage.title}
              </h2>
              {currentDisplayStage.deliverables_description && (
                <p className="font-sans text-sm text-hack-subtext mt-1 max-w-xl leading-relaxed">
                  {currentDisplayStage.deliverables_description}
                </p>
              )}
            </div>

            <div className="text-left sm:text-right flex flex-col sm:items-end shrink-0">
              <CountdownTimer 
                deadline={currentDisplayStage.actionable_deadline || currentDisplayStage.deadline} 
                windowStart={currentDisplayStage.window_start}
                windowEnd={currentDisplayStage.window_end}
                showMilestoneLabel={Boolean(currentDisplayStage.actionable_deadline || currentDisplayStage.deadline || currentDisplayStage.window_start)}
                showTimezoneBadge={true}
              />

              {/* Consolidated Cutoff Schedule Dropdown */}
              <div className="mt-2.5 flex justify-start sm:justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="font-mono text-[10px] sm:text-xs font-semibold rounded-lg border border-hack-muted/60 bg-hack-surface hover:bg-hack-sand text-hack-ink shadow-hack-sm h-7 sm:h-8 px-2.5 flex items-center gap-1.5 active:scale-95"
                    >
                      <Calendar className="w-3.5 h-3.5 text-hack-gold-dark shrink-0" />
                      <span>Sync Cutoff</span>
                      <ChevronDown className="w-3 h-3 text-hack-subtext shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="border border-hack-muted/60 bg-hack-surface rounded-xl shadow-hack-dialog font-mono text-xs w-48 p-1.5">
                    <DropdownMenuItem
                      onClick={() => window.open(getGoogleCalLink(), '_blank', 'noopener,noreferrer')}
                      className="cursor-pointer font-semibold text-hack-ink hover:bg-hack-sand rounded-lg px-2.5 py-2 flex items-center gap-2"
                    >
                      <Calendar className="w-3.5 h-3.5 text-hack-gold-dark shrink-0" />
                      <span>Google Calendar</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleDownloadIcs}
                      className="cursor-pointer font-semibold text-hack-ink hover:bg-hack-sand rounded-lg px-2.5 py-2 flex items-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5 text-hack-mint-dark shrink-0" />
                      <span>Apple / Outlook (.ics)</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
          
          <div className="p-3 sm:p-4 bg-hack-sand/40 border-t border-hack-muted/40 flex justify-end">
            <Button 
              onClick={onCompleteStage} 
              disabled={isCompleting || currentDisplayStage.is_completed}
              className={cn(
                "font-mono text-xs font-bold rounded-lg transition-all",
                currentDisplayStage.is_completed 
                  ? "bg-hack-mint/30 text-hack-mint-dark border border-hack-mint" 
                  : "bg-hack-coral text-hack-ink shadow-hack-hero hover:brightness-105"
              )}
            >
              {currentDisplayStage.is_completed ? 'Stage Completed ✓' : 'Mark Stage Complete'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
