'use client'

import { useState } from 'react'
import { Search, Link as LinkIcon, Trophy, Calendar, CheckCircle2 } from 'lucide-react'
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
    if (urlInput.trim()) {
      setIsDialogOpen(true)
    }
  }

  const activeEventsCount = events.filter(e => e.status === 'registered' || e.status === 'building').length
  
  const totalDeliverables = events.reduce((acc, ev) => acc + (ev.deliverable_progress?.total || 0), 0)
  const doneDeliverables = events.reduce((acc, ev) => acc + (ev.deliverable_progress?.done || 0), 0)
  const completionRate = totalDeliverables ? Math.round((doneDeliverables / totalDeliverables) * 100) : 0

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white shadow-lg">
        <h2 className="text-2xl font-bold mb-2">Track a new Hackathon</h2>
        <p className="text-blue-100 mb-6">Paste the URL from Devpost, Devfolio, or Unstop to automatically extract details.</p>
        
        <div className="flex max-w-2xl gap-3 flex-col sm:flex-row">
          <div className="relative flex-1">
            <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <Input 
              className="pl-10 h-12 bg-white/10 border-white/20 text-white placeholder:text-blue-200 focus-visible:ring-white/30"
              placeholder="Paste a hackathon URL..." 
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleParse()}
            />
          </div>
          <Button 
            size="lg" 
            className="h-12 bg-white text-blue-700 hover:bg-blue-50 font-semibold px-8"
            onClick={handleParse}
          >
            Parse
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Active Events</CardTitle>
            <Trophy className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeEventsCount}</div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Upcoming Deadlines</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-slate-400 mt-1">This week</p>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Completion Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completionRate}%</div>
            <p className="text-xs text-slate-400 mt-1">Across all deliverables</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Your Hackathons</h3>
        
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl border border-dashed border-slate-300 bg-white">
            <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <Trophy className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No hackathons yet</h3>
            <p className="mt-2 text-sm text-slate-500 max-w-sm">
              Paste a hackathon URL above to start tracking your progress, stages, and tasks.
            </p>
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
