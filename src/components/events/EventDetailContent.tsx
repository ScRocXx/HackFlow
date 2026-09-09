'use client'

import { useState } from 'react'
import { MapPin, Globe, ExternalLink, Calendar, Users, Trophy, FileText, Database, Link2, Plus, Trash2, Loader2, Sparkles } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { StatusPills } from '@/components/events/StatusPills'
import { StageTimeline } from '@/components/events/StageTimeline'
import { StageChecklist } from '@/components/events/StageChecklist'
import { CountdownTimer } from '@/components/events/CountdownTimer'
import { completeStage } from '@/app/actions/stages'
import { addEventResource, deleteEventResource } from '@/app/actions/events'
import type { EventResource } from '@/lib/supabase/types'
import { format } from 'date-fns'

interface EventDetailContentProps {
  event: any // type would be Event with joined stages, deliverables, resources, etc
}

const RESOURCE_TYPES = [
  { value: 'problem_statement', label: 'Problem Statement' },
  { value: 'rulebook', label: 'Rulebook / Guidelines' },
  { value: 'template', label: 'Slide / Project Template' },
  { value: 'dataset', label: 'Dataset / API' },
  { value: 'reference', label: 'Reference / Documentation' },
  { value: 'other', label: 'Other Workspace Link' },
]

export function EventDetailContent({ event }: EventDetailContentProps) {
  const activeStage = event.stages?.find((s: any) => s.id === event.active_stage_id) || 
                      event.stages?.find((s: any) => !s.is_completed) || 
                      event.stages?.[0]
  const [isCompleting, setIsCompleting] = useState(false)
  
  // Resources state
  const [resources, setResources] = useState<EventResource[]>(event.resources || [])
  const [newTitle, setNewTitle] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [newType, setNewType] = useState('problem_statement')
  const [addingResource, setAddingResource] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { toast } = useToast()

  const handleCompleteStage = async () => {
    if (!activeStage) return
    setIsCompleting(true)
    try {
      await completeStage(activeStage.id)
    } finally {
      setIsCompleting(false)
    }
  }

  const handleAddResource = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newUrl.trim()) {
      toast({
        title: 'Title & URL Required',
        description: 'Please provide both a title and a valid URL for the resource.',
        variant: 'destructive',
      })
      return
    }

    setAddingResource(true)
    try {
      const res = await addEventResource(event.id, {
        title: newTitle.trim(),
        url: newUrl.trim(),
        resource_type: newType,
        is_official: false,
      })

      if (!res.success || !res.data) {
        throw new Error(res.error || 'Failed to add resource')
      }

      setResources([...resources, res.data as EventResource])
      setNewTitle('')
      setNewUrl('')
      toast({
        title: 'Resource Added',
        description: `"${newTitle}" was added to the team resources.`,
      })
    } catch (err: any) {
      toast({
        title: 'Failed to Add Resource',
        description: err.message || 'An unexpected error occurred.',
        variant: 'destructive',
      })
    } finally {
      setAddingResource(false)
    }
  }

  const handleDeleteResource = async (resourceId: string, title: string) => {
    setDeletingId(resourceId)
    try {
      const res = await deleteEventResource(resourceId, event.id)
      if (!res.success) {
        throw new Error(res.error || 'Failed to delete resource')
      }

      setResources(resources.filter(r => r.id !== resourceId))
      toast({
        title: 'Resource Removed',
        description: `"${title}" has been deleted.`,
      })
    } catch (err: any) {
      toast({
        title: 'Failed to Delete',
        description: err.message || 'Could not delete resource.',
        variant: 'destructive',
      })
    } finally {
      setDeletingId(null)
    }
  }

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'dataset':
        return <Database className="w-4 h-4 text-indigo-600 shrink-0" />
      case 'problem_statement':
        return <FileText className="w-4 h-4 text-blue-600 shrink-0" />
      case 'rulebook':
        return <FileText className="w-4 h-4 text-amber-600 shrink-0" />
      case 'template':
        return <FileText className="w-4 h-4 text-purple-600 shrink-0" />
      default:
        return <Link2 className="w-4 h-4 text-slate-600 shrink-0" />
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="secondary" className="capitalize">{event.source_platform}</Badge>
              {event.mode && (
                <Badge variant="outline">
                  {event.mode === 'in-person' ? <MapPin className="w-3 h-3 mr-1" /> : <Globe className="w-3 h-3 mr-1" />}
                  <span className="capitalize">{event.mode}</span>
                </Badge>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{event.title}</h1>
            <p className="text-slate-500 mt-1">{event.organizer || 'Independent Hackathon'}</p>
          </div>
          <div className="w-full md:w-64 shrink-0">
            <StatusPills eventId={event.id} currentStatus={event.status || 'registered'} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Main) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4">Stage Journey</h3>
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
                      <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none capitalize">{activeStage.stage_type}</Badge>
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">{activeStage.title}</h2>
                  </div>
                  {activeStage.deadline && (
                    <div className="text-right">
                      <div className="text-xs text-slate-500 mb-1 font-medium">Time Remaining</div>
                      <CountdownTimer deadline={activeStage.deadline} />
                    </div>
                  )}
                </div>
              </div>
              
              <CardContent className="p-0">
                <StageChecklist 
                  stageId={activeStage.id} 
                  deliverables={event.current_stage_deliverables || activeStage.deliverables || []} 
                  eventId={event.id} 
                />
                
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                  <Button 
                    onClick={handleCompleteStage} 
                    disabled={isCompleting || activeStage.is_completed}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {activeStage.is_completed ? 'Completed' : 'Mark Stage Complete'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Resources & Attached Documents */}
          <Card className="border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50/80 p-5 border-b border-slate-200/80">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-lg text-slate-900">Resources & Documents</h3>
                  <Badge variant="secondary" className="text-xs bg-white border border-slate-200">
                    {resources.length}
                  </Badge>
                </div>
                <p className="text-xs text-slate-500">
                  Problem statements, rulebooks, starter templates & team links
                </p>
              </div>
            </div>

            <CardContent className="p-5 space-y-5">
              {/* Resources List */}
              <div className="space-y-2.5">
                {resources.map((res) => (
                  <div
                    key={res.id}
                    className="p-3.5 bg-white rounded-lg border border-slate-200/90 shadow-sm hover:border-slate-300 transition-colors flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 rounded-md bg-slate-50 border border-slate-100 shrink-0">
                        {getResourceIcon(res.resource_type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900 truncate">
                            {res.title}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 capitalize bg-slate-50 text-slate-600 shrink-0"
                          >
                            {res.resource_type.replace('_', ' ')}
                          </Badge>
                          {res.is_official ? (
                            <Badge className="text-[10px] px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200 shrink-0 font-medium">
                              Official
                            </Badge>
                          ) : (
                            <Badge className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0 font-medium">
                              Team Link
                            </Badge>
                          )}
                        </div>
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1 truncate group"
                        >
                          <span className="truncate">{res.url}</span>
                          <ExternalLink className="h-3 w-3 shrink-0 opacity-70 group-hover:opacity-100" />
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-slate-700 hover:text-blue-600 px-2.5 py-1.5 rounded-md hover:bg-slate-100 transition-colors"
                      >
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteResource(res.id, res.title)}
                        disabled={deletingId === res.id}
                        className="text-slate-400 hover:text-red-600 h-8 w-8"
                        title="Delete resource"
                      >
                        {deletingId === res.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}

                {resources.length === 0 && (
                  <div className="p-6 rounded-lg border border-dashed border-slate-200 text-center space-y-1 bg-slate-50/50">
                    <FileText className="h-8 w-8 text-slate-300 mx-auto" />
                    <p className="text-sm font-medium text-slate-600">No attached resources yet</p>
                    <p className="text-xs text-slate-400">
                      Add your problem statement PDF, team Figma, GitHub repo, or slide deck below.
                    </p>
                  </div>
                )}
              </div>

              {/* Add Custom Resource Form */}
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/80 space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 block">
                  Add Team Resource or Custom Link
                </span>
                <form onSubmit={handleAddResource} className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      placeholder="Title (e.g. Team Figma, Pitch Deck)"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      disabled={addingResource}
                      className="h-9 text-xs bg-white"
                    />
                    <Input
                      placeholder="URL (e.g. https://figma.com/...)"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      disabled={addingResource}
                      className="h-9 text-xs bg-white"
                    />
                    <div className="flex gap-2">
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value)}
                        disabled={addingResource}
                        className="h-9 px-2.5 rounded-md border border-slate-200 bg-white text-xs flex-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        {RESOURCE_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="submit"
                        disabled={addingResource || !newTitle.trim() || !newUrl.trim()}
                        className="h-9 text-xs px-3 bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                      >
                        {addingResource ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <>
                            <Plus className="h-3.5 w-3.5 mr-1" /> Add
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            </CardContent>
          </Card>
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
