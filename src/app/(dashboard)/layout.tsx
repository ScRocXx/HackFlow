import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/layout/DashboardShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  const typedProfile = profile as { full_name?: string | null; avatar_url?: string | null } | null

  const userData = {
    email: user.email!,
    full_name: typedProfile?.full_name || user.user_metadata?.full_name || 'User',
    avatar_url: typedProfile?.avatar_url || user.user_metadata?.avatar_url || null,
  }

  return (
    <DashboardShell user={userData}>
      {children}
    </DashboardShell>
  )
}
