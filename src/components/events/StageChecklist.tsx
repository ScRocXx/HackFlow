'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2, UserCheck } from 'lucide-react'
import { toggleDeliverable, addDeliverable, deleteDeliverable, claimDeliverable } from '@/app/actions/deliverables'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useEventRoom } from '@/lib/supabase/event-channel'
import { cn } from '@/lib/utils'

interface StageChecklistProps {
  stageId: string
  eventId: string
  deliverables: any[]
  currentUserId?: string | null
}

export function StageChecklist({ stageId, eventId, deliverables: initialDeliverables, currentUserId }: StageChecklistProps) {
  const [items, setItems] = useState(initialDeliverables)
  const [newTask, setNewTask] = useState('')
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const [claimingIds, setClaimingIds] = useState<Set<string>>(new Set())

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

  // 0ms Zero-Latency Optimistic Toggle
  const handleToggle = async (id: string, currentIsDone: boolean) => {
    setLoadingIds(prev => new Set(prev).add(id))
    const newIsDone = !currentIsDone
    setItems(prev => prev.map(item => item.id === id ? { ...item, is_done: newIsDone } : item))
    
    try {
      const res = await toggleDeliverable(id, newIsDone)
      if (res && !res.success) {
        // Rollback
        setItems(prev => prev.map(item => item.id === id ? { ...item, is_done: currentIsDone } : item))
      }
    } catch {
      setItems(prev => prev.map(item => item.id === id ? { ...item, is_done: currentIsDone } : item))
    } finally {
      setLoadingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  // 0ms Zero-Latency Optimistic Add
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    const title = newTask.trim()
    if (!title) return

    const tempId = `temp-${Date.now()}`
    const optimisticItem = {
      id: tempId,
      stage_id: stageId,
      title: title,
      is_done: false,
      sort_order: items.length + 1,
    }

    setNewTask('')
    setItems(prev => [...prev, optimisticItem])

    try {
      const res = await addDeliverable(stageId, title)
      if (res && !res.success) {
        // Rollback optimistic item
        setItems(prev => prev.filter(i => i.id !== tempId))
        setNewTask(title)
      }
    } catch (error) {
      console.error(error)
      setItems(prev => prev.filter(i => i.id !== tempId))
      setNewTask(title)
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

  // 0ms Zero-Latency Optimistic Claim (Decoupled from completion)
  const handleClaim = async (id: string, currentAssigned: string | null) => {
    setClaimingIds(prev => new Set(prev).add(id))
    const nextAssigned = currentAssigned ? null : (currentUserId || 'claimed')
    setItems(prev => prev.map(item => item.id === id ? { ...item, assigned_to: nextAssigned } : item))

    try {
      const res = await claimDeliverable(id, nextAssigned)
      if (res && !res.success) {
        // Rollback
        setItems(prev => prev.map(item => item.id === id ? { ...item, assigned_to: currentAssigned } : item))
      }
    } catch {
      setItems(prev => prev.map(item => item.id === id ? { ...item, assigned_to: currentAssigned } : item))
    } finally {
      setClaimingIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[500px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {items.length === 0 ? (
          <div className="text-center font-mono text-[#34433f] py-8 text-xs font-bold">
            No tasks for this stage yet. Add one below!
          </div>
        ) : (
          items.map(item => {
            const isDone = Boolean(item.is_done || item.status === 'completed')
            const isLoading = loadingIds.has(item.id)
            const isClaiming = claimingIds.has(item.id)
            const isAssignedToMe = Boolean(currentUserId && item.assigned_to === currentUserId)
            
            return (
              <div 
                key={item.id} 
                className={cn(
                  "flex items-center gap-3 p-3 border-2 border-[#10201d] transition-all group font-mono text-xs",
                  isDone ? "bg-[#e4e5da] text-[#34433f] opacity-75" : "bg-[#f7f7f2] text-[#10201d] shadow-[2px_2px_0_#10201d]"
                )}
              >
                <button 
                  disabled={isLoading}
                  onClick={() => handleToggle(item.id, isDone)}
                  aria-label={isDone ? `Mark "${item.title}" as incomplete` : `Mark "${item.title}" as completed`}
                  className="shrink-0 w-5 h-5 border-2 border-[#10201d] bg-white flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10201d]"
                >
                  {isLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin text-[#10201d]" />
                  ) : isDone ? (
                    <span className="w-3 h-3 bg-[#e53927] inline-block" />
                  ) : null}
                </button>
                
                <span className={cn(
                  "flex-1 font-mono text-xs font-bold transition-all",
                  isDone ? "line-through text-[#34433f]" : "text-[#10201d]"
                )}>
                  {item.title}
                </span>

                {/* Ownership Claim Pill */}
                <button
                  type="button"
                  disabled={isClaiming}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleClaim(item.id, item.assigned_to)
                  }}
                  className={cn(
                    "px-2 py-0.5 border text-[10px] font-mono font-bold transition-all shrink-0",
                    item.assigned_to
                      ? isAssignedToMe
                        ? "border-[#10201d] bg-[#f5b726] text-[#10201d]"
                        : "border-[#10201d] bg-[#8bb2de] text-[#10201d]"
                      : "border-[#10201d]/40 bg-white hover:bg-[#e4e5da] text-[#34433f]"
                  )}
                  title={item.assigned_to ? (isAssignedToMe ? "Assigned to you (click to unclaim)" : "Claimed by teammate") : "Claim this deliverable"}
                >
                  {isClaiming ? "..." : item.assigned_to ? (isAssignedToMe ? "You" : "Teammate") : "+ Claim"}
                </button>

                <button 
                  onClick={() => handleDelete(item.id)}
                  aria-label={`Delete deliverable "${item.title}"`}
                  className="opacity-0 group-hover:opacity-100 shrink-0 text-[#10201d] hover:text-[#e53927] transition-opacity p-1"
                  title="Delete task"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })
        )}
      </div>

      <div className="p-4 border-t-2 border-[#10201d] bg-[#f7f7f2]">
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input 
            placeholder="Add new deliverable..." 
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            className="flex-1 font-mono text-xs border-2 border-[#10201d] shadow-[2px_2px_0_#10201d]"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!newTask.trim()}
            className="border-2 border-[#10201d] shadow-[2px_2px_0_#10201d]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
          </Button>
        </form>
      </div>
    </div>
  )
}
