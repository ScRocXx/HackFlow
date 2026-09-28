'use client'

import { useState, useEffect } from 'react'
import { Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ExtractionConfidence {
  roundsCount: number
  deadlinesCount: number
  deliverablesCount: number
  unconfirmedCount: number
}

interface ExtractionProgressProps {
  isExtracting: boolean
  confidence?: ExtractionConfidence | null
}

const STEPS = [
  { id: 'read', label: 'Reading competition page...', delay: 0 },
  { id: 'event', label: 'Event & organizer detected', delay: 700 },
  { id: 'rounds', label: 'Parsing round milestones...', delay: 1400 },
  { id: 'deadlines', label: 'Extracting cutoff timestamps...', delay: 2100 },
  { id: 'deliverables', label: 'Structuring required deliverables...', delay: 2800 },
]

export function ExtractionProgress({ isExtracting, confidence }: ExtractionProgressProps) {
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
      <div className="border-2 border-[#10201d] bg-[#f2f2eb] p-4 sm:p-5 shadow-[4px_4px_0_#10201d] space-y-3">
        <div className="flex items-center gap-2 text-[#10201d]">
          <Loader2 className="w-4 h-4 animate-spin text-[#e53927]" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider">
            AI Extraction in progress
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
                  isDone && "text-[#2e4742] font-semibold",
                  isCurrent && "text-[#10201d] font-bold scale-[1.01]",
                  isPending && "text-[#34433f]/40"
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-[#2d6a4f] shrink-0" />
                ) : isCurrent ? (
                  <Loader2 className="w-4 h-4 text-[#e53927] animate-spin shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-[#10201d]/30 shrink-0 inline-block" />
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
    return (
      <div className="border-2 border-[#10201d] bg-[#f2f9f6] p-3.5 sm:p-4 shadow-[3px_3px_0_#10201d] space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#2d6a4f]" />
            <span className="font-mono text-xs font-bold uppercase text-[#142622]">
              Extracted & Structured
            </span>
          </div>
          <span className="font-mono text-[10px] font-bold text-[#2d6a4f]">
            Verified
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs text-[#142622] flex-wrap">
          <span className="inline-flex items-center gap-1 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#2d6a4f]" /> {confidence.roundsCount} rounds
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-1 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#2d6a4f]" /> {confidence.deadlinesCount} deadlines
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-1 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#2d6a4f]" /> {confidence.deliverablesCount} deliverables
          </span>
        </div>

        {confidence.unconfirmedCount > 0 && (
          <div className="mt-1 p-2 border border-[#f5b726] bg-[#fffdf0] text-[#8a5d13] font-mono text-[11px] flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{confidence.unconfirmedCount} stage(s) marked TBA — review and confirm dates below.</span>
          </div>
        )}
      </div>
    )
  }

  return null
}
