'use client'

import { useState } from 'react'
import { MapPin, Globe, ExternalLink, Calendar, Users, Trophy, FileText, Database, Link2, Plus, Trash2, Loader2, Sparkles, UserPlus, Shield } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { StatusPills } from '@/components/events/StatusPills'
import { StageTimeline } from '@/components/events/StageTimeline'
import { StageChecklist } from '@/components/events/StageChecklist'
import { CountdownTimer } from '@/components/events/CountdownTimer'
import { completeStage } from '@/app/actions/stages'
import { addEventResource, deleteEventResource, addEventParticipant } from '@/app/actions/events'
import { getFriendsList } from '@/app/actions/friends'
import { MeetCompanionBar } from '@/components/events/MeetCompanionBar'
import { IdeaSandbox } from '@/components/events/IdeaSandbox'
import { PostSubmissionConsole } from '@/components/events/PostSubmissionConsole'
import type { EventResource, Friendship } from '@/lib/supabase/types'
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
  
  // Teammate invite state
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [friends, setFriends] = useState<Friendship[]>([])
  const [loadingFriends, setLoadingFriends] = useState(false)
  const [invitingId, setInvitingId] = useState<string | null>(null)
  
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
      {/* Header Banner */}
      <div className="border-2 border-[#10201d] bg-[#f7f7f2] p-6 shadow-[7px_7px_0_#671912]">
        <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-2.5">
              <span className="font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 border-2 border-[#10201d] bg-[#8bb2de] text-[#10201d] shadow-[2px_2px_0_#2e4742]">
                {event.source_platform || 'Hackathon'}
              </span>
              {event.mode && (
                <span className="font-mono text-xs font-bold uppercase tracking-wider px-2 py-0.5 border-2 border-[#10201d] bg-[#f7f7f2] text-[#10201d] shadow-[2px_2px_0_#10201d] flex items-center">
                  {event.mode === 'in-person' ? <MapPin className="w-3 h-3 mr-1" /> : <Globe className="w-3 h-3 mr-1" />}
                  <span className="capitalize">{event.mode}</span>
                </span>
              )}
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-extrabold text-[#10201d] tracking-tight">{event.title}</h1>
            <p className="font-mono text-xs text-[#34433f] mt-1 font-bold">{event.organizer || 'Independent Hackathon'}</p>
          </div>
          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-3 w-full md:w-auto shrink-0">
            <div className="w-full sm:w-64">
              <StatusPills eventId={event.id} currentStatus={event.status || 'registered'} />
            </div>
            <div className="w-full sm:w-auto flex md:justify-end">
              <MeetCompanionBar eventId={event.id} meetUrl={event.meet_url} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Main) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Timeline */}
          <Card className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[7px_7px_0_#671912]">
            <CardContent className="p-6">
              <h3 className="font-display text-2xl font-bold tracking-tight text-[#10201d] mb-4">Stage Journey</h3>
              <StageTimeline stages={event.stages || []} activeStageId={activeStage?.id || null} />
            </CardContent>
          </Card>

          {/* Active Stage Panel */}
          {activeStage && (
            <Card className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[7px_7px_0_#671912] overflow-hidden">
              <div className="bg-[#3d5f58] p-6 border-b-2 border-[#10201d] text-[#f7f7f2]">
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border-2 border-[#10201d] bg-[#f5b726] text-[#10201d] shadow-[2px_2px_0_#10201d]">
                        {activeStage.stage_type}
                      </span>
                    </div>
                    <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#f7f7f2] tracking-tight">{activeStage.title}</h2>
                  </div>
                  {activeStage.deadline && (
                    <div className="text-left sm:text-right">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-[#f6c4c1] mb-1 font-bold">Time Remaining</div>
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
                
                <div className="p-4 bg-[#f7f7f2] border-t-2 border-[#10201d] flex justify-end">
                  <Button 
                    onClick={handleCompleteStage} 
                    disabled={isCompleting || activeStage.is_completed}
                    className="font-mono text-xs font-bold"
                  >
                    {activeStage.is_completed ? 'Stage Completed' : 'Mark Stage Complete'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Idea Sandbox & Solution Canvas */}
          <IdeaSandbox
            eventId={event.id}
            problemStatements={event.problem_statements || []}
          />

          {/* Resources & Attached Documents */}
          <Card className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[7px_7px_0_#671912] overflow-hidden">
            <div className="bg-[#2e4742] p-5 border-b-2 border-[#10201d] text-[#f7f7f2]">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#f5b726]" />
                  <h3 className="font-display text-2xl font-bold tracking-tight text-[#f7f7f2]">Resources & Documents</h3>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 border-2 border-[#10201d] bg-[#f5b726] text-[#10201d] shadow-[2px_2px_0_#10201d]">
                    {resources.length}
                  </span>
                </div>
                <p className="font-mono text-xs text-[#8bb2de]">
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
                    className="p-3.5 bg-white border-2 border-[#10201d] shadow-[4px_4px_0_#10201d] flex items-center justify-between gap-3 text-sm transition-transform hover:translate-x-0.5 hover:translate-y-0.5"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="p-2 border-2 border-[#10201d] bg-[#f2f2eb] shrink-0 shadow-[1px_1px_0_#10201d]">
                        {getResourceIcon(res.resource_type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-display text-base font-bold text-[#10201d] truncate">
                            {res.title}
                          </span>
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider border-2 border-[#10201d] bg-[#f2f2eb] text-[#10201d] shrink-0">
                            {res.resource_type.replace('_', ' ')}
                          </span>
                          {res.is_official ? (
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider border-2 border-[#10201d] bg-[#8bb2de] text-[#10201d] shadow-[1px_1px_0_#10201d] shrink-0">
                              Official
                            </span>
                          ) : (
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 uppercase tracking-wider border-2 border-[#10201d] bg-[#f5b726] text-[#10201d] shadow-[1px_1px_0_#10201d] shrink-0">
                              Team Link
                            </span>
                          )}
                        </div>
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-[#2e4742] hover:text-[#e53927] hover:underline flex items-center gap-1 mt-1 truncate group"
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
                        className="hidden sm:inline-flex items-center gap-1 font-mono text-xs font-bold text-[#10201d] hover:bg-[#e97b77] hover:text-white px-2.5 py-1.5 border-2 border-[#10201d] bg-[#f2f2eb] shadow-[2px_2px_0_#10201d] transition-all"
                      >
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteResource(res.id, res.title)}
                        disabled={deletingId === res.id}
                        className="text-[#10201d] hover:bg-[#e97b77] hover:text-white border-2 border-transparent hover:border-[#10201d] h-8 w-8 transition-colors"
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
                  <div className="p-6 border-2 border-dashed border-[#10201d] text-center space-y-1 bg-[#f2f2eb]">
                    <FileText className="h-8 w-8 text-[#34433f] mx-auto opacity-50" />
                    <p className="font-display text-base font-bold text-[#10201d]">No attached resources yet</p>
                    <p className="font-mono text-xs text-[#34433f]">
                      Add your problem statement PDF, team Figma, GitHub repo, or slide deck below.
                    </p>
                  </div>
                )}
              </div>

              {/* Add Custom Resource Form */}
              <div className="p-4 bg-[#e4e5da] border-2 border-[#10201d] shadow-[4px_4px_0_#10201d] space-y-3">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#10201d] block">
                  Add Team Resource or Custom Link
                </span>
                <form onSubmit={handleAddResource} className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      placeholder="Title (e.g. Team Figma, Pitch Deck)"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      disabled={addingResource}
                      className="h-9 text-xs bg-white border-2 border-[#10201d] font-mono shadow-[2px_2px_0_#10201d]"
                    />
                    <Input
                      placeholder="URL (e.g. https://figma.com/...)"
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      disabled={addingResource}
                      className="h-9 text-xs bg-white border-2 border-[#10201d] font-mono shadow-[2px_2px_0_#10201d]"
                    />
                    <div className="flex gap-2">
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value)}
                        disabled={addingResource}
                        className="h-9 px-2.5 border-2 border-[#10201d] bg-white font-mono text-xs shadow-[2px_2px_0_#10201d] flex-1 focus:outline-none focus:ring-0"
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
                        className="h-9 text-xs px-3 font-mono font-bold border-2 border-[#10201d] bg-[#e97b77] hover:bg-[#f6c4c1] text-[#10201d] shadow-[3px_3px_0_#671912] shrink-0"
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

          {/* Complete Post-Submission Lifecycle Console */}
          <PostSubmissionConsole event={event} />
        </div>

        {/* Right Column (Sidebar) */}
        <div className="space-y-6">
          {/* Metadata */}
          <Card className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[7px_7px_0_#671912]">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-display text-2xl font-bold tracking-tight text-[#10201d] border-b-2 border-[#10201d] pb-2">
                Event Details
              </h3>
              
              {event.source_url && (
                <a 
                  href={event.source_url} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="flex items-center text-xs font-mono font-bold text-[#10201d] hover:text-[#e53927] p-2.5 border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d] transition-transform hover:translate-x-0.5 hover:translate-y-0.5"
                >
                  <ExternalLink className="w-4 h-4 mr-2 text-[#2e4742]" />
                  View Original Page
                </a>
              )}
              
              <div className="flex items-center text-xs font-mono font-bold text-[#10201d] p-2.5 border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]">
                <Calendar className="w-4 h-4 mr-2 text-[#2e4742]" />
                {event.start_date ? format(new Date(event.start_date), 'MMM d, yyyy') : 'TBA'}
              </div>

              {event.prize_pool && (
                <div className="flex items-center text-xs font-mono font-bold text-[#10201d] p-2.5 border-2 border-[#10201d] bg-[#f5b726] shadow-[2px_2px_0_#8a5d13]">
                  <Trophy className="w-4 h-4 mr-2 text-[#10201d]" />
                  Prize: {event.prize_pool}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Team Panel */}
          <Card className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[7px_7px_0_#671912]">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3 border-b-2 border-[#10201d] pb-2">
                <h3 className="font-display text-2xl font-bold tracking-tight text-[#10201d] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#e53927]"/> Team
                </h3>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold uppercase tracking-wider px-2 py-0.5 border-2 border-[#10201d] bg-[#8bb2de] text-[#10201d] shadow-[2px_2px_0_#2e4742]">
                    {(event.event_participants || event.team_members)?.length || 0} Members
                  </span>
                  <Button
                    size="sm"
                    onClick={async () => {
                      setIsInviteOpen(true)
                      setLoadingFriends(true)
                      try {
                        const res = await getFriendsList()
                        if (res.success && res.data) setFriends(res.data)
                      } finally {
                        setLoadingFriends(false)
                      }
                    }}
                    className="font-mono text-xs font-bold px-2 py-1 h-auto border-2 border-[#10201d] bg-[#f5b726] text-[#10201d] hover:bg-[#faaf00] shadow-[2px_2px_0_#10201d]"
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1" /> Add
                  </Button>
                </div>
              </div>

              {/* Squad Badge if present */}
              {(event.squad?.name || event.squad_name) && (
                <div className="mb-3 p-2 bg-[#f5b726]/20 border-2 border-[#10201d] flex items-center justify-between font-mono text-xs font-bold text-[#10201d] shadow-[2px_2px_0_#10201d]">
                  <span className="flex items-center gap-1.5 truncate">
                    <Shield className="h-3.5 w-3.5 text-[#2e4742] shrink-0" />
                    Squad: {event.squad?.name || event.squad_name}
                  </span>
                  <Badge variant="outline" className="text-[10px] border-[#10201d] bg-white font-mono shrink-0">
                    Synced Vault
                  </Badge>
                </div>
              )}
              
              <div className="space-y-2.5">
                {(event.event_participants || event.team_members || []).map((member: any) => {
                  const roleLabel = (member.role === 'lead' || member.role === 'owner') ? 'Lead' : 'Collaborator'
                  const isLead = roleLabel === 'Lead'

                  return (
                    <div key={member.id} className="p-2.5 bg-white border-2 border-[#10201d] shadow-[2px_2px_0_#10201d] flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-8 h-8 border-2 border-[#10201d] ${isLead ? 'bg-[#f5b726]' : 'bg-[#8bb2de]'} flex items-center justify-center font-mono text-xs font-bold text-[#10201d] shadow-[1px_1px_0_#10201d] shrink-0`}>
                          {member.profile?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-display text-sm font-bold text-[#10201d] truncate">{member.profile?.full_name || 'Team Member'}</p>
                          <p className="font-mono text-[10px] text-[#57726d] truncate">{member.profile?.email || ''}</p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`font-mono text-[10px] font-bold uppercase border-2 border-[#10201d] shrink-0 ${
                          isLead ? 'bg-[#f5b726] text-[#10201d]' : 'bg-[#f7f7f2] text-[#34433f]'
                        }`}
                      >
                        {roleLabel}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Add Teammate Dialog */}
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogContent className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[7px_7px_0_#671912] max-w-md p-0">
              <DialogHeader className="p-4 border-b-2 border-[#10201d] bg-[#2e4742] text-[#f2f2eb]">
                <DialogTitle className="font-display text-base flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-[#f5b726]" /> Invite Teammate to Event
                </DialogTitle>
                <DialogDescription className="font-mono text-xs text-[#f2f2eb]/70">
                  Select an accepted friend from your network to join this hackathon board.
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 space-y-3">
                {loadingFriends ? (
                  <div className="py-8 text-center font-mono text-xs text-[#57726d] flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading friends network...
                  </div>
                ) : friends.length === 0 ? (
                  <div className="p-4 text-center border-2 border-dashed border-[#57726d]/40 font-mono text-xs text-[#57726d]">
                    No connected friends found. Go to "Squads & Friends" to send friend requests first!
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {friends.map((f) => {
                      const friendUserId = f.sender_id === event.created_by ? f.receiver_id : (f.receiver_id === event.created_by ? f.sender_id : (f.friend_profile?.id || ''))
                      const friendName = f.friend_profile?.full_name || f.receiver_email
                      const friendEmail = f.friend_profile?.email || f.receiver_email

                      const existingIds = (event.event_participants || event.team_members || []).map((m: any) => m.user_id)
                      const isAlreadyIn = friendUserId && existingIds.includes(friendUserId)

                      return (
                        <div
                          key={f.id}
                          className="p-2.5 bg-white border-2 border-[#10201d] flex items-center justify-between gap-2 shadow-[2px_2px_0_#10201d]"
                        >
                          <div className="truncate">
                            <div className="font-display font-bold text-xs text-[#10201d] truncate">{friendName}</div>
                            <div className="font-mono text-[10px] text-[#57726d] truncate">{friendEmail}</div>
                          </div>

                          {isAlreadyIn ? (
                            <Badge variant="outline" className="font-mono text-[10px] border-[#10201d] bg-[#f7f7f2] text-[#57726d] shrink-0">
                              Enrolled
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              disabled={!friendUserId || invitingId === friendUserId}
                              onClick={async () => {
                                if (!friendUserId) return
                                setInvitingId(friendUserId)
                                try {
                                  const res = await addEventParticipant(event.id, friendUserId, 'collaborator')
                                  if (res.success) {
                                    toast({
                                      title: 'Teammate Added!',
                                      description: `${friendName} is now added to the event board.`,
                                    })
                                    setIsInviteOpen(false)
                                    window.location.reload()
                                  } else {
                                    toast({
                                      title: 'Could not add teammate',
                                      description: res.error,
                                      variant: 'destructive',
                                    })
                                  }
                                } finally {
                                  setInvitingId(null)
                                }
                              }}
                              className="font-mono text-xs font-bold border-2 border-[#10201d] bg-[#2e4742] text-[#f2f2eb] hover:bg-[#3d5f58] shrink-0"
                            >
                              {invitingId === friendUserId ? <Loader2 className="h-3 w-3 animate-spin" /> : '+ Add'}
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}
