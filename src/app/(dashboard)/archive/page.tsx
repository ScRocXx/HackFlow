import { createClient } from '@/lib/supabase/server'
import { getUserEvents } from '@/app/actions/events'
import { Trophy, Award, ExternalLink, ArrowRight, Calendar, Star, FileText } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { ensureExternalUrl } from '@/lib/utils/url'

function GithubIcon({ className = "w-3 h-3" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

export const dynamic = 'force-dynamic'

export default async function ArchivePage() {
  const result = await getUserEvents()
  const events = result.success && result.data ? result.data : []

  // Concluded or archived events
  const concludedEvents = events.filter((e: any) => 
    ['winner', 'runner_up', 'participated', 'archived', 'submitted', 'finalist', 'under_review'].includes(e.status)
  )

  // Group concluded events by year
  const eventsByYear = concludedEvents.reduce((acc: Record<string, any[]>, ev: any) => {
    const year = ev.created_at ? new Date(ev.created_at).getFullYear().toString() : new Date().getFullYear().toString()
    if (!acc[year]) acc[year] = []
    acc[year].push(ev)
    return acc
  }, {})

  const sortedYears = Object.keys(eventsByYear).sort((a, b) => Number(b) - Number(a))

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="border border-hack-muted/30 bg-hack-surface p-6 rounded-xl shadow-hack-card flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-hack-ink">
            Trophy Case & Archive
          </h1>
          <p className="font-mono text-xs text-hack-subtext mt-1">
            Indexed portfolio of concluded hackathons, repos, pitch decks, and retro learnings.
          </p>
        </div>

        <div className="px-3.5 py-1.5 rounded-lg bg-hack-sand border border-hack-muted/30 text-hack-ink font-mono text-xs font-semibold shrink-0">
          🏆 {concludedEvents.length} Concluded Sprints
        </div>
      </div>

      {concludedEvents.length === 0 ? (
        <div className="py-20 border border-dashed border-hack-muted/40 rounded-xl text-center bg-hack-surface shadow-hack-card p-8">
          <Trophy className="h-12 w-12 text-hack-gold mx-auto opacity-50 mb-3" />
          <h3 className="font-display text-2xl font-bold text-hack-ink">Nothing here yet.</h3>
          <p className="font-mono text-sm text-hack-subtext mt-1">
            That&apos;s okay.
          </p>
          <p className="font-mono text-xs text-hack-subtext mt-0.5 max-w-sm mx-auto">
            The next box gets added when you finish a hackathon.
          </p>
          <Link
            href="/dashboard"
            className="inline-block mt-6 font-mono text-xs font-semibold px-5 py-2.5 rounded-lg bg-hack-coral text-white shadow-hack-hero hover:bg-hack-coral/90 transition-colors"
          >
            Back to Active Board &rarr;
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedYears.map((year) => (
            <div key={year} className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="font-display text-2xl font-bold text-hack-ink">{year}</h2>
                <div className="h-px flex-1 bg-hack-muted/30" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {eventsByYear[year].map((ev: any) => {
                  const isWinner = ev.status === 'winner'
                  const isRunnerUp = ev.status === 'runner_up'
                  const isFinalist = ev.status === 'finalist'

                  let statusBadge = (
                    <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full bg-hack-sand text-hack-subtext border border-hack-muted/30">
                      {ev.status === 'under_review' ? '⏳ Under Review' : ev.status}
                    </span>
                  )

                  if (isWinner) {
                    statusBadge = (
                      <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-hack-gold/15 text-hack-gold flex items-center gap-1">
                        🏆 Winner
                      </span>
                    )
                  } else if (isRunnerUp) {
                    statusBadge = (
                      <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-hack-sand text-hack-ink border border-hack-muted/30 flex items-center gap-1">
                        🥈 2nd Place
                      </span>
                    )
                  } else if (isFinalist) {
                    statusBadge = (
                      <span className="font-mono text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-hack-blue/15 text-hack-blue flex items-center gap-1">
                        🎖️ Finalist
                      </span>
                    )
                  }

                  return (
                    <Card
                      key={ev.id}
                      className="border border-hack-muted/30 bg-hack-surface shadow-hack-card rounded-xl flex flex-col justify-between overflow-hidden hover:border-hack-muted/60 transition-all"
                    >
                      <div>
                        <div className="p-4 bg-hack-sand/50 border-b border-hack-muted/20 flex items-center justify-between">
                          <span className="font-mono text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-hack-surface border border-hack-muted/30 text-hack-subtext">
                            {ev.source_platform || 'Hackathon'}
                          </span>
                          {statusBadge}
                        </div>

                        <CardContent className="p-5 space-y-3">
                          <div>
                            <h3 className="font-display text-lg font-bold text-hack-ink line-clamp-1">{ev.title}</h3>
                            <p className="font-mono text-xs text-hack-subtext mt-0.5">{ev.organizer || 'Organized Competition'}</p>
                          </div>

                          {ev.prize_details && (
                            <div className="p-2.5 rounded-lg bg-hack-gold/10 border border-hack-gold/20 font-mono text-xs font-semibold text-hack-gold">
                              Prize: {ev.prize_details}
                            </div>
                          )}

                          {ev.retro_notes && (
                            <p className="font-mono text-[11px] text-hack-subtext italic line-clamp-2 bg-hack-sand/30 p-2.5 rounded-lg border border-hack-muted/20">
                              &ldquo;{ev.retro_notes}&rdquo;
                            </p>
                          )}

                          {/* Links row */}
                          <div className="flex flex-wrap gap-3 pt-2 border-t border-hack-muted/20">
                            {ev.github_repo_url && (
                              <a
                                href={ensureExternalUrl(ev.github_repo_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-[11px] font-semibold text-hack-forest hover:text-hack-coral flex items-center gap-1 transition-colors"
                              >
                                <GithubIcon className="w-3 h-3" /> Repo
                              </a>
                            )}
                            {ev.pitch_deck_url && (
                              <a
                                href={ensureExternalUrl(ev.pitch_deck_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-[11px] font-semibold text-hack-forest hover:text-hack-coral flex items-center gap-1 transition-colors"
                              >
                                <FileText className="w-3 h-3" /> Pitch Deck
                              </a>
                            )}
                            {ev.demo_url && (
                              <a
                                href={ensureExternalUrl(ev.demo_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-[11px] font-semibold text-hack-forest hover:text-hack-coral flex items-center gap-1 transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" /> Live Demo
                              </a>
                            )}
                          </div>
                        </CardContent>
                      </div>

                      <div className="p-4 pt-0">
                        <Link
                          href={`/events/${ev.id}`}
                          className="w-full text-center block font-mono text-xs font-semibold py-2 rounded-lg border border-hack-muted/30 bg-hack-sand/40 hover:bg-hack-forest hover:text-hack-sand text-hack-ink transition-colors shadow-sm"
                        >
                          View Console &rarr;
                        </Link>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
