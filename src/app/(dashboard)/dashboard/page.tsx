import { getUserEvents } from '@/app/actions/events'
import { DashboardContent } from '@/components/events/DashboardContent'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('full_name').eq('id', user.id).single()
    : { data: null }

  const result = await getUserEvents()
  const events = result.success && result.data ? result.data : []

  return <DashboardContent events={events as any} userName={profile?.full_name || ''} />
}
