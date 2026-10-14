'use client'

import { FileText, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ExtractionProgress } from '@/components/events/ExtractionProgress'

interface URLParseIntakeProps {
  url: string
  onUrlChange: (val: string) => void
  pastedText: string
  onPastedTextChange: (val: string) => void
  extracting: boolean
  extractError: string | null
  showTextInput: boolean
  onToggleTextInput: () => void
  onParseUrl: () => void
  onParseText: () => void
  onManualEntry: () => void
}

export function URLParseIntake({
  url,
  onUrlChange,
  pastedText,
  onPastedTextChange,
  extracting,
  extractError,
  showTextInput,
  onToggleTextInput,
  onParseUrl,
  onParseText,
  onManualEntry,
}: URLParseIntakeProps) {
  const isUrlValid = Boolean(url.trim() && /^https?:\/\/.+/i.test(url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`))

  return (
    <div className="space-y-4 py-2">
      {/* Primary Action Card: URL Input */}
      <div className="rounded-xl border border-hack-ink/20 bg-hack-panel p-5 shadow-sm space-y-3">
        <label className="font-sans text-sm font-bold text-hack-ink block">
          Paste the competition link. We'll extract the rest.
        </label>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Input 
              placeholder="https://unstop.com/... or https://devfolio.co/..." 
              value={url} 
              onChange={(e) => onUrlChange(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && onParseUrl()}
              disabled={extracting}
              className="h-11 rounded-lg font-mono text-xs border border-hack-ink/25 bg-hack-sand/40 focus:border-hack-coral focus:ring-1 focus:ring-hack-coral pr-8"
            />
            {isUrlValid && !extracting && (
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-hack-mint-dark font-mono text-[10px] font-bold">
                ✓
              </span>
            )}
          </div>
          <Button 
            onClick={onParseUrl} 
            disabled={extracting || !url.trim()} 
            className="h-11 px-5 rounded-lg font-sans text-xs font-bold bg-hack-coral text-hack-ink hover:bg-hack-coral/90 shadow-hack-hero shrink-0 active:translate-y-0.5 transition-all"
          >
            {extracting ? 'Reading page...' : 'Extract Hackathon'}
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
          <p className="font-mono text-[11px] text-hack-subtext">
            Works with Unstop, Devfolio, Devpost, MLH, Kaggle, or university sites.
          </p>

          <button
            type="button"
            onClick={onManualEntry}
            className="font-mono text-xs font-semibold text-hack-coral-dark hover:underline shrink-0"
          >
            or enter details manually →
          </button>
        </div>
      </div>

      {/* Stepped Progress Animation while Extracting */}
      <ExtractionProgress isExtracting={extracting} />

      {/* Extraction Error Callout with Explicit Next Steps */}
      {extractError && (
        <div className="rounded-xl border border-hack-coral/40 bg-hack-coral/10 text-hack-coral-dark p-4 shadow-sm text-sm flex gap-3 items-start">
          <AlertCircle className="h-5 w-5 text-hack-coral-dark shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1.5">
            <p className="font-sans font-bold text-sm text-hack-ink">Could not extract link directly</p>
            <p className="font-mono text-xs text-hack-subtext leading-relaxed">{extractError}</p>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (!showTextInput) onToggleTextInput()
                }}
                className="font-mono text-xs font-bold text-hack-coral-dark hover:underline"
              >
                Paste text below instead ↓
              </button>
              <span className="text-hack-subtext/40">•</span>
              <button
                type="button"
                onClick={onManualEntry}
                className="font-mono text-xs font-bold text-hack-ink hover:underline"
              >
                Add manually →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Accordion: Paste Text / Guidelines */}
      <div className="rounded-xl border border-hack-ink/15 bg-hack-sand/50 overflow-hidden">
        <button
          type="button"
          onClick={onToggleTextInput}
          aria-expanded={showTextInput}
          className="w-full p-3.5 font-mono text-xs font-medium text-hack-ink flex items-center justify-between hover:bg-hack-sand transition-colors"
        >
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-hack-subtext" />
            <span>Have flyer text, Discord announcements, or guidelines copy?</span>
          </span>
          {showTextInput ? <ChevronUp className="w-4 h-4 text-hack-subtext" /> : <ChevronDown className="w-4 h-4 text-hack-subtext" />}
        </button>

        {showTextInput && (
          <div className="p-4 border-t border-hack-ink/10 space-y-3 bg-hack-panel">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] text-hack-subtext">
                {pastedText.length > 0 ? `${pastedText.length.toLocaleString()} characters` : 'Direct AI Parsing (Fastest)'}
              </span>
              {pastedText.length > 0 && !extracting && (
                <button
                  type="button"
                  onClick={() => onPastedTextChange('')}
                  className="font-mono text-[10px] font-semibold text-hack-coral-dark hover:underline"
                >
                  Clear
                </button>
              )}
            </div>

            <textarea 
              value={pastedText}
              onChange={(e) => onPastedTextChange(e.target.value)}
              disabled={extracting}
              placeholder="Paste raw guidelines, announcement text, WhatsApp/Discord messages, or rulebook copy here..."
              rows={6}
              className="w-full p-3 font-mono text-xs rounded-lg border border-hack-ink/20 bg-hack-sand/30 focus:border-hack-coral focus:ring-1 focus:ring-hack-coral focus:outline-none resize-y"
            />

            <div className="flex justify-end">
              <Button 
                onClick={onParseText} 
                disabled={extracting || !pastedText.trim()} 
                className="h-10 px-5 rounded-lg font-sans text-xs font-bold bg-[#F6C344] text-hack-ink hover:bg-[#F6C344]/90 shadow-sm"
              >
                {extracting ? 'Reading text...' : 'Extract from Text'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
