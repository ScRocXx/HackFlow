'use client'

import { useState, useEffect } from 'react'
import { 
  ShieldCheck, AlertTriangle, CheckCircle2, XCircle, 
  Loader2, FlaskConical, ExternalLink, ChevronDown, ChevronUp,
  HelpCircle, Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'
import { addEventResource, updateEvent } from '@/app/actions/events'
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
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<PreFlightCheck[] | null>(null)
  const [isExpanded, setIsExpanded] = useState(true)
  const [inlineUrls, setInlineUrls] = useState<Record<string, string>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const { toast } = useToast()

  const handleInlineSaveUrl = async (key: string, url: string) => {
    if (!url?.trim()) return
    setSavingKey(key)
    try {
      const trimmed = url.trim()
      let resourceType = 'link'
      let title = 'Resource'
      let updatePayload: any = { eventId: event.id }

      if (key === 'github') {
        resourceType = 'github'
        title = 'GitHub Repository'
        updatePayload.github_repo_url = trimmed
      } else if (key === 'demo') {
        resourceType = 'demo'
        title = 'Live Demo'
        updatePayload.demo_url = trimmed
      } else if (key === 'deck') {
        resourceType = 'deck'
        title = 'Pitch Deck / Slides'
        updatePayload.pitch_deck_url = trimmed
      }

      const [resResult, eventResult] = await Promise.all([
        addEventResource(event.id, {
          title,
          url: trimmed,
          resource_type: resourceType,
        }),
        updateEvent(updatePayload),
      ])

      if (resResult.success || eventResult.success) {
        toast({
          title: 'Resource Linked',
          description: `${title} URL saved and verified.`,
        })
        setInlineUrls(prev => ({ ...prev, [key]: '' }))
        router.refresh()
        await runDiagnostics(true)
      } else {
        throw new Error(resResult.error || eventResult.error || 'Failed to save link')
      }
    } catch (err: any) {
      toast({
        title: 'Save Failed',
        description: err.message || 'Could not save link.',
        variant: 'destructive',
      })
    } finally {
      setSavingKey(null)
    }
  }

  const runDiagnostics = async (silent = false) => {
    setRunning(true)
    const checks: PreFlightCheck[] = []

    // 1. GitHub Repo Public Reachability Check
    const githubUrl = (event.github_repo_url || '').trim()
    if (!githubUrl) {
      checks.push({
        id: 'github',
        name: 'GitHub Repo (Public)',
        checkedItem: 'Code Repository',
        result: 'warning',
        confidence: 'high',
        detail: 'No code repository URL provided.',
        actionRecommendation: 'Paste your GitHub repo link below so we can check if it\'s public.',
      })
    } else {
      const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
      if (!match) {
        checks.push({
          id: 'github',
          name: 'GitHub Repo (Public)',
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
                name: 'GitHub Repo (Public)',
                checkedItem: `${owner}/${repo}`,
                result: 'verified',
                confidence: 'high',
                detail: `Public repo verified on branch "${data.default_branch}". Judges can clone and evaluate.`,
              })
            } else {
              checks.push({
                id: 'github',
                name: 'GitHub Repo (Public)',
                checkedItem: `${owner}/${repo}`,
                result: 'inaccessible',
                confidence: 'high',
                detail: 'Repository is set to PRIVATE. Judges will receive a 404 error.',
                actionRecommendation: 'Go to GitHub Settings -> Danger Zone -> Change repository visibility to Public.',
                incognitoUrl: githubUrl,
              })
            }
          } else if (res.status === 404) {
            checks.push({
              id: 'github',
              name: 'GitHub Repo (Public)',
              checkedItem: `${owner}/${repo}`,
              result: 'inaccessible',
              confidence: 'medium',
              detail: 'Repository returned HTTP 404. It may be private or mistyped.',
              actionRecommendation: 'Ensure spelling is correct and confirm visibility is set to Public.',
              incognitoUrl: githubUrl,
            })
          } else if (res.status === 403) {
            checks.push({
              id: 'github',
              name: 'GitHub Repo (Public)',
              checkedItem: `${owner}/${repo}`,
              result: 'unverified',
              confidence: 'low',
              detail: 'GitHub API rate limit reached.',
              actionRecommendation: 'Open the URL in an Incognito window to confirm public access.',
              incognitoUrl: githubUrl,
            })
          } else {
            checks.push({
              id: 'github',
              name: 'GitHub Repo (Public)',
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
            name: 'GitHub Repo (Public)',
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
        name: 'Live Demo URL',
        checkedItem: 'Production URL',
        result: 'warning',
        confidence: 'high',
        detail: 'No live demo URL linked.',
        actionRecommendation: 'Provide a working deployment URL (e.g., Vercel, Netlify) for hands-on evaluation.',
      })
    } else if (!demoUrl.startsWith('https://')) {
      checks.push({
        id: 'demo',
        name: 'Live Demo URL',
        checkedItem: demoUrl,
        result: 'warning',
        confidence: 'high',
        detail: 'Demo URL uses insecure HTTP. Browsers flag security warnings to judges.',
        actionRecommendation: 'Enable HTTPS on your demo deployment domain.',
      })
    } else {
      try {
        const parsed = new URL(demoUrl)
        checks.push({
          id: 'demo',
          name: 'Live Demo URL',
          checkedItem: parsed.hostname,
          result: 'verified',
          confidence: 'medium',
          detail: `Live demo verified at ${parsed.hostname}.`,
          incognitoUrl: demoUrl,
        })
      } catch {
        checks.push({
          id: 'demo',
          name: 'Live Demo URL',
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
        name: 'Pitch Deck',
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
        detail: 'Google Drive link sharing status cannot be proven without evaluator login.',
        actionRecommendation: 'Ensure "General access" in Google Drive is set to "Anyone with the link" (Viewer).',
        incognitoUrl: deckUrl,
      })
    } else if (deckUrl.includes('figma.com')) {
      checks.push({
        id: 'deck',
        name: 'Pitch Deck (Figma)',
        checkedItem: 'Figma File',
        result: 'unverified',
        confidence: 'low',
        detail: 'Figma link access cannot be verified automatically without workspace access tokens.',
        actionRecommendation: 'Verify in Figma Share dialog that "Anyone with the link" can view.',
        incognitoUrl: deckUrl,
      })
    } else {
      checks.push({
        id: 'deck',
        name: 'Pitch Deck',
        checkedItem: deckUrl.length > 40 ? `${deckUrl.slice(0, 37)}...` : deckUrl,
        result: 'verified',
        confidence: 'medium',
        detail: 'Pitch deck deliverable attached.',
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
    <div className="border border-hack-muted/60 bg-hack-surface rounded-[6px] shadow-hack-card overflow-hidden">
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-hack-surface p-4 text-hack-ink flex flex-col gap-3 cursor-pointer select-none border-b border-hack-muted/30"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <FlaskConical className="h-5 w-5 text-hack-gold-dark shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-hack-ink">
                Ready to submit?
              </span>
              {results && (
                <span className={cn(
                  "font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-[4px] border shrink-0",
                  inaccessibleCount > 0 
                    ? "bg-hack-red/15 border-hack-red/30 text-hack-red" 
                    : warningCount > 0
                    ? "bg-hack-gold/20 border-hack-gold/40 text-hack-gold-dark"
                    : "bg-hack-mint/30 border-hack-mint text-hack-mint-dark"
                )}>
                  {verifiedCount}/{results.length} ready
                </span>
              )}
            </div>
            <p className="font-sans text-xs text-hack-subtext mt-0.5">
              Quick check before you submit to the portal.
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
            className="btn-tactile font-mono text-xs font-bold bg-hack-coral text-hack-ink h-8 px-3 rounded-[4px] flex-1 justify-center"
          >
            {running ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Verifying Links...
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Re-check links
              </>
            )}
          </Button>

          <button
            type="button"
            className="p-1.5 text-hack-subtext hover:text-hack-ink rounded-[4px] border border-hack-muted/40 hover:bg-hack-sand/50 transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
            aria-label={isExpanded ? "Collapse checklist" : "Expand checklist"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3.5 bg-hack-surface space-y-2">
          {results ? (
            <div className="space-y-2">
              {results.map((check) => {
                const isVerified = check.result === 'verified'
                const isInaccessible = check.result === 'inaccessible'
                const isWarning = check.result === 'warning'
                const canInput = (isInaccessible || isWarning) && ['github', 'demo', 'deck'].includes(check.id)

                return (
                  <div
                    key={check.id}
                    className={cn(
                      "p-2.5 rounded-[4px] border font-mono text-xs flex flex-col gap-1.5 transition-all min-h-[44px]",
                      isVerified && "border-l-4 border-l-hack-mint border-y border-r border-hack-muted/50 bg-hack-mint/5 text-hack-ink",
                      isInaccessible && "border-l-4 border-l-hack-red border-y border-r border-hack-muted/50 bg-hack-red/5 text-hack-ink",
                      isWarning && "border-l-4 border-l-hack-gold border-y border-r border-hack-muted/50 bg-hack-sand/40 text-hack-ink",
                      check.result === 'unverified' && "border-l-4 border-l-hack-muted border-y border-r border-hack-muted/50 bg-hack-sand/20 text-hack-ink"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        {isVerified && <CheckCircle2 className="h-4 w-4 text-hack-mint-dark shrink-0" />}
                        {isInaccessible && <XCircle className="h-4 w-4 text-hack-red shrink-0" />}
                        {isWarning && <AlertTriangle className="h-4 w-4 text-hack-gold-dark shrink-0" />}
                        {check.result === 'unverified' && <HelpCircle className="h-4 w-4 text-hack-subtext shrink-0" />}
                        
                        <span className="font-semibold text-hack-ink text-xs">{check.name}</span>
                        {check.checkedItem && !['Code Repository', 'Production URL', 'Deck Asset'].includes(check.checkedItem) && (
                          <span className="text-[10px] text-hack-subtext font-normal truncate max-w-[140px]">
                            ({check.checkedItem})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn(
                          "font-bold uppercase text-[9px] px-2 py-0.5 rounded-[4px] border",
                          isVerified && "bg-hack-mint/30 border-hack-mint text-hack-mint-dark",
                          isInaccessible && "bg-hack-red/20 border-hack-red/40 text-hack-red",
                          isWarning && "bg-hack-gold/20 border-hack-gold/40 text-hack-gold-dark",
                          check.result === 'unverified' && "bg-hack-sand border-hack-muted text-hack-subtext"
                        )}>
                          {isVerified ? '✓ Ready' : isInaccessible ? 'Inaccessible' : 'Not linked yet'}
                        </span>

                        {check.incognitoUrl && (
                          <a
                            href={check.incognitoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-hack-subtext hover:text-hack-ink"
                            title="Open link"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    <p className="font-sans text-[11px] text-hack-subtext leading-relaxed">
                      {check.detail}
                    </p>

                    {canInput && (
                      <div className="mt-1 flex items-center gap-1.5">
                        <input
                          type="url"
                          placeholder={
                            check.id === 'github' 
                              ? 'Paste GitHub repo link...' 
                              : check.id === 'demo' 
                              ? 'Paste live demo link...' 
                              : 'Paste pitch deck / slides link...'
                          }
                          value={inlineUrls[check.id] || ''}
                          onChange={(e) => setInlineUrls(prev => ({ ...prev, [check.id]: e.target.value }))}
                          className="h-7 min-w-0 flex-1 font-mono text-xs border border-hack-muted/60 bg-white rounded-[4px] px-2 focus:outline-none focus:border-hack-ink"
                        />
                        <button
                          type="button"
                          disabled={!inlineUrls[check.id]?.trim() || savingKey === check.id}
                          onClick={() => handleInlineSaveUrl(check.id, inlineUrls[check.id])}
                          className="btn-tactile h-7 px-2.5 font-mono text-[10px] font-bold uppercase bg-hack-gold text-hack-ink rounded-[4px] shrink-0 disabled:opacity-50"
                        >
                          {savingKey === check.id ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-4 rounded-[4px] border border-dashed border-hack-muted text-center font-mono text-xs text-hack-subtext">
              Click "Re-check links" to verify public repository access and submission links.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
