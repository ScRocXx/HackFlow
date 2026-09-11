'use client'

import React, { useState } from 'react'
import { Friendship, Profile } from '@/lib/supabase/types'
import { sendFriendRequest, acceptFriendRequest, declineFriendRequest, removeFriend } from '@/app/actions/friends'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { Users, UserPlus, Check, X, Trash2, Mail, Clock, ShieldCheck } from 'lucide-react'

interface FriendsManagerProps {
  initialFriends: Friendship[]
  initialIncoming: Friendship[]
  initialOutgoing: Friendship[]
  currentUserId: string
  currentUserEmail?: string
}

export function FriendsManager({
  initialFriends,
  initialIncoming,
  initialOutgoing,
  currentUserId,
  currentUserEmail,
}: FriendsManagerProps) {
  const [friends, setFriends] = useState<Friendship[]>(initialFriends)
  const [incoming, setIncoming] = useState<Friendship[]>(initialIncoming)
  const [outgoing, setOutgoing] = useState<Friendship[]>(initialOutgoing)
  const [emailInput, setEmailInput] = useState('')
  const [sending, setSending] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { toast } = useToast()

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetEmail = emailInput.trim().toLowerCase()
    if (!targetEmail) return

    setSending(true)
    try {
      const res = await sendFriendRequest(targetEmail)
      if (res.success && res.data) {
        toast({
          title: 'Request Sent',
          description: `Friend request dispatched to ${targetEmail}`,
          variant: 'success',
        })
        setOutgoing([res.data as Friendship, ...outgoing])
        setEmailInput('')
      } else {
        toast({
          title: 'Could not send request',
          description: res.error || 'Something went wrong',
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to send friend request',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const handleAccept = async (friendshipId: string) => {
    setActionLoading(friendshipId)
    try {
      const res = await acceptFriendRequest(friendshipId)
      if (res.success) {
        toast({
          title: 'Friend Accepted!',
          description: 'You are now connected as squad teammates.',
          variant: 'success',
        })
        const accepted = incoming.find((i) => i.id === friendshipId)
        setIncoming(incoming.filter((i) => i.id !== friendshipId))
        if (accepted) {
          setFriends([
            {
              ...accepted,
              status: 'accepted',
              friend_profile: accepted.sender_profile,
            },
            ...friends,
          ])
        }
      } else {
        toast({
          title: 'Failed to accept',
          description: res.error,
          variant: 'destructive',
        })
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleDecline = async (friendshipId: string) => {
    setActionLoading(friendshipId)
    try {
      const res = await declineFriendRequest(friendshipId)
      if (res.success) {
        setIncoming(incoming.filter((i) => i.id !== friendshipId))
        toast({ title: 'Request declined' })
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemove = async (friendshipId: string) => {
    if (!confirm('Are you sure you want to remove this friend?')) return
    setActionLoading(friendshipId)
    try {
      const res = await removeFriend(friendshipId)
      if (res.success) {
        setFriends(friends.filter((f) => f.id !== friendshipId))
        toast({ title: 'Friend removed' })
      }
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Invite Friend Card */}
      <Card className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[5px_5px_0_#10201d]">
        <CardHeader className="p-4 border-b-2 border-[#10201d] bg-[#2e4742] text-[#f2f2eb]">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-[#f5b726]" />
            <CardTitle className="font-display text-base tracking-wide">Invite Teammate to Network</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <form onSubmit={handleSendRequest} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#57726d]" />
              <Input
                type="email"
                placeholder="teammate@college.edu or friend@gmail.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                className="pl-9 font-mono text-sm border-2 border-[#10201d] bg-white text-[#10201d] placeholder:text-[#57726d]"
              />
            </div>
            <Button
              type="submit"
              disabled={sending}
              className="font-mono text-xs font-bold border-2 border-[#10201d] bg-[#f5b726] hover:bg-[#faaf00] text-[#10201d] shadow-[3px_3px_0_#10201d]"
            >
              {sending ? 'Sending...' : 'Send Friend Request'}
            </Button>
          </form>
          <p className="mt-2 text-xs font-mono text-[#57726d]">
            If registered, they receive an instant in-app prompt. If not, they receive an email invitation to join HackFlow.
          </p>
        </CardContent>
      </Card>

      {/* Incoming Requests */}
      {incoming.length > 0 && (
        <Card className="border-2 border-[#10201d] bg-[#fef7ee] shadow-[5px_5px_0_#10201d]">
          <CardHeader className="p-4 border-b-2 border-[#10201d] bg-[#e53927] text-white flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <CardTitle className="font-display text-base">Incoming Friend Requests</CardTitle>
            </div>
            <Badge className="font-mono text-xs bg-[#10201d] text-white border-0">
              {incoming.length} Pending
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {incoming.map((req) => {
              const sender = req.sender_profile
              const displayName = sender?.full_name || req.receiver_email
              return (
                <div
                  key={req.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white border-2 border-[#10201d] shadow-[3px_3px_0_#10201d]"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-none border-2 border-[#10201d] bg-[#8bb2de] text-[#10201d] font-mono font-bold flex items-center justify-center text-sm">
                      {displayName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-display font-bold text-sm text-[#10201d]">{displayName}</div>
                      <div className="font-mono text-xs text-[#57726d]">Sent you a squad connection request</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(req.id)}
                      disabled={actionLoading === req.id}
                      className="font-mono text-xs border-2 border-[#10201d] bg-[#2e4742] text-[#f2f2eb] hover:bg-[#3d5f58]"
                    >
                      <Check className="h-3.5 w-3.5 mr-1 text-[#f5b726]" /> Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDecline(req.id)}
                      disabled={actionLoading === req.id}
                      className="font-mono text-xs border-2 border-[#10201d] bg-white text-[#e53927] hover:bg-[#fee2e2]"
                    >
                      <X className="h-3.5 w-3.5 mr-1" /> Decline
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Friends Network List */}
      <Card className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[5px_5px_0_#10201d]">
        <CardHeader className="p-4 border-b-2 border-[#10201d] bg-[#3d5f58] text-[#f2f2eb] flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[#8bb2de]" />
            <CardTitle className="font-display text-base">Squad Friends ({friends.length})</CardTitle>
          </div>
          <span className="font-mono text-xs text-[#f2f2eb]/70">Available for squad creation & event invites</span>
        </CardHeader>
        <CardContent className="p-4">
          {friends.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-[#57726d]/40 p-6 bg-white/50">
              <Users className="h-10 w-10 mx-auto text-[#57726d] mb-2 opacity-60" />
              <p className="font-display font-bold text-sm text-[#10201d]">No friends connected yet</p>
              <p className="font-mono text-xs text-[#57726d] mt-1">
                Enter your teammates' email above to build your hackathon network.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {friends.map((f) => {
                const profile = f.friend_profile
                const name = profile?.full_name || f.receiver_email.split('@')[0]
                const email = profile?.email || f.receiver_email

                return (
                  <div
                    key={f.id}
                    className="p-3 bg-white border-2 border-[#10201d] shadow-[3px_3px_0_#10201d] flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="h-10 w-10 flex-shrink-0 border-2 border-[#10201d] bg-[#f5b726] text-[#10201d] font-mono font-bold flex items-center justify-center text-sm">
                        {name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="font-display font-bold text-sm text-[#10201d] truncate flex items-center gap-1.5">
                          {name}
                          <ShieldCheck className="h-3.5 w-3.5 text-[#2e4742] inline flex-shrink-0" />
                        </div>
                        <div className="font-mono text-xs text-[#57726d] truncate">{email}</div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(f.id)}
                      disabled={actionLoading === f.id}
                      className="text-[#e53927] hover:bg-[#fee2e2] p-2 h-auto flex-shrink-0"
                      title="Remove friend"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Outgoing Pending Requests */}
      {outgoing.length > 0 && (
        <div className="p-4 bg-white/70 border-2 border-[#10201d] shadow-[3px_3px_0_#10201d]">
          <div className="font-mono text-xs font-bold text-[#57726d] uppercase tracking-wider mb-2">
            Awaiting Confirmation ({outgoing.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {outgoing.map((out) => (
              <Badge
                key={out.id}
                variant="outline"
                className="font-mono text-xs border-2 border-[#10201d] bg-[#f7f7f2] text-[#10201d] py-1 px-2.5 flex items-center gap-1.5"
              >
                <Clock className="h-3 w-3 text-[#f5b726]" />
                {out.receiver_email}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
