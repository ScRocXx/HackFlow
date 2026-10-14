'use client'

import { Check, Clock, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { formatStageDeadline } from '@/lib/utils/deadline'
import type { EventStage } from '@/lib/supabase/types'

interface StageTimelineProps {
  stages: EventStage[]
  activeStageId: string | null
  selectedStageId?: string | null
  onStageSelect?: (stageId: string) => void
}

export function StageTimeline({ 
  stages, 
  activeStageId, 
  selectedStageId,
  onStageSelect 
}: StageTimelineProps) {
  // If event has 0 or 1 stage, do not render redundant Stage Journey
  if (!stages || stages.length <= 1) return null

  // activeIndex tracks which round the competition is currently in chronologically
  const activeIndex = stages.findIndex(s => s.id === activeStageId)
  // currentFocusId is the round currently selected by the user to view in the workspace
  const currentFocusId = selectedStageId || activeStageId || stages[0]?.id

  return (
    <div className="border border-hack-muted/60 bg-hack-surface p-4 sm:p-5 rounded-[6px] shadow-hack-card space-y-4">
      <div className="flex items-center justify-between border-b border-hack-muted/30 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-hack-coral inline-block" />
          <h3 className="font-display text-base sm:text-lg font-bold tracking-tight text-hack-ink">
            Rounds
          </h3>
        </div>
        <span className="font-mono text-[10px] sm:text-[11px] font-semibold text-hack-subtext uppercase">
          Click a round to switch tasks
        </span>
      </div>

      {/* Metro Line Track Rail */}
      <div className="relative px-2 hidden sm:block">
        <div className="h-1 bg-hack-ink/15 rounded-full w-full overflow-hidden">
          <div 
            className="h-full bg-hack-forest transition-all duration-500 ease-out"
            style={{ 
              width: `${stages.length > 1 && activeIndex >= 0 ? Math.min(100, ((activeIndex) / (stages.length - 1)) * 100) : 0}%` 
            }}
          />
        </div>
      </div>

      <div className="relative overflow-x-auto pb-2 pt-1 flex snap-x snap-mandatory gap-3 sm:gap-4 no-scrollbar">
        <div className="flex items-stretch min-w-max gap-3 sm:gap-4 px-1">
          {stages.map((stage, index) => {
            const isChronologicallyActive = stage.id === activeStageId
            const isSelected = stage.id === currentFocusId
            const isCompleted = index < activeIndex || stage.is_completed || stage.status === 'completed'
            
            const deliverables = (stage as any).deliverables || (stage as any).stage_deliverables || []
            const totalTasks = deliverables.length
            const doneTasks = deliverables.filter((d: { is_done?: boolean; completed?: boolean; is_completed?: boolean }) => d.is_done || d.is_completed || d.completed).length

            // Format deadline date using centralized priority
            const dateDisplay = formatStageDeadline(stage)

            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => onStageSelect?.(stage.id)}
                aria-label={`Select stage: ${stage.title}`}
                aria-current={isChronologicallyActive ? 'step' : undefined}
                className={cn(
                  "flex-1 min-w-[190px] sm:min-w-[220px] p-3 sm:p-3.5 rounded-[6px] border text-left transition-all relative flex flex-col justify-between group touch-manipulation select-none snap-center",
                  isSelected
                    ? "bg-hack-sand border-hack-coral/60 shadow-hack-hero -translate-y-0.5"
                    : "bg-white border-hack-muted/60 hover:border-hack-muted shadow-hack-card-quiet opacity-95 hover:opacity-100",
                  isChronologicallyActive && "ring-4 ring-hack-gold/30 border-hack-coral/50"
                )}
              >
                {/* Active Indicator Badge */}
                {isChronologicallyActive && (
                  <div className="absolute -top-2.5 left-3 bg-hack-coral text-hack-ink font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded-[4px] shadow-sm tracking-wider z-20">
                    Current Round
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className={cn(
                      "w-7 h-7 rounded-full border flex items-center justify-center font-mono text-xs font-bold shrink-0 transition-transform group-hover:scale-105",
                      isCompleted ? "bg-hack-mint border-hack-mint-dark/40 text-hack-ink" :
                      isChronologicallyActive ? "bg-hack-coral border-hack-coral text-hack-ink shadow-sm" :
                      "bg-hack-sand border-hack-muted text-hack-subtext"
                    )}>
                      {isCompleted ? <Check className="w-4 h-4 stroke-[2.5]" /> : <span>{index + 1}</span>}
                    </div>

                    <span className={cn(
                      "font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded-[4px] border",
                      isCompleted ? "bg-hack-mint/30 border-hack-mint text-hack-mint-dark" :
                      isChronologicallyActive ? "bg-hack-gold/25 border-hack-gold text-hack-gold-dark" :
                      "bg-hack-sand border-hack-muted text-hack-subtext"
                    )}>
                      {isCompleted ? 'Cleared' : isChronologicallyActive ? 'Active' : 'Upcoming'}
                    </span>
                  </div>

                  <h4 className={cn(
                    "font-display text-sm sm:text-base font-bold line-clamp-2 leading-tight break-words",
                    isSelected ? "text-hack-coral-dark" : "text-hack-ink"
                  )} title={stage.title}>
                    {stage.title}
                  </h4>

                  {dateDisplay && (
                    <p className="font-mono text-[10px] text-hack-subtext font-medium flex items-center gap-1 mt-1 truncate">
                      <Calendar className="w-3 h-3 shrink-0" />
                      {dateDisplay}
                    </p>
                  )}
                </div>

                {/* Progress bar and task metrics */}
                <div className="mt-3 pt-2 border-t border-hack-muted/30">
                  <div className="flex justify-between items-center font-mono text-[10px] font-medium text-hack-subtext mb-1">
                    <span>Tasks</span>
                    <span>{totalTasks > 0 ? `${doneTasks}/${totalTasks} done` : 'No tasks'}</span>
                  </div>
                  {totalTasks > 0 ? (
                    <div className="w-full h-1.5 rounded-full bg-hack-muted/50 overflow-hidden">
                      <div 
                        className={cn("h-full transition-all duration-500 ease-out rounded-full", isCompleted ? "bg-hack-mint" : "bg-hack-coral")}
                        style={{ width: `${(doneTasks / totalTasks) * 100}%` }}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-1.5 rounded-full bg-hack-muted/30" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
