'use client'

import { useState } from 'react'
import { 
  Copy, Check, Loader2, 
  User, ShieldCheck, AlertTriangle, Edit3, ChevronDown, ChevronUp, Users 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { upsertVaultProfile, nudgeTeammateProfile, getVaultProfiles } from '@/app/actions/vault'
import type { TeamVaultProfile } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'
import { CopyTeamInfoButton } from './CopyTeamInfoButton'

interface VaultProfilesProps {
  profiles: TeamVaultProfile[]
  setProfiles: React.Dispatch<React.SetStateAction<TeamVaultProfile[]>>
  currentUserId?: string
  currentUserEmail?: string
  squadId?: string
  squadName?: string
  isProfileModalOpen: boolean
  setIsProfileModalOpen: (open: boolean) => void
}

export function VaultProfiles({
  profiles,
  setProfiles,
  currentUserId,
  currentUserEmail,
  squadId,
  squadName = 'Squad',
  isProfileModalOpen,
  setIsProfileModalOpen,
}: VaultProfilesProps) {
  const { toast } = useToast()
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [nudgingUserId, setNudgingUserId] = useState<string | null>(null)
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({})

  // Edit Profile Form State
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState<{
    full_name: string
    email: string
    phone: string
    college: string
    roll_number: string
    github_url: string
    linkedin_url: string
    portfolio_url: string
    resume_url: string
  }>({
    full_name: '',
    email: currentUserEmail || '',
    phone: '',
    college: '',
    roll_number: '',
    github_url: '',
    linkedin_url: '',
    portfolio_url: '',
    resume_url: '',
  })

  // Open Edit Profile Modal
  const handleOpenEditProfile = () => {
    const myProfile = profiles.find((p) => p.user_id === currentUserId)
    setProfileForm({
      full_name: myProfile?.full_name || '',
      email: myProfile?.email || currentUserEmail || '',
      phone: myProfile?.phone || '',
      college: myProfile?.college || '',
      roll_number: myProfile?.roll_number || '',
      github_url: myProfile?.github_url || '',
      linkedin_url: myProfile?.linkedin_url || '',
      portfolio_url: myProfile?.portfolio_url || '',
      resume_url: myProfile?.resume_url || '',
    })
    setIsProfileModalOpen(true)
  }

  // 1-Click Copy with 1500ms check feedback
  const handleCopy = (fieldKey: string, value: string, label: string) => {
    if (!value) return
    navigator.clipboard.writeText(value)
    setCopiedKey(fieldKey)
    toast({
      title: 'Copied to Clipboard!',
      description: `${label}: "${value.length > 30 ? value.slice(0, 30) + '...' : value}"`,
    })

    setTimeout(() => {
      setCopiedKey((prev) => (prev === fieldKey ? null : prev))
    }, 1500)
  }

  // Nudge Teammate
  const handleNudge = async (targetUserId: string, targetName: string) => {
    if (!squadId) return
    setNudgingUserId(targetUserId)
    try {
      const res = await nudgeTeammateProfile(squadId, targetUserId)
      if (res.success) {
        toast({
          title: '📢 Nudge Sent!',
          description: `Notified ${targetName} to complete their registration profile in the Vault.`,
        })
      } else {
        toast({
          title: 'Could not send nudge',
          description: res.error,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Nudge Failed',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setNudgingUserId(null)
    }
  }

  // Format Exporters
  const copySquadUnstopFormat = () => {
    const validProfiles = profiles.filter((p) => p.has_vault_profile !== false)
    if (validProfiles.length === 0) {
      toast({
        title: 'No Completed Profiles',
        description: 'Teammates need to fill their registration profiles first.',
        variant: 'destructive',
      })
      return
    }

    let text = `=== SQUAD REGISTRATION (UNSTOP FORMAT) ===\nTeam Name: ${squadName}\nTeam Size: ${validProfiles.length}\n\n`
    validProfiles.forEach((p, idx) => {
      text += `Member ${idx + 1} (${idx === 0 ? 'Leader' : 'Teammate'}):\n`
      text += `Name: ${p.full_name || 'N/A'}\n`
      text += `Email: ${p.email || 'N/A'}\n`
      text += `Phone: ${p.phone || 'N/A'}\n`
      text += `College: ${p.college || 'N/A'}\n`
      if (p.roll_number) text += `Roll/ID: ${p.roll_number}\n`
      text += `GitHub: ${p.github_url || 'N/A'}\n`
      text += `LinkedIn: ${p.linkedin_url || 'N/A'}\n`
      if (p.resume_url) text += `Resume: ${p.resume_url}\n`
      text += `\n`
    })
    navigator.clipboard.writeText(text.trim())
    toast({
      title: 'Unstop Squad Roster Copied!',
      description: `Copied details for ${validProfiles.length} member(s) formatted for Unstop registration.`,
    })
  }

  const copySquadDevfolioFormat = () => {
    const validProfiles = profiles.filter((p) => p.has_vault_profile !== false)
    if (validProfiles.length === 0) {
      toast({
        title: 'No Completed Profiles',
        description: 'Teammates need to fill their registration profiles first.',
        variant: 'destructive',
      })
      return
    }

    let text = `=== SQUAD REGISTRATION (DEVFOLIO FORMAT) ===\nTeam: ${squadName}\n\n`
    validProfiles.forEach((p, idx) => {
      text += `[Member ${idx + 1}${idx === 0 ? ' - Lead' : ''}]\n`
      text += `Full Name: ${p.full_name || ''}\n`
      text += `Email: ${p.email || ''}\n`
      text += `GitHub: ${p.github_url || ''}\n`
      text += `LinkedIn: ${p.linkedin_url || ''}\n`
      text += `Portfolio: ${p.portfolio_url || ''}\n`
      text += `Mobile: ${p.phone || ''}\n\n`
    })
    navigator.clipboard.writeText(text.trim())
    toast({
      title: 'Devfolio Squad Roster Copied!',
      description: `Copied details for ${validProfiles.length} member(s) formatted for Devfolio registration.`,
    })
  }

  const copySquadTsvFormat = () => {
    const validProfiles = profiles.filter((p) => p.has_vault_profile !== false)
    if (validProfiles.length === 0) return

    const header = ['Name', 'Email', 'Phone', 'College', 'Roll No', 'GitHub', 'LinkedIn', 'Portfolio', 'Resume'].join('\t')
    const rows = validProfiles.map((p) => [
      p.full_name || '',
      p.email || '',
      p.phone || '',
      p.college || '',
      p.roll_number || '',
      p.github_url || '',
      p.linkedin_url || '',
      p.portfolio_url || '',
      p.resume_url || '',
    ].join('\t'))
    const tsv = [header, ...rows].join('\n')
    navigator.clipboard.writeText(tsv)
    toast({
      title: 'TSV / Sheets Format Copied!',
      description: `Copied table for ${validProfiles.length} member(s) — paste directly into Google Sheets or Excel!`,
    })
  }

  // Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileForm.full_name.trim() || !profileForm.email.trim()) {
      toast({
        title: 'Name & Email Required',
        description: 'Please enter at least your full name and email.',
        variant: 'destructive',
      })
      return
    }

    setSavingProfile(true)
    try {
      const res = await upsertVaultProfile({
        full_name: profileForm.full_name.trim(),
        email: profileForm.email.trim(),
        phone: profileForm.phone?.trim() || undefined,
        college: profileForm.college?.trim() || undefined,
        roll_number: profileForm.roll_number?.trim() || undefined,
        github_url: profileForm.github_url?.trim() || undefined,
        linkedin_url: profileForm.linkedin_url?.trim() || undefined,
        portfolio_url: profileForm.portfolio_url?.trim() || undefined,
        resume_url: profileForm.resume_url?.trim() || undefined,
      })

      if (!res.success) {
        throw new Error(res.error || 'Failed to save profile')
      }

      toast({
        title: 'Registration Profile Saved!',
        description: 'Your details are updated in the Vault and ready for 1-click registration.',
      })

      setIsProfileModalOpen(false)
      if (squadId) {
        const pRes = await getVaultProfiles(squadId)
        if (pRes.success) setProfiles(pRes.data || [])
      }
    } catch (err: any) {
      toast({
        title: 'Could Not Save Details',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSavingProfile(false)
    }
  }

  const toggleCardExpansion = (userId: string) => {
    setExpandedCards((prev) => ({
      ...prev,
      [userId]: !prev[userId]
    }))
  }

  return (
    <div className="space-y-6">
      {/* Helper Banner */}
      <div className="p-4 rounded-xl border border-hack-ink/15 bg-hack-panel shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-hack-mint-dark shrink-0" />
          <div>
            <span className="font-sans text-xs text-hack-ink font-bold block">
              1-Click Registration Clipboard: Click any field to copy instantly into Unstop / Devfolio forms.
            </span>
            <span className="font-mono text-[11px] text-hack-subtext">
              Keep teammate profiles complete so anyone in the squad can register the whole team in seconds.
            </span>
          </div>
        </div>
        <Button
          onClick={handleOpenEditProfile}
          className="font-sans text-xs font-bold rounded-lg border border-hack-ink/20 bg-white hover:bg-hack-sand text-hack-ink shadow-sm shrink-0"
        >
          <Edit3 className="w-3.5 h-3.5 mr-1.5" />
          Edit My Details
        </Button>
      </div>

      {/* 1-Click Squad Registration Bridge Bar */}
      <div className="p-3.5 rounded-xl bg-hack-sand/60 border border-hack-ink/15 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-hack-ink" />
          <span className="font-sans text-xs font-bold uppercase tracking-wider text-hack-ink">
            Squad Registration Bridge
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Copy Team Info Clean Summary Button */}
          <CopyTeamInfoButton profiles={profiles} squadName={squadName} />

          <Button
            type="button"
            size="sm"
            disabled={profiles.length === 0}
            onClick={copySquadUnstopFormat}
            className="h-8 text-xs font-mono font-medium rounded-lg bg-white text-hack-ink border border-hack-ink/20 shadow-sm hover:bg-hack-sand"
          >
            <Copy className="h-3 w-3 mr-1" />
            Unstop Format
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={profiles.length === 0}
            onClick={copySquadDevfolioFormat}
            className="h-8 text-xs font-mono font-medium rounded-lg bg-white text-hack-ink border border-hack-ink/20 shadow-sm hover:bg-hack-sand"
          >
            <Copy className="h-3 w-3 mr-1" />
            Devfolio Format
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={profiles.length === 0}
            onClick={copySquadTsvFormat}
            className="h-8 text-xs font-mono font-medium rounded-lg bg-white text-hack-ink border border-hack-ink/20 shadow-sm hover:bg-hack-sand"
          >
            <Copy className="h-3 w-3 mr-1" />
            Sheets / TSV
          </Button>
        </div>
      </div>

      {/* Member Profiles Grid */}
      {profiles.length === 0 ? (
        <div className="p-12 rounded-2xl border border-dashed border-hack-ink/20 text-center bg-hack-panel">
          <User className="h-10 w-10 text-hack-subtext mx-auto opacity-40 mb-3" />
          <h3 className="font-sans text-xl font-bold text-hack-ink">Your team's info isn't here yet</h3>
          <p className="font-mono text-xs text-hack-subtext mt-1.5 max-w-md mx-auto">
            Fill it once, reuse it everywhere across hackathon registrations.
          </p>
          <Button
            onClick={handleOpenEditProfile}
            className="mt-4 font-sans text-xs font-bold rounded-lg bg-hack-coral hover:bg-hack-coral/90 text-hack-ink shadow-hack-hero"
          >
            + Add Registration Details
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {profiles.map((p) => {
            const isMe = p.user_id === currentUserId
            const isPending = !p.has_vault_profile || !p.is_complete
            const isExpanded = !!expandedCards[p.user_id]

            // Primary fields: Always visible
            const primaryFields = [
              { key: `${p.user_id}-name`, label: 'Full Name', value: p.full_name },
              { key: `${p.user_id}-email`, label: 'Email', value: p.email },
              { key: `${p.user_id}-college`, label: 'College / Institute', value: p.college },
              { key: `${p.user_id}-github`, label: 'GitHub', value: p.github_url },
            ]

            // Secondary fields: Collapsible progressive disclosure
            const secondaryFields = [
              { key: `${p.user_id}-phone`, label: 'Phone', value: p.phone },
              { key: `${p.user_id}-roll`, label: 'Roll / ID No', value: p.roll_number },
              { key: `${p.user_id}-linkedin`, label: 'LinkedIn', value: p.linkedin_url },
              { key: `${p.user_id}-portfolio`, label: 'Portfolio', value: p.portfolio_url },
              { key: `${p.user_id}-resume`, label: 'Resume PDF Link', value: p.resume_url },
            ]

            const renderFieldBox = (f: { key: string; label: string; value: string | null | undefined }) => {
              const hasVal = Boolean(f.value)
              const isCopied = copiedKey === f.key

              return (
                <div 
                  key={f.key}
                  className={cn(
                    "p-2.5 rounded-lg border border-hack-ink/10 bg-hack-sand/30 flex items-center justify-between gap-2 group transition-all",
                    hasVal ? "cursor-pointer hover:bg-hack-sand/60" : "opacity-50"
                  )}
                  onClick={() => hasVal && handleCopy(f.key, f.value!, f.label)}
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-[10px] text-hack-subtext font-semibold uppercase tracking-wider block">
                      {f.label}
                    </span>
                    <span className="font-mono text-xs font-semibold text-hack-ink truncate block">
                      {f.value || 'Not set'}
                    </span>
                  </div>
                  {hasVal && (
                    <button
                      type="button"
                      aria-label={`Copy ${f.label}`}
                      className={cn(
                        "p-1.5 rounded border shrink-0 transition-colors",
                        isCopied 
                          ? "bg-hack-mint text-hack-mint-dark border-hack-mint-dark/30" 
                          : "bg-white text-hack-ink border-hack-ink/15 group-hover:border-hack-ink/30"
                      )}
                      title={`Copy ${f.label}`}
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5 text-hack-mint-dark stroke-[3]" /> : <Copy className="w-3.5 h-3.5 text-hack-subtext" />}
                    </button>
                  )}
                </div>
              )
            }

            return (
              <Card key={p.user_id} className="rounded-xl border border-hack-ink/15 bg-hack-panel shadow-sm flex flex-col justify-between overflow-hidden">
                <div>
                  <div className="p-4 bg-hack-sand/80 border-b border-hack-ink/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-hack-ink text-hack-panel font-mono text-sm font-bold flex items-center justify-center">
                        {p.full_name ? p.full_name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <h3 className="font-sans text-base font-bold text-hack-ink leading-tight">
                          {p.full_name || 'Hacker'}
                        </h3>
                        <p className="font-mono text-[11px] text-hack-subtext mt-0.5">
                          {p.college || (p.role === 'leader' ? 'Squad Leader' : 'Squad Member')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {p.role === 'leader' && (
                        <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border border-[#F6C344]/50 bg-[#FEF9EE] text-[#8A5D13]">
                          Leader
                        </span>
                      )}
                      {isMe && (
                        <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border border-hack-ink/20 bg-hack-ink text-hack-panel">
                          You
                        </span>
                      )}
                      {isPending && (
                        <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border border-hack-coral/40 bg-hack-coral/15 text-hack-coral-dark flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-hack-coral-dark" /> Details Pending
                        </span>
                      )}
                    </div>
                  </div>

                  <CardContent className="p-4 space-y-3">
                    {/* If details are missing, show nudge or edit banner */}
                    {isPending && (
                      <div className="p-2.5 rounded-lg border border-[#F6C344]/50 bg-[#FEF9EE] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-[#8A5D13]">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span className="font-mono text-[11px] font-semibold">
                            {isMe ? 'Your registration details are incomplete' : 'Teammate details not yet added'}
                          </span>
                        </div>
                        {isMe ? (
                          <Button
                            size="sm"
                            onClick={handleOpenEditProfile}
                            className="h-6 text-[10px] font-sans font-bold bg-hack-coral hover:bg-hack-coral/90 text-hack-ink rounded shrink-0 shadow-sm"
                          >
                            <Edit3 className="w-3 h-3 mr-1" />
                            Edit Details
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            disabled={nudgingUserId === p.user_id}
                            onClick={() => handleNudge(p.user_id, p.full_name)}
                            className="h-6 text-[10px] font-mono font-bold bg-[#F6C344] hover:bg-[#F6C344]/90 text-hack-ink rounded border border-hack-ink/20 shrink-0 shadow-sm"
                          >
                            {nudgingUserId === p.user_id ? (
                              <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            ) : null}
                            <span>📢 Nudge</span>
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Primary Visible Fields (Name, Email, College, GitHub) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {primaryFields.map(renderFieldBox)}
                    </div>

                    {/* Progressive Disclosure Section for Secondary Details */}
                    {isExpanded && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-dashed border-hack-ink/20">
                        {secondaryFields.map(renderFieldBox)}
                      </div>
                    )}

                    {/* Toggle Button for More Details */}
                    <button
                      type="button"
                      onClick={() => toggleCardExpansion(p.user_id)}
                      className="w-full py-1.5 px-2 font-mono text-[11px] font-medium text-hack-subtext hover:text-hack-ink bg-hack-sand/40 hover:bg-hack-sand rounded-lg border border-hack-ink/10 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-3.5 h-3.5" />
                          <span>Show fewer details</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3.5 h-3.5" />
                          <span>Show more details ({secondaryFields.filter(f => f.value).length}/{secondaryFields.length} set)</span>
                        </>
                      )}
                    </button>
                  </CardContent>
                </div>

                {/* Dedicated Edit Footer for own card */}
                {isMe && !isPending && (
                  <div className="px-4 py-2 bg-hack-sand/30 border-t border-hack-ink/10 flex justify-end">
                    <button
                      type="button"
                      onClick={handleOpenEditProfile}
                      className="font-mono text-xs font-semibold text-hack-coral-dark hover:underline flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit My Details</span>
                    </button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Edit Registration Details Modal */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-2xl border border-hack-ink/20 bg-hack-sand shadow-2xl p-5 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-sans text-xl sm:text-2xl font-bold text-hack-ink">
              Squad Registration Profile
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-hack-subtext mt-1">
              Saved once in your Vault. Squad members can 1-click copy your phone, roll number, and resume link on Unstop or Devfolio forms.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-mono text-xs font-semibold uppercase text-hack-ink block">Full Name *</label>
                <Input
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  placeholder="Your Full Name"
                  className="font-mono text-xs rounded-lg border border-hack-ink/20 bg-white focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-xs font-semibold uppercase text-hack-ink block">Email *</label>
                <Input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  placeholder="your.email@example.com"
                  className="font-mono text-xs rounded-lg border border-hack-ink/20 bg-white focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-xs font-semibold uppercase text-hack-ink block">Phone Number</label>
                <Input
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="font-mono text-xs rounded-lg border border-hack-ink/20 bg-white focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-xs font-semibold uppercase text-hack-ink block">College / Institute</label>
                <Input
                  value={profileForm.college}
                  onChange={(e) => setProfileForm({ ...profileForm, college: e.target.value })}
                  placeholder="e.g. IIT Bombay / BITS Pilani"
                  className="font-mono text-xs rounded-lg border border-hack-ink/20 bg-white focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-xs font-semibold uppercase text-hack-ink block">Roll Number / Student ID</label>
                <Input
                  value={profileForm.roll_number}
                  onChange={(e) => setProfileForm({ ...profileForm, roll_number: e.target.value })}
                  placeholder="e.g. 21BCE0912"
                  className="font-mono text-xs rounded-lg border border-hack-ink/20 bg-white focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-xs font-semibold uppercase text-hack-ink block">GitHub Profile</label>
                <Input
                  value={profileForm.github_url}
                  onChange={(e) => setProfileForm({ ...profileForm, github_url: e.target.value })}
                  placeholder="https://github.com/username"
                  className="font-mono text-xs rounded-lg border border-hack-ink/20 bg-white focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-xs font-semibold uppercase text-hack-ink block">LinkedIn Profile</label>
                <Input
                  value={profileForm.linkedin_url}
                  onChange={(e) => setProfileForm({ ...profileForm, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/username"
                  className="font-mono text-xs rounded-lg border border-hack-ink/20 bg-white focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-xs font-semibold uppercase text-hack-ink block">Portfolio URL</label>
                <Input
                  value={profileForm.portfolio_url}
                  onChange={(e) => setProfileForm({ ...profileForm, portfolio_url: e.target.value })}
                  placeholder="https://myportfolio.dev"
                  className="font-mono text-xs rounded-lg border border-hack-ink/20 bg-white focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-mono text-xs font-semibold uppercase text-hack-ink block">Resume Link (PDF Link or Google Drive)</label>
              <Input
                value={profileForm.resume_url}
                onChange={(e) => setProfileForm({ ...profileForm, resume_url: e.target.value })}
                placeholder="https://drive.google.com/file/d/..."
                className="font-mono text-xs rounded-lg border border-hack-ink/20 bg-white focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-4 border-t border-hack-ink/10">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsProfileModalOpen(false)}
                className="font-sans text-xs font-semibold rounded-lg border border-hack-ink/20 bg-white hover:bg-hack-sand"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingProfile}
                className="font-sans text-xs font-bold rounded-lg bg-hack-coral hover:bg-hack-coral/90 text-hack-ink shadow-hack-hero active:translate-y-0.5 transition-all"
              >
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {savingProfile ? 'Saving Details...' : 'Save Profile'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
