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
    { name: 'People', href: '/friends', icon: Users },
    { name: 'Trophies', href: '/archive', icon: Trophy },
  ]

  // Compute breadcrumb info
  const getBreadcrumb = () => {
    if (pathname === '/dashboard') return { parent: 'Home', current: 'Hackathons' }
    if (pathname === '/vault') return { parent: 'Home', current: 'Vault' }
    if (pathname === '/friends') return { parent: 'Home', current: 'People' }
    if (pathname === '/archive') return { parent: 'Home', current: 'Trophies' }
    if (pathname.startsWith('/events/')) return { parent: 'Home', current: 'Workspace' }
    return { parent: 'Home', current: 'HackFlow' }
  }
  const breadcrumb = getBreadcrumb()

  return (
    <div className="flex h-screen overflow-hidden bg-hack-sand text-hack-ink">
      {/* Global Realtime Notification Toast */}
      {user?.id && <NotificationToast userId={user.id} />}

      {/* Mobile menu backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-hack-ink/50 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 transform flex-col bg-hack-ink text-hack-surface border-r border-hack-muted/30 transition-transform duration-200 ease-in-out lg:static lg:flex lg:translate-x-0 shadow-hack-lg",
        isMobileMenuOpen ? "flex translate-x-0" : "-translate-x-full"
      )}>
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-hack-muted/20 bg-hack-ink/40">
          <Link href="/dashboard" prefetch={true} className="flex items-center">
            <HackFlowLogo textClassName="text-hack-surface text-xl" />
          </Link>
          <button 
            className="p-1.5 text-hack-sky hover:text-white rounded-lg lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-1.5 px-3 py-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`))
            return (
              <Link
                key={item.name}
                href={item.href}
                prefetch={true}
                className={cn(
                  "flex items-center px-3.5 py-2.5 rounded-lg font-mono text-xs font-bold uppercase tracking-wider transition-all",
                  isActive 
                    ? "bg-hack-coral text-hack-ink shadow-hack-hero font-extrabold" 
                    : "text-hack-surface/80 hover:text-hack-surface hover:bg-hack-navy/60"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className={cn("mr-3 h-4 w-4", isActive ? "text-hack-ink" : "text-hack-sky")} />
                {item.name}
              </Link>
            )
          })}

          <div className="pt-4 px-1">
            <Link
              href="/dashboard?action=add"
              prefetch={true}
              onClick={() => {
                setIsMobileMenuOpen(false)
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('hackflow:open-add-hack'))
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-lg bg-hack-coral text-hack-ink font-mono text-xs font-bold uppercase tracking-wider shadow-hack-hero hover:brightness-105 active:scale-[0.98] transition-all"
            >
              <span>+ Add Hackathon</span>
            </Link>
          </div>
        </nav>

        {/* Sidebar Bottom Profile Widget */}
        <ProfileSidebarWidget user={user} />
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="flex h-14 sm:h-16 shrink-0 items-center justify-between border-b border-hack-muted/60 bg-hack-surface text-hack-ink px-4 sm:px-8 shadow-hack-sm">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              className="p-1.5 text-hack-ink hover:bg-hack-sand border border-hack-muted rounded-lg bg-hack-surface shadow-hack-sm lg:hidden active:scale-95 transition-transform shrink-0 touch-manipulation"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Toggle navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Mobile Brand Emblem */}
            <Link href="/dashboard" prefetch={true} className="flex items-center lg:hidden shrink-0 active:scale-90 transition-transform">
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
                {breadcrumb.current === 'Hackathons' ? 'Active Competitions' :
                 breadcrumb.current === 'Vault' ? 'Squad Vault' :
                 breadcrumb.current === 'People' ? 'Teammates & Friends' :
                 breadcrumb.current === 'Trophies' ? 'Trophy Case' :
                 'Workspace Console'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/dashboard?action=add"
              prefetch={true}
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('hackflow:open-add-hack'))
                }
              }}
              className="inline-flex lg:hidden items-center gap-1.5 px-3 py-1.5 rounded-lg bg-hack-coral text-hack-ink font-mono text-xs font-bold uppercase tracking-wider shadow-hack-hero hover:brightness-105 active:scale-[0.98] transition-all"
            >
              <span>+ Add Hack</span>
            </Link>
            {user?.id && (
              <NotificationBell userId={user.id} />
            )}
          </div>
        </header>

        {/* Main View with bottom dock clearance on mobile */}
        <main className="flex-1 overflow-y-auto bg-hack-sand p-3 sm:p-6 lg:p-8 pb-24 lg:pb-8 overscroll-contain page-enter">
          {children}
        </main>

        {/* Fixed Mobile Bottom Navigation Dock (lg:hidden) */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-hack-ink/95 backdrop-blur-md border-t border-hack-muted/30 shadow-[0_-4px_16px_rgba(23,37,34,0.25)] px-2 py-1.5 pb-[max(env(safe-area-inset-bottom),0.65rem)] flex items-center justify-around lg:hidden">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`))
            return (
              <Link
                key={item.name}
                href={item.href}
                prefetch={true}
                className={cn(
                  "relative flex flex-col items-center justify-center flex-1 py-1 px-1 font-mono transition-all rounded-lg select-none min-h-[46px] active:scale-95 touch-manipulation",
                  isActive
                    ? "bg-hack-coral text-hack-ink shadow-hack-sm"
                    : "text-hack-surface/75 hover:text-hack-surface active:bg-hack-navy/50"
                )}
              >
                <item.icon className={cn("h-4 w-4 mb-0.5 transition-transform", isActive ? "text-hack-ink scale-110" : "text-hack-sky")} />
                <span className={cn(
                  "text-[10px] font-bold uppercase tracking-tight truncate max-w-[70px]",
                  isActive ? "text-hack-ink" : "text-hack-surface/90"
                )}>
                  {item.name}
                </span>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
