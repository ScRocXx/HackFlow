'use client'

import { useState } from 'react'
import { MapPin, Globe, ExternalLink, Calendar, Users, Trophy } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusPills } from '@/components/events/StatusPills'
import { StageTimeline } from '@/components/events/StageTimeline'
import { StageChecklist } from '@/components/events/StageChecklist'
import { CountdownTimer } from '@/components/events/CountdownTimer'
import { completeStage } from '@/app/actions/stages'
import { format } from 'date-fns'

interface EventDetailContentProps {
  event: any // type would be Event with joined stages, deliverables, etc
}

export function EventDetailContent({ event }: EventDetailContentProps) {
  const activeStage = event.stages?.find((s: any) => s.status === 'in_progress' || s.status === 'pending') || event.stages?.[0]
  const [isCompleting, setIsCompleting] = useState(false)

  const handleCompleteStage = async () => {
    if (!activeStage) return
    setIsCompleting(true)
    try {
      await completeStage(activeStage.id)
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="secondary">{event.source_platform}</Badge>
              {event.mode && (
                <Badge variant="outline">
                  {event.mode === 'offline' ? <MapPin className="w-3 h-3 mr-1" /> : <Globe className="w-3 h-3 mr-1" />}
                  {event.mode}
                </Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{event.title}</h1>
            <p className="text-slate-500 mt-1">{event.organizer_name}</p>
          </div>
          <div className="w-full md:w-64 shrink-0">
            <StatusPills eventId={event.id} currentStatus={event.status} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Main) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4">Journey</h3>
              <StageTimeline stages={event.stages || []} activeStageId={activeStage?.id || null} />
            </CardContent>
          </Card>

          {/* Active Stage Panel */}
          {activeStage && (
            <Card className="border-blue-200 shadow-sm overflow-hidden">
              <div className="bg-blue-50/50 p-6 border-b border-blue-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">{activeStage.stage_type}</Badge>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">{activeStage.title}</h2>
                  </div>
                  {activeStage.end_time && (
                    <div className="text-right">
                      <div className="text-xs text-slate-500 mb-1">Time Remaining</div>
                      <CountdownTimer deadline={activeStage.end_time} />
                    </div>
                  )}
                </div>
              </div>
              
              <CardContent className="p-0">
                <StageChecklist 
                  stageId={activeStage.id} 
                  deliverables={activeStage.deliverables || []} 
                  eventId={event.id} 
                />
                
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                  <Button 
                    onClick={handleCompleteStage} 
                    disabled={isCompleting || activeStage.status === 'completed'}
                  >
                    {activeStage.status === 'completed' ? 'Completed' : 'Mark Stage Complete'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column (Sidebar) */}
        <div className="space-y-6">
          {/* Metadata */}
          <Card>
            <CardContent className="p-5 space-y-4">
              <h3 className="font-semibold">Event Details</h3>
              
              {event.source_url && (
                <a href={event.source_url} target="_blank" rel="noreferrer" className="flex items-center text-sm text-blue-600 hover:underline">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Original Page
                </a>
              )}
              
              <div className="flex items-center text-sm text-slate-600">
                <Calendar className="w-4 h-4 mr-2" />
                {event.start_date ? format(new Date(event.start_date), 'MMM d, yyyy') : 'TBA'}
              </div>

              {event.prize_pool && (
                <div className="flex items-center text-sm text-slate-600">
                  <Trophy className="w-4 h-4 mr-2" />
                  {event.prize_pool}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Panel */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center"><Users className="w-4 h-4 mr-2"/> Team</h3>
                <Badge variant="outline">{event.team_members?.length || 0} Members</Badge>
              </div>
              
              <div className="space-y-3">
                {event.team_members?.map((member: any) => (
                  <div key={member.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium">
                      {member.profile?.full_name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 text-sm">
                      <p className="font-medium">{member.profile?.full_name}</p>
                      <p className="text-slate-500 text-xs">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
