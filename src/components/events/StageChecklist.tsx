'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, CheckCircle, Circle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toggleDeliverable, addDeliverable, deleteDeliverable } from '@/app/actions/deliverables'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface StageChecklistProps {
  stageId: string
  eventId: string
  deliverables: any[]
}

export function StageChecklist({ stageId, eventId, deliverables: initialDeliverables }: StageChecklistProps) {
  const [items, setItems] = useState(initialDeliverables)
  const [newTask, setNewTask] = useState('')
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set())
  const supabase = createClient()

  useEffect(() => {
    setItems(initialDeliverables)
  }, [initialDeliverables])

  useEffect(() => {
    const channel = supabase
      .channel(`stage_${stageId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'stage_deliverables',
        filter: `stage_id=eq.${stageId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setItems(prev => [...prev, payload.new])
        } else if (payload.eventType === 'UPDATE') {
          setItems(prev => prev.map(item => item.id === payload.new.id ? payload.new : item))
        } else if (payload.eventType === 'DELETE') {
          setItems(prev => prev.filter(item => item.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [stageId, supabase])

  const handleToggle = async (id: string, currentIsDone: boolean) => {
    setLoadingIds(prev => new Set(prev).add(id))
    const newIsDone = !currentIsDone
    setItems(prev => prev.map(item => item.id === id ? { ...item, is_done: newIsDone } : item))
    
    try {
      await toggleDeliverable(id, newIsDone)
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

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTask.trim()) return

    const title = newTask
    setNewTask('')
    try {
      await addDeliverable(stageId, title)
    } catch (error) {
      console.error(error)
      setNewTask(title)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteDeliverable(id)
    } catch (error) {
      console.error(error)
    }
  }

  return (
    <div className="flex flex-col h-full max-h-[500px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {items.length === 0 ? (
          <div className="text-center text-slate-500 py-8 text-sm">
            No tasks for this stage yet. Add one below!
          </div>
        ) : (
          items.map(item => {
            const isDone = Boolean(item.is_done || item.status === 'completed')
            const isLoading = loadingIds.has(item.id)
            
            return (
              <div 
                key={item.id} 
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors group",
                  isDone ? "bg-slate-50 border-slate-200" : "bg-white border-slate-200 hover:border-blue-200"
                )}
              >
                <button 
                  disabled={isLoading}
                  onClick={() => handleToggle(item.id, isDone)}
                  className="shrink-0 text-slate-400 hover:text-blue-500 transition-colors"
                >
                  {isDone ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>
                
                <span className={cn(
                  "flex-1 text-sm transition-all",
                  isDone ? "text-slate-400 line-through" : "text-slate-700"
                )}>
                  {item.title}
                </span>

                <button 
                  onClick={() => handleDelete(item.id)}
                  className="opacity-0 group-hover:opacity-100 shrink-0 text-slate-400 hover:text-red-500 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )
          })
        )}
      </div>

      <div className="p-4 border-t border-slate-100 bg-white">
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input 
            placeholder="Add a new task..." 
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="icon" variant="secondary" disabled={!newTask.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
