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

  const [profilesRes, assetsRes, squadsRes, scratchpadRes] = await Promise.all([
    getVaultProfiles(squadId),
    getVaultAssets(undefined, squadId),
    getMySquads(),
    squadId ? getSquadScratchpad(squadId) : Promise.resolve({ success: true, data: null }),
  ])

  return (
    <VaultView 
      initialProfiles={profilesRes.data || []}
      initialAssets={assetsRes.data || []}
      initialScratchpad={scratchpadRes.data || null}
      squads={squadsRes.data || []}
      initialSquadId={squadId}
      initialAction={action}
      currentUserId={user?.id}
      currentUserEmail={user?.email}
    />
  )
}
