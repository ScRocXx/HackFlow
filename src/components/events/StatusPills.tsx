'use client'

import { useState } from 'react'
import { Bookmark, UserCheck, Hammer, Send, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateEventStatus } from '@/app/actions/events'

interface StatusPillsProps {
  eventId: string
  currentStatus: string
}

const statuses = [
  { id: 'bookmarked', label: 'Bookmarked', icon: Bookmark, color: 'blue' },
  { id: 'registered', label: 'Registered', icon: UserCheck, color: 'indigo' },
  { id: 'building', label: 'Building', icon: Hammer, color: 'orange' },
  { id: 'submitted', label: 'Submitted', icon: Send, color: 'emerald' }
]

export function StatusPills({ eventId, currentStatus }: StatusPillsProps) {
  const [activeStatus, setActiveStatus] = useState(currentStatus || 'bookmarked')
  const [isLoading, setIsLoading] = useState<string | null>(null)

  const handleStatusChange = async (statusId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (statusId === activeStatus) return

    setIsLoading(statusId)
    try {
      await updateEventStatus(eventId, statusId)
      setActiveStatus(statusId)
    } catch (error) {
      console.error('Failed to update status', error)
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="flex items-center justify-between gap-1 w-full" onClick={(e) => e.stopPropagation()}>
      {statuses.map((status) => {
        const isActive = activeStatus === status.id
        const isPending = isLoading === status.id
        
        let colorClasses = ""
        if (isActive) {
          switch (status.color) {
            case 'blue': colorClasses = 'bg-blue-100 text-blue-700 border-blue-200'; break;
            case 'indigo': colorClasses = 'bg-indigo-100 text-indigo-700 border-indigo-200'; break;
            case 'orange': colorClasses = 'bg-orange-100 text-orange-700 border-orange-200'; break;
            case 'emerald': colorClasses = 'bg-emerald-100 text-emerald-700 border-emerald-200'; break;
          }
        } else {
          colorClasses = 'bg-transparent text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600'
        }

        return (
          <button
            key={status.id}
            onClick={(e) => handleStatusChange(status.id, e)}
            disabled={!!isLoading}
            className={cn(
              "flex-1 flex flex-col items-center justify-center p-1.5 rounded border transition-colors text-[10px] font-medium",
              colorClasses,
              isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            )}
            title={status.label}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mb-1" />
            ) : (
              <status.icon className={cn("h-3.5 w-3.5 mb-1", isActive ? "fill-current/20" : "")} />
            )}
            <span className="hidden sm:inline-block truncate w-full text-center">{status.label}</span>
          </button>
        )
      })}
    </div>
  )
}
