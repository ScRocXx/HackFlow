import { format } from 'date-fns'

export interface DeadlineSeverity {
  label: string
  className: string
  severity: 'passed' | 'critical' | 'attention' | 'normal'
  hoursLeft: number
}

export function getDeadlineSeverity(deadlineInput: Date | string | null | undefined): DeadlineSeverity {
  if (!deadlineInput) {
    return {
      label: 'TBA',
      className: 'text-[#34433f]',
      severity: 'normal',
      hoursLeft: Infinity,
    }
  }

  const deadline = typeof deadlineInput === 'string' ? new Date(deadlineInput) : deadlineInput
  const now = Date.now()
  const dl = deadline.getTime()
  
  if (isNaN(dl)) {
    return {
      label: 'TBA',
      className: 'text-[#34433f]',
      severity: 'normal',
      hoursLeft: Infinity,
    }
  }

  const diff = dl - now

  if (diff < 0) {
    const passedDate = format(deadline, 'dd MMM')
    return {
      label: `Missed on ${passedDate}`,
      className: 'text-[#34433f]/70 line-through',
      severity: 'passed',
      hoursLeft: diff / (1000 * 60 * 60),
    }
  }

  const hours = diff / (1000 * 60 * 60)

  if (hours < 6) {
    const h = Math.floor(hours)
    const m = Math.floor((hours - h) * 60)
    return {
      label: `${h}h ${m}m left`,
      className: 'text-[#e53927] font-bold animate-pulse-subtle',
      severity: 'critical',
      hoursLeft: hours,
    }
  }

  if (hours < 72) {
    return {
      label: `${Math.round(hours)}h left`,
      className: 'text-[#8a5d13] font-bold',
      severity: 'attention',
      hoursLeft: hours,
    }
  }

  const days = Math.floor(hours / 24)
  const remainHours = Math.floor(hours % 24)
  return {
    label: `${days}d ${remainHours}h left`,
    className: 'text-[#34433f]',
    severity: 'normal',
    hoursLeft: hours,
  }
}
