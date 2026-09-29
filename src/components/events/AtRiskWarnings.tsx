'use client'

import Link from 'next/link'
import { AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface RiskItem {
  eventTitle: string
  eventId: string
  message: string
  severity: 'warning' | 'critical'
}

export interface AtRiskWarningsProps {
  risks: RiskItem[]
}

export function AtRiskWarnings({ risks }: AtRiskWarningsProps) {
  if (!risks || risks.length === 0) return null

  return (
    <div className="border-2 border-hack-ink bg-hack-panel p-4 sm:p-5 shadow-hack-panel space-y-3" role="region" aria-label="At risk warnings">
      <div className="flex items-center justify-between gap-2 border-b-2 border-hack-ink/15 pb-2.5">
        <div className="flex items-center gap-2 text-hack-rust">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <h3 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-hack-ink">
            At Risk ({risks.length})
          </h3>
        </div>
        <span className="font-mono text-[10px] sm:text-[11px] font-bold text-hack-rust uppercase">
          {risks.length === 1 ? '1 issue needs review' : `${risks.length} issues need review`}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {risks.map((risk, index) => (
          <div
            key={`${risk.eventId}-${index}`}
            role={risk.severity === 'critical' ? 'alert' : undefined}
            aria-live={risk.severity === 'critical' ? 'assertive' : undefined}
            className={cn(
              "p-3.5 border-2 border-hack-ink flex flex-col justify-between shadow-hack-chip",
              risk.severity === 'critical' ? "bg-[#f6c4c1]" : "bg-[#fef9e7]"
            )}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className={cn(
                  "font-mono text-[9px] font-black uppercase px-1.5 py-0.5 border border-hack-ink",
                  risk.severity === 'critical' ? "bg-hack-rust text-white" : "bg-hack-gold text-hack-ink"
                )}>
                  {risk.severity === 'critical' ? 'CRITICAL' : 'WARNING'}
                </span>
                <span className="font-mono text-[11px] font-bold text-hack-ink truncate">
                  {risk.eventTitle}
                </span>
              </div>
              <p className="font-mono text-xs text-hack-ink font-semibold leading-snug">
                {risk.message}
              </p>
            </div>

            <div className="mt-3 pt-2 border-t border-hack-ink/20 flex justify-end">
              <Link
                href={`/events/${risk.eventId}`}
                prefetch={true}
                className="inline-flex items-center gap-1 font-mono text-[11px] font-black uppercase text-hack-ink hover:text-hack-rust transition-colors"
              >
                Resolve Now <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
