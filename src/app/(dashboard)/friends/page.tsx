import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getFriendsList, getPendingRequests } from '@/app/actions/friends'
import { getMySquads } from '@/app/actions/squads'
import { FriendsManager } from '@/components/friends/FriendsManager'
import { SquadManager } from '@/components/squads/SquadManager'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Users, Shield, UserPlus } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function FriendsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [friendsRes, requestsRes, squadsRes] = await Promise.all([
    getFriendsList(),
    getPendingRequests(),
    getMySquads(),
  ])

  const friends = friendsRes.data || []
  const incoming = requestsRes.incoming || []
  const outgoing = requestsRes.outgoing || []
  const squads = squadsRes.data || []

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="p-5 sm:p-6 bg-hack-forest border border-hack-ink/20 rounded-[6px] shadow-sm text-hack-sand">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-hack-mint text-hack-ink uppercase rounded-[4px]">
                Squads
              </span>
              <span className="font-mono text-xs text-hack-sand/70">Teams & Network</span>
            </div>
            <h1 className="font-display font-bold text-2xl tracking-wide">Your Squads & Teammates</h1>
            <p className="font-mono text-xs text-hack-sand/70 mt-1">
              Form squads, invite teammates, and share vaults across hackathons.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-hack-ink/40 border border-hack-sand/20 rounded-[4px] text-center min-w-[80px]">
              <div className="font-display font-bold text-xl text-hack-gold">{squads.length}</div>
              <div className="font-mono text-[10px] uppercase text-hack-sand/70">Squads</div>
            </div>
            <div className="p-3 bg-hack-ink/40 border border-hack-sand/20 rounded-[4px] text-center min-w-[80px]">
              <div className="font-display font-bold text-xl text-hack-sky">{friends.length}</div>
              <div className="font-mono text-[10px] uppercase text-hack-sand/70">Teammates</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="squads" className="w-full">
        <TabsList className="bg-[#f7f7f2] border-2 border-[#10201d] p-1 h-auto flex flex-wrap gap-1 shadow-[3px_3px_0_#10201d]">
          <TabsTrigger
            value="squads"
            className="font-mono text-xs font-bold py-2 px-4 data-[state=active]:bg-[#2e4742] data-[state=active]:text-[#f2f2eb] border-2 border-transparent data-[state=active]:border-[#10201d]"
          >
            <Shield className="h-4 w-4 mr-2" />
            Squads ({squads.length})
          </TabsTrigger>
          <TabsTrigger
            value="friends"
            className="font-mono text-xs font-bold py-2 px-4 data-[state=active]:bg-[#2e4742] data-[state=active]:text-[#f2f2eb] border-2 border-transparent data-[state=active]:border-[#10201d] relative"
          >
            <Users className="h-4 w-4 mr-2" />
            People ({friends.length})
            {incoming.length > 0 && (
              <span className="ml-2 px-1.5 py-0.2 bg-[#e53927] text-white text-[10px] font-bold rounded-full">
                {incoming.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="squads" className="mt-4">
          <SquadManager initialSquads={squads} friends={friends} currentUserId={user.id} />
        </TabsContent>

        <TabsContent value="friends" className="mt-4">
          <FriendsManager
            initialFriends={friends}
            initialIncoming={incoming}
            initialOutgoing={outgoing}
            currentUserId={user.id}
            currentUserEmail={user.email}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
