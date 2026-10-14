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
  variant?: 'pills' | 'selector'
}

const PRIMARY_STATUSES = [
  { id: 'bookmarked', label: 'Bookmark', fullLabel: 'Bookmarked', icon: Bookmark, color: 'blue' },
  { id: 'registered', label: 'Register', fullLabel: 'Registered', icon: UserCheck, color: 'indigo' },
  { id: 'building', label: 'Build', fullLabel: 'Building', icon: Hammer, color: 'orange' },
  { id: 'submitted', label: 'Submit', fullLabel: 'Submitted', icon: Send, color: 'emerald' },
]

const OUTCOME_STATUSES = [
  { id: 'under_review', label: 'Under Review', icon: Clock, color: 'blue' },
  { id: 'finalist', label: 'Finalist', icon: Star, color: 'coral' },
  { id: 'winner', label: 'Winner 🏆', icon: Trophy, color: 'gold' },
  { id: 'runner_up', label: 'Runner Up', icon: Award, color: 'silver' },
  { id: 'participated', label: 'Participated', icon: Check, color: 'green' },
  { id: 'archived', label: 'Archived', icon: Archive, color: 'gray' },
]

const ALL_STATUSES = [...PRIMARY_STATUSES, ...OUTCOME_STATUSES]

export function StatusPills({ 
  eventId, 
  currentStatus, 
  onStatusChange,
  variant = 'pills'
}: StatusPillsProps) {
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

  // --- VARIANT: SELECTOR (Single compact badge dropdown for headers & toolbars) ---
  if (variant === 'selector') {
    const activeItem = ALL_STATUSES.find(s => s.id === activeStatus) || PRIMARY_STATUSES[0]
    const ActiveIcon = activeItem.icon

    let badgeColor = "border-hack-muted/60 bg-hack-surface text-hack-ink hover:bg-hack-sand"
    if (activeStatus === 'building') {
      badgeColor = "border-hack-gold/40 bg-hack-gold/15 text-hack-gold-dark hover:bg-hack-gold/25"
    } else if (activeStatus === 'submitted') {
      badgeColor = "border-hack-mint/40 bg-hack-mint/20 text-hack-mint-dark hover:bg-hack-mint/30"
    } else if (activeStatus === 'registered') {
      badgeColor = "border-hack-ink bg-hack-ink text-hack-surface hover:brightness-110"
    } else if (activeStatus === 'winner') {
      badgeColor = "border-hack-gold/60 bg-hack-gold/20 text-hack-gold-dark hover:bg-hack-gold/30 font-bold"
    } else if (activeStatus === 'finalist') {
      badgeColor = "border-hack-coral/40 bg-hack-coral/15 text-hack-coral-dark hover:bg-hack-coral/25"
    } else if (activeStatus === 'under_review') {
      badgeColor = "border-hack-sky/40 bg-hack-sky/15 text-hack-ink hover:bg-hack-sky/25"
    }

    return (
      <div className="relative inline-block" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          disabled={!!isLoading}
          className={cn(
            "h-8 px-2.5 rounded-lg border font-mono text-xs font-bold uppercase tracking-wider shadow-hack-sm flex items-center gap-1.5 transition-all touch-manipulation active:scale-95",
            badgeColor,
            isLoading && "opacity-60 cursor-not-allowed"
          )}
          title={`Lifecycle Status: ${activeItem.label}. Click to change.`}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ActiveIcon className="h-3.5 w-3.5 shrink-0" />
          )}
          <span className="truncate max-w-[120px]">{activeItem.label.replace(' 🏆', '')}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-70 ml-0.5" />
        </button>

        {isDropdownOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-52 bg-hack-surface rounded-xl border border-hack-muted/60 shadow-hack-dialog z-50 p-1.5 space-y-1 font-mono text-xs animate-in fade-in zoom-in-95 duration-100">
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-hack-subtext border-b border-hack-muted/30">
              Sprint Stage
            </div>
            {PRIMARY_STATUSES.map((status) => {
              const isSelected = activeStatus === status.id
              const Icon = status.icon
              return (
                <button
                  key={status.id}
                  type="button"
                  onClick={(e) => handleStatusChange(status.id, e)}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors",
                    isSelected
                      ? "bg-hack-ink text-hack-surface font-bold"
                      : "text-hack-ink hover:bg-hack-sand"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{status.fullLabel}</span>
                  </span>
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                </button>
              )
            })}

            <div className="pt-1 mt-1 border-t border-hack-muted/30">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-hack-subtext">
                Evaluation & Outcome
              </div>
              {OUTCOME_STATUSES.map((status) => {
                const isSelected = activeStatus === status.id
                const Icon = status.icon
                return (
                  <button
                    key={status.id}
                    type="button"
                    onClick={(e) => handleStatusChange(status.id, e)}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition-colors",
                      isSelected
                        ? "bg-hack-ink text-hack-surface font-bold"
                        : "text-hack-ink hover:bg-hack-sand"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{status.label}</span>
                    </span>
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    )
  }

  // --- VARIANT: PILLS (Default 4-sprint strip + result dropdown for card footers) ---
  const isOutcomeActive = OUTCOME_STATUSES.some(s => s.id === activeStatus)
  const currentOutcome = OUTCOME_STATUSES.find(s => s.id === activeStatus)

  return (
    <div className="flex items-center justify-between gap-1 w-full relative overflow-x-auto no-scrollbar scroll-smooth" onClick={(e) => e.stopPropagation()}>
      {/* 4 Core Sprints */}
      {PRIMARY_STATUSES.map((status) => {
        const isActive = activeStatus === status.id
        const isPending = isLoading === status.id
        
        let colorClasses = ""
        if (isActive) {
          switch (status.color) {
            case 'blue': colorClasses = 'bg-hack-sky/20 text-hack-ink border-hack-sky/50 shadow-sm font-bold'; break;
            case 'indigo': colorClasses = 'bg-hack-ink text-hack-surface border-hack-ink shadow-sm font-bold'; break;
            case 'orange': colorClasses = 'bg-hack-gold/20 text-hack-gold-dark border-hack-gold/50 shadow-sm font-bold'; break;
            case 'emerald': colorClasses = 'bg-hack-mint/20 text-hack-mint-dark border-hack-mint/50 shadow-sm font-bold'; break;
          }
        } else {
          colorClasses = 'bg-hack-surface text-hack-subtext border-hack-muted/40 hover:border-hack-muted hover:bg-hack-sand'
        }

        return (
          <button
            key={status.id}
            onClick={(e) => handleStatusChange(status.id, e)}
            disabled={!!isLoading}
            className={cn(
              "flex-1 min-w-[56px] flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-md border transition-all font-mono text-[9px] sm:text-[10px] uppercase tracking-wider",
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
      <div className="flex-1 min-w-[56px] relative" ref={dropdownRef}>
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
                ? "bg-hack-gold/20 text-hack-gold-dark border-hack-gold/50 shadow-sm font-bold"
                : activeStatus === 'finalist'
                ? "bg-hack-coral/15 text-hack-coral-dark border-hack-coral/40 shadow-sm font-bold"
                : "bg-hack-sky/20 text-hack-ink border-hack-sky/50 shadow-sm font-bold"
              : "bg-hack-surface text-hack-subtext border-hack-muted/40 hover:border-hack-muted hover:bg-hack-sand",
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
          <div className="absolute right-0 bottom-full mb-1 sm:bottom-auto sm:top-full sm:mt-1 w-44 bg-hack-surface rounded-xl border border-hack-muted/60 shadow-hack-dialog z-50 p-1.5 space-y-1 font-mono text-xs">
            <div className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-hack-subtext border-b border-hack-muted/30">
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
                    "w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium text-left transition-colors",
                    isSelected 
                      ? "bg-hack-ink text-hack-surface font-bold" 
                      : "bg-transparent text-hack-ink hover:bg-hack-sand"
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
