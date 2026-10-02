'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MapPin, Globe, ExternalLink, Calendar, Users, Trophy, FileText, Database, Link2, Plus, Trash2, Loader2, Sparkles, UserPlus, Shield, Edit3, AlertTriangle, UploadCloud, MoreHorizontal } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'
import { StageTimeline } from '@/components/events/StageTimeline'
import { EditEventDialog } from '@/components/events/EditEventDialog'
import { completeStage } from '@/app/actions/stages'
import { addEventResource, deleteEventResource, addEventParticipant, deleteEvent } from '@/app/actions/events'
import { getFriendsList } from '@/app/actions/friends'
import { IdeaSandbox } from '@/components/events/IdeaSandbox'
import { SubmissionReadiness } from '@/components/events/SubmissionReadiness'
import { PostSubmissionConsole } from '@/components/events/PostSubmissionConsole'
import { WorkspaceHeader } from '@/components/events/WorkspaceHeader'
import { ActiveStagePanel } from '@/components/events/ActiveStagePanel'
import type { EventResource, Friendship, EventWithRelations, EventStage } from '@/lib/supabase/types'
import { ensureExternalUrl } from '@/lib/utils/url'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { computeActiveStage } from '@/lib/utils/active-stage'

interface EventDetailContentProps {
  event: EventWithRelations
  initialStages?: EventStage[]
}

const RESOURCE_TYPES = [
  { value: 'problem_statement', label: 'Problem Statement' },
  { value: 'rulebook', label: 'Rulebook / Guidelines' },
  { value: 'template', label: 'Slide / Project Template' },
  { value: 'dataset', label: 'Dataset / API' },
  { value: 'reference', label: 'Reference / Documentation' },
  { value: 'other', label: 'Other Workspace Link' },
]

export function EventDetailContent({ event, initialStages: propInitialStages }: EventDetailContentProps) {
  const router = useRouter()
  const initialStages = propInitialStages || event?.stages || []

  const [currentEvent, setCurrentEvent] = useState<EventWithRelations>(event)
  const [stages, setStages] = useState<EventStage[]>(initialStages)

  // Fix Stale State on Edit: update internal state when router.refresh() runs after an edit
  useEffect(() => {
    setCurrentEvent(event)
    setStages(propInitialStages || event?.stages || [])
    if (event?.resources) {
      setResources(event.resources)
    }
  }, [event, initialStages])

  // Centralized activeStage computation (synchronous with dashboard and cards)
  const activeStage = computeActiveStage(stages, currentEvent.active_stage_id)

  // Interactive Stage Journey Focus (Allows clicking any stage rail node to view its deliverables)
  const [focusedStageId, setFocusedStageId] = useState<string | null>(null)
  const currentDisplayStage = (focusedStageId && stages.find((s) => s.id === focusedStageId)) || activeStage

  const [isCompleting, setIsCompleting] = useState(false)
  const [mobileWorkspaceTab, setMobileWorkspaceTab] = useState<'sprint' | 'pitch' | 'team'>('sprint')
  
  // Edit & Delete dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeletingEvent, setIsDeletingEvent] = useState(false)
  
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
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { toast } = useToast()

  const handleDeleteEvent = async () => {
    setIsDeletingEvent(true)
    try {
      const res = await deleteEvent(event.id)
      if (!res.success) {
        throw new Error(res.error || 'Failed to delete hackathon')
      }
      toast({
        title: 'Hackathon Deleted',
        description: `"${event.title}" has been permanently removed.`,
      })
      router.push('/dashboard')
    } catch (err: any) {
      toast({
        title: 'Delete Failed',
        description: err.message || 'Could not delete hackathon.',
        variant: 'destructive',
      })
    } finally {
      setIsDeletingEvent(false)
    }
  }

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
        url: ensureExternalUrl(newUrl.trim()),
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

  const handleUploadResourceFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingDoc(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'event_resources')

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload document')
      }

      const cleanFileName = data.fileName ? data.fileName.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ') : 'Attached Document'
      setNewTitle(cleanFileName)
      setNewUrl(data.url)
      setNewType('template')
      toast({
        title: 'PDF Uploaded',
        description: `"${data.fileName}" uploaded. Click "Add" to attach it to team resources.`,
      })
    } catch (err: any) {
      toast({
        title: 'Upload Failed',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setUploadingDoc(false)
      e.target.value = ''
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
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header Banner */}
      <WorkspaceHeader
        event={currentEvent}
        activeStage={activeStage}
        onEditClick={() => setEditDialogOpen(true)}
        onDeleteClick={() => setDeleteDialogOpen(true)}
      />

      {/* Mobile Workspace Segmented Controller (lg:hidden) */}
      <div className="flex lg:hidden border border-hack-muted/60 bg-hack-surface p-1 rounded-xl shadow-hack-sm gap-1 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setMobileWorkspaceTab('sprint')}
          className={cn(
            "flex-1 py-2 px-3 text-center font-mono text-xs font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap select-none",
            mobileWorkspaceTab === 'sprint'
              ? "bg-hack-coral text-hack-ink shadow-hack-hero font-extrabold"
              : "text-hack-subtext hover:bg-hack-sand"
          )}
        >
          ⚡ Tasks & Stage
        </button>
        <button
          type="button"
          onClick={() => setMobileWorkspaceTab('pitch')}
          className={cn(
            "flex-1 py-2 px-3 text-center font-mono text-xs font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap select-none",
            mobileWorkspaceTab === 'pitch'
              ? "bg-hack-blue text-hack-ink shadow-hack-sm font-extrabold"
              : "text-hack-subtext hover:bg-hack-sand"
          )}
        >
          💡 Ideas & Canvas
        </button>
        <button
          type="button"
          onClick={() => setMobileWorkspaceTab('team')}
          className={cn(
            "flex-1 py-2 px-3 text-center font-mono text-xs font-bold uppercase tracking-wider rounded-lg transition-all whitespace-nowrap select-none",
            mobileWorkspaceTab === 'team'
              ? "bg-hack-gold text-hack-ink shadow-hack-sm font-extrabold"
              : "text-hack-subtext hover:bg-hack-sand"
          )}
        >
          👥 Team & Shelf
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* Left Column (Dominant Workspace) */}
        <div className="space-y-6 min-w-0">
          {/* Hackathon Brief Banner */}
          {event.mission_brief && (
            <div className={cn(mobileWorkspaceTab !== 'sprint' && "hidden lg:block")}>
              <Card className="border border-hack-muted/60 bg-hack-surface rounded-xl shadow-hack-card overflow-hidden">
                <div className="bg-hack-surface p-4 border-b border-hack-muted/30 text-hack-ink flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">🎯</span>
                    <div>
                      <h3 className="font-display text-lg font-bold tracking-tight text-hack-ink">Hackathon Brief</h3>
                      <p className="font-mono text-[11px] text-hack-subtext">Key constraints & target deliverable</p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border",
                      event.mission_brief.hackathon_tier === 'tech_mandate'
                        ? 'bg-hack-gold/20 border-hack-gold text-hack-gold-dark'
                        : event.mission_brief.hackathon_tier === 'domain_focused'
                        ? 'bg-hack-blue/20 border-hack-blue text-hack-blue-dark'
                        : 'bg-hack-mint/20 border-hack-mint text-hack-mint-dark'
                    )}
                  >
                    {event.mission_brief.hackathon_tier === 'tech_mandate'
                      ? '🔧 Tech Mandated'
                      : event.mission_brief.hackathon_tier === 'domain_focused'
                      ? '🎯 Domain Focused'
                      : '🟢 Open Build'}
                  </span>
                </div>

                <CardContent className="p-4 sm:p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-hack-subtext block">
                        What to Build (Target Deliverable)
                      </span>
                      <p className="font-mono text-xs sm:text-sm text-hack-ink font-semibold bg-hack-sand/50 p-3 rounded-lg border border-hack-muted/40">
                        {event.mission_brief.what_to_build}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-hack-subtext block">
                        Why It Exists (Sponsor Motive)
                      </span>
                      <p className="font-mono text-xs sm:text-sm text-hack-ink bg-hack-sand/50 p-3 rounded-lg border border-hack-muted/40">
                        {event.mission_brief.why_it_exists}
                      </p>
                    </div>
                  </div>

                  {/* Tech Stack Rules */}
                  {event.mission_brief.tech_stack_mandate && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-hack-subtext block">
                          Tech Stack Rules
                        </span>
                        {event.mission_brief.tech_stack_mandate.is_stack_restricted && (
                          <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-hack-red/10 text-hack-red border border-hack-red/30 rounded-full">
                            ⚠️ Stack Restricted Challenge
                          </span>
                        )}
                      </div>

                      {event.mission_brief.tech_stack_mandate.is_stack_restricted ? (
                        <div className="space-y-2 p-3 bg-hack-sand/40 border border-hack-muted/40 rounded-lg">
                          <p className="font-mono text-xs text-hack-subtext">
                            {event.mission_brief.tech_stack_mandate.allowed_stack_summary}
                          </p>
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {(event.mission_brief.tech_stack_mandate.mandatory_tools || []).map((tool: string, i: number) => (
                              <span
                                key={i}
                                className="font-mono text-xs font-bold px-2.5 py-1 rounded-md border border-hack-red/40 bg-hack-red/15 text-hack-red flex items-center gap-1"
                              >
                                <span>⚡</span> {tool}
                              </span>
                            ))}
                            {(event.mission_brief.tech_stack_mandate.bonus_sponsor_tools || []).map((tool: string, i: number) => (
                              <span
                                key={`bonus-${i}`}
                                className="font-mono text-xs font-bold px-2.5 py-1 rounded-md border border-hack-gold/40 bg-hack-gold/20 text-hack-gold-dark flex items-center gap-1"
                              >
                                <span>⭐</span> {tool} (Bonus Points)
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-hack-sand/40 border border-hack-muted/40 rounded-lg">
                          <p className="font-mono text-xs text-hack-mint-dark font-semibold flex items-center gap-1.5">
                            <span>✨</span>
                            {event.mission_brief.tech_stack_mandate.allowed_stack_summary || 'Any tech stack permitted (Free Choice)'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Submission Deliverables */}
                  {event.mission_brief.submission_deliverables && event.mission_brief.submission_deliverables.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-hack-subtext block">
                        Required Submission Deliverables
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {event.mission_brief.submission_deliverables.map((deliv: string, i: number) => (
                          <span
                            key={i}
                            className="font-mono text-xs font-semibold px-2.5 py-1 rounded-md border border-hack-muted bg-hack-surface text-hack-ink flex items-center gap-1 shadow-hack-sm"
                          >
                            <span className="text-hack-mint-dark">✓</span> {deliv}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Stage Journey Timeline (Interactive round rail) */}
          <div className={cn(mobileWorkspaceTab !== 'sprint' && "hidden lg:block")}>
            <StageTimeline 
              stages={stages || []} 
              activeStageId={activeStage?.id || null}
              selectedStageId={currentDisplayStage?.id || null}
              onStageSelect={(id) => setFocusedStageId(id)}
            />
          </div>

          {/* Focused Stage Panel & Deliverables Checklist */}
          {currentDisplayStage && (
            <ActiveStagePanel
              currentDisplayStage={currentDisplayStage}
              activeStage={activeStage}
              focusedStageId={focusedStageId}
              eventTitle={currentEvent.title}
              eventId={currentEvent.id}
              eventMode={currentEvent.mode}
              eventLocation={currentEvent.location}
              eventSourceUrl={currentEvent.source_url}
              eventCurrentStageDeliverables={currentEvent.current_stage_deliverables}
              isCompleting={isCompleting}
              onCompleteStage={handleCompleteStage}
              className={cn(mobileWorkspaceTab !== 'sprint' && "hidden lg:block")}
            />
          )}

          {/* Submission Readiness Pre-Flight Diagnostic (Visible in mobile sprint tab directly under checklist) */}
          {['registered', 'building', 'submitted', 'under_review'].includes(currentEvent.status) && (
            <div className={cn(mobileWorkspaceTab !== 'sprint' && "hidden lg:hidden", "block lg:hidden")}>
              <SubmissionReadiness event={currentEvent} />
            </div>
          )}

          {/* Idea Sandbox & Solution Canvas */}
          <div className={cn(mobileWorkspaceTab !== 'pitch' && "hidden lg:block")}>
            <IdeaSandbox
              eventId={event.id}
              problemStatements={event.problem_statements || []}
              missionBrief={event.mission_brief || null}
            />
          </div>

          {/* Resources & Attached Documents */}
          <div className={cn(mobileWorkspaceTab !== 'team' && "hidden lg:block")}>
            <Card className="border border-hack-muted/60 bg-hack-surface rounded-xl shadow-hack-card overflow-hidden">
              <div className="bg-hack-surface p-4 sm:p-5 border-b border-hack-muted/30 text-hack-ink">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-hack-gold-dark" />
                    <h3 className="font-display text-xl font-bold tracking-tight text-hack-ink">Resources & Shelf</h3>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full border border-hack-muted bg-hack-sand text-hack-ink">
                      {resources.length}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-hack-subtext">
                    Problem statements, rulebooks, starter kits & links
                  </p>
                </div>
              </div>

              <CardContent className="p-4 sm:p-5 space-y-4">
                {/* Resources List */}
                <div className="space-y-2">
                  {resources.map((res) => (
                    <div
                      key={res.id}
                      className="p-3 bg-hack-surface border border-hack-muted/60 rounded-lg shadow-hack-sm flex items-center justify-between gap-3 text-sm transition-all hover:border-hack-muted"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="p-2 rounded-md border border-hack-muted/40 bg-hack-sand shrink-0 text-hack-ink">
                          {getResourceIcon(res.resource_type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-display text-sm sm:text-base font-bold text-hack-ink truncate">
                              {res.title}
                            </span>
                            <span className="font-mono text-[10px] font-medium px-2 py-0.5 rounded-md uppercase tracking-wider border border-hack-muted bg-hack-sand text-hack-subtext shrink-0">
                              {res.resource_type.replace('_', ' ')}
                            </span>
                            {res.is_official ? (
                              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-hack-blue/40 bg-hack-blue/15 text-hack-blue-dark shrink-0">
                                Official
                              </span>
                            ) : (
                              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-hack-gold/40 bg-hack-gold/20 text-hack-gold-dark shrink-0">
                                Team Link
                              </span>
                            )}
                          </div>
                          <a
                            href={ensureExternalUrl(res.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-hack-subtext hover:text-hack-coral flex items-center gap-1 mt-0.5 truncate group"
                          >
                            <span className="truncate">{res.url}</span>
                            <ExternalLink className="h-3 w-3 shrink-0 opacity-70 group-hover:opacity-100" />
                          </a>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={ensureExternalUrl(res.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hidden sm:inline-flex items-center gap-1 font-mono text-xs font-semibold text-hack-ink hover:bg-hack-sand px-2.5 py-1.5 rounded-lg border border-hack-muted bg-hack-surface shadow-hack-sm transition-all"
                        >
                          {(res.url.toLowerCase().endsWith('.pdf') || res.url.includes('hackflow_uploads') || res.url.includes('/uploads/')) ? (
                            <>View PDF <ExternalLink className="h-3 w-3 text-hack-subtext" /></>
                          ) : (
                            <>Open <ExternalLink className="h-3 w-3 text-hack-subtext" /></>
                          )}
                        </a>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteResource(res.id, res.title)}
                          disabled={deletingId === res.id}
                          className="text-hack-subtext hover:text-hack-red hover:bg-hack-red/10 rounded-lg h-8 w-8 transition-colors"
                          title="Delete resource"
                          aria-label={`Delete resource: ${res.title}`}
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
                    <div className="p-6 rounded-lg border border-dashed border-hack-muted text-center space-y-1 bg-hack-sand/30">
                      <FileText className="h-7 w-7 text-hack-subtext mx-auto opacity-60" />
                      <p className="font-display text-sm font-bold text-hack-ink">No attached resources yet</p>
                      <p className="font-sans text-xs text-hack-subtext">
                        Add your problem statement PDF, team Figma, GitHub repo, or slide deck below.
                      </p>
                    </div>
                  )}
                </div>

                {/* Add Custom Resource Form */}
                <div className="p-4 bg-hack-sand/40 border border-hack-muted/60 rounded-xl space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider text-hack-ink block">
                      Add Team Resource or Link
                    </span>
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold uppercase border border-hack-gold/40 bg-hack-gold/20 hover:bg-hack-gold/30 text-hack-ink shadow-hack-sm transition-all">
                      {uploadingDoc ? <Loader2 className="w-3 h-3 animate-spin" /> : <UploadCloud className="w-3 h-3 text-hack-gold-dark" />}
                      <span>{uploadingDoc ? 'Uploading...' : 'Upload PDF / Deck'}</span>
                      <input
                        type="file"
                        accept=".pdf,.ppt,.pptx"
                        className="hidden"
                        onChange={handleUploadResourceFile}
                        disabled={uploadingDoc}
                      />
                    </label>
                  </div>
                  <form onSubmit={handleAddResource} className="space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_170px_auto] gap-2 items-center">
                      <Input
                        placeholder="Title (e.g. Team Figma, Pitch Deck)"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        disabled={addingResource}
                        className="h-9 text-xs bg-white rounded-lg border border-hack-muted font-mono shadow-hack-sm min-w-0"
                      />
                      <Input
                        placeholder="URL (e.g. https://figma.com/...)"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        disabled={addingResource}
                        className="h-9 text-xs bg-white rounded-lg border border-hack-muted font-mono shadow-hack-sm min-w-0"
                      />
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value)}
                        disabled={addingResource}
                        className="h-9 px-2.5 rounded-lg border border-hack-muted bg-white font-mono text-xs shadow-hack-sm w-full min-w-0 focus:outline-none focus:ring-1 focus:ring-hack-coral/25"
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
                        className="h-9 text-xs px-3 font-mono font-bold rounded-lg border border-hack-coral bg-hack-coral hover:brightness-105 text-hack-ink shadow-hack-hero shrink-0 whitespace-nowrap min-w-0"
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
                  </form>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Complete Post-Submission Lifecycle Console */}
          <div className={cn(mobileWorkspaceTab !== 'sprint' && "hidden lg:block")}>
            <PostSubmissionConsole event={event} />
          </div>
        </div>

        {/* Right Column (Sidebar) */}
        <div className="space-y-6">
          {/* Submission Readiness Pre-Flight Diagnostic (Desktop) */}
          {['registered', 'building', 'submitted', 'under_review'].includes(currentEvent.status) && (
            <div className="hidden lg:block">
              <SubmissionReadiness event={currentEvent} />
            </div>
          )}

          {/* Team Panel */}
          <div className={cn(mobileWorkspaceTab !== 'team' && "hidden lg:block")}>
            <Card className="border border-hack-muted/60 bg-hack-surface rounded-xl shadow-hack-card overflow-hidden">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-3 border-b border-hack-muted/30 pb-2">
                  <h3 className="font-display text-lg sm:text-xl font-bold tracking-tight text-hack-ink flex items-center gap-2">
                    <Users className="w-5 h-5 text-hack-coral-dark"/> Team
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-full border border-hack-muted bg-hack-sand text-hack-ink">
                      {(currentEvent.team_members || currentEvent.event_participants || event.team_members || event.event_participants || []).length} {((currentEvent.team_members || currentEvent.event_participants || event.team_members || event.event_participants || []).length === 1) ? 'Member' : 'Members'}
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
                      className="font-mono text-xs font-bold px-2.5 py-1 h-auto rounded-lg border border-hack-gold/40 bg-hack-gold hover:brightness-105 text-hack-ink shadow-hack-sm"
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1" /> Add
                    </Button>
                  </div>
                </div>

                {/* Squad Badge if present */}
                {(currentEvent.squad?.name || currentEvent.squad_name || event.squad?.name || event.squad_name) && (
                  <div className="mb-3 p-2.5 bg-hack-gold/15 border border-hack-gold/40 rounded-lg flex items-center justify-between font-mono text-xs font-bold text-hack-ink shadow-hack-sm">
                    <span className="flex items-center gap-1.5 truncate">
                      <Shield className="h-3.5 w-3.5 text-hack-gold-dark shrink-0" />
                      ⚡ SQUAD: {currentEvent.squad?.name || currentEvent.squad_name || event.squad?.name || event.squad_name}
                    </span>
                    <Badge variant="outline" className="text-[10px] border-hack-muted bg-white font-mono shrink-0 rounded-md">
                      Synced Vault
                    </Badge>
                  </div>
                )}
                
                <div className="space-y-2">
                  {(currentEvent.team_members || currentEvent.event_participants || event.team_members || event.event_participants || []).map((member: any) => {
                    const isLead = member.is_lead || member.is_creator || member.role === 'lead' || member.role === 'owner' || member.role === 'leader'
                    const isCurrentUser = member.is_current_user || (member.user_id && (member.user_id === currentEvent.current_user_id || member.user_id === event.current_user_id))
                    const name = member.full_name || member.profile?.full_name || (isCurrentUser ? 'You' : 'Team Member')
                    const email = member.email || member.profile?.email || ''
                    const initial = (name.charAt(0) || 'U').toUpperCase()

                    return (
                      <div key={member.id || member.user_id} className="p-2.5 bg-hack-surface border border-hack-muted/60 rounded-lg shadow-hack-sm flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={cn(
                            "w-8 h-8 rounded-full border border-hack-muted/40 flex items-center justify-center font-mono text-xs font-bold text-hack-ink shrink-0",
                            isLead ? 'bg-hack-gold' : 'bg-hack-blue'
                          )}>
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="font-display text-sm font-bold text-hack-ink truncate">
                              {name}
                              {isCurrentUser && !name.toLowerCase().includes('you') && (
                                <span className="font-mono text-xs text-hack-subtext ml-1.5">(YOU)</span>
                              )}
                            </p>
                            <p className="font-mono text-[10px] text-hack-subtext truncate">{email || (isLead ? 'Team Lead' : 'Collaborator')}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isLead && (
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] font-bold uppercase border-hack-gold/40 bg-hack-gold/20 text-hack-gold-dark rounded-md"
                            >
                              LEAD
                            </Badge>
                          )}
                          {isCurrentUser && (
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] font-bold uppercase border-hack-blue/40 bg-hack-blue/20 text-hack-blue-dark rounded-md"
                            >
                              YOU
                            </Badge>
                          )}
                          {!isLead && !isCurrentUser && (
                            <Badge
                              variant="outline"
                              className="font-mono text-[10px] font-medium uppercase border-hack-muted bg-hack-sand text-hack-subtext rounded-md"
                            >
                              MEMBER
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Metadata */}
          <div className={cn(mobileWorkspaceTab !== 'team' && "hidden lg:block")}>
            <Card className="border border-hack-muted/60 bg-hack-surface rounded-xl shadow-hack-card overflow-hidden">
              <CardContent className="p-4 sm:p-5 space-y-3">
                <h3 className="font-display text-lg font-bold tracking-tight text-hack-ink border-b border-hack-muted/30 pb-2">
                  Event Details
                </h3>
                
                {event.source_url && (
                  <a 
                    href={ensureExternalUrl(event.source_url)} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="flex items-center text-xs font-mono font-semibold text-hack-ink hover:text-hack-coral p-2.5 rounded-lg border border-hack-muted bg-hack-sand/40 shadow-hack-sm transition-all"
                  >
                    <ExternalLink className="w-4 h-4 mr-2 text-hack-subtext" />
                    View Original Page
                  </a>
                )}
                
                <div className="flex items-center text-xs font-mono font-medium text-hack-ink p-2.5 rounded-lg border border-hack-muted bg-hack-sand/40 shadow-hack-sm">
                  <Calendar className="w-4 h-4 mr-2 text-hack-subtext" />
                  {event.start_date ? format(new Date(event.start_date), 'MMM d, yyyy') : 'TBA'}
                </div>

                {event.prize_pool && (
                  <div className="flex items-center text-xs font-mono font-bold text-hack-gold-dark p-2.5 rounded-lg border border-hack-gold/40 bg-hack-gold/20 shadow-hack-sm">
                    <Trophy className="w-4 h-4 mr-2 text-hack-gold-dark" />
                    Prize: {event.prize_pool}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Add Teammate Dialog */}
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogContent className="border border-hack-muted/60 bg-hack-surface rounded-xl shadow-hack-dialog max-w-md p-0 overflow-hidden">
              <DialogHeader className="p-4 border-b border-hack-muted/40 bg-hack-sand/50 text-hack-ink">
                <DialogTitle className="font-display text-base font-bold flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-hack-coral-dark" /> Bring Teammates In
                </DialogTitle>
                <DialogDescription className="font-mono text-xs text-hack-subtext">
                  Select a friend from your network to join this hackathon workspace.
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 space-y-3">
                {loadingFriends ? (
                  <div className="py-8 text-center font-mono text-xs text-hack-subtext flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading friends...
                  </div>
                ) : friends.length === 0 ? (
                  <div className="p-4 text-center border border-dashed border-hack-muted rounded-lg font-mono text-xs text-hack-subtext">
                    No connected friends found. Go to "People" to add teammates first!
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {friends.map((f) => {
                      const friendUserId = (f.friend_profile?.id && f.friend_profile.id !== 'unknown') 
                        ? f.friend_profile.id 
                        : (f.sender_id === event.created_by ? f.receiver_id : f.sender_id)
                      const friendName = f.friend_profile?.full_name || f.receiver_email
                      const friendEmail = f.friend_profile?.email || f.receiver_email

                      const existingIds = (event.event_participants || []).map((m: any) => m.user_id)
                      const isAlreadyIn = friendUserId && existingIds.includes(friendUserId)

                      return (
                        <div
                          key={f.id}
                          className="p-2.5 bg-hack-surface border border-hack-muted/60 rounded-lg flex items-center justify-between gap-2 shadow-hack-sm"
                        >
                          <div className="truncate">
                            <div className="font-display font-bold text-xs text-hack-ink truncate">{friendName}</div>
                            <div className="font-mono text-[10px] text-hack-subtext truncate">{friendEmail}</div>
                          </div>

                          {isAlreadyIn ? (
                            <Badge variant="outline" className="font-mono text-[10px] border-hack-muted bg-hack-sand text-hack-subtext shrink-0 rounded-md">
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
                                      title: 'Teammate Added',
                                      description: `${friendName} is now in the workspace.`,
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
                              className="font-mono text-xs font-bold rounded-lg border border-hack-coral bg-hack-coral hover:brightness-105 text-hack-ink shadow-hack-sm shrink-0"
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

          {/* Edit Event Dialog */}
          <EditEventDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            event={{ ...currentEvent, stages }}
          />

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent className="max-w-md border border-hack-muted/60 bg-hack-surface rounded-xl p-6 shadow-hack-dialog">
              <DialogHeader>
                <div className="flex items-center gap-2 text-hack-red">
                  <AlertTriangle className="w-5 h-5" />
                  <DialogTitle className="font-display text-xl font-bold text-hack-ink">
                    Delete Hackathon?
                  </DialogTitle>
                </div>
                <DialogDescription className="font-sans text-xs text-hack-subtext mt-2 leading-relaxed">
                  Are you sure you want to permanently delete <strong className="text-hack-ink font-semibold">"{event.title}"</strong>? All associated rounds, tasks, and resources will be removed. This cannot be undone.
                </DialogDescription>
              </DialogHeader>

              <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-hack-muted/30 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={isDeletingEvent}
                  className="w-full sm:w-auto font-mono text-xs border border-hack-muted rounded-lg"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleDeleteEvent}
                  disabled={isDeletingEvent}
                  className="w-full sm:w-auto font-mono text-xs bg-hack-red hover:bg-hack-red/90 text-white rounded-lg shadow-hack-hero font-bold"
                >
                  {isDeletingEvent ? 'Deleting...' : 'Delete Permanently'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}
