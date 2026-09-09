'use client'

import { useState, useEffect } from 'react'
import { differenceInDays, differenceInHours, differenceInMinutes, differenceInSeconds, isPast } from 'date-fns'
import { cn } from '@/lib/utils'

interface CountdownTimerProps {
  deadline: string
  className?: string
}

export function CountdownTimer({ deadline, className }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false
  })
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const targetDate = new Date(deadline)

    const updateTimer = () => {
      if (isPast(targetDate)) {
        setTimeLeft(prev => ({ ...prev, isPast: true }))
        return
      }

      const now = new Date()
      const days = differenceInDays(targetDate, now)
      const hours = differenceInHours(targetDate, now) % 24
      const minutes = differenceInMinutes(targetDate, now) % 60
      const seconds = differenceInSeconds(targetDate, now) % 60

      setTimeLeft({ days, hours, minutes, seconds, isPast: false })
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)

    return () => clearInterval(interval)
  }, [deadline])

  if (!mounted) return null

  if (timeLeft.isPast) {
    return (
      <div className={cn("font-medium text-red-500", className)}>
        Deadline Passed
      </div>
    )
  }

  const { days, hours, minutes, seconds } = timeLeft
  const totalHours = days * 24 + hours

  let colorClass = "text-green-500"
  if (days < 3 && days >= 1) colorClass = "text-yellow-500"
  else if (days < 1 && totalHours >= 6) colorClass = "text-red-500"
  else if (totalHours < 6) colorClass = "text-red-600 animate-pulse"

  const pad = (num: number) => num.toString().padStart(2, '0')

  return (
    <div className={cn("flex items-center gap-2 font-mono font-medium", colorClass, className)}>
      <div className="flex flex-col items-center">
        <span>{pad(days)}</span>
        <span className="text-[10px] text-slate-400 font-sans uppercase">Days</span>
      </div>
      <span className="mb-4">:</span>
      <div className="flex flex-col items-center">
        <span>{pad(hours)}</span>
        <span className="text-[10px] text-slate-400 font-sans uppercase">Hrs</span>
      </div>
      <span className="mb-4">:</span>
      <div className="flex flex-col items-center">
        <span>{pad(minutes)}</span>
        <span className="text-[10px] text-slate-400 font-sans uppercase">Min</span>
      </div>
      <span className="mb-4">:</span>
      <div className="flex flex-col items-center">
        <span>{pad(seconds)}</span>
        <span className="text-[10px] text-slate-400 font-sans uppercase">Sec</span>
      </div>
    </div>
  )
}
