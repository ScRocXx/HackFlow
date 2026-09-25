'use client'

import { useState } from 'react'
import { Link as LinkIcon, Trophy, Calendar, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EventCard } from '@/components/events/EventCard'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import type { Event, EventStage } from '@/lib/supabase/types'

const URLParseDialog = dynamic(
  () => import('@/components/events/URLParseDialog').then(mod => mod.URLParseDialog),
  { ssr: false }
)

type ExtendedEvent = Event & {
  active_stage?: EventStage
  deliverable_progress?: { done: number; total: number }
  team_count?: number
  squad_name?: string | null
}

interface DashboardContentProps {
  events: ExtendedEvent[]
}

export function DashboardContent({ events = [] }: DashboardContentProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [selectedSquad, setSelectedSquad] = useState<string>('all')

  const safeEvents = Array.isArray(events) ? events : []
  const availableSquads = Array.from(new Set(safeEvents.map(e => e.squad_name).filter(Boolean))) as string[]

  // Filter events
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
      <div className="border-2 border-[#10201d] bg-[#3d5f58] p-3.5 sm:p-6 text-[#f7f7f2] shadow-[4px_4px_0_#671912] sm:shadow-[7px_7px_0_#671912] flex flex-col md:flex-row justify-between md:items-center gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
            <span className="w-2 h-2 bg-[#e53927] inline-block" />
            <span className="w-2 h-2 bg-[#8bb2de] inline-block" />
            <span className="w-2 h-2 bg-[#f5b726] inline-block" />
            <span className="w-2 h-2 bg-[#e97b77] inline-block" />
            <span className="font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#f6c4c1] ml-1.5">
              My Hackathons
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-[#f7f7f2]">
            Hackathon Tracker
          </h1>
          <p className="font-mono text-xs text-[#8bb2de] mt-0.5 sm:mt-1">
            All your rounds, deadlines, and team checklists in one place.
          </p>
        </div>

        {safeEvents.length > 0 && (
          <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
            <Button 
              onClick={() => setIsDialogOpen(true)}
              size="lg"
              className="w-full md:w-auto border-2 border-[#10201d] bg-[#e97b77] hover:bg-[#f6c4c1] active:scale-[0.98] text-[#10201d] font-mono text-xs font-black uppercase tracking-wide shadow-[3px_3px_0_#671912] sm:shadow-[4px_4px_0_#671912] active:translate-x-[1px] active:translate-y-[1px] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#671912] px-5 sm:px-6 h-11 sm:h-12 flex items-center justify-center gap-1.5 touch-manipulation"
            >
              <span className="text-base font-bold">+</span> Paste Hackathon Link
            </Button>
          </div>
        )}
      </div>

      {/* Stats Metric Cards (High-Density 3-Column on mobile) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-5">
        <Card className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[2px_2px_0_#671912] sm:shadow-[5px_5px_0_#671912]">
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-2.5 sm:p-6">
            <CardTitle className="font-mono text-[9px] sm:text-xs font-bold uppercase tracking-wider text-[#34433f] truncate">Active</CardTitle>
            <div className="hidden xs:block p-1 sm:p-1.5 border-2 border-[#10201d] bg-[#8bb2de] text-[#10201d] shadow-[1px_1px_0_#2e4742]">
              <Trophy className="h-3 w-3 sm:h-4 sm:w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-2.5 pt-0 sm:p-6 sm:pt-0">
            <div className="font-display text-xl sm:text-4xl font-extrabold text-[#10201d]">{activeEventsCount}</div>
            <p className="font-mono text-[9px] sm:text-[11px] text-[#34433f] mt-0.5 sm:mt-1 font-bold hidden sm:block">Currently registered & building</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[2px_2px_0_#671912] sm:shadow-[5px_5px_0_#671912]">
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-2.5 sm:p-6">
            <CardTitle className="font-mono text-[9px] sm:text-xs font-bold uppercase tracking-wider text-[#34433f] truncate">Deadlines</CardTitle>
            <div className="hidden xs:block p-1 sm:p-1.5 border-2 border-[#10201d] bg-[#f5b726] text-[#10201d] shadow-[1px_1px_0_#8a5d13]">
              <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-2.5 pt-0 sm:p-6 sm:pt-0">
            <div className="font-display text-xl sm:text-4xl font-extrabold text-[#10201d]">{upcomingDeadlinesCount}</div>
            <p className="font-mono text-[9px] sm:text-[11px] text-[#34433f] mt-0.5 sm:mt-1 font-bold hidden sm:block">Due within 7 days</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[2px_2px_0_#671912] sm:shadow-[5px_5px_0_#671912]">
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 p-2.5 sm:p-6">
            <CardTitle className="font-mono text-[9px] sm:text-xs font-bold uppercase tracking-wider text-[#34433f] truncate">Done</CardTitle>
            <div className="hidden xs:block p-1 sm:p-1.5 border-2 border-[#10201d] bg-[#e97b77] text-[#10201d] shadow-[1px_1px_0_#671912]">
              <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-2.5 pt-0 sm:p-6 sm:pt-0">
            <div className="font-display text-xl sm:text-4xl font-extrabold text-[#10201d]">{completionRate}%</div>
            <p className="font-mono text-[9px] sm:text-[11px] text-[#34433f] mt-0.5 sm:mt-1 font-bold hidden sm:block">
              {doneDeliverables}/{totalDeliverables} tasks done
            </p>
          </CardContent>
        </Card>
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
              {safeEvents.length === 0 ? 'No hackathons added yet' : 'No competitions match this filter'}
            </h3>
            <p className="mt-2 font-mono text-xs text-[#34433f] max-w-sm">
              {safeEvents.length === 0 
                ? 'Paste a hackathon link from Unstop, Devfolio, Devpost, or anywhere else to get rounds, deadlines, and a shared team checklist.'
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
