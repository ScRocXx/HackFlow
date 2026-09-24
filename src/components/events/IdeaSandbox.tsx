'use client'

import { useState, useRef, useMemo } from 'react'
import { 
  Lightbulb, Check, Plus, Trash2, Loader2, Sparkles, Star, Tag, Edit3, FileUp,
  Copy, FileText, CheckCircle2, Code, BookOpen, AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { 
  addProblemStatement, 
  chooseProblemStatement, 
  updateProblemStatement, 
  deleteProblemStatement 
} from '@/app/actions/events'
import { extractProblemStatementsFromPdf } from '@/app/actions/extract-pdf'
import { generateSubmissionBlurb } from '@/app/actions/generate-blurb'
import type { EventProblemStatement, MissionBrief } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

interface IdeaSandboxProps {
  eventId: string
  problemStatements: EventProblemStatement[]
  missionBrief?: MissionBrief | null
}

export function IdeaSandbox({ eventId, problemStatements = [], missionBrief }: IdeaSandboxProps) {
  const [statements, setStatements] = useState<EventProblemStatement[]>(problemStatements)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingPdf, setIsUploadingPdf] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Category filter state
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Submission blurb modal state
  const [blurbModalOpen, setBlurbModalOpen] = useState(false)
  const [blurbTarget, setBlurbTarget] = useState<EventProblemStatement | null>(null)
  const [blurbGithubUrl, setBlurbGithubUrl] = useState('')
  const [blurbDeckBase64, setBlurbDeckBase64] = useState<string | null>(null)
  const [blurbDeckFileName, setBlurbDeckFileName] = useState<string | null>(null)
  const [blurbDeckFileSizeMb, setBlurbDeckFileSizeMb] = useState<number | null>(null)
  const [blurbMaxWords, setBlurbMaxWords] = useState<number>(150)
  const [isGeneratingBlurb, setIsGeneratingBlurb] = useState(false)
  const [blurbResult, setBlurbResult] = useState<{
    elevator_pitch?: string
    architecture_summary?: string
    readmeFetched?: boolean
    deckAnalyzed?: boolean
  } | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const deckInputRef = useRef<HTMLInputElement>(null)

  // Domain categories derived from statements
  const availableCategories = useMemo(() => {
    const cats = new Set<string>()
    statements.forEach(s => {
      if (s.category && s.category.trim()) cats.add(s.category.trim())
    })
    return Array.from(cats)
  }, [statements])

  // Filtered statements based on active category
  const filteredStatements = useMemo(() => {
    if (selectedCategory === 'all') return statements
    return statements.filter(s => s.category?.trim().toLowerCase() === selectedCategory.toLowerCase())
  }, [statements, selectedCategory])

  const handleOpenBlurbModal = (stg: EventProblemStatement) => {
    setBlurbTarget(stg)
    setBlurbResult(null)
    setBlurbDeckBase64(null)
    setBlurbDeckFileName(null)
    setBlurbDeckFileSizeMb(null)
    setBlurbModalOpen(true)
  }

  // Client-side 7MB size guard for Presentation Deck PDF upload
  const handleBlurbDeckUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast({
        title: 'PDF Required',
        description: 'Please upload your presentation deck in PDF format.',
        variant: 'destructive',
      })
      return
    }

    const maxBytes = 7 * 1024 * 1024
    if (file.size > maxBytes) {
      toast({
        title: 'Deck Exceeds 7MB Guard',
        description: `Your deck is ${(file.size / (1024 * 1024)).toFixed(1)}MB. To prevent upload timeouts, please compress or keep deck under 7MB.`,
        variant: 'destructive',
      })
      if (deckInputRef.current) deckInputRef.current.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setBlurbDeckBase64(reader.result as string)
      setBlurbDeckFileName(file.name)
      setBlurbDeckFileSizeMb(Number((file.size / (1024 * 1024)).toFixed(2)))
    }
    reader.readAsDataURL(file)
  }

  const handleRunGenerateBlurb = async () => {
    if (!blurbTarget) return
    setIsGeneratingBlurb(true)
    try {
      const res = await generateSubmissionBlurb({
        eventId,
        problemStatementTitle: blurbTarget.title,
        problemStatementCategory: blurbTarget.category || undefined,
        problemStatementDescription: blurbTarget.description || undefined,
        solutionBullets: blurbTarget.solution_bullets || [],
        githubRepoUrl: blurbGithubUrl || null,
        pitchDeckBase64: blurbDeckBase64 || null,
        maxWords: blurbMaxWords,
        missionBrief: missionBrief || null,
      })

      if (!res.success) {
        throw new Error(res.error || 'Failed to generate blurb')
      }

      setBlurbResult({
        elevator_pitch: res.elevator_pitch,
        architecture_summary: res.architecture_summary,
        readmeFetched: res.readmeFetched,
        deckAnalyzed: res.deckAnalyzed,
      })

      toast({
        title: 'Submission Blurbs Ready!',
        description: 'Generated elevator pitch and architecture summary.',
      })
    } catch (err: any) {
      toast({
        title: 'Generation Failed',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsGeneratingBlurb(false)
    }
  }

  const handleCopyBlurbText = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    toast({ title: 'Copied to Clipboard!' })
    setTimeout(() => setCopiedField(null), 2000)
  }
  
  // New statement form
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newBullets, setNewBullets] = useState('')

  // Inline bullet adder state: map statementId -> string
  const [bulletInputs, setBulletInputs] = useState<Record<string, string>>({})
  const { toast } = useToast()

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast({
        title: 'PDF Required',
        description: 'Please select a hackathon brochure or problem statement PDF.',
        variant: 'destructive',
      })
      return
    }

    if (file.size > 15 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'PDF exceeds 15MB limit for native Gemini analysis.',
        variant: 'destructive',
      })
      return
    }

    setIsUploadingPdf(true)
    try {
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const base64 = reader.result as string
          const res = await extractProblemStatementsFromPdf(base64, eventId)
          if (!res.success) {
            throw new Error(res.error || 'Failed to parse problem statements from PDF.')
          }

          if (Array.isArray(res.data) && res.data.length > 0) {
            setStatements(prev => [...prev, ...(res.data as EventProblemStatement[])])
            toast({
              title: 'Brochure Ingested!',
              description: `Extracted and saved ${res.data.length} track(s) directly into your sandbox.`,
            })
          }
        } catch (err: any) {
          toast({
            title: 'Extraction Notice',
            description: err.message,
            variant: 'destructive',
          })
        } finally {
          setIsUploadingPdf(false)
          if (fileInputRef.current) fileInputRef.current.value = ''
        }
      }
      reader.readAsDataURL(file)
    } catch (err: any) {
      setIsUploadingPdf(false)
      toast({
        title: 'File Read Error',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  const handleChoose = async (statementId: string) => {
    try {
      const res = await chooseProblemStatement(eventId, statementId)
      if (!res.success) throw new Error(res.error)

      setStatements(prev => prev.map(s => ({
        ...s,
        is_chosen: s.id === statementId
      })))

      toast({
        title: 'Target Track Selected!',
        description: 'Tagged this problem statement as your squad\'s chosen solution direction.',
      })
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  const handleAddStatement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    setIsSubmitting(true)
    try {
      const bullets = newBullets
        .split('\n')
        .map(b => b.trim())
        .filter(Boolean)

      const res = await addProblemStatement(eventId, {
        title: newTitle.trim(),
        category: newCategory.trim() || undefined,
        description: newDesc.trim() || undefined,
        solution_bullets: bullets,
      })

      if (!res.success) throw new Error(res.error)

      setStatements(prev => [...prev, res.data as EventProblemStatement])
      toast({
        title: 'Problem Statement Added',
        description: 'New track added to your brainstorming sandbox.',
      })

      setIsAddModalOpen(false)
      setNewTitle('')
      setNewCategory('')
      setNewDesc('')
      setNewBullets('')
    } catch (err: any) {
      toast({ title: 'Failed to add', description: err.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddBullet = async (statementId: string) => {
    const text = (bulletInputs[statementId] || '').trim()
    if (!text) return

    const target = statements.find(s => s.id === statementId)
    if (!target) return

    const updatedBullets = [...(target.solution_bullets || []), text]
    try {
      const res = await updateProblemStatement(statementId, eventId, {
        solution_bullets: updatedBullets,
      })
      if (!res.success) throw new Error(res.error)

      setStatements(prev => prev.map(s => s.id === statementId ? { ...s, solution_bullets: updatedBullets } : s))
      setBulletInputs({ ...bulletInputs, [statementId]: '' })
    } catch (err: any) {
      toast({ title: 'Error adding bullet', description: err.message, variant: 'destructive' })
    }
  }

  const handleRemoveBullet = async (statementId: string, bulletIdx: number) => {
    const target = statements.find(s => s.id === statementId)
    if (!target) return

    const updatedBullets = target.solution_bullets.filter((_, idx) => idx !== bulletIdx)
    try {
      const res = await updateProblemStatement(statementId, eventId, {
        solution_bullets: updatedBullets,
      })
      if (!res.success) throw new Error(res.error)

      setStatements(prev => prev.map(s => s.id === statementId ? { ...s, solution_bullets: updatedBullets } : s))
    } catch (err: any) {
      toast({ title: 'Error removing bullet', description: err.message, variant: 'destructive' })
    }
  }

  const handleDeleteStatement = async (statementId: string) => {
    try {
      const res = await deleteProblemStatement(statementId, eventId)
      if (!res.success) throw new Error(res.error)

      setStatements(prev => prev.filter(s => s.id !== statementId))
      toast({ title: 'Statement Removed' })
    } catch (err: any) {
      toast({ title: 'Delete Failed', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <Card className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[7px_7px_0_#671912] overflow-hidden">
      <div className="bg-[#2e4742] p-5 border-b-2 border-[#10201d] text-[#f7f7f2] flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div className="flex items-center gap-2.5">
          <Lightbulb className="h-5 w-5 text-[#f5b726]" />
          <div>
            <h3 className="font-display text-2xl font-bold tracking-tight text-[#f7f7f2]">
              Problem Statement & Brainstorming
            </h3>
            <p className="font-mono text-xs text-[#8bb2de]">
              Pick your problem statement track and outline what you're actually building.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            disabled={isUploadingPdf}
            onClick={() => fileInputRef.current?.click()}
            className="font-mono text-xs font-bold border-2 border-[#10201d] bg-[#8bb2de] hover:bg-[#a9c9f0] text-[#10201d] shadow-[2px_2px_0_#10201d] shrink-0"
          >
            {isUploadingPdf ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Ingesting PDF...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 mr-1 text-[#10201d]" /> Ingest PDF Brochure
              </>
            )}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            accept="application/pdf"
            className="hidden"
            onChange={handlePdfUpload}
          />

          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="font-mono text-xs font-bold border-2 border-[#10201d] bg-[#f5b726] hover:bg-[#ffcf66] text-[#10201d] shadow-[2px_2px_0_#8a5d13] shrink-0"
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Track / Idea
          </Button>
        </div>
      </div>

      {/* Sticky Amber Stack Restriction Reminder Badge */}
      {missionBrief?.tech_stack_mandate?.is_stack_restricted && (
        <div className="sticky top-0 z-20 bg-[#fef3cd] border-b-2 border-[#10201d] px-5 py-2.5 shadow-[0_2px_4px_rgba(0,0,0,0.08)] flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-bold text-[#8a5d13] uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4 text-[#e53927] animate-pulse" />
              Mandatory Stack Required:
            </span>
            {(missionBrief.tech_stack_mandate.mandatory_tools || []).map((tool, idx) => (
              <span
                key={idx}
                className="font-mono text-xs font-bold px-2 py-0.5 border-2 border-[#e53927] bg-[#f6c4c1] text-[#671912] shadow-[1px_1px_0_#671912] flex items-center gap-1"
              >
                <span>⚡</span> {tool}
              </span>
            ))}
            {(missionBrief.tech_stack_mandate.bonus_sponsor_tools || []).map((tool, idx) => (
              <span
                key={`bonus-${idx}`}
                className="font-mono text-xs font-bold px-2 py-0.5 border-2 border-[#10201d] bg-[#f5b726] text-[#10201d] shadow-[1px_1px_0_#10201d] flex items-center gap-1"
              >
                <span>⭐</span> {tool} (Bonus)
              </span>
            ))}
          </div>
          <span className="font-mono text-[10px] font-bold text-[#8a5d13] hidden md:inline-block">
            {missionBrief.tech_stack_mandate.allowed_stack_summary}
          </span>
        </div>
      )}

      <CardContent className="p-5 space-y-4">
        {/* Category Filter Pills */}
        {availableCategories.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono">
            <span className="text-[#34433f] font-bold uppercase text-[10px] mr-1 shrink-0 flex items-center gap-1">
              <Tag className="w-3 h-3 text-[#2e4742]" /> Track Filter:
            </span>
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={cn(
                "px-2.5 py-1 font-bold border-2 transition-all shrink-0",
                selectedCategory === 'all'
                  ? "border-[#10201d] bg-[#10201d] text-[#f7f7f2] shadow-[2px_2px_0_#e97b77]"
                  : "border-[#10201d] bg-white text-[#10201d] hover:bg-[#f2f2eb]"
              )}
            >
              All ({statements.length})
            </button>
            {availableCategories.map(cat => {
              const count = statements.filter(s => s.category?.trim().toLowerCase() === cat.toLowerCase()).length
              const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase()
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(isSelected ? 'all' : cat)}
                  className={cn(
                    "px-2.5 py-1 font-bold border-2 transition-all shrink-0 uppercase text-[11px]",
                    isSelected
                      ? "border-[#10201d] bg-[#f5b726] text-[#10201d] shadow-[2px_2px_0_#8a5d13]"
                      : "border-[#10201d] bg-white text-[#10201d] hover:bg-[#8bb2de]/30"
                  )}
                >
                  [{cat}] ({count})
                </button>
              )
            })}
          </div>
        )}

        {filteredStatements.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-[#10201d] text-center bg-[#f2f2eb]">
            <Lightbulb className="h-8 w-8 text-[#34433f] mx-auto opacity-40 mb-2" />
            <p className="font-display text-lg font-bold text-[#10201d]">
              {selectedCategory === 'all' ? 'No Problem Statements Added' : `No Statements under "${selectedCategory}"`}
            </p>
            <p className="font-mono text-xs text-[#34433f] mt-1 max-w-sm mx-auto">
              {selectedCategory === 'all'
                ? 'Add competition themes or ingest a brochure PDF so your squad can decide on the winning angle.'
                : 'Clear the filter or add tracks under this category.'}
            </p>
            <Button
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 font-mono text-xs font-bold border-2 border-[#10201d] bg-[#e97b77] text-[#10201d] shadow-[2px_2px_0_#671912]"
            >
              + Add First Track
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredStatements.map((stg) => {
              const isChosen = stg.is_chosen

              return (
                <div
                  key={stg.id}
                  className={cn(
                    "border-2 border-[#10201d] p-4 flex flex-col justify-between transition-all",
                    isChosen 
                      ? "bg-[#fffdf0] shadow-[5px_5px_0_#8a5d13] ring-2 ring-[#f5b726]" 
                      : "bg-white shadow-[4px_4px_0_#10201d]"
                  )}
                >
                  <div>
                    {/* Header: Category & Chosen Status */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {stg.category && (
                          <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 border border-[#10201d] bg-[#8bb2de] text-[#10201d]">
                            {stg.category}
                          </span>
                        )}
                        {isChosen && (
                          <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 border-2 border-[#10201d] bg-[#f5b726] text-[#10201d] flex items-center gap-1 shadow-[1px_1px_0_#10201d]">
                            <Star className="w-3 h-3 fill-[#10201d]" /> Chosen Track
                          </span>
                        )}
                      </div>

                      <button
                        onClick={() => handleDeleteStatement(stg.id)}
                        className="text-[#10201d] hover:text-[#e53927] p-1"
                        title="Delete track"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className="font-display text-lg font-bold text-[#10201d] leading-snug">
                      {stg.title}
                    </h4>

                    {stg.description && (
                      <p className="font-mono text-xs text-[#34433f] mt-1.5 line-clamp-3">
                        {stg.description}
                      </p>
                    )}

                    {/* Solution Angle Scratchpad */}
                    <div className="mt-3.5 pt-3 border-t-2 border-[#10201d]/20 space-y-2">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#10201d] block">
                        Core Solution Angles / Scratchpad ({stg.solution_bullets?.length || 0})
                      </span>

                      <div className="space-y-1.5">
                        {(stg.solution_bullets || []).map((bullet, bIdx) => (
                          <div 
                            key={bIdx}
                            className="flex items-start gap-1.5 font-mono text-xs text-[#10201d] bg-[#f2f2eb] p-1.5 border border-[#10201d]"
                          >
                            <span className="text-[#e53927] font-bold select-none">•</span>
                            <span className="flex-1 min-w-0">{bullet}</span>
                            <button
                              onClick={() => handleRemoveBullet(stg.id, bIdx)}
                              className="text-[#e53927] hover:font-bold px-1"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add bullet input */}
                      <div className="flex gap-1.5 mt-2">
                        <Input
                          placeholder="Jot down solution angle bullet..."
                          value={bulletInputs[stg.id] || ''}
                          onChange={(e) => setBulletInputs({ ...bulletInputs, [stg.id]: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddBullet(stg.id))}
                          className="h-8 font-mono text-xs border border-[#10201d] bg-white flex-1"
                        />
                        <Button
                          size="sm"
                          type="button"
                          onClick={() => handleAddBullet(stg.id)}
                          className="h-8 font-mono text-xs font-bold border border-[#10201d] bg-[#8bb2de] text-[#10201d] px-2.5 shrink-0"
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Footer Actions: Blurb Generator & Choose */}
                  <div className="pt-4 mt-3 border-t-2 border-[#10201d] flex items-center justify-between gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenBlurbModal(stg)}
                      className="font-mono text-xs font-bold border-2 border-[#10201d] bg-[#f7f7f2] hover:bg-[#ffe3dc] text-[#10201d] shadow-[2px_2px_0_#10201d]"
                      title="Generate 3:30 AM Submission Blurbs from README & Deck"
                    >
                      <Sparkles className="w-3.5 h-3.5 mr-1 text-[#e53927]" />
                      Submission Blurb
                    </Button>

                    <div>
                      {isChosen ? (
                        <span className="font-mono text-xs font-bold text-[#2e4742] flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-[#2e4742]" /> Active Team Selection
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleChoose(stg.id)}
                          className="font-mono text-xs font-bold border-2 border-[#10201d] bg-[#f5b726] hover:bg-[#ffcf66] text-[#10201d] shadow-[2px_2px_0_#8a5d13]"
                        >
                          Tag as Chosen Track
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      {/* Add Problem Statement Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[500px] border-2 border-[#10201d] bg-[#f7f7f2] shadow-[8px_8px_0_#671912] p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold text-[#10201d]">
              Add Problem Statement / Track
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-[#34433f]">
              Paste or type a problem statement for your squad to evaluate during calls.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddStatement} className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">Track / Statement Title *</label>
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. AI-Powered Disaster Response System"
                className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">Category / Domain</label>
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="e.g. Healthcare, Web3, Climate Tech"
                className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">Brief Description</label>
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Key requirements and user problem..."
                rows={2}
                className="w-full p-2 font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d] focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">
                Initial Solution Bullets (one per line)
              </label>
              <textarea
                value={newBullets}
                onChange={(e) => setNewBullets(e.target.value)}
                placeholder="• Multi-modal agent architecture&#10;• Offline edge fallback"
                rows={2}
                className="w-full p-2 font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d] focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                className="font-mono text-xs font-bold border-2 border-[#10201d] bg-[#f2f2eb]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="font-mono text-xs font-bold border-2 border-[#10201d] bg-[#e97b77] hover:bg-[#f6c4c1] text-[#10201d] shadow-[3px_3px_0_#671912]"
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Track'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* 3:30 AM Submission Blurb Generator Modal */}
      <Dialog open={blurbModalOpen} onOpenChange={setBlurbModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-[#10201d] bg-[#f7f7f2] shadow-[10px_10px_0_#671912] p-6">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-[#e53927] text-white border border-[#10201d]">
                SUBMISSION WEAPON
              </span>
              <span className="font-mono text-xs text-[#34433f]">3:30 AM Crunch Time</span>
            </div>
            <DialogTitle className="font-display text-2xl font-bold text-[#10201d] mt-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#f5b726]" />
              Submission Blurb Generator
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-[#34433f]">
              Synthesize your GitHub README, presentation deck, and solution bullets into crisp, winning blurbs for submission forms (Unstop, Devfolio, Devpost).
            </DialogDescription>
          </DialogHeader>

          {blurbTarget && (
            <div className="space-y-4 py-2">
              {/* Selected Track Info */}
              <div className="p-3 border-2 border-[#10201d] bg-[#f2f2eb]">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-mono text-[10px] font-bold uppercase text-[#34433f]">Target Track</span>
                  {blurbTarget.category && (
                    <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 border border-[#10201d] bg-[#8bb2de] text-[#10201d]">
                      {blurbTarget.category}
                    </span>
                  )}
                </div>
                <h4 className="font-display text-base font-bold text-[#10201d]">
                  {blurbTarget.title}
                </h4>
                {blurbTarget.solution_bullets && blurbTarget.solution_bullets.length > 0 && (
                  <p className="font-mono text-xs text-[#34433f] mt-1">
                    {blurbTarget.solution_bullets.length} solution bullet(s) ready to feed Gemini.
                  </p>
                )}
              </div>

              {/* Input 1: GitHub Repo URL */}
              <div className="space-y-1">
                <label className="font-mono text-xs font-bold uppercase text-[#10201d] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Code className="w-3.5 h-3.5" /> GitHub Repository URL (Optional)
                  </span>
                  <span className="text-[10px] text-[#34433f] lowercase font-normal">Fetches raw README directly (main/master)</span>
                </label>
                <Input
                  value={blurbGithubUrl}
                  onChange={(e) => setBlurbGithubUrl(e.target.value)}
                  placeholder="https://github.com/username/hackathon-project"
                  className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
                />
              </div>

              {/* Input 2: Presentation Deck PDF Dropzone */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-xs font-bold uppercase text-[#10201d] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" /> Presentation Deck PDF (Optional)
                  </label>
                  <span className="font-mono text-[10px] font-bold text-[#e53927] border border-[#e53927] px-1.5 py-0.2 bg-[#ffe3dc]">
                    Guard: Max 7MB
                  </span>
                </div>

                {blurbDeckFileName ? (
                  <div className="p-3 border-2 border-[#10201d] bg-[#8bb2de]/20 flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-[#10201d] shrink-0" />
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-bold text-[#10201d] truncate">
                          {blurbDeckFileName}
                        </p>
                        <p className="font-mono text-[10px] text-[#34433f]">
                          {blurbDeckFileSizeMb} MB • Ready for multimodal document scan
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setBlurbDeckBase64(null)
                        setBlurbDeckFileName(null)
                        setBlurbDeckFileSizeMb(null)
                        if (deckInputRef.current) deckInputRef.current.value = ''
                      }}
                      className="font-mono text-xs text-[#e53927] hover:bg-[#ffe3dc] h-7 px-2"
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div
                    onClick={() => deckInputRef.current?.click()}
                    className="p-4 border-2 border-dashed border-[#10201d] bg-white text-center cursor-pointer hover:bg-[#f2f2eb] transition-colors"
                  >
                    <FileUp className="w-6 h-6 text-[#34433f] mx-auto mb-1 opacity-70" />
                    <p className="font-mono text-xs font-bold text-[#10201d]">
                      Click to upload pitch deck (PDF)
                    </p>
                    <p className="font-mono text-[10px] text-[#34433f] mt-0.5">
                      Gemini 1.5 Flash natively scans slides for problem hooks and tech diagrams (max 7MB).
                    </p>
                  </div>
                )}
                <input
                  type="file"
                  ref={deckInputRef}
                  accept="application/pdf"
                  className="hidden"
                  onChange={handleBlurbDeckUpload}
                />
              </div>

              {/* Input 3: Word Count Cap */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="font-mono text-xs font-bold uppercase text-[#10201d]">
                  Word Limit per Field:
                </span>
                <div className="flex items-center gap-1.5 font-mono text-xs">
                  {[100, 150, 200, 250].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setBlurbMaxWords(w)}
                      className={cn(
                        "px-2 py-0.5 border-2 font-bold transition-all",
                        blurbMaxWords === w
                          ? "border-[#10201d] bg-[#f5b726] text-[#10201d] shadow-[2px_2px_0_#8a5d13]"
                          : "border-[#10201d] bg-white text-[#10201d] hover:bg-[#f2f2eb]"
                      )}
                    >
                      {w}w {w === 150 ? '★' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Mission Brief Grounding Context Note */}
              {missionBrief && (
                <div className="p-2.5 bg-[#fef3cd] border-2 border-[#f5b726] text-[11px] font-mono text-[#8a5d13] flex items-start gap-2 shadow-[2px_2px_0_#8a5d13]">
                  <span className="text-sm">🎯</span>
                  <div className="space-y-0.5">
                    <p className="font-bold text-[#10201d]">Mission Brief Synergy Active:</p>
                    <p className="text-[10px] text-[#34433f]">
                      Pitch grounded in sponsor motive (<em>"{missionBrief.why_it_exists}"</em>) and architecture features mandatory tools ({missionBrief.tech_stack_mandate.is_stack_restricted ? missionBrief.tech_stack_mandate.mandatory_tools.join(', ') : 'open stack'}).
                    </p>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <Button
                type="button"
                disabled={isGeneratingBlurb}
                onClick={handleRunGenerateBlurb}
                className="w-full font-mono text-xs font-bold border-2 border-[#10201d] bg-[#e97b77] hover:bg-[#f6c4c1] text-[#10201d] shadow-[4px_4px_0_#671912] h-10 mt-2"
              >
                {isGeneratingBlurb ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing README & Deck with Gemini 1.5 Flash...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 text-[#10201d]" />
                    Generate Submission Blurbs ({blurbMaxWords} words cap)
                  </>
                )}
              </Button>

              {/* Results View */}
              {blurbResult && (
                <div className="mt-4 pt-4 border-t-2 border-[#10201d] space-y-4">
                  <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
                    <span className="font-bold text-[#10201d] uppercase">Materials Used:</span>
                    {blurbResult.readmeFetched ? (
                      <span className="px-2 py-0.5 bg-[#d4edda] text-[#155724] border border-[#c3e6cb] font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> GitHub README Ingested
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-[#f2f2eb] text-[#34433f] border border-[#10201d]/20">
                        README Skipped
                      </span>
                    )}
                    {blurbResult.deckAnalyzed ? (
                      <span className="px-2 py-0.5 bg-[#d4edda] text-[#155724] border border-[#c3e6cb] font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Presentation Deck Analysed
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-[#f2f2eb] text-[#34433f] border border-[#10201d]/20">
                        Deck Skipped
                      </span>
                    )}
                    {missionBrief?.why_it_exists && (
                      <span className="px-2 py-0.5 bg-[#fef3cd] text-[#8a5d13] border border-[#f5b726] font-bold flex items-center gap-1">
                        🎯 Sponsor Motive Grounded
                      </span>
                    )}
                    {missionBrief?.tech_stack_mandate?.is_stack_restricted && (
                      <span className="px-2 py-0.5 bg-[#f6c4c1] text-[#671912] border border-[#e53927] font-bold flex items-center gap-1">
                        ⚡ Mandatory Stack Integrated
                      </span>
                    )}
                  </div>

                  {/* Field 1: Elevator Pitch */}
                  <div className="space-y-1.5 p-3.5 border-2 border-[#10201d] bg-white shadow-[3px_3px_0_#10201d]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold uppercase text-[#10201d] bg-[#f5b726] px-2 py-0.5 border border-[#10201d]">
                          1. Elevator Pitch
                        </span>
                        <span className="font-mono text-[10px] text-[#34433f]">
                          {blurbResult.elevator_pitch?.split(/\s+/).filter(Boolean).length || 0} words
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleCopyBlurbText(blurbResult.elevator_pitch || '', 'pitch')}
                        className="font-mono text-xs font-bold border border-[#10201d] bg-[#8bb2de] hover:bg-[#a9c9f0] text-[#10201d] h-7 px-2.5"
                      >
                        {copiedField === 'pitch' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-[#155724]" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 mr-1" /> Copy Pitch
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="font-mono text-xs text-[#10201d] leading-relaxed whitespace-pre-wrap bg-[#f7f7f2] p-2.5 border border-[#10201d]/30">
                      {blurbResult.elevator_pitch}
                    </p>
                  </div>

                  {/* Field 2: Architecture Summary */}
                  <div className="space-y-1.5 p-3.5 border-2 border-[#10201d] bg-white shadow-[3px_3px_0_#10201d]">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold uppercase text-[#10201d] bg-[#8bb2de] px-2 py-0.5 border border-[#10201d]">
                          2. Architecture Summary
                        </span>
                        <span className="font-mono text-[10px] text-[#34433f]">
                          {blurbResult.architecture_summary?.split(/\s+/).filter(Boolean).length || 0} words
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleCopyBlurbText(blurbResult.architecture_summary || '', 'arch')}
                        className="font-mono text-xs font-bold border border-[#10201d] bg-[#8bb2de] hover:bg-[#a9c9f0] text-[#10201d] h-7 px-2.5"
                      >
                        {copiedField === 'arch' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-[#155724]" /> Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 mr-1" /> Copy Tech Stack
                          </>
                        )}
                      </Button>
                    </div>
                    <p className="font-mono text-xs text-[#10201d] leading-relaxed whitespace-pre-wrap bg-[#f7f7f2] p-2.5 border border-[#10201d]/30">
                      {blurbResult.architecture_summary}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setBlurbModalOpen(false)}
              className="font-mono text-xs font-bold border-2 border-[#10201d] bg-[#f2f2eb]"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
