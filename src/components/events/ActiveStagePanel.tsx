'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CountdownTimer } from '@/components/events/CountdownTimer'
import { StageChecklist } from '@/components/events/StageChecklist'
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
  currentUserId?: string
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
  currentUserId,
  className,
}: ActiveStagePanelProps) {
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
            </div>
          </div>
        </div>
        
        <CardContent className="p-0">
          <StageChecklist 
            stageId={currentDisplayStage.id} 
            deliverables={deliverables} 
            eventId={eventId} 
            currentUserId={currentUserId}
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
