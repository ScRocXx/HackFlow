import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HackFlowSquares } from '@/components/brand/Logo'
import { ArrowRight, CheckCircle2, Zap, Trophy, Bell, FileText, Layers, ShieldCheck, ExternalLink } from 'lucide-react'

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

      {/* Top Notification Announcement Banner (#8bb2de) */}
      <aside className="relative z-20 border-b-2 border-[#10201d] bg-[#8bb2de] text-[#10201d] py-2 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs sm:text-sm font-mono font-bold tracking-wide">
          <div className="flex items-center gap-2 mx-auto sm:mx-0">
            <span className="w-2.5 h-2.5 bg-[#e53927] border border-[#10201d] inline-block" />
            <Link href="/signup" className="hover:underline flex items-center gap-1.5 text-center sm:text-left">
              <span>HackFlow 2026 is Live! Auto-parse Unstop, Devfolio & Devpost deadlines</span>
              <ArrowRight className="w-3.5 h-3.5 inline-block transition-transform hover:translate-x-1" />
            </Link>
          </div>
          <span className="hidden md:inline-block text-[11px] font-mono uppercase tracking-widest text-[#10201d]/80">
            Never Miss A Round
          </span>
        </div>
      </aside>

      {/* Retro-Brutalist Sticky Header (#3d5f58) */}
      <header className="sticky top-0 z-30 border-b-2 border-[#10201d] bg-[#3d5f58] text-[#f7f7f2] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 sm:h-20 flex items-center justify-between gap-4">
          {/* Brand Wordmark */}
          <Link href="/" className="flex items-center gap-3 select-none group">
            <HackFlowSquares size="w-3.5 h-3.5" />
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-[#f7f7f2]">
                HACK<span className="text-[#e97b77]">FLOW</span>
              </span>
              <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 border border-[#8bb2de] text-[#8bb2de] rounded">
                2026
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 font-mono text-xs font-bold uppercase tracking-wider text-[#f7f7f2]">
            <a href="#hero" className="hover:underline hover:text-[#e97b77] transition-colors">Overview</a>
            <a href="#timeline" className="hover:underline hover:text-[#e97b77] transition-colors">Timeline</a>
            <a href="#manifesto" className="hover:underline hover:text-[#e97b77] transition-colors">Manifesto</a>
            <a href="#capabilities" className="hover:underline hover:text-[#e97b77] transition-colors">Features</a>
            <a href="#faq" className="hover:underline hover:text-[#e97b77] transition-colors">FAQs</a>
          </nav>

          {/* Action CTAs */}
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:inline-flex items-center font-mono text-xs font-bold uppercase tracking-wider text-[#f7f7f2] hover:text-[#e97b77] transition-colors px-2 py-1"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-4 sm:px-5 py-2 sm:py-2.5 font-mono text-xs sm:text-sm font-bold uppercase tracking-tight text-[#10201d] border-2 border-[#10201d] bg-[#e97b77] shadow-[4px_4px_0_#671912] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#671912] transition-all"
            >
              Launch Console
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* ===================== HERO SECTION (#3d5f58) ===================== */}
        <section id="hero" className="relative overflow-hidden border-b-2 border-[#10201d] bg-[#3d5f58] text-[#f7f7f2] py-16 sm:py-24 lg:py-32">
          {/* Decorative Corner Pixel SVGs (From Hacktoberfest) */}
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
            {/* 4 Colored Squares */}
            <div className="flex items-center gap-1 mb-5" aria-hidden="true">
              <span className="w-3.5 h-3.5 bg-[#e53927] inline-block" />
              <span className="w-3.5 h-3.5 bg-[#8bb2de] inline-block" />
              <span className="w-3.5 h-3.5 bg-[#f5b726] inline-block" />
              <span className="w-3.5 h-3.5 bg-[#e97b77] inline-block" />
            </div>

            {/* Eyebrow in Soft Pink */}
            <p className="font-mono text-xs sm:text-sm font-bold uppercase tracking-[0.15em] text-[#f6c4c1] mb-4">
              Autonomous Stage Intelligence · Unstop / Devfolio / Custom · Never Miss A Deadline
            </p>

            {/* Massive Heading in Barlow Semi Condensed */}
            <h1 className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[0.92] text-[#f7f7f2] max-w-4xl mx-auto">
              <span>HackFlow 2026:</span>{' '}
              <em className="block text-[#8bb2de] font-extrabold not-italic mt-2">
                Winning belongs to organized teams.
              </em>
            </h1>

            {/* Hero Deck Description */}
            <p className="mt-7 max-w-2xl mx-auto text-[#f7f7f2] text-base sm:text-lg md:text-xl leading-relaxed font-normal">
              Traditional hackathon teams fail in the quiet gap between registration and submission. Paste any challenge URL to auto-extract sequential rounds, synchronized checklists, and automated dispatch reminders.
            </p>

            {/* Dual CTA Buttons */}
            <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center min-h-[52px] px-8 py-3.5 font-mono text-sm font-bold uppercase tracking-wide text-[#10201d] border-2 border-[#10201d] bg-[#e97b77] shadow-[5px_5px_0_#671912] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#671912] transition-all"
              >
                Extract a Hackathon URL
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center min-h-[52px] px-8 py-3.5 font-mono text-sm font-bold uppercase tracking-wide text-[#f7f7f2] border-2 border-white/80 bg-transparent shadow-[5px_5px_0_#2e4742] hover:bg-[#f7f7f2] hover:text-[#10201d] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#2e4742] transition-all"
              >
                Explore Live Dashboard
              </Link>
            </div>

            {/* Platform Support Chips */}
            <div className="mt-14 flex flex-col items-center gap-3 w-full">
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-[#f6c4c1]">
                Engineered For Every Major Platform
              </span>
              <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
                {[
                  { name: 'Unstop', desc: 'Full round timeline + rulebooks', bg: '#f7f7f2' },
                  { name: 'Devfolio', desc: 'Web3 & Builder Hackathons', bg: '#f7f7f2' },
                  { name: 'Devpost', desc: 'Global Hackathon Funnels', bg: '#f7f7f2' },
                  { name: 'Internshala', desc: 'College Challenges & Contests', bg: '#f7f7f2' },
                ].map((plat) => (
                  <div 
                    key={plat.name}
                    className="flex items-center gap-2 px-3.5 py-2 border-2 border-[#10201d] bg-[#f7f7f2] text-[#10201d] shadow-[4px_4px_0_#2e4742]"
                  >
                    <span className="w-2 h-2 bg-[#e53927] inline-block" />
                    <span className="font-display text-sm font-bold tracking-tight">{plat.name}</span>
                    <span className="text-[11px] font-mono text-[#34433f]/70 hidden md:inline">· {plat.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===================== THE TIMELINE SECTION (#f2f2eb) ===================== */}
        <section id="timeline" className="py-20 sm:py-28 border-b-2 border-[#10201d] bg-[#f2f2eb]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <p className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-[#10201d]">
                  The Evolution of Hackathon Execution
                </p>
                <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[0.94] text-[#10201d] mt-2">
                  From manual chaos to <em className="text-[#e53927] not-italic">automated triumph.</em>
                </h2>
              </div>
              <p className="max-w-md text-[#34433f] text-sm sm:text-base font-normal">
                Traditional hackathons aren't single-day sprints anymore. They are multi-stage funnels where 70% of teams are disqualified for missing intermediate deliverable gates.
              </p>
            </div>

            {/* 3 Neo-Brutalist Timeline Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1 */}
              <article className="border-2 border-[#10201d] bg-[#f7f7f2] p-6 sm:p-8 shadow-[7px_7px_0_#671912] flex flex-col justify-between">
                <div>
                  <span className="font-display text-3xl sm:text-4xl font-extrabold text-[#10201d]">2014–2024</span>
                  <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#10201d] mt-4">
                    The Spreadsheets & Forgotten Pings
                  </h3>
                  <p className="mt-3 text-sm text-[#34433f] leading-relaxed">
                    Bookmarked links in browser folders, WhatsApp groups that fall silent after 2 days, and panicking 3 hours before the deadline realizing Round 1 required an architecture PPT and a 2-minute video.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#10201d]/10 font-mono text-xs font-bold text-[#e53927]">
                  RESULT: 68% SUBMISSION FAILURE
                </div>
              </article>

              {/* Card 2 */}
              <article className="border-2 border-[#10201d] bg-[#f7f7f2] p-6 sm:p-8 shadow-[7px_7px_0_#671912] flex flex-col justify-between">
                <div>
                  <span className="font-display text-3xl sm:text-4xl font-extrabold text-[#10201d]">The Engine</span>
                  <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#10201d] mt-4">
                    Heuristic & Gemini Extraction
                  </h3>
                  <p className="mt-3 text-sm text-[#34433f] leading-relaxed">
                    Paste any competition link. Jina Reader fetches full markdown, and our heuristic regex engine instantly dissects rounds, Indian standard time (IST) offsets, prizes, and embedded PDF rulebook links.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#10201d]/10 font-mono text-xs font-bold text-[#3d5f58]">
                  TIME TO PARSE: UNDER 3 SECONDS
                </div>
              </article>

              {/* Card 3 (Mustard Gold Highlight) */}
              <article className="border-2 border-[#10201d] bg-[#f5b726] p-6 sm:p-8 shadow-[7px_7px_0_#8a5d13] flex flex-col justify-between">
                <div>
                  <span className="font-display text-3xl sm:text-4xl font-extrabold text-[#10201d]">2026</span>
                  <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#10201d] mt-4">
                    Total Multiplayer Execution
                  </h3>
                  <p className="mt-3 text-sm text-[#10201d] leading-relaxed font-medium">
                    Live round countdown timers, Supabase Realtime synchronized deliverable checklists across teammates, and automated urgency alert gates (7d kickoff, 3d midpoint, 24h freeze, 6h critical).
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#10201d]/20 font-mono text-xs font-bold text-[#10201d]">
                  RESULT: 100% ON-TIME SUBMISSION
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ===================== THE MANIFESTO SECTION (#2e4742) ===================== */}
        <section id="manifesto" className="py-20 sm:py-28 border-b-2 border-[#10201d] bg-[#2e4742] text-[#f7f7f2]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
              <div className="lg:col-span-5">
                <p className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-[#8bb2de]">
                  The Manifesto
                </p>
                <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[0.94] text-[#f7f7f2] mt-3">
                  Why we’re <em className="text-[#f5b726] not-italic">building HackFlow.</em>
                </h2>
              </div>
              <div className="lg:col-span-7 space-y-6 text-base sm:text-lg leading-relaxed text-[#f7f7f2]/90">
                <p>
                  <strong className="text-white font-bold">Hackathons are the purest forge of modern software creation.</strong> In 36 hours, strangers assemble to prototype the future, fine-tune models, and deploy ambitious systems. But hackathon teams rarely lose because of bad code. They lose because of disorganization.
                </p>
                <p>
                  <strong className="text-white font-bold">The Multi-Stage Illusion:</strong> Competitions on Unstop, HackerEarth, and Devpost are not single-deadline events. They are multi-stage funnels—Round 1: Online Quiz &rarr; Round 2: Solution Architecture Deck &rarr; Round 3: Working Prototype &rarr; Round 4: Offline Presentation. Teams tracking only the final demo date get eliminated before writing their first line of business logic.
                </p>
                <p>
                  <strong className="text-white font-bold">Information Friction:</strong> Teammates rarely read 20-page guideline PDFs. By auto-extracting deliverable requirements, evaluation rubrics, presentation constraints, and slide templates directly onto an interactive kanban dashboard, HackFlow turns passive bookmarks into active accountability.
                </p>
                <p className="font-mono text-sm uppercase tracking-wider text-[#8bb2de] pt-2">
                  // Built for hackers, by hackers · Stop losing to logistics.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== CORE CAPABILITIES SECTION (#e4e5da) ===================== */}
        <section id="capabilities" className="py-20 sm:py-28 border-b-2 border-[#10201d] bg-[#e4e5da]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <p className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-[#10201d]">
                  Engineered to Win
                </p>
                <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[0.94] text-[#10201d] mt-2">
                  Everything you need to <em className="text-[#e53927] not-italic">ship and win.</em>
                </h2>
              </div>
              <p className="max-w-md text-[#34433f] text-sm sm:text-base">
                Four battle-tested engines working in unison to ensure your team never drops the ball on deliverables, deadlines, or teammate coordination.
              </p>
            </div>

            {/* 2x2 Brutalist Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Feature 1 */}
              <div className="border-2 border-[#10201d] bg-[#f7f7f2] p-7 sm:p-9 shadow-[7px_7px_0_#671912] flex flex-col justify-between">
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-1 bg-[#10201d] text-[#f7f7f2] rounded-sm inline-block mb-5">
                    Stage Parsing
                  </span>
                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#10201d]">
                    Zero-Friction Ingestion Pipeline
                  </h3>
                  <p className="mt-3 text-sm sm:text-base text-[#34433f] leading-relaxed">
                    Paste any competition URL. If AI credits are exhausted, our deterministic heuristic engine instantly parses complex multi-stage HTML timelines, exact IST dates, prize pools, and team requirements without failure.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 font-mono text-xs text-[#10201d] font-bold">
                  <span className="w-2 h-2 bg-[#8bb2de]" /> Unstop · Devfolio · Devpost · HackerEarth
                </div>
              </div>

              {/* Feature 2 */}
              <div className="border-2 border-[#10201d] bg-[#f7f7f2] p-7 sm:p-9 shadow-[7px_7px_0_#671912] flex flex-col justify-between">
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-1 bg-[#10201d] text-[#f7f7f2] rounded-sm inline-block mb-5">
                    Multiplayer Sync
                  </span>
                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#10201d]">
                    Real-Time Deliverables Engine
                  </h3>
                  <p className="mt-3 text-sm sm:text-base text-[#34433f] leading-relaxed">
                    Curated checklist templates for PPT decks, prototype deployments, GitHub repos, and pitch rehearsals. Every checkbox toggle updates instantly across all connected teammates via Supabase Realtime.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 font-mono text-xs text-[#10201d] font-bold">
                  <span className="w-2 h-2 bg-[#f5b726]" /> Zero Sync Conflicts · Instant Optimistic UI
                </div>
              </div>

              {/* Feature 3 */}
              <div className="border-2 border-[#10201d] bg-[#f7f7f2] p-7 sm:p-9 shadow-[7px_7px_0_#671912] flex flex-col justify-between">
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-1 bg-[#10201d] text-[#f7f7f2] rounded-sm inline-block mb-5">
                    Notification Gates
                  </span>
                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#10201d]">
                    Automated Urgency Dispatches
                  </h3>
                  <p className="mt-3 text-sm sm:text-base text-[#34433f] leading-relaxed">
                    Four precise urgency checkpoints: 7-day kickoff alert, 3-day midpoint check, 24-hour code freeze warning, and 6-hour critical submission reminder. Never wonder if your team is on track.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 font-mono text-xs text-[#10201d] font-bold">
                  <span className="w-2 h-2 bg-[#e97b77]" /> In-App Toasts & Resend Email Alerts
                </div>
              </div>

              {/* Feature 4 */}
              <div className="border-2 border-[#10201d] bg-[#f7f7f2] p-7 sm:p-9 shadow-[7px_7px_0_#671912] flex flex-col justify-between">
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-1 bg-[#10201d] text-[#f7f7f2] rounded-sm inline-block mb-5">
                    Official Assets
                  </span>
                  <h3 className="font-display text-2xl sm:text-3xl font-bold text-[#10201d]">
                    Problem Statement & Rulebook Vault
                  </h3>
                  <p className="mt-3 text-sm sm:text-base text-[#34433f] leading-relaxed">
                    Auto-discovers PDF rulebooks, slide templates, datasets, and problem statement links from hackathon pages. Teammates can also attach their shared Figma, Canva, and GitHub repos.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 font-mono text-xs text-[#10201d] font-bold">
                  <span className="w-2 h-2 bg-[#e53927]" /> 1-Click Document Access for the Entire Team
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== FAQ SECTION (#f2f2eb) ===================== */}
        <section id="faq" className="py-20 sm:py-28 border-b-2 border-[#10201d] bg-[#f2f2eb]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
              <div>
                <p className="font-mono text-xs sm:text-sm font-bold uppercase tracking-wider text-[#10201d]">
                  Common Questions
                </p>
                <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[0.94] text-[#10201d] mt-2">
                  Everything else, <em className="text-[#e53927] not-italic">answered.</em>
                </h2>
              </div>
              <p className="max-w-md text-[#34433f] text-sm sm:text-base">
                Have questions about how HackFlow extracts timelines, manages timezones, or syncs across your team? Here are the answers.
              </p>
            </div>

            {/* Neo-Brutalist Accordion Panel */}
            <div className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[7px_7px_0_#671912] divide-y-2 divide-[#10201d]">
              {[
                {
                  q: 'Which hackathon platforms can HackFlow parse?',
                  a: 'HackFlow currently features built-in extractors for Unstop, Devfolio, Devpost, Internshala, and MLH. For any custom hackathon or private college event, our fallback engine allows you to input custom rounds, deadlines, and deliverables in seconds.',
                },
                {
                  q: 'How does HackFlow handle Indian Time (IST) vs UTC deadlines?',
                  a: 'Platforms like Unstop and HackerEarth host competitions running in IST (UTC+05:30), while Devpost defaults to EST or UTC. HackFlow auto-detects the host platform domain and normalizes all extracted timestamps into unambiguous ISO-8601 strings with explicit timezone offsets so your countdown timers are never off by 5.5 hours.',
                },
                {
                  q: 'What happens if a hackathon has multiple elimination stages?',
                  a: 'Unlike generic project tools that only track the final demo date, HackFlow treats every hackathon as a sequential funnel (e.g. Round 1: Quiz, Round 2: PPT Submission, Round 3: Prototype). The active stage displays an urgent countdown timer, and advancing to the next stage automatically spins up the appropriate deliverable template.',
                },
                {
                  q: 'How does multiplayer synchronization work?',
                  a: 'HackFlow uses Supabase Postgres with Realtime websockets. When any teammate checks off "Upload pitch deck PDF" or appends a Figma link, the change renders instantly on all connected devices without page refreshes.',
                },
                {
                  q: 'Is HackFlow free to use for student hackathon teams?',
                  a: 'Yes, HackFlow is 100% free for individual builders and hackathon teams. Simply sign up with Google or your email to track your first competition.',
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

            {/* Bottom FAQ CTA */}
            <div className="mt-12 flex justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center min-h-[50px] px-8 py-3 font-mono text-sm font-bold uppercase tracking-tight text-[#10201d] border-2 border-[#10201d] bg-[#e97b77] shadow-[5px_5px_0_#671912] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#671912] transition-all"
              >
                Start Executing — Free
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ===================== FOOTER (#2e4742) ===================== */}
      <footer className="border-t-2 border-[#10201d] bg-[#2e4742] text-[#f7f7f2] py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <HackFlowSquares size="w-3.5 h-3.5" />
            <span className="font-display text-2xl font-extrabold uppercase tracking-tight text-[#f7f7f2]">
              HACK<span className="text-[#e97b77]">FLOW</span>
              <span className="text-xs font-mono ml-1.5 px-1.5 py-0.5 border border-[#8bb2de] text-[#8bb2de] rounded">
                2026
              </span>
            </span>
          </div>

          <p className="font-mono text-xs text-[#8bb2de] text-center">
            Designed in the spirit of open-source community building. Dedicated to hackers everywhere.
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

