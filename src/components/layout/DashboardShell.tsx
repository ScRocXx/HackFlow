'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Menu, X, FolderKanban, Trophy, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { HackFlowLogo, HackFlowImageLogo } from '@/components/brand/Logo'
import { NotificationToast } from '@/components/notifications/NotificationToast'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { ProfileSidebarWidget } from '@/components/profile/ProfileSidebarWidget'

export interface UserData {
  id?: string
  email: string
  full_name: string
  avatar_url: string | null
}

interface DashboardShellProps {
  user: UserData | null
  children: React.ReactNode
}

export function DashboardShell({ user, children }: DashboardShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Error signing out:', err)
    } finally {
      router.push('/login')
      router.refresh()
    }
  }

  const navItems = [
    { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Vault', href: '/vault', icon: FolderKanban },
    { name: 'Teams', href: '/friends', icon: Users },
    { name: 'Wins', href: '/archive', icon: Trophy },
  ]

  // Compute breadcrumb info with de-AI-ified human copy (Section 4.1)
  const getBreadcrumb = () => {
    if (pathname === '/dashboard') return { parent: 'Dashboard', current: 'Your Hackathons', title: 'Your Hackathons' }
    if (pathname === '/vault') return { parent: 'Vault', current: 'Team Info & Keys', title: 'Team Info & Keys' }
    if (pathname === '/friends') return { parent: 'Teams', current: 'Squads & Teammates', title: 'Squads & Teammates' }
    if (pathname === '/archive') return { parent: 'Wins', current: 'Past Hackathons & Wins', title: 'Past Hackathons & Wins' }
    if (pathname.startsWith('/events/')) return { parent: 'Hackathons', current: 'Team Workspace', title: 'Team Workspace' }
    return { parent: 'Home', current: 'HackFlow', title: 'HackFlow' }
  }
  const breadcrumb = getBreadcrumb()

  return (
    <div className="flex h-screen overflow-hidden bg-hack-sand text-hack-ink">
      {/* Global Realtime Notification Toast */}
      {user?.id && <NotificationToast userId={user.id} />}

      {/* Mobile menu backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-hack-ink/50 backdrop-blur-xs md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation: Tablet 64px Icon-Rail vs Desktop 240px Labeled (Section 5.1) */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 transform flex-col bg-hack-ink text-hack-surface border-r border-hack-muted/30 transition-all duration-200 ease-in-out md:static md:flex shadow-hack-lg shrink-0",
        "w-64 md:w-16 lg:w-60",
        isMobileMenuOpen ? "flex translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between px-3 lg:px-6 border-b border-hack-muted/20 bg-hack-ink/40">
          <Link href="/dashboard" prefetch={true} className="flex items-center justify-center w-full lg:w-auto lg:justify-start">
            <span className="hidden lg:block">
              <HackFlowLogo textClassName="text-hack-surface text-xl" />
            </span>
            <span className="block lg:hidden">
              <HackFlowImageLogo className="w-8 h-8" />
            </span>
          </Link>
          <button 
            className="p-1.5 text-hack-sky hover:text-white rounded-lg md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-1.5 px-2 lg:px-3 py-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`))
            return (
              <Link
                key={item.name}
                href={item.href}
                prefetch={true}
                title={item.name}
                className={cn(
                  "flex items-center justify-center lg:justify-start px-2.5 lg:px-3.5 py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all",
                  isActive 
                    ? "bg-hack-coral text-hack-ink shadow-hack-hero font-extrabold" 
                    : "text-hack-surface/80 hover:text-hack-surface hover:bg-hack-navy/60"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className={cn("h-4 w-4 shrink-0 lg:mr-3", isActive ? "text-hack-ink" : "text-hack-sky")} />
                <span className="hidden lg:inline">{item.name}</span>
              </Link>
            )
          })}

          <div className="pt-4 px-0.5 lg:px-1">
            <Link
              href="/dashboard?action=add"
              prefetch={true}
              title="Add Hackathon"
              onClick={() => {
                setIsMobileMenuOpen(false)
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('hackflow:open-add-hack'))
                }
              }}
              className="w-full flex items-center justify-center gap-1.5 px-2 lg:px-3.5 py-2.5 rounded-lg bg-hack-coral text-hack-ink font-mono text-xs font-bold uppercase tracking-wider shadow-hack-hero hover:brightness-105 active:scale-[0.98] transition-all"
            >
              <span className="text-sm font-bold leading-none">+</span>
              <span className="hidden lg:inline">Add Hackathon</span>
            </Link>
          </div>
        </nav>

        {/* Sidebar Bottom Profile Widget */}
        <ProfileSidebarWidget user={user} />
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Top Navbar */}
        <header className="flex h-14 sm:h-16 shrink-0 items-center justify-between border-b border-hack-muted/60 bg-hack-surface text-hack-ink px-4 sm:px-8 shadow-hack-sm">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              className="p-1.5 text-hack-ink hover:bg-hack-sand border border-hack-muted rounded-lg bg-hack-surface shadow-hack-sm md:hidden active:scale-95 transition-transform shrink-0 touch-manipulation"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Toggle navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Mobile Brand Emblem */}
            <Link href="/dashboard" prefetch={true} className="flex items-center md:hidden shrink-0 active:scale-90 transition-transform">
              <HackFlowImageLogo className="w-8 h-8" />
            </Link>

            {/* Breadcrumb + Title */}
            <div className="flex flex-col min-w-0">
              <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[11px] font-mono text-hack-subtext uppercase tracking-wider">
                <span>{breadcrumb.parent}</span>
                <span>/</span>
                <span className="text-hack-ink font-semibold">{breadcrumb.current}</span>
              </nav>
              <h1 className="font-display text-base sm:text-xl font-bold tracking-tight text-hack-ink truncate hidden sm:block">
                {breadcrumb.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('hackflow:open-add-hack'))
                }
              }}
              className="inline-flex md:hidden items-center gap-1.5 px-3 py-1.5 rounded-lg bg-hack-coral text-hack-ink font-mono text-xs font-bold uppercase tracking-wider shadow-hack-hero hover:brightness-105 active:scale-[0.98] transition-all"
            >
              <span>+ Add</span>
            </button>
            {user?.id && (
              <NotificationBell userId={user.id} />
            )}
          </div>
        </header>

        {/* Main View with Drafting Grid and bottom dock clearance on mobile */}
        <main className="flex-1 overflow-y-auto bg-drafting-grid p-3 sm:p-6 lg:p-8 pb-24 md:pb-8 overscroll-contain page-enter">
          {children}
        </main>

        {/* Fixed Mobile Bottom Navigation Dock (<768px, Section 5.1) */}
        <nav className="fixed bottom-0 inset-x-0 z-40 h-16 bg-[#10201D] border-t-2 border-hack-ink px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] flex items-center justify-around md:hidden shadow-[0_-4px_16px_rgba(23,37,34,0.35)]">
          {/* Slot 1: Home */}
          <Link
            href="/dashboard"
            prefetch={true}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1 font-mono transition-all rounded-lg select-none min-h-[46px] active:scale-95 touch-manipulation",
              pathname === '/dashboard' ? "text-hack-coral font-bold" : "text-hack-surface/75 hover:text-hack-surface"
            )}
          >
            <LayoutDashboard className={cn("h-4 w-4 mb-0.5", pathname === '/dashboard' ? "text-hack-coral" : "text-hack-sky")} />
            <span className="text-[10px] uppercase font-bold tracking-tight">Home</span>
          </Link>

          {/* Slot 2: Vault */}
          <Link
            href="/vault"
            prefetch={true}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1 font-mono transition-all rounded-lg select-none min-h-[46px] active:scale-95 touch-manipulation",
              pathname.startsWith('/vault') ? "text-hack-coral font-bold" : "text-hack-surface/75 hover:text-hack-surface"
            )}
          >
            <FolderKanban className={cn("h-4 w-4 mb-0.5", pathname.startsWith('/vault') ? "text-hack-coral" : "text-hack-sky")} />
            <span className="text-[10px] uppercase font-bold tracking-tight">Vault</span>
          </Link>

          {/* Slot 3: Center Raised [+] Coral Button */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('hackflow:open-add-hack'))
              }
            }}
            aria-label="Add Hackathon"
            className="flex flex-col items-center justify-center -mt-5 mx-1 h-12 w-12 rounded-full bg-hack-coral text-hack-ink border-2 border-[#10201D] shadow-[0_4px_10px_rgba(0,0,0,0.35)] active:scale-90 transition-transform shrink-0"
          >
            <span className="text-2xl font-bold leading-none -mt-0.5">+</span>
          </button>

          {/* Slot 4: Teams */}
          <Link
            href="/friends"
            prefetch={true}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1 font-mono transition-all rounded-lg select-none min-h-[46px] active:scale-95 touch-manipulation",
              pathname.startsWith('/friends') ? "text-hack-coral font-bold" : "text-hack-surface/75 hover:text-hack-surface"
            )}
          >
            <Users className={cn("h-4 w-4 mb-0.5", pathname.startsWith('/friends') ? "text-hack-coral" : "text-hack-sky")} />
            <span className="text-[10px] uppercase font-bold tracking-tight">Teams</span>
          </Link>

          {/* Slot 5: Wins */}
          <Link
            href="/archive"
            prefetch={true}
            className={cn(
              "flex flex-col items-center justify-center flex-1 py-1 font-mono transition-all rounded-lg select-none min-h-[46px] active:scale-95 touch-manipulation",
              pathname.startsWith('/archive') ? "text-hack-coral font-bold" : "text-hack-surface/75 hover:text-hack-surface"
            )}
          >
            <Trophy className={cn("h-4 w-4 mb-0.5", pathname.startsWith('/archive') ? "text-hack-coral" : "text-hack-sky")} />
            <span className="text-[10px] uppercase font-bold tracking-tight">Wins</span>
          </Link>
        </nav>
      </div>
    </div>
  )
}
