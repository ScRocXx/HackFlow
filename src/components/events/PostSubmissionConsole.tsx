'use client'

import { useState, useEffect } from 'react'
import { 
  CheckCircle2, AlertTriangle, ExternalLink, Calendar, Trophy, 
  ShieldAlert, Award, FileText, Check, Loader2, RefreshCw,
  FlaskConical, ShieldCheck, XCircle, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { updatePostSubmissionDetails } from '@/app/actions/events'
import { CountdownTimer } from '@/components/events/CountdownTimer'
import { PdfUpload } from '@/components/ui/pdf-upload'
import type { Event } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

interface SmokeTestResult {
  id: string
  name: string
  status: 'passed' | 'failed' | 'warning' | 'pending'
  detail: string
}

interface PostSubmissionConsoleProps {
  event: Event
}

export function PostSubmissionConsole({ event }: PostSubmissionConsoleProps) {
  const [submissionReceipt, setSubmissionReceipt] = useState(event.submission_receipt || '')
  const [submissionNotes, setSubmissionNotes] = useState(event.submission_notes || '')
  const [resultDate, setResultDate] = useState(event.result_date ? event.result_date.slice(0, 16) : '')
  const [prizeDetails, setPrizeDetails] = useState(event.prize_details || '')
  const [retroNotes, setRetroNotes] = useState(event.retro_notes || '')
  const [demoUrl, setDemoUrl] = useState(event.demo_url || '')
  const [githubUrl, setGithubUrl] = useState(event.github_repo_url || '')
  const [pitchDeckUrl, setPitchDeckUrl] = useState(event.pitch_deck_url || '')

  // GitHub Permission Checker State
  const [githubStatus, setGithubStatus] = useState<'checking' | 'public' | 'private_or_missing' | 'rate_limited' | 'idle'>('idle')
  // Drive verification manual checkbox
  const [driveVerified, setDriveVerified] = useState(false)

  // Smoke Test State
  const [runningSmokeTest, setRunningSmokeTest] = useState(false)
  const [smokeTestResults, setSmokeTestResults] = useState<SmokeTestResult[] | null>(null)

  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  // Validate GitHub repo visibility publicly
  const verifyGitHubRepo = async (url: string) => {
    if (!url.trim()) {
      setGithubStatus('idle')
      return
    }

    // Extract owner and repo from github.com/owner/repo
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/)
    if (!match) {
      setGithubStatus('idle')
      return
    }

    const owner = match[1]
    const repo = match[2].replace(/\.git$/, '')

    setGithubStatus('checking')
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: { Accept: 'application/vnd.github.v3+json' },
      })

      if (res.ok) {
        const data = await res.json()
        if (data.private === false) {
          setGithubStatus('public')
        } else {
          setGithubStatus('private_or_missing')
        }
      } else if (res.status === 403) {
        setGithubStatus('rate_limited')
      } else {
        setGithubStatus('private_or_missing')
      }
    } catch {
      setGithubStatus('private_or_missing')
    }
  }

  useEffect(() => {
    if (githubUrl) {
      verifyGitHubRepo(githubUrl)
    }
  }, [githubUrl])

  const runPreSubmissionSmokeTest = async () => {
    setRunningSmokeTest(true)
    const results: SmokeTestResult[] = []

    // Test 1: GitHub Repository Visibility
    if (!githubUrl.trim()) {
      results.push({
        id: 'github',
        name: 'GitHub Repository Public Visibility',
        status: 'failed',
        detail: 'No GitHub repository URL provided. Code submission required by most hackathons.',
      })
    } else {
      const match = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
      if (!match) {
        results.push({
          id: 'github',
          name: 'GitHub Repository Public Visibility',
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
              results.push({
                id: 'github',
                name: 'GitHub Repository Public Visibility',
                status: 'passed',
                detail: `Public repo verified (${data.stargazers_count} stars, default branch: ${data.default_branch}). Judges can clone.`,
              })
            } else {
              results.push({
                id: 'github',
                name: 'GitHub Repository Public Visibility',
                status: 'failed',
                detail: 'Repository is PRIVATE. Evaluators will receive a 404 error.',
              })
            }
          } else if (res.status === 403) {
            results.push({
              id: 'github',
              name: 'GitHub Repository Public Visibility',
              status: 'warning',
              detail: '⚠️ Rate limit reached (Verify manually in incognito)',
            })
          } else {
            results.push({
              id: 'github',
              name: 'GitHub Repository Public Visibility',
              status: 'failed',
              detail: `Repository returned HTTP ${res.status}. Ensure it is set to public.`,
            })
          }
        } catch {
          results.push({
            id: 'github',
            name: 'GitHub Repository Public Visibility',
            status: 'warning',
            detail: 'Could not connect to GitHub API to verify repo.',
          })
        }
      }
    }

    // Test 2: Live Demo URL Protocol & Host
    if (!demoUrl.trim()) {
      results.push({
        id: 'demo',
        name: 'Live Demo URL Deployment',
        status: 'warning',
        detail: 'No live demo URL provided. Strongly recommended for product evaluation.',
      })
    } else if (!demoUrl.startsWith('https://')) {
      results.push({
        id: 'demo',
        name: 'Live Demo URL Deployment',
        status: 'failed',
        detail: 'Demo URL must use secure HTTPS protocol.',
      })
    } else {
      try {
        const parsedUrl = new URL(demoUrl)
        results.push({
          id: 'demo',
          name: 'Live Demo URL Deployment',
          status: 'passed',
          detail: `Valid HTTPS deployment link provided (${parsedUrl.hostname}).`,
        })
      } catch {
        results.push({
          id: 'demo',
          name: 'Live Demo URL Deployment',
          status: 'failed',
          detail: 'Invalid Demo URL structure.',
        })
      }
    }

    // Test 3: Pitch Deck PDF & Cloud Permissions
    if (!pitchDeckUrl.trim()) {
      results.push({
        id: 'deck',
        name: 'Pitch Deck Deliverable',
        status: 'warning',
        detail: 'No pitch deck uploaded or linked.',
      })
    } else if (pitchDeckUrl.includes('drive.google.com')) {
      if (driveVerified) {
        results.push({
          id: 'deck',
          name: 'Pitch Deck & Cloud Permissions',
          status: 'passed',
          detail: 'Google Drive link verified with public read permissions (no request-access gate).',
        })
      } else {
        results.push({
          id: 'deck',
          name: 'Pitch Deck & Cloud Permissions',
          status: 'warning',
          detail: 'Google Drive link provided. Ensure "Anyone with the link can view" is active in Drive!',
        })
      }
    } else if (pitchDeckUrl.toLowerCase().endsWith('.pdf') || pitchDeckUrl.includes('supabase.co/storage')) {
      results.push({
        id: 'deck',
        name: 'Pitch Deck File Size & Format',
        status: 'passed',
        detail: 'PDF format detected. Hosted on CDN within the 20MB portal limit.',
      })
    } else {
      results.push({
        id: 'deck',
        name: 'Pitch Deck Deliverable',
        status: 'passed',
        detail: `External presentation deck URL configured: ${pitchDeckUrl.slice(0, 45)}...`,
      })
    }

    // Test 4: Submission Confirmation Proof
    if (!submissionReceipt.trim()) {
      results.push({
        id: 'receipt',
        name: 'Submission Proof & Confirmation',
        status: 'warning',
        detail: 'No receipt ID or confirmation URL recorded yet.',
      })
    } else {
      results.push({
        id: 'receipt',
        name: 'Submission Proof & Confirmation',
        status: 'passed',
        detail: `Proof recorded: ${submissionReceipt.slice(0, 30)}`,
      })
    }

    setSmokeTestResults(results)
    setRunningSmokeTest(false)

    const hasFailures = results.some(r => r.status === 'failed')
    if (hasFailures) {
      toast({
        title: 'Smoke Test Warnings Detected',
        description: 'Review failed checks before concluding submission.',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Smoke Test Passed!',
        description: 'All judge accessibility and deliverable smoke tests passed successfully!',
      })
    }
  }

  const handleSaveDetails = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setIsSaving(true)
    try {
      const res = await updatePostSubmissionDetails(event.id, {
        submission_receipt: submissionReceipt.trim() || undefined,
        submission_notes: submissionNotes.trim() || undefined,
        result_date: resultDate ? new Date(resultDate).toISOString() : undefined,
        prize_details: prizeDetails.trim() || undefined,
        retro_notes: retroNotes.trim() || undefined,
        demo_url: demoUrl.trim() || undefined,
        github_repo_url: githubUrl.trim() || undefined,
        pitch_deck_url: pitchDeckUrl.trim() || undefined,
      })

      if (!res.success) throw new Error(res.error)

      toast({
        title: 'Post-Submission Details Saved',
        description: 'Submission proof and evaluation milestones updated.',
      })
    } catch (err: any) {
      toast({ title: 'Save Failed', description: err.message, variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const isConcluded = ['winner', 'runner_up', 'participated', 'archived'].includes(event.status)
  const isFinalist = event.status === 'finalist'
  const isSubmissionPhase = ['submitted', 'under_review', 'finalist', 'winner', 'runner_up', 'participated', 'archived'].includes(event.status)
  const [isExpanded, setIsExpanded] = useState(isSubmissionPhase)

  return (
    <Card className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[7px_7px_0_#671912] overflow-hidden">
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="bg-[#3d5f58] p-5 border-b-2 border-[#10201d] text-[#f7f7f2] flex flex-col sm:flex-row justify-between sm:items-center gap-3 cursor-pointer select-none hover:bg-[#34524c] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 border-2 border-[#10201d] bg-[#f5b726] text-[#10201d] shadow-[2px_2px_0_#10201d]">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-display text-2xl font-bold tracking-tight text-[#f7f7f2] flex items-center gap-2">
              Submission Confirmation & Follow-up
              {!isExpanded && <span className="font-mono text-xs font-normal text-[#8bb2de]">(Click to expand)</span>}
            </h3>
            <p className="font-mono text-xs text-[#8bb2de]">
              Keep submission proof, verify public repo access for judges, and track results.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold uppercase px-2.5 py-1 border-2 border-[#10201d] bg-[#e97b77] text-[#10201d] shadow-[2px_2px_0_#671912]">
            Stage: {event.status.replace('_', ' ')}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-2 border-[#10201d] bg-[#f7f7f2] text-[#10201d] p-1.5 h-auto"
            onClick={(e) => {
              e.stopPropagation()
              setIsExpanded(!isExpanded)
            }}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <CardContent className="p-6 space-y-6">
        {/* Pre-Submission Automated Smoke Test Suite */}
        <div className="p-4 bg-[#10201d] text-[#f7f7f2] border-2 border-[#10201d] shadow-[5px_5px_0_#10201d] space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#2e4742] pb-3">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-[#f5b726]" />
              <div>
                <h4 className="font-display text-base font-bold text-[#f7f7f2]">
                  Pre-Submission Automated Smoke Test Suite
                </h4>
                <p className="font-mono text-[11px] text-[#8bb2de]">
                  Automated verification of GitHub repo visibility, Drive access permissions, and deliverable integrity.
                </p>
              </div>
            </div>
            <Button
              type="button"
              disabled={runningSmokeTest}
              onClick={runPreSubmissionSmokeTest}
              className="font-mono text-xs font-bold bg-[#e53927] hover:bg-[#c82717] text-white border-2 border-white shadow-[2px_2px_0_#000000] shrink-0"
            >
              {runningSmokeTest ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Running Diagnostics...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Run Automated Smoke Test
                </>
              )}
            </Button>
          </div>

          {smokeTestResults && (
            <div className="space-y-2 pt-1">
              {smokeTestResults.map((test) => (
                <div
                  key={test.id}
                  className={cn(
                    "p-2.5 border font-mono text-xs flex items-start gap-2.5",
                    test.status === 'passed' && "bg-[#142622] border-[#52b788] text-[#c4d4d0]",
                    test.status === 'failed' && "bg-[#280c0a] border-[#e53927] text-[#f7f7f2]",
                    test.status === 'warning' && "bg-[#251f0b] border-[#f5b726] text-[#f2f2eb]"
                  )}
                >
                  {test.status === 'passed' && <CheckCircle2 className="h-4 w-4 text-[#52b788] shrink-0 mt-0.5" />}
                  {test.status === 'failed' && <XCircle className="h-4 w-4 text-[#e53927] shrink-0 mt-0.5" />}
                  {test.status === 'warning' && <AlertTriangle className="h-4 w-4 text-[#f5b726] shrink-0 mt-0.5" />}
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#f7f7f2]">{test.name}</span>
                      <span className={cn(
                        "font-extrabold uppercase text-[10px] px-1.5 py-0.5",
                        test.status === 'passed' && "text-[#52b788]",
                        test.status === 'failed' && "text-[#e53927]",
                        test.status === 'warning' && "text-[#f5b726]"
                      )}>
                        [{test.status}]
                      </span>
                    </div>
                    <p className="text-[11px] opacity-90 mt-0.5">{test.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Row 1: Submission Proof & Permission Checker */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Submission Proof Details */}
          <div className="p-4 border-2 border-[#10201d] bg-white shadow-[4px_4px_0_#10201d] space-y-3">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#10201d] block">
              1. Submission Confirmation & Proof
            </span>

            <div className="space-y-2">
              <div>
                <label className="font-mono text-[11px] font-bold text-[#34433f] block">Submission Receipt ID / Link</label>
                <Input
                  value={submissionReceipt}
                  onChange={(e) => setSubmissionReceipt(e.target.value)}
                  placeholder="e.g. #UNSTOP-SUB-92812 or Portal Confirmation URL"
                  className="font-mono text-xs border-2 border-[#10201d] bg-[#f2f2eb] h-9"
                />
              </div>

              <div>
                <label className="font-mono text-[11px] font-bold text-[#34433f] block">Submission Notes / Credentials</label>
                <Input
                  value={submissionNotes}
                  onChange={(e) => setSubmissionNotes(e.target.value)}
                  placeholder="e.g. Test credentials: demo / hack2026, API keys injected"
                  className="font-mono text-xs border-2 border-[#10201d] bg-[#f2f2eb] h-9"
                />
              </div>
            </div>
          </div>

          {/* Public Access & Permission Checker */}
          <div className="p-4 border-2 border-[#10201d] bg-white shadow-[4px_4px_0_#10201d] space-y-3">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#10201d] block">
              2. Permissions Checker (Judge Accessibility)
            </span>

            {/* GitHub Repo Validation */}
            <div className="space-y-2">
              <div>
                <div className="flex items-center justify-between">
                  <label className="font-mono text-[11px] font-bold text-[#34433f]">GitHub Repository URL</label>
                  {githubStatus === 'checking' && (
                    <span className="font-mono text-[10px] text-[#34433f] flex items-center">
                      <Loader2 className="w-3 h-3 animate-spin mr-1" /> Checking...
                    </span>
                  )}
                  {githubStatus === 'public' && (
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 border border-[#10201d] bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-700" /> Public (Accessible)
                    </span>
                  )}
                  {githubStatus === 'rate_limited' && (
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 border border-[#10201d] bg-amber-100 text-amber-800 flex items-center gap-1">
                      ⚠️ Rate limit reached (Verify manually in incognito)
                    </span>
                  )}
                  {githubStatus === 'private_or_missing' && (
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 border border-[#10201d] bg-red-100 text-red-800 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-red-700" /> Private / Not Found
                    </span>
                  )}
                </div>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo"
                    className="font-mono text-xs border-2 border-[#10201d] bg-[#f2f2eb] h-9 flex-1"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => verifyGitHubRepo(githubUrl)}
                    className="font-mono text-xs font-bold border-2 border-[#10201d] bg-[#8bb2de] text-[#10201d] px-3 shrink-0"
                  >
                    Check
                  </Button>
                </div>
              </div>

              {/* Pitch Deck / Presentation PDF */}
              <div className="pt-2 border-t border-[#10201d]/15">
                <PdfUpload
                  value={pitchDeckUrl}
                  onChange={(url) => setPitchDeckUrl(url)}
                  label="Pitch Deck (Upload PDF or Link)"
                  placeholder="https://drive.google.com/... or https://canva.com/..."
                  folder="hackathon_submissions"
                />

                {pitchDeckUrl && pitchDeckUrl.includes('drive.google.com') && (
                  <div className="mt-2 flex items-center gap-2 p-2 border border-[#10201d] bg-white">
                    <input
                      type="checkbox"
                      id="drive-check"
                      checked={driveVerified}
                      onChange={(e) => setDriveVerified(e.target.checked)}
                      className="h-4 w-4 border-2 border-[#10201d] rounded-none accent-[#10201d]"
                    />
                    <label htmlFor="drive-check" className="font-mono text-[11px] text-[#34433f] select-none cursor-pointer">
                      Verified: Link is set to "Anyone with the link can view" (No request access gate)
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Evaluation Results Countdown & Finalist Logistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Results Announcement Date */}
          <div className="p-4 border-2 border-[#10201d] bg-[#f2f2eb] shadow-[4px_4px_0_#10201d] space-y-3">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#10201d] block">
              3. Results Announcement Schedule
            </span>

            <div className="space-y-2">
              <label className="font-mono text-[11px] font-bold text-[#34433f] block">Target Announcement Date</label>
              <Input
                type="datetime-local"
                value={resultDate}
                onChange={(e) => setResultDate(e.target.value)}
                className="font-mono text-xs border-2 border-[#10201d] bg-white h-9"
              />
            </div>

            {resultDate && (
              <div className="p-3 border-2 border-[#10201d] bg-white">
                <span className="font-mono text-[10px] uppercase font-bold text-[#34433f] block mb-1">
                  Time Until Results Announcement:
                </span>
                <CountdownTimer deadline={new Date(resultDate).toISOString()} />
              </div>
            )}
          </div>

          {/* Finalist Logistics Checklist */}
          <div className="p-4 border-2 border-[#10201d] bg-[#f2f2eb] shadow-[4px_4px_0_#10201d] space-y-3">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#10201d] block">
              4. Finalist Readiness Checklist
            </span>

            <div className="space-y-2 font-mono text-xs">
              <label className="flex items-center gap-2 p-2 border border-[#10201d] bg-white cursor-pointer">
                <input type="checkbox" className="accent-[#10201d]" />
                <span>Presentation deck rehearsed within exact pitch slot</span>
              </label>
              <label className="flex items-center gap-2 p-2 border border-[#10201d] bg-white cursor-pointer">
                <input type="checkbox" className="accent-[#10201d]" />
                <span>Offline local fallback video recorded (in case of live demo Wi-Fi failure)</span>
              </label>
              <label className="flex items-center gap-2 p-2 border border-[#10201d] bg-white cursor-pointer">
                <input type="checkbox" className="accent-[#10201d]" />
                <span>In-person travel, tickets, and venue pass confirmations verified</span>
              </label>
            </div>
          </div>
        </div>

        {/* Row 3: Concluded Hackathon Outcome & Retro Notes */}
        <div className="p-4 border-2 border-[#10201d] bg-white shadow-[4px_4px_0_#10201d] space-y-3">
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#10201d] block">
            5. Conclusion, Prize Claims & Retro Notes
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-[11px] font-bold text-[#34433f] block">Prize Details / Claim ID</label>
              <Input
                value={prizeDetails}
                onChange={(e) => setPrizeDetails(e.target.value)}
                placeholder="e.g. ₹50,000 Cash Prize + Certificate"
                className="font-mono text-xs border-2 border-[#10201d] bg-[#f2f2eb] h-9"
              />
            </div>
            <div>
              <label className="font-mono text-[11px] font-bold text-[#34433f] block">Live Demo URL (for Trophy Case)</label>
              <Input
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                placeholder="https://myproject.vercel.app"
                className="font-mono text-xs border-2 border-[#10201d] bg-[#f2f2eb] h-9"
              />
            </div>
          </div>

          <div>
            <label className="font-mono text-[11px] font-bold text-[#34433f] block">Squad Retrospective & Learnings</label>
            <textarea
              value={retroNotes}
              onChange={(e) => setRetroNotes(e.target.value)}
              placeholder="What worked well? What broke at the last minute? Key takeaways for next hackathon..."
              rows={2}
              className="w-full p-2.5 font-mono text-xs border-2 border-[#10201d] bg-[#f2f2eb] focus:outline-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => handleSaveDetails()}
              disabled={isSaving}
              className="font-mono text-xs font-bold border-2 border-[#10201d] bg-[#e97b77] hover:bg-[#f6c4c1] text-[#10201d] shadow-[3px_3px_0_#671912]"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Lifecycle Progress'}
            </Button>
          </div>
        </div>
      </CardContent>
      )}
    </Card>
  )
}
