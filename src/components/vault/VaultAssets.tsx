'use client'

import { useState } from 'react'
import { 
  Plus, ExternalLink, Trash2, Loader2, 
  FileText, Code, Palette, Check, Copy 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { PdfUpload } from '@/components/ui/pdf-upload'
import { useToast } from '@/components/ui/use-toast'
import { createVaultAsset, deleteVaultAsset } from '@/app/actions/vault'
import type { TeamVaultAsset } from '@/lib/supabase/types'
import { ensureExternalUrl } from '@/lib/utils/url'

function GithubIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

interface VaultAssetsProps {
  activeTab: 'decks' | 'boilerplates'
  assets: TeamVaultAsset[]
  setAssets: React.Dispatch<React.SetStateAction<TeamVaultAsset[]>>
  currentUserId?: string
  squadId?: string
  isAssetModalOpen: boolean
  setIsAssetModalOpen: (open: boolean) => void
}

export function VaultAssets({
  activeTab,
  assets,
  setAssets,
  currentUserId,
  squadId,
  isAssetModalOpen,
  setIsAssetModalOpen,
}: VaultAssetsProps) {
  const { toast } = useToast()
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [savingAsset, setSavingAsset] = useState(false)
  const [assetForm, setAssetForm] = useState<{
    title: string
    asset_type: 'pitch_deck' | 'figma_kit' | 'boilerplate' | 'diagram' | 'other'
    url: string
    description: string
    tags: string
  }>({
    title: '',
    asset_type: activeTab === 'boilerplates' ? 'boilerplate' : 'pitch_deck',
    url: '',
    description: '',
    tags: '',
  })

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

  const handleOpenAddAsset = (presetType?: 'pitch_deck' | 'boilerplate') => {
    const assetType = presetType || (activeTab === 'boilerplates' ? 'boilerplate' : 'pitch_deck')
    setAssetForm({
      title: '',
      asset_type: assetType,
      url: '',
      description: '',
      tags: assetType === 'boilerplate' ? 'nextjs, tailwind, starter' : 'slides, template',
    })
    setIsAssetModalOpen(true)
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
        .map((t) => t.trim())
        .filter(Boolean)

      const res = await createVaultAsset({
        title: assetForm.title,
        asset_type: assetForm.asset_type,
        url: assetForm.url,
        description: assetForm.description,
        tags: tagsArray,
        squad_id: squadId,
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

  if (activeTab === 'decks') {
    return (
      <div className="space-y-4">
        <div className="p-4 rounded-xl border border-hack-ink/15 bg-hack-surface shadow-sm flex items-center justify-between">
          <span className="font-sans text-xs text-hack-ink font-medium">
            Pinned master slide decks, Figma templates, cover slides, and architecture diagrams.
          </span>
          <Button
            size="sm"
            onClick={() => handleOpenAddAsset('pitch_deck')}
            className="font-sans text-xs font-bold rounded-lg bg-hack-coral text-hack-ink shadow-hack-hero hover:bg-hack-coral/90"
          >
            + Pinned Deck / Kit
          </Button>
        </div>

        {deckAssets.length === 0 ? (
          <div className="p-12 rounded-2xl border border-dashed border-hack-ink/20 text-center bg-hack-surface">
            <Palette className="h-10 w-10 text-hack-subtext mx-auto opacity-40 mb-3" />
            <h3 className="font-sans text-xl font-bold text-hack-ink">No Decks or Figma Kits Pinned</h3>
            <p className="font-mono text-xs text-hack-subtext mt-1.5 max-w-md mx-auto">
              Pin your team's master pitch deck, Figma UI kit, and standard diagrams here to reuse in every hackathon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {deckAssets.map((asset) => (
              <div 
                key={asset.id}
                className="rounded-xl border border-hack-ink/15 bg-hack-surface shadow-sm p-4 sm:p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border border-hack-ink/15 bg-hack-sky/30 text-hack-ink">
                        {asset.asset_type.replace('_', ' ')}
                      </span>
                      {(asset.url.toLowerCase().endsWith('.pdf') || asset.url.toLowerCase().includes('hackflow_uploads') || asset.url.toLowerCase().includes('/uploads/')) && (
                        <span className="font-mono text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border border-hack-coral/30 bg-hack-coral/15 text-hack-coral-dark flex items-center gap-1">
                          <FileText className="w-3 h-3" /> PDF Deck
                        </span>
                      )}
                    </div>
                    {asset.created_by === currentUserId && (
                      <button
                        onClick={() => handleDeleteAsset(asset.id)}
                        className="text-hack-subtext hover:text-hack-coral-dark p-1 rounded transition-colors"
                        title="Delete asset"
                        aria-label={`Delete asset: ${asset.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <h3 className="font-sans text-base font-bold text-hack-ink truncate">{asset.title}</h3>
                  {asset.description && (
                    <p className="font-mono text-xs text-hack-subtext mt-1 line-clamp-2">{asset.description}</p>
                  )}
                  {asset.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {asset.tags.map((t, idx) => (
                        <span key={idx} className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-hack-sand border border-hack-ink/10 text-hack-subtext">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-3.5 mt-3.5 border-t border-hack-ink/10 flex items-center justify-between">
                  {(asset.url.toLowerCase().endsWith('.pdf') || asset.url.toLowerCase().includes('hackflow_uploads') || asset.url.toLowerCase().includes('/uploads/')) ? (
                    <a
                      href={ensureExternalUrl(asset.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs font-semibold text-hack-coral-dark hover:underline flex items-center gap-1.5 group"
                    >
                      <FileText className="w-3.5 h-3.5" /> View PDF <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                  ) : (
                    <a
                      href={ensureExternalUrl(asset.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs font-semibold text-hack-coral-dark hover:underline flex items-center gap-1.5 group"
                    >
                      Open Link <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </a>
                  )}
                  <button
                    onClick={() => handleCopy(`asset-${asset.id}`, asset.url, asset.title)}
                    className="font-mono text-[11px] font-medium px-2 py-1 rounded-md border border-hack-ink/20 bg-white hover:bg-hack-sand text-hack-ink shadow-sm flex items-center gap-1"
                  >
                    {copiedKey === `asset-${asset.id}` ? <Check className="w-3 h-3 text-hack-mint-dark stroke-[3]" /> : <Copy className="w-3 h-3" />}
                    Copy Link
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        <AddAssetModal
          isOpen={isAssetModalOpen}
          setIsOpen={setIsAssetModalOpen}
          form={assetForm}
          setForm={setAssetForm}
          onSave={handleSaveAsset}
          saving={savingAsset}
        />
      </div>
    )
  }

  // activeTab === 'boilerplates'
  return (
    <div className="space-y-4">
      <div className="p-4 border-2 border-hack-ink bg-hack-sand shadow-hack-card flex items-center justify-between">
        <span className="font-mono text-xs text-hack-ink font-bold">
          Direct links to pre-configured starter repos (Next.js, FastAPI, ML inference wrappers) to skip early setup.
        </span>
        <Button
          size="sm"
          onClick={() => handleOpenAddAsset('boilerplate')}
          className="font-mono text-xs font-bold border-2 border-hack-ink bg-hack-gold text-hack-ink shadow-hack-chip hover:bg-hack-gold/90"
        >
          + Add Boilerplate Repo
        </Button>
      </div>

      {boilerplateAssets.length === 0 ? (
        <div className="p-12 border-2 border-dashed border-hack-ink text-center bg-hack-surface">
          <Code className="h-10 w-10 text-hack-subtext mx-auto opacity-40 mb-3" />
          <h3 className="font-sans text-xl font-bold text-hack-ink">No Boilerplates Linked</h3>
          <p className="font-mono text-xs text-hack-subtext mt-1.5 max-w-md mx-auto">
            Add GitHub template repos for your squad so you never waste the first two hours setting up configurations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {boilerplateAssets.map((asset) => (
            <div 
              key={asset.id}
              className="rounded-xl border border-hack-ink/15 bg-hack-surface shadow-sm p-4 sm:p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border border-hack-gold/50 bg-hack-gold/15 text-hack-gold-dark">
                    Starter Repo
                  </span>
                  {asset.created_by === currentUserId && (
                    <button
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="text-hack-subtext hover:text-hack-coral-dark p-1 rounded transition-colors"
                      title="Delete boilerplate"
                      aria-label={`Delete boilerplate: ${asset.title}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <h3 className="font-sans text-base font-bold text-hack-ink truncate">{asset.title}</h3>
                {asset.description && (
                  <p className="font-mono text-xs text-hack-subtext mt-1 line-clamp-2">{asset.description}</p>
                )}
                {asset.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {asset.tags.map((t, idx) => (
                      <span key={idx} className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-hack-sand border border-hack-ink/10 text-hack-subtext">
                        #{t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3.5 mt-3.5 border-t border-hack-ink/10 flex items-center justify-between">
                <a
                  href={ensureExternalUrl(asset.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs font-semibold text-hack-coral-dark hover:underline flex items-center gap-1.5 group"
                >
                  <GithubIcon className="w-3.5 h-3.5" /> Open GitHub <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </a>
                <button
                  onClick={() => handleCopy(`repo-${asset.id}`, asset.url, asset.title)}
                  className="font-mono text-[11px] font-medium px-2 py-1 rounded-md border border-hack-ink/20 bg-white hover:bg-hack-sand text-hack-ink shadow-sm flex items-center gap-1"
                >
                  {copiedKey === `repo-${asset.id}` ? <Check className="w-3 h-3 text-hack-mint-dark stroke-[3]" /> : <Copy className="w-3 h-3" />}
                  Copy Git URL
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <AddAssetModal
        isOpen={isAssetModalOpen}
        setIsOpen={setIsAssetModalOpen}
        form={assetForm}
        setForm={setAssetForm}
        onSave={handleSaveAsset}
        saving={savingAsset}
      />
    </div>
  )
}

interface AddAssetModalProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
  form: {
    title: string
    asset_type: 'pitch_deck' | 'figma_kit' | 'boilerplate' | 'diagram' | 'other'
    url: string
    description: string
    tags: string
  }
  setForm: React.Dispatch<React.SetStateAction<{
    title: string
    asset_type: 'pitch_deck' | 'figma_kit' | 'boilerplate' | 'diagram' | 'other'
    url: string
    description: string
    tags: string
  }>>
  onSave: (e: React.FormEvent) => void
  saving: boolean
}

function AddAssetModal({
  isOpen,
  setIsOpen,
  form,
  setForm,
  onSave,
  saving,
}: AddAssetModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[540px] rounded-2xl border border-hack-ink/20 bg-hack-sand shadow-2xl p-5 sm:p-6">
        <DialogHeader>
          <DialogTitle className="font-sans text-xl sm:text-2xl font-bold text-hack-ink">
            Add Reusable Squad Asset
          </DialogTitle>
          <DialogDescription className="font-mono text-xs text-hack-subtext mt-1">
            Master presentation deck, Figma design system, or boilerplate repo link.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSave} className="space-y-3.5 py-2">
          <div className="space-y-1">
            <label className="font-mono text-xs font-semibold uppercase text-hack-ink block">Asset Title *</label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Master Pitch Deck (Dark Mode)"
              className="font-mono text-xs rounded-lg border border-hack-ink/20 bg-white focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="font-mono text-xs font-semibold uppercase text-hack-ink block">Asset Type</label>
            <select
              value={form.asset_type}
              onChange={(e) => setForm({ ...form, asset_type: e.target.value as any })}
              className="w-full h-10 px-3 rounded-lg border border-hack-ink/20 bg-white font-mono text-xs focus:outline-none focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
            >
              <option value="pitch_deck">Pitch Deck Template (PDF / Presentation)</option>
              <option value="figma_kit">Figma UI Kit</option>
              <option value="boilerplate">Starter Boilerplate Repo</option>
              <option value="diagram">Architecture Diagram</option>
              <option value="other">Other Resource</option>
            </select>
          </div>

          <PdfUpload
            value={form.url}
            onChange={(url, meta) => {
              setForm((prev) => ({
                ...prev,
                url,
                title: !prev.title.trim() && meta?.fileName
                  ? meta.fileName.replace(/\.[^/.]+$/, '').replace(/[-_]+/g, ' ')
                  : prev.title,
              }))
            }}
            label="Asset Document (Upload PDF or External Link) *"
            placeholder={form.asset_type === 'figma_kit' ? 'https://figma.com/@...' : 'https://drive.google.com/... or https://...'}
            folder="vault_assets"
          />

          <div className="space-y-1">
            <label className="font-mono text-xs font-semibold uppercase text-hack-ink block">Description</label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Contains team slide, market size graph, and system diagram"
              className="font-mono text-xs rounded-lg border border-hack-ink/20 bg-white focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
            />
          </div>

          <div className="space-y-1">
            <label className="font-mono text-xs font-semibold uppercase text-hack-ink block">Tags (comma separated)</label>
            <Input
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="pitch, figma, nextjs"
              className="font-mono text-xs rounded-lg border border-hack-ink/20 bg-white focus:border-hack-coral focus:ring-1 focus:ring-hack-coral"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-hack-ink/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="font-sans text-xs font-semibold rounded-lg border border-hack-ink/20 bg-white hover:bg-hack-sand"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="font-sans text-xs font-bold rounded-lg bg-hack-coral hover:bg-hack-coral/90 text-hack-ink shadow-hack-hero active:translate-y-0.5 transition-all"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : 'Pin Asset'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
