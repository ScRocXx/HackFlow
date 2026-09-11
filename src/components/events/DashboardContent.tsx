'use client'

import { useState } from 'react'
import { Link as LinkIcon, Trophy, Calendar, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EventCard } from '@/components/events/EventCard'
import { URLParseDialog } from '@/components/events/URLParseDialog'
import { cn } from '@/lib/utils'
import type { Event, EventStage } from '@/lib/supabase/types'

type ExtendedEvent = Event & {
  active_stage?: EventStage
  deliverable_progress?: { done: number; total: number }
  team_count?: number
}

interface DashboardContentProps {
  events: ExtendedEvent[]
}

export function DashboardContent({ events = [] }: DashboardContentProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<string>('all')

  const safeEvents = Array.isArray(events) ? events : []

  // Filter events
  const filteredEvents = safeEvents.filter(ev => {
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
    const d = new Date(ev.active_stage.deadline)
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
      {/* Console Header Bar */}
      <div className="border-2 border-[#10201d] bg-[#3d5f58] p-6 text-[#f7f7f2] shadow-[7px_7px_0_#671912] flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 bg-[#e53927] inline-block" />
            <span className="w-2.5 h-2.5 bg-[#8bb2de] inline-block" />
            <span className="w-2.5 h-2.5 bg-[#f5b726] inline-block" />
            <span className="w-2.5 h-2.5 bg-[#e97b77] inline-block" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#f6c4c1] ml-2">
              Squad Mission Control
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#f7f7f2]">
            Competitions & Deadlines
          </h1>
          <p className="font-mono text-xs text-[#8bb2de] mt-1">
            Real-time gatekeeper elimination stages, deliverable checklists, and submission proofs.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button 
            onClick={() => setIsDialogOpen(true)}
            size="lg"
            className="border-2 border-[#10201d] bg-[#e97b77] hover:bg-[#f6c4c1] text-[#10201d] font-mono text-xs font-bold uppercase tracking-wide shadow-[4px_4px_0_#671912] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#671912] px-6 h-12"
          >
            + Import Hackathon
          </Button>
        </div>
      </div>

      {/* Stats Metric Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Card className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[5px_5px_0_#671912]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-mono text-xs font-bold uppercase tracking-wider text-[#34433f]">Active Sprints</CardTitle>
            <div className="p-1.5 border-2 border-[#10201d] bg-[#8bb2de] text-[#10201d] shadow-[2px_2px_0_#2e4742]">
              <Trophy className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl sm:text-4xl font-extrabold text-[#10201d]">{activeEventsCount}</div>
            <p className="font-mono text-[11px] text-[#34433f] mt-1 font-bold">Currently registered & building</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[5px_5px_0_#671912]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-mono text-xs font-bold uppercase tracking-wider text-[#34433f]">Upcoming Deadlines</CardTitle>
            <div className="p-1.5 border-2 border-[#10201d] bg-[#f5b726] text-[#10201d] shadow-[2px_2px_0_#8a5d13]">
              <Calendar className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl sm:text-4xl font-extrabold text-[#10201d]">{upcomingDeadlinesCount}</div>
            <p className="font-mono text-[11px] text-[#34433f] mt-1 font-bold">Due within the next 7 days</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[5px_5px_0_#671912]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-mono text-xs font-bold uppercase tracking-wider text-[#34433f]">Deliverable Progress</CardTitle>
            <div className="p-1.5 border-2 border-[#10201d] bg-[#e97b77] text-[#10201d] shadow-[2px_2px_0_#671912]">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl sm:text-4xl font-extrabold text-[#10201d]">{completionRate}%</div>
            <p className="font-mono text-[11px] text-[#34433f] mt-1 font-bold">
              {doneDeliverables} of {totalDeliverables} active tasks completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs & Section Header */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFilter(f.id)}
                className={cn(
                  "font-mono text-xs font-bold uppercase tracking-wider px-3 py-1.5 border-2 border-[#10201d] transition-all",
                  selectedFilter === f.id
                    ? "bg-[#f5b726] text-[#10201d] shadow-[2px_2px_0_#8a5d13]"
                    : "bg-[#f7f7f2] text-[#34433f] hover:bg-[#e4e5da]"
                )}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>

          <p className="font-mono text-xs text-[#34433f]">
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
              {safeEvents.length === 0 ? 'No hackathons tracked yet' : 'No competitions match this filter'}
            </h3>
            <p className="mt-2 font-mono text-xs text-[#34433f] max-w-sm">
              {safeEvents.length === 0 
                ? 'Import any challenge link from Unstop, Devfolio, Devpost, or Internshala to dissect deadlines and launch your mission console.'
                : 'Try selecting a different filter above or import another competition.'}
            </p>
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="mt-6 font-mono text-xs font-bold border-2 border-[#10201d] bg-[#e97b77] text-[#10201d] shadow-[3px_3px_0_#671912]"
            >
              + Import Hackathon
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
