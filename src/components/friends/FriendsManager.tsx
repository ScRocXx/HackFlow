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
          title: 'Invite sent. Now go build.',
          description: `Squad invitation sent to ${targetEmail}`,
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
      <Card className="border border-hack-muted/30 bg-hack-surface rounded-xl shadow-hack-card overflow-hidden">
        <CardHeader className="p-5 border-b border-hack-muted/20 bg-hack-sand/40 text-hack-ink">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-hack-forest/10 flex items-center justify-center">
              <UserPlus className="h-4 w-4 text-hack-forest" />
            </div>
            <div>
              <CardTitle className="font-display text-base font-bold">Bring the team in.</CardTitle>
              <p className="font-mono text-xs text-hack-subtext mt-0.5">
                Drop their email. We&apos;ll send them the invite.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          <form onSubmit={handleSendRequest} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-hack-subtext" />
              <Input
                type="email"
                placeholder="teammate@college.edu or friend@gmail.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                className="pl-9 font-mono text-sm border border-hack-muted/40 rounded-lg bg-hack-surface text-hack-ink placeholder:text-hack-subtext focus:border-hack-coral focus:ring-1 focus:ring-hack-coral/25"
              />
            </div>
            <Button
              type="submit"
              disabled={sending}
              className="font-mono text-xs font-semibold bg-hack-coral hover:bg-hack-coral/90 text-white shadow-hack-hero rounded-lg px-4 py-2 shrink-0 transition-colors"
            >
              {sending ? 'Sending...' : 'Send Squad Invite'}
            </Button>
          </form>
          <p className="mt-2 text-xs font-mono text-hack-subtext">
            If registered, they receive an instant in-app prompt. If not, they receive an email invitation to join HackFlow.
          </p>
        </CardContent>
      </Card>

      {/* Incoming Requests */}
      {incoming.length > 0 && (
        <Card className="border border-hack-coral/30 bg-hack-surface rounded-xl shadow-hack-card overflow-hidden">
          <CardHeader className="p-4 border-b border-hack-coral/20 bg-hack-coral/10 text-hack-ink flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-hack-coral" />
              <CardTitle className="font-display text-sm font-bold text-hack-coral">Incoming Squad Invites</CardTitle>
            </div>
            <Badge className="font-mono text-[11px] bg-hack-coral text-white border-0 rounded-full px-2.5">
              {incoming.length} Pending
            </Badge>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {incoming.map((req) => {
              const sender = req.sender_profile
              const displayName = sender?.full_name || req.receiver_email
              return (
                <div
                  key={req.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-hack-sand/40 border border-hack-muted/20 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-hack-blue/15 text-hack-blue font-mono font-bold flex items-center justify-center text-xs">
                      {displayName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-display font-semibold text-sm text-hack-ink">{displayName}</div>
                      <div className="font-mono text-xs text-hack-subtext">Sent you a squad connection request</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleAccept(req.id)}
                      disabled={actionLoading === req.id}
                      className="font-mono text-xs font-semibold rounded-lg bg-hack-forest text-hack-sand hover:bg-hack-forest/90 shadow-sm"
                    >
                      <Check className="h-3.5 w-3.5 mr-1 text-hack-gold" /> Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDecline(req.id)}
                      disabled={actionLoading === req.id}
                      className="font-mono text-xs rounded-lg border-hack-muted/30 text-hack-coral hover:bg-hack-coral/10"
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

      {/* Friends List */}
      <Card className="border border-hack-muted/30 bg-hack-surface rounded-xl shadow-hack-card overflow-hidden">
        <CardHeader className="p-4 border-b border-hack-muted/20 bg-hack-sand/40 text-hack-ink flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-hack-forest" />
            <CardTitle className="font-display text-sm font-bold">Squad Friends ({friends.length})</CardTitle>
          </div>
          <span className="font-mono text-[11px] text-hack-subtext">Available for squad creation & event invites</span>
        </CardHeader>
        <CardContent className="p-4">
          {friends.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-hack-muted/40 rounded-lg p-6 bg-hack-sand/20">
              <Users className="h-10 w-10 mx-auto text-hack-subtext mb-2 opacity-60" />
              <p className="font-display font-bold text-sm text-hack-ink">No friends connected yet</p>
              <p className="font-mono text-xs text-hack-subtext mt-1">
                Enter your teammate&apos;s email above to connect with them directly.
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
                    className="p-3 bg-hack-sand/30 border border-hack-muted/20 rounded-lg flex items-center justify-between gap-3 hover:border-hack-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="h-9 w-9 flex-shrink-0 rounded-lg bg-hack-forest/10 text-hack-forest font-mono font-bold flex items-center justify-center text-xs">
                        {name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <div className="font-display font-semibold text-sm text-hack-ink truncate flex items-center gap-1.5">
                          {name}
                          <ShieldCheck className="h-3.5 w-3.5 text-hack-forest inline flex-shrink-0" />
                        </div>
                        <div className="font-mono text-xs text-hack-subtext truncate">{email}</div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(f.id)}
                      disabled={actionLoading === f.id}
                      className="text-hack-subtext hover:text-hack-coral hover:bg-hack-coral/10 p-2 h-auto flex-shrink-0 rounded-md transition-colors"
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
        <div className="p-4 bg-hack-surface border border-hack-muted/30 rounded-xl shadow-hack-card">
          <div className="font-mono text-xs font-bold text-hack-subtext uppercase tracking-wider mb-2.5">
            Awaiting Confirmation ({outgoing.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {outgoing.map((out) => (
              <Badge
                key={out.id}
                variant="outline"
                className="font-mono text-xs border border-hack-muted/30 bg-hack-sand/40 text-hack-ink py-1 px-2.5 rounded-full flex items-center gap-1.5"
              >
                <Clock className="h-3 w-3 text-hack-gold" />
                {out.receiver_email}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
