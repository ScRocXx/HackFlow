'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { 
  Copy, Check, Plus, ExternalLink, Trash2, Loader2, 
  FileText, Code, Palette, User, Globe, Phone, Mail, GraduationCap,
  ShieldCheck, ArrowRight, Shield, Users, Pin, Bell, Edit3, AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { PdfUpload } from '@/components/ui/pdf-upload'
import { 
  upsertVaultProfile, 
  createVaultAsset, 
  deleteVaultAsset, 
  getVaultProfiles, 
  getVaultAssets, 
  nudgeTeammateProfile 
} from '@/app/actions/vault'
import type { TeamVaultProfile, TeamVaultAsset, Squad, SquadScratchpad as SquadScratchpadType } from '@/lib/supabase/types'
import { ensureExternalUrl } from '@/lib/utils/url'
import { cn } from '@/lib/utils'
import { SquadScratchpad } from './SquadScratchpad'

function GithubIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

interface VaultViewProps {
  initialProfiles: TeamVaultProfile[]
  initialAssets: TeamVaultAsset[]
  initialScratchpad?: SquadScratchpadType | null
  squads?: Squad[]
  initialSquadId?: string | null
  initialAction?: string | null
  currentUserId?: string
  currentUserEmail?: string
}

export function VaultView({
  initialProfiles = [],
  initialAssets = [],
  initialScratchpad = null,
  squads = [],
  initialSquadId = null,
  initialAction = null,
  currentUserId,
  currentUserEmail
}: VaultViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<'profiles' | 'scratchpad' | 'decks' | 'boilerplates'>('profiles')
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(
    initialSquadId || (squads.length > 0 ? squads[0].id : null)
  )
  const [profiles, setProfiles] = useState<TeamVaultProfile[]>(initialProfiles)
  const [assets, setAssets] = useState<TeamVaultAsset[]>(initialAssets)
  const [loadingData, setLoadingData] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [nudgingUserId, setNudgingUserId] = useState<string | null>(null)

  // Edit Registration Profile Modal State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
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

  // Asset Modal State
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false)
  const [savingAsset, setSavingAsset] = useState(false)
  const [assetForm, setAssetForm] = useState<{
    title: string
    asset_type: 'pitch_deck' | 'figma_kit' | 'boilerplate' | 'diagram' | 'other'
    url: string
    description: string
    tags: string
  }>({
    title: '',
    asset_type: 'pitch_deck',
    url: '',
    description: '',
    tags: '',
  })

  const { toast } = useToast()

  const currentSquad = squads.find((s) => s.id === selectedSquadId) || squads[0]

  const handleSquadChange = async (squadId: string) => {
    setSelectedSquadId(squadId)
    setLoadingData(true)
    try {
      router.replace(`/vault?squad=${squadId}`)
      const [pRes, aRes] = await Promise.all([
        getVaultProfiles(squadId),
        getVaultAssets(undefined, squadId),
      ])
      if (pRes.success) setProfiles(pRes.data || [])
      if (aRes.success) setAssets(aRes.data || [])
    } finally {
      setLoadingData(false)
    }
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

    const squadName = currentSquad?.name || 'Squad'
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

    const squadName = currentSquad?.name || 'HackFlow Team'
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

  // Deep-link Auto-open: If navigated via nudge notification (?action=edit-profile), auto-open modal immediately
  useEffect(() => {
    const action = searchParams.get('action') || initialAction
    if (action === 'edit-profile') {
      handleOpenEditProfile()
    }
  }, [searchParams, initialAction])

  // Save Registration Profile
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
      const pRes = await getVaultProfiles(selectedSquadId || squads[0]?.id)
      if (pRes.success) setProfiles(pRes.data || [])
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

  // Nudge Teammate
  const handleNudge = async (targetUserId: string, targetName: string) => {
    if (!selectedSquadId) return
    setNudgingUserId(targetUserId)
    try {
      const res = await nudgeTeammateProfile(selectedSquadId, targetUserId)
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

  // Asset Handlers
  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!assetForm.title.trim() || !assetForm.url.trim()) {
      toast({
        title: 'Title & URL Required',
        description: 'Please provide both title and link.',
        variant: 'destructive',
      })
      return
    }

    setSavingAsset(true)
    try {
      const tagsArray = assetForm.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)

      const res = await createVaultAsset({
        title: assetForm.title,
        asset_type: assetForm.asset_type,
        url: assetForm.url,
        description: assetForm.description,
        tags: tagsArray,
        squad_id: selectedSquadId || squads[0]?.id,
      })

      if (!res.success) throw new Error(res.error || 'Failed to add asset')

      toast({
        title: 'Asset Added to Vault',
        description: `${assetForm.title} is now available in your Vault.`,
      })

      setAssets((prev) => [res.data as TeamVaultAsset, ...prev])
      setIsAssetModalOpen(false)
      setAssetForm({
        title: '',
        asset_type: 'pitch_deck',
        url: '',
        description: '',
        tags: '',
      })
    } catch (err: any) {
      toast({
        title: 'Failed to Save Asset',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSavingAsset(false)
    }
  }

  const handleDeleteAsset = async (assetId: string) => {
    try {
      const res = await deleteVaultAsset(assetId)
      if (!res.success) throw new Error(res.error)

      setAssets((prev) => prev.filter((a) => a.id !== assetId))
      toast({ title: 'Asset Removed' })
    } catch (err: any) {
      toast({ title: 'Delete Failed', description: err.message, variant: 'destructive' })
    }
  }

  const deckAssets = assets.filter((a) => a.asset_type === 'pitch_deck' || a.asset_type === 'figma_kit' || a.asset_type === 'diagram')
  const boilerplateAssets = assets.filter((a) => a.asset_type === 'boilerplate' || a.asset_type === 'other')

  if (squads.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4">
        <div className="border-4 border-[#10201d] bg-[#f7f7f2] shadow-[8px_8px_0_#671912] p-8 sm:p-12 text-center space-y-6">
          <div className="w-16 h-16 mx-auto border-2 border-[#10201d] bg-[#f5b726] flex items-center justify-center shadow-[4px_4px_0_#10201d]">
            <Users className="w-8 h-8 text-[#10201d]" />
          </div>

          <div className="space-y-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#e53927] bg-[#f6c4c1] px-2.5 py-1 border border-[#10201d] inline-block shadow-[1px_1px_0_#10201d]">
              Strictly Squad-Scoped
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#10201d]">
              No Squad Found
            </h1>
            <p className="font-mono text-xs text-[#34433f] max-w-md mx-auto leading-relaxed">
              The Vault is exclusively squad-scoped. Create or join a squad to access 1-click team registration rosters, shared environment keyrings, sprint scratchpads, and slide decks.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <Link
              href="/friends"
              className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider px-6 py-3 border-2 border-[#10201d] bg-[#f5b726] hover:bg-[#ffcf66] text-[#10201d] shadow-[4px_4px_0_#8a5d13] transition-all hover:translate-x-[1px] hover:translate-y-[1px]"
            >
              <Users className="w-4 h-4" />
              <span>Create or Join a Squad</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Vault Header Banner */}
      <div className="border-2 border-[#10201d] bg-[#3d5f58] p-6 text-[#f7f7f2] shadow-[7px_7px_0_#671912] flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 bg-[#e53927] inline-block" />
            <span className="w-2.5 h-2.5 bg-[#8bb2de] inline-block" />
            <span className="w-2.5 h-2.5 bg-[#f5b726] inline-block" />
            <span className="w-2.5 h-2.5 bg-[#e97b77] inline-block" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#f6c4c1] ml-2">
              Squad Vault: {currentSquad?.name || 'Squad'}
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#f7f7f2]">
            {currentSquad?.name || 'Squad'} Vault
          </h1>
          <p className="font-mono text-xs text-[#8bb2de] mt-1">
            1-click team registration clipboard, sprint scratchpad & keyring, shared slide decks, and starter repos.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Squad Selector Dropdown */}
          <div className="flex items-center gap-2 bg-[#2e4742] p-1.5 border-2 border-[#10201d] shadow-[3px_3px_0_#10201d]">
            <Users className="h-4 w-4 text-[#f5b726]" />
            <span className="font-mono text-xs font-bold text-[#f2f2eb] uppercase hidden sm:inline">Squad:</span>
            <select
              value={selectedSquadId || squads[0]?.id || ''}
              onChange={(e) => handleSquadChange(e.target.value)}
              disabled={loadingData}
              className="bg-white text-[#10201d] font-mono text-xs font-bold py-1 px-2 border-2 border-[#10201d] focus:outline-none cursor-pointer"
            >
              {squads.map((sq) => (
                <option key={sq.id} value={sq.id}>
                  👥 {sq.name}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={() => setIsAssetModalOpen(true)}
            className="border-2 border-[#10201d] bg-[#e97b77] hover:bg-[#f6c4c1] text-[#10201d] font-mono text-xs font-bold shadow-[3px_3px_0_#671912]"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            + Add Shared Asset
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b-2 border-[#10201d] pb-2 flex-wrap">
        <button
          onClick={() => setActiveTab('profiles')}
          className={cn(
            "font-mono text-xs font-bold uppercase tracking-wider px-4 py-2 border-2 border-[#10201d] transition-all",
            activeTab === 'profiles'
              ? "bg-[#f5b726] text-[#10201d] shadow-[3px_3px_0_#8a5d13]"
              : "bg-[#f7f7f2] text-[#34433f] hover:bg-[#e4e5da]"
          )}
        >
          Quick-Fill Team Profiles ({profiles.length})
        </button>

        <button
          onClick={() => setActiveTab('scratchpad')}
          className={cn(
            "font-mono text-xs font-bold uppercase tracking-wider px-4 py-2 border-2 border-[#10201d] transition-all flex items-center gap-1.5",
            activeTab === 'scratchpad'
              ? "bg-[#f5b726] text-[#10201d] shadow-[3px_3px_0_#8a5d13]"
              : "bg-[#f7f7f2] text-[#34433f] hover:bg-[#e4e5da]"
          )}
        >
          <Pin className="w-3.5 h-3.5" />
          <span>Sprint Scratchpad & Keyring</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block ml-0.5" />
        </button>

        <button
          onClick={() => setActiveTab('decks')}
          className={cn(
            "font-mono text-xs font-bold uppercase tracking-wider px-4 py-2 border-2 border-[#10201d] transition-all",
            activeTab === 'decks'
              ? "bg-[#f5b726] text-[#10201d] shadow-[3px_3px_0_#8a5d13]"
              : "bg-[#f7f7f2] text-[#34433f] hover:bg-[#e4e5da]"
          )}
        >
          Pitch & Deck Kit ({deckAssets.length})
        </button>

        <button
          onClick={() => setActiveTab('boilerplates')}
          className={cn(
            "font-mono text-xs font-bold uppercase tracking-wider px-4 py-2 border-2 border-[#10201d] transition-all",
            activeTab === 'boilerplates'
              ? "bg-[#f5b726] text-[#10201d] shadow-[3px_3px_0_#8a5d13]"
              : "bg-[#f7f7f2] text-[#34433f] hover:bg-[#e4e5da]"
          )}
        >
          Boilerplate Hub ({boilerplateAssets.length})
        </button>
      </div>

      {/* Tab 1: Quick-Fill Team Profiles */}
      {activeTab === 'profiles' && (
        <div className="space-y-6">
          <div className="p-4 border-2 border-[#10201d] bg-[#f2f2eb] shadow-[4px_4px_0_#10201d] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#2e4742] shrink-0" />
              <div>
                <span className="font-mono text-xs text-[#10201d] font-bold block">
                  1-Click Registration Clipboard: Click any field to copy instantly into Unstop / Devfolio forms.
                </span>
                <span className="font-mono text-[11px] text-[#34433f]">
                  Keep teammate profiles complete so anyone in the squad can register the whole team in seconds.
                </span>
              </div>
            </div>
            <Button
              onClick={handleOpenEditProfile}
              className="font-mono text-xs font-bold border-2 border-[#10201d] bg-[#8bb2de] hover:bg-[#b0cced] text-[#10201d] shadow-[2px_2px_0_#10201d] shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1.5" />
              Edit My Details
            </Button>
          </div>

          {/* 1-Click Squad Registration Bridge Bar permanently visible on the Roster tab */}
          <div className="p-3 bg-[#10201d] text-[#f7f7f2] border-2 border-[#10201d] shadow-[4px_4px_0_#10201d] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-[#f5b726]" />
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-[#f7f7f2]">
                1-Click Squad Registration Bridge:
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                size="sm"
                disabled={profiles.length === 0}
                onClick={copySquadUnstopFormat}
                className="h-7 text-xs font-mono font-bold bg-[#8bb2de] text-[#10201d] border-2 border-[#10201d] shadow-[2px_2px_0_#10201d] hover:bg-[#b0cced]"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy Unstop Format
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={profiles.length === 0}
                onClick={copySquadDevfolioFormat}
                className="h-7 text-xs font-mono font-bold bg-[#f5b726] text-[#10201d] border-2 border-[#10201d] shadow-[2px_2px_0_#10201d] hover:bg-[#ffcf66]"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy Devfolio Format
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={profiles.length === 0}
                onClick={copySquadTsvFormat}
                className="h-7 text-xs font-mono font-bold bg-white text-[#10201d] border-2 border-[#10201d] shadow-[2px_2px_0_#10201d] hover:bg-slate-100"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy Sheets / TSV
              </Button>
            </div>
          </div>

          {/* Member Profiles Grid */}
          {profiles.length === 0 ? (
            <div className="p-12 border-2 border-dashed border-[#10201d] text-center bg-[#f7f7f2]">
              <User className="h-10 w-10 text-[#34433f] mx-auto opacity-40 mb-3" />
              <h3 className="font-display text-2xl font-bold text-[#10201d]">No Profiles in Vault</h3>
              <p className="font-mono text-xs text-[#34433f] mt-2 max-w-md mx-auto">
                No registration profiles found. Click below to add your registration details.
              </p>
              <Button
                onClick={handleOpenEditProfile}
                className="mt-4 font-mono text-xs font-bold border-2 border-[#10201d] bg-[#e97b77] text-[#10201d] shadow-[2px_2px_0_#671912]"
              >
                + Add Registration Details
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {profiles.map((p) => {
                const isMe = p.user_id === currentUserId
                const isPending = !p.has_vault_profile || !p.is_complete

                const fields = [
                  { key: `${p.user_id}-name`, label: 'Full Name', value: p.full_name },
                  { key: `${p.user_id}-email`, label: 'Email', value: p.email },
                  { key: `${p.user_id}-phone`, label: 'Phone', value: p.phone },
                  { key: `${p.user_id}-college`, label: 'College / Institute', value: p.college },
                  { key: `${p.user_id}-roll`, label: 'Roll / ID No', value: p.roll_number },
                  { key: `${p.user_id}-github`, label: 'GitHub', value: p.github_url },
                  { key: `${p.user_id}-linkedin`, label: 'LinkedIn', value: p.linkedin_url },
                  { key: `${p.user_id}-portfolio`, label: 'Portfolio', value: p.portfolio_url },
                  { key: `${p.user_id}-resume`, label: 'Resume PDF Link', value: p.resume_url },
                ]

                return (
                  <Card key={p.user_id} className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[6px_6px_0_#671912]">
                    <div className="p-4 bg-[#2e4742] text-[#f7f7f2] border-b-2 border-[#10201d] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 border-2 border-[#10201d] bg-[#f5b726] text-[#10201d] font-mono text-sm font-extrabold flex items-center justify-center shadow-[2px_2px_0_#10201d]">
                          {p.full_name ? p.full_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <h3 className="font-display text-xl font-bold text-[#f7f7f2] leading-none">
                            {p.full_name || 'Hacker'}
                          </h3>
                          <p className="font-mono text-[11px] text-[#8bb2de] mt-1">
                            {p.college || (p.role === 'leader' ? 'Squad Leader' : 'Squad Member')}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {p.role === 'leader' && (
                          <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 border-2 border-[#10201d] bg-[#f5b726] text-[#10201d] shadow-[1px_1px_0_#10201d]">
                            Leader
                          </span>
                        )}
                        {isMe && (
                          <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 border-2 border-[#10201d] bg-[#e97b77] text-[#10201d] shadow-[1px_1px_0_#10201d]">
                            You
                          </span>
                        )}
                        {isPending && (
                          <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 border-2 border-[#10201d] bg-[#f6c4c1] text-[#10201d] shadow-[1px_1px_0_#10201d] flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-[#e53927]" /> Details Pending
                          </span>
                        )}
                      </div>
                    </div>

                    <CardContent className="p-4 space-y-3">
                      {/* If details are missing, show nudge or edit banner */}
                      {isPending && (
                        <div className="p-2.5 border-2 border-[#10201d] bg-[#fff8e7] flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-[2px_2px_0_#10201d]">
                          <div className="flex items-center gap-1.5 text-[#8a5d13]">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span className="font-mono text-[11px] font-bold">
                              {isMe ? 'Your registration details are incomplete!' : 'Teammate details not yet added'}
                            </span>
                          </div>
                          {isMe ? (
                            <Button
                              size="sm"
                              onClick={handleOpenEditProfile}
                              className="h-6 text-[10px] font-mono font-bold bg-[#e97b77] hover:bg-[#f6c4c1] text-[#10201d] border border-[#10201d] shrink-0"
                            >
                              <Edit3 className="w-3 h-3 mr-1" />
                              Edit My Details
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              disabled={nudgingUserId === p.user_id}
                              onClick={() => handleNudge(p.user_id, p.full_name)}
                              className="h-6 text-[10px] font-mono font-bold bg-[#f5b726] hover:bg-[#ffcf66] text-[#10201d] border border-[#10201d] shrink-0 shadow-[1px_1px_0_#10201d]"
                            >
                              {nudgingUserId === p.user_id ? (
                                <Loader2 className="w-3 h-3 animate-spin mr-1" />
                              ) : null}
                              <span>📢 Nudge</span>
                            </Button>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {fields.map((f) => {
                          const hasVal = Boolean(f.value)
                          const isCopied = copiedKey === f.key

                          return (
                            <div 
                              key={f.key}
                              className={cn(
                                "p-2 border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d] flex items-center justify-between gap-2 group transition-all",
                                hasVal ? "cursor-pointer hover:bg-[#e4e5da]" : "opacity-50"
                              )}
                              onClick={() => hasVal && handleCopy(f.key, f.value!, f.label)}
                            >
                              <div className="min-w-0 flex-1">
                                <span className="font-mono text-[10px] text-[#34433f] font-bold uppercase tracking-wider block">
                                  {f.label}
                                </span>
                                <span className="font-mono text-xs font-semibold text-[#10201d] truncate block">
                                  {f.value || 'Not set'}
                                </span>
                              </div>
                              {hasVal && (
                                <button
                                  type="button"
                                  className={cn(
                                    "p-1.5 border border-[#10201d] shrink-0 transition-colors",
                                    isCopied ? "bg-[#8bb2de] text-[#10201d]" : "bg-[#f2f2eb] text-[#10201d] group-hover:bg-[#f5b726]"
                                  )}
                                  title={`Copy ${f.label}`}
                                >
                                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-800" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Edit button at bottom of own card */}
                      {isMe && !isPending && (
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={handleOpenEditProfile}
                            className="font-mono text-xs font-bold text-[#10201d] hover:text-[#e53927] flex items-center gap-1 underline"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit My Details</span>
                          </button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Squad Sprint Scratchpad & Pinboard */}
      {activeTab === 'scratchpad' && (
        <div>
          <SquadScratchpad 
            squadId={selectedSquadId || squads[0].id}
            squadName={currentSquad?.name || squads[0]?.name || 'Squad'}
            initialScratchpad={initialScratchpad}
            currentUserId={currentUserId}
          />
        </div>
      )}

      {/* Tab 3: Reusable Pitch & Deck Kit */}
      {activeTab === 'decks' && (
        <div className="space-y-4">
          <div className="p-4 border-2 border-[#10201d] bg-[#f2f2eb] shadow-[4px_4px_0_#10201d] flex items-center justify-between">
            <span className="font-mono text-xs text-[#10201d] font-bold">
              Pinned master slide decks, Figma templates, cover slides, and architecture diagrams.
            </span>
            <Button
              size="sm"
              onClick={() => {
                setAssetForm({ title: '', asset_type: 'pitch_deck', url: '', description: '', tags: 'slides, template' })
                setIsAssetModalOpen(true)
              }}
              className="font-mono text-xs font-bold border-2 border-[#10201d] bg-[#e97b77] text-[#10201d] shadow-[2px_2px_0_#671912]"
            >
              + Pinned Deck / Kit
            </Button>
          </div>

          {deckAssets.length === 0 ? (
            <div className="p-12 border-2 border-dashed border-[#10201d] text-center bg-[#f7f7f2]">
              <Palette className="h-10 w-10 text-[#34433f] mx-auto opacity-40 mb-3" />
              <h3 className="font-display text-2xl font-bold text-[#10201d]">No Decks or Figma Kits Pinned</h3>
              <p className="font-mono text-xs text-[#34433f] mt-1 max-w-md mx-auto">
                Pin your team's master pitch deck, Figma UI kit, and standard diagrams here to reuse in every hackathon.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {deckAssets.map((asset) => (
                <div 
                  key={asset.id}
                  className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[5px_5px_0_#671912] p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 border-2 border-[#10201d] bg-[#8bb2de] text-[#10201d]">
                          {asset.asset_type.replace('_', ' ')}
                        </span>
                        {(asset.url.toLowerCase().endsWith('.pdf') || asset.url.toLowerCase().includes('hackflow_uploads') || asset.url.toLowerCase().includes('/uploads/')) && (
                          <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 border-2 border-[#10201d] bg-[#e53927] text-white flex items-center gap-1 shadow-[1px_1px_0_#10201d]">
                            <FileText className="w-3 h-3" /> PDF Deck
                          </span>
                        )}
                      </div>
                      {asset.created_by === currentUserId && (
                        <button
                          onClick={() => handleDeleteAsset(asset.id)}
                          className="text-[#10201d] hover:text-[#e53927]"
                          title="Delete asset"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <h3 className="font-display text-xl font-bold text-[#10201d] truncate">{asset.title}</h3>
                    {asset.description && (
                      <p className="font-mono text-xs text-[#34433f] mt-1 line-clamp-2">{asset.description}</p>
                    )}
                    {asset.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {asset.tags.map((t, idx) => (
                          <span key={idx} className="font-mono text-[9px] px-1.5 py-0.5 bg-[#e4e5da] border border-[#10201d] text-[#10201d]">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t-2 border-[#10201d] flex items-center justify-between">
                    {(asset.url.toLowerCase().endsWith('.pdf') || asset.url.toLowerCase().includes('hackflow_uploads') || asset.url.toLowerCase().includes('/uploads/')) ? (
                      <a
                        href={ensureExternalUrl(asset.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs font-bold text-[#10201d] hover:text-[#e53927] flex items-center gap-1.5 group underline"
                      >
                        <FileText className="w-3.5 h-3.5 text-[#e53927]" /> View PDF <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    ) : (
                      <a
                        href={ensureExternalUrl(asset.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs font-bold text-[#10201d] hover:text-[#e53927] flex items-center gap-1.5 group underline"
                      >
                        Open Link <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </a>
                    )}
                    <button
                      onClick={() => handleCopy(`asset-${asset.id}`, asset.url, asset.title)}
                      className="font-mono text-[11px] font-bold px-2 py-1 border-2 border-[#10201d] bg-[#f5b726] hover:bg-[#ffcf66] text-[#10201d] shadow-[1px_1px_0_#10201d] flex items-center gap-1"
                    >
                      {copiedKey === `asset-${asset.id}` ? <Check className="w-3 h-3 text-emerald-800" /> : <Copy className="w-3 h-3" />}
                      Copy Link
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Boilerplate Hub */}
      {activeTab === 'boilerplates' && (
        <div className="space-y-4">
          <div className="p-4 border-2 border-[#10201d] bg-[#f2f2eb] shadow-[4px_4px_0_#10201d] flex items-center justify-between">
            <span className="font-mono text-xs text-[#10201d] font-bold">
              Direct links to pre-configured starter repos (Next.js, FastAPI, ML inference wrappers) to skip early setup.
            </span>
            <Button
              size="sm"
              onClick={() => {
                setAssetForm({ title: '', asset_type: 'boilerplate', url: '', description: '', tags: 'nextjs, tailwind, starter' })
                setIsAssetModalOpen(true)
              }}
              className="font-mono text-xs font-bold border-2 border-[#10201d] bg-[#f5b726] text-[#10201d] shadow-[2px_2px_0_#8a5d13]"
            >
              + Add Boilerplate Repo
            </Button>
          </div>

          {boilerplateAssets.length === 0 ? (
            <div className="p-12 border-2 border-dashed border-[#10201d] text-center bg-[#f7f7f2]">
              <Code className="h-10 w-10 text-[#34433f] mx-auto opacity-40 mb-3" />
              <h3 className="font-display text-2xl font-bold text-[#10201d]">No Boilerplates Linked</h3>
              <p className="font-mono text-xs text-[#34433f] mt-1 max-w-md mx-auto">
                Add GitHub template repos for your squad so you never waste the first two hours setting up configurations.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {boilerplateAssets.map((asset) => (
                <div 
                  key={asset.id}
                  className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[5px_5px_0_#671912] p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 border-2 border-[#10201d] bg-[#f5b726] text-[#10201d]">
                        Starter Repo
                      </span>
                      {asset.created_by === currentUserId && (
                        <button
                          onClick={() => handleDeleteAsset(asset.id)}
                          className="text-[#10201d] hover:text-[#e53927]"
                          title="Delete boilerplate"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <h3 className="font-display text-xl font-bold text-[#10201d] truncate">{asset.title}</h3>
                    {asset.description && (
                      <p className="font-mono text-xs text-[#34433f] mt-1 line-clamp-2">{asset.description}</p>
                    )}
                    {asset.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2.5">
                        {asset.tags.map((t, idx) => (
                          <span key={idx} className="font-mono text-[9px] px-1.5 py-0.5 bg-[#e4e5da] border border-[#10201d] text-[#10201d]">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t-2 border-[#10201d] flex items-center justify-between">
                    <a
                      href={ensureExternalUrl(asset.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs font-bold text-[#10201d] hover:text-[#e53927] flex items-center gap-1.5 group underline"
                    >
                      <GithubIcon className="w-3.5 h-3.5" /> Open GitHub <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                    <button
                      onClick={() => handleCopy(`repo-${asset.id}`, asset.url, asset.title)}
                      className="font-mono text-[11px] font-bold px-2 py-1 border-2 border-[#10201d] bg-[#8bb2de] hover:bg-[#a6c8ee] text-[#10201d] shadow-[1px_1px_0_#10201d] flex items-center gap-1"
                    >
                      {copiedKey === `repo-${asset.id}` ? <Check className="w-3 h-3 text-emerald-800" /> : <Copy className="w-3 h-3" />}
                      Copy Git URL
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Registration Details Modal */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto border-2 border-[#10201d] bg-[#f7f7f2] shadow-[8px_8px_0_#671912] p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold text-[#10201d]">
              Squad Registration Profile
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-[#34433f]">
              Saved once in your Vault. Squad members can 1-click copy your phone, roll number, and resume link on Unstop or Devfolio forms.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">Full Name *</label>
                <Input
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  placeholder="Your Full Name"
                  className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">Email *</label>
                <Input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  placeholder="your.email@example.com"
                  className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">Phone Number</label>
                <Input
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">College / Institute</label>
                <Input
                  value={profileForm.college}
                  onChange={(e) => setProfileForm({ ...profileForm, college: e.target.value })}
                  placeholder="e.g. IIT Bombay / BITS Pilani"
                  className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">Roll Number / Student ID</label>
                <Input
                  value={profileForm.roll_number}
                  onChange={(e) => setProfileForm({ ...profileForm, roll_number: e.target.value })}
                  placeholder="e.g. 21BCE0912"
                  className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">GitHub Profile</label>
                <Input
                  value={profileForm.github_url}
                  onChange={(e) => setProfileForm({ ...profileForm, github_url: e.target.value })}
                  placeholder="https://github.com/username"
                  className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">LinkedIn Profile</label>
                <Input
                  value={profileForm.linkedin_url}
                  onChange={(e) => setProfileForm({ ...profileForm, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/username"
                  className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">Portfolio URL</label>
                <Input
                  value={profileForm.portfolio_url}
                  onChange={(e) => setProfileForm({ ...profileForm, portfolio_url: e.target.value })}
                  placeholder="https://myportfolio.dev"
                  className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">Resume Link (PDF Link or Google Drive)</label>
              <Input
                value={profileForm.resume_url}
                onChange={(e) => setProfileForm({ ...profileForm, resume_url: e.target.value })}
                placeholder="https://drive.google.com/file/d/..."
                className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t-2 border-[#10201d]">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsProfileModalOpen(false)}
                className="font-mono text-xs font-bold border-2 border-[#10201d] bg-[#f7f7f2]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingProfile}
                className="font-mono text-xs font-bold border-2 border-[#10201d] bg-[#e97b77] hover:bg-[#f6c4c1] text-[#10201d] shadow-[3px_3px_0_#671912]"
              >
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                {savingProfile ? 'Saving Details...' : 'Save Profile'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Asset Modal */}
      <Dialog open={isAssetModalOpen} onOpenChange={setIsAssetModalOpen}>
        <DialogContent className="sm:max-w-[540px] border-2 border-[#10201d] bg-[#f7f7f2] shadow-[8px_8px_0_#671912] p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold text-[#10201d]">
              Add Reusable Squad Asset
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-[#34433f]">
              Master presentation deck, Figma design system, or boilerplate repo link.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAsset} className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">Asset Title *</label>
              <Input
                value={assetForm.title}
                onChange={(e) => setAssetForm({ ...assetForm, title: e.target.value })}
                placeholder="e.g. Master Pitch Deck (Dark Mode)"
                className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">Asset Type</label>
              <select
                value={assetForm.asset_type}
                onChange={(e) => setAssetForm({ ...assetForm, asset_type: e.target.value as any })}
                className="w-full h-10 px-3 border-2 border-[#10201d] bg-white font-mono text-xs shadow-[2px_2px_0_#10201d] focus:outline-none"
              >
                <option value="pitch_deck">Pitch Deck Template (PDF / Presentation)</option>
                <option value="figma_kit">Figma UI Kit</option>
                <option value="boilerplate">Starter Boilerplate Repo</option>
                <option value="diagram">Architecture Diagram</option>
                <option value="other">Other Resource</option>
              </select>
            </div>

            <PdfUpload
              value={assetForm.url}
              onChange={(url, meta) => {
                setAssetForm((prev) => ({
                  ...prev,
                  url,
                  title: !prev.title.trim() && meta?.fileName
                    ? meta.fileName.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ')
                    : prev.title,
                }))
              }}
              label="Asset Document (Upload PDF or External Link) *"
              placeholder={assetForm.asset_type === 'figma_kit' ? 'https://figma.com/@...' : 'https://drive.google.com/... or https://...'}
              folder="vault_assets"
            />

            <div className="space-y-1">
              <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">Description</label>
              <Input
                value={assetForm.description}
                onChange={(e) => setAssetForm({ ...assetForm, description: e.target.value })}
                placeholder="e.g. Contains team slide, market size graph, and system diagram"
                className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
              />
            </div>

            <div className="space-y-1">
              <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">Tags (comma separated)</label>
              <Input
                value={assetForm.tags}
                onChange={(e) => setAssetForm({ ...assetForm, tags: e.target.value })}
                placeholder="pitch, figma, nextjs"
                className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAssetModalOpen(false)}
                className="font-mono text-xs font-bold border-2 border-[#10201d] bg-[#f2f2eb]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingAsset}
                className="font-mono text-xs font-bold border-2 border-[#10201d] bg-[#e97b77] hover:bg-[#f6c4c1] text-[#10201d] shadow-[3px_3px_0_#671912]"
              >
                {savingAsset ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pin Asset'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
