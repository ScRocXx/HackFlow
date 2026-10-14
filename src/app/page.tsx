import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HackFlowLogo } from '@/components/brand/Logo'
import { 
  ArrowRight, 
  CheckCircle2, 
  Trophy, 
  ExternalLink,
  Clock,
  Users,
  Copy,
  FolderKanban,
  AlertTriangle,
  FileText,
  Calendar,
  Sparkles
} from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="flex flex-col min-h-screen bg-hack-sand text-hack-ink font-sans selection:bg-hack-coral selection:text-white">
      {/* Skip Link for Accessibility */}
      <a 
        href="#main" 
        className="fixed top-3 -left-[999px] focus:left-3 z-[1100] px-4 py-2 rounded-lg bg-hack-coral text-white font-mono font-semibold text-xs shadow-hack-hero"
      >
        Skip to content
      </a>

      {/* 1. Announcement Bar */}
      <aside className="relative z-20 border-b border-hack-muted/20 bg-hack-surface text-hack-ink py-2.5 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs sm:text-sm font-mono font-medium">
          <div className="flex items-center gap-2 mx-auto sm:mx-0">
            <span className="w-2 h-2 rounded-full bg-hack-coral inline-block" />
            <Link href="/signup" className="hover:underline flex items-center gap-1.5 text-center sm:text-left">
              <span>Paste any competition link. We sort the chaos into rounds, deadlines & deliverables.</span>
              <ArrowRight className="w-3.5 h-3.5 inline-block text-hack-coral" />
            </Link>
          </div>
          <span className="hidden md:inline-block text-[11px] font-mono text-hack-subtext uppercase tracking-wider">
            Built for hackathon squads
          </span>
        </div>
      </aside>

      {/* 2. Navbar */}
      <header className="sticky top-0 z-30 border-b border-hack-muted/20 bg-hack-forest text-hack-sand shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center select-none">
            <HackFlowLogo textClassName="text-hack-sand text-xl" size="md" />
          </Link>

          <nav className="hidden md:flex items-center gap-6 font-mono text-xs font-semibold text-hack-sand/80">
            <a href="#how-it-works" className="hover:text-hack-sand transition-colors">How It Works</a>
            <a href="#workspace" className="hover:text-hack-sand transition-colors">Workspace</a>
            <a href="#vault" className="hover:text-hack-sand transition-colors">Team Vault</a>
            <a href="#faq" className="hover:text-hack-sand transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-hack-sand/80 hover:text-hack-sand font-mono text-xs font-semibold px-3 py-1.5 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-4 py-2 font-mono text-xs font-semibold text-white bg-hack-coral rounded-lg shadow-hack-hero hover:bg-hack-coral/90 transition-all"
            >
              Try HackFlow &rarr;
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        {/* ===================== 1. HERO SECTION ===================== */}
        <section id="hero" className="relative overflow-hidden py-16 sm:py-24 lg:py-28 bg-hack-sand">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-hack-muted/30 bg-hack-surface text-hack-subtext font-mono text-xs font-semibold shadow-sm mb-6">
              <span className="w-2 h-2 rounded-full bg-hack-coral" />
              BUILT FOR MULTI-STAGE HACKATHONS
            </div>

            <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-hack-ink leading-[1.08] max-w-4xl">
              Your team didn&apos;t forget the hackathon.{' '}
              <span className="block text-hack-coral mt-2">
                You forgot everything around it.
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-hack-subtext max-w-2xl mx-auto leading-relaxed">
              Rounds. PDFs. PPTs. Demo videos. Registration forms. Four people in a Discord call saying &ldquo;I&apos;ll do it later.&rdquo;
            </p>

            <p className="mt-2 text-base sm:text-lg font-mono font-semibold text-hack-ink">
              HackFlow puts the whole thing in one place.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
              <Link
                href="/signup"
                className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3.5 font-mono text-sm font-semibold text-white bg-hack-coral rounded-lg shadow-hack-hero hover:bg-hack-coral/90 transition-all"
              >
                Try HackFlow Free &rarr;
              </Link>
              <a
                href="#workspace"
                className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 font-mono text-sm font-semibold text-hack-coral hover:underline"
              >
                See a real hackathon &darr;
              </a>
            </div>

            {/* Platform Compatibility Badge */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-hack-subtext">
              <span>Works seamlessly with:</span>
              {['Unstop', 'Devfolio', 'Devpost', 'HackerEarth', 'MLH', 'Custom PDFs'].map((p) => (
                <span key={p} className="px-2.5 py-1 rounded-md bg-hack-surface border border-hack-muted/30 text-hack-ink font-semibold">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ===================== 2. ONE-SENTENCE EXPLANATION & REAL PRODUCT PREVIEW ===================== */}
        <section id="workspace" className="py-16 sm:py-20 border-y border-hack-muted/20 bg-hack-surface">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-hack-coral">
                The Workspace
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-hack-ink mt-2">
                Paste the hackathon link. We sort the chaos.
              </h2>
              <p className="font-mono text-sm text-hack-subtext mt-2">
                One screen answering: What round are we in? What&apos;s due next? Who is on it?
              </p>
            </div>

            {/* Interactive Workspace Window Mockup */}
            <div className="border border-hack-muted/30 bg-hack-surface rounded-2xl shadow-hack-lg overflow-hidden">
              {/* Window Title Bar */}
              <div className="bg-hack-forest text-hack-sand px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-hack-muted/20">
                <div className="flex items-center gap-2.5">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-hack-coral" />
                    <span className="w-2.5 h-2.5 rounded-full bg-hack-gold" />
                    <span className="w-2.5 h-2.5 rounded-full bg-hack-mint" />
                  </div>
                  <span className="font-mono text-xs text-hack-sand/80 truncate">
                    hackflow.app/events/wcc-launchpad-30
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-hack-sand/15 text-hack-sand text-[11px] font-mono font-semibold">
                    UNSTOP · ₹1,50,000 Cash Pool
                  </span>
                </div>
              </div>

              {/* Workspace Inner Body */}
              <div className="p-6 sm:p-8 space-y-6 bg-hack-surface">
                {/* Event Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-hack-muted/20">
                  <div>
                    <h3 className="font-display text-2xl sm:text-3xl font-bold text-hack-ink">
                      WCC Launchpad 3.0
                    </h3>
                    <p className="font-mono text-xs text-hack-subtext mt-1">
                      WeCodeCoders · Active Squad: Northern Blades
                    </p>
                  </div>
                  {/* Urgent Countdown */}
                  <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-hack-coral/10 border border-hack-coral/30 text-hack-coral font-mono text-xs font-bold self-start md:self-auto">
                    <Clock className="w-4 h-4" />
                    <span>Round 2 closes in 14h 28m</span>
                  </div>
                </div>

                {/* Round Rail / Stage Timeline Graphic */}
                <div>
                  <div className="font-mono text-xs font-bold text-hack-subtext uppercase tracking-wider mb-3">
                    Stage Journey
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl border border-hack-muted/30 bg-hack-sand/40">
                      <div className="font-mono text-[11px] font-semibold text-hack-mint flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Round 1 · Completed
                      </div>
                      <div className="font-display font-semibold text-sm text-hack-ink mt-1">
                        Online Assessment Quiz
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border-2 border-hack-coral bg-hack-sand/60 shadow-sm">
                      <div className="font-mono text-[11px] font-bold text-hack-coral flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-hack-coral animate-ping" /> Round 2 · Active Now
                      </div>
                      <div className="font-display font-bold text-sm text-hack-ink mt-1">
                        Solution Architecture & Pitch Deck
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl border border-hack-muted/20 bg-hack-surface text-hack-subtext opacity-70">
                      <div className="font-mono text-[11px] font-semibold">
                        Round 3 · Upcoming
                      </div>
                      <div className="font-display font-medium text-sm text-hack-ink mt-1">
                        Prototype Demo & Grand Finale
                      </div>
                    </div>
                  </div>
                </div>

                {/* Active Round Checklist & Submissions */}
                <div className="p-5 rounded-xl border border-hack-muted/30 bg-hack-sand/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-hack-ink uppercase tracking-wider">
                      Round 2 Deliverables (2 of 3 ready)
                    </span>
                    <span className="font-mono text-xs text-hack-mint font-semibold">
                      66% Complete
                    </span>
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-hack-surface border border-hack-muted/20">
                      <div className="flex items-center gap-2.5 line-through text-hack-subtext">
                        <CheckCircle2 className="w-4 h-4 text-hack-mint" />
                        <span>System Architecture Diagram & Technical Scope</span>
                      </div>
                      <span className="text-[11px] font-semibold text-hack-subtext bg-hack-sand px-2 py-0.5 rounded">
                        Vedant
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-hack-surface border border-hack-muted/20">
                      <div className="flex items-center gap-2.5 line-through text-hack-subtext">
                        <CheckCircle2 className="w-4 h-4 text-hack-mint" />
                        <span>10-Slide Pitch Deck exported to PDF (&lt;20MB)</span>
                      </div>
                      <span className="text-[11px] font-semibold text-hack-subtext bg-hack-sand px-2 py-0.5 rounded">
                        Nishant
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-hack-coral/5 border border-hack-coral/30">
                      <div className="flex items-center gap-2.5 font-bold text-hack-ink">
                        <span className="w-4 h-4 rounded border border-hack-coral bg-hack-surface inline-block" />
                        <span>Record & upload 2-minute unlisted YouTube demo</span>
                      </div>
                      <span className="text-[11px] font-bold text-hack-coral bg-hack-coral/10 px-2 py-0.5 rounded">
                        You
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== 3. "HOW IT WORKS" IN 3 STEPS ===================== */}
        <section id="how-it-works" className="py-20 sm:py-28 border-b border-hack-muted/20 bg-hack-sand">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-hack-coral">
                How It Works
              </span>
              <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-hack-ink mt-2">
                From announcement link to team execution in 8 seconds.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Step 1 */}
              <div className="border border-hack-muted/30 bg-hack-surface p-7 rounded-xl shadow-hack-card flex flex-col justify-between">
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-1 bg-hack-forest text-hack-sand rounded-md inline-block mb-5">
                    Step 1
                  </span>
                  <h3 className="font-display text-2xl font-bold text-hack-ink">
                    Paste the competition link
                  </h3>
                  <p className="mt-3 text-sm text-hack-subtext leading-relaxed">
                    Drop the Unstop, Devfolio, or university link. Or paste the raw text from WhatsApp if the page is behind a login.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-hack-muted/20 font-mono text-xs font-semibold text-hack-forest">
                  ✓ Universal link parser
                </div>
              </div>

              {/* Step 2 */}
              <div className="border border-hack-muted/30 bg-hack-surface p-7 rounded-xl shadow-hack-card flex flex-col justify-between">
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-1 bg-hack-forest text-hack-sand rounded-md inline-block mb-5">
                    Step 2
                  </span>
                  <h3 className="font-display text-2xl font-bold text-hack-ink">
                    We read and structure it
                  </h3>
                  <p className="mt-3 text-sm text-hack-subtext leading-relaxed">
                    HackFlow extracts every round, date, submission format, rulebook link, and judging criteria automatically.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-hack-muted/20 font-mono text-xs font-semibold text-hack-forest">
                  ✓ Human verification checklist
                </div>
              </div>

              {/* Step 3 */}
              <div className="border border-hack-muted/30 bg-hack-surface p-7 rounded-xl shadow-hack-card flex flex-col justify-between">
                <div>
                  <span className="font-mono text-xs font-bold uppercase tracking-wider px-2.5 py-1 bg-hack-coral text-white rounded-md inline-block mb-5">
                    Step 3
                  </span>
                  <h3 className="font-display text-2xl font-bold text-hack-ink">
                    Your team plan is ready
                  </h3>
                  <p className="mt-3 text-sm text-hack-subtext leading-relaxed">
                    Your squad gets a single live dashboard: active countdown, shared deliverables, team credentials, and registration quick-fill cards.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-hack-muted/20 font-mono text-xs font-semibold text-hack-coral">
                  ✓ One team. One plan.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== 4. SUBMISSION CHECK / AT RISK SECTION ===================== */}
        <section className="py-20 sm:py-24 border-b border-hack-muted/20 bg-hack-surface">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-hack-coral">
                  Early Warning System
                </span>
                <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-hack-ink mt-2">
                  Don&apos;t find the deadline three hours before it.
                </h2>
                <p className="mt-4 text-base text-hack-subtext leading-relaxed">
                  Most hackathon failures aren&apos;t technical bugs. They are unassigned demo videos, PDFs that exceed size limits, and teammates who thought someone else was handling the submission form.
                </p>

                <div className="mt-6 space-y-3 font-mono text-xs text-hack-ink">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-hack-coral" />
                    <span>Real-time warning when deliverables have no assigned owner</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-hack-gold" />
                    <span>Pre-submission readiness checklist to catch format errors early</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-hack-forest" />
                    <span>Clear textual countdowns that don&apos;t rely on color alone</span>
                  </div>
                </div>
              </div>

              {/* Warning Mockup Cards */}
              <div className="space-y-3">
                <div className="p-4 rounded-xl border border-hack-coral/30 bg-hack-coral/5 border-l-4 border-l-hack-coral flex items-start gap-3 shadow-sm">
                  <AlertTriangle className="w-5 h-5 text-hack-coral shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-display font-bold text-sm text-hack-ink">
                      Demo video isn&apos;t assigned
                    </div>
                    <p className="font-mono text-xs text-hack-subtext mt-0.5">
                      WCC Launchpad 3.0 · Round 2 closes in 14h · Video editing takes 2-3 hours
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-hack-gold/30 bg-hack-gold/5 border-l-4 border-l-hack-gold flex items-start gap-3 shadow-sm">
                  <Clock className="w-5 h-5 text-hack-gold shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-display font-bold text-sm text-hack-ink">
                      Pitch deck PDF has no link attached
                    </div>
                    <p className="font-mono text-xs text-hack-subtext mt-0.5">
                      Attach Google Slides or Canva export before closing window
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== 5. VAULT / REGISTRATION UTILITY ===================== */}
        <section id="vault" className="py-20 sm:py-28 border-b border-hack-muted/20 bg-hack-sand">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-hack-coral">
                Squad Vault
              </span>
              <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-hack-ink mt-2">
                One copy. Paste into Unstop, Devfolio, or Google Forms.
              </h2>
              <p className="font-mono text-sm text-hack-subtext mt-2">
                Stop pinging teammates for phone numbers, college roll numbers, and GitHub links every Friday night.
              </p>
            </div>

            {/* Profile Card Mockup */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="border border-hack-muted/30 bg-hack-surface p-6 rounded-xl shadow-hack-card space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-hack-muted/20">
                  <div>
                    <h4 className="font-display text-base font-bold text-hack-ink">Sawant Chandra</h4>
                    <span className="font-mono text-[11px] text-hack-subtext">MAIT · Delhi · 3rd Year CSE</span>
                  </div>
                  <span className="font-mono text-[11px] font-bold bg-hack-gold/15 text-hack-gold px-2.5 py-0.5 rounded-full">
                    LEADER
                  </span>
                </div>

                <div className="space-y-2 font-mono text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-hack-sand/40">
                    <span className="text-hack-subtext uppercase">Email</span>
                    <span className="font-semibold text-hack-ink">sawant@college.edu</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-hack-sand/40">
                    <span className="text-hack-subtext uppercase">Phone</span>
                    <span className="font-semibold text-hack-ink">+91 98765 43210</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-hack-sand/40">
                    <span className="text-hack-subtext uppercase">GitHub</span>
                    <span className="font-semibold text-hack-ink">github.com/scrocxx</span>
                  </div>
                </div>
              </div>

              <div className="border border-hack-muted/30 bg-hack-surface p-6 rounded-xl shadow-hack-card flex flex-col justify-between">
                <div>
                  <div className="font-mono text-xs font-bold text-hack-subtext uppercase tracking-wider mb-2">
                    1-Click Registration Bar
                  </div>
                  <h4 className="font-display text-lg font-bold text-hack-ink">
                    Everything formatted for team registration
                  </h4>
                  <p className="font-mono text-xs text-hack-subtext mt-2 leading-relaxed">
                    Copy the whole squad as a table for Excel, or copy individually into portal fields without alt-tabbing across Discord messages.
                  </p>
                </div>

                <div className="pt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-hack-muted/30 bg-hack-sand text-hack-ink font-mono text-xs font-semibold">
                    <Copy className="w-3.5 h-3.5 text-hack-forest" /> Copy for Unstop
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-hack-muted/30 bg-hack-sand text-hack-ink font-mono text-xs font-semibold">
                    <Copy className="w-3.5 h-3.5 text-hack-forest" /> Copy for Devfolio
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== 6. SOCIAL / TEAM LAYER ===================== */}
        <section className="py-20 sm:py-24 border-b border-hack-muted/20 bg-hack-surface">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-hack-coral">
              Cross-Hackathon Squads
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-hack-ink mt-2">
              Keep teammates around. Build faster next time.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-hack-subtext max-w-2xl mx-auto leading-relaxed">
              When the hackathon ends, your squad doesn&apos;t disappear. Past pitch decks, repos, APIs, and team credentials remain ready in your shared squad archive for the next challenge.
            </p>

            <div className="mt-8 flex justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-hack-forest text-hack-sand hover:bg-hack-forest/90 font-mono text-xs font-semibold shadow-sm transition-colors"
              >
                <Users className="w-4 h-4 text-hack-gold" /> Form your squad now &rarr;
              </Link>
            </div>
          </div>
        </section>

        {/* ===================== 7. FAQ SECTION ===================== */}
        <section id="faq" className="py-20 sm:py-28 border-b border-hack-muted/20 bg-hack-sand">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-hack-coral">
                FAQ
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-hack-ink mt-2">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="space-y-3">
              {[
                {
                  q: 'Which hackathon platforms can HackFlow parse?',
                  a: 'HackFlow parses Unstop, Devfolio, Devpost, Internshala, and MLH out of the box. For university competitions or custom sites, our parser extracts the content, and you can adjust rounds and deadlines manually in seconds.',
                },
                {
                  q: 'How does HackFlow handle Indian Standard Time (IST) vs UTC deadlines?',
                  a: 'Platforms like Unstop run on Indian Standard Time (IST, UTC+05:30), while US platforms run on EST or UTC. HackFlow detects the timezone and converts dates into explicit ISO-8601 strings so countdown timers are never off by 5.5 hours.',
                },
                {
                  q: 'What happens if a hackathon has multiple elimination stages?',
                  a: 'HackFlow treats every hackathon as a stage journey: Round 1 (Quiz) → Round 2 (PPT) → Round 3 (Prototype) → Round 4 (Demo). The dashboard tracks the active stage cutoff and updates deliverables as you progress.',
                },
                {
                  q: 'How does shared team workspace synchronization work?',
                  a: 'HackFlow is built on Supabase Realtime websockets. When someone checks off a pitch deck or updates a repo link, it updates on everyone’s screen instantly.',
                },
                {
                  q: 'Is HackFlow free to use for student hackathon teams?',
                  a: 'Yes, 100% free for builders and teams. Sign up with Google or email, invite your squad, and start tracking your competitions.',
                },
              ].map((item, idx) => (
                <details key={idx} className="group p-5 rounded-xl border border-hack-muted/30 bg-hack-surface cursor-pointer shadow-sm">
                  <summary className="flex items-center justify-between gap-4 list-none text-left">
                    <h3 className="font-display text-base sm:text-lg font-bold text-hack-ink">
                      {item.q}
                    </h3>
                    <span className="font-mono text-lg font-bold text-hack-subtext group-open:rotate-45 transition-transform shrink-0">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm text-hack-subtext leading-relaxed font-normal">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ===================== 8. FINAL CTA ===================== */}
        <section className="py-20 sm:py-28 bg-hack-ink text-hack-sand text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <h2 className="font-display text-4xl sm:text-6xl font-bold tracking-tight text-hack-sand">
              Stop planning in WhatsApp.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-hack-sand/70 max-w-xl mx-auto">
              Drop the competition link. Put your whole team on one shared plan.
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-8 py-4 font-mono text-sm font-semibold text-white bg-hack-coral rounded-lg shadow-hack-hero hover:bg-hack-coral/90 transition-all"
              >
                Try HackFlow Now &rarr;
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ===================== 9. FOOTER ===================== */}
      <footer className="border-t border-hack-muted/20 bg-hack-forest text-hack-sand py-12 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center">
            <HackFlowLogo textClassName="text-hack-sand" size="md" />
          </div>

          <p className="font-mono text-xs text-hack-sand/70 text-center">
            Built for teams that&apos;d rather build than panic.
          </p>

          <div className="flex items-center gap-5 font-mono text-xs font-semibold text-hack-sand/80">
            <Link href="/login" className="hover:text-hack-sand transition-colors">Sign In</Link>
            <Link href="/signup" className="hover:text-hack-sand transition-colors">Register</Link>
            <a href="https://github.com/ScRocXx/HackFlow" target="_blank" rel="noopener noreferrer" className="hover:text-hack-sand transition-colors">
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
