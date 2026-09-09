'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Plus, Trash2, Calendar, AlertCircle, Sparkles, Check, Tag, FileText, Database, ExternalLink, Link2 } from 'lucide-react'
import { createEvent } from '@/app/actions/events'
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
  { value: 'template', label: 'Template / Deck' },
  { value: 'dataset', label: 'Dataset / API' },
  { value: 'reference', label: 'Reference / Docs' },
  { value: 'other', label: 'Other Link' },
]

export function URLParseDialog({ open, onOpenChange, initialUrl }: URLParseDialogProps) {
  const [url, setUrl] = useState(initialUrl || '')
  const [extracting, setExtracting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [extractError, setExtractError] = useState<string | null>(null)
  
  // Parsed Form State
  const [title, setTitle] = useState('')
  const [organizer, setOrganizer] = useState('')
  const [sourcePlatform, setSourcePlatform] = useState('custom')
  const [mode, setMode] = useState('online')
  const [location, setLocation] = useState('')
  const [prizePool, setPrizePool] = useState('')
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
  
  const [hasParsed, setHasParsed] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

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
        throw new Error(data.error || `HTTP ${res.status}: Failed to extract page details`)
      }

      // Populate parsed metadata
      setTitle(data.title || '')
      setOrganizer(data.organizer || '')
      setSourcePlatform(data.source_platform || 'custom')
      setMode(data.mode || 'online')
      setLocation(data.location || '')
      setPrizePool(data.prize_pool || '')
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
            evaluation_format: stg.evaluation_format || '',
            deliverables_description: stg.deliverables_description || '',
            deliverables: initialTags,
          }
        })
        setStages(mappedStages)
      } else {
        // Fallback single stage
        setStages([
          {
            round_number: 1,
            title: 'Round 1: Final Submission',
            stage_type: 'prototype',
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
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
      const message = err instanceof Error ? err.message : 'Failed to parse hackathon URL'
      setExtractError(message)
      toast({
        title: 'Parsing Failed',
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

    // Validate that all stages have deadlines
    for (const stg of stages) {
      if (!stg.deadline) {
        toast({
          title: 'Missing Deadline',
          description: `Please set a deadline for "${stg.title}".`,
          variant: 'destructive',
        })
        return
      }
    }

    setSubmitting(true)
    try {
      // Normalize dates to ISO string
      const preparedStages = stages.map(stg => {
        let isoDeadline = stg.deadline
        try {
          isoDeadline = new Date(stg.deadline).toISOString()
        } catch {
          // Keep as string
        }

        return {
          round_number: stg.round_number,
          title: stg.title,
          stage_type: stg.stage_type,
          deadline: isoDeadline,
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
        overview,
        team_size_min: Number(teamSizeMin) || 1,
        team_size_max: Number(teamSizeMax) || 4,
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Import Hackathon from URL</DialogTitle>
              <DialogDescription>
                AI parses rounds, gatekeeper deadlines, deliverable checklists, and prize pools.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Step 1: Input URL if not parsed yet */}
        {!hasParsed ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Hackathon or Competition URL</label>
              <div className="flex gap-2">
                <Input 
                  placeholder="e.g. https://unstop.com/hackathons/... or https://internshala.com/..." 
                  value={url} 
                  onChange={(e) => setUrl(e.target.value)} 
                  onKeyDown={(e) => e.key === 'Enter' && handleParse()}
                  disabled={extracting}
                  className="flex-1"
                />
                <Button onClick={() => handleParse()} disabled={extracting || !url.trim()} className="shrink-0 bg-blue-600 hover:bg-blue-700">
                  {extracting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {extracting ? 'Analyzing...' : 'Parse URL'}
                </Button>
              </div>
              <p className="text-xs text-slate-500">
                Supports Unstop, Internshala, Devpost, Devfolio, HackerEarth, and MLH competitions.
              </p>
            </div>

            {extractError && (
              <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex gap-2.5 items-start">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">Extraction Error</p>
                  <p className="text-xs text-red-600 mt-0.5">{extractError}</p>
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
                className="text-xs text-blue-600 hover:underline font-medium"
              >
                Or enter event details manually &rarr;
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Review and Edit Auto-Populated Cards */
          <div className="space-y-6 py-2">
            {/* Event Metadata */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Event Overview</span>
                <Badge variant="outline" className="capitalize bg-white text-blue-700 border-blue-200">
                  {sourcePlatform}
                </Badge>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700">Competition Title *</label>
                <Input 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="Hackathon Title"
                  className="bg-white font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Organizer</label>
                  <Input 
                    value={organizer} 
                    onChange={e => setOrganizer(e.target.value)} 
                    placeholder="e.g. Google, IIT"
                    className="bg-white text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Mode</label>
                  <select
                    value={mode}
                    onChange={e => setMode(e.target.value)}
                    className="w-full h-10 px-3 rounded-md border border-input bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="online">Online</option>
                    <option value="in-person">In-Person</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-700">Prize Pool</label>
                  <Input 
                    value={prizePool} 
                    onChange={e => setPrizePool(e.target.value)} 
                    placeholder="e.g. ₹5,00,000"
                    className="bg-white text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Stages Section (Auto-Populated as Editable Cards) */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    Sequential Stages & Deadlines ({stages.length})
                  </h4>
                  <p className="text-xs text-slate-500">
                    Extracted automatically. Customize dates, round formats, and deliverables below.
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAddStage}
                  className="text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Round
                </Button>
              </div>

              <div className="space-y-3">
                {stages.map((stage, idx) => (
                  <div 
                    key={idx} 
                    className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:border-slate-300 space-y-3"
                  >
                    {/* Stage Header */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <Badge variant="secondary" className="font-mono text-xs bg-slate-100 text-slate-700">
                          Round {stage.round_number}
                        </Badge>
                        <Input 
                          value={stage.title} 
                          onChange={e => {
                            const newStages = [...stages]
                            newStages[idx].title = e.target.value
                            setStages(newStages)
                          }}
                          placeholder="Stage Title"
                          className="font-medium text-sm flex-1 h-9"
                        />
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleRemoveStage(idx)}
                        className="text-slate-400 hover:text-red-600 h-8 w-8 shrink-0"
                        title="Delete this stage"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Stage Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Evaluation Format</label>
                        <select
                          value={stage.stage_type}
                          onChange={e => {
                            const newStages = [...stages]
                            newStages[idx].stage_type = e.target.value
                            setStages(newStages)
                          }}
                          className="w-full h-9 px-3 rounded-md border border-slate-200 bg-slate-50 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {STAGE_TYPES.map(type => (
                            <option key={type.value} value={type.value}>{type.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Deadline (Local Time) *
                        </label>
                        <Input 
                          type="datetime-local" 
                          value={stage.deadline} 
                          onChange={e => {
                            const newStages = [...stages]
                            newStages[idx].deadline = e.target.value
                            setStages(newStages)
                          }}
                          className="h-9 text-xs bg-slate-50"
                        />
                      </div>
                    </div>

                    {/* Deliverables Tags */}
                    <div className="space-y-1.5 pt-1">
                      <label className="text-xs font-medium text-slate-600 flex items-center gap-1">
                        <Tag className="h-3 w-3 text-slate-400" />
                        Key Deliverables Checklist
                      </label>
                      
                      <div className="flex flex-wrap gap-1.5 min-h-[28px] items-center">
                        {(stage.deliverables || []).map((deliv, dIdx) => (
                          <span 
                            key={dIdx} 
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-100"
                          >
                            <Check className="h-3 w-3 text-blue-500" />
                            {deliv}
                            <button
                              type="button"
                              onClick={() => handleRemoveDeliverableTag(idx, deliv)}
                              className="text-blue-400 hover:text-blue-700 ml-0.5"
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
                          className="h-8 text-xs flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddDeliverableTag(idx)}
                          className="h-8 text-xs px-2.5 shrink-0"
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
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-blue-600" />
                    Attached Documents & Problem Statement Links ({resources.length})
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Official challenge briefs, guidelines, slide templates, datasets, or cloud links.
                  </p>
                </div>
              </div>

              {/* Extracted resources list */}
              <div className="space-y-2">
                {resources.map((res, rIdx) => (
                  <div 
                    key={rIdx} 
                    className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {res.resource_type === 'dataset' ? (
                        <Database className="h-4 w-4 text-indigo-500 shrink-0" />
                      ) : res.resource_type === 'rulebook' || res.resource_type === 'problem_statement' ? (
                        <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                      ) : (
                        <Link2 className="h-4 w-4 text-slate-500 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800 truncate">{res.title}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize bg-slate-50 text-slate-600 shrink-0">
                            {res.resource_type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <a 
                          href={res.url} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-blue-600 hover:underline flex items-center gap-1 truncate mt-0.5"
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
                      className="text-slate-400 hover:text-red-600 h-7 w-7 shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}

                {resources.length === 0 && (
                  <div className="p-3 rounded-lg border border-dashed border-slate-200 text-center text-xs text-slate-400">
                    No attached documents detected. You can add problem statement or guideline links below.
                  </div>
                )}
              </div>

              {/* Add custom resource link inputs */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2">
                <span className="text-xs font-medium text-slate-700 block">Add Resource Link</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Input
                    placeholder="Document Title (e.g. Problem Statement)"
                    value={newResourceTitle}
                    onChange={e => setNewResourceTitle(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                  <Input
                    placeholder="URL (e.g. Google Drive, PDF)"
                    value={newResourceUrl}
                    onChange={e => setNewResourceUrl(e.target.value)}
                    className="h-8 text-xs bg-white"
                  />
                  <div className="flex gap-1.5">
                    <select
                      value={newResourceType}
                      onChange={e => setNewResourceType(e.target.value)}
                      className="h-8 px-2 rounded-md border border-slate-200 bg-white text-xs flex-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    >
                      {RESOURCE_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddResource}
                      className="h-8 text-xs px-3 bg-slate-800 hover:bg-slate-900 text-white shrink-0"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setHasParsed(false)} 
                disabled={submitting} 
                className="flex-1"
              >
                Re-enter URL
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={submitting} 
                className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-medium"
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
