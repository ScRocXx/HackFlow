'use client'

import React, { useState } from 'react'
import { Sparkles, Check, ArrowRight, Loader2, Link as LinkIcon, MessageSquare, Terminal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExtractionPreset {
  id: string
  name: string
  source: string
  icon: string
  rawInput: string
  title: string
  organizer: string
  prize: string
  stack: string
  rounds: { name: string; date: string; status: string }[]
}

const PRESETS: ExtractionPreset[] = [
  {
    id: 'unstop',
    name: 'Unstop: Smart India Hackathon',
    source: 'Unstop Portal',
    icon: '🔥',
    rawInput: 'https://unstop.com/hackathons/smart-india-hackathon-2026',
    title: 'Smart India Hackathon 2026',
    organizer: 'Ministry of Education · Govt of India',
    prize: '₹1,00,000 / Problem Statement',
    stack: 'Open Source · PyTorch / Next.js allowed',
    rounds: [
      { name: 'Round 1: College Internal Screening', date: '18 Oct · 23:59 IST', status: 'Elimination PPT' },
      { name: 'Round 2: Ministry Shortlisting', date: '02 Nov · 18:00 IST', status: 'Working Prototype' },
      { name: 'Grand Finale: 36h Offline Sprint', date: '14 Nov · On-Campus', status: 'Final Demo' },
    ],
  },
  {
    id: 'devfolio',
    name: 'Devfolio: BuildForBharat',
    source: 'Devfolio',
    icon: '⚡',
    rawInput: 'https://buildforbharat.devfolio.co',
    title: 'BuildForBharat Hackathon',
    organizer: 'Devfolio x ONDC Community',
    prize: '₹5,00,000 Pool + Sponsor Grants',
    stack: 'TypeScript, Python, ONDC Protocol APIs',
    rounds: [
      { name: 'Phase 1: Team & Idea Abstract', date: '24 Oct · 23:59 IST', status: 'Review Gate' },
      { name: 'Phase 2: Code Sprint & Live Deployment', date: '05 Nov · 20:00 IST', status: 'Vercel / GitHub' },
      { name: 'Phase 3: Demo Day & Jury Pitch', date: '12 Nov · Live Stream', status: 'Grand Finale' },
    ],
  },
  {
    id: 'whatsapp',
    name: 'Messy WhatsApp Flyer Text',
    source: 'WhatsApp Forward',
    icon: '💬',
    rawInput: 'yo guys check this out!! IEEE CS techfest hackathon, last date 22 oct 11:59 pm for round 1 ppt, round 2 offline demo on 28 oct, free food + 50k cash prize, team size 3-4, register before deadline: bit.ly/ieee-hack-26',
    title: 'IEEE CS InnoWave Hackathon',
    organizer: 'IEEE Student Branch · Campus Techfest',
    prize: '₹50,000 Cash + Swag Kits',
    stack: 'No stack limits · AI/ML, Web3, AppDev',
    rounds: [
      { name: 'Round 1: Problem PPT Submission', date: '22 Oct · 23:59 IST', status: '10-Slide Deck' },
      { name: 'Round 2: Offline 24h Hackathon', date: '28 Oct · 09:00 AM', status: 'Campus Final' },
    ],
  },
]

export function InteractiveHeroExtractor() {
  const [activePresetId, setActivePresetId] = useState<string>('unstop')
  const [isExtracting, setIsExtracting] = useState<boolean>(false)
  const [extractStep, setExtractStep] = useState<number>(3)

  const activePreset = PRESETS.find((p) => p.id === activePresetId) || PRESETS[0]

  const handleSelectPreset = (presetId: string) => {
    if (presetId === activePresetId && !isExtracting) return
    setActivePresetId(presetId)
    setIsExtracting(true)
    setExtractStep(1)

    // Snappy 600ms animated sequence
    setTimeout(() => {
      setExtractStep(2)
      setTimeout(() => {
        setExtractStep(3)
        setIsExtracting(false)
      }, 250)
    }, 250)
  }

  return (
    <div className="w-full max-w-4xl mx-auto mt-10 text-left">
      {/* Interactive Trigger Bar */}
      <div className="p-3 sm:p-4 rounded-t-2xl bg-hack-forest text-hack-sand border-2 border-hack-ink border-b-0 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-hack-gold shrink-0 animate-spin-slow" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-hack-sand">
            Interactive Test Drive: Pick a link format
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {PRESETS.map((preset) => {
            const isSelected = preset.id === activePresetId
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleSelectPreset(preset.id)}
                className={cn(
                  "font-mono text-xs font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5",
                  isSelected
                    ? "bg-hack-coral text-hack-ink border-hack-ink shadow-[2px_2px_0_#10201D] -translate-y-0.5"
                    : "bg-hack-sand/20 hover:bg-hack-sand/35 text-hack-sand border-hack-sand/25"
                )}
              >
                <span>{preset.icon}</span>
                <span>{preset.name.split(':')[0]}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Extractor Terminal Canvas */}
      <div className="p-5 sm:p-6 rounded-b-2xl bg-white border-2 border-hack-ink shadow-[0_12px_32px_rgba(16,32,29,0.14)] space-y-4">
        {/* Input Bar Preview */}
        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-hack-sand/50 border border-hack-ink/20 font-mono text-xs text-hack-ink">
          {activePreset.id === 'whatsapp' ? (
            <MessageSquare className="w-4 h-4 text-hack-forest shrink-0" />
          ) : (
            <LinkIcon className="w-4 h-4 text-hack-coral shrink-0" />
          )}
          <span className="truncate flex-1 font-medium text-hack-subtext select-all">
            {activePreset.rawInput}
          </span>
          <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-hack-ink text-hack-sand shrink-0">
            {activePreset.source}
          </span>
        </div>

        {/* Live Animated Parsing Status */}
        {isExtracting ? (
          <div className="p-8 rounded-xl bg-hack-sand/30 border border-dashed border-hack-ink/30 text-center space-y-2.5 animate-pulse">
            <Loader2 className="w-6 h-6 animate-spin text-hack-coral mx-auto" />
            <div className="font-mono text-xs font-bold text-hack-ink">
              {extractStep === 1 && '⚡ Step 1/3: Ingesting raw brochure & rulebook guidelines...'}
              {extractStep === 2 && '🔒 Step 2/3: Locking dates onto local Indian Standard Time (IST)...'}
              {extractStep === 3 && '✓ Step 3/3: Generating squad checklist & timeline...'}
            </div>
            <p className="font-mono text-[11px] text-hack-subtext">
              Zero manual spreadsheet setup. Parsing elimination stages automatically.
            </p>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Extracted Header Meta */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-hack-ink/15">
              <div>
                <span className="font-mono text-[11px] font-bold text-hack-forest uppercase tracking-wider block">
                  ✓ Structured in 0.4s · {activePreset.organizer}
                </span>
                <h4 className="font-display text-xl font-bold text-hack-ink mt-0.5">
                  {activePreset.title}
                </h4>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold bg-hack-gold/25 border border-hack-gold/50 text-hack-ink px-2.5 py-1 rounded-md">
                  🏆 {activePreset.prize}
                </span>
                <span className="font-mono text-xs font-bold bg-hack-sand border border-hack-ink/20 text-hack-ink px-2.5 py-1 rounded-md">
                  ⚡ {activePreset.stack}
                </span>
              </div>
            </div>

            {/* Extracted Stage Journey Cards */}
            <div>
              <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-hack-subtext mb-2 flex items-center justify-between">
                <span>Extracted Elimination Stages:</span>
                <span className="text-hack-forest font-semibold">🕒 Auto-Synced to IST (+05:30)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {activePreset.rounds.map((round, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-hack-ink/15 bg-hack-sand/35 flex flex-col justify-between hover:border-hack-coral/60 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-hack-ink text-hack-sand">
                          Stage {idx + 1}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-hack-coral truncate">
                          {round.status}
                        </span>
                      </div>
                      <div className="font-sans font-bold text-xs text-hack-ink mt-2 leading-tight">
                        {round.name}
                      </div>
                    </div>
                    <div className="font-mono text-[11px] font-semibold text-hack-forest mt-3 pt-2 border-t border-hack-ink/10 flex items-center gap-1">
                      <Check className="w-3 h-3 text-hack-mint-dark stroke-[3]" />
                      <span>{round.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Microcopy */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-[11px] text-hack-subtext">
          <span>💡 One click turns any flyer, PDF, or portal URL into your squad&apos;s real-time dashboard.</span>
          <span className="font-bold text-hack-forest shrink-0">No more 2 AM deadline panic.</span>
        </div>
      </div>
    </div>
  )
}
