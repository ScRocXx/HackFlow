'use client'

import { useState, useEffect } from 'react'
import { Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ExtractedStageFact {
  round_number: number
  title: string
  deadline?: string | null
  raw_date_snippet?: string | null
  stage_type?: string
}

export interface ExtractionConfidence {
  roundsCount: number
  deadlinesCount: number
  deliverablesCount: number
  unconfirmedCount: number
}

interface ExtractionProgressProps {
  isExtracting: boolean
  confidence?: ExtractionConfidence | null
  stages?: ExtractedStageFact[]
  eventTitle?: string
}

const STEPS = [
  { id: 'read', label: 'Reading competition page...', delay: 0 },
  { id: 'event', label: 'Event & organizer detected', delay: 600 },
  { id: 'rounds', label: 'Parsing round milestones...', delay: 1200 },
  { id: 'deadlines', label: 'Extracting cutoff timestamps...', delay: 1800 },
  { id: 'deliverables', label: 'Structuring required deliverables...', delay: 2400 },
]

export function ExtractionProgress({ isExtracting, confidence, stages = [], eventTitle }: ExtractionProgressProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  useEffect(() => {
    if (!isExtracting) {
      setCurrentStepIndex(0)
      return
    }

    const timers = STEPS.map((step, idx) => {
      return setTimeout(() => {
        setCurrentStepIndex(idx)
      }, step.delay)
    })

    return () => {
      timers.forEach(clearTimeout)
    }
  }, [isExtracting])

  if (isExtracting) {
    return (
      <div className="rounded-lg border border-hack-ink/20 bg-hack-panel p-4 sm:p-5 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-hack-ink">
          <Loader2 className="w-4 h-4 animate-spin text-hack-coral-dark" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-hack-ink">
            Extracting Competition Details...
          </span>
        </div>

        <div className="space-y-2 pt-1 font-mono text-xs">
          {STEPS.map((step, idx) => {
            const isDone = idx < currentStepIndex
            const isCurrent = idx === currentStepIndex
            const isPending = idx > currentStepIndex

            return (
              <div 
                key={step.id}
                className={cn(
                  "flex items-center gap-2.5 transition-all duration-300",
                  isDone && "text-hack-ink font-medium",
                  isCurrent && "text-hack-ink font-bold scale-[1.01]",
                  isPending && "text-hack-subtext/40"
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-hack-mint-dark shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-hack-coral-dark animate-spin shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-hack-ink/20 shrink-0 inline-block" />
                )}
                <span>{step.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  if (confidence) {
    const hasUnconfirmed = confidence.unconfirmedCount > 0

    return (
      <div className="rounded-lg border border-hack-ink/15 bg-hack-panel p-4 shadow-sm space-y-3">
        {/* Header / Trust Question */}
        <div className="flex items-center justify-between gap-2 border-b border-hack-ink/10 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-hack-mint/30 text-hack-mint-dark">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="font-sans font-bold text-sm text-hack-ink">
                We found {confidence.roundsCount} {confidence.roundsCount === 1 ? 'round' : 'rounds'} {eventTitle ? `for ${eventTitle}` : ''}
              </p>
              <p className="font-mono text-[11px] text-hack-subtext">
                {hasUnconfirmed ? 'Partial match — please verify the highlighted deadlines below.' : 'Looks right? Review or adjust below before saving.'}
              </p>
            </div>
          </div>
          <span className={cn(
            "font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
            hasUnconfirmed 
              ? "bg-[#FEF9EE] text-[#8A5D13] border-[#F6C344]"
              : "bg-hack-mint/20 text-hack-mint-dark border-hack-mint/40"
          )}>
            {hasUnconfirmed ? 'Needs Review' : 'High Confidence'}
          </span>
        </div>

        {/* Fact Sheet Preview (Extracted Facts, not just counts) */}
        {stages.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
            {stages.map((stg) => {
              const formattedDate = stg.deadline 
                ? new Date(stg.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                : (stg.raw_date_snippet || 'TBA')
              const isTBA = !stg.deadline || formattedDate === 'TBA'

              return (
                <div 
                  key={stg.round_number} 
                  className={cn(
                    "p-2.5 rounded-md border text-xs font-mono space-y-1",
                    isTBA 
                      ? "bg-[#FEF9EE]/60 border-[#F6C344]/50" 
                      : "bg-hack-sand/50 border-hack-ink/10"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-hack-subtext">
                      Round {stg.round_number}
                    </span>
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.2 rounded",
                      isTBA ? "text-[#8A5D13] bg-[#F6C344]/20" : "text-hack-mint-dark bg-hack-mint/30"
                    )}>
                      {isTBA ? 'TBA' : formattedDate}
                    </span>
                  </div>
                  <p className="font-sans font-bold text-xs text-hack-ink truncate">
                    {stg.title}
                  </p>
                </div>
              )
            })}
          </div>
        )}

        {/* Summary Metric Chips */}
        <div className="flex items-center gap-3 font-mono text-[11px] text-hack-subtext pt-1 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-hack-mint-dark" /> {confidence.deadlinesCount} confirmed {confidence.deadlinesCount === 1 ? 'deadline' : 'deadlines'}
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-hack-mint-dark" /> {confidence.deliverablesCount} deliverables
          </span>
          {hasUnconfirmed && (
            <>
              <span>•</span>
              <span className="text-[#8A5D13] font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {confidence.unconfirmedCount} stage(s) marked TBA
              </span>
            </>
          )}
        </div>

        {hasUnconfirmed && (
          <div className="p-2.5 rounded-md border border-[#F6C344]/60 bg-[#FEF9EE] text-[#8A5D13] font-mono text-[11px] flex items-start gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              <strong>Partial extraction:</strong> We could not confidently find all specific cutoff times. Some details were inferred automatically. Check them below before saving.
            </span>
          </div>
        )}
      </div>
    )
  }

  return null
}
