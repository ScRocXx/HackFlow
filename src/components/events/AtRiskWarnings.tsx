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
    <div className="border-2 border-[#10201d] bg-[#f7f7f2] p-4 sm:p-5 shadow-[5px_5px_0_#671912] space-y-3">
      <div className="flex items-center justify-between gap-2 border-b-2 border-[#10201d]/15 pb-2.5">
        <div className="flex items-center gap-2 text-[#e53927]">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <h3 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight text-[#10201d]">
            At Risk ({risks.length})
          </h3>
        </div>
        <span className="font-mono text-[10px] sm:text-[11px] font-bold text-[#e53927] uppercase">
          {risks.length === 1 ? '1 issue needs review' : `${risks.length} issues need review`}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {risks.map((risk, index) => (
          <div
            key={`${risk.eventId}-${index}`}
            className={cn(
              "p-3.5 border-2 border-[#10201d] flex flex-col justify-between shadow-[3px_3px_0_#10201d]",
              risk.severity === 'critical' ? "bg-[#f6c4c1]" : "bg-[#fef9e7]"
            )}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className={cn(
                  "font-mono text-[9px] font-black uppercase px-1.5 py-0.5 border border-[#10201d]",
                  risk.severity === 'critical' ? "bg-[#e53927] text-white" : "bg-[#f5b726] text-[#10201d]"
                )}>
                  {risk.severity === 'critical' ? 'CRITICAL' : 'WARNING'}
                </span>
                <span className="font-mono text-[11px] font-bold text-[#10201d] truncate">
                  {risk.eventTitle}
                </span>
              </div>
              <p className="font-mono text-xs text-[#10201d] font-semibold leading-snug">
                {risk.message}
              </p>
            </div>

            <div className="mt-3 pt-2 border-t border-[#10201d]/20 flex justify-end">
              <Link
                href={`/events/${risk.eventId}`}
                prefetch={true}
                className="inline-flex items-center gap-1 font-mono text-[11px] font-black uppercase text-[#10201d] hover:text-[#e53927] transition-colors"
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
