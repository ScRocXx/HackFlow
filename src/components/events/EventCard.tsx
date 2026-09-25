'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Users, 
  MapPin, 
  Globe, 
  FileText, 
  Database, 
  ExternalLink, 
  Calendar,
  Edit3,
  Trash2,
  AlertTriangle
} from 'lucide-react'
import { StatusPills } from '@/components/events/StatusPills'
import { CountdownTimer } from '@/components/events/CountdownTimer'
import { EditEventDialog } from '@/components/events/EditEventDialog'
import { ensureExternalUrl } from '@/lib/utils/url'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { deleteEvent } from '@/app/actions/events'
import type { Event, EventStage, EventResource } from '@/lib/supabase/types'

type ExtendedEvent = Event & {
  active_stage?: EventStage
  stages?: EventStage[]
  deliverable_progress?: { done: number; total: number }
  team_count?: number
  resources?: EventResource[]
  squad_name?: string | null
}

interface EventCardProps {
  event: ExtendedEvent
}

export function EventCard({ event }: EventCardProps) {
  const router = useRouter()
  const { toast } = useToast()

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const progressPercent = event.deliverable_progress?.total 
    ? (event.deliverable_progress.done / event.deliverable_progress.total) * 100 
    : 0

  const getPlatformBadge = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case 'unstop':
        return {
          className: 'bg-[#ff9800] text-[#10201d] border-[#10201d]',
          label: 'Unstop'
        }
      case 'devfolio':
        return {
          className: 'bg-[#3770ff] text-[#f7f7f2] border-[#10201d]',
          label: 'Devfolio'
        }
      case 'devpost':
        return {
          className: 'bg-[#0086bf] text-[#f7f7f2] border-[#10201d]',
          label: 'Devpost'
        }
      case 'mlh':
        return {
          className: 'bg-[#e53927] text-[#f7f7f2] border-[#10201d]',
          label: 'MLH'
        }
      case 'hackerearth':
        return {
          className: 'bg-[#2c3454] text-[#29c5b6] border-[#10201d]',
          label: 'HackerEarth'
        }
      case 'kaggle':
        return {
          className: 'bg-[#20beff] text-[#10201d] border-[#10201d]',
          label: 'Kaggle'
        }
      case 'internshala':
        return {
          className: 'bg-[#8bb2de] text-[#10201d] border-[#10201d]',
          label: 'Internshala'
        }
      default:
        return {
          className: 'bg-[#f7f7f2] text-[#10201d] border-[#10201d]',
          label: platform || 'Hackathon'
        }
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDeleting(true)

    try {
      const res = await deleteEvent(event.id)
      if (!res.success) {
        throw new Error(res.error || 'Failed to delete hackathon')
      }

      toast({
        title: 'Hackathon Deleted',
        description: `"${event.title}" has been permanently removed.`,
      })
      setDeleteOpen(false)
      router.refresh()
    } catch (err: any) {
      console.error('Delete error:', err)
      toast({
        title: 'Delete Failed',
        description: err.message || 'Could not delete event.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const platformBadge = getPlatformBadge(event.source_platform || 'other')
  const prizeDisplay = event.prize_display_summary || event.prize_pool

  // Dynamic Stage Auto-Roll: if active stage cutoff has passed, roll forward to next upcoming stage
  const computedActiveStage = (() => {
    if (!event.stages || event.stages.length === 0) return event.active_stage
    const now = Date.now()

    if (event.active_stage) {
      const activeDlStr = event.active_stage.actionable_deadline || event.active_stage.window_end || event.active_stage.deadline
      if (activeDlStr) {
        const activeDl = new Date(activeDlStr).getTime()
        if (!isNaN(activeDl) && activeDl > now) {
          return event.active_stage
        }
      }
    }

    const upcoming = event.stages
      .filter((s) => {
        const dlStr = s.actionable_deadline || s.window_end || s.deadline
        if (!dlStr) return false
        const dl = new Date(dlStr).getTime()
        return !isNaN(dl) && dl > now
      })
      .sort((a, b) => {
        const dlA = new Date(a.actionable_deadline || a.window_end || a.deadline || 0).getTime()
        const dlB = new Date(b.actionable_deadline || b.window_end || b.deadline || 0).getTime()
        return dlA - dlB
      })

    if (upcoming.length > 0) return upcoming[0]
    return event.active_stage || event.stages[event.stages.length - 1]
  })()

  return (
    <>
      <div className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[6px_6px_0_#671912] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#671912] transition-all flex flex-col group h-full overflow-hidden relative">
        <Link 
          href={`/events/${event.id}`}
          prefetch={true}
          className="flex flex-col h-full flex-1"
        >
          {/* Banner Container */}
          <div className="h-28 sm:h-32 w-full relative bg-[#2e4742] border-b-2 border-[#10201d] overflow-hidden">
            {event.banner_url ? (
              <img src={event.banner_url} alt={event.title} className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-[#3d5f58] flex items-center justify-center p-4">
                <span className="font-display text-2xl font-extrabold text-[#f7f7f2]/30 tracking-wider uppercase">
                  {platformBadge.label}
                </span>
              </div>
            )}

            {/* Badges on Top Left */}
            <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 flex gap-1.5 flex-wrap max-w-[70%] z-10">
              <span className={`inline-flex items-center px-2 py-0.5 border-2 font-mono text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0_#10201d] ${platformBadge.className}`}>
                {platformBadge.label}
              </span>
              {event.squad_name && (
                <span className="inline-flex items-center px-2 py-0.5 border-2 border-[#10201d] bg-[#f5b726] text-[#10201d] font-mono text-[10px] font-bold uppercase tracking-wider shadow-[2px_2px_0_#10201d]">
                  👥 {event.squad_name}
                </span>
              )}
              {event.mode && (
                <span className="inline-flex items-center px-2 py-0.5 border-2 border-[#10201d] bg-[#f7f7f2] text-[#10201d] font-mono text-[10px] font-bold uppercase tracking-wider shadow-[2px_2px_0_#10201d]">
                  {event.mode === 'in-person' ? <MapPin className="w-3 h-3 mr-1" /> : <Globe className="w-3 h-3 mr-1" />}
                  <span className="capitalize">{event.mode}</span>
                </span>
              )}
              {prizeDisplay && (
                <span className="inline-flex items-center px-2 py-0.5 border-2 border-[#10201d] bg-[#8bb2de] text-[#10201d] font-mono text-[10px] font-bold uppercase tracking-wider shadow-[2px_2px_0_#10201d] truncate max-w-[170px]">
                  🏆 {prizeDisplay}
                </span>
              )}
            </div>

            {/* Edit & Delete Action Buttons (Top Right) */}
            <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 flex items-center gap-1.5 z-20">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setEditOpen(true)
                }}
                title="Edit Hackathon"
                className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center border-2 border-[#10201d] bg-[#f7f7f2] hover:bg-[#f5b726] active:scale-90 text-[#10201d] shadow-[2px_2px_0_#10201d] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none touch-manipulation"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span className="sr-only">Edit</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setDeleteOpen(true)
                }}
                title="Delete Hackathon"
                className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center border-2 border-[#10201d] bg-[#f7f7f2] hover:bg-[#e53927] hover:text-[#f7f7f2] active:scale-90 text-[#10201d] shadow-[2px_2px_0_#10201d] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none touch-manipulation"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="sr-only">Delete</span>
              </button>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-3.5 sm:p-5 flex-1 flex flex-col">
            <div className="mb-3 sm:mb-4">
              <h3 className="font-display text-lg sm:text-xl font-bold text-[#10201d] line-clamp-1 group-hover:text-[#e53927] transition-colors">
                {event.title}
              </h3>
              <p className="font-mono text-xs text-[#34433f] line-clamp-1 mt-0.5">
                {event.organizer || 'Independent Hackathon'}
              </p>
            </div>

            {/* Active Stage & Countdown (Auto-Rolled) */}
            {computedActiveStage ? (
              <div className="mb-4 p-3 border-2 border-[#10201d] bg-[#f2f2eb] shadow-[3px_3px_0_#2e4742]">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 bg-[#e53927] inline-block shrink-0" />
                    <span className="font-mono text-xs font-bold text-[#10201d] truncate uppercase">
                      {computedActiveStage.title}
                    </span>
                  </div>
                  {computedActiveStage.raw_date_snippet && (
                    <span className="font-mono text-[10px] text-[#34433f] font-semibold flex items-center gap-1 shrink-0">
                      <Calendar className="w-3 h-3" />
                      {computedActiveStage.raw_date_snippet}
                    </span>
                  )}
                </div>
                <CountdownTimer 
                  deadline={computedActiveStage.actionable_deadline || computedActiveStage.deadline || ''} 
                  windowStart={computedActiveStage.window_start}
                  windowEnd={computedActiveStage.window_end}
                  showMilestoneLabel={true}
                  showTimezoneBadge={true}
                  className="text-xs" 
                />
              </div>
            ) : (
              <div className="mb-4 p-3 border-2 border-[#10201d] bg-[#e4e5da] flex items-center justify-center font-mono text-[#34433f] text-xs font-bold h-[76px]">
                No active stage
              </div>
            )}

            {/* Progress & Team Count */}
            <div className="mt-auto">
              <div className="flex justify-between items-center font-mono text-xs font-bold text-[#34433f] mb-2">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> {event.team_count || 1} members
                </span>
                <span>{event.deliverable_progress?.done || 0}/{event.deliverable_progress?.total || 0} tasks</span>
              </div>
              <div className="w-full h-2 border border-[#10201d] bg-[#e4e5da] overflow-hidden">
                <div 
                  className="h-full bg-[#e97b77] transition-all" 
                  style={{ width: `${progressPercent}%` }} 
                />
              </div>
            </div>
          </div>
        </Link>

        {/* Resource Badges */}
        {event.resources && event.resources.length > 0 && (
          <div className="px-5 pb-3 flex flex-wrap gap-1.5 z-20 relative border-t border-[#10201d]/20 pt-2.5">
            {event.resources.slice(0, 3).map((res) => (
              <a
                key={res.id}
                href={ensureExternalUrl(res.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 border border-[#10201d] bg-[#f7f7f2] hover:bg-[#8bb2de] text-[#10201d] transition-colors max-w-[180px]"
                title={res.title}
              >
                {res.resource_type === 'dataset' ? (
                  <Database className="w-3 h-3 text-[#10201d] shrink-0" />
                ) : (
                  <FileText className="w-3 h-3 text-[#10201d] shrink-0" />
                )}
                <span className="truncate">{res.title}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
              </a>
            ))}
            {event.resources.length > 3 && (
              <span className="font-mono text-[10px] text-[#34433f] font-bold self-center">
                +{event.resources.length - 3}
              </span>
            )}
          </div>
        )}
        
        {/* Status Pills */}
        <div className="px-4 py-3 bg-[#f7f7f2] border-t-2 border-[#10201d] relative z-10">
          <StatusPills 
            eventId={event.id} 
            currentStatus={event.status || 'bookmarked'} 
          />
        </div>
      </div>

      {/* Edit Dialog */}
      {editOpen && (
        <EditEventDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          event={event}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {deleteOpen && (
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="max-w-md border-2 border-[#10201d] bg-[#f7f7f2] p-6 shadow-[8px_8px_0_#671912]">
            <DialogHeader>
              <div className="flex items-center gap-2 text-[#e53927]">
                <AlertTriangle className="w-5 h-5" />
                <DialogTitle className="font-display text-xl font-black uppercase text-[#10201d]">
                  Delete Hackathon?
                </DialogTitle>
              </div>
              <DialogDescription className="font-mono text-xs text-[#34433f] mt-2">
                Are you sure you want to permanently delete <strong className="text-[#10201d] font-bold">"{event.title}"</strong>? All associated rounds, checklist tasks, and resources will be removed. This cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t-2 border-[#10201d] mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteOpen(false)}
                disabled={isDeleting}
                className="w-full sm:w-auto font-mono text-xs border-2 border-[#10201d]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full sm:w-auto font-mono text-xs bg-[#e53927] hover:bg-[#b02213] text-[#f7f7f2] border-2 border-[#10201d] shadow-[3px_3px_0_#10201d] font-bold"
              >
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
