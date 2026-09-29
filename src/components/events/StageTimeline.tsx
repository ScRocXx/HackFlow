'use client'

import { Check, Clock, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
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
  if (!stages || stages.length === 0) return null

  // activeIndex tracks which round the competition is currently in chronologically
  const activeIndex = stages.findIndex(s => s.id === activeStageId)
  // currentFocusId is the round currently selected by the user to view in the workspace
  const currentFocusId = selectedStageId || activeStageId || stages[0]?.id

  return (
    <div className="border-2 border-[#10201d] bg-[#f7f7f2] p-4 sm:p-5 shadow-[5px_5px_0_#10201d] space-y-3">
      <div className="flex items-center justify-between border-b-2 border-[#10201d]/15 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-[#e53927] inline-block" />
          <h3 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-[#10201d]">
            Stage Journey
          </h3>
        </div>
        <span className="font-mono text-[10px] sm:text-[11px] font-bold text-[#34433f] uppercase">
          Click any round to navigate deliverables
        </span>
      </div>

      <div className="relative overflow-x-auto pb-2 pt-1 no-scrollbar">
        <div className="flex items-stretch min-w-max gap-3 sm:gap-4 px-1">
          {stages.map((stage, index) => {
            const isChronologicallyActive = stage.id === activeStageId
            const isSelected = stage.id === currentFocusId
            const isCompleted = index < activeIndex || stage.is_completed || stage.status === 'completed'
            
            const deliverables = (stage as any).stage_deliverables || stage.deliverables || []
            const totalTasks = deliverables.length
            const doneTasks = deliverables.filter((d: { is_done?: boolean; completed?: boolean }) => d.is_done || d.completed).length

            // Format deadline date
            const dateDisplay = stage.raw_date_snippet || (stage.deadline ? (() => {
              try {
                return format(new Date(stage.actionable_deadline || stage.deadline), 'dd MMM, HH:mm')
              } catch {
                return null
              }
            })() : null)

            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => onStageSelect?.(stage.id)}
                className={cn(
                  "flex-1 min-w-[190px] sm:min-w-[220px] p-3 sm:p-3.5 border-2 border-[#10201d] text-left transition-all relative flex flex-col justify-between group touch-manipulation select-none",
                  isSelected
                    ? "bg-[#f2f2eb] shadow-[4px_4px_0_#10201d] -translate-y-0.5 border-[#10201d]"
                    : "bg-white hover:bg-[#f7f7f2] shadow-[2px_2px_0_#10201d] opacity-90 hover:opacity-100",
                  isChronologicallyActive && !isSelected && "ring-2 ring-[#e53927]/40"
                )}
              >
                {/* Active Indicator Pin */}
                {isChronologicallyActive && (
                  <div className="absolute -top-3 left-3 bg-[#e53927] text-white border border-[#10201d] font-mono text-[9px] font-black uppercase px-1.5 py-0.2 shadow-[1px_1px_0_#10201d] tracking-wider z-20">
                    You Are Here
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className={cn(
                      "w-7 h-7 border-2 border-[#10201d] flex items-center justify-center font-mono text-xs font-black shrink-0 transition-transform group-hover:scale-105",
                      isCompleted ? "bg-[#8bb2de] text-[#10201d]" :
                      isChronologicallyActive ? "bg-[#e97b77] text-[#10201d]" :
                      "bg-[#f7f7f2] text-[#34433f]"
                    )}>
                      {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : <span>{index + 1}</span>}
                    </div>

                    <span className={cn(
                      "font-mono text-[9px] font-black uppercase px-1.5 py-0.5 border border-[#10201d]",
                      isCompleted ? "bg-[#93C9B8] text-[#10201d]" :
                      isChronologicallyActive ? "bg-[#f5b726] text-[#10201d]" :
                      "bg-[#e4e5da] text-[#34433f]"
                    )}>
                      {isCompleted ? 'Cleared' : isChronologicallyActive ? 'Active' : 'Upcoming'}
                    </span>
                  </div>

                  <h4 className={cn(
                    "font-display text-sm sm:text-base font-bold uppercase line-clamp-1 leading-tight",
                    isSelected ? "text-[#e53927]" : "text-[#10201d]"
                  )}>
                    {stage.title}
                  </h4>

                  {dateDisplay && (
                    <p className="font-mono text-[10px] text-[#34433f] font-semibold flex items-center gap-1 mt-1 truncate">
                      <Calendar className="w-3 h-3 shrink-0" />
                      {dateDisplay}
                    </p>
                  )}
                </div>

                {/* Progress bar and task metrics */}
                <div className="mt-3 pt-2 border-t border-[#10201d]/15">
                  <div className="flex justify-between items-center font-mono text-[10px] font-bold text-[#34433f] mb-1">
                    <span>Deliverables</span>
                    <span>{totalTasks > 0 ? `${doneTasks}/${totalTasks}` : 'No checklist'}</span>
                  </div>
                  {totalTasks > 0 ? (
                    <div className="w-full h-1.5 border border-[#10201d] bg-[#e4e5da] overflow-hidden">
                      <div 
                        className={cn("h-full transition-all", isCompleted ? "bg-[#93C9B8]" : "bg-[#e97b77]")}
                        style={{ width: `${(doneTasks / totalTasks) * 100}%` }}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-1.5 border border-[#10201d]/30 bg-transparent" />
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
