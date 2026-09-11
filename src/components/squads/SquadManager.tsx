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
import { Users, Plus, Trash2, LogOut, FolderKanban, ShieldAlert, Check, UserPlus } from 'lucide-react'
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

  // Add member modal state
  const [activeSquadForAdd, setActiveSquadForAdd] = useState<Squad | null>(null)
  const [selectedFriendToAdd, setSelectedFriendToAdd] = useState<string>('')

  const { toast } = useToast()

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
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleLeaveSquad = async (squadId: string) => {
    if (!confirm('Leave this squad? You will lose access to its vault.')) return
    setActionLoading(squadId)
    try {
      const res = await removeSquadMember(squadId, currentUserId)
      if (res.success) {
        setSquads(squads.filter((s) => s.id !== squadId))
        toast({ title: 'Left squad' })
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
        toast({ title: 'Member added to squad!', variant: 'success' })
        // Update local squad member count
        setSquads(
          squads.map((s) =>
            s.id === activeSquadForAdd.id ? { ...s, member_count: (s.member_count || 1) + 1 } : s
          )
        )
        setActiveSquadForAdd(null)
        setSelectedFriendToAdd('')
      }
    } finally {
      setActionLoading(null)
    }
  }

  // Get eligible friends with valid user IDs
  const validFriends = friends.filter((f) => {
    const friendId = f.sender_id === currentUserId ? f.receiver_id : f.sender_id
    return !!friendId
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#f7f7f2] border-2 border-[#10201d] shadow-[5px_5px_0_#10201d]">
        <div>
          <h2 className="font-display font-bold text-xl text-[#10201d]">Multi-Squad Units</h2>
          <p className="font-mono text-xs text-[#57726d] mt-1">
            Group your friends into specialized hackathon units (e.g., AI Core, Frontend Sprinters). Each squad enjoys an isolated Asset Vault.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="font-mono text-xs font-bold border-2 border-[#10201d] bg-[#2e4742] text-[#f2f2eb] hover:bg-[#3d5f58] shadow-[3px_3px_0_#10201d] flex-shrink-0"
        >
          <Plus className="h-4 w-4 mr-1 text-[#f5b726]" /> Create New Squad
        </Button>
      </div>

      {/* Squad Cards Grid */}
      {squads.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-[#57726d]/40 p-8 bg-[#f7f7f2]/50 shadow-[5px_5px_0_#10201d]">
          <Users className="h-12 w-12 mx-auto text-[#57726d] mb-3 opacity-60" />
          <h3 className="font-display font-bold text-lg text-[#10201d]">No Squads Formed Yet</h3>
          <p className="font-mono text-xs text-[#57726d] mt-1 max-w-md mx-auto">
            Form your first squad with accepted friends to share master slide decks, Figma kits, and registration profile cards.
          </p>
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="mt-4 font-mono text-xs font-bold border-2 border-[#10201d] bg-[#f5b726] text-[#10201d] hover:bg-[#faaf00] shadow-[3px_3px_0_#10201d]"
          >
            <Plus className="h-4 w-4 mr-1" /> Form a Squad Now
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
                className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[5px_5px_0_#10201d] flex flex-col justify-between"
              >
                <div>
                  <CardHeader className="p-4 border-b-2 border-[#10201d] bg-[#2e4742] text-[#f2f2eb] flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-none border-2 border-[#10201d] bg-[#f5b726] text-[#10201d] font-mono font-bold flex items-center justify-center text-xs">
                        {squad.name.substring(0, 2).toUpperCase()}
                      </div>
                      <CardTitle className="font-display text-base text-[#f2f2eb]">{squad.name}</CardTitle>
                    </div>
                    <Badge
                      className={`font-mono text-xs border-2 border-[#10201d] ${
                        isCreator ? 'bg-[#f5b726] text-[#10201d]' : 'bg-[#8bb2de] text-[#10201d]'
                      }`}
                    >
                      {isCreator ? 'Leader' : 'Member'}
                    </Badge>
                  </CardHeader>

                  <CardContent className="p-4 space-y-4">
                    {/* Member Avatars & List */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-[#57726d] uppercase">
                          Roster ({squad.member_count || members.length || 1})
                        </span>
                        {isCreator && (
                          <button
                            onClick={() => {
                              setActiveSquadForAdd(squad)
                              setSelectedFriendToAdd('')
                            }}
                            className="font-mono text-xs text-[#2e4742] hover:underline flex items-center gap-1 font-bold"
                          >
                            <UserPlus className="h-3 w-3" /> Add Friend
                          </button>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {members.length > 0 ? (
                          members.map((m) => {
                            const name = m.profile?.full_name || m.profile?.email || 'Member'
                            return (
                              <Badge
                                key={m.id}
                                variant="outline"
                                className="font-mono text-xs border-2 border-[#10201d] bg-white text-[#10201d] py-1 px-2 flex items-center gap-1.5 shadow-[2px_2px_0_#10201d]"
                              >
                                <span>{name}</span>
                                {m.role === 'leader' && (
                                  <span className="text-[10px] bg-[#f5b726] px-1 font-bold">L</span>
                                )}
                              </Badge>
                            )
                          })
                        ) : (
                          <span className="font-mono text-xs text-[#57726d]">
                            {squad.member_count || 1} active teammate(s)
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </div>

                {/* Bottom Actions */}
                <div className="p-4 border-t-2 border-[#10201d] bg-white/70 flex items-center justify-between gap-2">
                  <Link href={`/vault?squad=${squad.id}`}>
                    <Button
                      size="sm"
                      className="font-mono text-xs border-2 border-[#10201d] bg-[#f5b726] text-[#10201d] hover:bg-[#faaf00] shadow-[2px_2px_0_#10201d]"
                    >
                      <FolderKanban className="h-3.5 w-3.5 mr-1" /> Open Squad Vault
                    </Button>
                  </Link>

                  <div>
                    {isCreator ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSquad(squad.id)}
                        disabled={actionLoading === squad.id}
                        className="text-[#e53927] hover:bg-[#fee2e2] font-mono text-xs"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Disband
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleLeaveSquad(squad.id)}
                        disabled={actionLoading === squad.id}
                        className="text-[#e53927] hover:bg-[#fee2e2] font-mono text-xs"
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
        <DialogContent className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[7px_7px_0_#671912] max-w-lg p-0">
          <DialogHeader className="p-4 border-b-2 border-[#10201d] bg-[#2e4742] text-[#f2f2eb]">
            <DialogTitle className="font-display text-lg">Form a New Squad</DialogTitle>
            <DialogDescription className="font-mono text-xs text-[#f2f2eb]/70">
              Create an isolated team workspace with its own quick-fill profile cards and shared decks.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateSquad} className="p-4 space-y-4">
            <div>
              <label className="block font-mono text-xs font-bold text-[#10201d] uppercase mb-1">
                Squad Name
              </label>
              <Input
                placeholder="e.g. Team Northern Blades, AI Inference Lab"
                value={squadName}
                onChange={(e) => setSquadName(e.target.value)}
                required
                className="font-mono text-sm border-2 border-[#10201d] bg-white"
              />
            </div>

            <div>
              <label className="block font-mono text-xs font-bold text-[#10201d] uppercase mb-2">
                Select Squad Teammates ({selectedFriendIds.length} selected)
              </label>
              {validFriends.length === 0 ? (
                <div className="p-3 bg-white border-2 border-[#10201d] font-mono text-xs text-[#57726d]">
                  You have no connected friends yet. You can still form this squad now and invite teammates later!
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-2 border-2 border-[#10201d] bg-white p-2">
                  {validFriends.map((f) => {
                    const friendId = f.sender_id === currentUserId ? f.receiver_id! : f.sender_id
                    const profile = f.friend_profile
                    const name = profile?.full_name || f.receiver_email
                    const isSelected = selectedFriendIds.includes(friendId)

                    return (
                      <div
                        key={f.id}
                        onClick={() => handleToggleFriend(friendId)}
                        className={`p-2 border-2 border-[#10201d] cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected ? 'bg-[#f5b726]/30 border-[#10201d]' : 'bg-[#f7f7f2] hover:bg-white'
                        }`}
                      >
                        <div className="font-mono text-xs font-bold text-[#10201d]">{name}</div>
                        <div
                          className={`h-5 w-5 border-2 border-[#10201d] flex items-center justify-center ${
                            isSelected ? 'bg-[#2e4742] text-white' : 'bg-white'
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

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="font-mono text-xs border-2 border-[#10201d]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating || !squadName.trim()}
                className="font-mono text-xs font-bold border-2 border-[#10201d] bg-[#2e4742] text-[#f2f2eb] hover:bg-[#3d5f58] shadow-[3px_3px_0_#10201d]"
              >
                {creating ? 'Forming Squad...' : 'Create Squad & Vault'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Member to Squad Dialog */}
      <Dialog open={!!activeSquadForAdd} onOpenChange={(open) => !open && setActiveSquadForAdd(null)}>
        <DialogContent className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[7px_7px_0_#671912] max-w-md p-0">
          <DialogHeader className="p-4 border-b-2 border-[#10201d] bg-[#2e4742] text-[#f2f2eb]">
            <DialogTitle className="font-display text-base">
              Add Teammate to {activeSquadForAdd?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="p-4 space-y-3">
            <label className="block font-mono text-xs font-bold text-[#10201d]">
              Select from Connected Friends:
            </label>
            <select
              value={selectedFriendToAdd}
              onChange={(e) => setSelectedFriendToAdd(e.target.value)}
              className="w-full font-mono text-xs p-2 border-2 border-[#10201d] bg-white"
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
          <DialogFooter className="p-4 border-t-2 border-[#10201d] gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveSquadForAdd(null)}
              className="font-mono text-xs border-2 border-[#10201d]"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!selectedFriendToAdd || actionLoading === 'add-member'}
              onClick={handleAddMemberToSquad}
              className="font-mono text-xs font-bold border-2 border-[#10201d] bg-[#2e4742] text-[#f2f2eb]"
            >
              Add to Squad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
