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

export function DashboardContent({ events }: DashboardContentProps) {
  const [urlInput, setUrlInput] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleParse = () => {
    setIsDialogOpen(true)
  }

  const activeEventsCount = events.filter(e => e.status === 'registered' || e.status === 'building').length
  
  const totalDeliverables = events.reduce((acc, ev) => acc + (ev.deliverable_progress?.total || 0), 0)
  const doneDeliverables = events.reduce((acc, ev) => acc + (ev.deliverable_progress?.done || 0), 0)
  const completionRate = totalDeliverables ? Math.round((doneDeliverables / totalDeliverables) * 100) : 0

  const now = new Date()
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const upcomingDeadlinesCount = events.filter(ev => {
    if (!ev.active_stage?.deadline) return false
    const d = new Date(ev.active_stage.deadline)
    return !isNaN(d.getTime()) && d >= now && d <= in7Days
  }).length

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Hero Ingestion Section */}
      <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-6 sm:p-8 text-white shadow-xl border border-slate-800">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-mono mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />
            Ingestion & Execution Engine
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Track a New Competition</h2>
          <p className="text-slate-300 text-sm sm:text-base mb-6">
            Paste any challenge URL from <strong className="text-white">Unstop</strong>, <strong className="text-white">Internshala</strong>, <strong className="text-white">Devfolio</strong>, or <strong className="text-white">Devpost</strong> to auto-extract elimination rounds, live timers, and deliverable checklists.
          </p>
        </div>
        
        <div className="flex max-w-2xl gap-3 flex-col sm:flex-row">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              className="pl-10 h-12 bg-white/10 border-white/20 text-white placeholder:text-slate-400 focus-visible:ring-blue-400 text-sm"
              placeholder="e.g. https://unstop.com/hackathons/... or https://internshala.com/..." 
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleParse()}
            />
          </div>
          <Button 
            size="lg" 
            className="h-12 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 shadow-md"
            onClick={handleParse}
          >
            Extract & Track
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Competitions</CardTitle>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Trophy className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">{activeEventsCount}</div>
            <p className="text-xs text-slate-500 mt-1">Currently building & registered</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">Upcoming Deadlines</CardTitle>
            <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
              <Calendar className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">{upcomingDeadlinesCount}</div>
            <p className="text-xs text-slate-500 mt-1">Due within the next 7 days</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 shadow-sm bg-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">Deliverable Progress</CardTitle>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 font-mono">{completionRate}%</div>
            <p className="text-xs text-slate-500 mt-1">
              {doneDeliverables} of {totalDeliverables} active tasks completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Events Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Your Hackathons & Contests</h3>
            <p className="text-xs text-slate-500">Real-time gatekeeper rounds, live timers, and team progress.</p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setUrlInput('')
              setIsDialogOpen(true)
            }}
            className="text-xs border-slate-200 hover:bg-slate-50 font-medium"
          >
            + Add Manually
          </Button>
        </div>
        
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-2xl border border-dashed border-slate-300 bg-white/60 shadow-sm">
            <div className="h-16 w-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4 text-blue-600 border border-blue-100">
              <Trophy className="h-8 w-8" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">No hackathons tracked yet</h3>
            <p className="mt-1.5 text-xs text-slate-500 max-w-sm">
              Paste an Unstop, Internshala, Devpost, or Devfolio link above to auto-extract deadlines and launch your execution board.
            </p>
            <Button 
              onClick={() => setIsDialogOpen(true)}
              className="mt-5 bg-blue-600 hover:bg-blue-700 text-xs font-semibold px-4 h-9"
            >
              Add First Hackathon
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
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
