'use client'

import React, { useState } from 'react'
import { AlertTriangle, CheckCircle2, ShieldCheck, RefreshCw, UserPlus, Check, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export function InteractiveWarningSystem() {
  const [isVideoClaimed, setIsVideoClaimed] = useState<boolean>(false)
  const [isRepoVerified, setIsRepoVerified] = useState<boolean>(false)
  const [isVerifying, setIsVerifying] = useState<boolean>(false)

  const handleVerifyRepo = () => {
    setIsVerifying(true)
    setTimeout(() => {
      setIsVerifying(false)
      setIsRepoVerified((prev) => !prev)
    }, 450)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
      {/* Left: Real Student-Hacker Benefits */}
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-hack-coral/15 border border-hack-coral/30 text-hack-coral-dark font-mono text-xs font-bold mb-4">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>EARLY WARNING SYSTEM</span>
        </div>
        <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-hack-ink leading-tight">
          Don&apos;t find the deadline three hours before it.
        </h2>
        <p className="mt-4 text-base text-hack-subtext leading-relaxed font-sans">
          Most hackathon eliminations aren&apos;t from buggy code. They happen because an unlisted YouTube video was set to Private, a deck exceeded 20MB, or four teammates all assumed someone else submitted the Unstop form.
        </p>

        <div className="mt-6 space-y-4 font-mono text-xs text-hack-ink">
          <div className="flex items-start gap-3 p-2.5 rounded-lg border border-hack-ink/10 bg-hack-sand/40">
            <span className="w-2.5 h-2.5 rounded-full bg-hack-coral mt-1 shrink-0" />
            <div>
              <strong className="text-hack-ink uppercase tracking-wide block">Unclaimed task alert:</strong>
              <span className="text-hack-subtext font-sans text-xs">
                Flags deliverables with zero assigned owners 24 hours before cutoff so nobody says &ldquo;I thought you were recording the video.&rdquo;
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-lg border border-hack-ink/10 bg-hack-sand/40">
            <span className="w-2.5 h-2.5 rounded-full bg-hack-gold-dark mt-1 shrink-0" />
            <div>
              <strong className="text-hack-ink uppercase tracking-wide block">404 Private Repo & Broken Link Detector:</strong>
              <span className="text-hack-subtext font-sans text-xs">
                Pre-flight checks ping your GitHub repo and demo URL to ensure judges don&apos;t get a 404 or a locked Google Drive permissions error.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-lg border border-hack-ink/10 bg-hack-sand/40">
            <span className="w-2.5 h-2.5 rounded-full bg-hack-forest mt-1 shrink-0" />
            <div>
              <strong className="text-hack-ink uppercase tracking-wide block">IST-Locked Calendar Sync:</strong>
              <span className="text-hack-subtext font-sans text-xs">
                1-click Google Calendar & .ics phone alerts calibrated to the portal&apos;s real timezone so you never mess up AM vs PM.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Interactive Warning Toggles */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-mono text-hack-subtext mb-1">
          <span className="font-bold uppercase tracking-wider">Live Diagnostics Feed:</span>
          <span>Click buttons to remediate in 1-click</span>
        </div>

        {/* Warning Card 1: Unclaimed Demo Video */}
        <div
          className={cn(
            "p-5 rounded-2xl border-2 transition-all shadow-[3px_3px_0_#10201D]",
            isVideoClaimed
              ? "bg-[#E3F5EE] border-hack-forest text-hack-forest"
              : "bg-white border-hack-coral text-hack-ink"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {isVideoClaimed ? (
                <CheckCircle2 className="w-5 h-5 text-hack-forest shrink-0 mt-0.5 stroke-[2.5]" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-hack-coral shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-display font-bold text-base text-hack-ink">
                  {isVideoClaimed ? '✓ Demo Video Claimed & Underway' : 'Demo video has no assigned owner'}
                </div>
                <p className="font-mono text-xs text-hack-subtext mt-1 leading-snug">
                  {isVideoClaimed
                    ? 'Sawant claimed the demo video · 2-minute Loom walkthrough in progress.'
                    : 'Round 2 closes in 14h · Video recording & editing takes 2-3 hours no cap.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsVideoClaimed(!isVideoClaimed)}
              className={cn(
                "btn-keycap px-3 py-1.5 font-mono text-xs font-bold uppercase shrink-0 transition-all",
                isVideoClaimed
                  ? "bg-hack-sand text-hack-ink hover:bg-white"
                  : "bg-hack-coral hover:bg-hack-coral/90 text-hack-ink"
              )}
            >
              {isVideoClaimed ? 'Unclaim' : '+ Claim Task'}
            </button>
          </div>
        </div>

        {/* Warning Card 2: Private GitHub Repo */}
        <div
          className={cn(
            "p-5 rounded-2xl border-2 transition-all shadow-[3px_3px_0_#10201D]",
            isRepoVerified
              ? "bg-[#E3F5EE] border-hack-forest text-hack-forest"
              : "bg-white border-hack-gold text-hack-ink"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              {isRepoVerified ? (
                <ShieldCheck className="w-5 h-5 text-hack-forest shrink-0 mt-0.5 stroke-[2.5]" />
              ) : (
                <Clock className="w-5 h-5 text-hack-gold-dark shrink-0 mt-0.5" />
              )}
              <div>
                <div className="font-display font-bold text-base text-hack-ink">
                  {isRepoVerified ? '✓ GitHub Repo Public & Accessible' : 'GitHub repo link flagged: Private (HTTP 404)'}
                </div>
                <p className="font-mono text-xs text-hack-subtext mt-1 leading-snug">
                  {isRepoVerified
                    ? 'HTTP 200 OK · Public visibility confirmed · Judges can view code and commit history.'
                    : 'Unauthenticated curl returned 404 Not Found · Judges will disqualify if repo is private.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isVerifying}
              onClick={handleVerifyRepo}
              className={cn(
                "btn-keycap px-3 py-1.5 font-mono text-xs font-bold uppercase shrink-0 transition-all flex items-center gap-1.5",
                isRepoVerified
                  ? "bg-hack-sand text-hack-ink hover:bg-white"
                  : "bg-hack-gold hover:bg-hack-gold/90 text-hack-ink"
              )}
            >
              <RefreshCw className={cn("w-3 h-3", isVerifying && "animate-spin")} />
              <span>{isVerifying ? 'Checking...' : isRepoVerified ? 'Re-check' : 'Re-verify'}</span>
            </button>
          </div>
        </div>

        {/* Card 3: Pitch Deck PDF Attached */}
        <div className="p-4 rounded-xl border border-hack-ink/20 bg-hack-sand/50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-hack-forest shrink-0 stroke-[2.5]" />
            <span className="font-mono text-xs font-semibold text-hack-ink">
              Pitch Deck PDF attached (14.2 MB &lt; 20 MB limit · Canva Export)
            </span>
          </div>
          <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-hack-forest/15 text-hack-forest border border-hack-forest/30 shrink-0">
            OK
          </span>
        </div>
      </div>
    </div>
  )
}
