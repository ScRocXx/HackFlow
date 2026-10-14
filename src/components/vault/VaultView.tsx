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
        <div className="rounded-2xl border border-hack-ink/20 bg-hack-surface shadow-sm p-8 sm:p-12 text-center space-y-6">
          <div className="w-14 h-14 mx-auto rounded-xl bg-hack-sand border border-hack-ink/15 flex items-center justify-center text-hack-ink">
            <Users className="w-7 h-7 text-hack-ink" />
          </div>

          <div className="space-y-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-hack-coral-dark bg-hack-coral/15 px-3 py-1 rounded-full border border-hack-coral/30 inline-block">
              Squad-Scoped Vault
            </span>
            <h1 className="font-sans text-2xl sm:text-3xl font-bold text-hack-ink">
              No Squad Formed Yet
            </h1>
            <p className="font-mono text-xs text-hack-subtext max-w-md mx-auto leading-relaxed">
              The Vault is exclusively squad-scoped. Create or join a squad to access 1-click team registration rosters, shared environment keyrings, sprint scratchpads, and slide decks.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <Link
              href="/friends"
              className="inline-flex items-center gap-2 font-sans text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-lg bg-hack-coral hover:bg-hack-coral/90 text-hack-ink shadow-hack-hero transition-all active:translate-y-0.5"
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
      <div className="rounded-2xl border border-hack-ink/20 bg-hack-ink p-6 text-hack-sand shadow-sm flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-hack-sand/60">
              Squad Vault • {currentSquad?.name || 'Squad'}
            </span>
          </div>
          <h1 className="font-sans text-2xl sm:text-3xl font-bold tracking-tight text-hack-sand">
            {currentSquad?.name || 'Squad'} Vault
          </h1>
          <p className="font-mono text-xs text-hack-sand/70 mt-1 max-w-xl">
            1-click team registration clipboard, sprint scratchpad & keyring, shared slide decks, and starter repos.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Squad Selector Dropdown */}
          <div className="flex items-center gap-2 bg-hack-sand/10 px-2.5 py-1.5 rounded-lg border border-white/10">
            <Users className="h-4 w-4 text-hack-gold" />
            <span className="font-mono text-xs font-semibold text-hack-sand uppercase hidden sm:inline">Squad:</span>
            <select
              value={selectedSquadId || squads[0]?.id || ''}
              onChange={(e) => handleSquadChange(e.target.value)}
              disabled={loadingData}
              className="bg-hack-surface text-hack-ink font-mono text-xs font-semibold py-1 px-2.5 rounded-md border border-hack-ink/20 focus:outline-none cursor-pointer"
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
            className="rounded-lg bg-hack-coral hover:bg-hack-coral/90 text-hack-ink font-sans text-xs font-bold shadow-hack-hero"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            + Add Shared Asset
          </Button>
        </div>
      </div>

      {/* Navigation Tabs (Smooth Horizontal Scroll on mobile) */}
      <div className="flex items-center gap-2 border-b border-hack-ink/15 pb-2 overflow-x-auto no-scrollbar scroll-smooth flex-nowrap sm:flex-wrap -mx-3 px-3 sm:mx-0 sm:px-0">
        <button
          onClick={() => setActiveTab('profiles')}
          className={cn(
            "font-mono text-xs font-semibold uppercase tracking-wider px-3 sm:px-4 py-2 rounded-lg border transition-all whitespace-nowrap shrink-0 active:scale-95 touch-manipulation",
            activeTab === 'profiles'
              ? "bg-hack-ink text-hack-sand border-hack-ink shadow-sm font-bold"
              : "bg-hack-surface text-hack-subtext border-hack-ink/15 hover:bg-hack-sand/60 hover:text-hack-ink"
          )}
        >
          Quick-Fill Team Profiles ({profiles.length})
        </button>

        <button
          onClick={() => setActiveTab('scratchpad')}
          className={cn(
            "font-mono text-xs font-semibold uppercase tracking-wider px-3 sm:px-4 py-2 rounded-lg border transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 active:scale-95 touch-manipulation",
            activeTab === 'scratchpad'
              ? "bg-hack-ink text-hack-sand border-hack-ink shadow-sm font-bold"
              : "bg-hack-surface text-hack-subtext border-hack-ink/15 hover:bg-hack-sand/60 hover:text-hack-ink"
          )}
        >
          <Pin className="w-3.5 h-3.5" />
          <span>Sprint Scratchpad & Keyring</span>
          <span className="w-2 h-2 rounded-full bg-hack-mint-dark inline-block ml-0.5" />
        </button>

        <button
          onClick={() => setActiveTab('decks')}
          className={cn(
            "font-mono text-xs font-semibold uppercase tracking-wider px-3 sm:px-4 py-2 rounded-lg border transition-all whitespace-nowrap shrink-0 active:scale-95 touch-manipulation",
            activeTab === 'decks'
              ? "bg-hack-ink text-hack-sand border-hack-ink shadow-sm font-bold"
              : "bg-hack-surface text-hack-subtext border-hack-ink/15 hover:bg-hack-sand/60 hover:text-hack-ink"
          )}
        >
          Pitch & Deck Kit ({deckAssets.length})
        </button>

        <button
          onClick={() => setActiveTab('boilerplates')}
          className={cn(
            "font-mono text-xs font-semibold uppercase tracking-wider px-3 sm:px-4 py-2 rounded-lg border transition-all whitespace-nowrap shrink-0 active:scale-95 touch-manipulation",
            activeTab === 'boilerplates'
              ? "bg-hack-ink text-hack-sand border-hack-ink shadow-sm font-bold"
              : "bg-hack-surface text-hack-subtext border-hack-ink/15 hover:bg-hack-sand/60 hover:text-hack-ink"
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
