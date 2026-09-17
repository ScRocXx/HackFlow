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
  const fullName = typedProfile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User'
  const avatarUrl = typedProfile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null

  if (!profile) {
    try {
      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        full_name: fullName,
        avatar_url: avatarUrl,
      })
    } catch (err) {
      console.warn('Could not auto-create profile:', err)
    }
  }

  const userData = {
    id: user.id,
    email: user.email!,
    full_name: fullName,
    avatar_url: avatarUrl,
  }
  return (
    <DashboardShell user={userData}>
      {children}
    </DashboardShell>
  )
}
