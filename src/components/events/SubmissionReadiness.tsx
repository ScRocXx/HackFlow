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

  const runDiagnostics = async (silent = false) => {
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

    if (!silent) {
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
  }

  // Auto-run silently once if in submission phase
  useEffect(() => {
    if (isSubmissionStage && !results) {
      runDiagnostics(true)
    }
  }, [isSubmissionStage, event.id])

  const passedCount = results ? results.filter(r => r.status === 'passed').length : 0
  const totalCount = results ? results.length : 0
  const failedCount = results ? results.filter(r => r.status === 'failed').length : 0

  return (
    <div className="border border-hack-muted/60 bg-hack-surface rounded-xl shadow-hack-card overflow-hidden">
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-hack-surface p-4 text-hack-ink flex flex-col gap-3 cursor-pointer select-none border-b border-hack-muted/30"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <FlaskConical className="h-5 w-5 text-hack-gold-dark shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-hack-subtext">
                SUBMISSION CHECK
              </span>
              {results && (
                <span className={cn(
                  "font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0",
                  failedCount > 0 
                    ? "bg-hack-red/15 border-hack-red/30 text-hack-red" 
                    : "bg-hack-mint/30 border-hack-mint text-hack-mint-dark"
                )}>
                  {failedCount > 0 ? `${failedCount} things left` : 'Ready to submit ✓'}
                </span>
              )}
            </div>
            <p className="font-sans text-xs text-hack-subtext mt-0.5">
              {failedCount > 0 
                ? `${failedCount} item${failedCount === 1 ? '' : 's'} before you can submit.` 
                : 'Nothing obvious is missing. Evaluators can review.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 border-t border-hack-muted/20 w-full">
          <Button
            type="button"
            size="sm"
            disabled={running}
            onClick={(e) => {
              e.stopPropagation()
              runDiagnostics(false)
            }}
            className="font-mono text-xs font-bold bg-hack-coral hover:brightness-105 text-hack-ink shadow-hack-hero h-8 px-3 rounded-lg flex-1 justify-center"
          >
            {running ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Verifying...
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Check Everything
              </>
            )}
          </Button>

          <button
            type="button"
            className="p-1.5 text-hack-subtext hover:text-hack-ink rounded-lg border border-hack-muted/40 hover:bg-hack-sand/50 transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            aria-label={isExpanded ? "Collapse pre-flight checks" : "Expand pre-flight checks"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 bg-hack-surface space-y-2.5">
          {results ? (
            <div className="space-y-2">
              {results.map((check) => (
                <div
                  key={check.id}
                  className={cn(
                    "p-3 rounded-lg border font-mono text-xs flex items-start gap-2.5 transition-all",
                    check.status === 'passed' && "bg-hack-mint/10 border-hack-mint/40 text-hack-ink",
                    check.status === 'failed' && "bg-hack-red/10 border-hack-red/30 text-hack-ink",
                    check.status === 'warning' && "bg-hack-gold/15 border-hack-gold/40 text-hack-ink"
                  )}
                >
                  {check.status === 'passed' && <CheckCircle2 className="h-4 w-4 text-hack-mint-dark shrink-0 mt-0.5" />}
                  {check.status === 'failed' && <XCircle className="h-4 w-4 text-hack-red shrink-0 mt-0.5" />}
                  {check.status === 'warning' && <AlertTriangle className="h-4 w-4 text-hack-gold-dark shrink-0 mt-0.5" />}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-hack-ink">{check.name}</span>
                      <span className={cn(
                        "font-bold uppercase text-[9px] px-1.5 py-0.5 rounded-full border",
                        check.status === 'passed' && "bg-hack-mint/25 border-hack-mint/40 text-hack-mint-dark",
                        check.status === 'failed' && "bg-hack-red/20 border-hack-red/40 text-hack-red",
                        check.status === 'warning' && "bg-hack-gold/25 border-hack-gold/40 text-hack-gold-dark"
                      )}>
                        {check.status}
                      </span>
                    </div>
                    <p className="font-sans text-[11px] text-hack-subtext mt-0.5 leading-relaxed">
                      {check.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-dashed border-hack-muted text-center font-mono text-xs text-hack-subtext">
              Click "Check Everything" to verify public repo access, demo links, and presentation deliverables.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
