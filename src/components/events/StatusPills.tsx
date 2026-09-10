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
            case 'blue': colorClasses = 'bg-[#8bb2de] text-[#10201d] border-[#10201d] shadow-[2px_2px_0_#2e4742]'; break;
            case 'indigo': colorClasses = 'bg-[#3d5f58] text-[#f7f7f2] border-[#10201d] shadow-[2px_2px_0_#10201d]'; break;
            case 'orange': colorClasses = 'bg-[#f5b726] text-[#10201d] border-[#10201d] shadow-[2px_2px_0_#8a5d13]'; break;
            case 'emerald': colorClasses = 'bg-[#e97b77] text-[#10201d] border-[#10201d] shadow-[2px_2px_0_#671912]'; break;
          }
        } else {
          colorClasses = 'bg-[#f7f7f2] text-[#34433f]/70 border-[#10201d] opacity-60 hover:opacity-100 hover:bg-[#e4e5da]'
        }

        return (
          <button
            key={status.id}
            onClick={(e) => handleStatusChange(status.id, e)}
            disabled={!!isLoading}
            className={cn(
              "flex-1 flex flex-col items-center justify-center p-1.5 border-2 transition-all font-mono text-[10px] font-bold uppercase tracking-wider",
              colorClasses,
              isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            )}
            title={status.label}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin mb-0.5" />
            ) : (
              <status.icon className={cn("h-3.5 w-3.5 mb-0.5", isActive ? "stroke-[2.5]" : "stroke-[1.5]")} />
            )}
            <span className="hidden sm:inline-block truncate w-full text-center">{status.label}</span>
          </button>
        )
      })}

    </div>
  )
}
