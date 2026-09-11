import { createClient } from '@/lib/supabase/server'
import { getVaultProfiles, getVaultAssets } from '@/app/actions/vault'
import { getMySquads } from '@/app/actions/squads'
import { VaultView } from '@/components/vault/VaultView'

export const dynamic = 'force-dynamic'

interface VaultPageProps {
  searchParams: Promise<{ squad?: string }> | { squad?: string }
}

export default async function VaultPage({ searchParams }: VaultPageProps) {
  const resolvedParams = await searchParams
  const squadId = resolvedParams?.squad || null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profilesRes, assetsRes, squadsRes] = await Promise.all([
    getVaultProfiles(squadId),
    getVaultAssets(undefined, squadId),
    getMySquads(),
  ])

  return (
    <VaultView 
      initialProfiles={profilesRes.data || []}
      initialAssets={assetsRes.data || []}
      squads={squadsRes.data || []}
      initialSquadId={squadId}
      currentUserId={user?.id}
      currentUserEmail={user?.email}
    />
  )
}
