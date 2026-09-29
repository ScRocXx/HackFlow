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
      <div className="border-2 border-hack-ink bg-hack-panel shadow-[6px_6px_0_#671912] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#671912] transition-all flex flex-col group h-full overflow-hidden relative">
        <Link 
          href={`/events/${event.id}`}
          prefetch={true}
          className="flex flex-col h-full flex-1"
        >
          {/* Banner Container */}
          <div className="h-28 sm:h-32 w-full relative bg-hack-forest border-b-2 border-hack-ink overflow-hidden">
            {event.banner_url ? (
              <img src={event.banner_url} alt={event.title} className="w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-hack-teal flex items-center justify-center p-4">
                <span className="font-display text-2xl font-extrabold text-hack-panel/30 tracking-wider uppercase">
                  {platformBadge.label}
                </span>
              </div>
            )}

            {/* Badges on Top Left (Max 2 Badges) */}
            <div className="absolute top-2.5 left-2.5 sm:top-3 sm:left-3 flex gap-1.5 flex-wrap max-w-[70%] z-10">
              <span className={`inline-flex items-center px-2 py-0.5 border-2 font-mono text-[10px] font-black uppercase tracking-wider shadow-hack-sm ${platformBadge.className}`}>
                {platformBadge.label}
              </span>
              {event.squad_name && (
                <span className="inline-flex items-center px-2 py-0.5 border-2 border-hack-ink bg-hack-yellow text-hack-ink font-mono text-[10px] font-bold uppercase tracking-wider shadow-hack-sm">
                  👥 {event.squad_name}
                </span>
              )}
            </div>

            {/* Overflow Options Menu (Top Right) */}
            <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-20">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    title="Hackathon options"
                    aria-label="Hackathon options"
                    className="p-1.5 min-w-[32px] min-h-[32px] flex items-center justify-center border-2 border-hack-ink bg-hack-panel hover:bg-hack-muted active:scale-90 text-hack-ink shadow-hack-sm transition-all touch-manipulation"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                    <span className="sr-only">Options</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="border-2 border-hack-ink bg-hack-panel shadow-hack-sm font-mono text-xs w-44">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditOpen(true)
                    }}
                    className="cursor-pointer font-bold text-hack-ink hover:bg-hack-muted"
                  >
                    <Edit3 className="w-3.5 h-3.5 mr-2 text-hack-subtext" /> Edit Hackathon
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteOpen(true)
                    }}
                    className="cursor-pointer font-bold text-hack-red hover:bg-hack-pink"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2 text-hack-red" /> Delete Hackathon
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-3.5 sm:p-5 flex-1 flex flex-col">
            <div className="mb-3 sm:mb-4">
              <h3 className="font-display text-lg sm:text-xl font-bold text-hack-ink line-clamp-1 group-hover:text-hack-red transition-colors">
                {event.title}
              </h3>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <p className="font-mono text-xs text-hack-subtext line-clamp-1">
                  {event.organizer || 'Independent Hackathon'}
                </p>
                {event.mode && (
                  <span className="inline-flex items-center font-mono text-[10px] font-bold text-hack-subtext uppercase shrink-0">
                    {event.mode === 'in-person' ? <MapPin className="w-3 h-3 mr-0.5" /> : <Globe className="w-3 h-3 mr-0.5" />}
                    {event.mode}
                  </span>
                )}
              </div>
              {prizeDisplay && (
                <div className="mt-1.5">
                  <span className="inline-flex items-center font-mono text-[10px] font-bold text-hack-ink bg-hack-sky/30 px-1.5 py-0.5 border border-hack-ink/30 truncate max-w-full">
                    🏆 {prizeDisplay}
                  </span>
                </div>
              )}
            </div>

            {/* Active Stage & Countdown (Auto-Rolled) */}
            {computedActiveStage ? (
              <div className="mb-4 p-3 border-2 border-hack-ink bg-hack-sand shadow-[3px_3px_0_#2e4742]">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 bg-hack-red inline-block shrink-0" />
                    <span className="font-mono text-xs font-bold text-hack-ink truncate uppercase">
                      {computedActiveStage.title}
                    </span>
                  </div>
                  {computedActiveStage.raw_date_snippet && (
                    <span className="font-mono text-[10px] text-hack-subtext font-semibold flex items-center gap-1 shrink-0">
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
              <div className="mb-4 p-3 border-2 border-hack-ink bg-hack-muted flex items-center justify-center font-mono text-hack-subtext text-xs font-bold h-[76px]">
                No active stage
              </div>
            )}

            {/* Progress & Team Count */}
            <div className="mt-auto space-y-3">
              <div>
                <div className="flex justify-between items-center font-mono text-xs font-bold text-hack-subtext mb-1.5">
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" /> {event.team_count || 1} members
                  </span>
                  <span>{event.deliverable_progress?.done || 0}/{event.deliverable_progress?.total || 0} tasks</span>
                </div>
                <div className="w-full h-2 border border-hack-ink bg-hack-muted overflow-hidden">
                  <div 
                    className="h-full bg-hack-coral transition-all" 
                    style={{ width: `${progressPercent}%` }} 
                  />
                </div>
              </div>

              {/* State-Dependent Primary Action Button */}
              {(() => {
                const targetDl = computedActiveStage?.actionable_deadline || computedActiveStage?.deadline
                const severity = getDeadlineSeverity(targetDl)
                let cta = {
                  label: 'Continue →',
                  className: 'bg-hack-coral text-hack-ink hover:bg-hack-pink shadow-[2px_2px_0_#671912]'
                }
                if (severity.severity === 'critical') {
                  cta = {
                    label: '⏰ Due Soon — Open',
                    className: 'bg-hack-red text-white hover:bg-[#c82717] shadow-hack-sm'
                  }
                } else if (event.status === 'winner' || event.status === 'runner_up') {
                  cta = {
                    label: '🏆 View in Trophy Case',
                    className: 'bg-hack-yellow text-hack-ink hover:bg-[#e5a81e] shadow-[2px_2px_0_#8a5d13]'
                  }
                } else if (event.status === 'submitted') {
                  cta = {
                    label: 'Check Status',
                    className: 'bg-hack-sky text-hack-ink hover:bg-[#7ba2ce] shadow-[2px_2px_0_#2e4742]'
                  }
                }
                return (
                  <div className="w-full">
                    <span className={cn(
                      "w-full py-2 px-3 border-2 border-hack-ink font-mono text-xs font-black uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all group-hover:translate-x-[1px] group-hover:translate-y-[1px]",
                      cta.className
                    )}>
                      {cta.label}
                    </span>
                  </div>
                )
              })()}
            </div>
          </div>
        </Link>

        {/* Resource Badges */}
        {event.resources && event.resources.length > 0 && (
          <div className="px-5 pb-3 flex flex-wrap gap-1.5 z-20 relative border-t border-hack-ink/20 pt-2.5">
            {event.resources.slice(0, 3).map((res) => (
              <a
                key={res.id}
                href={ensureExternalUrl(res.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 border border-hack-ink bg-hack-panel hover:bg-hack-sky text-hack-ink transition-colors max-w-[180px]"
                title={res.title}
              >
                {res.resource_type === 'dataset' ? (
                  <Database className="w-3 h-3 text-hack-ink shrink-0" />
                ) : (
                  <FileText className="w-3 h-3 text-hack-ink shrink-0" />
                )}
                <span className="truncate">{res.title}</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
              </a>
            ))}
            {event.resources.length > 3 && (
              <span className="font-mono text-[10px] text-hack-subtext font-bold self-center">
                +{event.resources.length - 3}
              </span>
            )}
          </div>
        )}
        
        {/* Status Pills */}
        <div className="px-4 py-3 bg-hack-panel border-t-2 border-hack-ink relative z-10">
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
