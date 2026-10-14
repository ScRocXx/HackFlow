'use client'

import { useState, useEffect } from 'react'
import { 
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, 
  Loader2, FlaskConical, ExternalLink, ChevronDown, ChevronUp,
  HelpCircle, Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import type { Event } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

export type VerificationResult = 'verified' | 'warning' | 'unverified' | 'inaccessible' | 'unsupported'
export type VerificationConfidence = 'high' | 'medium' | 'low'

export interface PreFlightCheck {
  id: string
  name: string
  checkedItem: string
  result: VerificationResult
  confidence: VerificationConfidence
  detail: string
  actionRecommendation?: string
  incognitoUrl?: string
}

export type SmokeTestItem = PreFlightCheck

interface SubmissionReadinessProps {
  event: Event
  isSubmissionStage?: boolean
}

export function SubmissionReadiness({ event, isSubmissionStage = true }: SubmissionReadinessProps) {
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<PreFlightCheck[] | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)
  const { toast } = useToast()

  const runDiagnostics = async (silent = false) => {
    setRunning(true)
    const checks: PreFlightCheck[] = []

    // 1. GitHub Repo Public Reachability Check
    const githubUrl = (event.github_repo_url || '').trim()
    if (!githubUrl) {
      checks.push({
        id: 'github',
        name: 'GitHub Repository Visibility',
        checkedItem: 'Code Repository',
        result: 'warning',
        confidence: 'high',
        detail: 'No code repository URL provided.',
        actionRecommendation: 'Add your project repository URL so evaluators can inspect codebase commits.',
      })
    } else {
      const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
      if (!match) {
        checks.push({
          id: 'github',
          name: 'GitHub Repository Visibility',
          checkedItem: githubUrl,
          result: 'warning',
          confidence: 'high',
          detail: 'URL is not a recognized GitHub repository structure.',
          actionRecommendation: 'Verify the format matches https://github.com/owner/repository.',
        })
      } else {
        const owner = match[1]
        const repo = match[2].replace(/\.git$/, '')
        try {
          const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`)
          if (res.ok) {
            const data = await res.json()
            if (data.private === false) {
              checks.push({
                id: 'github',
                name: 'GitHub Repository Visibility',
                checkedItem: `${owner}/${repo}`,
                result: 'verified',
                confidence: 'high',
                detail: `Repository is publicly reachable on branch "${data.default_branch}". Evaluators and automated clone tools can access.`,
              })
            } else {
              checks.push({
                id: 'github',
                name: 'GitHub Repository Visibility',
                checkedItem: `${owner}/${repo}`,
                result: 'inaccessible',
                confidence: 'high',
                detail: 'Repository is set to PRIVATE. Evaluators will receive a 404 Not Found error.',
                actionRecommendation: 'Go to GitHub Settings -> Danger Zone -> Change repository visibility to Public.',
                incognitoUrl: githubUrl,
              })
            }
          } else if (res.status === 404) {
            // Note: GitHub returns 404 for private repos as well as non-existent ones
            checks.push({
              id: 'github',
              name: 'GitHub Repository Visibility',
              checkedItem: `${owner}/${repo}`,
              result: 'inaccessible',
              confidence: 'medium',
              detail: 'Repository returned HTTP 404. Note: GitHub returns 404 for private repositories to prevent enumeration.',
              actionRecommendation: 'Ensure spelling is correct and confirm visibility is set to Public under GitHub repo settings.',
              incognitoUrl: githubUrl,
            })
          } else if (res.status === 403) {
            checks.push({
              id: 'github',
              name: 'GitHub Repository Visibility',
              checkedItem: `${owner}/${repo}`,
              result: 'unverified',
              confidence: 'low',
              detail: 'GitHub API rate limit reached. Automated visibility probe could not complete.',
              actionRecommendation: 'Open the URL in an Incognito window to confirm it does not prompt for credentials.',
              incognitoUrl: githubUrl,
            })
          } else {
            checks.push({
              id: 'github',
              name: 'GitHub Repository Visibility',
              checkedItem: `${owner}/${repo}`,
              result: 'unverified',
              confidence: 'low',
              detail: `GitHub API returned status ${res.status}.`,
              actionRecommendation: 'Verify repository access in an Incognito browser window.',
              incognitoUrl: githubUrl,
            })
          }
        } catch {
          checks.push({
            id: 'github',
            name: 'GitHub Repository Visibility',
            checkedItem: githubUrl,
            result: 'unverified',
            confidence: 'low',
            detail: 'Network probe could not reach the GitHub API.',
            actionRecommendation: 'Verify repository access in an Incognito browser window.',
            incognitoUrl: githubUrl,
          })
        }
      }
    }

    // 2. Live Demo Deployment Link
    const demoUrl = (event.demo_url || '').trim()
    if (!demoUrl) {
      checks.push({
        id: 'demo',
        name: 'Live Demo Deployment',
        checkedItem: 'Production URL',
        result: 'warning',
        confidence: 'high',
        detail: 'No live demo URL linked.',
        actionRecommendation: 'Provide a working deployment URL (e.g., Vercel, Netlify, Cloudflare) for hands-on evaluation.',
      })
    } else if (!demoUrl.startsWith('https://')) {
      checks.push({
        id: 'demo',
        name: 'Live Demo Deployment',
        checkedItem: demoUrl,
        result: 'warning',
        confidence: 'high',
        detail: 'Demo URL uses insecure HTTP. Modern browsers block mixed content and flag security warnings to judges.',
        actionRecommendation: 'Enable HTTPS / SSL certificate on your demo deployment domain.',
      })
    } else {
      try {
        const parsed = new URL(demoUrl)
        checks.push({
          id: 'demo',
          name: 'Live Demo Deployment',
          checkedItem: parsed.hostname,
          result: 'verified',
          confidence: 'medium',
          detail: `Secure HTTPS deployment URL provided (${parsed.hostname}).`,
          incognitoUrl: demoUrl,
        })
      } catch {
        checks.push({
          id: 'demo',
          name: 'Live Demo Deployment',
          checkedItem: demoUrl,
          result: 'inaccessible',
          confidence: 'high',
          detail: 'Invalid URL structure provided.',
          actionRecommendation: 'Ensure the link includes https:// and a valid domain name.',
        })
      }
    }

    // 3. Presentation / Pitch Deck Link
    const deckUrl = (event.pitch_deck_url || '').trim()
    if (!deckUrl) {
      checks.push({
        id: 'deck',
        name: 'Pitch Deck / Slides',
        checkedItem: 'Deck Asset',
        result: 'warning',
        confidence: 'high',
        detail: 'No pitch deck uploaded or linked.',
        actionRecommendation: 'Upload a PDF or link master slides before the submission deadline.',
      })
    } else if (deckUrl.includes('drive.google.com')) {
      checks.push({
        id: 'deck',
        name: 'Pitch Deck (Google Drive)',
        checkedItem: 'Google Drive Asset',
        result: 'unverified',
        confidence: 'low',
        detail: 'Google Drive requires explicit sharing permissions. Link sharing status cannot be cryptographically proven without evaluator account credentials.',
        actionRecommendation: 'Ensure "General access" in Google Drive is set to "Anyone with the link" (Viewer). Test access in Incognito.',
        incognitoUrl: deckUrl,
      })
    } else if (deckUrl.includes('figma.com')) {
      checks.push({
        id: 'deck',
        name: 'Pitch Deck / Design (Figma)',
        checkedItem: 'Figma File',
        result: 'unverified',
        confidence: 'low',
        detail: 'Figma link access cannot be verified automatically without workspace access tokens.',
        actionRecommendation: 'Verify in the Figma Share dialog that "Anyone with the link" is granted "Can view".',
        incognitoUrl: deckUrl,
      })
    } else {
      checks.push({
        id: 'deck',
        name: 'Pitch Deck Deliverable',
        checkedItem: deckUrl.length > 40 ? `${deckUrl.slice(0, 37)}...` : deckUrl,
        result: 'verified',
        confidence: 'medium',
        detail: 'Presentation deliverable attached.',
        incognitoUrl: deckUrl.startsWith('http') ? deckUrl : undefined,
      })
    }

    // 4. Video Pitch / Demo Reachability (YouTube oEmbed probe)
    const combinedNotes = `${event.demo_url || ''} ${event.pitch_deck_url || ''} ${event.submission_notes || ''}`
    const ytMatch = combinedNotes.match(/(https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+)/i)
    if (ytMatch) {
      const ytUrl = ytMatch[1]
      try {
        const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(ytUrl)}&format=json`)
        if (oembedRes.ok) {
          const ytData = await oembedRes.json()
          checks.push({
            id: 'video',
            name: 'Video Pitch / Demo',
            checkedItem: ytData.title || 'YouTube Video',
            result: 'verified',
            confidence: 'high',
            detail: `Video is reachable without login ("${ytData.title || 'Demo'}"). Public or Unlisted availability confirmed.`,
          })
        } else if (oembedRes.status === 401 || oembedRes.status === 403) {
          checks.push({
            id: 'video',
            name: 'Video Pitch / Demo',
            checkedItem: ytUrl,
            result: 'inaccessible',
            confidence: 'high',
            detail: 'YouTube returned access restriction. Video appears to be set to PRIVATE.',
            actionRecommendation: 'Open YouTube Studio -> Visibility -> Change from Private to Unlisted.',
            incognitoUrl: ytUrl,
          })
        } else {
          checks.push({
            id: 'video',
            name: 'Video Pitch / Demo',
            checkedItem: ytUrl,
            result: 'unverified',
            confidence: 'low',
            detail: 'Could not automatically confirm YouTube video status.',
            actionRecommendation: 'Open the video URL in an Incognito window to confirm playback works while logged out.',
            incognitoUrl: ytUrl,
          })
        }
      } catch {
        checks.push({
          id: 'video',
          name: 'Video Pitch / Demo',
          checkedItem: ytUrl,
          result: 'unverified',
          confidence: 'low',
          detail: 'Could not connect to YouTube oEmbed validation service.',
          actionRecommendation: 'Test video link in an Incognito window to confirm Unlisted visibility.',
          incognitoUrl: ytUrl,
        })
      }
    }

    setResults(checks)
    setRunning(false)

    if (!silent) {
      const issuesCount = checks.filter(c => c.result === 'inaccessible' || c.result === 'warning').length
      if (issuesCount > 0) {
        toast({
          title: 'Pre-Flight Notice',
          description: `${issuesCount} item(s) need attention or manual verification before final submission.`,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Pre-Flight Verified',
          description: 'Key deliverables and evaluator reachability checks are ready.',
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

  const verifiedCount = results ? results.filter(r => r.result === 'verified').length : 0
  const inaccessibleCount = results ? results.filter(r => r.result === 'inaccessible').length : 0
  const warningCount = results ? results.filter(r => r.result === 'warning').length : 0

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
                PRE-FLIGHT SUBMISSION CHECK
              </span>
              {results && (
                <span className={cn(
                  "font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0",
                  inaccessibleCount > 0 
                    ? "bg-hack-red/15 border-hack-red/30 text-hack-red" 
                    : warningCount > 0
                    ? "bg-hack-gold/20 border-hack-gold/40 text-hack-gold-dark"
                    : "bg-hack-mint/30 border-hack-mint text-hack-mint-dark"
                )}>
                  {inaccessibleCount > 0 
                    ? `${inaccessibleCount} blocking` 
                    : warningCount > 0 
                    ? `${warningCount} to verify` 
                    : 'Ready to submit ✓'}
                </span>
              )}
            </div>
            <p className="font-sans text-xs text-hack-subtext mt-0.5">
              {inaccessibleCount > 0
                ? `${inaccessibleCount} deliverable(s) appear inaccessible to judges.`
                : warningCount > 0
                ? `${warningCount} recommendation(s) to verify before final cutoff.`
                : 'Key links and deliverables appear reachable.'}
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
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Verifying Links...
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
                    check.result === 'verified' && "bg-hack-mint/10 border-hack-mint/40 text-hack-ink",
                    check.result === 'inaccessible' && "bg-hack-red/10 border-hack-red/30 text-hack-ink",
                    check.result === 'warning' && "bg-hack-gold/15 border-hack-gold/40 text-hack-ink",
                    check.result === 'unverified' && "bg-hack-sand/60 border-hack-muted/60 text-hack-ink"
                  )}
                >
                  {check.result === 'verified' && <CheckCircle2 className="h-4 w-4 text-hack-mint-dark shrink-0 mt-0.5" />}
                  {check.result === 'inaccessible' && <XCircle className="h-4 w-4 text-hack-red shrink-0 mt-0.5" />}
                  {check.result === 'warning' && <AlertTriangle className="h-4 w-4 text-hack-gold-dark shrink-0 mt-0.5" />}
                  {check.result === 'unverified' && <HelpCircle className="h-4 w-4 text-hack-subtext shrink-0 mt-0.5" />}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-hack-ink">{check.name}</span>
                        <span className="text-[10px] text-hack-subtext font-normal truncate max-w-[180px]">
                          ({check.checkedItem})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={cn(
                          "font-bold uppercase text-[9px] px-1.5 py-0.5 rounded-full border",
                          check.result === 'verified' && "bg-hack-mint/25 border-hack-mint/40 text-hack-mint-dark",
                          check.result === 'inaccessible' && "bg-hack-red/20 border-hack-red/40 text-hack-red",
                          check.result === 'warning' && "bg-hack-gold/25 border-hack-gold/40 text-hack-gold-dark",
                          check.result === 'unverified' && "bg-hack-sand border-hack-muted/60 text-hack-subtext"
                        )}>
                          {check.result}
                        </span>
                        <span className="font-mono text-[9px] text-hack-subtext/80 hidden sm:inline">
                          ({check.confidence} confidence)
                        </span>
                      </div>
                    </div>

                    <p className="font-sans text-[11px] text-hack-subtext mt-1 leading-relaxed">
                      {check.detail}
                    </p>

                    {check.actionRecommendation && (
                      <p className="font-sans text-[11px] text-hack-ink font-semibold mt-1 bg-white/70 p-1.5 rounded border border-hack-muted/30">
                        👉 Action: {check.actionRecommendation}
                      </p>
                    )}

                    {check.incognitoUrl && (
                      <div className="mt-2 pt-1 flex items-center justify-end">
                        <a
                          href={check.incognitoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-hack-ink hover:text-hack-coral-dark underline underline-offset-2"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Test Access in New Window</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-dashed border-hack-muted text-center font-mono text-xs text-hack-subtext">
              Click "Check Everything" to verify public repository access, YouTube privacy, and submission links.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
