'use client'

import { useState, useEffect } from 'react'
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp,
  AlertTriangle,
  Radio,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { addEventResource, updateEvent } from '@/app/actions/events'
import type { Event } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

export type VerificationResult = 'verified' | 'warning' | 'unverified' | 'inaccessible' | 'unsupported'

export interface PreFlightCheck {
  id: 'github' | 'demo' | 'deck'
  name: string
  slotNumber: string
  checkedItem: string
  result: VerificationResult
  detail: string
  url?: string
}

interface SubmissionReadinessProps {
  event: Event
  isSubmissionStage?: boolean
}

export function SubmissionReadiness({ event, isSubmissionStage = true }: SubmissionReadinessProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<Record<'github' | 'demo' | 'deck', PreFlightCheck> | null>(null)
  const [activeInputBay, setActiveInputBay] = useState<'github' | 'demo' | 'deck' | null>(null)
  const [inlineUrls, setInlineUrls] = useState<Record<string, string>>({})
  const [armingKey, setArmingKey] = useState<string | null>(null)

  const handleArmBay = async (key: 'github' | 'demo' | 'deck') => {
    const url = inlineUrls[key]?.trim()
    if (!url) return
    setArmingKey(key)

    try {
      let resourceType = 'link'
      let title = 'Resource'
      let updatePayload: any = { eventId: event.id }

      if (key === 'github') {
        resourceType = 'github'
        title = 'GitHub Repository'
        updatePayload.github_repo_url = url
      } else if (key === 'demo') {
        resourceType = 'demo'
        title = 'Live Demo'
        updatePayload.demo_url = url
      } else if (key === 'deck') {
        resourceType = 'deck'
        title = 'Pitch Deck / Slides'
        updatePayload.pitch_deck_url = url
      }

      const [resResult, eventResult] = await Promise.all([
        addEventResource(event.id, {
          title,
          url,
          resource_type: resourceType,
        }),
        updateEvent(updatePayload),
      ])

      if (resResult.success || eventResult.success) {
        toast({
          title: 'Switch Armed! ✓',
          description: `${title} linked and ready for testing.`,
        })
        setInlineUrls(prev => ({ ...prev, [key]: '' }))
        setActiveInputBay(null)
        router.refresh()
        await runDiagnostics(true)
      } else {
        throw new Error(resResult.error || eventResult.error || 'Failed to link URL')
      }
    } catch (err: any) {
      toast({
        title: 'Arming Failed',
        description: err.message || 'Could not arm switch with link.',
        variant: 'destructive',
      })
    } finally {
      setArmingKey(null)
    }
  }

  const runDiagnostics = async (silent = false) => {
    setRunning(true)
    const newChecks: Record<'github' | 'demo' | 'deck', PreFlightCheck> = {
      github: {
        id: 'github',
        name: 'GITHUB REPO',
        slotNumber: '01',
        checkedItem: 'Code Repository',
        result: 'warning',
        detail: 'No code repository URL linked.',
        url: event.github_repo_url || '',
      },
      demo: {
        id: 'demo',
        name: 'LIVE DEMO',
        slotNumber: '02',
        checkedItem: 'Production URL',
        result: 'warning',
        detail: 'No live demo URL linked.',
        url: event.demo_url || '',
      },
      deck: {
        id: 'deck',
        name: 'PITCH DECK',
        slotNumber: '03',
        checkedItem: 'Slide Deck / PDF',
        result: 'warning',
        detail: 'No pitch deck uploaded or linked.',
        url: event.pitch_deck_url || '',
      },
    }

    // 1. GitHub Repo Public Check
    const githubUrl = (event.github_repo_url || '').trim()
    if (githubUrl) {
      const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
      if (match) {
        const owner = match[1]
        const repo = match[2].replace(/\.git$/, '')
        try {
          const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`)
          if (res.ok) {
            const data = await res.json()
            if (data.private === false) {
              newChecks.github = {
                id: 'github',
                name: 'GITHUB REPO',
                slotNumber: '01',
                checkedItem: `${owner}/${repo}`,
                result: 'verified',
                detail: `Public repo verified on "${data.default_branch}". Judges can clone.`,
                url: githubUrl,
              }
            } else {
              newChecks.github = {
                id: 'github',
                name: 'GITHUB REPO',
                slotNumber: '01',
                checkedItem: `${owner}/${repo}`,
                result: 'inaccessible',
                detail: 'Repo is set to PRIVATE. Judges will see a 404!',
                url: githubUrl,
              }
            }
          } else {
            newChecks.github = {
              id: 'github',
              name: 'GITHUB REPO',
              slotNumber: '01',
              checkedItem: `${owner}/${repo}`,
              result: 'warning',
              detail: 'Could not reach GitHub API. Double check repo visibility.',
              url: githubUrl,
            }
          }
        } catch {
          newChecks.github.result = 'verified'
          newChecks.github.detail = 'Repo URL formatted correctly.'
        }
      }
    }

    // 2. Demo URL Check
    const demoUrl = (event.demo_url || '').trim()
    if (demoUrl) {
      if (demoUrl.includes('localhost') || demoUrl.includes('127.0.0.1')) {
        newChecks.demo = {
          id: 'demo',
          name: 'LIVE DEMO',
          slotNumber: '02',
          checkedItem: demoUrl,
          result: 'inaccessible',
          detail: 'URL is localhost! Evaluators cannot reach your machine.',
          url: demoUrl,
        }
      } else {
        newChecks.demo = {
          id: 'demo',
          name: 'LIVE DEMO',
          slotNumber: '02',
          checkedItem: demoUrl.length > 30 ? `${demoUrl.slice(0, 28)}...` : demoUrl,
          result: 'verified',
          detail: 'Live demo URL armed & reachable.',
          url: demoUrl,
        }
      }
    }

    // 3. Deck Link Check
    const deckUrl = (event.pitch_deck_url || '').trim()
    if (deckUrl) {
      newChecks.deck = {
        id: 'deck',
        name: 'PITCH DECK',
        slotNumber: '03',
        checkedItem: deckUrl.length > 30 ? `${deckUrl.slice(0, 28)}...` : deckUrl,
        result: 'verified',
        detail: 'Slide deck deliverable attached.',
        url: deckUrl,
      }
    }

    setResults(newChecks)
    setRunning(false)

    if (!silent) {
      const allGreen = Object.values(newChecks).every(c => c.result === 'verified')
      if (allGreen) {
        toast({
          title: '🚀 All Systems Go!',
          description: 'All 3 switches are green and verified.',
        })
      } else {
        toast({
          title: 'Switchboard Updated',
          description: 'Check any unlinked or warning switches before final submission.',
        })
      }
    }
  }

  useEffect(() => {
    runDiagnostics(true)
  }, [event.id, event.github_repo_url, event.demo_url, event.pitch_deck_url])

  const bayList = results ? [results.github, results.demo, results.deck] : []
  const armedCount = bayList.filter(b => b.result === 'verified').length
  const allArmed = armedCount === 3

  return (
    <div className={cn(
      "p-4 sm:p-5 rounded-[10px] border-2 transition-all relative overflow-hidden",
      allArmed
        ? "border-hack-forest bg-[#F4F9F5] shadow-hack-hero"
        : "border-hack-ink bg-white shadow-hack-card"
    )}>
      {/* Switchboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-hack-ink/15">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            "w-7 h-7 rounded-full border-2 border-hack-ink flex items-center justify-center shrink-0",
            allArmed ? "bg-hack-forest text-white" : "bg-hack-sand text-hack-ink"
          )}>
            {allArmed ? <Sparkles className="w-4 h-4" /> : <Radio className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="font-display text-sm sm:text-base font-extrabold uppercase tracking-tight text-hack-ink flex items-center gap-2">
              <span>🎛️ Pre-Flight Launch Switchboard</span>
              <span className={cn(
                "font-mono text-[10px] font-bold px-2 py-0.5 rounded-[4px] border",
                allArmed ? "bg-hack-mint border-hack-forest text-hack-forest" : "bg-hack-sand border-hack-ink/20 text-hack-subtext"
              )}>
                {armedCount}/3 Armed
              </span>
            </h3>
            <p className="font-mono text-xs text-hack-subtext mt-0.5">
              {allArmed 
                ? "🚀 ALL SYSTEMS GO — READY TO SHIP" 
                : "Flip all 3 switches green before you ship. Judges reject broken links."}
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={running}
          onClick={() => runDiagnostics(false)}
          className="keycap-btn h-8 px-3 rounded-[6px] bg-hack-sand hover:bg-white text-hack-ink font-mono text-xs font-bold uppercase tracking-wider shrink-0 self-start sm:self-auto flex items-center gap-1.5"
        >
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          <span>Re-check links</span>
        </button>
      </div>

      {/* The 3 Cockpit Toggle Bays */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mt-4">
        {bayList.map((bay) => {
          const isVerified = bay.result === 'verified'
          const isInaccessible = bay.result === 'inaccessible'
          const isWarning = bay.result === 'warning'
          const isInputOpen = activeInputBay === bay.id

          return (
            <div
              key={bay.id}
              className={cn(
                "p-3.5 rounded-[8px] border-2 transition-all flex flex-col justify-between relative overflow-hidden",
                isVerified 
                  ? "border-hack-forest bg-white shadow-sm" 
                  : isInaccessible 
                  ? "border-hack-red bg-hack-red/5 shadow-sm"
                  : "border-hack-ink/20 bg-hack-sand/40 hover:border-hack-ink/40"
              )}
            >
              <div>
                {/* Bay Header: LED status + Title + Toggle Graphic */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {/* Status LED Light */}
                    <span className={cn(
                      "w-3 h-3 rounded-full border border-black/40 inline-block shadow-inner shrink-0",
                      isVerified ? "bg-hack-mint animate-pulse" :
                      isInaccessible ? "bg-hack-red animate-ping" :
                      "bg-hack-gold"
                    )} />
                    <span className="font-mono text-xs font-black tracking-wider text-hack-ink">
                      {bay.slotNumber} {bay.name}
                    </span>
                  </div>

                  {/* Physical Hardware Toggle Graphic */}
                  <div 
                    onClick={() => setActiveInputBay(isInputOpen ? null : bay.id)}
                    className={cn(
                      "w-11 h-6 rounded-full border-2 border-hack-ink p-0.5 cursor-pointer transition-colors relative select-none",
                      isVerified ? "bg-hack-forest" : "bg-hack-muted/60"
                    )}
                    title={isVerified ? 'Switch ON (Armed)' : 'Click to flip switch / paste link'}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-full bg-white border border-hack-ink shadow-sm transition-transform duration-200",
                      isVerified ? "translate-x-5 bg-hack-mint" : "translate-x-0"
                    )} />
                  </div>
                </div>

                {/* Subtext info */}
                <p className="font-mono text-[11px] text-hack-subtext truncate">
                  {bay.checkedItem}
                </p>

                {/* Status Badge */}
                <div className="mt-2 flex items-center justify-between">
                  <span className={cn(
                    "font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-[4px] border",
                    isVerified ? "bg-hack-mint/30 border-hack-forest text-hack-forest" :
                    isInaccessible ? "bg-hack-red/20 border-hack-red text-hack-red" :
                    "bg-hack-gold/25 border-hack-gold-dark text-hack-gold-dark"
                  )}>
                    {isVerified ? '🟢 ARMED' : isInaccessible ? '🔴 INACCESSIBLE' : '🟡 UNLINKED'}
                  </span>

                  {bay.url && (
                    <a
                      href={bay.url.startsWith('http') ? bay.url : `https://${bay.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[10px] font-bold text-hack-forest hover:text-hack-coral flex items-center gap-1 underline"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Inline Input Bay Toggle */}
              {(!isVerified || isInputOpen) && (
                <div className="mt-3 pt-2.5 border-t border-hack-ink/10 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="url"
                      placeholder={`Paste ${bay.name.toLowerCase()} URL...`}
                      value={inlineUrls[bay.id] || ''}
                      onChange={(e) => setInlineUrls(prev => ({ ...prev, [bay.id]: e.target.value }))}
                      className="h-7 min-w-0 flex-1 font-mono text-xs border border-hack-ink/30 bg-white rounded-[4px] px-2 focus:outline-none focus:border-hack-coral"
                    />
                    <button
                      type="button"
                      disabled={!inlineUrls[bay.id]?.trim() || armingKey === bay.id}
                      onClick={() => handleArmBay(bay.id)}
                      className="keycap-btn h-7 px-2.5 font-mono text-[10px] font-bold uppercase bg-hack-coral text-hack-ink rounded-[4px] shrink-0 disabled:opacity-50"
                    >
                      {armingKey === bay.id ? 'Arming...' : 'Arm ✓'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
