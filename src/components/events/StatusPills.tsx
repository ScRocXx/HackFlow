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
            case 'blue': colorClasses = 'bg-[#EEF4FB] text-[#1E3A5F] border-hack-ink/60 shadow-sm font-bold'; break;
            case 'indigo': colorClasses = 'bg-hack-ink text-hack-panel border-hack-ink shadow-sm font-bold'; break;
            case 'orange': colorClasses = 'bg-[#FEF9EE] text-[#8A5D13] border-[#F6C344] shadow-sm font-bold'; break;
            case 'emerald': colorClasses = 'bg-hack-mint text-hack-mint-dark border-hack-ink/40 shadow-sm font-bold'; break;
          }
        } else {
          colorClasses = 'bg-hack-panel text-hack-subtext border-hack-ink/15 hover:border-hack-ink/30 hover:bg-hack-sand/60'
        }

        return (
          <button
            key={status.id}
            onClick={(e) => handleStatusChange(status.id, e)}
            disabled={!!isLoading}
            className={cn(
              "flex-1 flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-md border transition-all font-mono text-[9px] sm:text-[10px] uppercase tracking-wider",
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
            "w-full flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-md border transition-all font-mono text-[9px] sm:text-[10px] uppercase tracking-wider",
            isOutcomeActive 
              ? activeStatus === 'winner'
                ? "bg-[#FEF9EE] text-[#8A5D13] border-[#F6C344] shadow-sm font-bold"
                : activeStatus === 'finalist'
                ? "bg-hack-coral/15 text-hack-coral-dark border-hack-coral/40 shadow-sm font-bold"
                : "bg-[#EEF4FB] text-[#1E3A5F] border-hack-ink/40 shadow-sm font-bold"
              : "bg-hack-panel text-hack-subtext border-hack-ink/15 hover:border-hack-ink/30 hover:bg-hack-sand/60",
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
          <div className="absolute right-0 bottom-full mb-1 sm:bottom-auto sm:top-full sm:mt-1 w-44 bg-hack-panel rounded-lg border border-hack-ink/20 shadow-lg z-50 p-1 space-y-1">
            <div className="px-2 py-1 text-[9px] font-mono font-bold uppercase tracking-wider text-hack-subtext border-b border-hack-ink/10">
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
                    "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-mono font-medium text-left transition-colors",
                    isSelected 
                      ? "bg-hack-ink text-hack-panel font-bold" 
                      : "bg-transparent text-hack-ink hover:bg-hack-sand/60"
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
