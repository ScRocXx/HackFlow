import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HackFlowSquares, HackFlowLogo } from '@/components/brand/Logo'
import { 
  ArrowRight, 
  CheckCircle2, 
  Zap, 
  Trophy, 
  Bell, 
  FileText, 
  Layers, 
  ExternalLink,
  Clock,
  Users,
  CheckSquare,
  Sparkles,
  Search,
  Calendar,
  Share2
} from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#f2f2eb] text-[#10201d] font-sans selection:bg-[#e97b77] selection:text-[#10201d]">
      {/* Skip Link for Accessibility */}
      <a 
        href="#main" 
        className="fixed top-3 -left-[999px] focus:left-3 z-[1100] px-4 py-2.5 border-2 border-[#10201d] bg-[#e97b77] text-[#10201d] font-mono font-bold text-xs"
      >
        Skip to content
      </a>

      {/* 1. Announcement Bar */}
      <aside className="relative z-20 border-b-2 border-[#10201d] bg-[#8bb2de] text-[#10201d] py-2 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs sm:text-sm font-mono font-bold tracking-wide">
          <div className="flex items-center gap-2 mx-auto sm:mx-0">
            <span className="w-2.5 h-2.5 bg-[#e53927] border border-[#10201d] inline-block" />
            <Link href="/signup" className="hover:underline flex items-center gap-1.5 text-center sm:text-left">
              <span>HackFlow is live — paste a hackathon link and get your rounds, deadlines & deliverables.</span>
              <ArrowRight className="w-3.5 h-3.5 inline-block transition-transform hover:translate-x-1" />
            </Link>
          </div>
          <span className="hidden md:inline-block text-[11px] font-mono uppercase tracking-widest text-[#10201d]/80">
            Built for college teams
          </span>
        </div>
      </aside>

      {/* 2. Navbar */}
      <header className="sticky top-0 z-30 border-b-2 border-[#10201d] bg-[#3d5f58] text-[#f7f7f2] shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-20 flex items-center justify-between gap-3">
          {/* Brand Wordmark */}
          <Link href="/" className="flex items-center select-none active:scale-95 transition-transform">
            <HackFlowLogo textClassName="text-[#f7f7f2] text-lg sm:text-2xl" size="md" />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 font-mono text-xs font-bold uppercase tracking-wider text-[#f7f7f2]">
            <a href="#how-it-works" className="hover:underline hover:text-[#e97b77] transition-colors">How It Works</a>
            <a href="#workflow" className="hover:underline hover:text-[#e97b77] transition-colors">The Reality</a>
            <a href="#why" className="hover:underline hover:text-[#e97b77] transition-colors">Why This Exists</a>
            <a href="#features" className="hover:underline hover:text-[#e97b77] transition-colors">Features</a>
            <a href="#faq" className="hover:underline hover:text-[#e97b77] transition-colors">FAQs</a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center font-mono text-xs font-bold uppercase tracking-wider text-[#f7f7f2] hover:text-[#e97b77] transition-colors px-2 py-1"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-3.5 sm:px-5 py-2 sm:py-2.5 font-mono text-xs sm:text-sm font-bold uppercase tracking-tight text-[#10201d] border-2 border-[#10201d] bg-[#e97b77] shadow-[3px_3px_0_#671912] sm:shadow-[4px_4px_0_#671912] active:scale-95 hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#671912] transition-all touch-manipulation whitespace-nowrap"
            >
              Open HackFlow
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* ===================== HERO SECTION ===================== */}
        <section id="hero" className="relative overflow-hidden border-b-2 border-[#10201d] bg-[#3d5f58] text-[#f7f7f2] py-12 sm:py-24 lg:py-28">
          {/* Decorative Corner Pixel SVGs */}
          <div aria-hidden="true" className="absolute top-0 left-0 pointer-events-none opacity-40 lg:opacity-75 w-32 sm:w-48 lg:w-64">
            <svg viewBox="0 0 317.71 293.34" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M122.2 195.59H73.32V244.47H122.2V195.59Z" fill="#F7F7F2" />
              <path d="M73.32 244.46H24.44V293.34H73.32V244.46Z" fill="#F7F7F2" />
              <path d="M171.08 146.71H122.2V195.59H171.08V146.71Z" fill="#F7F7F2" />
              <path d="M219.95 97.83H171.07V146.71H219.95V97.83Z" fill="#F7F7F2" />
              <path d="M268.83 48.95H219.95V97.83H268.83V48.95Z" fill="#F7F7F2" />
              <path d="M317.71 0.08H268.83V48.96H317.71V0.08Z" fill="#F7F7F2" />
              <path d="M146.63 48.88H171.07V0H146.63V48.88Z" fill="#E53927" />
              <path d="M146.63 97.9H171.07V49.02H146.63V97.9Z" fill="#E53927" />
              <path d="M97.76 48.88H122.2V0H97.76V48.88Z" fill="#E53927" />
              <path d="M97.76 97.9H122.2V49.02H97.76V97.9Z" fill="#E53927" />
              <path d="M48.88 48.88H73.32V0H48.88V48.88Z" fill="#E53927" />
              <path d="M48.88 97.9H73.32V49.02H48.88V97.9Z" fill="#E53927" />
              <path d="M0 48.88H24.44V0H0V48.88Z" fill="#E53927" />
              <path d="M0 97.9H24.44V49.02H0V97.9Z" fill="#E53927" />
              <path d="M73.32 146.57H97.76V97.69H73.32V146.57Z" fill="#E53927" />
              <path d="M73.32 195.58H97.76V146.7H73.32V195.58Z" fill="#E53927" />
              <path d="M24.45 146.57H48.89V97.69H24.45V146.57Z" fill="#E53927" />
              <path d="M24.45 195.58H48.89V146.7H24.45V195.58Z" fill="#E53927" />
            </svg>
          </div>

          <div aria-hidden="true" className="absolute top-0 right-0 pointer-events-none opacity-40 lg:opacity-75 w-32 sm:w-48 lg:w-64">
            <svg viewBox="0 0 317.94 293.26" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M49.11 244.38H0V293.26H49.11V244.38Z" fill="#F7F7F2" />
              <path d="M97.99 195.51H49.11V244.39H97.99V195.51Z" fill="#F7F7F2" />
              <path d="M146.87 146.63H97.99V195.51H146.87V146.63Z" fill="#F7F7F2" />
              <path d="M195.75 97.75H146.87V146.63H195.75V97.75Z" fill="#F7F7F2" />
              <path d="M244.62 48.87H195.74V97.75H244.62V48.87Z" fill="#F7F7F2" />
              <path d="M292.86 0H243.98V48.88H292.86V0Z" fill="#F7F7F2" />
              <path d="M171.31 244.38H146.87V293.26H171.31V244.38Z" fill="#E53927" />
              <path d="M171.31 195.37H146.87V244.25H171.31V195.37Z" fill="#E53927" />
              <path d="M220.18 244.38H195.74V293.26H220.18V244.38Z" fill="#E53927" />
              <path d="M220.18 195.37H195.74V244.25H220.18V195.37Z" fill="#E53927" />
              <path d="M269.06 244.38H244.62V293.26H269.06V244.38Z" fill="#E53927" />
              <path d="M269.06 195.37H244.62V244.25H269.06V195.37Z" fill="#E53927" />
              <path d="M317.94 244.38H293.5V293.26H317.94V244.38Z" fill="#E53927" />
              <path d="M317.94 195.37H293.5V244.25H317.94V195.37Z" fill="#E53927" />
            </svg>
          </div>

          {/* Hero Content Container */}
          <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center">
            {/* 3. Hero Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1 border-2 border-[#10201d] bg-[#f7f7f2] text-[#10201d] font-mono text-xs font-black uppercase tracking-widest shadow-[3px_3px_0_#10201d] mb-4 sm:mb-6">
              <span className="w-2 h-2 bg-[#e53927] inline-block" />
              BUILT FOR HACKATHONS
            </div>

            {/* 4. Hero Headline */}
            <h1 className="font-display text-3xl sm:text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.05] sm:leading-[0.93] text-[#f7f7f2] max-w-4xl mx-auto">
              Hackathons aren't hard because of the deadline.{' '}
              <em className="block text-[#8bb2de] font-extrabold not-italic mt-2">
                They're hard because there are five of them.
              </em>
            </h1>

            {/* 5. Hero Description */}
            <p className="mt-5 sm:mt-7 max-w-2xl mx-auto text-[#f7f7f2]/90 text-sm sm:text-lg md:text-xl leading-relaxed font-normal">
              You register, drop the link in the group, everyone says "we'll do it later" — and suddenly it's 2 hours before submission.
            </p>
            <p className="mt-2 max-w-2xl mx-auto text-[#8bb2de] text-sm sm:text-lg font-mono font-bold">
              HackFlow turns the whole hackathon into one shared plan: rounds, deadlines, deliverables, links and who's doing what.
            </p>

            {/* 6. Hero CTAs */}
            <div className="mt-7 sm:mt-9 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 w-full sm:w-auto">
              <Link
                href="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center min-h-[48px] sm:min-h-[52px] px-6 sm:px-8 py-3 sm:py-3.5 font-mono text-xs sm:text-sm font-bold uppercase tracking-wide text-[#10201d] border-2 border-[#10201d] bg-[#e97b77] shadow-[4px_4px_0_#671912] sm:shadow-[5px_5px_0_#671912] active:scale-[0.98] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#671912] transition-all touch-manipulation"
              >
                Paste a hackathon link →
              </Link>
              <a
                href="#how-it-works"
                className="w-full sm:w-auto inline-flex items-center justify-center min-h-[48px] sm:min-h-[52px] px-6 sm:px-8 py-3 sm:py-3.5 font-mono text-xs sm:text-sm font-bold uppercase tracking-wide text-[#f7f7f2] border-2 border-white/80 bg-transparent shadow-[4px_4px_0_#2e4742] sm:shadow-[5px_5px_0_#2e4742] active:scale-[0.98] hover:bg-[#f7f7f2] hover:text-[#10201d] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#2e4742] transition-all touch-manipulation"
              >
                See how it works
              </a>
            </div>

            {/* 7. VISUAL CENTERPIECE: Live Product Demo Flow */}
            <div id="how-it-works" className="mt-14 w-full max-w-4xl text-left">
              {/* Terminal Mockup Wrapper */}
              <div className="border-3 border-[#10201d] bg-[#f7f7f2] text-[#10201d] shadow-[8px_8px_0_#10201d] overflow-hidden">
                {/* Simulated URL Input Header */}
                <div className="bg-[#10201d] text-[#f7f7f2] px-4 py-3 border-b-2 border-[#10201d] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 font-mono text-xs">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="flex gap-1.5 shrink-0">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#e53927] inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#f5b726] inline-block" />
                      <span className="w-2.5 h-2.5 rounded-full bg-[#8bb2de] inline-block" />
                    </div>
                    <span className="text-[#8bb2de] truncate font-bold">
                      https://unstop.com/hackathons/wcc-launchpad-30-wecodecoders-1751873
                    </span>
                  </div>
                  <span className="px-2 py-0.5 border border-[#8bb2de] bg-[#8bb2de]/20 text-[#8bb2de] text-[10px] font-bold uppercase tracking-wider shrink-0">
                    EXTRACTED TIMELINE & DELIVERABLES
                  </span>
                </div>

                {/* Simulated Event Board Inside */}
                <div className="p-4 sm:p-6 space-y-5 bg-[#f7f7f2]">
                  {/* Event Title Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b-2 border-[#10201d]/20">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="px-2 py-0.5 border-2 border-[#10201d] bg-[#ff9800] text-[#10201d] font-mono text-[10px] font-black uppercase shadow-[2px_2px_0_#10201d]">
                          UNSTOP
                        </span>
                        <span className="px-2 py-0.5 border border-[#10201d] bg-white text-[#10201d] font-mono text-[10px] font-bold uppercase">
                          🌐 Online
                        </span>
                        <span className="px-2 py-0.5 border border-[#10201d] bg-[#8bb2de] text-[#10201d] font-mono text-[10px] font-bold">
                          🏆 ₹1,50,000 Cash Pool
                        </span>
                      </div>
                      <h3 className="font-display text-2xl sm:text-3xl font-black text-[#10201d]">
                        WCC Launchpad 3.0
                      </h3>
                      <p className="font-mono text-xs text-[#34433f]">WeCodeCoders · College Innovation Cup</p>
                    </div>

                    <div className="flex items-center gap-1.5 font-mono text-xs font-bold self-start sm:self-center">
                      <Users className="w-3.5 h-3.5 text-[#e53927]" />
                      <span>Active Squad Workspace</span>
                    </div>
                  </div>

                  {/* Visual Step 1: Rounds Extracted */}
                  <div>
                    <div className="font-mono text-[11px] font-black uppercase tracking-wider text-[#34433f] mb-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-[#e53927]" />
                      ROUNDS EXTRACTED AUTOMATICALLY:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-xs">
                      <div className="p-2.5 border-2 border-[#10201d] bg-[#e4e5da] text-[#34433f] opacity-80">
                        <div className="text-[10px] uppercase font-bold text-green-700">✓ Round 1 (Passed)</div>
                        <div className="font-bold text-[#10201d] truncate">Online Assessment Quiz</div>
                      </div>
                      <div className="p-2.5 border-2 border-[#10201d] bg-[#f5b726] text-[#10201d] shadow-[3px_3px_0_#10201d] font-bold">
                        <div className="text-[10px] uppercase text-[#e53927] font-black">● Round 2 (ACTIVE NOW)</div>
                        <div className="truncate">Solution Architecture & PPT</div>
                      </div>
                      <div className="p-2.5 border-2 border-[#10201d] bg-white text-[#34433f]">
                        <div className="text-[10px] uppercase font-bold text-gray-500">○ Round 3 (Upcoming)</div>
                        <div className="font-bold text-[#10201d] truncate">Prototype Demo & Pitch</div>
                      </div>
                    </div>
                  </div>

                  {/* Visual Step 2: Active Stage Details & Countdown */}
                  <div className="border-2 border-[#10201d] bg-[#f2f2eb] p-4 shadow-[4px_4px_0_#2e4742]">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                      <div>
                        <span className="font-mono text-[10px] font-extrabold uppercase px-2 py-0.5 border border-[#10201d] bg-white text-[#10201d]">
                          ROUND 2 DEADLINE
                        </span>
                        <h4 className="font-display text-lg font-bold text-[#10201d] mt-1">
                          Submission Cutoff: 28 Oct 2026, 23:59 IST
                        </h4>
                      </div>

                      {/* Monospace Countdown Timer */}
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 border-2 border-[#10201d] bg-[#e53927] text-[#f7f7f2] font-mono text-sm font-black shadow-[2px_2px_0_#10201d]">
                        <Clock className="w-4 h-4 animate-pulse" />
                        <span>02d : 14h : 38m : 12s</span>
                      </div>
                    </div>

                    {/* Visual Step 3: Shared Team Checklist */}
                    <div>
                      <div className="font-mono text-[11px] font-black uppercase text-[#10201d] mb-2 flex justify-between items-center">
                        <span>TEAM DELIVERABLES (3/4 DONE)</span>
                        <span className="text-[#34433f] font-normal">Realtime Sync Active</span>
                      </div>
                      <div className="space-y-1.5 font-mono text-xs">
                        <div className="flex items-center justify-between p-2 border border-[#10201d] bg-white">
                          <div className="flex items-center gap-2 line-through text-[#34433f]">
                            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                            <span>System Architecture & High-Level Design diagram</span>
                          </div>
                          <span className="text-[10px] font-bold bg-[#e4e5da] px-1.5 py-0.5 border border-[#10201d]/40">System Architect</span>
                        </div>
                        <div className="flex items-center justify-between p-2 border border-[#10201d] bg-white">
                          <div className="flex items-center gap-2 line-through text-[#34433f]">
                            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                            <span>12-Slide Pitch Deck exported to PDF (&lt;20MB)</span>
                          </div>
                          <span className="text-[10px] font-bold bg-[#e4e5da] px-1.5 py-0.5 border border-[#10201d]/40">Frontend Lead</span>
                        </div>
                        <div className="flex items-center justify-between p-2 border-2 border-[#e53927] bg-[#fff5f5] font-bold">
                          <div className="flex items-center gap-2 text-[#10201d]">
                            <span className="w-4 h-4 border-2 border-[#10201d] bg-white inline-block shrink-0" />
                            <span>Record & edit 2-minute unlisted YouTube demo video</span>
                          </div>
                          <span className="text-[10px] font-bold bg-[#e53927] text-white px-1.5 py-0.5">Assigned to You</span>
                        </div>
                      </div>
                    </div>

                    {/* Shared Links Bar */}
                    <div className="mt-4 pt-3 border-t border-[#10201d]/15 flex flex-wrap gap-2 text-[11px] font-mono font-bold">
                      <span className="px-2 py-1 border border-[#10201d] bg-white flex items-center gap-1">
                        📄 Problem_Statement_v2.pdf
                      </span>
                      <span className="px-2 py-1 border border-[#10201d] bg-white flex items-center gap-1">
                        🎨 Figma_Deck_Draft
                      </span>
                      <span className="px-2 py-1 border border-[#10201d] bg-white flex items-center gap-1">
                        💻 github.com/team/launchpad
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 8. Works with the places you already find hackathons */}
            <div className="mt-14 flex flex-col items-center gap-3 w-full">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[#f6c4c1]">
                Works with the places you already find hackathons
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
                {[
                  { name: 'Unstop', color: 'bg-[#ff9800] text-[#10201d]' },
                  { name: 'Devfolio', color: 'bg-[#3770ff] text-white' },
                  { name: 'Devpost', color: 'bg-[#0086bf] text-white' },
                  { name: 'Internshala', color: 'bg-[#8bb2de] text-[#10201d]' },
                  { name: 'HackerEarth', color: 'bg-[#2c3454] text-[#29c5b6]' },
                  { name: 'MLH', color: 'bg-[#e53927] text-white' },
                ].map((plat) => (
                  <div 
                    key={plat.name}
                    className="flex items-center gap-2 px-3 py-1.5 border-2 border-[#10201d] bg-[#f7f7f2] text-[#10201d] shadow-[3px_3px_0_#10201d]"
                  >
                    <span className={`w-2 h-2 ${plat.color} border border-[#10201d] inline-block`} />
                    <span className="font-display text-sm font-bold tracking-tight">{plat.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===================== 9-15. THE REALITY (WORKFLOW) SECTION ===================== */}
        <section id="workflow" className="py-20 sm:py-28 border-b-2 border-[#10201d] bg-[#f2f2eb]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <p className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-[#10201d]">
                  The usual hackathon workflow
                </p>
                <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[0.94] text-[#10201d] mt-2">
                  We all know <em className="text-[#e53927] not-italic">how this goes.</em>
                </h2>
              </div>
              <p className="max-w-md text-[#34433f] text-sm sm:text-base font-normal">
                Most hackathons aren't one deadline. There are forms, PPTs, videos, quizzes, prototypes, shortlists and finally the demo. Missing one can end the whole thing.
              </p>
            </div>

            {/* 3 Neo-Brutalist Timeline Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <article className="border-2 border-[#10201d] bg-[#f7f7f2] p-6 sm:p-8 shadow-[7px_7px_0_#671912] flex flex-col justify-between">
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider px-2 py-0.5 border border-[#10201d] bg-[#e4e5da] text-[#10201d] inline-block">
                    The Problem
                  </span>
                  <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#10201d] mt-4">
                    The "I'll send it in the group" system
                  </h3>
                  <p className="mt-3 text-sm text-[#34433f] leading-relaxed">
                    The link is somewhere in the WhatsApp group. The rulebook is 20 pages. Nobody remembers which round needs the PPT. Then someone asks, "bro deadline kab hai?"
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#10201d]/10 font-mono text-xs font-bold text-[#e53927]">
                  RESULT: Panicking 3 hours before cutoff
                </div>
              </article>

              {/* Card 2 */}
              <article className="border-2 border-[#10201d] bg-[#f7f7f2] p-6 sm:p-8 shadow-[7px_7px_0_#671912] flex flex-col justify-between">
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider px-2 py-0.5 border border-[#10201d] bg-[#8bb2de] text-[#10201d] inline-block">
                    The Useful Part
                  </span>
                  <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#10201d] mt-4">
                    Paste the link. We handle the boring part.
                  </h3>
                  <p className="mt-3 text-sm text-[#34433f] leading-relaxed">
                    Paste a hackathon link and HackFlow pulls out rounds, deadlines, requirements, prizes and useful documents. If AI extraction isn't available, the fallback parser still gets the important stuff.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#10201d]/10 font-mono text-xs font-bold text-[#3d5f58]">
                  Fast enough that you won't notice
                </div>
              </article>

              {/* Card 3 (Mustard Gold Highlight) */}
              <article className="border-2 border-[#10201d] bg-[#f5b726] p-6 sm:p-8 shadow-[7px_7px_0_#8a5d13] flex flex-col justify-between">
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider px-2 py-0.5 border border-[#10201d] bg-[#10201d] text-[#f7f7f2] inline-block">
                    The Solution
                  </span>
                  <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#10201d] mt-4">
                    Everyone sees the same thing
                  </h3>
                  <p className="mt-3 text-sm text-[#10201d] leading-relaxed font-medium">
                    No more "which version of the PPT are you editing?" or "did anyone submit this?" Checklists, assignments and shared links update for the whole team in real time.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#10201d]/20 font-mono text-xs font-bold text-[#10201d]">
                  One shared source of truth
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ===================== 21-26. WHY THIS EXISTS (HUMAN MANIFESTO) ===================== */}
        <section id="why" className="py-20 sm:py-28 border-b-2 border-[#10201d] bg-[#2e4742] text-[#f7f7f2]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
              <div className="lg:col-span-5">
                <p className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-[#8bb2de]">
                  Why this exists
                </p>
                <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[0.94] text-[#f7f7f2] mt-3">
                  Because we’ve <em className="text-[#f5b726] not-italic">all been there.</em>
                </h2>
              </div>
              <div className="lg:col-span-7 space-y-6 text-base sm:text-lg leading-relaxed text-[#f7f7f2]/90">
                <p>
                  A hackathon can start with four people, one great idea and a ridiculous amount of confidence.
                </p>
                <p>
                  Then the rounds start.
                </p>
                <p>
                  Someone has the PPT. Someone has the GitHub repo. Someone saved the rulebook. Someone knows the deadline. And somehow nobody knows what is actually left to do.
                </p>
                <p className="text-white font-bold text-lg">
                  HackFlow is built to fix that part.
                </p>

                <div className="border-t border-[#f7f7f2]/20 pt-5 space-y-4">
                  <h4 className="font-display text-xl font-bold text-[#8bb2de]">
                    It’s never just one deadline.
                  </h4>
                  <p className="text-sm sm:text-base text-[#f7f7f2]/80 leading-relaxed">
                    Round 1: Quiz &rarr; Round 2: PPT Submission &rarr; Round 3: Working Prototype &rarr; Round 4: Final Pitch. Teams tracking only the final demo date get eliminated before writing their first line of code.
                  </p>
                </div>

                <div className="border-t border-[#f7f7f2]/20 pt-5 space-y-4">
                  <h4 className="font-display text-xl font-bold text-[#f5b726]">
                    Nobody reads the 20-page PDF
                  </h4>
                  <p className="text-sm sm:text-base text-[#f7f7f2]/80 leading-relaxed">
                    So don’t make everyone read it. HackFlow pulls out the important requirements, documents, templates and links and puts them where the whole team can actually see them.
                  </p>
                </div>

                <p className="font-mono text-xs sm:text-sm uppercase tracking-wider text-[#8bb2de] pt-3 font-bold">
                  // Built for people who are tired of finding the deadline 3 hours before it.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== 27-33. WHAT HACKFLOW ACTUALLY DOES ===================== */}
        <section id="features" className="py-20 sm:py-28 border-b-2 border-[#10201d] bg-[#e4e5da]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <p className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-[#10201d]">
                  What HackFlow actually does
                </p>
                <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[0.94] text-[#10201d] mt-2">
                  Everything your team <em className="text-[#e53927] not-italic">keeps forgetting.</em>
                </h2>
              </div>
              <p className="max-w-md text-[#34433f] text-sm sm:text-base">
                Four simple things that make hackathons less chaotic.
              </p>
            </div>

            {/* 2x2 Brutalist Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Feature 1 */}
              <div className="border-2 border-[#10201d] bg-[#f7f7f2] p-7 sm:p-9 shadow-[7px_7px_0_#671912] flex flex-col justify-between">
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-1 bg-[#10201d] text-[#f7f7f2] rounded-sm inline-block mb-5">
                    Step 1
                  </span>
                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#10201d]">
                    1. Give us the link
                  </h3>
                  <p className="mt-3 text-sm sm:text-base text-[#34433f] leading-relaxed">
                    HackFlow reads the hackathon page and pulls out the rounds, dates, requirements, prizes and important links.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 font-mono text-xs text-[#10201d] font-bold">
                  <span className="w-2 h-2 bg-[#8bb2de]" /> Unstop · Devfolio · Devpost · HackerEarth · MLH
                </div>
              </div>

              {/* Feature 2 */}
              <div className="border-2 border-[#10201d] bg-[#f7f7f2] p-7 sm:p-9 shadow-[7px_7px_0_#671912] flex flex-col justify-between">
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-1 bg-[#10201d] text-[#f7f7f2] rounded-sm inline-block mb-5">
                    Step 2
                  </span>
                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#10201d]">
                    2. Get the whole team on the same page
                  </h3>
                  <p className="mt-3 text-sm sm:text-base text-[#34433f] leading-relaxed">
                    Assign work, check things off and add shared links. Everyone sees the changes instantly via real-time sync.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 font-mono text-xs text-[#10201d] font-bold">
                  <span className="w-2 h-2 bg-[#f5b726]" /> Powered by Supabase Realtime
                </div>
              </div>

              {/* Feature 3 */}
              <div className="border-2 border-[#10201d] bg-[#f7f7f2] p-7 sm:p-9 shadow-[7px_7px_0_#671912] flex flex-col justify-between">
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-1 bg-[#10201d] text-[#f7f7f2] rounded-sm inline-block mb-5">
                    Step 3
                  </span>
                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#10201d]">
                    3. Get reminded before it's too late
                  </h3>
                  <p className="mt-3 text-sm sm:text-base text-[#34433f] leading-relaxed">
                    HackFlow watches the important deadlines and nudges the team as they get closer (7 days out, 3 days out, 24 hours freeze, and 6 hours remaining).
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 font-mono text-xs text-[#10201d] font-bold">
                  <span className="w-2 h-2 bg-[#e97b77]" /> In-app pings + email reminders
                </div>
              </div>

              {/* Feature 4 */}
              <div className="border-2 border-[#10201d] bg-[#f7f7f2] p-7 sm:p-9 shadow-[7px_7px_0_#671912] flex flex-col justify-between">
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-1 bg-[#10201d] text-[#f7f7f2] rounded-sm inline-block mb-5">
                    Step 4
                  </span>
                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#10201d]">
                    4. Keep all the important links in one place
                  </h3>
                  <p className="mt-3 text-sm sm:text-base text-[#34433f] leading-relaxed">
                    Rulebooks, problem statements, templates, Figma, Canva, GitHub — everything your team needs, without digging through old messages.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 font-mono text-xs text-[#10201d] font-bold">
                  <span className="w-2 h-2 bg-[#e53927]" /> 1-Click access to team files
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== 34-36. FAQ SECTION ===================== */}
        <section id="faq" className="py-20 sm:py-28 border-b-2 border-[#10201d] bg-[#f2f2eb]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <p className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-[#10201d]">
                  FAQ
                </p>
                <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[0.94] text-[#10201d] mt-2">
                  Okay, but how does it <em className="text-[#e53927] not-italic">actually work?</em>
                </h2>
              </div>
              <p className="max-w-md text-[#34433f] text-sm sm:text-base">
                The boring-but-important details.
              </p>
            </div>

            {/* Neo-Brutalist Accordion Panel */}
            <div className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[7px_7px_0_#671912] divide-y-2 divide-[#10201d]">
              {[
                {
                  q: 'Which hackathon platforms can HackFlow parse?',
                  a: 'HackFlow can parse Unstop, Devfolio, Devpost, Internshala, and MLH out of the box. For independent university competitions or custom hackathon sites, our parser extracts the content, or you can adjust dates and rounds manually with our editor in seconds.',
                },
                {
                  q: 'How does HackFlow handle Indian Time (IST) vs UTC deadlines?',
                  a: 'Platforms like Unstop run on Indian Standard Time (IST, UTC+05:30), while US platforms run on EST or UTC. HackFlow auto-detects the platform and converts dates into explicit ISO-8601 strings with timezone offsets so your countdown timers are never off by 5.5 hours.',
                },
                {
                  q: 'What happens if a hackathon has multiple elimination stages?',
                  a: 'HackFlow treats every hackathon as a step-by-step journey: Round 1 (Quiz) → Round 2 (PPT) → Round 3 (Prototype) → Round 4 (Demo). The dashboard counts down to the active round deadline, and completing a round spins up the task checklist for the next one.',
                },
                {
                  q: 'How does multiplayer synchronization work?',
                  a: 'HackFlow is built on Supabase with Realtime websockets. When someone checks off "Upload pitch deck PDF" or adds the GitHub repo link, it updates on everyone’s screen instantly.',
                },
                {
                  q: 'Is HackFlow free to use for student hackathon teams?',
                  a: 'Yes, 100% free for builders and teams. Sign up with Google or email, invite your squad, and start tracking your hackathons.',
                },
              ].map((item, idx) => (
                <details key={idx} className="group p-6 sm:p-7 cursor-pointer transition-colors hover:bg-[#f2f2eb]/50">
                  <summary className="flex items-center justify-between gap-4 list-none text-left">
                    <h3 className="font-display text-xl sm:text-2xl font-bold text-[#10201d]">
                      {item.q}
                    </h3>
                    <span className="font-mono text-2xl font-bold text-[#10201d] group-open:rotate-45 transition-transform shrink-0">
                      +
                    </span>
                  </summary>
                  <p className="mt-4 text-[#34433f] text-sm sm:text-base leading-relaxed font-normal">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>

            {/* 37. Bottom FAQ CTA */}
            <div className="mt-12 flex justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center min-h-[50px] px-8 py-3 font-mono text-sm font-bold uppercase tracking-tight text-[#10201d] border-2 border-[#10201d] bg-[#e97b77] shadow-[5px_5px_0_#671912] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#671912] transition-all"
              >
                Try it on your next hackathon →
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ===================== 38. FOOTER ===================== */}
      <footer className="border-t-2 border-[#10201d] bg-[#2e4742] text-[#f7f7f2] py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center">
            <HackFlowLogo textClassName="text-[#f7f7f2]" size="md" />
          </div>

          <p className="font-mono text-xs text-[#8bb2de] text-center">
            Built for teams that'd rather build than panic.
          </p>

          <div className="flex items-center gap-5 font-mono text-xs font-bold uppercase tracking-wider text-[#f7f7f2]">
            <Link href="/login" className="hover:text-[#e97b77] transition-colors">Sign In</Link>
            <Link href="/signup" className="hover:text-[#e97b77] transition-colors">Register</Link>
            <a href="https://github.com/ScRocXx/HackFlow" target="_blank" rel="noopener noreferrer" className="hover:text-[#e97b77] transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
