'use client'

import Link from 'next/link'
import { Users, MapPin, Globe, FileText, Database, ExternalLink, Calendar } from 'lucide-react'
import { StatusPills } from '@/components/events/StatusPills'
import { CountdownTimer } from '@/components/events/CountdownTimer'
import type { Event, EventStage, EventResource } from '@/lib/supabase/types'

type ExtendedEvent = Event & {
  active_stage?: EventStage
  deliverable_progress?: { done: number; total: number }
  team_count?: number
  resources?: EventResource[]
  squad_name?: string | null
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
      case 'devfolio': return 'bg-[#8bb2de] text-[#10201d] border-[#10201d]'
      case 'devpost': return 'bg-[#e97b77] text-[#10201d] border-[#10201d]'
      case 'unstop': return 'bg-[#f5b726] text-[#10201d] border-[#10201d]'
      case 'internshala': return 'bg-[#8bb2de] text-[#10201d] border-[#10201d]'
      case 'hackerearth': return 'bg-[#f6c4c1] text-[#10201d] border-[#10201d]'
      case 'mlh': return 'bg-[#e53927] text-[#f7f7f2] border-[#10201d]'
      default: return 'bg-[#f7f7f2] text-[#10201d] border-[#10201d]'
    }
  }

  const prizeDisplay = event.prize_display_summary || event.prize_pool

  return (
    <div className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[6px_6px_0_#671912] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#671912] transition-all flex flex-col group h-full overflow-hidden">
      <Link 
        href={`/events/${event.id}`}
        prefetch={true}
        className="flex flex-col h-full flex-1"
      >
        <div className="h-32 w-full relative bg-[#2e4742] border-b-2 border-[#10201d]">
          {event.banner_url ? (
            <img src={event.banner_url} alt={event.title} className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-[#3d5f58] flex items-center justify-center p-4">
              <span className="font-display text-2xl font-extrabold text-[#f7f7f2]/40 tracking-wider uppercase">
                {event.source_platform || 'HACKATHON'}
              </span>
            </div>
          )}
          <div className="absolute top-3 left-3 flex gap-2 flex-wrap max-w-[85%]">
            <span className={`inline-flex items-center px-2.5 py-0.5 border-2 font-mono text-[10px] font-bold uppercase tracking-wider shadow-[2px_2px_0_#10201d] ${getPlatformColor(event.source_platform || 'other')}`}>
              {event.source_platform || 'Hackathon'}
            </span>
            {event.squad_name && (
              <span className="inline-flex items-center px-2 py-0.5 border-2 border-[#10201d] bg-[#f5b726] text-[#10201d] font-mono text-[10px] font-bold uppercase tracking-wider shadow-[2px_2px_0_#10201d]">
                👥 {event.squad_name}
              </span>
            )}
            {event.mode && (
              <span className="inline-flex items-center px-2 py-0.5 border-2 border-[#10201d] bg-[#f7f7f2] text-[#10201d] font-mono text-[10px] font-bold uppercase tracking-wider shadow-[2px_2px_0_#10201d]">
                {event.mode === 'in-person' ? <MapPin className="w-3 h-3 mr-1" /> : <Globe className="w-3 h-3 mr-1" />}
                <span className="capitalize">{event.mode}</span>
              </span>
            )}
            {prizeDisplay && (
              <span className="inline-flex items-center px-2 py-0.5 border-2 border-[#10201d] bg-[#8bb2de] text-[#10201d] font-mono text-[10px] font-bold uppercase tracking-wider shadow-[2px_2px_0_#10201d] truncate max-w-[180px]">
                🏆 {prizeDisplay}
              </span>
            )}
          </div>
        </div>

        <div className="p-5 flex-1 flex flex-col">
          <div className="mb-4">
            <h3 className="font-display text-xl font-bold text-[#10201d] line-clamp-1 group-hover:text-[#e53927] transition-colors">
              {event.title}
            </h3>
            <p className="font-mono text-xs text-[#34433f] line-clamp-1 mt-0.5">{event.organizer || 'Independent Hackathon'}</p>
          </div>

          {event.active_stage ? (
            <div className="mb-4 p-3 border-2 border-[#10201d] bg-[#f2f2eb] shadow-[3px_3px_0_#2e4742]">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 bg-[#e53927] inline-block shrink-0" />
                  <span className="font-mono text-xs font-bold text-[#10201d] truncate uppercase">
                    {event.active_stage.title}
                  </span>
                </div>
                {event.active_stage.raw_date_snippet && (
                  <span className="font-mono text-[10px] text-[#34433f] font-semibold flex items-center gap-1 shrink-0">
                    <Calendar className="w-3 h-3" />
                    {event.active_stage.raw_date_snippet}
                  </span>
                )}
              </div>
              <CountdownTimer 
                deadline={event.active_stage.actionable_deadline || event.active_stage.deadline || ''} 
                windowStart={event.active_stage.window_start}
                windowEnd={event.active_stage.window_end}
                showMilestoneLabel={true}
                className="text-xs" 
              />
            </div>
          ) : (
            <div className="mb-4 p-3 border-2 border-[#10201d] bg-[#e4e5da] flex items-center justify-center font-mono text-[#34433f] text-xs font-bold h-[76px]">
              No active stage
            </div>
          )}

          <div className="mt-auto">
            <div className="flex justify-between items-center font-mono text-xs font-bold text-[#34433f] mb-2">
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5"/> {event.team_count || 1} members</span>
              <span>{event.deliverable_progress?.done || 0}/{event.deliverable_progress?.total || 0} tasks</span>
            </div>
            <div className="w-full h-2 border border-[#10201d] bg-[#e4e5da] overflow-hidden">
              <div 
                className="h-full bg-[#e97b77] transition-all" 
                style={{ width: `${progressPercent}%` }} 
              />
            </div>
          </div>
        </div>
      </Link>

      {/* Resource Badges outside <Link> to prevent invalid nested anchor tags */}
      {event.resources && event.resources.length > 0 && (
        <div className="px-5 pb-3 flex flex-wrap gap-1.5 z-20 relative border-t border-[#10201d]/20 pt-2.5">
          {event.resources.slice(0, 3).map((res) => (
            <a
              key={res.id}
              href={res.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 border border-[#10201d] bg-[#f7f7f2] hover:bg-[#8bb2de] text-[#10201d] transition-colors max-w-[180px]"
              title={res.title}
            >
              {res.resource_type === 'dataset' ? (
                <Database className="w-3 h-3 text-[#10201d] shrink-0" />
              ) : (
                <FileText className="w-3 h-3 text-[#10201d] shrink-0" />
              )}
              <span className="truncate">{res.title}</span>
              <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
            </a>
          ))}
          {event.resources.length > 3 && (
            <span className="font-mono text-[10px] text-[#34433f] font-bold self-center">
              +{event.resources.length - 3}
            </span>
          )}
        </div>
      )}
      
      <div className="px-4 py-3 bg-[#f7f7f2] border-t-2 border-[#10201d] relative z-10">
        <StatusPills 
          eventId={event.id} 
          currentStatus={event.status || 'bookmarked'} 
        />
      </div>
    </div>
  )
}

