'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Plus, ArrowRight, Users, Pin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getVaultProfiles, getVaultAssets } from '@/app/actions/vault'
import type { TeamVaultProfile, TeamVaultAsset, Squad, SquadScratchpad as SquadScratchpadType } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'
import { SquadScratchpad } from './SquadScratchpad'
import { VaultProfiles } from './VaultProfiles'
import { VaultAssets } from './VaultAssets'

interface VaultViewProps {
  initialProfiles: TeamVaultProfile[]
  initialAssets: TeamVaultAsset[]
  initialScratchpad?: SquadScratchpadType | null
  squads?: Squad[]
  initialSquadId?: string | null
  initialAction?: string | null
  currentUserId?: string
  currentUserEmail?: string
}

export function VaultView({
  initialProfiles = [],
  initialAssets = [],
  initialScratchpad = null,
  squads = [],
  initialSquadId = null,
  initialAction = null,
  currentUserId,
  currentUserEmail
}: VaultViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'profiles' | 'scratchpad' | 'decks' | 'boilerplates'>('profiles')
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(
    initialSquadId || (squads.length > 0 ? squads[0].id : null)
  )
  const [profiles, setProfiles] = useState<TeamVaultProfile[]>(initialProfiles)
  const [assets, setAssets] = useState<TeamVaultAsset[]>(initialAssets)
  const [loadingData, setLoadingData] = useState(false)

  // Modals state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false)

  const currentSquad = squads.find((s) => s.id === selectedSquadId) || squads[0]

  const handleSquadChange = async (squadId: string) => {
    setSelectedSquadId(squadId)
    setLoadingData(true)
    try {
      router.replace(`/vault?squad=${squadId}`)
      const [pRes, aRes] = await Promise.all([
        getVaultProfiles(squadId),
        getVaultAssets(undefined, squadId),
      ])
      if (pRes.success) setProfiles(pRes.data || [])
      if (aRes.success) setAssets(aRes.data || [])
    } finally {
      setLoadingData(false)
    }
  }

  // Deep-link Auto-open: If navigated via nudge notification (?action=edit-profile), auto-open modal immediately
  useEffect(() => {
    const action = searchParams.get('action') || initialAction
    if (action === 'edit-profile') {
      setIsProfileModalOpen(true)
    }
  }, [searchParams, initialAction])

  const deckAssets = assets.filter((a) => a.asset_type === 'pitch_deck' || a.asset_type === 'figma_kit' || a.asset_type === 'diagram')
  const boilerplateAssets = assets.filter((a) => a.asset_type === 'boilerplate' || a.asset_type === 'other')

  if (squads.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <div className="border-4 border-[#10201d] bg-[#f7f7f2] shadow-[8px_8px_0_#671912] p-8 sm:p-12 text-center space-y-6">
          <div className="w-16 h-16 mx-auto border-2 border-[#10201d] bg-[#f5b726] flex items-center justify-center shadow-[4px_4px_0_#10201d]">
            <Users className="w-8 h-8 text-[#10201d]" />
          </div>

          <div className="space-y-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#e53927] bg-[#f6c4c1] px-2.5 py-1 border border-[#10201d] inline-block shadow-[1px_1px_0_#10201d]">
              Strictly Squad-Scoped
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#10201d]">
              No Squad Found
            </h1>
            <p className="font-mono text-xs text-[#34433f] max-w-md mx-auto leading-relaxed">
              The Vault is exclusively squad-scoped. Create or join a squad to access 1-click team registration rosters, shared environment keyrings, sprint scratchpads, and slide decks.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <Link
              href="/friends"
              className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider px-6 py-3 border-2 border-[#10201d] bg-[#f5b726] hover:bg-[#ffcf66] text-[#10201d] shadow-[4px_4px_0_#8a5d13] transition-all hover:translate-x-[1px] hover:translate-y-[1px]"
            >
              <Users className="w-4 h-4" />
              <span>Create or Join a Squad</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Vault Header Banner */}
      <div className="border-2 border-[#10201d] bg-[#3d5f58] p-6 text-[#f7f7f2] shadow-[7px_7px_0_#671912] flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 bg-[#e53927] inline-block" />
            <span className="w-2.5 h-2.5 bg-[#8bb2de] inline-block" />
            <span className="w-2.5 h-2.5 bg-[#f5b726] inline-block" />
            <span className="w-2.5 h-2.5 bg-[#e97b77] inline-block" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#f6c4c1] ml-2">
              Squad Vault: {currentSquad?.name || 'Squad'}
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#f7f7f2]">
            {currentSquad?.name || 'Squad'} Vault
          </h1>
          <p className="font-mono text-xs text-[#8bb2de] mt-1">
            1-click team registration clipboard, sprint scratchpad & keyring, shared slide decks, and starter repos.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Squad Selector Dropdown */}
          <div className="flex items-center gap-2 bg-[#2e4742] p-1.5 border-2 border-[#10201d] shadow-[3px_3px_0_#10201d]">
            <Users className="h-4 w-4 text-[#f5b726]" />
            <span className="font-mono text-xs font-bold text-[#f2f2eb] uppercase hidden sm:inline">Squad:</span>
            <select
              value={selectedSquadId || squads[0]?.id || ''}
              onChange={(e) => handleSquadChange(e.target.value)}
              disabled={loadingData}
              className="bg-white text-[#10201d] font-mono text-xs font-bold py-1 px-2 border-2 border-[#10201d] focus:outline-none cursor-pointer"
            >
              {squads.map((sq) => (
                <option key={sq.id} value={sq.id}>
                  👥 {sq.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={() => setIsAssetModalOpen(true)}
            className="border-2 border-[#10201d] bg-[#e97b77] hover:bg-[#f6c4c1] text-[#10201d] font-mono text-xs font-bold shadow-[3px_3px_0_#671912]"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            + Add Shared Asset
          </Button>
        </div>
      </div>

      {/* Navigation Tabs (Smooth Horizontal Scroll on mobile) */}
      <div className="flex items-center gap-2 border-b-2 border-[#10201d] pb-2 overflow-x-auto no-scrollbar scroll-smooth flex-nowrap sm:flex-wrap -mx-3 px-3 sm:mx-0 sm:px-0">
        <button
          onClick={() => setActiveTab('profiles')}
          className={cn(
            "font-mono text-xs font-bold uppercase tracking-wider px-3 sm:px-4 py-2 border-2 border-[#10201d] transition-all whitespace-nowrap shrink-0 active:scale-95 touch-manipulation",
            activeTab === 'profiles'
              ? "bg-[#f5b726] text-[#10201d] shadow-[3px_3px_0_#8a5d13]"
              : "bg-[#f7f7f2] text-[#34433f] hover:bg-[#e4e5da] active:bg-[#e4e5da]"
          )}
        >
          Quick-Fill Team Profiles ({profiles.length})
        </button>

        <button
          onClick={() => setActiveTab('scratchpad')}
          className={cn(
            "font-mono text-xs font-bold uppercase tracking-wider px-3 sm:px-4 py-2 border-2 border-[#10201d] transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95 touch-manipulation",
            activeTab === 'scratchpad'
              ? "bg-[#f5b726] text-[#10201d] shadow-[3px_3px_0_#8a5d13]"
              : "bg-[#f7f7f2] text-[#34433f] hover:bg-[#e4e5da] active:bg-[#e4e5da]"
          )}
        >
          <Pin className="w-3.5 h-3.5" />
          <span>Sprint Scratchpad & Keyring</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block ml-0.5" />
        </button>

        <button
          onClick={() => setActiveTab('decks')}
          className={cn(
            "font-mono text-xs font-bold uppercase tracking-wider px-3 sm:px-4 py-2 border-2 border-[#10201d] transition-all whitespace-nowrap shrink-0 active:scale-95 touch-manipulation",
            activeTab === 'decks'
              ? "bg-[#f5b726] text-[#10201d] shadow-[3px_3px_0_#8a5d13]"
              : "bg-[#f7f7f2] text-[#34433f] hover:bg-[#e4e5da] active:bg-[#e4e5da]"
          )}
        >
          Pitch & Deck Kit ({deckAssets.length})
        </button>

        <button
          onClick={() => setActiveTab('boilerplates')}
          className={cn(
            "font-mono text-xs font-bold uppercase tracking-wider px-3 sm:px-4 py-2 border-2 border-[#10201d] transition-all whitespace-nowrap shrink-0 active:scale-95 touch-manipulation",
            activeTab === 'boilerplates'
              ? "bg-[#f5b726] text-[#10201d] shadow-[3px_3px_0_#8a5d13]"
              : "bg-[#f7f7f2] text-[#34433f] hover:bg-[#e4e5da] active:bg-[#e4e5da]"
          )}
        >
          Boilerplate Hub ({boilerplateAssets.length})
        </button>
      </div>

      {/* Tab 1: Quick-Fill Team Profiles */}
      {activeTab === 'profiles' && (
        <VaultProfiles
          profiles={profiles}
          setProfiles={setProfiles}
          currentUserId={currentUserId}
          currentUserEmail={currentUserEmail}
          squadId={selectedSquadId || squads[0]?.id}
          squadName={currentSquad?.name || 'Squad'}
          isProfileModalOpen={isProfileModalOpen}
          setIsProfileModalOpen={setIsProfileModalOpen}
        />
      )}

      {/* Tab 2: Squad Sprint Scratchpad & Pinboard */}
      {activeTab === 'scratchpad' && (
        <SquadScratchpad 
          squadId={selectedSquadId || squads[0].id}
          squadName={currentSquad?.name || squads[0]?.name || 'Squad'}
          initialScratchpad={initialScratchpad}
          currentUserId={currentUserId}
        />
      )}

      {/* Tab 3: Reusable Pitch & Deck Kit */}
      {activeTab === 'decks' && (
        <VaultAssets
          activeTab="decks"
          assets={assets}
          setAssets={setAssets}
          currentUserId={currentUserId}
          squadId={selectedSquadId || squads[0]?.id}
          isAssetModalOpen={isAssetModalOpen}
          setIsAssetModalOpen={setIsAssetModalOpen}
        />
      )}

      {/* Tab 4: Boilerplate Hub */}
      {activeTab === 'boilerplates' && (
        <VaultAssets
          activeTab="boilerplates"
          assets={assets}
          setAssets={setAssets}
          currentUserId={currentUserId}
          squadId={selectedSquadId || squads[0]?.id}
          isAssetModalOpen={isAssetModalOpen}
          setIsAssetModalOpen={setIsAssetModalOpen}
        />
      )}
    </div>
  )
}
