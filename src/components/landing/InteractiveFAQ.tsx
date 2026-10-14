'use client'

import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FAQItem {
  question: string
  answer: string
}

const FAQS: FAQItem[] = [
  {
    question: 'Which hackathon platforms can HackFlow parse?',
    answer: 'HackFlow parses Unstop, Devfolio, Devpost, HackerEarth, and MLH right out of the box. For university hackathons, IEEE techfests, or custom websites, you can drop any public URL—or literally paste the messy raw text forward from your college WhatsApp group. Our engine extracts the rounds, dates, and rulebooks in seconds.',
  },
  {
    question: 'How does HackFlow handle Indian Standard Time (IST) vs UTC deadlines?',
    answer: 'Unstop runs on Indian Standard Time (IST, UTC+05:30), while US platforms like Devpost and MLH often run on EST or UTC. HackFlow automatically locks onto the portal\'s actual timezone and converts every deadline to your local clock, so your squad is never caught off guard by 5.5 hours.',
  },
  {
    question: 'What happens if a hackathon has multiple elimination stages?',
    answer: 'HackFlow was purpose-built for multi-stage tournaments: Round 1 (Quiz / Screening) → Round 2 (Solution Architecture & PPT) → Round 3 (Prototype Video) → Round 4 (Grand Finale). The workspace tracks your active stage cutoff, locks in the current deliverables, and unlocks the next round as soon as results drop.',
  },
  {
    question: 'How does shared team workspace synchronization work?',
    answer: 'HackFlow is powered by Supabase Realtime CDC WebSockets. Everything updates live across every teammate\'s screen. When someone claims the pitch deck, checks off a deliverable, or pastes the GitHub repo URL, the whole squad sees the green checkmark instantly without ever hitting refresh.',
  },
  {
    question: 'Is HackFlow really 100% free for student hackathon teams?',
    answer: 'Yes, completely free for student builders and squads. No credit cards, no paywalled limits on team members or active competitions. Sign in with Google, invite your squad with one link, and start building.',
  },
]

export function InteractiveFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const toggleItem = (idx: number) => {
    setOpenIndex((prev) => (prev === idx ? null : idx))
  }

  return (
    <div className="space-y-3.5 max-w-3xl mx-auto">
      {FAQS.map((faq, idx) => {
        const isOpen = openIndex === idx

        return (
          <div
            key={idx}
            className={cn(
              "rounded-2xl border-2 transition-all select-none overflow-hidden",
              isOpen
                ? "bg-white border-hack-ink shadow-[4px_4px_0_#10201D]"
                : "bg-hack-surface border-hack-ink/20 hover:border-hack-ink/40"
            )}
          >
            <button
              type="button"
              onClick={() => toggleItem(idx)}
              className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 transition-colors"
            >
              <h3 className="font-display text-base sm:text-lg font-bold text-hack-ink tracking-tight">
                {faq.question}
              </h3>
              <div
                className={cn(
                  "w-7 h-7 rounded-full border-2 border-hack-ink flex items-center justify-center shrink-0 transition-transform duration-200",
                  isOpen ? "bg-hack-coral text-hack-ink rotate-45" : "bg-hack-sand text-hack-ink"
                )}
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
              </div>
            </button>

            <div
              data-open={isOpen ? "true" : "false"}
              className="faq-grid-transition"
            >
              <div className="overflow-hidden">
                <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-0 border-t border-hack-ink/10 mt-1">
                  <p className="font-sans text-sm text-hack-subtext leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
