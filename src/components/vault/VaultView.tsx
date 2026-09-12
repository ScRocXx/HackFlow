'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Copy, Check, Plus, ExternalLink, Trash2, Loader2, 
  FileText, Code, Palette, User, Globe, Phone, Mail, GraduationCap,
  ShieldCheck, ArrowRight, Shield, Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { upsertVaultProfile, createVaultAsset, deleteVaultAsset, getVaultProfiles, getVaultAssets } from '@/app/actions/vault'
import type { TeamVaultProfile, TeamVaultAsset, Squad } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

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
  squads?: Squad[]
  initialSquadId?: string | null
  currentUserId?: string
  currentUserEmail?: string
}

export function VaultView({
  initialProfiles = [],
  initialAssets = [],
  squads = [],
  initialSquadId = null,
  currentUserId,
  currentUserEmail
}: VaultViewProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'profiles' | 'decks' | 'boilerplates'>('profiles')
  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(initialSquadId)
  const [profiles, setProfiles] = useState<TeamVaultProfile[]>(initialProfiles)
  const [assets, setAssets] = useState<TeamVaultAsset[]>(initialAssets)
  const [loadingData, setLoadingData] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const handleSquadChange = async (squadId: string | null) => {
    setSelectedSquadId(squadId)
    setLoadingData(true)
    try {
      router.replace(squadId ? `/vault?squad=${squadId}` : '/vault')
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
        .map(t => t.trim())
        .filter(Boolean)

      const res = await createVaultAsset({
        title: assetForm.title,
        asset_type: assetForm.asset_type,
        url: assetForm.url,
        description: assetForm.description,
        tags: tagsArray,
        squad_id: selectedSquadId,
      })

      if (!res.success) throw new Error(res.error || 'Failed to add asset')

      toast({
        title: 'Asset Added to Vault',
        description: `${assetForm.title} is now available to your squad.`,
      })

      setAssets(prev => [res.data as TeamVaultAsset, ...prev])
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

      setAssets(prev => prev.filter(a => a.id !== assetId))
      toast({ title: 'Asset Removed' })
    } catch (err: any) {
      toast({ title: 'Delete Failed', description: err.message, variant: 'destructive' })
    }
  }

  const deckAssets = assets.filter(a => a.asset_type === 'pitch_deck' || a.asset_type === 'figma_kit' || a.asset_type === 'diagram')
  const boilerplateAssets = assets.filter(a => a.asset_type === 'boilerplate' || a.asset_type === 'other')

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
              Shared Squad Clipboard
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#f7f7f2]">
            Squad Asset Vault
          </h1>
          <p className="font-mono text-xs text-[#8bb2de] mt-1">
            Copy team details for registration forms in one click. Keep shared slide decks, Figma files, and starter repos in one place.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Squad Selector Dropdown */}
          <div className="flex items-center gap-2 bg-[#2e4742] p-1.5 border-2 border-[#10201d] shadow-[3px_3px_0_#10201d]">
            <Shield className="h-4 w-4 text-[#f5b726]" />
            <span className="font-mono text-xs font-bold text-[#f2f2eb] uppercase hidden sm:inline">Scope:</span>
            <select
              value={selectedSquadId || ''}
              onChange={(e) => handleSquadChange(e.target.value ? e.target.value : null)}
              disabled={loadingData}
              className="bg-white text-[#10201d] font-mono text-xs font-bold py-1 px-2 border-2 border-[#10201d] focus:outline-none cursor-pointer"
            >
              <option value="">🛡️ Personal Vault (Only Me)</option>
              {squads.map((sq) => (
                <option key={sq.id} value={sq.id}>
                  👥 Squad: {sq.name}
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
          <div className="p-4 border-2 border-[#10201d] bg-[#f2f2eb] shadow-[4px_4px_0_#10201d] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#2e4742]" />
              <span className="font-mono text-xs text-[#10201d] font-bold">
                1-Click Registration Clipboard: Click any field to copy instantly into Unstop / Devfolio forms.
              </span>
            </div>
            <span className="font-mono text-[11px] text-[#34433f] hidden sm:inline">
              Copies value & shows check confirmation
            </span>
          </div>

          {profiles.length === 0 ? (
            <div className="p-12 border-2 border-dashed border-[#10201d] text-center bg-[#f7f7f2]">
              <User className="h-10 w-10 text-[#34433f] mx-auto opacity-40 mb-3" />
              <h3 className="font-display text-2xl font-bold text-[#10201d]">No Squad Profiles in Vault</h3>
              <p className="font-mono text-xs text-[#34433f] mt-2 max-w-md mx-auto">
                No squad member profiles registered yet. You can add your registration details anytime from your profile menu in the bottom-left sidebar.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {profiles.map((p) => {
                const fields = [
                  { key: `${p.id}-name`, label: 'Full Name', value: p.full_name },
                  { key: `${p.id}-email`, label: 'Email', value: p.email },
                  { key: `${p.id}-phone`, label: 'Phone', value: p.phone },
                  { key: `${p.id}-college`, label: 'College / Institute', value: p.college },
                  { key: `${p.id}-roll`, label: 'Roll / ID No', value: p.roll_number },
                  { key: `${p.id}-github`, label: 'GitHub', value: p.github_url },
                  { key: `${p.id}-linkedin`, label: 'LinkedIn', value: p.linkedin_url },
                  { key: `${p.id}-portfolio`, label: 'Portfolio', value: p.portfolio_url },
                  { key: `${p.id}-resume`, label: 'Resume PDF Link', value: p.resume_url },
                ]

                return (
                  <Card key={p.id} className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[6px_6px_0_#671912]">
                    <div className="p-4 bg-[#2e4742] text-[#f7f7f2] border-b-2 border-[#10201d] flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 border-2 border-[#10201d] bg-[#f5b726] text-[#10201d] font-mono text-sm font-extrabold flex items-center justify-center shadow-[2px_2px_0_#10201d]">
                          {p.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-display text-xl font-bold text-[#f7f7f2] leading-none">{p.full_name}</h3>
                          <p className="font-mono text-[11px] text-[#8bb2de] mt-1">{p.college || 'Squad Member'}</p>
                        </div>
                      </div>
                      {p.user_id === currentUserId && (
                        <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 border-2 border-[#10201d] bg-[#e97b77] text-[#10201d] shadow-[1px_1px_0_#10201d]">
                          You
                        </span>
                      )}
                    </div>

                    <CardContent className="p-4 space-y-2.5">
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
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Reusable Pitch & Deck Kit */}
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
                      <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 border-2 border-[#10201d] bg-[#8bb2de] text-[#10201d]">
                        {asset.asset_type.replace('_', ' ')}
                      </span>
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
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs font-bold text-[#10201d] hover:text-[#e53927] flex items-center gap-1.5 group underline"
                    >
                      Open Link <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </a>
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

      {/* Tab 3: Boilerplate Hub */}
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
                      href={asset.url}
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">Asset Type</label>
                <select
                  value={assetForm.asset_type}
                  onChange={(e) => setAssetForm({ ...assetForm, asset_type: e.target.value as any })}
                  className="w-full h-10 px-3 border-2 border-[#10201d] bg-white font-mono text-xs shadow-[2px_2px_0_#10201d] focus:outline-none"
                >
                  <option value="pitch_deck">Pitch Deck Template</option>
                  <option value="figma_kit">Figma UI Kit</option>
                  <option value="boilerplate">Starter Boilerplate Repo</option>
                  <option value="diagram">Architecture Diagram</option>
                  <option value="other">Other Link</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">URL / Link *</label>
                <Input
                  value={assetForm.url}
                  onChange={(e) => setAssetForm({ ...assetForm, url: e.target.value })}
                  placeholder="https://..."
                  className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
                  required
                />
              </div>
            </div>

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
