import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getVaultProfiles, getVaultAssets, getSquadScratchpad } from '@/app/actions/vault'
import { getMySquads } from '@/app/actions/squads'
import { VaultView } from '@/components/vault/VaultView'

export const dynamic = 'force-dynamic'

interface VaultPageProps {
  searchParams: Promise<{ squad?: string; action?: string }> | { squad?: string; action?: string }
}

export default async function VaultPage({ searchParams }: VaultPageProps) {
  const resolvedParams = await searchParams
  const squadId = resolvedParams?.squad || null
  const action = resolvedParams?.action || null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const squadsRes = await getMySquads()
  const squads = squadsRes.success && squadsRes.data ? squadsRes.data : []

  // If squad param is not provided and the user belongs to at least one squad, redirect immediately
  if (!squadId && squads.length > 0) {
    const actionQuery = action ? `&action=${action}` : ''
    redirect(`/vault?squad=${squads[0].id}${actionQuery}`)
  }

  const [profilesRes, assetsRes, scratchpadRes] = await Promise.all([
    squadId ? getVaultProfiles(squadId) : Promise.resolve({ success: true, data: [] }),
    squadId ? getVaultAssets(undefined, squadId) : Promise.resolve({ success: true, data: [] }),
    squadId ? getSquadScratchpad(squadId) : Promise.resolve({ success: true, data: null }),
  ])

  return (
    <VaultView 
      initialProfiles={profilesRes.data || []}
      initialAssets={assetsRes.data || []}
      initialScratchpad={scratchpadRes.data || null}
      squads={squads}
      initialSquadId={squadId}
      initialAction={action}
      currentUserId={user?.id}
      currentUserEmail={user?.email}
    />
  )
}
