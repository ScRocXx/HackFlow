'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { cn } from '@/lib/utils'

interface CountdownTimerProps {
  deadline?: string | null
  windowStart?: string | null
  windowEnd?: string | null
  className?: string
  showMilestoneLabel?: boolean
  showTimezoneBadge?: boolean
  onMilestoneChange?: (milestone: 'kickoff' | 'submission' | 'passed') => void
}

interface TimeLeft {
  diffMs: number
  days: number
  hours: number
  minutes: number
  seconds: number
  passed: boolean
}

function calculateTimeLeft(target: Date | null): TimeLeft {
  if (!target || isNaN(target.getTime())) {
    return { diffMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, passed: true }
  }
  const now = Date.now()
  const diffMs = target.getTime() - now
  if (diffMs <= 0) {
    return { diffMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, passed: true }
  }
  const totalSeconds = Math.floor(diffMs / 1000)
  const days = Math.floor(totalSeconds / (3600 * 24))
  const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return { diffMs, days, hours, minutes, seconds, passed: false }
}

export function CountdownTimer({ 
  deadline, 
  windowStart, 
  windowEnd, 
  className,
  showMilestoneLabel = false,
  showTimezoneBadge = false,
  onMilestoneChange
}: CountdownTimerProps) {
  const hasAnyDate = Boolean(deadline?.trim() || windowStart?.trim() || windowEnd?.trim())
  const [mounted, setMounted] = useState(false)
  const lastMilestoneRef = useRef<'kickoff' | 'submission' | 'passed' | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Resolve targetDate based on deadline and windowStart
  const targetDate = useMemo(() => {
    const sDate = windowStart ? new Date(windowStart) : null
    const validStart = Boolean(sDate && !isNaN(sDate.getTime()))
    
    const effStr = windowEnd || deadline
    const eDate = effStr ? new Date(effStr) : null
    const validEnd = Boolean(eDate && !isNaN(eDate.getTime()))

    const now = Date.now()
    if (sDate && validStart && now < sDate.getTime()) {
      return sDate
    } else if (eDate && validEnd) {
      return eDate
    } else if (sDate && validStart) {
      return sDate
    }
    return null
  }, [deadline, windowStart, windowEnd])

  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calculateTimeLeft(targetDate))

  // Timer Reactivity: Ensure useEffect has [targetDate] in its dependency array
  // and calls setTimeLeft(calculateTimeLeft(targetDate)) immediately upon prop change.
  useEffect(() => {
    setTimeLeft(calculateTimeLeft(targetDate))

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate))
    }, 1000)

    return () => clearInterval(interval)
  }, [targetDate])

  const currentMilestone: 'kickoff' | 'submission' | 'passed' = useMemo(() => {
    const now = Date.now()
    const sDate = windowStart ? new Date(windowStart) : null
    const validStart = Boolean(sDate && !isNaN(sDate.getTime()))
    
    const effStr = windowEnd || deadline
    const eDate = effStr ? new Date(effStr) : null
    const validEnd = Boolean(eDate && !isNaN(eDate.getTime()))

    if (sDate && validStart && now < sDate.getTime()) {
      return 'kickoff'
    } else if (eDate && validEnd) {
      return now >= eDate.getTime() ? 'passed' : 'submission'
    } else if (sDate && validStart) {
      return 'passed'
    }
    return 'submission'
  }, [deadline, windowStart, windowEnd, timeLeft.passed])

  if (lastMilestoneRef.current !== currentMilestone) {
    lastMilestoneRef.current = currentMilestone
    if (onMilestoneChange) {
      setTimeout(() => onMilestoneChange(currentMilestone), 0)
    }
  }

  if (!hasAnyDate || !targetDate) {
    return (
      <div className={cn("inline-flex items-center gap-1 text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 border-2 border-[#10201d] bg-[#e4e5da] text-[#10201d] shadow-[2px_2px_0_#10201d] select-none", className)}>
        <span>📅 Dates TBA</span>
      </div>
    )
  }

  if (!mounted) {
    return <div className="h-7 w-28 bg-[#e4e5da] border-2 border-[#10201d] animate-pulse" />
  }

  if (timeLeft.passed || timeLeft.diffMs <= 0 || currentMilestone === 'passed') {
    return (
      <div 
        role="status"
        aria-label="Deadline passed"
        className={cn("inline-flex items-center text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 border-2 border-[#10201d] bg-[#e53927] text-[#f7f7f2] shadow-[2px_2px_0_#671912]", className)}
      >
        Deadline Passed
      </div>
    )
  }

  const { days, hours, minutes, seconds } = timeLeft
  const milestone = currentMilestone
  const totalHours = days * 24 + hours

  let bgClass = "bg-[#f7f7f2] text-[#10201d]"
  let shadowClass = "shadow-[3px_3px_0_#2e4742]"
  
  if (milestone === 'kickoff') {
    bgClass = "bg-[#8bb2de] text-[#10201d]"
    shadowClass = "shadow-[3px_3px_0_#10201d]"
  } else if (days < 3 && days >= 1) {
    bgClass = "bg-[#f5b726] text-[#10201d]"
    shadowClass = "shadow-[3px_3px_0_#8a5d13]"
  } else if (days < 1 && totalHours >= 6) {
    bgClass = "bg-[#e97b77] text-[#10201d]"
    shadowClass = "shadow-[3px_3px_0_#671912]"
  } else if (totalHours < 6) {
    bgClass = "bg-[#e53927] text-[#f7f7f2] animate-pulse"
    shadowClass = "shadow-[3px_3px_0_#671912]"
  }

  const pad = (num: number) => num.toString().padStart(2, '0')

  // Screen-reader friendly time description
  const timeRemainingLabel = useMemo(() => {
    const parts: string[] = []
    if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`)
    if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`)
    if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`)
    parts.push(`${seconds} ${seconds === 1 ? 'second' : 'seconds'}`)
    const prefix = milestone === 'kickoff' ? 'Sprint kickoff in ' : 'Deadline in '
    return `${prefix}${parts.join(', ')}`
  }, [days, hours, minutes, seconds, milestone])

  return (
    <div className="flex flex-col gap-1">
      {showMilestoneLabel && (
        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#34433f]">
          {milestone === 'kickoff' ? '🚀 Sprint Kickoff in:' : '⚡ Code Freeze in:'}
        </span>
      )}
      <div 
        role="timer"
        aria-label={timeRemainingLabel}
        className={cn("inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 border-2 border-[#10201d] font-mono font-bold text-xs select-none max-w-full overflow-hidden", bgClass, shadowClass, className)}
      >
        <div className="flex flex-col items-center" aria-hidden="true">
          <span className="leading-tight text-xs sm:text-sm font-extrabold">{pad(days)}</span>
          <span className="text-[8px] sm:text-[9px] uppercase tracking-wider opacity-80">d</span>
        </div>
        <span className="opacity-50 font-bold -mt-1 text-xs sm:text-sm" aria-hidden="true">:</span>
        <div className="flex flex-col items-center" aria-hidden="true">
          <span className="leading-tight text-xs sm:text-sm font-extrabold">{pad(hours)}</span>
          <span className="text-[8px] sm:text-[9px] uppercase tracking-wider opacity-80">h</span>
        </div>
        <span className="opacity-50 font-bold -mt-1 text-xs sm:text-sm" aria-hidden="true">:</span>
        <div className="flex flex-col items-center" aria-hidden="true">
          <span className="leading-tight text-xs sm:text-sm font-extrabold">{pad(minutes)}</span>
          <span className="text-[8px] sm:text-[9px] uppercase tracking-wider opacity-80">m</span>
        </div>
        <span className="opacity-50 font-bold -mt-1 text-xs sm:text-sm" aria-hidden="true">:</span>
        <div className="flex flex-col items-center" aria-hidden="true">
          <span className="leading-tight text-xs sm:text-sm font-extrabold">{pad(seconds)}</span>
          <span className="text-[8px] sm:text-[9px] uppercase tracking-wider opacity-80">s</span>
        </div>
      </div>

      {showTimezoneBadge && targetDate && (
        <span className="font-mono text-[9px] text-[#34433f] font-semibold flex items-center gap-1 mt-0.5">
          <span className="px-1.5 py-0.5 border border-[#10201d]/30 bg-[#f7f7f2] font-bold text-[#10201d]">
            {new Intl.DateTimeFormat('en-US', {
              hour: 'numeric',
              minute: 'numeric',
              hour12: true,
              timeZoneName: 'short',
            }).format(targetDate)}
          </span>
          <span className="opacity-75">
            ({new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(targetDate)})
          </span>
        </span>
      )}
    </div>
  )
}
