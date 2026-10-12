'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { 
  Trophy, 
  Flame, 
  Clock, 
  Check, 
  ArrowRight, 
  ChevronDown, 
  ChevronRight, 
  AlertTriangle, 
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EventCard } from '@/components/events/EventCard'
import { CountdownTimer } from '@/components/events/CountdownTimer'
import { AtRiskWarnings, type RiskItem } from '@/components/events/AtRiskWarnings'
import { toggleDeliverable } from '@/app/actions/deliverables'
import { computeActiveStage } from '@/lib/utils/active-stage'
import { getPlatformBadge } from '@/lib/utils/platform'
import { cn } from '@/lib/utils'
import type { Event, EventStage } from '@/lib/supabase/types'

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
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [selectedSquad, setSelectedSquad] = useState<string>('all')
  const [isPastDrawerOpen, setIsPastDrawerOpen] = useState(false)
  const [hoveredRadarId, setHoveredRadarId] = useState<string | null>(null)
  const [optimisticTasks, setOptimisticTasks] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (searchParams?.get('action') === 'add') {
      setIsDialogOpen(true)
    }
  }, [searchParams])

  useEffect(() => {
    const handleOpen = () => setIsDialogOpen(true)
    window.addEventListener('hackflow:open-add-hack', handleOpen)
    return () => window.removeEventListener('hackflow:open-add-hack', handleOpen)
  }, [])

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open)
    if (!open && searchParams?.get('action') === 'add') {
      const url = new URL(window.location.href)
      url.searchParams.delete('action')
      window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''))
    }
  }

  const safeEvents = Array.isArray(events) ? events : []
  const availableSquads = Array.from(new Set(safeEvents.map(e => e.squad_name).filter(Boolean))) as string[]

  // Separate active events vs passed deadline
  const { liveActiveEvents, pastCutoffEvents } = useMemo(() => {
    const now = Date.now()
    const live: ExtendedEvent[] = []
    const past: ExtendedEvent[] = []

    for (const ev of safeEvents) {
      if (['winner', 'runner_up', 'archived'].includes(ev.status)) continue

      const stage = (computeActiveStage(ev.stages, ev.active_stage_id || ev.active_stage?.id) || ev.active_stage) as typeof ev.active_stage
      const dlStr = stage?.actionable_deadline || stage?.window_end || stage?.deadline
      const dl = dlStr ? new Date(dlStr).getTime() : 0

      if (dl && dl < now && ev.status !== 'submitted') {
        past.push(ev)
      } else {
        live.push(ev)
      }
    }

    return { liveActiveEvents: live, pastCutoffEvents: past }
  }, [safeEvents])

  // Radar Items: Active hackathons due in the next 14 days (336 hours)
  const radarPins = useMemo(() => {
    const now = Date.now()
    const maxHorizon = 14 * 24 * 60 * 60 * 1000 // 14 days in ms
    const pins: Array<{
      event: ExtendedEvent
      hoursLeft: number
      pct: number
      stageTitle: string
      isUrgent: boolean
      isNear: boolean
    }> = []

    for (const ev of liveActiveEvents) {
      const stage = computeActiveStage(ev.stages, ev.active_stage_id || ev.active_stage?.id) || ev.active_stage
      const dlStr = stage?.actionable_deadline || stage?.window_end || stage?.deadline
      if (!dlStr) continue
      const dl = new Date(dlStr).getTime()
      if (isNaN(dl) || dl < now || dl > now + maxHorizon) continue

      const diffMs = dl - now
      const hoursLeft = Math.round(diffMs / (1000 * 60 * 60))
      // Normalized percentage along 14-day timeline (4% to 96% so pins don't clip edges)
      const pct = Math.min(96, Math.max(4, (diffMs / maxHorizon) * 100))

      pins.push({
        event: ev,
        hoursLeft,
        pct,
        stageTitle: stage?.title || 'Next Round',
        isUrgent: hoursLeft < 24,
        isNear: hoursLeft < 72,
      })
    }

    return pins.sort((a, b) => a.hoursLeft - b.hoursLeft)
  }, [liveActiveEvents])

  // Split Arena: Identify the #1 Hero Sprint Hackathon
  const heroEvent = useMemo(() => {
    if (radarPins.length > 0) return radarPins[0].event
    return liveActiveEvents.find(e => !['submitted', 'winner', 'runner_up'].includes(e.status)) || liveActiveEvents[0] || null
  }, [radarPins, liveActiveEvents])

  // The remaining queue of hackathons
  const queueEvents = useMemo(() => {
    if (!heroEvent) return liveActiveEvents
    return liveActiveEvents.filter(e => e.id !== heroEvent.id)
  }, [liveActiveEvents, heroEvent])

  // Compute At-Risk Warnings
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

      if (hoursLeft < 48 && incomplete.length > 0) {
        riskList.push({
          eventTitle: ev.title,
          eventId: ev.id,
          message: `${incomplete.length} task${incomplete.length === 1 ? '' : 's'} left — due in ${Math.round(hoursLeft)}h`,
          severity: hoursLeft < 24 ? 'critical' : 'warning'
        })
      }
    }

    return riskList.sort((a, b) => (b.severity === 'critical' ? 1 : 0) - (a.severity === 'critical' ? 1 : 0)).slice(0, 3)
  }, [safeEvents])

  // Interactive Task Toggle right on the Hero Workbench Card
  const handleToggleTask = async (taskId: string, currentDone: boolean) => {
    const nextDone = !currentDone
    setOptimisticTasks(prev => ({ ...prev, [taskId]: nextDone }))
    try {
      await toggleDeliverable(taskId, nextDone)
      router.refresh()
    } catch (err) {
      console.error('Failed to toggle deliverable from dashboard:', err)
      setOptimisticTasks(prev => ({ ...prev, [taskId]: currentDone }))
    }
  }

  // Filter list
  const filteredEvents = useMemo(() => {
    return safeEvents.filter(event => {
      if (selectedSquad !== 'all' && event.squad_name !== selectedSquad) return false
      if (selectedFilter === 'all') return true
      if (selectedFilter === 'active') return !['winner', 'runner_up', 'archived', 'submitted'].includes(event.status)
      if (selectedFilter === 'submitted') return event.status === 'submitted'
      if (selectedFilter === 'under_review') return event.status === 'under_review'
      if (selectedFilter === 'finalist') return event.status === 'finalist'
      if (selectedFilter === 'won') return ['winner', 'runner_up'].includes(event.status)
      return true
    })
  }, [safeEvents, selectedFilter, selectedSquad])

  const filters = [
    { id: 'all', label: 'All', count: safeEvents.length },
    { id: 'active', label: 'Active Sprints', count: liveActiveEvents.length },
    { id: 'submitted', label: 'Submitted', count: safeEvents.filter(e => e.status === 'submitted').length },
    { id: 'under_review', label: 'In Review', count: safeEvents.filter(e => e.status === 'under_review').length },
    { id: 'won', label: 'Won 🏆', count: safeEvents.filter(e => e.status === 'winner' || e.status === 'runner_up').length },
  ]

  const heroActiveStage = heroEvent ? computeActiveStage(heroEvent.stages, heroEvent.active_stage_id || heroEvent.active_stage?.id) || heroEvent.active_stage : null
  const heroDeliverables = heroActiveStage?.stage_deliverables || []

  return (
    <div className="space-y-6 animate-cascade-in">
      {/* Heads up blocker alert */}
      <AtRiskWarnings risks={risks} />

      {/* =========================================================================
          1. THE 14-DAY DEADLINE RADAR (Interactive Time-Horizon Strip)
          ========================================================================= */}
      <section className="p-4 sm:p-5 rounded-[10px] border-2 border-hack-ink bg-white shadow-hack-card relative overflow-hidden">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-hack-coral animate-pulse inline-block" />
            <h2 className="font-display text-sm sm:text-base font-extrabold tracking-tight text-hack-ink uppercase">
              14-Day Deadline Radar
            </h2>
          </div>
          <span className="font-mono text-[11px] font-bold text-hack-subtext">
            {radarPins.length} deadline{radarPins.length === 1 ? '' : 's'} in range
          </span>
        </div>

        {/* Radar Horizon Track */}
        <div className="relative pt-6 pb-4 px-2 select-none">
          {/* Subtle Radar sweep line */}
          <div className="relative h-2 bg-[#10201D]/10 rounded-full w-full overflow-visible">
            <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-hack-coral via-hack-gold to-hack-forest/30 rounded-full w-full opacity-70" />

            {/* Time Ticks */}
            <div className="absolute -bottom-5 inset-x-0 flex justify-between font-mono text-[10px] font-bold text-hack-subtext uppercase">
              <span>NOW</span>
              <span>24H</span>
              <span>3D</span>
              <span>7D</span>
              <span>+14 DAYS</span>
            </div>

            {/* Proportional Pins */}
            {radarPins.map((pin) => {
              const isHovered = hoveredRadarId === pin.event.id
              return (
                <div
                  key={pin.event.id}
                  style={{ left: `${pin.pct}%` }}
                  className="absolute -top-3 -translate-x-1/2 flex flex-col items-center group cursor-pointer z-20"
                  onMouseEnter={() => setHoveredRadarId(pin.event.id)}
                  onMouseLeave={() => setHoveredRadarId(null)}
                >
                  <Link href={`/events/${pin.event.id}`} prefetch={true}>
                    <div className={cn(
                      "w-6 h-6 rounded-full border-2 border-hack-ink flex items-center justify-center transition-transform",
                      pin.isUrgent ? "bg-hack-coral text-white scale-110 shadow-sm" :
                      pin.isNear ? "bg-hack-gold text-hack-ink" :
                      "bg-white text-hack-ink hover:scale-110",
                      isHovered && "ring-4 ring-hack-coral/40 scale-125"
                    )}>
                      <Clock className="w-3 h-3 stroke-[2.5]" />
                    </div>
                  </Link>

                  {/* Floating Pill on Hover */}
                  <div className={cn(
                    "absolute -top-10 bg-[#10201D] text-white font-mono text-[10px] font-bold px-2 py-1 rounded-[4px] border border-black shadow-lg whitespace-nowrap pointer-events-none transition-all duration-150 z-30",
                    isHovered ? "opacity-100 -translate-y-1" : "opacity-0 group-hover:opacity-100"
                  )}>
                    <span>{pin.event.title.slice(0, 18)}</span>
                    <span className="text-hack-coral ml-1.5">• {pin.hoursLeft}h left</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* =========================================================================
          2. THE ASYMMETRIC SPLIT ARENA (Hero Live Sprint + Flight Strips Queue)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (5/12): Hero War-Room Workbench Card */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-hack-ink flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-hack-coral" />
              <span>On The Workbench Now</span>
            </span>
            <span className="font-mono text-[10px] font-semibold text-hack-subtext">
              Primary Live Sprint
            </span>
          </div>

          {heroEvent ? (
            <div className="lanyard-card p-5 bg-[#FBF9F3] flex flex-col justify-between border-2 border-hack-ink shadow-hack-hero">
              <div className="space-y-4">
                {/* Header Tag Bar */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded-[4px] border border-hack-ink bg-hack-coral text-hack-ink font-mono text-[10px] font-extrabold uppercase">
                      {heroEvent.source_platform || 'ONLINE'}
                    </span>
                    <span className="font-mono text-[10px] font-bold text-hack-forest uppercase flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-hack-forest animate-ping inline-block" />
                      Live Sprint
                    </span>
                  </div>
                  {heroEvent.squad_name && (
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-[4px] bg-white border border-hack-ink/20">
                      👥 {heroEvent.squad_name}
                    </span>
                  )}
                </div>

                {/* Event Title */}
                <div>
                  <h3 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight text-hack-ink line-clamp-2">
                    {heroEvent.title}
                  </h3>
                  <p className="font-sans text-xs text-hack-subtext mt-1 line-clamp-1">
                    {heroActiveStage?.title || 'Round 1 Submission'}
                  </p>
                </div>

                {/* Recessed OLED Countdown Module */}
                <div className="oled-timer-Well p-3 text-center">
                  <span className="font-mono text-[10px] uppercase font-bold text-hack-mint block mb-1">
                    ⚡ Live Submission Cutoff
                  </span>
                  <div className="text-white scale-95 sm:scale-100 flex justify-center">
                    <CountdownTimer 
                      deadline={heroActiveStage?.actionable_deadline || heroActiveStage?.window_end || heroActiveStage?.deadline || ''} 
                    />
                  </div>
                </div>

                {/* Inline Checkable Tasks (Next 3 tasks directly on dashboard!) */}
                <div className="space-y-2 pt-1 border-t border-hack-ink/10">
                  <span className="font-mono text-[11px] font-bold uppercase text-hack-subtext block">
                    Tasks ({heroDeliverables.filter(d => (optimisticTasks[d.id] ?? d.is_done)).length}/{heroDeliverables.length})
                  </span>

                  {heroDeliverables.length === 0 ? (
                    <p className="font-mono text-xs text-hack-subtext/70 italic py-1">
                      No tasks added yet. Open war room to add tasks.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {heroDeliverables.slice(0, 3).map((task) => {
                        const isDone = optimisticTasks[task.id] ?? task.is_done
                        return (
                          <div 
                            key={task.id}
                            onClick={() => handleToggleTask(task.id, isDone)}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded-[6px] border text-xs font-mono font-medium transition-all cursor-pointer select-none",
                              isDone 
                                ? "bg-hack-mint/20 border-hack-mint text-hack-subtext line-through" 
                                : "bg-white border-hack-ink/15 hover:border-hack-ink text-hack-ink"
                            )}
                          >
                            <div className={cn(
                              "w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                              isDone ? "bg-hack-forest border-hack-forest text-white" : "border-hack-ink bg-white"
                            )}>
                              {isDone && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="truncate">{task.title}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-5">
                <Link
                  href={`/events/${heroEvent.id}`}
                  prefetch={true}
                  className="keycap-btn w-full flex items-center justify-center gap-2 py-2.5 rounded-[6px] bg-hack-coral text-hack-ink font-mono text-xs font-bold uppercase tracking-wider shadow-sm hover:brightness-105 active:scale-[0.98] transition-all"
                >
                  <span>Enter War Room →</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-[10px] border-2 border-dashed border-hack-ink/20 text-center bg-white">
              <Sparkles className="w-8 h-8 text-hack-gold mx-auto mb-2 opacity-50" />
              <p className="font-mono text-xs font-bold text-hack-ink">Workbench is clear</p>
              <p className="font-sans text-xs text-hack-subtext mt-1">Ready for your next hackathon sprint.</p>
            </div>
          )}
        </div>

        {/* Right Column (7/12): Flight Strips Queue */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-hack-ink flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-hack-forest" />
              <span>Upcoming Flight Strips (The Queue)</span>
            </span>
            <span className="font-mono text-[10px] font-semibold text-hack-subtext">
              {queueEvents.length} hackathon{queueEvents.length === 1 ? '' : 's'} waiting
            </span>
          </div>

          {queueEvents.length === 0 ? (
            <div className="p-8 rounded-[10px] border-2 border-dashed border-hack-ink/20 text-center bg-white">
              <p className="font-mono text-xs text-hack-subtext">No other active hackathons in flight.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {queueEvents.map((ev) => {
                const stage = computeActiveStage(ev.stages, ev.active_stage_id || ev.active_stage?.id) || ev.active_stage
                const dlStr = stage?.actionable_deadline || stage?.window_end || stage?.deadline
                const deliverables = stage?.stage_deliverables || []
                const doneCount = deliverables.filter(d => d.is_done).length

                return (
                  <div
                    key={ev.id}
                    className="card-pass p-3.5 bg-white border border-hack-ink rounded-[8px] flex items-center justify-between gap-3 hover:-translate-y-0.5 transition-all group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Countdown badge pill */}
                      <div className="w-20 sm:w-24 shrink-0 py-1 px-2 rounded-[4px] bg-[#10201D] text-white font-mono text-center">
                        <span className="text-[10px] font-extrabold text-hack-gold block truncate">
                          {dlStr ? <CountdownTimer deadline={dlStr} /> : 'TBA'}
                        </span>
                      </div>

                      {/* Title & Stage info */}
                      <div className="min-w-0">
                        <Link 
                          href={`/events/${ev.id}`} 
                          prefetch={true} 
                          className="font-display text-sm font-bold text-hack-ink hover:text-hack-coral transition-colors truncate block"
                        >
                          {ev.title}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="font-mono text-[10px] text-hack-subtext font-semibold truncate">
                            {stage?.title || 'Round 1'}
                          </span>
                          <span className="text-hack-muted">•</span>
                          <span className="font-mono text-[10px] text-hack-subtext">
                            {doneCount}/{deliverables.length} tasks
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Open Keycap */}
                    <Link
                      href={`/events/${ev.id}`}
                      prefetch={true}
                      className="keycap-btn px-3 py-1.5 rounded-[4px] bg-hack-sand hover:bg-white text-hack-ink font-mono text-xs font-bold shrink-0 transition-colors"
                    >
                      Open →
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          3. TUCKED "PAST CUTOFF" DRAWER
          ========================================================================= */}
      {pastCutoffEvents.length > 0 && (
        <section className="pt-2">
          <button
            type="button"
            onClick={() => setIsPastDrawerOpen(!isPastDrawerOpen)}
            className="w-full flex items-center justify-between p-3 rounded-[6px] border border-hack-ink/20 bg-hack-sand/50 hover:bg-hack-sand font-mono text-xs font-semibold text-hack-subtext transition-colors"
          >
            <div className="flex items-center gap-2">
              {isPastDrawerOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <span>
                {pastCutoffEvents.length} hackathon{pastCutoffEvents.length === 1 ? '' : 's'} past deadline — click to review or archive
              </span>
            </div>
            <span className="text-[11px] underline">
              {isPastDrawerOpen ? 'Hide' : 'Review'}
            </span>
          </button>

          {isPastDrawerOpen && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-cascade-in">
              {pastCutoffEvents.map(event => (
                <EventCard key={event.id} event={event as any} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Modal Dialog */}
      <URLParseDialog 
        open={isDialogOpen} 
        onOpenChange={handleDialogOpenChange}
      />
    </div>
  )
}
