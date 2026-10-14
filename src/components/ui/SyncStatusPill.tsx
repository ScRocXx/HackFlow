'use client'

import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useSyncStatus } from '@/lib/offline/outbox'
import { cn } from '@/lib/utils'

export function SyncStatusPill({ className }: { className?: string }) {
  const { syncState, pendingCount, retrySync } = useSyncStatus()

  if (syncState === 'synced' && pendingCount === 0) {
    return null
  }

  return (
    <div
      onClick={() => syncState === 'offline' && retrySync()}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[11px] font-semibold transition-all select-none cursor-pointer border shadow-sm",
        syncState === 'offline' &&
          "bg-hack-gold/20 text-hack-gold-dark border-hack-gold/40 hover:bg-hack-gold/30",
        syncState === 'syncing' &&
          "bg-hack-sky/25 text-hack-blue-dark border-hack-sky/50",
        className
      )}
      title={syncState === 'offline' ? "Click to retry syncing pending mutations" : "Syncing..."}
    >
      {syncState === 'offline' && (
        <>
          <WifiOff className="w-3.5 h-3.5 shrink-0 text-hack-gold-dark" />
          <span>Offline · {pendingCount} change{pendingCount === 1 ? '' : 's'} saved on device</span>
        </>
      )}

      {syncState === 'syncing' && (
        <>
          <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin text-hack-blue-dark" />
          <span>Back online · syncing...</span>
        </>
      )}
    </div>
  )
}
