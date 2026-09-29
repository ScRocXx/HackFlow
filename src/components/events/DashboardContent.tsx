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
          message: `${stage.title} has ${incomplete.length} unfinished tasks (${Math.round(hoursLeft)}h left).`,
          severity: hoursLeft < 12 ? 'critical' : 'warning'
        })
      }

      // Case 2: Deadline within 72h but zero deliverables created at all
      if (deliverables.length === 0 && hoursLeft < 72) {
        riskList.push({
          eventTitle: ev.title,
          eventId: ev.id,
          message: `${stage.title} checklist is empty (${Math.round(hoursLeft)}h left).`,
          severity: hoursLeft < 24 ? 'critical' : 'warning'
        })
      }
    }

    return riskList.slice(0, 3)
  }, [safeEvents])

  // Filter events for the board
  const filteredEvents = safeEvents.filter(ev => {
    if (selectedSquad !== 'all' && ev.squad_name !== selectedSquad) return false
    if (selectedFilter === 'all') return true
    if (selectedFilter === 'active') return ev.status === 'registered' || ev.status === 'building'
    if (selectedFilter === 'building') return ev.status === 'building'
    if (selectedFilter === 'submitted') return ev.status === 'submitted'
    if (selectedFilter === 'under_review') return ev.status === 'under_review'
    if (selectedFilter === 'finalist') return ev.status === 'finalist'
    if (selectedFilter === 'won') return ev.status === 'winner' || ev.status === 'runner_up'
    return ev.status === selectedFilter
  })

  const activeEventsCount = safeEvents.filter(e => e?.status === 'registered' || e?.status === 'building').length
  
  const totalDeliverables = safeEvents.reduce((acc, ev) => acc + (ev?.deliverable_progress?.total || 0), 0)
  const doneDeliverables = safeEvents.reduce((acc, ev) => acc + (ev?.deliverable_progress?.done || 0), 0)
  const completionRate = totalDeliverables ? Math.round((doneDeliverables / totalDeliverables) * 100) : 0

  const now = new Date()
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const upcomingDeadlinesCount = safeEvents.filter(ev => {
    if (!ev?.active_stage?.deadline) return false
    const d = new Date(ev.active_stage.actionable_deadline || ev.active_stage.deadline)
    return !isNaN(d.getTime()) && d >= now && d <= in7Days
  }).length

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

      {/* Compact Secondary Metrics Strip & Quick Ingest CTA */}
      <div className="border-2 border-[#10201d] bg-[#f7f7f2] p-3 sm:p-4 shadow-[4px_4px_0_#10201d] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap font-mono text-xs text-[#34433f]">
          <span className="font-bold text-[#10201d]">
            <strong className="text-base text-[#10201d] font-black">{activeEventsCount}</strong> active
          </span>
          <span className="text-[#10201d]/30 font-black">|</span>
          <span className="font-bold text-[#10201d]">
            <strong className="text-base text-[#10201d] font-black">{upcomingDeadlinesCount}</strong> deadlines this week
          </span>
          <span className="text-[#10201d]/30 font-black">|</span>
          <span className="font-bold text-[#10201d]">
            <strong className="text-base text-[#10201d] font-black">{doneDeliverables}/{totalDeliverables}</strong> tasks done ({completionRate}%)
          </span>
        </div>

        <div className="shrink-0">
          <Button 
            onClick={() => setIsDialogOpen(true)}
            size="sm"
            className="w-full sm:w-auto border-2 border-[#10201d] bg-[#e97b77] hover:bg-[#f6c4c1] active:scale-[0.98] text-[#10201d] font-mono text-xs font-black uppercase tracking-wide shadow-[3px_3px_0_#671912] active:translate-x-[1px] active:translate-y-[1px] hover:translate-x-[1px] hover:translate-y-[1px] px-4 h-9 flex items-center justify-center gap-1.5 touch-manipulation"
          >
            <span className="text-base font-bold">+</span> Paste Hackathon Link
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Section Header with Horizontal Scroll on Mobile */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2.5 sm:gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth pb-1 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap">
            <div className="flex items-center gap-1.5 shrink-0 sm:shrink sm:flex-wrap">
              {filters.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFilter(f.id)}
                  className={cn(
                    "font-mono text-xs font-bold uppercase tracking-wider px-2.5 sm:px-3 py-1.5 border-2 border-[#10201d] transition-all whitespace-nowrap shrink-0 active:scale-95 touch-manipulation",
                    selectedFilter === f.id
                      ? "bg-[#f5b726] text-[#10201d] shadow-[2px_2px_0_#8a5d13]"
                      : "bg-[#f7f7f2] text-[#34433f] hover:bg-[#e4e5da] active:bg-[#e4e5da]"
                  )}
                >
                  {f.label} ({f.count})
                </button>
              ))}
            </div>

            {availableSquads.length > 0 && (
              <div className="flex items-center gap-1.5 border-2 border-[#10201d] bg-[#f7f7f2] px-2 py-1 shadow-[2px_2px_0_#10201d] shrink-0">
                <span className="font-mono text-xs font-bold text-[#10201d]">Squad:</span>
                <select
                  value={selectedSquad}
                  onChange={(e) => setSelectedSquad(e.target.value)}
                  className="font-mono text-xs font-bold bg-white border border-[#10201d] px-1 py-0.5 focus:outline-none"
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

          <p className="font-mono text-xs text-[#34433f] shrink-0">
            Showing {filteredEvents.length} of {safeEvents.length} total
          </p>
        </div>

        {/* Events Grid */}
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-[#10201d] bg-[#f7f7f2] shadow-[7px_7px_0_#671912]">
            <div className="h-16 w-16 bg-[#8bb2de] border-2 border-[#10201d] shadow-[3px_3px_0_#2e4742] flex items-center justify-center mb-4 text-[#10201d]">
              <Trophy className="h-8 w-8" />
            </div>
            <h3 className="font-display text-2xl font-bold text-[#10201d]">
              {safeEvents.length === 0 ? 'Nothing here yet' : 'No competitions match this filter'}
            </h3>
            <p className="mt-2 font-mono text-xs text-[#34433f] max-w-sm">
              {safeEvents.length === 0 
                ? "Paste your first hackathon link and we'll build the workspace for you."
                : 'Try selecting a different filter above or add another hackathon.'}
            </p>
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="mt-6 font-mono text-xs font-bold border-2 border-[#10201d] bg-[#e97b77] text-[#10201d] shadow-[3px_3px_0_#671912]"
            >
              + Paste Hackathon Link
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
