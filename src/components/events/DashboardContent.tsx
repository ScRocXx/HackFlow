'use client'

import { useState } from 'react'
import { Link as LinkIcon, Trophy, Calendar, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EventCard } from '@/components/events/EventCard'
import { URLParseDialog } from '@/components/events/URLParseDialog'
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
  const [urlInput, setUrlInput] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleParse = () => {
    setIsDialogOpen(true)
  }

  const safeEvents = Array.isArray(events) ? events : []
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

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Ingestion Section (#3d5f58) */}
      <div className="relative overflow-hidden border-2 border-[#10201d] bg-[#3d5f58] p-6 sm:p-8 text-[#f7f7f2] shadow-[7px_7px_0_#671912]">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 bg-[#e53927] inline-block" />
            <span className="w-2.5 h-2.5 bg-[#8bb2de] inline-block" />
            <span className="w-2.5 h-2.5 bg-[#f5b726] inline-block" />
            <span className="w-2.5 h-2.5 bg-[#e97b77] inline-block" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#f6c4c1] ml-2">
              Autonomous Ingestion Engine
            </span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#f7f7f2] mb-2">
            Track a New Hackathon or Challenge
          </h2>
          <p className="text-[#f7f7f2]/90 text-sm sm:text-base mb-6 font-normal">
            Paste any challenge URL from <strong className="text-white font-bold">Unstop</strong>, <strong className="text-white font-bold">Devfolio</strong>, <strong className="text-white font-bold">Devpost</strong>, or <strong className="text-white font-bold">Internshala</strong> to dissect sequential rounds, live timers, and deliverable checklists.
          </p>
        </div>
        
        <div className="flex max-w-3xl gap-3 flex-col sm:flex-row">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#10201d]/60" />
            <Input 
              className="pl-10 h-12 border-2 border-[#10201d] bg-[#f7f7f2] text-[#10201d] placeholder:text-[#34433f]/60 font-mono text-xs sm:text-sm shadow-[3px_3px_0_#10201d]"
              placeholder="e.g. https://unstop.com/hackathons/... or https://devfolio.co/..." 
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleParse()}
            />
          </div>
          <Button 
            size="lg" 
            className="h-12 border-2 border-[#10201d] bg-[#e97b77] text-[#10201d] font-mono font-bold uppercase tracking-wide shadow-[4px_4px_0_#671912] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#671912] px-7"
            onClick={handleParse}
          >
            Extract & Track
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Card className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[5px_5px_0_#671912]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-mono text-xs font-bold uppercase tracking-wider text-[#34433f]">Active Competitions</CardTitle>
            <div className="p-1.5 border-2 border-[#10201d] bg-[#8bb2de] text-[#10201d] shadow-[2px_2px_0_#2e4742]">
              <Trophy className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-display text-3xl sm:text-4xl font-extrabold text-[#10201d]">{activeEventsCount}</div>
            <p className="font-mono text-[11px] text-[#34433f] mt-1 font-bold">Currently building & registered</p>
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

      {/* Events Grid */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-display text-2xl font-extrabold tracking-tight text-[#10201d]">Your Tracked Competitions</h3>
            <p className="font-mono text-xs text-[#34433f]">Real-time gatekeeper rounds, live timers, and team progress.</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setUrlInput('')
              setIsDialogOpen(true)
            }}
            className="text-xs font-mono font-bold"
          >
            + Add Manually
          </Button>
        </div>
        
        {safeEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-[#10201d] bg-[#f7f7f2] shadow-[7px_7px_0_#671912]">
            <div className="h-16 w-16 bg-[#8bb2de] border-2 border-[#10201d] shadow-[3px_3px_0_#2e4742] flex items-center justify-center mb-4 text-[#10201d]">
              <Trophy className="h-8 w-8" />
            </div>
            <h3 className="font-display text-2xl font-bold text-[#10201d]">No hackathons tracked yet</h3>
            <p className="mt-2 font-mono text-xs text-[#34433f] max-w-sm">
              Paste an Unstop, Internshala, Devpost, or Devfolio link above to auto-extract deadlines and launch your execution console.
            </p>
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="mt-6"
            >
              Add First Hackathon
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {safeEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>

      <URLParseDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        initialUrl={urlInput}
      />
    </div>

  )
}
