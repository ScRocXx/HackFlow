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
  return (
    <div className="space-y-4 py-3">
      {/* Primary Action Card: URL Input */}
      <div className="border-2 border-[#10201d] bg-white p-4 sm:p-5 shadow-[4px_4px_0_#10201d] space-y-3">
        <label className="font-mono text-xs font-black uppercase tracking-wider text-[#10201d] block">
          Paste the competition link. We'll figure out the rest.
        </label>

        <div className="flex flex-col sm:flex-row gap-2">
          <Input 
            placeholder="https://unstop.com/... or https://devfolio.co/..." 
            value={url} 
            onChange={(e) => onUrlChange(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && onParseUrl()}
            disabled={extracting}
            className="flex-1 h-12 font-mono text-xs border-2 border-[#10201d] bg-[#f7f7f2] shadow-[2px_2px_0_#10201d]"
          />
          <Button 
            onClick={onParseUrl} 
            disabled={extracting || !url.trim()} 
            className="h-12 px-6 font-mono text-xs font-black uppercase tracking-wider border-2 border-[#10201d] bg-[#e97b77] hover:bg-[#f6c4c1] text-[#10201d] shadow-[3px_3px_0_#671912] shrink-0 active:translate-x-[1px] active:translate-y-[1px]"
          >
            {extracting ? 'Reading page...' : 'Extract Hackathon'}
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
          <p className="font-mono text-[11px] text-[#34433f]">
            Works with Unstop, Devfolio, Devpost, MLH, Kaggle, or any university contest.
          </p>

          <button
            type="button"
            onClick={onManualEntry}
            className="font-mono text-xs font-bold text-[#10201d] hover:text-[#e53927] underline shrink-0"
          >
            or Add manually →
          </button>
        </div>
      </div>

      {/* Stepped Progress Animation while Extracting */}
      <ExtractionProgress isExtracting={extracting} />

      {/* Extraction Error Callout */}
      {extractError && (
        <div className="p-3.5 border-2 border-[#10201d] bg-[#f6c4c1] text-[#671912] shadow-[3px_3px_0_#671912] text-sm flex gap-2.5 items-start">
          <AlertCircle className="h-5 w-5 text-[#e53927] shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-display font-bold text-base">Extraction Notice</p>
            <p className="font-mono text-xs mt-0.5">{extractError}</p>
          </div>
        </div>
      )}

      {/* Secondary Accordion: Paste Text / Guidelines */}
      <div className="border-2 border-[#10201d] bg-[#f2f2eb]">
        <button
          type="button"
          onClick={onToggleTextInput}
          className="w-full p-3 font-mono text-xs font-bold text-[#10201d] flex items-center justify-between hover:bg-[#e4e5da] transition-colors"
        >
          <span className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-[#34433f]" />
            Need to paste announcement text, guidelines, or flyer instead?
          </span>
          {showTextInput ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showTextInput && (
          <div className="p-4 border-t-2 border-[#10201d] space-y-3 bg-white">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-[#34433f]">
                {pastedText.length > 0 ? `${pastedText.length.toLocaleString()} characters` : 'Direct AI Parsing (Fastest)'}
              </span>
              {pastedText.length > 0 && !extracting && (
                <button
                  type="button"
                  onClick={() => onPastedTextChange('')}
                  className="font-mono text-[10px] font-bold text-[#e53927] hover:underline"
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
              className="w-full p-3 font-mono text-xs border-2 border-[#10201d] bg-[#f7f7f2] focus:outline-none"
            />

            <div className="flex justify-end">
              <Button 
                onClick={onParseText} 
                disabled={extracting || !pastedText.trim()} 
                className="h-10 px-5 font-mono text-xs font-bold border-2 border-[#10201d] bg-[#f5b726] hover:bg-[#ffcf66] text-[#10201d] shadow-[2px_2px_0_#10201d]"
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
