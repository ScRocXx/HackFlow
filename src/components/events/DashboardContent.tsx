'use client'

import { useState, useMemo } from 'react'
import { Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EventCard } from '@/components/events/EventCard'
import { NextUpStrip, type UrgentItem } from '@/components/events/NextUpStrip'
import { AtRiskWarnings, type RiskItem } from '@/components/events/AtRiskWarnings'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import type { Event, EventStage } from '@/lib/supabase/types'
import { computeActiveStage } from '@/lib/utils/active-stage'

const URLParseDialog = dynamic(
  () => import('@/components/events/URLParseDialog').then(mod => mod.URLParseDialog),
  { ssr: false }
)

type ExtendedEvent = Event & {
  active_stage?: EventStage & {
    stage_deliverables?: Array<{ id: string; title: string; is_done: boolean }>
  }
  stages?: Array<EventStage & {
    stage_deliverables?: Array<{ id: string; title: string; is_done: boolean }>
  }>
  deliverable_progress?: { done: number; total: number }
  team_count?: number
  squad_name?: string | null
}

interface DashboardContentProps {
  events: ExtendedEvent[]
  userName?: string
}

export function DashboardContent({ events = [], userName = '' }: DashboardContentProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [selectedSquad, setSelectedSquad] = useState<string>('all')

  const safeEvents = Array.isArray(events) ? events : []
  const availableSquads = Array.from(new Set(safeEvents.map(e => e.squad_name).filter(Boolean))) as string[]

  // 1.1 Compute Urgent Items across all active hackathons for Next Up strip
  const urgentItems: UrgentItem[] = useMemo(() => {
    const now = Date.now()
    const cutoff = now + 72 * 60 * 60 * 1000 // 72 hours
    const items: UrgentItem[] = []

    for (const ev of safeEvents) {
      if (['winner', 'runner_up', 'archived'].includes(ev.status)) continue

      const stage = (computeActiveStage(ev.stages, ev.active_stage_id || ev.active_stage?.id) || ev.active_stage) as typeof ev.active_stage
      if (!stage?.deadline) continue

      const dlStr = stage.actionable_deadline || stage.window_end || stage.deadline
      const dl = new Date(dlStr).getTime()
      if (isNaN(dl) || dl < now || dl > cutoff) continue

      const deliverables = stage.stage_deliverables || []
      const incomplete = deliverables.filter(d => !d.is_done)

      if (incomplete.length > 0) {
        items.push({
          eventTitle: ev.title,
          eventId: ev.id,
          deliverableTitle: incomplete[0].title || `${incomplete.length} deliverables pending`,
          deadline: new Date(dlStr),
          stageName: stage.title,
          hoursLeft: (dl - now) / (1000 * 60 * 60)
        })
      }
    }

    return items.sort((a, b) => a.hoursLeft - b.hoursLeft).slice(0, 3)
  }, [safeEvents])

  // 1.2 Compute At-Risk Deliverables and Deadlines
  const risks: RiskItem[] = useMemo(() => {
    const riskList: RiskItem[] = []
    const now = Date.now()

    for (const ev of safeEvents) {
      if (['winner', 'runner_up', 'archived', 'submitted'].includes(ev.status)) continue

      const stage = (computeActiveStage(ev.stages, ev.active_stage_id || ev.active_stage?.id) || ev.active_stage) as typeof ev.active_stage
      if (!stage?.deadline) continue

      const dlStr = stage.actionable_deadline || stage.window_end || stage.deadline
      const dl = new Date(dlStr).getTime()
      if (isNaN(dl) || dl < now) continue

      const hoursLeft = (dl - now) / (1000 * 60 * 60)
      const deliverables = stage.stage_deliverables || []
      const incomplete = deliverables.filter(d => !d.is_done)
      const total = deliverables.length
      const completionRate = total > 0 ? (total - incomplete.length) / total : 1

      // Case 1: Deadline within 48h with incomplete deliverables and < 50% completion
      if (hoursLeft < 48 && completionRate < 0.5 && incomplete.length > 0) {
        riskList.push({
          eventTitle: ev.title,
          eventId: ev.id,
          message: `${incomplete.length} deliverables pending with under 48h remaining (${Math.round(hoursLeft)}h left).`,
          severity: hoursLeft < 24 ? 'critical' : 'warning'
        })
      }

      // Case 2: Extreme urgency (< 24h) with any deliverables pending
      if (hoursLeft < 24 && incomplete.length > 0) {
        // avoid duplicate if already caught
        if (!riskList.some(r => r.eventId === ev.id)) {
          riskList.push({
            eventTitle: ev.title,
            eventId: ev.id,
            message: `Final freeze in ${Math.round(hoursLeft)}h! ${incomplete.length} deliverables remaining.`,
            severity: 'critical'
          })
        }
      }
    }

    return riskList.sort((a, b) => (b.severity === 'critical' ? 1 : 0) - (a.severity === 'critical' ? 1 : 0)).slice(0, 3)
  }, [safeEvents])

  // Filter events
  const filteredEvents = useMemo(() => {
    return safeEvents.filter(event => {
      // Squad filter
      if (selectedSquad !== 'all' && event.squad_name !== selectedSquad) {
        return false
      }

      // Status filter
      if (selectedFilter === 'all') return true
      if (selectedFilter === 'active') {
        return !['winner', 'runner_up', 'archived', 'submitted'].includes(event.status)
      }
      if (selectedFilter === 'submitted') return event.status === 'submitted'
      if (selectedFilter === 'under_review') return event.status === 'under_review'
      if (selectedFilter === 'finalist') return event.status === 'finalist'
      if (selectedFilter === 'won') return ['winner', 'runner_up'].includes(event.status)
      return true
    })
  }, [safeEvents, selectedFilter, selectedSquad])

  // Metrics
  const activeEventsCount = safeEvents.filter(e => !['winner', 'runner_up', 'archived', 'submitted'].includes(e.status)).length
  const upcomingDeadlinesCount = urgentItems.length

  const totalDeliverables = safeEvents.reduce((acc, ev) => acc + (ev.deliverable_progress?.total || 0), 0)
  const doneDeliverables = safeEvents.reduce((acc, ev) => acc + (ev.deliverable_progress?.done || 0), 0)
  const completionRate = totalDeliverables > 0 ? Math.round((doneDeliverables / totalDeliverables) * 100) : 0

  const filters = [
    { id: 'all', label: 'All', count: safeEvents.length },
    { id: 'active', label: 'Active', count: activeEventsCount },
    { id: 'submitted', label: 'Submitted', count: safeEvents.filter(e => e.status === 'submitted').length },
    { id: 'under_review', label: 'Under Review', count: safeEvents.filter(e => e.status === 'under_review').length },
    { id: 'finalist', label: 'Finalist', count: safeEvents.filter(e => e.status === 'finalist').length },
    { id: 'won', label: 'Won', count: safeEvents.filter(e => e.status === 'winner' || e.status === 'runner_up').length },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1.1 Next Up Urgency Strip (Control Room) */}
      <NextUpStrip userName={userName} items={urgentItems} />

      {/* 1.2 At-Risk Warning Callouts (Rendered conditionally when blockers exist) */}
      <AtRiskWarnings risks={risks} />

      {/* Compact Secondary Summary Chips & Add Action */}
      <div className="border border-hack-muted/60 bg-hack-surface p-3.5 sm:p-4 rounded-xl shadow-hack-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap font-mono text-xs text-hack-subtext">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-hack-sand border border-hack-muted/40 font-semibold text-hack-ink">
            <span className="w-2 h-2 rounded-full bg-hack-coral inline-block" />
            <strong className="text-hack-ink font-bold">{activeEventsCount}</strong> active
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-hack-sand border border-hack-muted/40 font-semibold text-hack-ink">
            <span className="w-2 h-2 rounded-full bg-hack-gold inline-block" />
            <strong className="text-hack-ink font-bold">{upcomingDeadlinesCount}</strong> due soon
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-hack-sand border border-hack-muted/40 font-semibold text-hack-ink">
            <span className="w-2 h-2 rounded-full bg-hack-mint inline-block" />
            <strong className="text-hack-ink font-bold">{completionRate}%</strong> team progress
          </span>
        </div>

        <div className="shrink-0">
          <Button 
            onClick={() => setIsDialogOpen(true)}
            size="sm"
            className="w-full sm:w-auto rounded-lg border border-hack-coral bg-hack-coral hover:brightness-105 active:scale-[0.98] text-hack-ink font-mono text-xs font-bold uppercase tracking-wider shadow-hack-hero px-4 h-9 flex items-center justify-center gap-1.5 touch-manipulation transition-all"
          >
            <span className="text-base font-bold">+</span> Add Hackathon
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Section Header with Horizontal Scroll on Mobile */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2.5 sm:gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
            <div className="flex items-center gap-1.5 shrink-0 sm:shrink sm:flex-wrap" role="tablist" aria-label="Hackathon status filter">
              {filters.map((f) => (
                <button
                  key={f.id}
                  role="tab"
                  aria-selected={selectedFilter === f.id}
                  onClick={() => setSelectedFilter(f.id)}
                  className={cn(
                    "font-mono text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all whitespace-nowrap shrink-0 active:scale-95 touch-manipulation",
                    selectedFilter === f.id
                      ? "bg-hack-gold/20 border-hack-gold text-hack-gold-dark font-bold shadow-hack-sm"
                      : "bg-hack-surface border-hack-muted/60 text-hack-subtext hover:bg-hack-sand hover:text-hack-ink"
                  )}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>

            {availableSquads.length > 0 && (
              <div className="flex items-center gap-1.5 border border-hack-muted/60 bg-hack-surface px-2.5 py-1 rounded-lg shadow-hack-sm shrink-0">
                <span className="font-mono text-xs font-bold text-hack-ink">Squad:</span>
                <select
                  value={selectedSquad}
                  onChange={(e) => setSelectedSquad(e.target.value)}
                  className="font-mono text-xs font-bold bg-transparent border-0 px-1 py-0.5 focus:outline-none text-hack-ink cursor-pointer"
                >
                  <option value="all">All Squads</option>
                  {availableSquads.map((sq) => (
                    <option key={sq} value={sq}>
                      {sq}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <p className="font-mono text-xs text-hack-subtext shrink-0">
            Showing {filteredEvents.length} of {safeEvents.length} competitions
          </p>
        </div>

        {/* Events Grid */}
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-hack-muted bg-hack-surface rounded-xl shadow-hack-sm">
            <div className="h-14 w-14 rounded-full bg-hack-sand border border-hack-muted flex items-center justify-center mb-3 text-hack-gold-dark">
              <Trophy className="h-7 w-7" />
            </div>
            <h3 className="font-display text-xl font-bold text-hack-ink">
              {safeEvents.length === 0 ? 'Nothing here yet.' : 'No competitions match this filter'}
            </h3>
            <p className="mt-1.5 font-sans text-xs sm:text-sm text-hack-subtext max-w-sm">
              {safeEvents.length === 0 
                ? "Nothing here yet. Add a hackathon to get started."
                : 'Try selecting a different filter above or add another hackathon.'}
            </p>
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="mt-5 font-mono text-xs font-bold rounded-lg border border-hack-coral bg-hack-coral text-hack-ink shadow-hack-hero hover:brightness-105"
            >
              + Add Hackathon
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>

      <URLParseDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
      />
    </div>
  )
}
