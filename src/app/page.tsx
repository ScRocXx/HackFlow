import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HackFlowLogo } from '@/components/brand/Logo'
import { LandingNavbar } from '@/components/landing/LandingNavbar'
import { InteractiveHeroExtractor } from '@/components/landing/InteractiveHeroExtractor'
import { InteractiveWorkspaceMockup } from '@/components/landing/InteractiveWorkspaceMockup'
import { InteractiveWarningSystem } from '@/components/landing/InteractiveWarningSystem'
import { InteractiveVaultDemo } from '@/components/landing/InteractiveVaultDemo'
import { InteractiveFAQ } from '@/components/landing/InteractiveFAQ'
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
  Sparkles,
  Link as LinkIcon,
  Check,
  Zap,
  ShieldCheck
} from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="flex flex-col min-h-screen bg-hack-sand text-hack-ink font-sans selection:bg-hack-coral selection:text-white">
      {/* Accessibility Skip Link */}
      <a 
        href="#main" 
        className="fixed top-3 -left-[999px] focus:left-3 z-[1100] px-4 py-2 rounded-lg bg-hack-coral text-hack-ink font-mono font-bold text-xs shadow-hack-hero"
      >
        Skip to content
      </a>

      {/* 1. Floating Pill Navbar */}
      <LandingNavbar />

      <main id="main" className="flex-1">
        {/* ===================== 1. HERO SECTION ===================== */}
        <section id="hero" className="relative overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-28 bg-hero-grid border-b-2 border-hack-ink/20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center">
            {/* Pill Tag */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border-2 border-hack-ink bg-white text-hack-ink font-mono text-xs font-bold shadow-[2px_2px_0_#10201D] mb-6">
              <span className="w-2 h-2 rounded-full bg-hack-coral animate-ping" />
              <span>⚡ BUILT FOR COLLEGE HACKATHON TEAMS</span>
            </div>

            {/* Headline */}
            <h1 className="font-display text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-hack-ink leading-[1.06] max-w-5xl">
              Your team didn&apos;t forget the hackathon.{' '}
              <span className="block text-hack-coral mt-2">
                You forgot everything around it.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-base sm:text-lg md:text-xl text-hack-subtext max-w-3xl mx-auto leading-relaxed font-sans">
              Five rounds. Three 20-page rulebook PDFs. A 2-minute demo video nobody claimed. Four people in a WhatsApp group asking &ldquo;wait, was the PPT due at 11:59 AM or PM?&rdquo; HackFlow turns one competition link into your squad&apos;s shared war room.
            </p>

            {/* Hero CTA Keycaps */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3.5 w-full sm:w-auto">
              <Link
                href="/signup"
                className="btn-keycap bg-hack-coral hover:bg-hack-coral/90 text-hack-ink px-8 py-3.5 font-mono text-sm font-extrabold inline-flex items-center justify-center gap-2"
              >
                <span>Start Your Team Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#workspace"
                className="btn-keycap bg-white hover:bg-hack-sand text-hack-ink px-6 py-3.5 font-mono text-sm font-bold inline-flex items-center justify-center gap-2"
              >
                <span>Play With Live Demo ↓</span>
              </a>
            </div>

            {/* Live Interactive Hero Extractor Playground */}
            <InteractiveHeroExtractor />
          </div>
        </section>

        {/* ===================== 2. PLAYABLE WORKSPACE WINDOW ===================== */}
        <section id="workspace" className="py-20 sm:py-28 border-b-2 border-hack-ink/20 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-hack-coral block">
                The Playable Console
              </span>
              <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-hack-ink tracking-tight mt-1">
                Drop the link. We sort the chaos.
              </h2>
              <p className="font-mono text-sm text-hack-subtext mt-2">
                One screen answering: What round are we in? What&apos;s due next? Who is on it?
              </p>
            </div>

            {/* The Live Interactive WCC Launchpad Mockup */}
            <InteractiveWorkspaceMockup />
          </div>
        </section>

        {/* ===================== 3. "HOW IT WORKS" 3-STEP PIPELINE ===================== */}
        <section id="how-it-works" className="py-20 sm:py-28 border-b-2 border-hack-ink/20 bg-hack-sand">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-hack-coral block">
                How It Works
              </span>
              <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-hack-ink mt-1">
                Drop the link. Skip the 45-minute setup ritual.
              </h2>
              <p className="font-mono text-sm text-hack-subtext mt-2">
                From announcement flyer to live squad execution in 8 seconds.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {/* Step 1 */}
              <div className="p-7 rounded-2xl border-2 border-hack-ink bg-white shadow-[4px_4px_0_#10201D] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider px-3 py-1 bg-hack-forest text-hack-sand rounded-lg border border-hack-ink">
                      Step 1
                    </span>
                    <span className="font-mono text-[11px] text-hack-subtext font-semibold">01 / 03</span>
                  </div>
                  <h3 className="font-display text-2xl font-bold text-hack-ink">
                    Paste the link or flyer
                  </h3>
                  <p className="mt-3 text-sm text-hack-subtext leading-relaxed font-sans">
                    Drop an Unstop, Devfolio, or Devpost URL—or literally paste the raw unformatted text forwarded from your college WhatsApp group.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-hack-ink/10 font-mono text-xs font-bold text-hack-forest flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Universal Link & Text Ingestion</span>
                </div>
              </div>

              {/* Step 2 */}
              <div className="p-7 rounded-2xl border-2 border-hack-ink bg-white shadow-[4px_4px_0_#10201D] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider px-3 py-1 bg-hack-forest text-hack-sand rounded-lg border border-hack-ink">
                      Step 2
                    </span>
                    <span className="font-mono text-[11px] text-hack-subtext font-semibold">02 / 03</span>
                  </div>
                  <h3 className="font-display text-2xl font-bold text-hack-ink">
                    We pull every round & rule
                  </h3>
                  <p className="mt-3 text-sm text-hack-subtext leading-relaxed font-sans">
                    HackFlow reads the brochure, separates elimination rounds from the grand finale, locks deadlines onto local IST (+05:30), and flags sponsor stack rules.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-hack-ink/10 font-mono text-xs font-bold text-hack-forest flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>You Review & Confirm in 1 Click</span>
                </div>
              </div>

              {/* Step 3 */}
              <div className="p-7 rounded-2xl border-2 border-hack-ink bg-white shadow-[4px_4px_0_#10201D] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider px-3 py-1 bg-hack-coral text-hack-ink rounded-lg border border-hack-ink font-bold">
                      Step 3
                    </span>
                    <span className="font-mono text-[11px] text-hack-subtext font-semibold">03 / 03</span>
                  </div>
                  <h3 className="font-display text-2xl font-bold text-hack-ink">
                    Your whole squad is in sync
                  </h3>
                  <p className="mt-3 text-sm text-hack-subtext leading-relaxed font-sans">
                    Share one join link on WhatsApp. Everyone sees the ticking clock, claims tasks, verifies GitHub links, and copies formatted team registration details.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-hack-ink/10 font-mono text-xs font-bold text-hack-coral-dark flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>One Team. One Plan. Zero Drama.</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== 4. EARLY WARNING SYSTEM ===================== */}
        <section id="warning-system" className="py-20 sm:py-28 border-b-2 border-hack-ink/20 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <InteractiveWarningSystem />
          </div>
        </section>

        {/* ===================== 5. SQUAD VAULT & REGISTRATION ===================== */}
        <section id="vault" className="py-20 sm:py-28 border-b-2 border-hack-ink/20 bg-hack-sand">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-hack-coral block">
                Squad Vault
              </span>
              <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-hack-ink mt-1">
                One copy. Paste into Unstop, Devfolio, or Sheets.
              </h2>
              <p className="font-mono text-sm text-hack-subtext mt-2">
                Stop pinging teammates for phone numbers, college roll numbers, and GitHub links every Friday night.
              </p>
            </div>

            <InteractiveVaultDemo />
          </div>
        </section>

        {/* ===================== 6. SOCIAL & SQUAD LAYER ===================== */}
        <section className="py-20 sm:py-28 border-b-2 border-hack-ink/20 bg-white text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-hack-coral block">
              Cross-Hackathon Squads
            </span>
            <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-hack-ink mt-1">
              Keep teammates around. Build faster next time.
            </h2>
            <p className="mt-4 text-base sm:text-lg text-hack-subtext max-w-2xl mx-auto leading-relaxed font-sans">
              When the hackathon ends, your squad doesn&apos;t disappear. Past pitch decks, boilerplates, API keys, and team credentials remain ready in your shared squad archive for the next challenge.
            </p>

            <div className="mt-8 flex justify-center">
              <Link
                href="/signup"
                className="btn-keycap bg-hack-forest hover:bg-hack-forest/90 text-hack-sand px-7 py-3 font-mono text-xs font-bold inline-flex items-center gap-2"
              >
                <Users className="w-4 h-4 text-hack-gold" />
                <span>Form Your Squad Now →</span>
              </Link>
            </div>
          </div>
        </section>

        {/* ===================== 7. FAQ SECTION ===================== */}
        <section id="faq" className="py-20 sm:py-28 border-b-2 border-hack-ink/20 bg-hack-sand">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-hack-coral block">
                FAQ
              </span>
              <h2 className="font-display text-3xl sm:text-4xl font-extrabold text-hack-ink mt-1">
                Frequently Asked Questions
              </h2>
              <p className="font-mono text-xs text-hack-subtext mt-1">
                Everything you need to know about how HackFlow handles competitions.
              </p>
            </div>

            <InteractiveFAQ />
          </div>
        </section>

        {/* ===================== 8. FINAL WAR ROOM CTA ===================== */}
        <section className="py-20 sm:py-28 bg-hack-ink text-hack-sand text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-hack-coral/20 border border-hack-coral/40 text-hack-coral font-mono text-xs font-bold">
              <Zap className="w-3.5 h-3.5" />
              <span>TIME TO LOCK IN</span>
            </div>

            <h2 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-hack-sand leading-tight">
              Stop planning in WhatsApp.
            </h2>
            <p className="text-base sm:text-lg text-hack-sand/75 max-w-xl mx-auto font-sans leading-relaxed">
              Drop the competition link. Put your whole team on one shared plan. Free forever for students.
            </p>
            <div className="pt-4 flex justify-center">
              <Link
                href="/signup"
                className="btn-keycap bg-hack-coral hover:bg-hack-coral/90 text-hack-ink px-8 py-4 font-mono text-sm font-extrabold inline-flex items-center gap-2"
              >
                <span>Try HackFlow Now &rarr;</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ===================== 9. FOOTER ===================== */}
      <footer className="border-t-2 border-hack-ink/20 bg-hack-forest text-hack-sand py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center">
            <HackFlowLogo textClassName="text-hack-sand" size="md" />
          </div>

          <p className="font-mono text-xs text-hack-sand/70 text-center">
            Built for teams that&apos;d rather build than panic.
          </p>

          <div className="flex items-center gap-5 font-mono text-xs font-semibold text-hack-sand/80">
            <Link href="/login" className="hover:text-hack-sand transition-colors">Sign In</Link>
            <Link href="/signup" className="hover:text-hack-sand transition-colors">Register</Link>
            <a 
              href="https://github.com/ScRocXx/HackFlow" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-hack-sand transition-colors flex items-center gap-1"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
