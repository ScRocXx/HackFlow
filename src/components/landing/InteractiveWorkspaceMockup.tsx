'use client'

import React, { useState, useEffect } from 'react'
import { 
  CheckCircle2, Clock, Sparkles, ExternalLink, 
  Users, Check, ArrowRight, ShieldCheck, Trophy, AlertTriangle 
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Deliverable {
  id: string
  title: string
  owner: string
  isDone: boolean
  tag?: string
}

interface StageData {
  roundNumber: number
  title: string
  stageType: string
  statusLabel: string
  statusColor: 'mint' | 'coral' | 'muted'
  deadlineSnippet: string
  deliverables: Deliverable[]
}

const STAGES: StageData[] = [
  {
    roundNumber: 1,
    title: 'Online Assessment Quiz',
    stageType: 'Screening Round',
    statusLabel: 'Completed · Cleared',
    statusColor: 'mint',
    deadlineSnippet: 'Cleared on 28 Sep',
    deliverables: [
      { id: 'r1-1', title: 'Aptitude & DSA MCQ Section (Score: 92/100)', owner: 'You', isDone: true },
      { id: 'r1-2', title: 'System Design Concept Submission', owner: 'Vedant', isDone: true },
      { id: 'r1-3', title: 'Team Registration Verification on Unstop', owner: 'Sawant', isDone: true },
    ],
  },
  {
    roundNumber: 2,
    title: 'Solution Architecture & Pitch Deck',
    stageType: 'Active Elimination Round',
    statusLabel: 'Active Now · Closes Tonight',
    statusColor: 'coral',
    deadlineSnippet: '14h 21m left',
    deliverables: [
      { id: 'r2-1', title: 'System Architecture Diagram & Technical Scope', owner: 'Vedant', isDone: true, tag: 'Figma' },
      { id: 'r2-2', title: '10-Slide Pitch Deck exported to PDF (<20MB)', owner: 'Nishant', isDone: true, tag: 'Canva' },
      { id: 'r2-3', title: 'Record & upload 2-minute unlisted YouTube demo', owner: 'You', isDone: false, tag: 'Loom' },
    ],
  },
  {
    roundNumber: 3,
    title: 'Prototype Demo & Grand Finale',
    stageType: 'Offline 36h Sprint',
    statusLabel: 'Upcoming · Unlocks Post R2',
    statusColor: 'muted',
    deadlineSnippet: 'Opens after Round 2 results',
    deliverables: [
      { id: 'r3-1', title: 'Public GitHub repository with MIT License & README', owner: 'You', isDone: false },
      { id: 'r3-2', title: 'Production deployment URL with live database demo', owner: 'Vedant', isDone: false },
      { id: 'r3-3', title: 'Final stage presentation deck & offline jury Q&A', owner: 'Nishant', isDone: false },
    ],
  },
]

export function InteractiveWorkspaceMockup() {
  const [activeRound, setActiveRound] = useState<number>(2)
  const [stages, setStages] = useState<StageData[]>(STAGES)
  
  // Real live ticking seconds countdown
  const [secondsRemaining, setSecondsRemaining] = useState<number>(14 * 3600 + 21 * 60 + 54)

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const formatCountdown = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600)
    const m = Math.floor((totalSec % 3600) / 60)
    const s = totalSec % 60
    return `${h}h ${m.toString().padStart(2, '0')}m : ${s.toString().padStart(2, '0')}s`
  }

  const currentStage = stages.find((s) => s.roundNumber === activeRound) || stages[1]

  const handleToggleTask = (taskId: string) => {
    setStages((prevStages) =>
      prevStages.map((stg) => {
        if (stg.roundNumber !== activeRound) return stg
        return {
          ...stg,
          deliverables: stg.deliverables.map((d) =>
            d.id === taskId ? { ...d, isDone: !d.isDone } : d
          ),
        }
      })
    )
  }

  const completedCount = currentStage.deliverables.filter((d) => d.isDone).length
  const totalCount = currentStage.deliverables.length
  const percentage = Math.round((completedCount / totalCount) * 100)
  const isAllReady = completedCount === totalCount

  return (
    <div className="w-full relative">
      {/* Interactive Helper Hint Badge */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-hack-gold text-hack-ink border-2 border-hack-ink shadow-[2px_2px_0_#10201D] animate-bounce-short">
          <span>👆</span>
          <span>Interactive Preview: Click rounds & check off tasks</span>
        </span>
      </div>

      {/* Main Hardware Window Container */}
      <div className="window-frame overflow-hidden">
        {/* Window Title Bar */}
        <div className="bg-hack-forest text-hack-sand px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-2 border-hack-ink">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5 shrink-0">
              <span className="w-3 h-3 rounded-full bg-hack-coral border border-hack-ink/30" />
              <span className="w-3 h-3 rounded-full bg-hack-gold border border-hack-ink/30" />
              <span className="w-3 h-3 rounded-full bg-hack-mint border border-hack-ink/30" />
            </div>
            <span className="font-mono text-xs text-hack-sand font-medium truncate">
              hackflow.app/events/wcc-launchpad-30
            </span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="px-2.5 py-0.5 rounded-full bg-hack-sand/15 text-hack-sand text-[11px] font-mono font-bold tracking-wider">
              UNSTOP · ₹1,50,000 Cash Pool · IST Locked
            </span>
          </div>
        </div>

        {/* Window Body Canvas */}
        <div className="p-5 sm:p-8 space-y-6 bg-[#FBF9F3]">
          {/* Event Header Row */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-hack-ink/15">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-hack-ink tracking-tight">
                  WCC Launchpad 3.0
                </h3>
                <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-hack-coral/15 text-hack-coral-dark border border-hack-coral/30">
                  Live Sprint
                </span>
              </div>
              <p className="font-mono text-xs text-hack-subtext mt-1">
                WeCodeCoders · Active Squad: <strong className="text-hack-ink">Northern Blades</strong> (4 hackers)
              </p>
            </div>

            {/* Real Ticking Ticker Box */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-hack-ink text-hack-sand border-2 border-hack-ink shadow-[2px_2px_0_#10201D] self-start md:self-auto">
              <Clock className="w-4 h-4 text-hack-coral animate-spin-slow" />
              <div className="font-mono text-xs font-bold tabular-nums">
                <span className="text-hack-coral font-bold uppercase">Round 2 Closes in: </span>
                <span>{formatCountdown(secondsRemaining)}</span>
              </div>
            </div>
          </div>

          {/* Stage Journey Switcher Tabs */}
          <div>
            <div className="flex items-center justify-between font-mono text-xs font-bold text-hack-subtext uppercase tracking-wider mb-2.5">
              <span>Stage Journey (Click to inspect):</span>
              <span className="text-hack-forest font-semibold text-[11px]">Round 2 of 3</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {stages.map((stage) => {
                const isActive = stage.roundNumber === activeRound
                const isRound1 = stage.roundNumber === 1
                const isRound2 = stage.roundNumber === 2
                const isRound3 = stage.roundNumber === 3

                return (
                  <button
                    key={stage.roundNumber}
                    type="button"
                    onClick={() => setActiveRound(stage.roundNumber)}
                    className={cn(
                      "p-3.5 rounded-xl border-2 text-left transition-all relative flex flex-col justify-between select-none",
                      isActive
                        ? "border-hack-ink bg-white shadow-[4px_4px_0_#10201D] -translate-y-0.5"
                        : "border-hack-ink/20 bg-hack-sand/40 hover:bg-hack-sand/70 hover:border-hack-ink/40"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className={cn(
                          "font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-full flex items-center gap-1",
                          isRound1 && "bg-hack-mint/20 text-hack-forest border border-hack-mint-dark/30",
                          isRound2 && "bg-hack-coral/15 text-hack-coral-dark border border-hack-coral/30",
                          isRound3 && "bg-hack-sand text-hack-subtext border border-hack-ink/15"
                        )}>
                          {isRound1 && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          {isRound2 && <span className="w-2 h-2 rounded-full bg-hack-coral animate-ping" />}
                          <span>Round {stage.roundNumber}</span>
                        </span>
                        <span className="font-mono text-[10px] text-hack-subtext font-semibold">
                          {stage.deadlineSnippet}
                        </span>
                      </div>
                      <div className="font-sans font-bold text-sm text-hack-ink mt-2 leading-snug">
                        {stage.title}
                      </div>
                    </div>

                    <div className="font-mono text-[10px] text-hack-subtext mt-3 pt-2 border-t border-hack-ink/10 flex items-center justify-between">
                      <span>{stage.stageType}</span>
                      <span className="font-bold text-hack-ink">
                        {stage.deliverables.filter((d) => d.isDone).length}/{stage.deliverables.length} tasks
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Active Round Checklist & Submissions Panel */}
          <div className="p-5 sm:p-6 rounded-2xl border-2 border-hack-ink bg-white shadow-[3px_3px_0_#10201D] space-y-4">
            {/* Header with progress */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-hack-ink/10">
              <div>
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-hack-subtext block">
                  {currentStage.title} · Deliverables
                </span>
                <span className="font-sans text-xs text-hack-subtext">
                  Click any checkbox below to simulate real-time team progress:
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-hack-ink">
                  {completedCount} OF {totalCount} READY
                </span>
                <span className={cn(
                  "font-mono text-xs font-bold px-2 py-0.5 rounded-full border",
                  isAllReady 
                    ? "bg-hack-mint/25 text-hack-forest border-hack-mint-dark/40" 
                    : "bg-hack-gold/20 text-hack-gold-dark border-hack-gold/40"
                )}>
                  {percentage}% Done
                </span>
              </div>
            </div>

            {/* Celebratory Banner when 100% */}
            {isAllReady && (
              <div className="p-3 rounded-xl bg-hack-mint/20 border-2 border-hack-forest text-hack-forest flex items-center justify-between gap-3 animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-hack-forest shrink-0" />
                  <span className="font-mono text-xs font-bold">
                    🚀 All {currentStage.title} tasks completed! Squad is locked in and ready to submit.
                  </span>
                </div>
                <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-hack-forest text-hack-sand shrink-0">
                  Verified
                </span>
              </div>
            )}

            {/* Clickable Tasks List */}
            <div className="space-y-2 font-mono text-xs">
              {currentStage.deliverables.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleToggleTask(item.id)}
                  className={cn(
                    "flex items-center justify-between gap-3 p-3.5 rounded-xl border-2 cursor-pointer select-none transition-all",
                    item.isDone
                      ? "bg-hack-sand/30 border-hack-ink/20 opacity-80 hover:opacity-100"
                      : "bg-[#FBF9F3] border-hack-coral/50 hover:border-hack-coral shadow-sm"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      aria-label={`Toggle ${item.title}`}
                      className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-transform active:scale-90",
                        item.isDone
                          ? "bg-hack-forest border-hack-forest text-hack-sand"
                          : "border-hack-coral bg-white hover:bg-hack-coral/10"
                      )}
                    >
                      {item.isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>
                    <span className={cn(
                      "font-sans text-xs sm:text-sm font-semibold truncate",
                      item.isDone ? "line-through text-hack-subtext font-normal" : "text-hack-ink font-bold"
                    )}>
                      {item.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.tag && (
                      <span className="hidden sm:inline-block font-mono text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-hack-sand text-hack-subtext border border-hack-ink/15">
                        {item.tag}
                      </span>
                    )}
                    <span className={cn(
                      "font-mono text-[11px] font-bold px-2 py-0.5 rounded-md border",
                      item.isDone
                        ? "bg-hack-sand text-hack-subtext border-hack-ink/15"
                        : "bg-hack-coral/15 text-hack-coral-dark border-hack-coral/30"
                    )}>
                      {item.owner}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer note */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-[11px] text-hack-subtext">
              <span>⚡ Live Supabase CDC WebSocket: Teammate checkmarks sync in 40ms without refreshing.</span>
              <span className="font-bold text-hack-ink underline cursor-pointer">
                Lock in your team →
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
