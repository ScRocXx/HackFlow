'use client'

import Link from 'next/link'
import { Clock, ArrowRight, CheckCircle } from 'lucide-react'
import { getDeadlineSeverity } from '@/lib/utils/deadline'
import { cn } from '@/lib/utils'

export interface UrgentItem {
  eventTitle: string
  eventId: string
  deliverableTitle: string
  deadline: Date
  stageName: string
  hoursLeft: number
}

export interface NextUpStripProps {
  userName?: string
  items: UrgentItem[]
}

export function NextUpStrip({ userName, items }: NextUpStripProps) {
  const firstName = userName?.trim().split(' ')[0] || 'there'
  const urgentCount = items.length

  return (
    <div className="border border-hack-muted/60 bg-hack-surface p-4 sm:p-5 rounded-xl shadow-hack-card space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-hack-muted/30 pb-3">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-hack-ink">
            Hey, {firstName}.
          </h2>
          <p className="font-sans text-xs sm:text-sm text-hack-subtext mt-0.5">
            {urgentCount > 0 
              ? `${urgentCount} thing${urgentCount === 1 ? '' : 's'} need attention today.`
              : 'All clear. Nothing urgent on your radar right now.'}
          </p>
        </div>
        <div className="flex items-center gap-2" aria-live="polite">
          {urgentCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-hack-coral/40 bg-hack-coral/15 text-hack-coral-dark font-mono text-xs font-bold uppercase tracking-wide shadow-hack-sm">
              <Clock className="w-3.5 h-3.5" />
              {urgentCount} {urgentCount === 1 ? 'due soon' : 'due soon'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-hack-mint/40 bg-hack-mint/25 text-hack-mint-dark font-mono text-xs font-bold uppercase tracking-wide shadow-hack-sm">
              <CheckCircle className="w-3.5 h-3.5" />
              All Clear
            </span>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="p-4 rounded-lg border border-dashed border-hack-muted bg-hack-sand/40 text-center font-mono text-xs text-hack-subtext">
          Nothing due in the next 72 hours. You&apos;re good. Keep building or explore next stages below.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {items.map((item, idx) => {
            const severity = getDeadlineSeverity(item.deadline)
            const hoursRounded = Math.max(1, Math.round(item.hoursLeft))
            const dueText = hoursRounded < 24 ? `Due in ${hoursRounded}h` : `Due in ${Math.round(hoursRounded / 24)}d ${hoursRounded % 24}h`

            return (
              <div 
                key={`${item.eventId}-${idx}`}
                className="border border-hack-muted/60 bg-hack-sand/40 p-4 rounded-xl shadow-hack-sm flex flex-col justify-between hover:shadow-hack-hero hover:-translate-y-0.5 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={cn(
                      "font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border",
                      severity.severity === 'critical' ? "bg-hack-red/15 border-hack-red/40 text-hack-red" :
                      severity.severity === 'attention' ? "bg-hack-gold/25 border-hack-gold/40 text-hack-gold-dark" :
                      "bg-hack-blue/20 border-hack-blue/40 text-hack-blue-dark"
                    )}>
                      {dueText}
                    </span>
                    <span className="font-mono text-[10px] font-medium text-hack-subtext truncate">
                      {item.stageName}
                    </span>
                  </div>

                  <h3 className="font-display text-base font-bold text-hack-ink line-clamp-2 leading-snug group-hover:text-hack-coral-dark transition-colors">
                    {item.deliverableTitle}
                  </h3>

                  <p className="font-mono text-xs text-hack-subtext font-medium truncate mt-1">
                    {item.eventTitle}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-hack-muted/30 flex items-center justify-end">
                  <Link
                    href={`/events/${item.eventId}`}
                    prefetch={true}
                    className="inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase text-hack-ink hover:text-hack-coral-dark transition-colors"
                  >
                    Open Workspace <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
