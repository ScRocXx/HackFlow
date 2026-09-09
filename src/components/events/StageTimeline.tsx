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
    <div className="relative overflow-x-auto pb-4">
      <div className="flex items-center min-w-max px-2">
        {stages.map((stage, index) => {
          const isActive = stage.id === activeStageId
          const isCompleted = index < activeIndex || stage.status === 'completed'
          const isLast = index === stages.length - 1

          return (
            <div key={stage.id} className="flex items-center">
              <div className="relative flex flex-col items-center group">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors z-10 bg-white",
                  isCompleted ? "border-green-500 bg-green-500 text-white" :
                  isActive ? "border-blue-500 ring-4 ring-blue-100" :
                  "border-slate-300 text-slate-400"
                )}>
                  {isCompleted ? <Check className="w-4 h-4" /> : <span className="text-sm font-medium">{index + 1}</span>}
                </div>
                
                <div className="absolute top-10 w-32 text-center">
                  <p className={cn(
                    "text-xs font-medium line-clamp-2",
                    isActive ? "text-blue-700" :
                    isCompleted ? "text-slate-600" : "text-slate-400"
                  )}>
                    {stage.title}
                  </p>
                </div>
              </div>

              {!isLast && (
                <div className={cn(
                  "h-0.5 w-16 sm:w-24 -translate-y-4",
                  isCompleted ? "bg-green-500" : "bg-slate-200"
                )} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
