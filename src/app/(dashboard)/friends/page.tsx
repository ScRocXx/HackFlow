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
      <div className="p-6 bg-[#2e4742] border-2 border-[#10201d] shadow-[5px_5px_0_#10201d] text-[#f2f2eb]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-[#f5b726] text-[#10201d] uppercase">
                Social Layer
              </span>
              <span className="font-mono text-xs text-[#8bb2de]">HackFlow Network</span>
            </div>
            <h1 className="font-display font-bold text-2xl tracking-wide">Squads & Teammates Network</h1>
            <p className="font-mono text-xs text-[#f2f2eb]/70 mt-1">
              Connect with teammates, form multi-disciplinary squads, and share one-click vaults across competitions.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#10201d]/40 border-2 border-[#10201d] text-center min-w-[80px]">
              <div className="font-display font-bold text-xl text-[#f5b726]">{squads.length}</div>
              <div className="font-mono text-[10px] uppercase text-[#f2f2eb]/70">Squads</div>
            </div>
            <div className="p-3 bg-[#10201d]/40 border-2 border-[#10201d] text-center min-w-[80px]">
              <div className="font-display font-bold text-xl text-[#8bb2de]">{friends.length}</div>
              <div className="font-mono text-[10px] uppercase text-[#f2f2eb]/70">Friends</div>
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
            Squad Units ({squads.length})
          </TabsTrigger>
          <TabsTrigger
            value="friends"
            className="font-mono text-xs font-bold py-2 px-4 data-[state=active]:bg-[#2e4742] data-[state=active]:text-[#f2f2eb] border-2 border-transparent data-[state=active]:border-[#10201d] relative"
          >
            <Users className="h-4 w-4 mr-2" />
            Friends Network ({friends.length})
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
