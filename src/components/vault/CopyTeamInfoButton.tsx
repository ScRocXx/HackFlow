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
      title: 'Copied. Go register.',
      description: `Copied clean roster for ${validProfiles.length} member(s). Ready to paste into competition forms.`,
    })

    setTimeout(() => {
      setCopied(false)
    }, 2000)
  }

  return (
    <Button
      type="button"
      size={size}
      disabled={profiles.length === 0}
      onClick={handleCopyTeamInfo}
      className={cn(
        "h-8 px-3 text-xs font-sans font-bold rounded-lg bg-hack-coral text-hack-ink hover:bg-hack-coral/90 shadow-sm transition-all active:translate-y-0.5",
        className
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5 mr-1.5 text-hack-mint-dark stroke-[3]" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
      {copied ? 'Copied. Go register.' : 'Copy Team Info'}
    </Button>
  )
}
