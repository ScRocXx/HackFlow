'use client'

import { useState, useEffect } from 'react'
import { 
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, 
  Loader2, FlaskConical, ExternalLink, ChevronDown, ChevronUp 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import type { Event } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

export interface SmokeTestItem {
  id: string
  name: string
  status: 'passed' | 'failed' | 'warning' | 'pending'
  detail: string
}

interface SubmissionReadinessProps {
  event: Event
  isSubmissionStage?: boolean
}

export function SubmissionReadiness({ event, isSubmissionStage = true }: SubmissionReadinessProps) {
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<SmokeTestItem[] | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)
  const { toast } = useToast()

  const runDiagnostics = async () => {
    setRunning(true)
    const checks: SmokeTestItem[] = []

    // 1. GitHub Repo Public Access
    const githubUrl = (event.github_repo_url || '').trim()
    if (!githubUrl) {
      checks.push({
        id: 'github',
        name: 'GitHub Repository Visibility',
        status: 'failed',
        detail: 'No code repository URL provided. Required for judging.',
      })
    } else {
      const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
      if (!match) {
        checks.push({
          id: 'github',
          name: 'GitHub Repository Visibility',
          status: 'failed',
          detail: 'Invalid GitHub URL format.',
        })
      } else {
        try {
          const owner = match[1]
          const repo = match[2].replace(/\.git$/, '')
          const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`)
          if (res.ok) {
            const data = await res.json()
            if (data.private === false) {
              checks.push({
                id: 'github',
                name: 'GitHub Repository Visibility',
                status: 'passed',
                detail: `Public repo verified (${data.default_branch} branch). Judges can clone.`,
              })
            } else {
              checks.push({
                id: 'github',
                name: 'GitHub Repository Visibility',
                status: 'failed',
                detail: 'Repository is PRIVATE. Evaluators will receive a 404 error.',
              })
            }
          } else if (res.status === 403) {
            checks.push({
              id: 'github',
              name: 'GitHub Repository Visibility',
              status: 'warning',
              detail: 'API rate limited. Please verify repository is public in an incognito window.',
            })
          } else {
            checks.push({
              id: 'github',
              name: 'GitHub Repository Visibility',
              status: 'failed',
              detail: `Repository returned HTTP ${res.status}. Ensure public access is enabled.`,
            })
          }
        } catch {
          checks.push({
            id: 'github',
            name: 'GitHub Repository Visibility',
            status: 'warning',
            detail: 'Could not connect to GitHub API. Verify URL manually.',
          })
        }
      }
    }

    // 2. Demo Deployment Link
    const demoUrl = (event.demo_url || '').trim()
    if (!demoUrl) {
      checks.push({
        id: 'demo',
        name: 'Live Demo Deployment',
        status: 'warning',
        detail: 'No live demo URL provided. Strongly recommended for evaluation.',
      })
    } else if (!demoUrl.startsWith('https://')) {
      checks.push({
        id: 'demo',
        name: 'Live Demo Deployment',
        status: 'failed',
        detail: 'Demo URL must use secure HTTPS protocol.',
      })
    } else {
      try {
        const parsed = new URL(demoUrl)
        checks.push({
          id: 'demo',
          name: 'Live Demo Deployment',
          status: 'passed',
          detail: `Valid HTTPS deployment link provided (${parsed.hostname}).`,
        })
      } catch {
        checks.push({
          id: 'demo',
          name: 'Live Demo Deployment',
          status: 'failed',
          detail: 'Invalid Demo URL structure.',
        })
      }
    }

    // 3. Pitch Deck Deliverable
    const deckUrl = (event.pitch_deck_url || '').trim()
    const platform = (event.source_platform || '').toLowerCase()
    const maxPdfMb = platform.includes('devfolio') || platform.includes('sih') ? 10 : 20

    if (!deckUrl) {
      checks.push({
        id: 'deck',
        name: 'Pitch Deck PDF / Presentation',
        status: 'warning',
        detail: 'No presentation deck uploaded or linked.',
      })
    } else if (deckUrl.includes('drive.google.com')) {
      checks.push({
        id: 'deck',
        name: 'Pitch Deck & Cloud Permissions',
        status: 'warning',
        detail: 'Google Drive link provided. Ensure "Anyone with the link can view" is active in Drive permissions!',
      })
    } else {
      checks.push({
        id: 'deck',
        name: `Pitch Deck (${maxPdfMb}MB Portal Limit Guard)`,
        status: 'passed',
        detail: `Deck attached: ${deckUrl.slice(0, 45)}...`,
      })
    }

    // 4. Video Pitch / Demo
    const notes = event.submission_notes || ''
    const hasVideo = demoUrl.includes('youtube.com') || demoUrl.includes('youtu.be') || notes.toLowerCase().includes('video')
    if (hasVideo) {
      checks.push({
        id: 'video',
        name: 'Pitch / Demo Video Link',
        status: 'passed',
        detail: 'Video presentation recorded. Ensure YouTube visibility is set to "Unlisted" or "Public".',
      })
    }

    setResults(checks)
    setRunning(false)

    const failedCount = checks.filter(c => c.status === 'failed').length
    if (failedCount > 0) {
      toast({
        title: 'Submission Issues Found',
        description: `${failedCount} pre-flight check(s) need your attention before submitting.`,
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Pre-Flight Checks Passed',
        description: 'Key deliverables and judge accessibility checks look solid!',
      })
    }
  }

  // Auto-run once if in submission phase
  useEffect(() => {
    if (isSubmissionStage && !results) {
      runDiagnostics()
    }
  }, [isSubmissionStage, event.id])

  const passedCount = results ? results.filter(r => r.status === 'passed').length : 0
  const totalCount = results ? results.length : 0
  const failedCount = results ? results.filter(r => r.status === 'failed').length : 0

  return (
    <div className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[5px_5px_0_#10201d] overflow-hidden">
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-[#10201d] p-3.5 sm:p-4 text-[#f7f7f2] flex flex-col sm:flex-row justify-between sm:items-center gap-3 cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <FlaskConical className="h-5 w-5 text-[#f5b726] shrink-0" />
          <div>
            <h3 className="font-display text-base sm:text-lg font-bold text-[#f7f7f2] flex items-center gap-2">
              Ready to submit?
              {results && (
                <span className={cn(
                  "font-mono text-[10px] font-black uppercase px-2 py-0.5 border border-white/20",
                  failedCount > 0 ? "bg-[#e53927] text-white" : "bg-[#93C9B8] text-[#10201d]"
                )}>
                  {failedCount > 0 ? `${failedCount} issues` : `${passedCount}/${totalCount} verified`}
                </span>
              )}
            </h3>
            <p className="font-mono text-[11px] text-[#8bb2de]">
              Pre-flight check: repository visibility, presentation deck, and demo links.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <Button
            type="button"
            size="sm"
            disabled={running}
            onClick={(e) => {
              e.stopPropagation()
              runDiagnostics()
            }}
            className="font-mono text-xs font-bold bg-[#e53927] hover:bg-[#c82717] text-white border-2 border-white shadow-[2px_2px_0_#000000] h-8 px-3"
          >
            {running ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Verifying...
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Run Pre-Flight Check
              </>
            )}
          </Button>

          <button
            type="button"
            className="p-1 text-[#f7f7f2] hover:text-[#f5b726]"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 sm:p-5 bg-white border-t-2 border-[#10201d] space-y-3">
          {results ? (
            <div className="space-y-2">
              {results.map((check) => (
                <div
                  key={check.id}
                  className={cn(
                    "p-3 border-2 border-[#10201d] font-mono text-xs flex items-start gap-2.5",
                    check.status === 'passed' && "bg-[#f2f9f6] text-[#142622]",
                    check.status === 'failed' && "bg-[#fff5f5] text-[#280c0a]",
                    check.status === 'warning' && "bg-[#fffdf0] text-[#251f0b]"
                  )}
                >
                  {check.status === 'passed' && <CheckCircle2 className="h-4 w-4 text-[#2d6a4f] shrink-0 mt-0.5" />}
                  {check.status === 'failed' && <XCircle className="h-4 w-4 text-[#e53927] shrink-0 mt-0.5" />}
                  {check.status === 'warning' && <AlertTriangle className="h-4 w-4 text-[#f5b726] shrink-0 mt-0.5" />}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[#10201d]">{check.name}</span>
                      <span className={cn(
                        "font-black uppercase text-[9px] px-1.5 py-0.2 border border-[#10201d]",
                        check.status === 'passed' && "bg-[#93C9B8] text-[#10201d]",
                        check.status === 'failed' && "bg-[#e53927] text-white",
                        check.status === 'warning' && "bg-[#f5b726] text-[#10201d]"
                      )}>
                        {check.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#34433f] mt-0.5 font-medium leading-relaxed">
                      {check.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 border border-dashed border-[#10201d]/40 text-center font-mono text-xs text-[#34433f]">
              Click "Run Pre-Flight Check" to verify repository permissions, pitch deck limits, and submission deliverables.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
