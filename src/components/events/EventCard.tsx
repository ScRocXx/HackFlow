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
  AlertTriangle,
  MoreHorizontal
} from 'lucide-react'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
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
import type { EventResource, EventWithRelations } from '@/lib/supabase/types'
import { computeActiveStage } from '@/lib/utils/active-stage'
import { getPlatformBadge } from '@/lib/utils/platform'

type ExtendedEvent = EventWithRelations & {
  team_count?: number
  resources?: EventResource[]
  squad_name?: string | null
}

interface EventCardProps {
  event: ExtendedEvent
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'registered':
      return { label: 'Registered', className: 'bg-hack-blue/15 border-hack-blue/40 text-hack-blue-dark' }
    case 'building':
      return { label: 'Building', className: 'bg-hack-coral/15 border-hack-coral/40 text-hack-coral-dark' }
    case 'submitted':
      return { label: 'Submitted', className: 'bg-hack-mint/20 border-hack-mint/50 text-hack-mint-dark' }
    case 'under_review':
      return { label: 'Under Review', className: 'bg-hack-gold/20 border-hack-gold/40 text-hack-gold-dark' }
    case 'finalist':
      return { label: 'Finalist ⭐', className: 'bg-hack-coral/20 border-hack-coral/50 text-hack-coral-dark' }
    case 'winner':
      return { label: 'Winner 🏆', className: 'bg-hack-gold/25 border-hack-gold text-hack-gold-dark' }
    case 'runner_up':
      return { label: 'Runner Up 🥈', className: 'bg-hack-surface border-hack-muted text-hack-subtext' }
    case 'bookmarked':
    default:
      return { label: 'Bookmarked', className: 'bg-hack-sand border-hack-muted/60 text-hack-subtext' }
  }
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
  const statusBadge = getStatusBadge(event.status || 'bookmarked')
  const prizeDisplay = event.prize_display_summary || event.prize_pool

  // Unified stage computation: consistent with workspace and dashboard
  const computedActiveStage = computeActiveStage(event.stages, event.active_stage_id || event.active_stage?.id)

  return (
    <>
      <div className="card-pass flex flex-col group h-full overflow-hidden relative">
        <Link 
          href={`/events/${event.id}`}
          prefetch={true}
          className="flex flex-col h-full flex-1 p-4 sm:p-5"
        >
          {/* Card Top Header: Platform badge, status badge, mode, and overflow menu */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-[4px] border font-mono text-[10px] font-bold uppercase tracking-wider",
                platformBadge.className
              )}>
                {platformBadge.label}
              </span>
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-[4px] border font-mono text-[10px] font-bold uppercase tracking-wider",
                statusBadge.className
              )}>
                {event.status === 'building' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-hack-coral animate-ping inline-block mr-1" />
                )}
                {statusBadge.label}
              </span>
              {event.mode && (
                <span className="inline-flex items-center font-mono text-[10px] font-medium text-hack-subtext uppercase px-1.5 py-0.5 rounded-[4px] bg-hack-sand border border-hack-muted/40">
                  {event.mode === 'in-person' ? <MapPin className="w-3 h-3 mr-0.5" /> : <Globe className="w-3 h-3 mr-0.5" />}
                  {event.mode}
                </span>
              )}
              {event.squad_name && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] border border-hack-gold/40 bg-hack-gold/15 text-hack-gold-dark font-mono text-[10px] font-semibold">
                  👥 {event.squad_name}
                </span>
              )}
            </div>

            {/* Overflow Options Menu */}
            <div className="shrink-0" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    title="Hackathon options"
                    aria-label="Hackathon options"
                    className="p-1 min-w-[28px] min-h-[28px] rounded-lg flex items-center justify-center border border-hack-muted/50 bg-hack-surface hover:bg-hack-sand active:scale-95 text-hack-subtext hover:text-hack-ink transition-all touch-manipulation"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                    <span className="sr-only">Options</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="border border-hack-muted/60 bg-hack-surface rounded-xl shadow-hack-dialog font-mono text-xs w-44 p-1.5">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditOpen(true)
                    }}
                    className="cursor-pointer font-semibold text-hack-ink hover:bg-hack-sand rounded-lg px-2.5 py-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-2 text-hack-subtext" /> Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteOpen(true)
                    }}
                    className="cursor-pointer font-semibold text-hack-red hover:bg-hack-red/10 rounded-lg px-2.5 py-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2 text-hack-red" /> Delete Hackathon
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Card Body: Title, Organizer, Prize */}
          <div className="mb-2">
            <h3 className="font-display text-lg sm:text-xl font-bold text-hack-ink line-clamp-2 min-h-[3.25rem] break-words group-hover:text-hack-coral-dark transition-colors" title={event.title}>
              {event.title}
            </h3>
            <div className="flex items-center justify-between gap-2 mt-0.5 min-h-[1.5rem]">
              <p className="font-mono text-xs text-hack-subtext truncate">
                {event.organizer || 'Independent Hackathon'}
              </p>
              {prizeDisplay && (
                <span className="font-mono text-[10px] font-semibold text-hack-gold-dark truncate">
                  🏆 {prizeDisplay}
                </span>
              )}
            </div>
          </div>

          {/* Recessed Dark-Instrument Digital Timer Bay (.timer-oled-bay) */}
          {computedActiveStage ? (
            <div className="timer-oled-bay p-3 min-h-[92px] flex flex-col justify-center space-y-1.5 my-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-hack-gold inline-block shrink-0 shadow-[0_0_8px_#f5b726]" />
                  <span className="font-mono text-xs font-bold text-hack-gold truncate">
                    {computedActiveStage.title}
                  </span>
                </div>
                {computedActiveStage.raw_date_snippet && (
                  <span className="font-mono text-[10px] text-[#F7F7F2]/60 font-medium flex items-center gap-1 shrink-0">
                    <Calendar className="w-3 h-3 text-hack-gold/70" />
                    {computedActiveStage.raw_date_snippet}
                  </span>
                )}
              </div>
              <CountdownTimer 
                deadline={computedActiveStage.actionable_deadline || computedActiveStage.deadline || ''} 
                windowStart={computedActiveStage.window_start}
                windowEnd={computedActiveStage.window_end}
                showMilestoneLabel={false}
                showTimezoneBadge={false}
                className="text-xs bg-transparent border-0 text-[#F7F7F2] p-0 shadow-none font-mono" 
              />
            </div>
          ) : (
            <div className="p-3 rounded-[4px] border border-hack-muted/60 bg-hack-sand/40 flex items-center justify-center font-mono text-hack-subtext text-xs font-medium min-h-[92px] my-2">
              All clear.
            </div>
          )}

          {/* Perforated Ticket Divider with circular notch punch-outs */}
          <div className="relative my-2">
            <div className="border-t-2 border-dashed border-hack-ink/20 w-full" />
            <div className="w-3 h-3 rounded-full bg-hack-sand border border-hack-ink/20 absolute -top-1.5 -left-6" />
            <div className="w-3 h-3 rounded-full bg-hack-sand border border-hack-ink/20 absolute -top-1.5 -right-6" />
          </div>

          {/* Ticket Stub Footer: Progress & Tactile Action Button */}
          <div className="mt-auto space-y-3 pt-1">
            <div>
              <div className="flex justify-between items-center font-mono text-xs text-hack-subtext mb-1.5">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> {event.team_count || 1} {event.team_count === 1 ? 'member' : 'members'}
                </span>
                <span className="font-medium">
                  {(event.deliverable_progress?.total || 0) === 0
                    ? 'No tasks yet'
                    : `${event.deliverable_progress?.done || 0}/${event.deliverable_progress?.total || 0} done`}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-hack-muted/50 overflow-hidden">
                <div 
                  className="h-full bg-hack-coral transition-all rounded-full" 
                  style={{ width: `${progressPercent}%` }} 
                />
              </div>
            </div>

            {/* Tactile Keycap Action Button */}
            <div className="w-full pt-1">
              <span className="btn-tactile w-full py-2 px-3 font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 bg-hack-coral text-hack-ink group-hover:brightness-105 transition-all">
                {progressPercent > 0 ? 'Continue →' : 'Open →'}
              </span>
            </div>
          </div>
        </Link>
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
          <DialogContent className="max-w-md border-2 border-hack-ink bg-hack-panel p-6 shadow-[8px_8px_0_#671912]">
            <DialogHeader>
              <div className="flex items-center gap-2 text-hack-red">
                <AlertTriangle className="w-5 h-5" />
                <DialogTitle className="font-display text-xl font-black uppercase text-hack-ink">
                  Delete Hackathon?
                </DialogTitle>
              </div>
              <DialogDescription className="font-mono text-xs text-hack-subtext mt-2">
                Are you sure you want to permanently delete <strong className="text-hack-ink font-bold">"{event.title}"</strong>? All associated rounds, checklist tasks, and resources will be removed. This cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t-2 border-hack-ink mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteOpen(false)}
                disabled={isDeleting}
                className="w-full sm:w-auto font-mono text-xs border-2 border-hack-ink"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full sm:w-auto font-mono text-xs bg-hack-red hover:bg-[#b02213] text-hack-panel border-2 border-hack-ink shadow-hack-sm font-bold"
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
