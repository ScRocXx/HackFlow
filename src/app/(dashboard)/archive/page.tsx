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
    ['winner', 'runner_up', 'participated', 'archived', 'submitted'].includes(e.status)
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="border-2 border-[#10201d] bg-[#3d5f58] p-6 text-[#f7f7f2] shadow-[7px_7px_0_#671912] flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2.5 h-2.5 bg-[#e53927] inline-block" />
            <span className="w-2.5 h-2.5 bg-[#8bb2de] inline-block" />
            <span className="w-2.5 h-2.5 bg-[#f5b726] inline-block" />
            <span className="w-2.5 h-2.5 bg-[#e97b77] inline-block" />
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#f6c4c1] ml-2">
              Squad Portfolio & Hall of Fame
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-[#f7f7f2]">
            Trophy Case & Archive
          </h1>
          <p className="font-mono text-xs text-[#8bb2de] mt-1">
            Indexed portfolio of concluded hackathons, repos, pitch decks, and retro learnings.
          </p>
        </div>

        <div className="p-3 border-2 border-[#10201d] bg-[#f5b726] text-[#10201d] shadow-[3px_3px_0_#8a5d13] font-mono text-xs font-bold shrink-0">
          🏆 {concludedEvents.length} Concluded Sprints
        </div>
      </div>

      {concludedEvents.length === 0 ? (
        <div className="p-16 border-2 border-dashed border-[#10201d] text-center bg-[#f7f7f2]">
          <Trophy className="h-12 w-12 text-[#34433f] mx-auto opacity-40 mb-3" />
          <h3 className="font-display text-2xl font-bold text-[#10201d]">No Concluded Hackathons Yet</h3>
          <p className="font-mono text-xs text-[#34433f] mt-1 max-w-sm mx-auto">
            Once you submit and mark a hackathon as Completed or Won, it will be showcased here in your squad portfolio.
          </p>
          <Link
            href="/dashboard"
            className="inline-block mt-5 font-mono text-xs font-bold px-4 py-2 border-2 border-[#10201d] bg-[#e97b77] text-[#10201d] shadow-[3px_3px_0_#671912]"
          >
            Back to Dashboard &rarr;
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {concludedEvents.map((ev: any) => {
            const isWinner = ev.status === 'winner'
            const isRunnerUp = ev.status === 'runner_up'

            return (
              <Card key={ev.id} className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[6px_6px_0_#671912] flex flex-col justify-between">
                <div>
                  <div className="p-4 bg-[#2e4742] text-[#f7f7f2] border-b-2 border-[#10201d] flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 border-2 border-[#10201d] bg-[#8bb2de] text-[#10201d]">
                      {ev.source_platform || 'Hackathon'}
                    </span>

                    {isWinner && (
                      <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 border-2 border-[#10201d] bg-[#f5b726] text-[#10201d] shadow-[1px_1px_0_#10201d] flex items-center gap-1">
                        🏆 Winner
                      </span>
                    )}
                    {isRunnerUp && (
                      <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 border-2 border-[#10201d] bg-[#f2f2eb] text-[#10201d] shadow-[1px_1px_0_#10201d]">
                        🥈 Runner-Up
                      </span>
                    )}
                    {!isWinner && !isRunnerUp && (
                      <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 border-2 border-[#10201d] bg-[#e4e5da] text-[#10201d]">
                        {ev.status}
                      </span>
                    )}
                  </div>

                  <CardContent className="p-4 space-y-3">
                    <h3 className="font-display text-xl font-bold text-[#10201d] line-clamp-1">{ev.title}</h3>
                    <p className="font-mono text-xs text-[#34433f]">{ev.organizer || 'Organized Competition'}</p>

                    {ev.prize_details && (
                      <div className="p-2 border border-[#10201d] bg-[#f5b726]/30 font-mono text-xs font-bold text-[#10201d]">
                        Prize: {ev.prize_details}
                      </div>
                    )}

                    {ev.retro_notes && (
                      <p className="font-mono text-[11px] text-[#34433f] italic line-clamp-2">
                        "{ev.retro_notes}"
                      </p>
                    )}

                    {/* Links row */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-[#10201d]/20">
                      {ev.github_repo_url && (
                        <a
                          href={ensureExternalUrl(ev.github_repo_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[11px] font-bold text-[#10201d] hover:text-[#e53927] flex items-center gap-1 underline"
                        >
                          <GithubIcon className="w-3 h-3" /> Repo
                        </a>
                      )}
                      {ev.pitch_deck_url && (
                        <a
                          href={ensureExternalUrl(ev.pitch_deck_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[11px] font-bold text-[#10201d] hover:text-[#e53927] flex items-center gap-1 underline"
                        >
                          <FileText className="w-3 h-3" /> Pitch Deck
                        </a>
                      )}
                      {ev.demo_url && (
                        <a
                          href={ensureExternalUrl(ev.demo_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[11px] font-bold text-[#10201d] hover:text-[#e53927] flex items-center gap-1 underline"
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
                    className="w-full text-center block font-mono text-xs font-bold py-2 border-2 border-[#10201d] bg-[#f2f2eb] hover:bg-[#e97b77] hover:text-white transition-colors shadow-[2px_2px_0_#10201d]"
                  >
                    View Console &rarr;
                  </Link>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
