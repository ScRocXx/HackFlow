'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { updateEvent } from '@/app/actions/events'
import type { Event, EventStage } from '@/lib/supabase/types'
import { Plus, Trash2, Trophy, Layers, Save } from 'lucide-react'

interface EditableStage {
  id?: string
  round_number: number
  title: string
  stage_type: string
  deadline: string // Local YYYY-MM-DDTHH:mm or empty
  window_start: string // Local YYYY-MM-DDTHH:mm or empty
  window_end: string // Local YYYY-MM-DDTHH:mm or empty
  raw_date_snippet: string
  deliverables_description: string
}

interface EditEventDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: Event & {
    stages?: EventStage[]
    active_stage?: EventStage | null
  }
  onSuccess?: () => void
}

function toLocalDTString(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== 'string' || dateStr.trim() === '' || dateStr === 'null') return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime()) || d.getFullYear() < 2000) return ''
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return ''
  }
}

function toISOStringOrNull(dtLocal?: string): string | null {
  if (!dtLocal || !dtLocal.trim()) return null
  try {
    const d = new Date(dtLocal)
    if (isNaN(d.getTime()) || d.getFullYear() < 2000) return null
    return d.toISOString()
  } catch {
    return null
  }
}

export function EditEventDialog({ open, onOpenChange, event, onSuccess }: EditEventDialogProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState(event.title || '')
  const [organizer, setOrganizer] = useState(event.organizer || '')
  const [mode, setMode] = useState<'online' | 'in-person' | 'hybrid'>(
    (event.mode as any) || 'online'
  )
  const [location, setLocation] = useState(event.location || '')
  const [prizePool, setPrizePool] = useState(event.prize_display_summary || event.prize_pool || '')
  const [status, setStatus] = useState<string>(event.status || 'registered')
  const [overview, setOverview] = useState(event.overview || '')
  const [stages, setStages] = useState<EditableStage[]>([])

  // Initialize or re-sync when event or open state changes
  useEffect(() => {
    if (!open) return

    setTitle(event.title || '')
    setOrganizer(event.organizer || '')
    setMode((event.mode as any) || 'online')
    setLocation(event.location || '')
    setPrizePool(event.prize_display_summary || event.prize_pool || '')
    setStatus(event.status || 'registered')
    setOverview(event.overview || '')

    const rawStages = (event.stages && event.stages.length > 0)
      ? event.stages
      : (event.active_stage ? [event.active_stage] : [])

    if (rawStages.length > 0) {
      setStages(rawStages.map((s, idx) => ({
        id: s.id,
        round_number: s.round_number || idx + 1,
        title: s.title || `Round ${idx + 1}`,
        stage_type: s.stage_type || 'other',
        deadline: toLocalDTString(s.deadline),
        window_start: toLocalDTString(s.window_start),
        window_end: toLocalDTString(s.window_end),
        raw_date_snippet: s.raw_date_snippet || '',
        deliverables_description: s.deliverables_description || '',
      })))
    } else {
      setStages([
        {
          round_number: 1,
          title: 'Round 1: Final Submission',
          stage_type: 'prototype',
          deadline: '',
          window_start: '',
          window_end: '',
          raw_date_snippet: 'TBA',
          deliverables_description: '',
        }
      ])
    }
  }, [open, event])

  const handleAddStage = () => {
    const nextRoundNum = stages.length > 0 
      ? Math.max(...stages.map(s => s.round_number)) + 1 
      : 1
    setStages([
      ...stages,
      {
        round_number: nextRoundNum,
        title: `Round ${nextRoundNum}: Submission`,
        stage_type: 'prototype',
        deadline: '',
        window_start: '',
        window_end: '',
        raw_date_snippet: 'TBA',
        deliverables_description: '',
      }
    ])
  }

  const handleRemoveStage = (index: number) => {
    if (stages.length <= 1) {
      toast({
        title: 'Cannot remove all stages',
        description: 'Every hackathon must have at least one stage or timeline entry.',
        variant: 'destructive',
      })
      return
    }
    const updated = stages.filter((_, idx) => idx !== index)
    // Re-index round numbers cleanly
    const reindexed = updated.map((stg, idx) => ({
      ...stg,
      round_number: idx + 1,
    }))
    setStages(reindexed)
  }

  const handleUpdateStage = (index: number, updates: Partial<EditableStage>) => {
    setStages(stages.map((stg, idx) => idx === index ? { ...stg, ...updates } : stg))
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a name for this hackathon.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const mappedStages = stages.map((stg) => {
        const isoDeadline = toISOStringOrNull(stg.deadline)
        const isoStart = toISOStringOrNull(stg.window_start)
        const isoEnd = toISOStringOrNull(stg.window_end) || isoDeadline

        return {
          id: stg.id,
          round_number: stg.round_number,
          title: stg.title.trim() || `Round ${stg.round_number}`,
          stage_type: stg.stage_type || 'other',
          deadline: isoDeadline,
          window_start: isoStart,
          window_end: isoDeadline,
          actionable_deadline: isoDeadline,
          raw_date_snippet: stg.raw_date_snippet?.trim() || (!isoDeadline ? 'TBA' : null),
          deliverables_description: stg.deliverables_description,
        }
      })

      const res = await updateEvent({
        eventId: event.id,
        title: title.trim(),
        organizer: organizer.trim(),
        mode,
        location: location.trim(),
        prize_pool: prizePool.trim(),
        prize_display_summary: prizePool.trim(),
        status,
        overview: overview.trim(),
        stages: mappedStages,
      })

      if (!res.success) {
        throw new Error(res.error || 'Failed to update hackathon')
      }

      toast({
        title: 'Hackathon Updated',
        description: 'Your changes have been saved successfully.',
      })

      onOpenChange(false)
      onSuccess?.()
      router.refresh()
    } catch (err: any) {
      console.error('Update hackathon error:', err)
      toast({
        title: 'Update Failed',
        description: err.message || 'Could not save changes.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl border border-hack-ink/20 bg-hack-sand p-5 sm:p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-hack-coral/15 text-hack-coral-dark">
              <Trophy className="w-5 h-5" />
            </div>
            <DialogTitle className="font-sans text-xl sm:text-2xl font-bold text-hack-ink tracking-tight">
              Edit Hackathon
            </DialogTitle>
          </div>
          <DialogDescription className="font-mono text-xs text-hack-subtext mt-1">
            Update details, customize stages and deadlines, or mark dates as TBA.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 my-2">
          {/* Section: Basic Metadata */}
          <div className="rounded-xl border border-hack-ink/15 p-4 sm:p-5 bg-hack-panel shadow-sm space-y-4">
            <div className="font-mono text-xs font-semibold uppercase tracking-wider text-hack-ink pb-2 border-b border-hack-ink/10 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-hack-coral-dark" />
              Event Overview
            </div>

            <div>
              <label className="block font-mono text-xs font-semibold text-hack-ink mb-1 uppercase">
                Hackathon Title *
              </label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. HackMIT 2026"
                className="font-sans font-bold text-sm rounded-lg border border-hack-ink/20 bg-white focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-mono text-xs font-semibold text-hack-ink mb-1 uppercase">
                  Organizer / Host
                </label>
                <Input
                  value={organizer}
                  onChange={(e) => setOrganizer(e.target.value)}
                  placeholder="e.g. MIT Tech Club"
                  className="font-mono text-xs rounded-lg border border-hack-ink/20 bg-white focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                />
              </div>

              <div>
                <label className="block font-mono text-xs font-semibold text-hack-ink mb-1 uppercase">
                  Prize Pool / Summary
                </label>
                <Input
                  value={prizePool}
                  onChange={(e) => setPrizePool(e.target.value)}
                  placeholder="e.g. $50,000 or ₹2,50,000"
                  className="font-mono text-xs rounded-lg border border-hack-ink/20 bg-white focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-mono text-xs font-semibold text-hack-ink mb-1 uppercase">
                  Event Mode
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-lg border border-hack-ink/20 bg-white font-mono text-xs focus:outline-none focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                >
                  <option value="online">Online / Virtual</option>
                  <option value="in-person">In-Person</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>

              <div>
                <label className="block font-mono text-xs font-semibold text-hack-ink mb-1 uppercase">
                  Location / Venue
                </label>
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Bengaluru / Boston"
                  className="font-mono text-xs rounded-lg border border-hack-ink/20 bg-white focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                />
              </div>

              <div>
                <label className="block font-mono text-xs font-semibold text-hack-ink mb-1 uppercase">
                  Lifecycle Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-hack-ink/20 bg-white font-mono text-xs focus:outline-none focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                >
                  <option value="bookmarked">Bookmarked</option>
                  <option value="registered">Registered</option>
                  <option value="building">Building</option>
                  <option value="submitted">Submitted</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section: Timeline & Stages */}
          <div className="rounded-xl border border-hack-ink/15 p-4 sm:p-5 bg-hack-panel shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-hack-ink/10">
              <div className="font-mono text-xs font-semibold uppercase tracking-wider text-hack-ink flex items-center gap-2">
                <Layers className="w-4 h-4 text-hack-coral-dark" />
                Rounds & Deadlines ({stages.length})
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddStage}
                className="h-8 text-xs font-sans font-semibold rounded-lg bg-white hover:bg-hack-sand border border-hack-ink/20 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Round
              </Button>
            </div>

            <div className="space-y-3">
              {stages.map((stage, idx) => (
                <div 
                  key={stage.id || `stage-${idx}`}
                  className="rounded-xl border border-hack-ink/15 bg-hack-sand/30 p-3.5 shadow-sm space-y-3 relative group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded border border-hack-ink/20 bg-hack-ink text-hack-panel">
                        Round {stage.round_number}
                      </span>
                      <select
                        value={stage.stage_type}
                        onChange={(e) => handleUpdateStage(idx, { stage_type: e.target.value })}
                        className="h-7 px-2 rounded-md border border-hack-ink/20 bg-white font-mono text-[11px] font-medium focus:outline-none focus:border-hack-coral"
                      >
                        <option value="prototype">Prototype / Build</option>
                        <option value="ppt_submission">Idea / PPT</option>
                        <option value="quiz">Online Quiz / Assessment</option>
                        <option value="presentation">Presentation / Pitch</option>
                        <option value="other">General Submission</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveStage(idx)}
                      disabled={stages.length <= 1}
                      title="Remove this round"
                      aria-label="Remove this round"
                      className="p-1 rounded text-hack-subtext hover:bg-hack-coral/15 hover:text-hack-coral-dark disabled:opacity-30 disabled:pointer-events-none transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-mono text-[10px] font-semibold text-hack-ink mb-0.5 uppercase">
                        Round Title
                      </label>
                      <Input
                        value={stage.title}
                        onChange={(e) => handleUpdateStage(idx, { title: e.target.value })}
                        placeholder="e.g. Round 1: Online Quiz"
                        className="h-8 text-xs font-bold rounded-md border border-hack-ink/20 bg-white focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-0.5">
                        <label className="block font-mono text-[10px] font-semibold text-hack-ink uppercase">
                          Cutoff / Deadline
                        </label>
                        {stage.deadline ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateStage(idx, { deadline: '', raw_date_snippet: 'TBA' })}
                            className="font-mono text-[10px] text-hack-coral-dark hover:underline font-semibold"
                          >
                            Clear (TBA)
                          </button>
                        ) : (
                          <span className="font-mono text-[10px] text-[#8A5D13] font-semibold">Dates TBA</span>
                        )}
                      </div>
                      <Input
                        type="datetime-local"
                        value={stage.deadline}
                        onChange={(e) => handleUpdateStage(idx, { 
                          deadline: e.target.value,
                          raw_date_snippet: e.target.value ? '' : 'TBA' 
                        })}
                        className="h-8 font-mono text-xs rounded-md border border-hack-ink/20 bg-white focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-hack-ink/10">
                    <div>
                      <label className="block font-mono text-[10px] font-medium text-hack-subtext mb-0.5 uppercase">
                        Kickoff Window (Optional)
                      </label>
                      <Input
                        type="datetime-local"
                        value={stage.window_start}
                        onChange={(e) => handleUpdateStage(idx, { window_start: e.target.value })}
                        className="h-8 font-mono text-xs rounded-md border border-hack-ink/15 bg-white focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                      />
                    </div>

                    <div>
                      <label className="block font-mono text-[10px] font-medium text-hack-subtext mb-0.5 uppercase">
                        Display Date Note / Snippet
                      </label>
                      <Input
                        value={stage.raw_date_snippet}
                        onChange={(e) => handleUpdateStage(idx, { raw_date_snippet: e.target.value })}
                        placeholder="e.g. 24–28 Oct or TBA"
                        className="h-8 font-mono text-xs rounded-md border border-hack-ink/15 bg-white focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2.5 pt-3 border-t border-hack-ink/10">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="w-full sm:w-auto font-sans text-xs font-semibold rounded-lg border border-hack-ink/20 bg-white hover:bg-hack-sand"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full sm:w-auto font-sans text-xs font-bold rounded-lg bg-hack-coral hover:bg-hack-coral/90 text-hack-ink shadow-hack-hero active:translate-y-0.5 transition-all"
          >
            {saving ? (
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 border-2 border-hack-ink border-t-transparent rounded-full animate-spin" />
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Save className="w-4 h-4" /> Save Changes
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
