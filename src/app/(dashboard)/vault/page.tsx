import { createClient } from '@/lib/supabase/server'
import { getVaultProfiles, getVaultAssets } from '@/app/actions/vault'
import { VaultView } from '@/components/vault/VaultView'

export const dynamic = 'force-dynamic'

export default async function VaultPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profilesRes, assetsRes] = await Promise.all([
    getVaultProfiles(),
    getVaultAssets(),
  ])

  return (
    <VaultView 
      initialProfiles={profilesRes.data || []}
      initialAssets={assetsRes.data || []}
      currentUserId={user?.id}
      currentUserEmail={user?.email}
    />
  )
}
