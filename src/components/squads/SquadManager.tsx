'use client'

import React, { useState } from 'react'
import { Squad, Friendship, SquadMember } from '@/lib/supabase/types'
import { createSquad, deleteSquad, addSquadMember, removeSquadMember } from '@/app/actions/squads'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Users, Plus, Trash2, LogOut, FolderKanban, Check, UserPlus, Copy, Link as LinkIcon } from 'lucide-react'
import Link from 'next/link'

interface SquadManagerProps {
  initialSquads: Squad[]
  friends: Friendship[]
  currentUserId: string
}

export function SquadManager({ initialSquads, friends, currentUserId }: SquadManagerProps) {
  const [squads, setSquads] = useState<Squad[]>(initialSquads)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [squadName, setSquadName] = useState('')
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [copiedSquadId, setCopiedSquadId] = useState<string | null>(null)

  // Add member modal state
  const [activeSquadForAdd, setActiveSquadForAdd] = useState<Squad | null>(null)
  const [selectedFriendToAdd, setSelectedFriendToAdd] = useState<string>('')

  const { toast } = useToast()

  const handleCopyInviteLink = (squad: Squad) => {
    const code = squad.invite_code || squad.id.slice(0, 8).toUpperCase()
    const url = typeof window !== 'undefined' ? `${window.location.origin}/join/${code}` : `https://hackflow.app/join/${code}`
    navigator.clipboard.writeText(url)
    setCopiedSquadId(squad.id)
    toast({
      title: 'Invite link copied!',
      description: 'Share this link with your teammates on WhatsApp or Discord.',
      variant: 'success',
    })
    setTimeout(() => {
      setCopiedSquadId((prev) => (prev === squad.id ? null : prev))
    }, 2500)
  }

  const handleToggleFriend = (userId: string) => {
    if (selectedFriendIds.includes(userId)) {
      setSelectedFriendIds(selectedFriendIds.filter((id) => id !== userId))
    } else {
      setSelectedFriendIds([...selectedFriendIds, userId])
    }
  }

  const handleCreateSquad = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!squadName.trim()) return

    setCreating(true)
    try {
      const res = await createSquad(squadName.trim(), selectedFriendIds)
      if (res.success && res.data) {
        toast({
          title: 'Squad Created!',
          description: `"${squadName.trim()}" is ready with independent squad vault.`,
          variant: 'success',
        })
        // Construct local squad preview
        const newSquad: Squad = {
          ...res.data,
          member_count: selectedFriendIds.length + 1,
        }
        setSquads([newSquad, ...squads])
        setSquadName('')
        setSelectedFriendIds([])
        setIsCreateOpen(false)
      } else {
        toast({
          title: 'Could not create squad',
          description: res.error,
          variant: 'destructive',
        })
      }
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteSquad = async (squadId: string) => {
    if (!confirm('Are you sure you want to delete this squad? All squad vault records will be cleared.')) return
    setActionLoading(squadId)
    try {
      const res = await deleteSquad(squadId)
      if (res.success) {
        setSquads(squads.filter((s) => s.id !== squadId))
        toast({ title: 'Squad deleted', variant: 'destructive' })
      } else {
        toast({ title: 'Delete failed', description: res.error, variant: 'destructive' })
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleLeaveSquad = async (squadId: string) => {
    if (!confirm('Are you sure you want to leave this squad?')) return
    setActionLoading(squadId)
    try {
      const res = await removeSquadMember(squadId, currentUserId)
      if (res.success) {
        setSquads(squads.filter((s) => s.id !== squadId))
        toast({ title: 'Left squad' })
      } else {
        toast({ title: 'Failed to leave', description: res.error, variant: 'destructive' })
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleAddMemberToSquad = async () => {
    if (!activeSquadForAdd || !selectedFriendToAdd) return
    setActionLoading('add-member')
    try {
      const res = await addSquadMember(activeSquadForAdd.id, selectedFriendToAdd)
      if (res.success) {
        toast({ title: 'Teammate added to squad!', variant: 'success' })
        // Update squad in local state
        const addedFriend = friends.find(
          (f) => f.sender_id === selectedFriendToAdd || f.receiver_id === selectedFriendToAdd
        )
        const newMember: SquadMember = {
          id: Math.random().toString(),
          squad_id: activeSquadForAdd.id,
          user_id: selectedFriendToAdd,
          role: 'member',
          joined_at: new Date().toISOString(),
          profile: addedFriend?.friend_profile,
        }

        setSquads(
          squads.map((s) => {
            if (s.id === activeSquadForAdd.id) {
              const currentMembers = s.members || []
              return {
                ...s,
                members: [...currentMembers, newMember],
                member_count: (s.member_count || currentMembers.length) + 1,
              }
            }
            return s
          })
        )
        setActiveSquadForAdd(null)
        setSelectedFriendToAdd('')
      } else {
        toast({ title: 'Could not add member', description: res.error, variant: 'destructive' })
      }
    } finally {
      setActionLoading(null)
    }
  }

  // Pre-filter friends who are already connected
  const validFriends = friends.filter((f) => f.status === 'accepted')

  return (
    <div className="space-y-6">
      {/* Squad Header & CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-hack-surface border border-hack-muted/30 rounded-xl shadow-hack-card">
        <div>
          <h2 className="font-display font-bold text-xl text-hack-ink">Your people, across hackathons.</h2>
          <p className="font-mono text-xs text-hack-subtext mt-1">
            Keep teammates around. Build faster next time.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="font-mono text-xs font-semibold bg-hack-coral text-white hover:bg-hack-coral/90 shadow-hack-hero rounded-lg px-4 py-2 flex-shrink-0"
        >
          <Plus className="h-4 w-4 mr-1.5" /> Create New Squad
        </Button>
      </div>

      {/* Squad Cards Grid */}
      {squads.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-hack-muted/40 p-8 bg-hack-surface rounded-xl shadow-hack-card">
          <Users className="h-12 w-12 mx-auto text-hack-subtext mb-3 opacity-60" />
          <h3 className="font-display font-bold text-lg text-hack-ink">No squads formed yet</h3>
          <p className="font-mono text-xs text-hack-subtext mt-1 max-w-md mx-auto">
            Form your first squad with accepted teammates to share master slide decks, Figma kits, and registration profiles.
          </p>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="mt-4 font-mono text-xs font-semibold bg-hack-coral text-white hover:bg-hack-coral/90 shadow-hack-hero rounded-lg"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Form a Squad Now
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {squads.map((squad) => {
            const isCreator = squad.created_by === currentUserId
            const members = squad.members || []

            return (
              <Card
                key={squad.id}
                className="border border-hack-muted/30 bg-hack-surface shadow-hack-card rounded-xl flex flex-col justify-between overflow-hidden hover:border-hack-muted/60 transition-all"
              >
                <div>
                  <CardHeader className="p-4 border-b border-hack-muted/20 bg-hack-sand/50 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-hack-forest text-hack-sand font-mono font-bold flex items-center justify-center text-xs shadow-sm">
                        {squad.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <CardTitle className="font-display text-base font-bold text-hack-ink">{squad.name}</CardTitle>
                        <p className="font-mono text-[11px] text-hack-subtext">
                          {squad.member_count || members.length || 1} members · {isCreator ? 'You lead this squad' : 'Member'}
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={`font-mono text-[11px] border-0 rounded-full px-2.5 py-0.5 ${
                        isCreator ? 'bg-hack-gold/15 text-hack-gold font-bold' : 'bg-hack-blue/15 text-hack-blue font-medium'
                      }`}
                    >
                      {isCreator ? 'LEADER' : 'MEMBER'}
                    </Badge>
                  </CardHeader>

                  <CardContent className="p-4 space-y-4">
                    {/* Member Avatars & List */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-hack-subtext uppercase tracking-wider">
                          Roster ({squad.member_count || members.length || 1})
                        </span>
                        {isCreator && (
                          <button
                            onClick={() => {
                              setActiveSquadForAdd(squad)
                              setSelectedFriendToAdd('')
                            }}
                            className="font-mono text-xs text-hack-forest hover:text-hack-coral flex items-center gap-1 font-semibold transition-colors"
                          >
                            <UserPlus className="h-3.5 w-3.5" /> Add Teammate
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {members.length > 0 ? (
                          members.map((m) => {
                            const name = m.profile?.full_name || m.profile?.email || 'Member'
                            return (
                              <Badge
                                key={m.id}
                                variant="outline"
                                className="font-mono text-xs border border-hack-muted/30 bg-hack-sand/60 text-hack-ink py-1 px-2.5 rounded-lg flex items-center gap-1.5"
                              >
                                <span>{name}</span>
                                {m.role === 'leader' && (
                                  <span className="text-[10px] bg-hack-gold/25 text-hack-gold px-1 rounded font-bold">L</span>
                                )}
                              </Badge>
                            )
                          })
                        ) : (
                          <span className="font-mono text-xs text-hack-subtext">
                            {squad.member_count || 1} active teammate(s)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Shareable Team Invite Link */}
                    <div className="pt-2 border-t border-hack-muted/20">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-hack-sand/40 p-2.5 rounded-lg border border-hack-muted/25">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <LinkIcon className="h-3.5 w-3.5 text-hack-subtext shrink-0" />
                          <span className="font-mono text-[11px] text-hack-subtext truncate">
                            {typeof window !== 'undefined'
                              ? `${window.location.host}/join/${squad.invite_code || squad.id.slice(0, 8).toUpperCase()}`
                              : `hackflow.app/join/${squad.invite_code || squad.id.slice(0, 8).toUpperCase()}`}
                          </span>
                        </div>
                        <Button
                          type="button"
                          onClick={() => handleCopyInviteLink(squad)}
                          size="sm"
                          className="font-mono text-xs font-medium border border-hack-muted/30 bg-hack-surface text-hack-ink hover:bg-hack-sand shadow-sm rounded-md shrink-0 h-7 px-2.5 transition-colors"
                        >
                          {copiedSquadId === squad.id ? (
                            <>
                              <Check className="h-3 w-3 mr-1 text-hack-mint" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 mr-1" /> Copy link
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Bottom Actions */}
                <div className="p-3.5 border-t border-hack-muted/20 bg-hack-sand/20 flex items-center justify-between gap-2">
                  <Link href={`/vault?squad=${squad.id}`}>
                    <Button
                      size="sm"
                      className="font-mono text-xs font-semibold bg-hack-forest text-hack-sand hover:bg-hack-forest/90 rounded-lg shadow-sm"
                    >
                      <FolderKanban className="h-3.5 w-3.5 mr-1.5" /> Open Squad Vault
                    </Button>
                  </Link>

                  <div>
                    {isCreator ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSquad(squad.id)}
                        disabled={actionLoading === squad.id}
                        className="text-hack-coral hover:bg-hack-coral/10 hover:text-hack-coral font-mono text-xs rounded-lg"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Disband
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleLeaveSquad(squad.id)}
                        disabled={actionLoading === squad.id}
                        className="text-hack-coral hover:bg-hack-coral/10 hover:text-hack-coral font-mono text-xs rounded-lg"
                      >
                        <LogOut className="h-3.5 w-3.5 mr-1" /> Leave
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Squad Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="border border-hack-muted/30 bg-hack-surface shadow-hack-dialog rounded-2xl max-w-lg p-0 overflow-hidden">
          <DialogHeader className="p-5 border-b border-hack-muted/20 bg-hack-forest text-hack-sand">
            <DialogTitle className="font-display text-lg font-bold">Form a New Squad</DialogTitle>
            <DialogDescription className="font-mono text-xs text-hack-sand/80 mt-1">
              Create an isolated team workspace with its own quick-fill profile cards and shared decks.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSquad} className="p-5 space-y-4">
            <div>
              <label className="block font-mono text-xs font-bold text-hack-ink uppercase tracking-wider mb-1.5">
                Squad Name
              </label>
              <Input
                placeholder="e.g. Team Northern Blades, AI Inference Lab"
                value={squadName}
                onChange={(e) => setSquadName(e.target.value)}
                required
                className="font-mono text-sm border border-hack-muted/40 rounded-lg bg-hack-surface focus:border-hack-coral focus:ring-1 focus:ring-hack-coral/25"
              />
            </div>

            <div>
              <label className="block font-mono text-xs font-bold text-hack-ink uppercase tracking-wider mb-2">
                Select Squad Teammates ({selectedFriendIds.length} selected)
              </label>
              {validFriends.length === 0 ? (
                <div className="p-3.5 bg-hack-sand/50 rounded-lg border border-hack-muted/30 font-mono text-xs text-hack-subtext">
                  You have no connected friends yet. You can still form this squad now and invite teammates later!
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 border border-hack-muted/30 rounded-lg bg-hack-surface p-2">
                  {validFriends.map((f) => {
                    const friendId = f.sender_id === currentUserId ? f.receiver_id! : f.sender_id
                    const profile = f.friend_profile
                    const name = profile?.full_name || f.receiver_email
                    const isSelected = selectedFriendIds.includes(friendId)

                    return (
                      <div
                        key={f.id}
                        onClick={() => handleToggleFriend(friendId)}
                        className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-hack-sand border-hack-forest/40'
                            : 'bg-hack-surface border-hack-muted/20 hover:bg-hack-sand/50'
                        }`}
                      >
                        <div className="font-mono text-xs font-semibold text-hack-ink">{name}</div>
                        <div
                          className={`h-5 w-5 rounded border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-hack-forest border-hack-forest text-hack-sand'
                              : 'bg-white border-hack-muted/50'
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="font-mono text-xs rounded-lg border-hack-muted/30"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating || !squadName.trim()}
                className="font-mono text-xs font-semibold rounded-lg bg-hack-coral text-white hover:bg-hack-coral/90 shadow-hack-hero"
              >
                {creating ? 'Forming Squad...' : 'Create Squad & Vault'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Member to Squad Dialog */}
      <Dialog open={!!activeSquadForAdd} onOpenChange={(open) => !open && setActiveSquadForAdd(null)}>
        <DialogContent className="border border-hack-muted/30 bg-hack-surface shadow-hack-dialog rounded-2xl max-w-md p-0 overflow-hidden">
          <DialogHeader className="p-5 border-b border-hack-muted/20 bg-hack-forest text-hack-sand">
            <DialogTitle className="font-display text-base font-bold">
              Add Teammate to {activeSquadForAdd?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="p-5 space-y-3">
            <label className="block font-mono text-xs font-bold text-hack-ink">
              Select from Connected Friends:
            </label>
            <select
              value={selectedFriendToAdd}
              onChange={(e) => setSelectedFriendToAdd(e.target.value)}
              className="w-full font-mono text-xs p-2.5 border border-hack-muted/40 rounded-lg bg-hack-surface focus:border-hack-coral focus:ring-1 focus:ring-hack-coral/25"
            >
              <option value="">-- Choose a friend --</option>
              {validFriends.map((f) => {
                const friendId = f.sender_id === currentUserId ? f.receiver_id! : f.sender_id
                const name = f.friend_profile?.full_name || f.receiver_email
                return (
                  <option key={f.id} value={friendId}>
                    {name}
                  </option>
                )
              })}
            </select>
          </div>
          <DialogFooter className="p-4 border-t border-hack-muted/20 gap-2 bg-hack-sand/20">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveSquadForAdd(null)}
              className="font-mono text-xs rounded-lg border-hack-muted/30"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!selectedFriendToAdd || actionLoading === 'add-member'}
              onClick={handleAddMemberToSquad}
              className="font-mono text-xs font-semibold rounded-lg bg-hack-coral text-white hover:bg-hack-coral/90 shadow-hack-hero"
            >
              Add to Squad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
