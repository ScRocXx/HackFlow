'use client'

import Link from 'next/link'
import { Users, MapPin, Globe } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { StatusPills } from '@/components/events/StatusPills'
import { CountdownTimer } from '@/components/events/CountdownTimer'
import type { Event, EventStage } from '@/lib/supabase/types'

type ExtendedEvent = Event & {
  active_stage?: EventStage
  deliverable_progress?: { done: number; total: number }
  team_count?: number
}

interface EventCardProps {
  event: ExtendedEvent
}

export function EventCard({ event }: EventCardProps) {
  const progressPercent = event.deliverable_progress?.total 
    ? (event.deliverable_progress.done / event.deliverable_progress.total) * 100 
    : 0

  const getPlatformColor = (platform: string) => {
    switch (platform?.toLowerCase()) {
      case 'devfolio': return 'bg-blue-100 text-blue-700 hover:bg-blue-200'
      case 'devpost': return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
      case 'unstop': return 'bg-orange-100 text-orange-700 hover:bg-orange-200'
      case 'internshala': return 'bg-sky-100 text-sky-700 hover:bg-sky-200'
      case 'hackerearth': return 'bg-purple-100 text-purple-700 hover:bg-purple-200'
      case 'mlh': return 'bg-rose-100 text-rose-700 hover:bg-rose-200'
      default: return 'bg-slate-100 text-slate-700 hover:bg-slate-200'
    }
  }

  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 flex flex-col group h-full cursor-pointer">
      <Link href={`/events/${event.id}`} className="flex flex-col h-full flex-1">
        <div className="h-32 w-full relative bg-gradient-to-r from-slate-200 to-slate-100">
          {event.banner_url ? (
            <img src={event.banner_url} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-80" />
          )}
          <div className="absolute top-3 left-3 flex gap-2">
            <Badge className={getPlatformColor(event.source_platform || 'other')} variant="secondary">
              {event.source_platform || 'Hackathon'}
            </Badge>
            {event.mode && (
              <Badge variant="outline" className="bg-white/90 border-none shadow-sm backdrop-blur-sm text-slate-700">
                {event.mode === 'in-person' ? <MapPin className="w-3 h-3 mr-1" /> : <Globe className="w-3 h-3 mr-1" />}
                <span className="capitalize">{event.mode}</span>
              </Badge>
            )}
          </div>
        </div>

        <div className="p-5 flex-1 flex flex-col">
          <div className="mb-4">
            <h3 className="font-semibold text-lg text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
              {event.title}
            </h3>
            <p className="text-sm text-slate-500 line-clamp-1">{event.organizer || 'Independent Hackathon'}</p>
          </div>

          {event.active_stage ? (
            <div className="mb-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-xs font-semibold text-blue-700 truncate">
                  {event.active_stage.title}
                </span>
              </div>
              <CountdownTimer deadline={event.active_stage.deadline || ''} className="text-xs" />
            </div>
          ) : (
            <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center text-slate-400 text-sm h-[82px]">
              No active stage
            </div>
          )}

          <div className="mt-auto">
            <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5"/> {event.team_count || 1} members</span>
              <span>{event.deliverable_progress?.done || 0}/{event.deliverable_progress?.total || 0} tasks</span>
            </div>
            <Progress value={progressPercent} className="h-1.5 mb-4" />
          </div>
        </div>
      </Link>
      
      <div className="px-5 pb-5 pt-0 mt-auto bg-white border-t border-slate-50 pt-3 relative z-10">
        <StatusPills 
          eventId={event.id} 
          currentStatus={event.status || 'bookmarked'} 
        />
      </div>
    </Card>
  )
}
