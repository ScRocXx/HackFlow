'use client'

import React, { useState } from 'react'
import { Copy, Check, Terminal, Users, Sparkles, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProfileField {
  label: string
  value: string
}

export function InteractiveVaultDemo() {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [activeFormat, setActiveFormat] = useState<'unstop' | 'devfolio' | 'tsv'>('unstop')
  const [copiedFormat, setCopiedFormat] = useState<string | null>(null)

  const profileFields: ProfileField[] = [
    { label: 'Full Name', value: 'Sawant Chandra' },
    { label: 'College / Institute', value: 'MAIT · Delhi · 3rd Year CSE' },
    { label: 'Email', value: 'sawantchandra2410@gmail.com' },
    { label: 'Phone', value: '+91 98765 43210' },
    { label: 'Roll / ID No', value: '04214802722' },
    { label: 'GitHub', value: 'https://github.com/ScRocXx' },
  ]

  const handleCopyField = (label: string, value: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(value)
    }
    setCopiedField(label)
    setTimeout(() => {
      setCopiedField((prev) => (prev === label ? null : prev))
    }, 1200)
  }

  const unstopOutput = `=== SQUAD REGISTRATION (UNSTOP FORMAT) ===
Team Name: Northern Blades
Team Size: 4 Members

Member 1 (Leader):
Name: Sawant Chandra
Email: sawantchandra2410@gmail.com
Phone: +91 98765 43210
College: Maharaja Agrasen Institute of Technology (MAIT)
Roll No: 04214802722
GitHub: https://github.com/ScRocXx

Member 2 (Teammate):
Name: Vedant
Email: vedant@college.edu
GitHub: https://github.com/vedant

Member 3 (Teammate):
Name: Nishant
Email: nishant@college.edu

Member 4 (Teammate):
Name: Prem Jha
Email: prem@college.edu`

  const devfolioOutput = `=== SQUAD REGISTRATION (DEVFOLIO FORMAT) ===
Team: Northern Blades

[Member 1 - Lead]
Full Name: Sawant Chandra
Email: sawantchandra2410@gmail.com
GitHub: https://github.com/ScRocXx
Mobile: +91 98765 43210

[Member 2 - Teammate]
Full Name: Vedant
GitHub: https://github.com/vedant

[Member 3 - Teammate]
Full Name: Nishant

[Member 4 - Teammate]
Full Name: Prem Jha`

  const tsvOutput = `Name\tEmail\tPhone\tCollege\tRoll No\tGitHub
Sawant Chandra\tsawantchandra2410@gmail.com\t+91 98765 43210\tMAIT\t04214802722\thttps://github.com/ScRocXx
Vedant\tvedant@college.edu\t\tMAIT\t\thttps://github.com/vedant
Nishant\tnishant@college.edu\t\tMAIT\t\t
Prem Jha\tprem@college.edu\t\tMAIT\t\t`

  const getCurrentOutput = () => {
    if (activeFormat === 'unstop') return unstopOutput
    if (activeFormat === 'devfolio') return devfolioOutput
    return tsvOutput
  }

  const handleCopyFormat = (formatKey: 'unstop' | 'devfolio' | 'tsv') => {
    setActiveFormat(formatKey)
    const text = formatKey === 'unstop' ? unstopOutput : formatKey === 'devfolio' ? devfolioOutput : tsvOutput
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text)
    }
    setCopiedFormat(formatKey)
    setTimeout(() => {
      setCopiedFormat((prev) => (prev === formatKey ? null : prev))
    }, 1200)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 2-Column Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Left: Interactive Profile Card */}
        <div className="p-6 rounded-2xl border-2 border-hack-ink bg-white shadow-[4px_4px_0_#10201D] flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-hack-ink/15">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-hack-ink text-hack-sand font-mono text-sm font-bold flex items-center justify-center">
                  S
                </div>
                <div>
                  <h4 className="font-display text-lg font-bold text-hack-ink">Sawant Chandra</h4>
                  <span className="font-mono text-xs text-hack-subtext">MAIT · Delhi · 3rd Year CSE</span>
                </div>
              </div>
              <span className="font-mono text-[10px] font-bold bg-hack-gold/25 text-hack-ink border border-hack-gold/50 px-2.5 py-0.5 rounded-full">
                SQUAD LEAD
              </span>
            </div>

            <p className="font-mono text-[11px] text-hack-subtext my-2.5">
              👇 Click any cell to copy directly into your clipboard:
            </p>

            <div className="space-y-2 font-mono text-xs">
              {profileFields.map((field) => {
                const isCopied = copiedField === field.label
                return (
                  <div
                    key={field.label}
                    onClick={() => handleCopyField(field.label, field.value)}
                    className={cn(
                      "p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer select-none transition-all",
                      isCopied
                        ? "bg-[#E3F5EE] border-hack-forest text-hack-forest shadow-sm"
                        : "border-hack-ink/15 bg-hack-sand/35 hover:bg-hack-sand/70 hover:border-hack-ink/30"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-hack-subtext block">
                        {field.label}
                      </span>
                      <span className="font-mono text-xs font-semibold text-hack-ink truncate block">
                        {field.value}
                      </span>
                    </div>

                    <div
                      className={cn(
                        "p-1.5 rounded-md border shrink-0 transition-colors flex items-center gap-1 text-[10px] font-mono font-bold",
                        isCopied
                          ? "bg-hack-forest text-hack-sand border-hack-forest"
                          : "bg-white text-hack-ink border-hack-ink/20"
                      )}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <Copy className="w-3 h-3 text-hack-subtext" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="font-mono text-[11px] text-hack-subtext pt-2 border-t border-hack-ink/10 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-hack-forest" />
            <span>Saved once in Vault. Reusable across 20+ hackathon registrations.</span>
          </div>
        </div>

        {/* Right: 1-Click Registration Bar & Terminal Preview */}
        <div className="p-6 rounded-2xl border-2 border-hack-ink bg-white shadow-[4px_4px_0_#10201D] flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-hack-ink/15">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-hack-coral block">
                  1-Click Registration Clipboard
                </span>
                <h4 className="font-display text-lg font-bold text-hack-ink mt-0.5">
                  Full Roster Formatter
                </h4>
              </div>
              <span className="font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-hack-sand text-hack-ink border border-hack-ink/20">
                4 Teammates Ready
              </span>
            </div>

            <p className="font-sans text-xs text-hack-subtext my-2 leading-relaxed">
              Stop pinging 4 people for roll numbers and resume links on WhatsApp every Friday night. Click a format below to copy the whole team at once:
            </p>

            {/* Format Buttons */}
            <div className="flex flex-wrap gap-2 pt-1 pb-3">
              <button
                type="button"
                onClick={() => handleCopyFormat('unstop')}
                className={cn(
                  "btn-keycap px-3.5 py-1.5 font-mono text-xs font-bold transition-all flex items-center gap-1.5",
                  activeFormat === 'unstop'
                    ? "bg-hack-coral text-hack-ink"
                    : "bg-hack-sand text-hack-ink hover:bg-white"
                )}
              >
                {copiedFormat === 'unstop' ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Unstop Format</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyFormat('devfolio')}
                className={cn(
                  "btn-keycap px-3.5 py-1.5 font-mono text-xs font-bold transition-all flex items-center gap-1.5",
                  activeFormat === 'devfolio'
                    ? "bg-hack-gold text-hack-ink"
                    : "bg-hack-sand text-hack-ink hover:bg-white"
                )}
              >
                {copiedFormat === 'devfolio' ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Devfolio Format</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyFormat('tsv')}
                className={cn(
                  "btn-keycap px-3 py-1.5 font-mono text-xs font-bold transition-all flex items-center gap-1.5",
                  activeFormat === 'tsv'
                    ? "bg-hack-forest text-hack-sand"
                    : "bg-hack-sand text-hack-ink hover:bg-white"
                )}
              >
                {copiedFormat === 'tsv' ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Sheets / TSV</span>
              </button>
            </div>

            {/* Live Terminal Preview */}
            <div className="rounded-xl border-2 border-hack-ink bg-hack-ink text-hack-sand p-3.5 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[175px] select-all shadow-inner">
              <div className="flex items-center justify-between text-[10px] text-hack-sand/60 pb-1.5 mb-1.5 border-b border-hack-sand/20">
                <span className="flex items-center gap-1">
                  <Terminal className="w-3 h-3 text-hack-gold" />
                  <span>Preview ({activeFormat.toUpperCase()})</span>
                </span>
                <span className="text-hack-mint font-bold">
                  {copiedFormat === activeFormat ? '✓ Copied to clipboard!' : 'Ready to paste'}
                </span>
              </div>
              <pre className="whitespace-pre-wrap font-mono text-[10px] text-hack-sand/90">
                {getCurrentOutput()}
              </pre>
            </div>
          </div>

          <div className="font-mono text-[11px] text-hack-subtext pt-2 border-t border-hack-ink/10">
            Paste straight into Google Sheets, Unstop forms, or Devfolio team invite fields in 1 second.
          </div>
        </div>
      </div>
    </div>
  )
}
