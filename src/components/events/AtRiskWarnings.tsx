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
    <div className="border border-hack-muted/60 bg-hack-surface p-4 sm:p-5 rounded-xl shadow-hack-card space-y-3" role="region" aria-label="At risk warnings">
      <div className="flex items-center justify-between gap-2 border-b border-hack-muted/30 pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-hack-gold-dark shrink-0" />
          <h3 className="font-display text-base sm:text-lg font-bold tracking-tight text-hack-ink">
            {risks.length} {risks.length === 1 ? 'thing could bite you later' : 'things could bite you later'}
          </h3>
        </div>
        <span className="font-mono text-[10px] sm:text-[11px] font-semibold text-hack-subtext uppercase">
          Review & Unblock
        </span>
      </div>

      {risks.length === 1 ? (
        <div
          role={risks[0].severity === 'critical' ? 'alert' : undefined}
          aria-live={risks[0].severity === 'critical' ? 'assertive' : undefined}
          className={cn(
            "p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-hack-sm transition-all hover:shadow-hack-hero",
            risks[0].severity === 'critical'
              ? "bg-hack-red/10 border-l-4 border-l-hack-red border-y-hack-muted/60 border-r-hack-muted/60"
              : "bg-hack-sand/50 border-l-4 border-l-hack-gold border-y-hack-muted/60 border-r-hack-muted/60"
          )}
        >
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            <span className={cn(
              "font-mono text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0",
              risks[0].severity === 'critical'
                ? "bg-hack-red/20 border-hack-red/40 text-hack-red"
                : "bg-hack-gold/25 border-hack-gold/40 text-hack-gold-dark"
            )}>
              {risks[0].severity === 'critical' ? 'CRITICAL' : 'WARNING'}
            </span>
            <span className="font-mono text-xs font-bold text-hack-ink">
              {risks[0].eventTitle}:
            </span>
            <span className="font-mono text-xs text-hack-ink">
              {risks[0].message}
            </span>
          </div>

          <Link
            href={`/events/${risks[0].eventId}`}
            prefetch={true}
            className="inline-flex items-center gap-1 font-mono text-xs font-bold uppercase px-3 py-1.5 bg-white text-hack-ink border border-hack-ink rounded-lg shadow-hack-sm hover:bg-hack-gold shrink-0 transition-colors"
          >
            Fix this <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className={cn(
          "grid gap-3",
          risks.length === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        )}>
          {risks.map((risk, index) => (
            <div
              key={`${risk.eventId}-${index}`}
              role={risk.severity === 'critical' ? 'alert' : undefined}
              aria-live={risk.severity === 'critical' ? 'assertive' : undefined}
              className={cn(
                "p-3.5 rounded-xl border flex flex-col justify-between shadow-hack-sm transition-all hover:shadow-hack-hero",
                risk.severity === 'critical' 
                  ? "bg-hack-red/10 border-l-4 border-l-hack-red border-y-hack-muted/60 border-r-hack-muted/60" 
                  : "bg-hack-sand/50 border-l-4 border-l-hack-gold border-y-hack-muted/60 border-r-hack-muted/60"
              )}
            >
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap min-w-0">
                  <span className={cn(
                    "font-mono text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border shrink-0",
                    risk.severity === 'critical' 
                      ? "bg-hack-red/20 border-hack-red/40 text-hack-red" 
                      : "bg-hack-gold/25 border-hack-gold/40 text-hack-gold-dark"
                  )}>
                    {risk.severity === 'critical' ? 'CRITICAL' : 'WARNING'}
                  </span>
                  <span className="font-mono text-[11px] font-bold text-hack-ink truncate min-w-0 flex-1" title={risk.eventTitle}>
                    {risk.eventTitle}
                  </span>
                </div>
                <p className="font-mono text-xs text-hack-ink font-medium leading-snug">
                  {risk.message}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-hack-muted/30 flex justify-end">
                <Link
                  href={`/events/${risk.eventId}`}
                  prefetch={true}
                  className="inline-flex items-center gap-1 font-mono text-[11px] font-bold uppercase text-hack-ink hover:text-hack-coral-dark transition-colors"
                >
                  Fix this <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
