'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StageTimelineProps {
  stages: any[]
  activeStageId: string | null
}

export function StageTimeline({ stages, activeStageId }: StageTimelineProps) {
  if (!stages || stages.length === 0) return null

  const activeIndex = stages.findIndex(s => s.id === activeStageId)

  return (
    <div className="relative overflow-x-auto pb-6">
      <div className="flex items-center min-w-max px-2">
        {stages.map((stage, index) => {
          const isActive = stage.id === activeStageId
          const isCompleted = index < activeIndex || stage.is_completed || stage.status === 'completed'
          const isLast = index === stages.length - 1

          return (
            <div key={stage.id} className="flex items-center">
              <div className="relative flex flex-col items-center group">
                <div className={cn(
                  "w-9 h-9 border-2 border-[#10201d] flex items-center justify-center font-mono text-xs font-bold transition-all z-10 select-none",
                  isCompleted ? "bg-[#8bb2de] text-[#10201d] shadow-[2px_2px_0_#2e4742]" :
                  isActive ? "bg-[#e97b77] text-[#10201d] shadow-[3px_3px_0_#671912] scale-110" :
                  "bg-[#f7f7f2] text-[#34433f]/70"
                )}>
                  {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : <span>{index + 1}</span>}
                </div>
                
                <div className="absolute top-11 w-32 text-center">
                  <p className={cn(
                    "font-mono text-xs font-bold line-clamp-2 uppercase tracking-tight",
                    isActive ? "text-[#e53927]" :
                    isCompleted ? "text-[#10201d]" : "text-[#34433f]/60"
                  )}>
                    {stage.title}
                  </p>
                </div>
              </div>

              {!isLast && (
                <div className={cn(
                  "h-1 w-16 sm:w-24 -translate-y-4 border-y border-[#10201d]",
                  isCompleted ? "bg-[#8bb2de]" : "bg-[#e4e5da]"
                )} />
              )}
            </div>
          )
        })}
      </div>
    </div>

  )
}
