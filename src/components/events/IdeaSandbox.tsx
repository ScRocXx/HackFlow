'use client'

import { useState } from 'react'
import { 
  Lightbulb, Check, Plus, Trash2, Loader2, Sparkles, Star, Tag, Edit3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { 
  addProblemStatement, 
  chooseProblemStatement, 
  updateProblemStatement, 
  deleteProblemStatement 
} from '@/app/actions/events'
import type { EventProblemStatement } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

interface IdeaSandboxProps {
  eventId: string
  problemStatements: EventProblemStatement[]
}

export function IdeaSandbox({ eventId, problemStatements = [] }: IdeaSandboxProps) {
  const [statements, setStatements] = useState<EventProblemStatement[]>(problemStatements)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // New statement form
  const [newTitle, setNewTitle] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [newBullets, setNewBullets] = useState('')

  // Inline bullet adder state: map statementId -> string
  const [bulletInputs, setBulletInputs] = useState<Record<string, string>>({})
  const { toast } = useToast()

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
              Google Meet Idea Sandbox
            </h3>
            <p className="font-mono text-xs text-[#8bb2de]">
              Tag your chosen track during team calls and define 2–3 solution angles.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          onClick={() => setIsAddModalOpen(true)}
          className="font-mono text-xs font-bold border-2 border-[#10201d] bg-[#f5b726] hover:bg-[#ffcf66] text-[#10201d] shadow-[2px_2px_0_#8a5d13] shrink-0"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Track / Idea
        </Button>
      </div>

      <CardContent className="p-5 space-y-4">
        {statements.length === 0 ? (
          <div className="p-8 border-2 border-dashed border-[#10201d] text-center bg-[#f2f2eb]">
            <Lightbulb className="h-8 w-8 text-[#34433f] mx-auto opacity-40 mb-2" />
            <p className="font-display text-lg font-bold text-[#10201d]">No Problem Statements Added</p>
            <p className="font-mono text-xs text-[#34433f] mt-1 max-w-sm mx-auto">
              Add competition themes or problem statement options here so your squad can decide on the winning angle.
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
            {statements.map((stg) => {
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

                  {/* Footer Tag As Chosen Action */}
                  <div className="pt-4 mt-3 border-t-2 border-[#10201d] flex justify-end">
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
    </Card>
  )
}
