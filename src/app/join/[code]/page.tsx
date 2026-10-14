import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { joinSquadByInviteCode } from '@/app/actions/squads'
import { Users, AlertTriangle, ArrowRight } from 'lucide-react'

interface JoinPageProps {
  params: {
    code: string
  }
}

export default async function JoinSquadPage({ params }: JoinPageProps) {
  const code = params.code
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/login?returnTo=/join/${code}`)
  }

  const result = await joinSquadByInviteCode(code)

  if (result.success) {
    redirect('/friends')
  }

  return (
    <div className="min-h-screen bg-[#f2f2eb] flex items-center justify-center p-4">
      <div className="max-w-md w-full border-2 border-[#10201d] bg-[#f7f7f2] shadow-[7px_7px_0_#671912] p-6 space-y-5 text-center">
        <div className="w-12 h-12 bg-[#fee2e2] border-2 border-[#10201d] flex items-center justify-center mx-auto text-[#e53927] shadow-[2px_2px_0_#10201d]">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <div>
          <h1 className="font-display text-2xl font-bold text-[#10201d]">
            Squad Invite Failed
          </h1>
          <p className="font-mono text-xs text-[#34433f] mt-2 leading-relaxed">
            {result.error || 'This invite code is invalid or the squad no longer exists.'}
          </p>
        </div>

        <div className="p-3 bg-white border border-[#10201d] font-mono text-xs text-[#57726d]">
          Code provided: <span className="font-bold text-[#10201d] tracking-widest">{code}</span>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <Link
            href="/friends"
            className="w-full inline-flex items-center justify-center gap-2 p-2.5 font-mono text-xs font-bold uppercase tracking-wider bg-[#2e4742] text-[#f7f7f2] border-2 border-[#10201d] shadow-[3px_3px_0_#10201d] hover:bg-[#3d5f58]"
          >
            <Users className="w-4 h-4" /> Go to My Teams
          </Link>
          <Link
            href="/dashboard"
            className="w-full inline-flex items-center justify-center gap-2 p-2 font-mono text-xs text-[#34433f] hover:underline"
          >
            Return to Dashboard <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}
