'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2, CheckCircle2 } from 'lucide-react'
import { toggleDeliverable, addDeliverable, deleteDeliverable, claimDeliverable } from '@/app/actions/deliverables'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useEventRoom } from '@/lib/supabase/event-channel'
import { createClient } from '@/lib/supabase/client'
import { executeWithOfflineOutbox } from '@/lib/offline/outbox'
import { SyncStatusPill } from '@/components/ui/SyncStatusPill'
import { cn } from '@/lib/utils'
import type { StageDeliverable } from '@/lib/supabase/types'

interface StageChecklistProps {
  stageId: string
  eventId: string
  deliverables: StageDeliverable[]
  currentUserId?: string
}

export function StageChecklist({ stageId, eventId, deliverables: initialDeliverables, currentUserId }: StageChecklistProps) {
  const [items, setItems] = useState<StageDeliverable[]>(initialDeliverables)
  const [newTask, setNewTask] = useState('')
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const [activeUserId, setActiveUserId] = useState<string | null>(currentUserId || null)

  useEffect(() => {
    if (currentUserId) {
      setActiveUserId(currentUserId)
      return
    }
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setActiveUserId(data.user.id)
    })
  }, [currentUserId])

  useEffect(() => {
    setItems(initialDeliverables)
  }, [initialDeliverables])

  // Multiplexed Realtime on single Event Room channel
  useEventRoom(eventId, {
    onDeliverableChange: (payload) => {
      if (payload.eventType === 'INSERT') {
        const newItem = payload.new
        if (newItem.stage_id !== stageId) return
        setItems(prev => {
          // Check if it already exists or matches a temporary optimistic item
          const exists = prev.some(i => i.id === newItem.id)
          if (exists) return prev

          // Replace temp item if matching title
          const tempIdx = prev.findIndex(i => i.id.startsWith('temp-') && i.title === newItem.title)
          if (tempIdx !== -1) {
            const copy = [...prev]
            copy[tempIdx] = newItem
            return copy
          }
          return [...prev, newItem]
        })
      } else if (payload.eventType === 'UPDATE') {
        const updated = payload.new
        if (updated.stage_id !== stageId) return
        setItems(prev => prev.map(item => item.id === updated.id ? updated : item))
      } else if (payload.eventType === 'DELETE') {
        setItems(prev => prev.filter(item => item.id !== payload.old.id))
      }
    }
  })

  // 0ms Zero-Latency Optimistic Toggle with Offline Outbox
  const handleToggle = async (id: string, currentIsDone: boolean) => {
    setLoadingIds(prev => new Set(prev).add(id))
    const newIsDone = !currentIsDone
    setItems(prev => prev.map(item => item.id === id ? { ...item, is_done: newIsDone } : item))
    
    try {
      const res = await executeWithOfflineOutbox(
        'DELIVERABLE_TOGGLE',
        { id, isDone: newIsDone },
        () => toggleDeliverable(id, newIsDone)
      )
      if (res && !res.success && !res.queuedLocally) {
        // Rollback
        setItems(prev => prev.map(item => item.id === id ? { ...item, is_done: currentIsDone } : item))
      }
    } catch {
      // Outbox maintains optimistic state
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  // 0ms Zero-Latency Optimistic Claim / Unclaim with Offline Outbox
  const handleClaim = async (id: string) => {
    setLoadingIds(prev => new Set(prev).add(id))
    const currentItem = items.find(i => i.id === id)
    const prevAssignedTo = currentItem?.assigned_to ?? currentItem?.done_by ?? null
    const optimisticAssignedTo = prevAssignedTo ? null : (activeUserId || 'claimed')
    setItems(prev => prev.map(item => item.id === id ? { ...item, assigned_to: optimisticAssignedTo } : item))

    try {
      const res = await executeWithOfflineOutbox(
        'DELIVERABLE_CLAIM',
        { id },
        () => claimDeliverable(id)
      )
      if (res && !res.success && !res.queuedLocally) {
        setItems(prev => prev.map(item => item.id === id ? { ...item, assigned_to: prevAssignedTo } : item))
      }
    } catch {
      // Outbox maintains optimistic state
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  // 0ms Zero-Latency Optimistic Add with Offline Outbox
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = newTask.trim()
    if (!title) return

    const tempId = `temp-${Date.now()}`
    const optimisticItem: StageDeliverable = {
      id: tempId,
      stage_id: stageId,
      title: title,
      is_done: false,
      assigned_to: null,
      done_by: null,
      done_at: null,
      sort_order: items.length + 1,
      created_at: new Date().toISOString(),
    }

    setNewTask('')
    setItems(prev => [...prev, optimisticItem])

    try {
      const res = await executeWithOfflineOutbox(
        'DELIVERABLE_ADD',
        { stageId, title },
        () => addDeliverable(stageId, title)
      )
      if (res && !res.success && !res.queuedLocally) {
        // Rollback optimistic item
        setItems(prev => prev.filter(i => i.id !== tempId))
        setNewTask(title)
      }
    } catch {
      // Outbox maintains optimistic state
    }
  }

  // 0ms Zero-Latency Optimistic Delete
  const handleDelete = async (id: string) => {
    const deletedItem = items.find(item => item.id === id)
    setItems(prev => prev.filter(item => item.id !== id))

    try {
      const res = await deleteDeliverable(id)
      if (res && !res.success && deletedItem) {
        // Rollback
        setItems(prev => [...prev, deletedItem])
      }
    } catch (error) {
      console.error(error)
      if (deletedItem) {
        setItems(prev => [...prev, deletedItem])
      }
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[520px]">
      <div className="flex items-center justify-between px-4 pt-3 pb-1 flex-wrap gap-2">
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-hack-subtext">
          Stage Deliverables ({items.filter(i => Boolean(i.is_done || i.status === 'completed')).length}/{items.length})
        </span>
        <SyncStatusPill />
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {items.length > 0 && items.every(item => Boolean(item.is_done || item.status === 'completed')) && (
          <div className="p-3 mb-2 rounded-lg bg-hack-mint/15 border border-hack-mint/30 font-mono text-xs font-semibold text-hack-forest flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-hack-mint shrink-0" />
            <span>Nice. Round is done.</span>
          </div>
        )}
        {items.length === 0 ? (
          <div className="text-center font-mono text-hack-subtext py-8 text-xs font-medium">
            No deliverables for this round yet. Add what needs to get done.
          </div>
        ) : (
          items.map(item => {
            const isDone = Boolean(item.is_done || item.status === 'completed')
            const isLoading = loadingIds.has(item.id)
            const assigneeId = item.assigned_to ?? item.done_by ?? null
            const isClaimedByMe = Boolean(activeUserId && assigneeId === activeUserId) || assigneeId === 'claimed'
            const isClaimedByOther = Boolean(assigneeId && !isClaimedByMe)
            
            return (
              <div 
                key={item.id} 
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-all group font-mono text-xs min-h-[46px]",
                  isDone 
                    ? "bg-hack-sand/50 border-hack-muted/40 text-hack-subtext" 
                    : "bg-hack-surface border-hack-muted/60 text-hack-ink shadow-hack-sm hover:border-hack-muted"
                )}
              >
                <button 
                  disabled={isLoading}
                  onClick={() => handleToggle(item.id, isDone)}
                  className={cn(
                    "shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-all touch-manipulation select-none",
                    isDone 
                      ? "bg-hack-mint border-hack-mint-dark/40 text-hack-ink" 
                      : "bg-white border-hack-muted hover:border-hack-coral"
                  )}
                  title={isDone ? "Mark incomplete" : "Mark complete"}
                  aria-label={isDone ? `Mark "${item.title}" incomplete` : `Mark "${item.title}" complete`}
                >
                  {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin text-hack-ink" />
                  ) : isDone ? (
                    <span className="w-2 h-2 rounded-xs bg-hack-ink inline-block" />
                  ) : null}
                </button>
                
                <span className={cn(
                  "flex-1 font-mono text-xs sm:text-sm font-medium transition-all select-none line-clamp-2 break-words",
                  isDone ? "deliverable-done text-hack-subtext/70" : "text-hack-ink font-semibold"
                )} title={item.title}>
                  {item.title}
                </span>

                {/* Independent Ownership / Assignee Badge */}
                {isClaimedByMe ? (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleClaim(item.id)}
                    title="Claimed by you. Click to release."
                    aria-label={`Claimed by you: "${item.title}". Click to release.`}
                    className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-hack-coral/15 text-hack-coral-dark border border-hack-coral/40 shrink-0 hover:bg-hack-coral/25 active:scale-95 transition-all"
                  >
                    You
                  </button>
                ) : isClaimedByOther ? (
                  <span
                    title="Claimed by teammate"
                    aria-label={`Claimed by teammate: "${item.title}"`}
                    className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md bg-hack-sky/20 text-hack-blue-dark border border-hack-sky/40 shrink-0"
                  >
                    Teammate
                  </span>
                ) : !isDone ? (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleClaim(item.id)}
                    title="Claim this task for yourself"
                    aria-label={`Claim task: "${item.title}"`}
                    className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md border border-dashed border-hack-muted/80 hover:border-hack-coral text-hack-subtext hover:text-hack-ink hover:bg-hack-sand shrink-0 transition-colors flex items-center gap-1 active:scale-95"
                  >
                    <span className="text-hack-coral font-bold">+</span>
                    <span>Claim</span>
                  </button>
                ) : null}

                {/* Independent Completion Status Badge */}
                <span className={cn(
                  "font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-md border shrink-0",
                  isDone 
                    ? "bg-hack-mint/20 border-hack-mint/40 text-hack-mint-dark" 
                    : "bg-hack-gold/20 border-hack-gold/40 text-hack-gold-dark"
                )}>
                  {isDone ? 'Cleared' : 'Pending'}
                </span>

                <button 
                  onClick={() => handleDelete(item.id)}
                  className="opacity-50 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 shrink-0 text-hack-subtext hover:text-hack-red transition-opacity p-1 touch-manipulation"
                  title="Delete task"
                  aria-label={`Delete task: ${item.title}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })
        )}
      </div>

      <div className="p-3 sm:p-4 border-t border-hack-muted/40 bg-hack-sand/30">
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input 
            id="add-deliverable-input"
            placeholder="Add new deliverable... (press 'N')" 
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            className="flex-1 font-mono text-xs rounded-lg border border-hack-muted bg-white shadow-hack-sm focus:border-hack-coral focus:ring-1 focus:ring-hack-coral/25"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!newTask.trim()}
            className="rounded-lg border border-hack-coral bg-hack-coral hover:brightness-105 text-hack-ink shadow-hack-sm shrink-0"
            aria-label="Add deliverable"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </Button>
        </form>
      </div>
    </div>
  )
}
