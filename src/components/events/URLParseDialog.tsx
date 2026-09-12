'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Plus, Trash2, Calendar, AlertCircle, Sparkles, Check, Tag, FileText, Database, ExternalLink, Link2, Users } from 'lucide-react'
import { createEvent } from '@/app/actions/events'
import { getMySquads } from '@/app/actions/squads'
import type { Squad } from '@/lib/supabase/types'
import { useRouter } from 'next/navigation'

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

export function URLParseDialog({ open, onOpenChange, initialUrl = '' }: URLParseDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  
  const [url, setUrl] = useState(initialUrl)
  const [extracting, setExtracting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  const [hasParsed, setHasParsed] = useState(false)

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
  const [prizePool, setPrizePool] = useState('')
  const [prizeCashPool, setPrizeCashPool] = useState<number | null>(null)
  const [prizeFirstPlace, setPrizeFirstPlace] = useState<number | null>(null)
  const [hasPerksOrCredits, setHasPerksOrCredits] = useState<boolean>(false)
  const [rawPrizeText, setRawPrizeText] = useState<string | null>(null)
  const [prizeDisplaySummary, setPrizeDisplaySummary] = useState<string | null>(null)
  const [overview, setOverview] = useState('')
  const [teamSizeMin, setTeamSizeMin] = useState(1)
  const [teamSizeMax, setTeamSizeMax] = useState(4)
  const [stages, setStages] = useState<EditableStage[]>([])
  const [newDeliverableInputs, setNewDeliverableInputs] = useState<Record<number, string>>({})
  
  // Resources State
  const [resources, setResources] = useState<EditableResource[]>([])
  const [newResourceTitle, setNewResourceTitle] = useState('')
  const [newResourceUrl, setNewResourceUrl] = useState('')
  const [newResourceType, setNewResourceType] = useState('problem_statement')

  useEffect(() => {
    if (open) {
      if (initialUrl && initialUrl !== url) {
        setUrl(initialUrl)
        handleParse(initialUrl)
      } else if (!hasParsed && url.trim()) {
        handleParse(url)
      }
    } else {
      // Reset state when closed if not parsed
      if (!hasParsed) {
        setExtractError(null)
      }
    }
  }, [open, initialUrl])

  const handleParse = async (targetUrl?: string) => {
    const parseUrl = (targetUrl || url).trim()
    if (!parseUrl) {
      toast({
        title: 'URL Required',
        description: 'Please enter a hackathon or challenge link to parse.',
        variant: 'destructive',
      })
      return
    }

    setExtracting(true)
    setExtractError(null)

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: parseUrl }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'I suppose this is not a hackathon...')
      }

      // Populate parsed metadata
      setTitle(data.title || '')
      setOrganizer(data.organizer || '')
      setSourcePlatform(data.source_platform || 'custom')
      setMode(data.mode || 'online')
      setLocation(data.location || '')
      
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

      // Auto-populate extracted stages as editable cards
      if (Array.isArray(data.stages) && data.stages.length > 0) {
        const mappedStages: EditableStage[] = data.stages.map((stg: any, index: number) => {
          // Format deadline to local datetime-local string if possible
          let formattedDeadline = stg.deadline || ''
          try {
            const d = new Date(stg.deadline)
            if (!isNaN(d.getTime())) {
              formattedDeadline = d.toISOString().slice(0, 16) // YYYY-MM-DDTHH:mm
            }
          } catch {
            // Keep original string
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
      console.error('URL parse failure:', err)
      const message = err?.message || 'I suppose this is not a hackathon...'
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
    const nextDate = new Date(Date.now() + (nextRound * 3) * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
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

      const res = await createEvent({
        title,
        organizer,
        source_url: url,
        source_platform: sourcePlatform,
        mode,
        location,
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
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto border-2 border-[#10201d] bg-[#f7f7f2] shadow-[8px_8px_0_#671912] p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 border-2 border-[#10201d] bg-[#f5b726] text-[#10201d] shadow-[2px_2px_0_#10201d]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="font-display text-2xl sm:text-3xl font-extrabold text-[#10201d] tracking-tight">
                Import Hackathon from URL
              </DialogTitle>
              <DialogDescription className="font-mono text-xs text-[#34433f] mt-1">
                Extract timeline rounds, deadlines, deliverable checklists, and resources.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Step 1: Input URL if not parsed yet */}
        {!hasParsed ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="font-mono text-xs font-bold uppercase tracking-wider text-[#10201d] block">
                Hackathon or Competition URL
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input 
                  placeholder="e.g. https://unstop.com/hackathons/... or https://internshala.com/..." 
                  value={url} 
                  onChange={(e) => setUrl(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleParse()}
                  disabled={extracting}
                  className="flex-1 h-11 font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
                />
                <Button 
                  onClick={() => handleParse()} 
                  disabled={extracting || !url.trim()} 
                  className="h-11 px-5 font-mono text-xs font-bold border-2 border-[#10201d] bg-[#e97b77] hover:bg-[#f6c4c1] text-[#10201d] shadow-[3px_3px_0_#671912] shrink-0"
                >
                  {extracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {extracting ? 'Analyzing...' : 'Parse URL'}
                </Button>
              </div>
              <p className="font-mono text-[11px] text-[#34433f]">
                Supports Unstop, Internshala, Devpost, Devfolio, HackerEarth, and MLH competitions.
              </p>
            </div>

            {extractError && (
              <div className="p-3.5 border-2 border-[#10201d] bg-[#f6c4c1] text-[#671912] shadow-[3px_3px_0_#671912] text-sm flex gap-2.5 items-start">
                <AlertCircle className="h-5 w-5 text-[#e53927] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-display font-bold text-base">Extraction Error</p>
                  <p className="font-mono text-xs mt-0.5">{extractError}</p>
                </div>
              </div>
            )}

            {/* Option to create manually if parse fails or user wants */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setTitle('My New Hackathon')
                  setStages([
                    {
                      round_number: 1,
                      title: 'Round 1: Submission',
                      stage_type: 'prototype',
                      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
                      deliverables: ['GitHub Repository', 'Live Demo URL'],
                    }
                  ])
                  setHasParsed(true)
                }}
                className="font-mono text-xs font-bold text-[#2e4742] hover:text-[#e53927] underline"
              >
                Or enter event details manually &rarr;
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Review and Edit Auto-Populated Cards */
          <div className="space-y-6 py-2">
            {/* Event Metadata */}
            <div className="p-4 bg-[#f2f2eb] border-2 border-[#10201d] shadow-[4px_4px_0_#10201d] space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#10201d]">Event Overview</span>
                <span className="font-mono text-xs font-bold uppercase tracking-wider px-2 py-0.5 border-2 border-[#10201d] bg-[#8bb2de] text-[#10201d] shadow-[1px_1px_0_#10201d]">
                  {sourcePlatform}
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-xs font-bold uppercase tracking-wider text-[#10201d] block">Competition Title *</label>
                <Input 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="Hackathon Title"
                  className="bg-white font-display text-base font-bold border-2 border-[#10201d] shadow-[2px_2px_0_#10201d]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-mono text-xs font-bold uppercase tracking-wider text-[#10201d] block">Organizer</label>
                  <Input 
                    value={organizer} 
                    onChange={e => setOrganizer(e.target.value)} 
                    placeholder="e.g. Google, IIT"
                    className="bg-white font-mono text-xs border-2 border-[#10201d] shadow-[2px_2px_0_#10201d]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-xs font-bold uppercase tracking-wider text-[#10201d] block">Mode</label>
                  <select
                    value={mode}
                    onChange={e => setMode(e.target.value)}
                    className="w-full h-10 px-3 border-2 border-[#10201d] bg-white font-mono text-xs shadow-[2px_2px_0_#10201d] focus:outline-none focus:ring-0"
                  >
                    <option value="online">Online</option>
                    <option value="in-person">In-Person</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-xs font-bold uppercase tracking-wider text-[#10201d] block">Prize Pool</label>
                  <Input 
                    value={prizePool} 
                    onChange={e => setPrizePool(e.target.value)} 
                    placeholder="e.g. ₹5,00,000"
                    className="bg-white font-mono text-xs border-2 border-[#10201d] shadow-[2px_2px_0_#10201d]"
                  />
                  {(prizeCashPool !== null || hasPerksOrCredits) && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {prizeCashPool !== null && (
                        <span className="font-mono text-[9px] px-1.5 py-0.5 bg-[#8bb2de] text-[#10201d] font-bold border border-[#10201d]">
                          💵 Cash: ₹{prizeCashPool.toLocaleString()}
                        </span>
                      )}
                      {hasPerksOrCredits && (
                        <span className="font-mono text-[9px] px-1.5 py-0.5 bg-[#f5b726] text-[#10201d] font-bold border border-[#10201d]">
                          🎁 Perks/Credits Included
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stages Section (Auto-Populated as Editable Cards) */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-display text-2xl font-bold tracking-tight text-[#10201d]">
                    Sequential Stages & Deadlines ({stages.length})
                  </h4>
                  <p className="font-mono text-xs text-[#34433f]">
                    Extracted automatically. Customize dates, round formats, and deliverables below.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAddStage}
                  className="font-mono text-xs font-bold border-2 border-[#10201d] bg-[#f5b726] hover:bg-[#ffcf66] text-[#10201d] shadow-[2px_2px_0_#8a5d13]"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Round
                </Button>
              </div>

              <div className="space-y-3">
                {stages.map((stage, idx) => (
                  <div 
                    key={idx} 
                    className="p-4 border-2 border-[#10201d] bg-white shadow-[4px_4px_0_#10201d] space-y-3"
                  >
                    {/* Stage Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="font-mono text-xs font-bold uppercase px-2 py-0.5 border-2 border-[#10201d] bg-[#8bb2de] text-[#10201d] shadow-[1px_1px_0_#10201d]">
                          Round {stage.round_number}
                        </span>
                        {stage.raw_date_snippet && (
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 border border-[#10201d] bg-[#f2f2eb] text-[#34433f] hidden sm:inline-block">
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
                          className="font-display text-base font-bold text-[#10201d] border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d] flex-1 h-9"
                        />
                      </div>
                      <Button 
                        type="button"
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveStage(idx)}
                        className="text-[#10201d] hover:bg-[#e97b77] hover:text-white border-2 border-transparent hover:border-[#10201d] h-8 w-8 shrink-0 transition-colors"
                        title="Delete this stage"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Stage Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="font-mono text-xs font-bold uppercase tracking-wider text-[#10201d] block">Evaluation Format</label>
                        <select
                          value={stage.stage_type}
                          onChange={e => {
                            const newStages = [...stages]
                            newStages[idx].stage_type = e.target.value
                            setStages(newStages)
                          }}
                          className="w-full h-9 px-3 border-2 border-[#10201d] bg-[#f2f2eb] font-mono text-xs shadow-[2px_2px_0_#10201d] focus:outline-none focus:ring-0"
                        >
                          {STAGE_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="font-mono text-xs font-bold uppercase tracking-wider text-[#10201d] flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Deadline (Local Time)
                          </label>
                          {!stage.deadline && (
                            <span className="font-mono text-[10px] font-bold text-[#10201d] bg-[#e4e5da] px-1.5 py-0.5 border border-[#10201d]">
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
                          className="h-9 font-mono text-xs border-2 border-[#10201d] bg-[#f2f2eb] shadow-[2px_2px_0_#10201d]"
                        />
                      </div>
                    </div>

                    {/* Deliverables Tags */}
                    <div className="space-y-1.5 pt-1">
                      <label className="font-mono text-xs font-bold uppercase tracking-wider text-[#10201d] flex items-center gap-1">
                        <Tag className="h-3 w-3 text-[#34433f]" />
                        Key Deliverables Checklist
                      </label>
                      
                      <div className="flex flex-wrap gap-1.5 min-h-[28px] items-center">
                        {(stage.deliverables || []).map((deliv, dIdx) => (
                          <span 
                            key={dIdx} 
                            className="inline-flex items-center gap-1 font-mono text-xs font-bold px-2 py-1 border-2 border-[#10201d] bg-[#f2f2eb] text-[#10201d] shadow-[1px_1px_0_#10201d]"
                          >
                            <Check className="h-3 w-3 text-[#2e4742]" />
                            {deliv}
                            <button
                              type="button"
                              onClick={() => handleRemoveDeliverableTag(idx, deliv)}
                              className="text-[#e53927] hover:scale-110 ml-0.5 font-bold"
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
                          className="h-8 font-mono text-xs flex-1 border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddDeliverableTag(idx)}
                          className="h-8 font-mono text-xs font-bold px-2.5 border-2 border-[#10201d] bg-[#e97b77] hover:bg-[#f6c4c1] text-[#10201d] shadow-[2px_2px_0_#671912] shrink-0"
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
                <h3 className="font-display text-2xl font-bold tracking-tight text-[#10201d] flex items-center gap-1.5">
                  <FileText className="h-5 w-5 text-[#f5b726]" />
                  Attached Documents & Problem Statement Links ({resources.length})
                </h3>
                <p className="font-mono text-xs text-[#34433f] mt-0.5">
                  Official challenge briefs, guidelines, slide templates, datasets, or cloud links.
                </p>
              </div>

              {/* Extracted resources list */}
              <div className="space-y-2">
                {resources.map((res, rIdx) => (
                  <div 
                    key={rIdx} 
                    className="p-3 bg-white border-2 border-[#10201d] shadow-[3px_3px_0_#10201d] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {res.resource_type === 'dataset' ? (
                        <Database className="h-4 w-4 text-[#2e4742] shrink-0" />
                      ) : res.resource_type === 'rulebook' || res.resource_type === 'problem_statement' ? (
                        <FileText className="h-4 w-4 text-[#f5b726] shrink-0" />
                      ) : (
                        <Link2 className="h-4 w-4 text-[#34433f] shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-sm font-bold text-[#10201d] truncate">{res.title}</span>
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0 uppercase tracking-wider border-2 border-[#10201d] bg-[#f2f2eb] text-[#10201d] shrink-0">
                            {res.resource_type.replace('_', ' ')}
                          </span>
                        </div>
                        <a 
                          href={res.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="font-mono text-xs text-[#2e4742] hover:text-[#e53927] hover:underline flex items-center gap-1 truncate mt-0.5"
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
                      className="text-[#10201d] hover:bg-[#e97b77] hover:text-white border-2 border-transparent hover:border-[#10201d] h-7 w-7 shrink-0 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}

                {resources.length === 0 && (
                  <div className="p-3 border-2 border-dashed border-[#10201d] text-center font-mono text-xs text-[#34433f] bg-[#f2f2eb]">
                    No attached documents detected. You can add problem statement or guideline links below.
                  </div>
                )}
              </div>

              {/* Add custom resource link inputs */}
              <div className="p-3.5 bg-[#e4e5da] border-2 border-[#10201d] shadow-[3px_3px_0_#10201d] space-y-2">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#10201d] block">Add Resource Link</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    placeholder="Document Title (e.g. Problem Statement)"
                    value={newResourceTitle}
                    onChange={e => setNewResourceTitle(e.target.value)}
                    className="h-8 font-mono text-xs bg-white border-2 border-[#10201d] shadow-[2px_2px_0_#10201d]"
                  />
                  <Input
                    placeholder="URL (e.g. Google Drive, PDF)"
                    value={newResourceUrl}
                    onChange={e => setNewResourceUrl(e.target.value)}
                    className="h-8 font-mono text-xs bg-white border-2 border-[#10201d] shadow-[2px_2px_0_#10201d]"
                  />
                  <div className="flex gap-1.5">
                    <select
                      value={newResourceType}
                      onChange={e => setNewResourceType(e.target.value)}
                      className="h-8 px-2 border-2 border-[#10201d] bg-white font-mono text-xs shadow-[2px_2px_0_#10201d] flex-1 focus:outline-none focus:ring-0"
                    >
                      {RESOURCE_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddResource}
                      className="h-8 font-mono text-xs font-bold px-3 border-2 border-[#10201d] bg-[#f5b726] hover:bg-[#ffcf66] text-[#10201d] shadow-[2px_2px_0_#8a5d13] shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Participation Mode */}
            <div className="border-2 border-[#10201d] bg-[#f7f7f2] p-3 shadow-[3px_3px_0_#10201d] space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-[#2e4742]" />
                <span className="font-mono text-xs font-bold text-[#10201d] uppercase">
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
                  className={`flex items-center justify-center gap-2 p-2 border-2 border-[#10201d] text-xs font-mono font-bold transition-all ${
                    participationMode === 'solo'
                      ? 'bg-[#f5b726] text-[#10201d] shadow-[2px_2px_0_#10201d]'
                      : 'bg-white text-[#57726d] hover:bg-[#f2f2eb]'
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
                  className={`flex items-center justify-center gap-2 p-2 border-2 border-[#10201d] text-xs font-mono font-bold transition-all ${
                    participationMode === 'squad'
                      ? 'bg-[#8bb2de] text-[#10201d] shadow-[2px_2px_0_#10201d]'
                      : 'bg-white text-[#57726d] hover:bg-[#f2f2eb]'
                  }`}
                >
                  <span>👥 Squad Roster</span>
                </button>
              </div>

              {participationMode === 'squad' && (
                <div className="mt-2 space-y-2 pt-2 border-t-2 border-[#10201d]/20">
                  {userSquads.length === 0 ? (
                    <div className="font-mono text-xs text-[#e53927] p-2 bg-white border border-[#10201d]">
                      You haven't formed any squads yet. Head to "Squads & Friends" to create one, or proceed Solo!
                    </div>
                  ) : (
                    <>
                      <label className="block font-mono text-xs font-bold text-[#10201d]">
                        Select Squad to Enroll:
                      </label>
                      <select
                        value={selectedSquadId || ''}
                        onChange={(e) => setSelectedSquadId(e.target.value)}
                        className="w-full font-mono text-xs font-bold p-2 border-2 border-[#10201d] bg-white text-[#10201d]"
                      >
                        {userSquads.map((sq) => (
                          <option key={sq.id} value={sq.id}>
                            {sq.name} ({sq.member_count || 1} members)
                          </option>
                        ))}
                      </select>
                      <p className="font-mono text-[11px] text-[#57726d]">
                        All members of this squad will be automatically enrolled into this competition's board and countdown alert engine.
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
                className="flex-1 font-mono text-xs font-bold border-2 border-[#10201d] bg-[#f2f2eb] hover:bg-white text-[#10201d] shadow-[3px_3px_0_#10201d]"
              >
                Re-enter URL
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={submitting} 
                className="flex-[2] font-mono text-xs font-bold border-2 border-[#10201d] bg-[#e97b77] hover:bg-[#f6c4c1] text-[#10201d] shadow-[4px_4px_0_#671912]"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {submitting ? 'Creating Event...' : 'Confirm & Create Event'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
