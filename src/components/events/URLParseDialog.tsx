'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Plus, Trash2, Calendar, AlertCircle, Sparkles, Check, Tag, FileText, Database, ExternalLink, Link2, Users, RefreshCw, Zap, FileCode, Eye, ChevronDown, ChevronUp } from 'lucide-react'
import { ExtractionProgress, type ExtractionConfidence } from '@/components/events/ExtractionProgress'
import { URLParseIntake } from '@/components/events/URLParseIntake'
import { createEvent } from '@/app/actions/events'
import { getMySquads } from '@/app/actions/squads'
import type { Squad, MissionBrief } from '@/lib/supabase/types'
import { useRouter } from 'next/navigation'
import { ensureExternalUrl } from '@/lib/utils/url'

interface URLParseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialUrl?: string
}

interface EditableStage {
  round_number: number
  title: string
  stage_type: string
  deadline: string
  window_start?: string | null
  window_end?: string | null
  actionable_deadline?: string | null
  raw_date_snippet?: string | null
  evaluation_format?: string
  deliverables_description?: string
  deliverables?: string[]
}

interface EditableResource {
  title: string
  url: string
  resource_type: string
}

const STAGE_TYPES = [
  { value: 'quiz', label: 'Online Quiz / Assessment' },
  { value: 'ppt_submission', label: 'PPT / Idea Submission' },
  { value: 'prototype', label: 'Working Prototype / MVP' },
  { value: 'hackathon_sprint', label: 'Hackathon Sprint / Build' },
  { value: 'presentation', label: 'Pitch / Final Demo' },
  { value: 'other', label: 'General Milestone' },
]

const RESOURCE_TYPES = [
  { value: 'problem_statement', label: 'Problem Statement' },
  { value: 'rulebook', label: 'Rulebook / Guidelines' },
  { value: 'template', label: 'PPT / Slide Template' },
  { value: 'dataset', label: 'Dataset / API Spec' },
  { value: 'reference', label: 'Reference / Documentation' },
  { value: 'other', label: 'Other Link' },
]

function toLocalDatetimeInputString(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function URLParseDialog({ open, onOpenChange, initialUrl = '' }: URLParseDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  
  const [activeTab, setActiveTab] = useState<'url' | 'text'>('url')
  const [url, setUrl] = useState(initialUrl)
  const [pastedText, setPastedText] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [hasParsed, setHasParsed] = useState(false)
  const [showTextInput, setShowTextInput] = useState(false)

  // Squad Participation Mode
  const [userSquads, setUserSquads] = useState<Squad[]>([])
  const [participationMode, setParticipationMode] = useState<'solo' | 'squad'>('solo')
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      getMySquads().then((res) => {
        if (res.success && res.data) {
          setUserSquads(res.data)
          if (res.data.length > 0 && !selectedSquadId) {
            setSelectedSquadId(res.data[0].id)
          }
        }
      })
    }
  }, [open])
  
  // Parsed Form State
  const [title, setTitle] = useState('')
  const [organizer, setOrganizer] = useState('')
  const [sourcePlatform, setSourcePlatform] = useState('custom')
  const [mode, setMode] = useState('online')
  const [location, setLocation] = useState('')
  const [bannerUrl, setBannerUrl] = useState('')
  const [prizePool, setPrizePool] = useState('')
  const [prizeCashPool, setPrizeCashPool] = useState<number | string | null>(null)
  const [prizeFirstPlace, setPrizeFirstPlace] = useState<number | string | null>(null)
  const [hasPerksOrCredits, setHasPerksOrCredits] = useState<boolean>(false)
  const [rawPrizeText, setRawPrizeText] = useState<string | null>(null)
  const [prizeDisplaySummary, setPrizeDisplaySummary] = useState<string | null>(null)
  const [overview, setOverview] = useState('')
  const [teamSizeMin, setTeamSizeMin] = useState(1)
  const [teamSizeMax, setTeamSizeMax] = useState(4)
  const [stages, setStages] = useState<EditableStage[]>([])
  const [newDeliverableInputs, setNewDeliverableInputs] = useState<Record<number, string>>({})

  // Confidence metrics computed from parsed output
  const confidence: ExtractionConfidence | null = hasParsed ? {
    roundsCount: stages.length,
    deadlinesCount: stages.filter(s => Boolean(s.deadline && s.deadline !== 'TBA')).length,
    deliverablesCount: stages.reduce((acc, s) => acc + (s.deliverables?.length || 0), 0),
    unconfirmedCount: stages.filter(s => !s.deadline || s.deadline === 'TBA').length,
  } : null
  
  // Resources State
  const [resources, setResources] = useState<EditableResource[]>([])
  const [newResourceTitle, setNewResourceTitle] = useState('')
  const [newResourceUrl, setNewResourceUrl] = useState('')
  const [newResourceType, setNewResourceType] = useState('problem_statement')
  
  // Mission Brief State
  const [missionBrief, setMissionBrief] = useState<MissionBrief | null>(null)

  useEffect(() => {
    if (open) {
      if (initialUrl && initialUrl !== url) {
        setUrl(initialUrl)
        setActiveTab('url')
        handleParse(initialUrl)
      }
    } else {
      // Reset error state when closed if not parsed
      if (!hasParsed) {
        setExtractError(null)
      }
    }
  }, [open, initialUrl])

  const [stashedRawText, setStashedRawText] = useState<string>('')
  const [showRawEditor, setShowRawEditor] = useState(false)
  const [isFromCache, setIsFromCache] = useState(false)

  const performExtract = async (payload: { url?: string; text?: string; forceFresh?: boolean; reparseOnly?: boolean }) => {
    setExtracting(true)
    setExtractError(null)

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.code === 'SCRAPE_BLOCKED' || data.suggestion === 'copy_paste' || data.error === 'scrape_blocked') {
          setActiveTab('text')
          setExtractError(data.message || 'This portal is protected by anti-bot verification. Please paste the guidelines or page text below.')
          toast({
            title: 'Portal Protection Detected',
            description: 'Switched to Text tab: Paste announcement or flyer text below for instant AI extraction.',
          })
          return
        }
        throw new Error(data.message || data.error || 'Failed to extract competition details')
      }

      if (data.rawContent) {
        setStashedRawText(data.rawContent)
      }
      setIsFromCache(Boolean(data.fromCache))

      // Populate parsed metadata
      setTitle(data.title || '')
      setOrganizer(data.organizer || '')
      setSourcePlatform(data.source_platform || 'custom')
      setMode(data.mode || 'online')
      setLocation(data.location || '')
      setBannerUrl(data.banner_url || '')
      
      if (data.prizes) {
        setPrizeCashPool(data.prizes.cash_pool ?? null)
        setPrizeFirstPlace(data.prizes.first_place_cash ?? null)
        setHasPerksOrCredits(Boolean(data.prizes.has_perks_or_credits))
        setRawPrizeText(data.prizes.raw_prize_text || null)
        setPrizeDisplaySummary(data.prizes.display_summary || null)
        setPrizePool(data.prizes.display_summary || data.prize_pool || '')
      } else {
        setPrizePool(data.prize_pool || '')
      }

      setOverview(data.overview || '')
      setTeamSizeMin(data.team_size_min || 1)
      setTeamSizeMax(data.team_size_max || 4)

      // Auto-populate extracted resources (problem statements, rulebooks, etc.)
      if (Array.isArray(data.resources) && data.resources.length > 0) {
        setResources(data.resources.map((r: any) => ({
          title: r.title || 'Attached Resource',
          url: r.url || '',
          resource_type: r.resource_type || 'other',
        })))
      } else {
        setResources([])
      }

      // Auto-populate extracted mission brief (tier, what/why, tech mandate, deliverables)
      if (data.mission_brief) {
        setMissionBrief(data.mission_brief)
      } else {
        setMissionBrief(null)
      }

      // Auto-populate extracted stages as editable cards
      if (Array.isArray(data.stages) && data.stages.length > 0) {
        const mappedStages: EditableStage[] = data.stages.map((stg: any, index: number) => {
          let formattedDeadline = ''
          if (stg.deadline && typeof stg.deadline === 'string' && stg.deadline.trim() && stg.deadline !== 'null') {
            try {
              const d = new Date(stg.deadline)
              if (!isNaN(d.getTime()) && d.getFullYear() >= 2000) {
                formattedDeadline = toLocalDatetimeInputString(d)
              }
            } catch {
              // Keep empty
            }
          }

          // Parse initial deliverable tags
          let initialTags: string[] = []
          if (stg.deliverables && Array.isArray(stg.deliverables)) {
            initialTags = stg.deliverables
          } else if (stg.deliverables_description) {
            initialTags = stg.deliverables_description
              .split(/[,;\n]+/)
              .map((t: string) => t.trim())
              .filter(Boolean)
          }

          return {
            round_number: stg.round_number || index + 1,
            title: stg.title || `Round ${index + 1}`,
            stage_type: stg.stage_type || 'other',
            deadline: formattedDeadline,
            window_start: stg.window_start || null,
            window_end: stg.window_end || null,
            actionable_deadline: stg.actionable_deadline || null,
            raw_date_snippet: stg.raw_date_snippet || null,
            evaluation_format: stg.evaluation_format || '',
            deliverables_description: stg.deliverables_description || '',
            deliverables: initialTags,
          }
        })
        setStages(mappedStages)
      } else {
        // Fallback single stage (Zero-hallucination: No synthetic dates)
        setStages([
          {
            round_number: 1,
            title: 'Round 1: Final Submission',
            stage_type: 'prototype',
            deadline: '',
            window_start: null,
            window_end: null,
            actionable_deadline: null,
            raw_date_snippet: 'TBA',
            deliverables: ['Working Prototype', 'Project README', 'Demo Video'],
          }
        ])
      }

      setHasParsed(true)
      toast({
        title: 'Extraction Successful',
        description: `Extracted ${data.stages?.length || 1} round(s) and ${data.resources?.length || 0} resource(s).`,
      })
    } catch (err: any) {
      console.error('Extraction failure:', err)
      const message = err?.message || 'Failed to extract hackathon details. Please verify the URL or paste the guidelines directly.'
      setExtractError(message)
      toast({
        title: 'Extraction Notice',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setExtracting(false)
    }
  }

  const handleParse = async (targetUrl?: string) => {
    let parseUrl = (targetUrl || url).trim()
    // Sanitize URL: strip trailing dots, punctuation, quotes
    parseUrl = parseUrl.replace(/[.,;'"\s]+$/, '').trim()

    if (!parseUrl) {
      toast({
        title: 'URL Required',
        description: 'Please enter a hackathon or challenge link to parse.',
        variant: 'destructive',
      })
      return
    }

    await performExtract({ url: parseUrl })
  }

  const handleParseText = async () => {
    const textToParse = pastedText.trim()
    if (!textToParse) {
      toast({
        title: 'Guidelines Text Required',
        description: 'Please paste the hackathon guidelines, rules, or website text to parse.',
        variant: 'destructive',
      })
      return
    }

    if (textToParse.length < 20) {
      toast({
        title: 'Text Too Short',
        description: 'Please paste at least 20 characters of guidelines or contest text.',
        variant: 'destructive',
      })
      return
    }

    const optionalUrl = url.trim().replace(/[.,;'"\s]+$/, '').trim()
    await performExtract({
      text: textToParse,
      url: optionalUrl || undefined,
    })
  }

  const handleFreshReScrape = async () => {
    let parseUrl = url.trim().replace(/[.,;'"\s]+$/, '').trim()
    if (!parseUrl) {
      toast({
        title: 'URL Required',
        description: 'Please enter a URL for fresh re-scrape.',
        variant: 'destructive',
      })
      return
    }
    await performExtract({ url: parseUrl, forceFresh: true })
  }

  const handleQuickReParse = async () => {
    let parseUrl = url.trim().replace(/[.,;'"\s]+$/, '').trim()
    if (!parseUrl && !stashedRawText) {
      toast({
        title: 'Cannot Re-parse',
        description: 'No URL or raw text available in stash.',
        variant: 'destructive',
      })
      return
    }
    await performExtract({ url: parseUrl || undefined, text: stashedRawText || undefined, reparseOnly: true })
  }

  const handleReparseEditedText = async () => {
    if (!stashedRawText.trim()) {
      toast({
        title: 'Empty Raw Text',
        description: 'Please ensure raw text is not empty before re-parsing.',
        variant: 'destructive',
      })
      return
    }
    let parseUrl = url.trim().replace(/[.,;'"\s]+$/, '').trim()
    await performExtract({ text: stashedRawText, url: parseUrl || undefined })
  }

  const handleAddResource = () => {
    if (!newResourceTitle.trim() || !newResourceUrl.trim()) {
      toast({
        title: 'Resource Details Required',
        description: 'Please enter both a title and URL for the attached document.',
        variant: 'destructive',
      })
      return
    }

    setResources([
      ...resources,
      {
        title: newResourceTitle.trim(),
        url: newResourceUrl.trim(),
        resource_type: newResourceType,
      }
    ])
    setNewResourceTitle('')
    setNewResourceUrl('')
    setNewResourceType('problem_statement')
  }

  const handleRemoveResource = (index: number) => {
    setResources(resources.filter((_, i) => i !== index))
  }

  const handleAddStage = () => {
    const nextRound = stages.length + 1
    const nextDate = toLocalDatetimeInputString(new Date(Date.now() + (nextRound * 3) * 24 * 60 * 60 * 1000))
    setStages([
      ...stages,
      {
        round_number: nextRound,
        title: `Round ${nextRound}: Milestone`,
        stage_type: 'prototype',
        deadline: nextDate,
        deliverables: ['Project Deliverable'],
      }
    ])
  }

  const handleRemoveStage = (index: number) => {
    if (stages.length <= 1) {
      toast({
        title: 'Stage Required',
        description: 'An event must have at least one stage.',
        variant: 'destructive',
      })
      return
    }
    const updated = stages.filter((_, i) => i !== index).map((s, i) => ({
      ...s,
      round_number: i + 1,
    }))
    setStages(updated)
  }

  const handleAddDeliverableTag = (stageIndex: number) => {
    const tagText = (newDeliverableInputs[stageIndex] || '').trim()
    if (!tagText) return

    const updated = [...stages]
    const currentTags = updated[stageIndex].deliverables || []
    if (!currentTags.includes(tagText)) {
      updated[stageIndex].deliverables = [...currentTags, tagText]
      setStages(updated)
    }

    setNewDeliverableInputs({ ...newDeliverableInputs, [stageIndex]: '' })
  }

  const handleRemoveDeliverableTag = (stageIndex: number, tagToRemove: string) => {
    const updated = [...stages]
    updated[stageIndex].deliverables = (updated[stageIndex].deliverables || []).filter(t => t !== tagToRemove)
    setStages(updated)
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast({
        title: 'Title Required',
        description: 'Please give your hackathon a title.',
        variant: 'destructive',
      })
      return
    }

    if (stages.length === 0) {
      toast({
        title: 'Stage Required',
        description: 'Please specify at least one deadline round.',
        variant: 'destructive',
      })
      return
    }

    setSubmitting(true)
    try {
      // Normalize dates to ISO string (Safeguard: preserve true null for TBA stages)
      const preparedStages = stages.map(stg => {
        let isoDeadline: string | null = null
        if (stg.deadline && stg.deadline.trim()) {
          try {
            const d = new Date(stg.deadline)
            if (!isNaN(d.getTime())) {
              isoDeadline = d.toISOString()
            } else {
              isoDeadline = stg.deadline
            }
          } catch {
            isoDeadline = stg.deadline
          }
        }

        return {
          round_number: stg.round_number,
          title: stg.title,
          stage_type: stg.stage_type,
          deadline: isoDeadline,
          window_start: stg.window_start || null,
          window_end: stg.window_end || isoDeadline,
          actionable_deadline: stg.actionable_deadline || isoDeadline,
          raw_date_snippet: stg.raw_date_snippet || (!isoDeadline ? 'TBA' : null),
          evaluation_format: stg.evaluation_format,
          deliverables_description: stg.deliverables?.join(', ') || stg.deliverables_description,
          deliverables: stg.deliverables,
        }
      })

      // Ensure source URL has https:// if entered without protocol
      let cleanSourceUrl = url.trim().replace(/[.,;'"\s]+$/, '')
      if (cleanSourceUrl && !/^https?:\/\//i.test(cleanSourceUrl) && cleanSourceUrl.includes('.')) {
        cleanSourceUrl = `https://${cleanSourceUrl}`
      }

      const res = await createEvent({
        title,
        organizer,
        source_url: cleanSourceUrl || undefined,
        source_platform: sourcePlatform,
        mode,
        location,
        banner_url: bannerUrl || undefined,
        prize_pool: prizePool,
        prize_cash_pool: prizeCashPool,
        prize_first_place: prizeFirstPlace,
        has_perks_or_credits: hasPerksOrCredits,
        raw_prize_text: rawPrizeText,
        prize_display_summary: prizeDisplaySummary || prizePool,
        overview,
        team_size_min: Number(teamSizeMin) || 1,
        team_size_max: Number(teamSizeMax) || 4,
        squad_id: participationMode === 'squad' ? selectedSquadId : null,
        stages: preparedStages,
        resources: resources.filter(r => r.title.trim() && r.url.trim()),
        mission_brief: missionBrief,
      })

      if (!res.success || res.error) {
        throw new Error(res.error || 'Failed to save event to database')
      }

      toast({
        title: 'Event Imported!',
        description: `${title} is now active on your dashboard.`,
      })

      onOpenChange(false)
      // Reset
      setHasParsed(false)
      setUrl('')
      setPastedText('')
      setBannerUrl('')
      setMissionBrief(null)
      
      if (res.data?.id) {
        router.push(`/events/${res.data.id}`)
      } else {
        router.refresh()
      }
    } catch (err: any) {
      console.error('Creation error:', err)
      const errorMsg = err instanceof Error ? err.message : 'Failed to create event'
      toast({
        title: 'Save Failed',
        description: errorMsg,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[92vh] sm:max-h-[90vh] overflow-y-auto rounded-2xl border border-hack-ink/20 bg-hack-sand shadow-2xl p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#F6C344]/25 text-hack-ink border border-[#F6C344]/50">
              <Sparkles className="h-5 w-5 text-[#8A5D13]" />
            </div>
            <div>
              <DialogTitle className="font-sans text-xl sm:text-2xl font-bold text-hack-ink tracking-tight">
                Add a Hackathon
              </DialogTitle>
              <DialogDescription className="font-mono text-xs text-hack-subtext mt-0.5">
                Paste a link or guidelines copy to extract rounds and deadlines in seconds.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Step 1: Single URL Intake with Stepped Progress and Secondary Text Accordion */}
        {!hasParsed ? (
          <URLParseIntake
            url={url}
            onUrlChange={setUrl}
            pastedText={pastedText}
            onPastedTextChange={setPastedText}
            extracting={extracting}
            extractError={extractError}
            showTextInput={showTextInput}
            onToggleTextInput={() => setShowTextInput(!showTextInput)}
            onParseUrl={handleParse}
            onParseText={handleParseText}
            onManualEntry={() => {
              setTitle('My Hackathon')
              setStages([
                {
                  round_number: 1,
                  title: 'Round 1: Submission',
                  stage_type: 'prototype',
                  deadline: toLocalDatetimeInputString(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
                  deliverables: ['GitHub Repository', 'Live Demo URL'],
                }
              ])
              setHasParsed(true)
            }}
          />
        ) : (
          /* Step 2: Review and Edit Auto-Populated Cards */
          <div className="space-y-6 py-2">
            {/* Extraction Confidence & Verification Summary with Actual Facts */}
            <ExtractionProgress 
              isExtracting={false} 
              confidence={confidence} 
              stages={stages}
              eventTitle={title}
            />

            {/* Raw Text Stash & Re-Parse Engine Bar */}
            <div className="p-3 rounded-xl bg-hack-sand/60 border border-hack-ink/15 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-hack-ink flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-hack-coral-dark" />
                  Raw Stash:
                </span>
                <span className={`font-mono text-[11px] font-medium px-2 py-0.5 rounded border ${isFromCache ? 'border-hack-ink/20 bg-hack-sky/30 text-hack-ink' : 'border-hack-mint/60 bg-hack-mint/20 text-hack-mint-dark'}`}>
                  {isFromCache ? '⚡ In-Memory Cache (10m TTL)' : '🌐 Fresh Extracted'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {url && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={extracting}
                    onClick={handleFreshReScrape}
                    className="h-7 text-xs font-mono font-medium bg-white rounded-md border border-hack-ink/20 hover:bg-hack-sand"
                  >
                    {extracting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                    Fresh Re-scrape
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={extracting || (!url && !stashedRawText)}
                  onClick={handleQuickReParse}
                  className="h-7 text-xs font-mono font-medium bg-hack-mint/20 text-hack-mint-dark rounded-md border border-hack-mint/40 hover:bg-hack-mint/30"
                >
                  {extracting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Zap className="h-3 w-3 mr-1" />}
                  Re-parse Stash
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowRawEditor(!showRawEditor)}
                  className="h-7 text-xs font-mono font-medium bg-white rounded-md border border-hack-ink/20 hover:bg-hack-sand"
                >
                  <Eye className="h-3 w-3 mr-1" />
                  {showRawEditor ? 'Hide Raw Text' : 'View / Edit Raw'}
                </Button>
              </div>
            </div>

            {showRawEditor && (
              <div className="p-3.5 rounded-xl bg-white border border-hack-ink/15 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-xs font-semibold uppercase tracking-wider text-hack-ink">
                    Raw Scraped Markdown / Text Stash
                  </label>
                  <Button
                    type="button"
                    size="sm"
                    disabled={extracting || !stashedRawText.trim()}
                    onClick={handleReparseEditedText}
                    className="h-7 text-xs font-mono font-bold bg-hack-coral text-hack-ink rounded-md hover:bg-hack-coral/90 shadow-sm"
                  >
                    {extracting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                    Re-parse Edited Text
                  </Button>
                </div>
                <textarea
                  rows={8}
                  value={stashedRawText}
                  onChange={(e) => setStashedRawText(e.target.value)}
                  placeholder="Raw scraped text or markdown content..."
                  className="w-full font-mono text-xs p-2.5 rounded-lg border border-hack-ink/20 bg-hack-sand/20 focus:border-hack-coral focus:ring-1 focus:ring-hack-coral focus:outline-none resize-y"
                />
              </div>
            )}

            {/* Event Metadata */}
            <div className="p-4 sm:p-5 rounded-xl bg-hack-panel border border-hack-ink/15 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-sans text-sm font-bold text-hack-ink">Event Overview</span>
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-hack-ink/20 bg-hack-sand text-hack-ink">
                  {sourcePlatform}
                </span>
              </div>

              {bannerUrl && (
                <div className="relative w-full h-32 overflow-hidden rounded-lg border border-hack-ink/15 bg-black/5">
                  <img 
                    src={bannerUrl} 
                    alt="Event Banner Preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }} 
                  />
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-hack-ink/80 text-white rounded font-mono text-[10px] font-semibold">
                    Banner Preview
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="font-mono text-xs font-semibold uppercase tracking-wider text-hack-ink block">Competition Title *</label>
                <Input 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="Hackathon Title"
                  className="bg-white rounded-lg font-sans text-base font-bold border border-hack-ink/20 focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-mono text-xs font-semibold uppercase tracking-wider text-hack-ink block">Organizer</label>
                  <Input 
                    value={organizer} 
                    onChange={e => setOrganizer(e.target.value)} 
                    placeholder="e.g. Google, IIT"
                    className="bg-white rounded-lg font-mono text-xs border border-hack-ink/20 focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-xs font-semibold uppercase tracking-wider text-hack-ink block">Mode</label>
                  <select
                    value={mode}
                    onChange={e => setMode(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-hack-ink/20 bg-white font-mono text-xs focus:outline-none focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                  >
                    <option value="online">Online</option>
                    <option value="in-person">In-Person</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-xs font-semibold uppercase tracking-wider text-hack-ink block">Location / Venue</label>
                  <Input 
                    value={location} 
                    onChange={e => setLocation(e.target.value)} 
                    placeholder="e.g. San Francisco, CA or Virtual"
                    className="bg-white rounded-lg font-mono text-xs border border-hack-ink/20 focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-xs font-semibold uppercase tracking-wider text-hack-ink block">Prize Pool</label>
                  <Input 
                    value={prizePool} 
                    onChange={e => setPrizePool(e.target.value)} 
                    placeholder="e.g. ₹5,00,000"
                    className="bg-white rounded-lg font-mono text-xs border border-hack-ink/20 focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                  />
                  {(prizeCashPool !== null || hasPerksOrCredits) && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {prizeCashPool !== null && (
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-hack-sky/30 text-hack-ink font-semibold border border-hack-ink/15">
                          💵 Cash: {String(prizeCashPool).startsWith('₹') || String(prizeCashPool).startsWith('$') || String(prizeCashPool).startsWith('€') || String(prizeCashPool).startsWith('£') ? String(prizeCashPool) : `₹${Number(prizeCashPool) ? Number(prizeCashPool).toLocaleString() : prizeCashPool}`}
                        </span>
                      )}
                      {hasPerksOrCredits && (
                        <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-[#FEF9EE] text-[#8A5D13] font-semibold border border-[#F6C344]/50">
                          🎁 Perks/Credits Included
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-xs font-semibold uppercase tracking-wider text-hack-ink block">Banner Image URL</label>
                  <Input 
                    value={bannerUrl} 
                    onChange={e => setBannerUrl(e.target.value)} 
                    placeholder="e.g. https://.../banner.png"
                    className="bg-white rounded-lg font-mono text-xs border border-hack-ink/20 focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-xs font-semibold uppercase tracking-wider text-hack-ink block">Source Link (Optional)</label>
                  <Input 
                    value={url} 
                    onChange={e => setUrl(e.target.value)} 
                    placeholder="e.g. https://..."
                    className="bg-white rounded-lg font-mono text-xs border border-hack-ink/20 focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                  />
                </div>
              </div>
            </div>

            {/* Hackathon Brief Preview Card */}
            {missionBrief && (
              <div className="p-4 sm:p-5 rounded-xl bg-hack-panel border border-hack-ink/15 shadow-sm space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎯</span>
                    <span className="font-sans text-sm font-bold text-hack-ink">
                      Hackathon Brief
                    </span>
                  </div>
                  <span
                    className={`font-mono text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      missionBrief.hackathon_tier === 'tech_mandate'
                        ? 'bg-[#FEF9EE] text-[#8A5D13] border-[#F6C344]'
                        : missionBrief.hackathon_tier === 'domain_focused'
                        ? 'bg-hack-sky/30 text-hack-ink border-hack-ink/20'
                        : 'bg-hack-mint/20 text-hack-mint-dark border-hack-mint/40'
                    }`}
                  >
                    {missionBrief.hackathon_tier === 'tech_mandate'
                      ? '🔧 Tech Mandated'
                      : missionBrief.hackathon_tier === 'domain_focused'
                      ? '🎯 Domain Focused'
                      : '🟢 Regular Open'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] font-semibold uppercase tracking-wider text-hack-subtext block">
                      What to Build
                    </label>
                    <p className="font-sans text-xs text-hack-ink bg-hack-sand/40 p-3 rounded-lg border border-hack-ink/10 leading-relaxed">
                      {missionBrief.what_to_build}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[10px] font-semibold uppercase tracking-wider text-hack-subtext block">
                      Why It Exists (Sponsor Motive)
                    </label>
                    <p className="font-sans text-xs text-hack-ink bg-hack-sand/40 p-3 rounded-lg border border-hack-ink/10 leading-relaxed">
                      {missionBrief.why_it_exists}
                    </p>
                  </div>
                </div>

                {/* Stack Rules */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="font-mono text-[10px] font-semibold uppercase tracking-wider text-hack-subtext block">
                      Stack Rules & Constraints
                    </label>
                    {missionBrief.tech_stack_mandate.is_stack_restricted && (
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-hack-coral/15 text-hack-coral-dark border border-hack-coral/40">
                        ⚠️ Stack Restricted
                      </span>
                    )}
                  </div>

                  {missionBrief.tech_stack_mandate.is_stack_restricted ? (
                    <div className="space-y-2 p-3 rounded-lg bg-hack-sand/30 border border-hack-ink/10">
                      <p className="font-mono text-xs text-hack-subtext">
                        {missionBrief.tech_stack_mandate.allowed_stack_summary}
                      </p>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {missionBrief.tech_stack_mandate.mandatory_tools.map((tool, idx) => (
                          <span
                            key={idx}
                            className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md border border-hack-coral/40 bg-hack-coral/10 text-hack-coral-dark flex items-center gap-1"
                          >
                            <span>⚡</span> {tool}
                          </span>
                        ))}
                        {missionBrief.tech_stack_mandate.bonus_sponsor_tools.map((tool, idx) => (
                          <span
                            key={`bonus-${idx}`}
                            className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md border border-[#F6C344]/50 bg-[#FEF9EE] text-[#8A5D13] flex items-center gap-1"
                          >
                            <span>⭐</span> {tool} (Bonus)
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-hack-sand/30 border border-hack-ink/10">
                      <p className="font-sans text-xs text-hack-ink font-semibold flex items-center gap-1.5">
                        <span>✨</span>
                        {missionBrief.tech_stack_mandate.allowed_stack_summary || 'Any tech stack permitted (Free Choice)'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Submission Deliverables */}
                {missionBrief.submission_deliverables && missionBrief.submission_deliverables.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <label className="font-mono text-[10px] font-semibold uppercase tracking-wider text-hack-subtext block">
                      Required Deliverables Checklist
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {missionBrief.submission_deliverables.map((deliv, idx) => (
                        <span
                          key={idx}
                          className="font-mono text-xs font-medium px-2 py-0.5 rounded-md border border-hack-ink/10 bg-hack-sand/50 text-hack-ink flex items-center gap-1"
                        >
                          <span className="text-hack-mint-dark font-bold">✓</span> {deliv}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stages Section (Auto-Populated as Editable Cards) */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-sans text-base sm:text-lg font-bold text-hack-ink">
                    Sequential Stages & Deadlines ({stages.length})
                  </h4>
                  <p className="font-mono text-xs text-hack-subtext">
                    Extracted automatically. Customize dates, round formats, and deliverables below.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAddStage}
                  className="font-sans text-xs font-bold rounded-lg border border-hack-ink/20 bg-white hover:bg-hack-sand text-hack-ink shadow-sm"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Round
                </Button>
              </div>

              <div className="space-y-3">
                {stages.map((stage, idx) => (
                  <div 
                    key={idx} 
                    className="p-4 rounded-xl border border-hack-ink/15 bg-hack-panel shadow-sm space-y-3"
                  >
                    {/* Stage Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="font-mono text-xs font-bold uppercase px-2 py-0.5 rounded border border-hack-ink/20 bg-hack-ink text-hack-panel">
                          Round {stage.round_number}
                        </span>
                        {stage.raw_date_snippet && (
                          <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded border border-hack-ink/15 bg-hack-sand text-hack-subtext hidden sm:inline-block">
                            🗓️ {stage.raw_date_snippet}
                          </span>
                        )}
                        <Input 
                          value={stage.title} 
                          onChange={e => {
                            const newStages = [...stages]
                            newStages[idx].title = e.target.value
                            setStages(newStages)
                          }}
                          placeholder="Stage Title"
                          className="font-sans text-sm font-bold text-hack-ink rounded-lg border border-hack-ink/20 bg-white flex-1 h-9 focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                        />
                      </div>
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveStage(idx)}
                        className="text-hack-subtext hover:bg-hack-coral/15 hover:text-hack-coral-dark rounded-md h-8 w-8 shrink-0 transition-colors"
                        title="Delete this stage"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Stage Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-mono text-xs font-semibold uppercase tracking-wider text-hack-ink block">Evaluation Format</label>
                        <select
                          value={stage.stage_type}
                          onChange={e => {
                            const newStages = [...stages]
                            newStages[idx].stage_type = e.target.value
                            setStages(newStages)
                          }}
                          className="w-full h-9 px-3 rounded-lg border border-hack-ink/20 bg-hack-sand/30 font-mono text-xs focus:outline-none focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                        >
                          {STAGE_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="font-mono text-xs font-semibold uppercase tracking-wider text-hack-ink flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Deadline (Local Time)
                          </label>
                          {!stage.deadline && (
                            <span className="font-mono text-[10px] font-semibold text-[#8A5D13] bg-[#FEF9EE] px-1.5 py-0.2 rounded border border-[#F6C344]/40">
                              📅 Dates TBA
                            </span>
                          )}
                        </div>
                        <Input 
                          type="datetime-local" 
                          value={stage.deadline || ''} 
                          onChange={e => {
                            const newStages = [...stages]
                            newStages[idx].deadline = e.target.value
                            setStages(newStages)
                          }}
                          className="h-9 font-mono text-xs rounded-lg border border-hack-ink/20 bg-hack-sand/30 focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                        />
                      </div>
                    </div>

                    {/* Deliverables Tags */}
                    <div className="space-y-1.5 pt-1">
                      <label className="font-mono text-xs font-semibold uppercase tracking-wider text-hack-ink flex items-center gap-1">
                        <Tag className="h-3 w-3 text-hack-subtext" />
                        Key Deliverables Checklist
                      </label>
                      
                      <div className="flex flex-wrap gap-1.5 min-h-[28px] items-center">
                        {(stage.deliverables || []).map((deliv, dIdx) => (
                          <span 
                            key={dIdx} 
                            className="inline-flex items-center gap-1 font-mono text-xs font-medium px-2 py-1 rounded-md border border-hack-ink/15 bg-hack-sand/50 text-hack-ink"
                          >
                            <Check className="h-3 w-3 text-hack-mint-dark" />
                            {deliv}
                            <button
                              type="button"
                              onClick={() => handleRemoveDeliverableTag(idx, deliv)}
                              className="text-hack-subtext hover:text-hack-coral-dark ml-0.5 font-bold"
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>

                      <div className="flex gap-2 mt-1">
                        <Input 
                          placeholder="Add deliverable tag (e.g. Slide Deck PDF, Demo Video)"
                          value={newDeliverableInputs[idx] || ''}
                          onChange={e => setNewDeliverableInputs({ ...newDeliverableInputs, [idx]: e.target.value })}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddDeliverableTag(idx)
                            }
                          }}
                          className="h-8 font-mono text-xs flex-1 rounded-md border border-hack-ink/20 bg-white focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddDeliverableTag(idx)}
                          className="h-8 font-mono text-xs font-semibold px-2.5 rounded-md border border-hack-ink/20 bg-white hover:bg-hack-sand text-hack-ink shrink-0"
                        >
                          <Plus className="h-3 w-3 mr-1" /> Tag
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attached Documents & Problem Statement Links */}
            <div className="space-y-3">
              <div>
                <h3 className="font-sans text-base sm:text-lg font-bold text-hack-ink flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-[#8A5D13]" />
                  Attached Documents & Problem Statement Links ({resources.length})
                </h3>
                <p className="font-mono text-xs text-hack-subtext mt-0.5">
                  Official challenge briefs, guidelines, slide templates, datasets, or cloud links.
                </p>
              </div>

              {/* Extracted resources list */}
              <div className="space-y-2">
                {resources.map((res, rIdx) => (
                  <div 
                    key={rIdx} 
                    className="p-3 bg-hack-panel rounded-xl border border-hack-ink/15 shadow-sm flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {res.resource_type === 'dataset' ? (
                        <Database className="h-4 w-4 text-hack-mint-dark shrink-0" />
                      ) : res.resource_type === 'rulebook' || res.resource_type === 'problem_statement' ? (
                        <FileText className="h-4 w-4 text-[#8A5D13] shrink-0" />
                      ) : (
                        <Link2 className="h-4 w-4 text-hack-subtext shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-sans text-sm font-bold text-hack-ink truncate">{res.title}</span>
                          <span className="font-mono text-[10px] font-semibold px-2 py-0.5 uppercase tracking-wider rounded border border-hack-ink/15 bg-hack-sand text-hack-ink shrink-0">
                            {res.resource_type.replace('_', ' ')}
                          </span>
                        </div>
                        <a 
                          href={ensureExternalUrl(res.url)} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="font-mono text-xs text-hack-coral-dark hover:underline flex items-center gap-1 truncate mt-0.5"
                        >
                          <span className="truncate">{res.url}</span>
                          <ExternalLink className="h-3 w-3 shrink-0 inline" />
                        </a>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveResource(rIdx)}
                      className="text-hack-subtext hover:bg-hack-coral/15 hover:text-hack-coral-dark rounded-md h-7 w-7 shrink-0 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}

                {resources.length === 0 && (
                  <div className="p-3.5 rounded-xl border border-dashed border-hack-ink/20 text-center font-mono text-xs text-hack-subtext bg-hack-sand/30">
                    No attached documents detected. You can add problem statement or guideline links below.
                  </div>
                )}
              </div>

              {/* Add custom resource link inputs */}
              <div className="p-3.5 rounded-xl bg-hack-sand/60 border border-hack-ink/15 space-y-2">
                <span className="font-mono text-xs font-semibold uppercase tracking-wider text-hack-ink block">Add Resource Link</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    placeholder="Document Title (e.g. Problem Statement)"
                    value={newResourceTitle}
                    onChange={e => setNewResourceTitle(e.target.value)}
                    className="h-8 font-mono text-xs bg-white rounded-md border border-hack-ink/20 focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                  />
                  <Input
                    placeholder="URL (e.g. Google Drive, PDF)"
                    value={newResourceUrl}
                    onChange={e => setNewResourceUrl(e.target.value)}
                    className="h-8 font-mono text-xs bg-white rounded-md border border-hack-ink/20 focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                  />
                  <div className="flex gap-1.5">
                    <select
                      value={newResourceType}
                      onChange={e => setNewResourceType(e.target.value)}
                      className="h-8 px-2 rounded-md border border-hack-ink/20 bg-white font-mono text-xs flex-1 focus:outline-none focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                    >
                      {RESOURCE_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddResource}
                      className="h-8 font-mono text-xs font-semibold px-3 rounded-md bg-[#F6C344] hover:bg-[#F6C344]/90 text-hack-ink shadow-sm shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Participation Mode */}
            <div className="rounded-xl border border-hack-ink/15 bg-hack-panel p-4 shadow-sm space-y-2.5">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-hack-mint-dark" />
                <span className="font-mono text-xs font-semibold text-hack-ink uppercase">
                  Participation Mode
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setParticipationMode('solo')
                    setSelectedSquadId(null)
                  }}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-mono font-semibold transition-all ${
                    participationMode === 'solo'
                      ? 'bg-hack-ink text-hack-panel border-hack-ink shadow-sm'
                      : 'bg-white text-hack-subtext border-hack-ink/20 hover:bg-hack-sand'
                  }`}
                >
                  <span>👤 Solo Sprint</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setParticipationMode('squad')
                    if (userSquads.length > 0 && !selectedSquadId) {
                      setSelectedSquadId(userSquads[0].id)
                    }
                  }}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-mono font-semibold transition-all ${
                    participationMode === 'squad'
                      ? 'bg-hack-ink text-hack-panel border-hack-ink shadow-sm'
                      : 'bg-white text-hack-subtext border-hack-ink/20 hover:bg-hack-sand'
                  }`}
                >
                  <span>👥 Squad Roster</span>
                </button>
              </div>

              {participationMode === 'squad' && (
                <div className="mt-2 space-y-2 pt-2 border-t border-hack-ink/10">
                  {userSquads.length === 0 ? (
                    <div className="font-mono text-xs text-hack-coral-dark p-2.5 rounded-lg bg-hack-coral/10 border border-hack-coral/30">
                      You haven't formed any squads yet. Head to "Squads & Friends" to create one, or proceed Solo!
                    </div>
                  ) : (
                    <>
                      <label className="block font-mono text-xs font-semibold text-hack-ink">
                        Select Squad to Enroll:
                      </label>
                      <select
                        value={selectedSquadId || ''}
                        onChange={(e) => setSelectedSquadId(e.target.value)}
                        className="w-full font-mono text-xs font-medium p-2.5 rounded-lg border border-hack-ink/20 bg-white text-hack-ink focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                      >
                        {userSquads.map((sq) => (
                          <option key={sq.id} value={sq.id}>
                            {sq.name} ({sq.member_count || 1} members)
                          </option>
                        ))}
                      </select>
                      <p className="font-mono text-[11px] text-hack-subtext">
                        All members of this squad will have access to this hackathon board and shared tasks.
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setHasParsed(false)} 
                disabled={submitting} 
                className="flex-1 font-sans text-xs font-bold rounded-lg border border-hack-ink/20 bg-white hover:bg-hack-sand text-hack-ink shadow-sm"
              >
                {activeTab === 'text' ? 'Back to Text / Flyer' : 'Back to Link'}
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={submitting} 
                className="flex-[2] font-sans text-xs font-bold rounded-lg bg-hack-coral hover:bg-hack-coral/90 text-hack-ink shadow-hack-hero transition-all active:translate-y-0.5"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {submitting ? 'Adding...' : 'Add to My Hackathons'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
