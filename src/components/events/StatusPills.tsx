'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Bookmark, UserCheck, Hammer, Send, Loader2, 
  Trophy, Clock, Star, Award, Archive, ChevronDown, Check 
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { updateEventStatus } from '@/app/actions/events'

interface StatusPillsProps {
  eventId: string
  currentStatus: string
  onStatusChange?: (status: string) => void
}

const PRIMARY_STATUSES = [
  { id: 'bookmarked', label: 'Bookmark', fullLabel: 'Bookmarked', icon: Bookmark, color: 'blue' },
  { id: 'registered', label: 'Register', fullLabel: 'Registered', icon: UserCheck, color: 'indigo' },
  { id: 'building', label: 'Build', fullLabel: 'Building', icon: Hammer, color: 'orange' },
  { id: 'submitted', label: 'Submit', fullLabel: 'Submitted', icon: Send, color: 'emerald' },
]

const OUTCOME_STATUSES = [
  { id: 'under_review', label: 'Under Review', icon: Clock, color: 'blue' },
  { id: 'finalist', label: 'Finalist', icon: Star, color: 'salmon' },
  { id: 'winner', label: 'Winner 🏆', icon: Trophy, color: 'gold' },
  { id: 'runner_up', label: 'Runner Up', icon: Award, color: 'silver' },
  { id: 'participated', label: 'Participated', icon: Check, color: 'green' },
  { id: 'archived', label: 'Archived', icon: Archive, color: 'gray' },
]

export function StatusPills({ eventId, currentStatus, onStatusChange }: StatusPillsProps) {
  const [activeStatus, setActiveStatus] = useState(currentStatus || 'bookmarked')
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Keep in sync with prop changes
  useEffect(() => {
    setActiveStatus(currentStatus || 'bookmarked')
  }, [currentStatus])

  // Close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isDropdownOpen])

  const handleStatusChange = async (statusId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    
    if (statusId === activeStatus) {
      setIsDropdownOpen(false)
      return
    }

    setIsLoading(statusId)
    setIsDropdownOpen(false)
    try {
      await updateEventStatus(eventId, statusId)
      setActiveStatus(statusId)
      if (onStatusChange) onStatusChange(statusId)
    } catch (error) {
      console.error('Failed to update status', error)
    } finally {
      setIsLoading(null)
    }
  }

  const isOutcomeActive = OUTCOME_STATUSES.some(s => s.id === activeStatus)
  const currentOutcome = OUTCOME_STATUSES.find(s => s.id === activeStatus)

  return (
    <div className="flex items-center justify-between gap-1 w-full relative" onClick={(e) => e.stopPropagation()}>
      {/* 4 Core Sprints */}
      {PRIMARY_STATUSES.map((status) => {
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
              "flex-1 flex flex-col items-center justify-center p-1 border-2 transition-all font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-wider",
              colorClasses,
              isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            )}
            title={status.fullLabel}
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin mb-0.5" />
            ) : (
              <status.icon className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5 mb-0.5", isActive ? "stroke-[2.5]" : "stroke-[1.5]")} />
            )}
            <span className="truncate w-full text-center">{status.label}</span>
          </button>
        )
      })}

      {/* Outcome / Concluded Dropdown Pill */}
      <div className="flex-1 relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsDropdownOpen(!isDropdownOpen)
          }}
          disabled={!!isLoading}
          className={cn(
            "w-full flex flex-col items-center justify-center p-1 border-2 transition-all font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-wider",
            isOutcomeActive 
              ? activeStatus === 'winner'
                ? "bg-[#f5b726] text-[#10201d] border-[#10201d] shadow-[2px_2px_0_#8a5d13]"
                : activeStatus === 'finalist'
                ? "bg-[#f6c4c1] text-[#10201d] border-[#10201d] shadow-[2px_2px_0_#671912]"
                : "bg-[#8bb2de] text-[#10201d] border-[#10201d] shadow-[2px_2px_0_#2e4742]"
              : "bg-[#f7f7f2] text-[#34433f]/70 border-[#10201d] opacity-60 hover:opacity-100 hover:bg-[#e4e5da]",
            isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          )}
          title="Lifecycle & Outcome"
        >
          {isLoading && OUTCOME_STATUSES.some(s => s.id === isLoading) ? (
            <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 animate-spin mb-0.5" />
          ) : currentOutcome ? (
            <currentOutcome.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5 mb-0.5 stroke-[2.5]" />
          ) : (
            <Trophy className="h-3 w-3 sm:h-3.5 sm:w-3.5 mb-0.5 stroke-[1.5]" />
          )}
          <span className="truncate w-full text-center flex items-center justify-center gap-0.5">
            {currentOutcome ? currentOutcome.label.replace(' 🏆', '') : 'Result'}
            <ChevronDown className="h-2.5 w-2.5 shrink-0" />
          </span>
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute right-0 bottom-full mb-1 sm:bottom-auto sm:top-full sm:mt-1 w-44 bg-[#f7f7f2] border-2 border-[#10201d] shadow-[4px_4px_0_#10201d] z-50 p-1 space-y-1">
            <div className="px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-wider text-[#34433f] border-b border-[#10201d]/20">
              Evaluation & Outcome
            </div>
            {OUTCOME_STATUSES.map((status) => {
              const isSelected = activeStatus === status.id
              return (
                <button
                  key={status.id}
                  type="button"
                  onClick={(e) => handleStatusChange(status.id, e)}
                  className={cn(
                    "w-full flex items-center justify-between px-2 py-1.5 text-xs font-mono font-bold text-left transition-colors border",
                    isSelected 
                      ? "bg-[#3d5f58] text-[#f7f7f2] border-[#10201d]" 
                      : "bg-white text-[#10201d] border-transparent hover:bg-[#e4e5da] hover:border-[#10201d]"
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <status.icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{status.label}</span>
                  </span>
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
