'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import type { TeamVaultProfile } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

interface CopyTeamInfoButtonProps {
  profiles: TeamVaultProfile[]
  squadName?: string
  className?: string
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export function CopyTeamInfoButton({
  profiles,
  squadName = 'Squad',
  className,
  size = 'sm'
}: CopyTeamInfoButtonProps) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const handleCopyTeamInfo = () => {
    const validProfiles = profiles.filter((p) => p.has_vault_profile !== false)
    if (validProfiles.length === 0) {
      toast({
        title: 'No Completed Profiles',
        description: 'Teammates need to fill their registration profiles first.',
        variant: 'destructive',
      })
      return
    }

    const lines: string[] = [`Team Name: ${squadName}`]

    // Find leader or sort so leader comes first
    const sorted = [...validProfiles].sort((a, b) => {
      if (a.role === 'leader') return -1
      if (b.role === 'leader') return 1
      return 0
    })

    sorted.forEach((p, idx) => {
      const roleLabel = idx === 0 ? 'Leader' : `Member ${idx + 1}`
      const name = p.full_name || 'N/A'
      const email = p.email || 'N/A'
      const phone = p.phone || 'N/A'
      const github = p.github_url || 'N/A'

      lines.push(`${roleLabel}: ${name} | ${email} | ${phone} | ${github}`)
    })

    const text = lines.join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)

    toast({
      title: 'Team Info Copied!',
      description: `Copied clean roster for ${validProfiles.length} member(s). Ready to paste into competition forms.`,
    })

    setTimeout(() => {
      setCopied(false)
    }, 1500)
  }

  return (
    <Button
      type="button"
      size={size}
      disabled={profiles.length === 0}
      onClick={handleCopyTeamInfo}
      className={cn(
        "h-7 text-xs font-mono font-bold bg-[#e97b77] text-[#10201d] border-2 border-[#10201d] shadow-[2px_2px_0_#10201d] hover:bg-[#f6c4c1] transition-all",
        className
      )}
    >
      {copied ? <Check className="h-3 w-3 mr-1 text-emerald-800" /> : <Copy className="h-3 w-3 mr-1" />}
      {copied ? 'Copied Team Info!' : 'Copy Team Info'}
    </Button>
  )
}
