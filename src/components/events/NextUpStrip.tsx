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
    <div className="border-2 border-hack-ink bg-hack-panel p-4 sm:p-5 shadow-hack-panel space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-hack-ink/15 pb-3">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-hack-ink">
            Hey, {firstName}.
          </h2>
        </div>
        <div className="flex items-center gap-2" aria-live="polite">
          {urgentCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 border-2 border-hack-ink bg-hack-gold text-hack-ink font-mono text-xs font-black uppercase tracking-wide shadow-hack-chip">
              <Clock className="w-3.5 h-3.5" />
              {urgentCount} {urgentCount === 1 ? 'thing needs' : 'things need'} attention
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 border-2 border-hack-ink bg-[#93C9B8] text-hack-ink font-mono text-xs font-black uppercase tracking-wide shadow-hack-chip">
              <CheckCircle className="w-3.5 h-3.5" />
              All clear right now
            </span>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="p-4 border-2 border-dashed border-hack-ink/30 bg-hack-sand text-center font-mono text-xs text-hack-subtext">
          Nothing due in the next 72 hours. You&apos;re good. Keep building or explore next stages below.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {items.map((item, idx) => {
            const severity = getDeadlineSeverity(item.deadline)
            return (
              <div 
                key={`${item.eventId}-${idx}`}
                className="border-2 border-hack-ink bg-hack-sand p-3.5 shadow-hack-chip flex flex-col justify-between hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0_#10201d] transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={cn(
                      "font-mono text-[10px] font-black uppercase px-2 py-0.5 border border-hack-ink",
                      severity.severity === 'critical' ? "bg-hack-rust text-hack-panel" :
                      severity.severity === 'attention' ? "bg-hack-gold text-hack-ink" :
                      "bg-hack-sky text-hack-ink"
                    )}>
                      {severity.label}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-hack-subtext truncate">
                      {item.stageName}
                    </span>
                  </div>

                  <h3 className="font-display text-base font-bold text-hack-ink line-clamp-2 leading-snug group-hover:text-hack-rust transition-colors">
                    {item.deliverableTitle}
                  </h3>

                  <p className="font-mono text-xs text-hack-subtext font-semibold truncate mt-1">
                    {item.eventTitle}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-hack-ink/15 flex items-center justify-end">
                  <Link
                    href={`/events/${item.eventId}`}
                    prefetch={true}
                    className="inline-flex items-center gap-1 font-mono text-[11px] font-black uppercase text-hack-ink hover:text-hack-rust transition-colors"
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
