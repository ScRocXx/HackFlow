'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface CountdownTimerProps {
  deadline?: string | null
  windowStart?: string | null
  windowEnd?: string | null
  className?: string
  showMilestoneLabel?: boolean
  onMilestoneChange?: (milestone: 'kickoff' | 'submission' | 'passed') => void
}

export function CountdownTimer({ 
  deadline, 
  windowStart, 
  windowEnd, 
  className,
  showMilestoneLabel = false,
  onMilestoneChange
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    isPast: boolean
    invalid: boolean
    milestone: 'kickoff' | 'submission' | 'passed'
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false,
    invalid: false,
    milestone: 'submission',
  })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const updateTimer = () => {
      const now = new Date()
      
      // Parse potential dates
      const startDate = windowStart ? new Date(windowStart) : null
      const hasValidStart = startDate && !isNaN(startDate.getTime())
      
      const effectiveDeadlineStr = windowEnd || deadline
      const endDate = effectiveDeadlineStr ? new Date(effectiveDeadlineStr) : null
      const hasValidEnd = endDate && !isNaN(endDate.getTime())

      if (!hasValidStart && !hasValidEnd) {
        setTimeLeft(prev => ({ ...prev, invalid: true }))
        return
      }

      // Dynamic milestone transition (Runtime Safeguard 3):
      // If window_start is in the future, count down to kickoff!
      // Once now >= window_start, automatically pivot to window_end / submission deadline.
      let targetDate: Date
      let currentMilestone: 'kickoff' | 'submission' | 'passed'

      if (hasValidStart && now.getTime() < startDate.getTime()) {
        targetDate = startDate
        currentMilestone = 'kickoff'
      } else if (hasValidEnd) {
        targetDate = endDate
        currentMilestone = now.getTime() >= endDate.getTime() ? 'passed' : 'submission'
      } else {
        // Fallback
        targetDate = startDate!
        currentMilestone = 'passed'
      }

      if (onMilestoneChange) {
        onMilestoneChange(currentMilestone)
      }

      const diffMs = targetDate.getTime() - now.getTime()

      if (diffMs <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isPast: true,
          invalid: false,
          milestone: currentMilestone,
        })
        return
      }

      const totalSeconds = Math.floor(diffMs / 1000)
      const days = Math.floor(totalSeconds / (3600 * 24))
      const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60

      setTimeLeft({ 
        days, 
        hours, 
        minutes, 
        seconds, 
        isPast: false, 
        invalid: false,
        milestone: currentMilestone 
      })
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [deadline, windowStart, windowEnd, onMilestoneChange])

  if (!mounted) {
    return <div className="h-7 w-28 bg-[#e4e5da] border-2 border-[#10201d] animate-pulse" />
  }

  if (timeLeft.invalid || (!deadline && !windowStart && !windowEnd)) {
    return (
      <span className={cn("text-xs text-[#34433f] font-mono", className)}>
        No active deadline
      </span>
    )
  }

  if (timeLeft.isPast) {
    return (
      <div className={cn("inline-flex items-center text-xs font-mono font-bold uppercase tracking-wider px-2.5 py-1 border-2 border-[#10201d] bg-[#e53927] text-[#f7f7f2] shadow-[2px_2px_0_#671912]", className)}>
        Deadline Passed
      </div>
    )
  }

  const { days, hours, minutes, seconds, milestone } = timeLeft
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

  return (
    <div className="flex flex-col gap-1">
      {showMilestoneLabel && (
        <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-[#34433f]">
          {milestone === 'kickoff' ? '🚀 Sprint Kickoff in:' : '⚡ Code Freeze in:'}
        </span>
      )}
      <div className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-[#10201d] font-mono font-bold text-xs select-none", bgClass, shadowClass, className)}>
        <div className="flex flex-col items-center">
          <span className="leading-tight text-sm font-extrabold">{pad(days)}</span>
          <span className="text-[9px] uppercase tracking-wider opacity-80">d</span>
        </div>
        <span className="opacity-50 font-bold -mt-1">:</span>
        <div className="flex flex-col items-center">
          <span className="leading-tight text-sm font-extrabold">{pad(hours)}</span>
          <span className="text-[9px] uppercase tracking-wider opacity-80">h</span>
        </div>
        <span className="opacity-50 font-bold -mt-1">:</span>
        <div className="flex flex-col items-center">
          <span className="leading-tight text-sm font-extrabold">{pad(minutes)}</span>
          <span className="text-[9px] uppercase tracking-wider opacity-80">m</span>
        </div>
        <span className="opacity-50 font-bold -mt-1">:</span>
        <div className="flex flex-col items-center">
          <span className="leading-tight text-sm font-extrabold">{pad(seconds)}</span>
          <span className="text-[9px] uppercase tracking-wider opacity-80">s</span>
        </div>
      </div>
    </div>
  )
}

