'use client'

import React, { useState, useEffect } from 'react'
import { 
  Pin, Copy, Check, ExternalLink, Save, Loader2, 
  Video, MessageSquare, Globe, Key, FileText, Sparkles 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { updateSquadScratchpad, getSquadScratchpad } from '@/app/actions/vault'
import type { SquadScratchpad as SquadScratchpadType } from '@/lib/supabase/types'
import { ensureExternalUrl } from '@/lib/utils/url'
import { cn } from '@/lib/utils'

interface SquadScratchpadProps {
  squadId: string
  squadName: string
  initialScratchpad?: SquadScratchpadType | null
  currentUserId?: string
}

export function SquadScratchpad({
  squadId,
  squadName,
  initialScratchpad,
  currentUserId,
}: SquadScratchpadProps) {
  const [scratchpad, setScratchpad] = useState<SquadScratchpadType>(
    initialScratchpad || {
      squad_id: squadId,
      meet_url: '',
      chat_channel_url: '',
      staging_url: '',
      test_credentials: '',
      notes: '',
    }
  )
  const [formData, setFormData] = useState({
    meet_url: initialScratchpad?.meet_url || '',
    chat_channel_url: initialScratchpad?.chat_channel_url || '',
    staging_url: initialScratchpad?.staging_url || '',
    test_credentials: initialScratchpad?.test_credentials || '',
    notes: initialScratchpad?.notes || '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const { toast } = useToast()

  // Load scratchpad if not passed or when squadId changes
  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const res = await getSquadScratchpad(squadId)
        if (res.success && res.data && isMounted) {
          setScratchpad(res.data)
          setFormData({
            meet_url: res.data.meet_url || '',
            chat_channel_url: res.data.chat_channel_url || '',
            staging_url: res.data.staging_url || '',
            test_credentials: res.data.test_credentials || '',
            notes: res.data.notes || '',
          })
        }
      } catch (err) {
        console.warn('Could not load scratchpad:', err)
      }
    }
    load()
    return () => {
      isMounted = false
    }
  }, [squadId])

  const handleCopy = (fieldKey: string, value: string, label: string) => {
    if (!value) return
    navigator.clipboard.writeText(value)
    setCopiedKey(fieldKey)
    toast({
      title: 'Copied to Clipboard!',
      description: `${label} copied.`,
    })
    setTimeout(() => {
      setCopiedKey((prev) => (prev === fieldKey ? null : prev))
    }, 1500)
  }

  const handleCopyEnv = () => {
    const lines = formData.test_credentials.split('\n')
    const envLines: string[] = []

    if (formData.staging_url) {
      envLines.push(`NEXT_PUBLIC_STAGING_URL=${formData.staging_url.trim()}`)
    }

    lines.forEach(l => {
      const trimmed = l.trim()
      if (!trimmed || trimmed.startsWith('#')) return
      if (trimmed.includes('=')) {
        envLines.push(trimmed)
      } else if (trimmed.includes(':')) {
        const [k, ...rest] = trimmed.split(':')
        const val = rest.join(':').trim()
        const envKey = k.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_')
        envLines.push(`${envKey}=${val}`)
      }
    })

    if (envLines.length === 0) {
      toast({
        title: 'No Keyring Entries Found',
        description: 'Add keys in KEY=VALUE format to export as .env.local.',
        variant: 'destructive',
      })
      return
    }

    const envContent = `# Exported from HackFlow Squad Keyring\n${envLines.join('\n')}\n`
    navigator.clipboard.writeText(envContent)
    setCopiedKey('env-export')
    toast({
      title: 'Copied .env.local!',
      description: 'Ready to paste into your local repo .env.local file.',
    })
    setTimeout(() => setCopiedKey((prev) => (prev === 'env-export' ? null : prev)), 1500)
  }

  const handleAppendKeyringTemplate = (templateStr: string) => {
    const current = formData.test_credentials.trim()
    const updated = current ? `${current}\n${templateStr}` : templateStr
    setFormData({ ...formData, test_credentials: updated })
  }

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setIsSaving(true)
    try {
      const res = await updateSquadScratchpad(squadId, {
        meet_url: formData.meet_url,
        chat_channel_url: formData.chat_channel_url,
        staging_url: formData.staging_url,
        test_credentials: formData.test_credentials,
        notes: formData.notes,
      })

      if (!res.success) throw new Error(res.error || 'Failed to save scratchpad')

      setScratchpad(res.data as SquadScratchpadType)
      toast({
        title: 'Scratchpad Updated!',
        description: 'Changes are saved and pinned for all squad members.',
      })
    } catch (err: any) {
      toast({
        title: 'Save Failed',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const lastEditorName = scratchpad.editor_profile?.full_name || 'A teammate'
  const lastUpdateTime = scratchpad.updated_at
    ? new Date(scratchpad.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })
    : null

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="p-4 border-2 border-[#10201d] bg-[#f2f2eb] shadow-[4px_4px_0_#10201d] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 border-2 border-[#10201d] bg-[#f5b726] text-[#10201d] font-mono text-sm font-black flex items-center justify-center shadow-[2px_2px_0_#10201d]">
            📌
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-[#10201d] leading-none">
              {squadName} Sprint Scratchpad & Pinboard
            </h3>
            <p className="font-mono text-[11px] text-[#57726d] mt-1">
              {lastUpdateTime ? `Last updated by ${lastEditorName} on ${lastUpdateTime}` : 'Pin your team call, Discord, staging link, and test accounts.'}
            </p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="font-mono text-xs font-bold border-2 border-[#10201d] bg-[#e97b77] hover:bg-[#f6c4c1] text-[#10201d] shadow-[2px_2px_0_#671912] shrink-0"
        >
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
          <span>{isSaving ? 'Saving...' : 'Save Scratchpad'}</span>
        </Button>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Comms & Staging Environment */}
        <div className="space-y-5">
          {/* 1. Live Meeting & Discord/WhatsApp */}
          <Card className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[5px_5px_0_#671912]">
            <div className="p-3 bg-[#2e4742] text-[#f7f7f2] border-b-2 border-[#10201d] flex items-center gap-2">
              <Video className="w-4 h-4 text-[#f5b726]" />
              <h4 className="font-display text-sm font-bold tracking-wide">
                Squad Comms & Meeting Links
              </h4>
            </div>

            <CardContent className="p-4 space-y-4">
              {/* Google Meet Link */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-xs font-bold uppercase text-[#10201d] flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-[#e53927]" />
                    <span>Live Team Call (Google Meet / Zoom)</span>
                  </label>
                  {formData.meet_url && (
                    <div className="flex items-center gap-1">
                      <a
                        href={ensureExternalUrl(formData.meet_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[11px] font-bold text-[#10201d] hover:text-[#e53927] flex items-center gap-1 underline mr-2"
                      >
                        Join Call <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopy('meet-url', formData.meet_url, 'Meeting Link')}
                        className="p-1 border border-[#10201d] bg-[#f2f2eb] hover:bg-[#f5b726] text-[#10201d]"
                        title="Copy Meet Link"
                      >
                        {copiedKey === 'meet-url' ? <Check className="w-3 h-3 text-emerald-800" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                </div>
                <Input
                  value={formData.meet_url}
                  onChange={(e) => setFormData({ ...formData, meet_url: e.target.value })}
                  placeholder="https://meet.google.com/abc-defg-hij"
                  className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
                />
              </div>

              {/* Chat Channel Link */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-xs font-bold uppercase text-[#10201d] flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#8bb2de]" />
                    <span>External Squad Chat (Discord / WhatsApp / Telegram)</span>
                  </label>
                  {formData.chat_channel_url && (
                    <div className="flex items-center gap-1">
                      <a
                        href={ensureExternalUrl(formData.chat_channel_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[11px] font-bold text-[#10201d] hover:text-[#e53927] flex items-center gap-1 underline mr-2"
                      >
                        Open Group <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopy('chat-url', formData.chat_channel_url, 'Squad Chat Link')}
                        className="p-1 border border-[#10201d] bg-[#f2f2eb] hover:bg-[#8bb2de] text-[#10201d]"
                        title="Copy Chat Link"
                      >
                        {copiedKey === 'chat-url' ? <Check className="w-3 h-3 text-emerald-800" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                </div>
                <Input
                  value={formData.chat_channel_url}
                  onChange={(e) => setFormData({ ...formData, chat_channel_url: e.target.value })}
                  placeholder="https://discord.gg/... or https://chat.whatsapp.com/..."
                  className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
                />
              </div>
            </CardContent>
          </Card>

          {/* 2. Staging / Preview URL & Test Credentials */}
          <Card className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[5px_5px_0_#671912]">
            <div className="p-3 bg-[#2e4742] text-[#f7f7f2] border-b-2 border-[#10201d] flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#f5b726]" />
              <h4 className="font-display text-sm font-bold tracking-wide">
                Staging & Test Environment
              </h4>
            </div>

            <CardContent className="p-4 space-y-4">
              {/* Staging URL */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-xs font-bold uppercase text-[#10201d] flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Preview / Staging URL (Vercel / Cloud)</span>
                  </label>
                  {formData.staging_url && (
                    <div className="flex items-center gap-1">
                      <a
                        href={ensureExternalUrl(formData.staging_url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-[11px] font-bold text-[#10201d] hover:text-[#e53927] flex items-center gap-1 underline mr-2"
                      >
                        Open Staging <ExternalLink className="w-3 h-3" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopy('staging-url', formData.staging_url, 'Staging URL')}
                        className="p-1 border border-[#10201d] bg-[#f2f2eb] hover:bg-[#8bb2de] text-[#10201d]"
                        title="Copy Staging Link"
                      >
                        {copiedKey === 'staging-url' ? <Check className="w-3 h-3 text-emerald-800" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  )}
                </div>
                <Input
                  value={formData.staging_url}
                  onChange={(e) => setFormData({ ...formData, staging_url: e.target.value })}
                  placeholder="https://hackflow-staging.vercel.app"
                  className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
                />
              </div>

              {/* Squad Keyring & Test Credentials */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="font-mono text-xs font-bold uppercase text-[#10201d] flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-[#f5b726]" />
                    <span>Squad Keyring & Shared Credentials</span>
                  </label>
                  
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleCopyEnv}
                      className="h-6 text-[10px] font-mono font-bold bg-[#8bb2de] hover:bg-[#a9c9f0] text-[#10201d] border border-[#10201d] px-2 shadow-[1px_1px_0_#10201d]"
                      title="Copy all variables formatted as .env.local"
                    >
                      {copiedKey === 'env-export' ? <Check className="w-3 h-3 mr-1 text-emerald-800" /> : <Copy className="w-3 h-3 mr-1" />}
                      Copy .env.local
                    </Button>
                    {formData.test_credentials && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleCopy('creds', formData.test_credentials, 'Credentials')}
                        className="h-6 text-[10px] font-mono font-bold bg-[#f5b726] hover:bg-[#ffcf66] text-[#10201d] border border-[#10201d] px-2 shadow-[1px_1px_0_#10201d]"
                      >
                        {copiedKey === 'creds' ? <Check className="w-3 h-3 mr-1 text-emerald-800" /> : <Copy className="w-3 h-3 mr-1" />}
                        Copy Raw
                      </Button>
                    )}
                  </div>
                </div>

                {/* Keyring Quick Insert Chips */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 text-[10px] font-mono">
                  <span className="text-[#34433f] font-bold uppercase shrink-0 text-[9px]">+ Quick Keys:</span>
                  <button
                    type="button"
                    onClick={() => handleAppendKeyringTemplate('GEMINI_API_KEY=AIzaSy...')}
                    className="px-1.5 py-0.5 border border-[#10201d] bg-[#f2f2eb] hover:bg-[#f5b726] font-bold shrink-0 text-[#10201d]"
                  >
                    + Gemini
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAppendKeyringTemplate('GROQ_API_KEY=gsk_...')}
                    className="px-1.5 py-0.5 border border-[#10201d] bg-[#f2f2eb] hover:bg-[#f5b726] font-bold shrink-0 text-[#10201d]"
                  >
                    + Groq
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAppendKeyringTemplate('NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...')}
                    className="px-1.5 py-0.5 border border-[#10201d] bg-[#f2f2eb] hover:bg-[#8bb2de] font-bold shrink-0 text-[#10201d]"
                  >
                    + Supabase
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAppendKeyringTemplate('NGROK_TUNNEL_URL=https://...ngrok-free.app')}
                    className="px-1.5 py-0.5 border border-[#10201d] bg-[#f2f2eb] hover:bg-[#e97b77] font-bold shrink-0 text-[#10201d]"
                  >
                    + Ngrok
                  </button>
                </div>

                <textarea
                  value={formData.test_credentials}
                  onChange={(e) => setFormData({ ...formData, test_credentials: e.target.value })}
                  rows={4}
                  placeholder={`GEMINI_API_KEY=AIzaSy...\nGROQ_API_KEY=gsk_...\nJudge Login: judge@demo.com / pass123`}
                  className="w-full p-2.5 font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d] focus:outline-none resize-none leading-relaxed font-medium"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Shared Sprint Notes & Scratchpad */}
        <div className="space-y-5">
          <Card className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[5px_5px_0_#671912] h-full flex flex-col">
            <div className="p-3 bg-[#2e4742] text-[#f7f7f2] border-b-2 border-[#10201d] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#f5b726]" />
                <h4 className="font-display text-sm font-bold tracking-wide">
                  Shared Sprint Notes & Scratchpad
                </h4>
              </div>
              {formData.notes && (
                <button
                  type="button"
                  onClick={() => handleCopy('scratch-notes', formData.notes, 'Sprint Notes')}
                  className="font-mono text-[10px] font-bold px-2 py-0.5 border border-[#10201d] bg-[#f5b726] hover:bg-[#ffcf66] text-[#10201d] flex items-center gap-1 shadow-[1px_1px_0_#10201d]"
                >
                  {copiedKey === 'scratch-notes' ? <Check className="w-3 h-3 text-emerald-800" /> : <Copy className="w-3 h-3" />}
                  Copy Notes
                </button>
              )}
            </div>

            <CardContent className="p-4 flex-1 flex flex-col space-y-3">
              <p className="font-mono text-[11px] text-[#57726d]">
                Live scratchpad for sprint checklists, API keys, curl commands, pitch outline, and quick copy-paste snippets.
              </p>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={14}
                placeholder={`# Sprint Checklist\n- [ ] Finalize slides\n- [ ] Deploy backend to Railway\n- [ ] Verify test judge accounts\n\n# API Notes\nEndpoint: https://api.myhack.com/v1/inference\nKey: sk_live_...`}
                className="w-full flex-1 min-h-[280px] p-3 font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d] focus:outline-none resize-y leading-relaxed font-medium"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
