'use client'

import Link from 'next/link'
import { HackFlowLogo } from '@/components/brand/Logo'
import { ArrowRight } from 'lucide-react'

export function LandingNavbar() {
  return (
    <header className="sticky top-4 z-50 mx-auto w-full max-w-5xl px-4 pointer-events-none">
      <div className="pointer-events-auto bg-[#10201D]/95 backdrop-blur-md border-2 border-[#10201D] rounded-full px-4 sm:px-6 py-2.5 shadow-[0_8px_24px_rgba(16,32,29,0.25)] flex items-center justify-between gap-4">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 select-none group">
          <HackFlowLogo textClassName="text-hack-sand text-lg sm:text-xl font-bold" size="sm" />
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 font-mono text-xs font-semibold text-hack-sand/75">
          <a href="#how-it-works" className="hover:text-hack-sand transition-colors">How It Works</a>
          <a href="#workspace" className="hover:text-hack-sand transition-colors">Live Demo</a>
          <a href="#warning-system" className="hover:text-hack-sand transition-colors">Safety Net</a>
          <a href="#vault" className="hover:text-hack-sand transition-colors">Team Vault</a>
          <a href="#faq" className="hover:text-hack-sand transition-colors">FAQ</a>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            href="/login"
            className="text-hack-sand/80 hover:text-hack-sand font-mono text-xs font-semibold px-2 sm:px-3 py-1.5 transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="btn-keycap bg-hack-coral hover:bg-hack-coral/90 text-hack-ink px-3.5 sm:px-4 py-1.5 text-xs font-bold inline-flex items-center gap-1.5 transition-all"
          >
            <span>Try Free</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </header>
  )
}
