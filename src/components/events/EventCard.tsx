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
import { getDeadlineSeverity } from '@/lib/utils/deadline'
import { cn } from '@/lib/utils'
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
  const prizeDisplay = event.prize_display_summary || event.prize_pool

  // Unified stage computation: consistent with workspace and dashboard
  const computedActiveStage = computeActiveStage(event.stages, event.active_stage_id || event.active_stage?.id)

  return (
    <>
      <div className="border border-hack-muted/60 bg-hack-surface rounded-xl shadow-hack-card hover:shadow-hack-hero hover:-translate-y-1 transition-all flex flex-col group h-full overflow-hidden relative">
        <Link 
          href={`/events/${event.id}`}
          prefetch={true}
          className="flex flex-col h-full flex-1 p-4 sm:p-5"
        >
          {/* Card Top Header: Platform badge, mode, and overflow menu */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-md border font-mono text-[10px] font-bold uppercase tracking-wider",
                platformBadge.className
              )}>
                {platformBadge.label}
              </span>
              {event.mode && (
                <span className="inline-flex items-center font-mono text-[10px] font-medium text-hack-subtext uppercase px-1.5 py-0.5 rounded-md bg-hack-sand border border-hack-muted/40">
                  {event.mode === 'in-person' ? <MapPin className="w-3 h-3 mr-0.5" /> : <Globe className="w-3 h-3 mr-0.5" />}
                  {event.mode}
                </span>
              )}
              {event.squad_name && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-md border border-hack-gold/40 bg-hack-gold/15 text-hack-gold-dark font-mono text-[10px] font-semibold">
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
          <div className="mb-3">
            <h3 className="font-display text-lg sm:text-xl font-bold text-hack-ink line-clamp-1 group-hover:text-hack-coral-dark transition-colors">
              {event.title}
            </h3>
            <div className="flex items-center justify-between gap-2 mt-0.5">
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

          {/* Active Round & Countdown (Auto-Rolled) */}
          {computedActiveStage ? (
            <div className="mb-4 p-3 rounded-lg border border-hack-muted/60 bg-hack-sand/40 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2 h-2 rounded-full bg-hack-coral inline-block shrink-0" />
                  <span className="font-mono text-xs font-bold text-hack-ink truncate">
                    {computedActiveStage.title}
                  </span>
                </div>
                {computedActiveStage.raw_date_snippet && (
                  <span className="font-mono text-[10px] text-hack-subtext font-medium flex items-center gap-1 shrink-0">
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
            <div className="mb-4 p-3 rounded-lg border border-dashed border-hack-muted bg-hack-sand/20 flex items-center justify-center font-mono text-hack-subtext text-xs font-medium h-[64px]">
              All clear.
            </div>
          )}

          {/* Progress & Team Count */}
          <div className="mt-auto space-y-3 pt-2">
            <div>
              <div className="flex justify-between items-center font-mono text-xs text-hack-subtext mb-1.5">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> {event.team_count || 1} {event.team_count === 1 ? 'member' : 'members'}
                </span>
                <span className="font-medium">{event.deliverable_progress?.done || 0}/{event.deliverable_progress?.total || 0} tasks ({Math.round(progressPercent)}%)</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-hack-muted/50 overflow-hidden">
                <div 
                  className="h-full bg-hack-coral transition-all rounded-full" 
                  style={{ width: `${progressPercent}%` }} 
                />
              </div>
            </div>

            {/* Primary Action Button */}
            <div className="w-full pt-1">
              <span className="w-full py-2 px-3 rounded-lg font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border border-hack-coral bg-hack-coral text-hack-ink shadow-hack-hero group-hover:brightness-105 transition-all">
                Open Workspace →
              </span>
            </div>
          </div>
        </Link>

        {/* Status Pills */}
        <div className="px-4 py-2.5 bg-hack-surface border-t border-hack-muted/30 relative z-10">
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
