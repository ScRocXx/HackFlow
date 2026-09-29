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
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Vault', href: '/vault', icon: FolderKanban },
    { name: 'My Teams', href: '/friends', icon: Users },
    { name: 'Trophy Case', href: '/archive', icon: Trophy },
  ]

  return (
    <div className="flex h-screen overflow-hidden bg-hack-sand">
      {/* Global Realtime Notification Toast */}
      {user?.id && <NotificationToast userId={user.id} />}

      {/* Mobile menu backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-hack-ink/60 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 transform flex-col bg-hack-forest text-hack-panel border-r-2 border-hack-ink transition-transform duration-200 ease-in-out lg:static lg:flex lg:translate-x-0 shadow-[4px_0_0_#10201d]",
        isMobileMenuOpen ? "flex translate-x-0" : "-translate-x-full"
      )}>
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b-2 border-hack-ink bg-hack-ink/30">
          <Link href="/dashboard" prefetch={true} className="flex items-center">
            <HackFlowLogo textClassName="text-hack-panel text-xl" />
          </Link>
          <button 
            className="p-1 text-hack-sky hover:text-white lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-2 px-4 py-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.name}
                href={item.href}
                prefetch={true}
                className={cn(
                  "flex items-center px-3.5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider transition-all",
                  isActive 
                    ? "bg-hack-coral text-hack-ink border-2 border-hack-ink shadow-[3px_3px_0_#671912]" 
                    : "text-hack-panel hover:bg-hack-teal hover:translate-x-1"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className={cn("mr-3 h-4 w-4", isActive ? "text-hack-ink" : "text-hack-sky")} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Bottom Profile Widget */}
        <ProfileSidebarWidget user={user} />
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="flex h-14 sm:h-16 shrink-0 items-center justify-between border-b-2 border-hack-ink bg-hack-teal text-hack-panel px-3 sm:px-8">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              className="p-1.5 text-hack-panel hover:bg-hack-forest border-2 border-hack-ink bg-hack-forest shadow-hack-sm lg:hidden active:scale-95 transition-transform shrink-0 touch-manipulation"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Toggle navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Mobile Brand Emblem */}
            <Link href="/dashboard" prefetch={true} className="flex items-center lg:hidden shrink-0 active:scale-90 transition-transform">
              <HackFlowImageLogo className="w-8 h-8" />
            </Link>

            <h1 className="font-display text-base sm:text-2xl font-bold tracking-tight text-hack-panel truncate">
              {pathname === '/dashboard' ? 'Dashboard' : 
               pathname === '/vault' ? 'Vault' : 
               pathname === '/archive' ? 'Trophy Case' : 
               pathname === '/friends' ? 'My Teams' :
               pathname.startsWith('/events') ? 'Hackathon Workspace' : 'HackFlow'}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 border border-hack-ink bg-hack-forest text-hack-sky hidden sm:inline-block">
              Team Workspace
            </span>
            {user?.id && (
              <NotificationBell userId={user.id} />
            )}
          </div>
        </header>

        {/* Main View with bottom dock clearance on mobile */}
        <main className="flex-1 overflow-y-auto bg-hack-sand p-3 sm:p-6 lg:p-8 pb-24 lg:pb-8 overscroll-contain">
          {children}
        </main>

        {/* Fixed Mobile Bottom Navigation Dock (lg:hidden) */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-hack-forest/95 backdrop-blur-md border-t-2 border-hack-ink shadow-[0_-4px_16px_rgba(16,32,29,0.35)] px-2 py-1.5 pb-[max(env(safe-area-inset-bottom),0.65rem)] flex items-center justify-around lg:hidden">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`))
            return (
              <Link
                key={item.name}
                href={item.href}
                prefetch={true}
                className={cn(
                  "relative flex flex-col items-center justify-center flex-1 py-1 px-1 font-mono transition-all rounded-xs select-none min-h-[46px] active:scale-95 touch-manipulation",
                  isActive
                    ? "bg-hack-ink text-hack-yellow border border-hack-ink shadow-[1px_1px_0_#10201d]"
                    : "text-hack-sky hover:text-hack-panel active:bg-hack-teal"
                )}
              >
                {isActive && (
                  <span className="absolute -top-1 w-6 h-1 bg-hack-yellow rounded-full shadow-[0_0_6px_#f5b726]" />
                )}
                <item.icon className={cn("h-4 w-4 mb-0.5 transition-transform", isActive ? "text-hack-yellow scale-110" : "text-hack-sky")} />
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-tight truncate max-w-[70px]",
                  isActive ? "text-hack-yellow" : "text-hack-panel"
                )}>
                  {item.name === 'Vault' ? 'Vault' :
                   item.name === 'My Teams' ? 'Teams' :
                   item.name === 'Trophy Case' ? 'Trophies' :
                   'Tracker'}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
