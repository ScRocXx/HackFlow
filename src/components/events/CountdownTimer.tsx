'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface CountdownTimerProps {
  deadline?: string | null
  className?: string
}

export function CountdownTimer({ deadline, className }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
    isPast: boolean
    invalid: boolean
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false,
    invalid: false,
  })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    if (!deadline) {
      setTimeLeft(prev => ({ ...prev, invalid: true }))
      return
    }

    const targetDate = new Date(deadline)
    if (isNaN(targetDate.getTime())) {
      setTimeLeft(prev => ({ ...prev, invalid: true }))
      return
    }

    const updateTimer = () => {
      const now = new Date()
      const diffMs = targetDate.getTime() - now.getTime()

      if (diffMs <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isPast: true,
          invalid: false,
        })
        return
      }

      const totalSeconds = Math.floor(diffMs / 1000)
      const days = Math.floor(totalSeconds / (3600 * 24))
      const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600)
      const minutes = Math.floor((totalSeconds % 3600) / 60)
      const seconds = totalSeconds % 60

      setTimeLeft({ days, hours, minutes, seconds, isPast: false, invalid: false })
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [deadline])

  if (!mounted) {
    return <div className="h-6 w-24 bg-slate-100 animate-pulse rounded" />
  }

  if (timeLeft.invalid || !deadline) {
    return (
      <span className={cn("text-xs text-slate-400 font-sans", className)}>
        No active deadline
      </span>
    )
  }

  if (timeLeft.isPast) {
    return (
      <div className={cn("inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700", className)}>
        Deadline Passed
      </div>
    )
  }

  const { days, hours, minutes, seconds } = timeLeft
  const totalHours = days * 24 + hours

  let colorClass = "text-emerald-600"
  let bgBadge = "bg-emerald-50 border-emerald-200"
  if (days < 3 && days >= 1) {
    colorClass = "text-amber-600"
    bgBadge = "bg-amber-50 border-amber-200"
  } else if (days < 1 && totalHours >= 6) {
    colorClass = "text-rose-600"
    bgBadge = "bg-rose-50 border-rose-200"
  } else if (totalHours < 6) {
    colorClass = "text-red-600 animate-pulse font-bold"
    bgBadge = "bg-red-50 border-red-300"
  }

  const pad = (num: number) => num.toString().padStart(2, '0')

  return (
    <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-mono font-medium text-xs", bgBadge, colorClass, className)}>
      <div className="flex flex-col items-center">
        <span className="leading-tight">{pad(days)}</span>
        <span className="text-[8px] opacity-70 font-sans uppercase">d</span>
      </div>
      <span className="opacity-40 -mt-1">:</span>
      <div className="flex flex-col items-center">
        <span className="leading-tight">{pad(hours)}</span>
        <span className="text-[8px] opacity-70 font-sans uppercase">h</span>
      </div>
      <span className="opacity-40 -mt-1">:</span>
      <div className="flex flex-col items-center">
        <span className="leading-tight">{pad(minutes)}</span>
        <span className="text-[8px] opacity-70 font-sans uppercase">m</span>
      </div>
      <span className="opacity-40 -mt-1">:</span>
      <div className="flex flex-col items-center">
        <span className="leading-tight">{pad(seconds)}</span>
        <span className="text-[8px] opacity-70 font-sans uppercase">s</span>
      </div>
    </div>
  )
}
