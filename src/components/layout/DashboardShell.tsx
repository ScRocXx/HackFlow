'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  LayoutDashboard, 
  FolderKanban, 
  Trophy, 
  Users, 
  Plus, 
  LogOut, 
  User as UserIcon,
  ChevronDown
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { HackFlowImageLogo } from '@/components/brand/Logo'
import { NotificationToast } from '@/components/notifications/NotificationToast'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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
    { name: 'Hackathons', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Vault', href: '/vault', icon: FolderKanban },
    { name: 'Squads', href: '/friends', icon: Users },
    { name: 'Wins', href: '/archive', icon: Trophy },
  ]

  const isNavActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard' || pathname.startsWith('/events/')
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <div className="min-h-screen bg-workbench-canvas text-hack-ink flex flex-col relative antialiased selection:bg-hack-coral selection:text-hack-ink">
      {/* Global Realtime Notification Toast */}
      {user?.id && <NotificationToast userId={user.id} />}

      {/* =========================================================================
          DESKTOP & TABLET: THE FLOATING COMMAND ISLAND (Top-Center Dock)
          ========================================================================= */}
      <header className="hidden md:flex fixed top-3.5 inset-x-0 z-50 justify-center pointer-events-none px-4">
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2.5 px-3 py-1.5 rounded-full bg-[#10201D] text-[#F7F7F2] border-2 border-[#10201D] shadow-[0_12px_32px_-4px_rgba(16,32,29,0.4)] backdrop-blur-md">
          {/* Brand Emblem */}
          <Link 
            href="/dashboard" 
            prefetch={true}
            className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-full hover:bg-white/10 transition-colors group"
            title="HackFlow Workbench"
          >
            <HackFlowImageLogo className="w-6 h-6 shrink-0 transition-transform group-hover:scale-105" />
            <span className="font-display font-extrabold text-sm tracking-tight text-white hidden lg:inline">
              HackFlow
            </span>
          </Link>

          <div className="w-[1px] h-5 bg-white/15 mx-0.5" />

          {/* Segmented Navigation Pills */}
          <nav className="flex items-center gap-1" aria-label="Main Navigation">
            {navItems.map((item) => {
              const active = isNavActive(item.href)
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={true}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-xs font-bold transition-all select-none touch-manipulation",
                    active
                      ? "bg-hack-coral text-hack-ink shadow-sm scale-[1.02]"
                      : "text-white/75 hover:text-white hover:bg-white/10"
                  )}
                >
                  <item.icon className={cn("w-3.5 h-3.5", active ? "text-hack-ink" : "text-white/60")} />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          <div className="w-[1px] h-5 bg-white/15 mx-0.5" />

          {/* Quick Action Keycap Button: [+ Add] */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('hackflow:open-add-hack'))
              }
            }}
            className="keycap-btn inline-flex items-center gap-1 px-3 py-1 rounded-full bg-hack-coral text-hack-ink font-mono text-xs font-bold tracking-tight hover:brightness-105 active:scale-95 transition-all shrink-0"
            title="Add New Hackathon"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add</span>
          </button>

          {/* Notification Bell */}
          {user?.id && (
            <div className="text-white hover:text-hack-coral transition-colors flex items-center">
              <NotificationBell userId={user.id} />
            </div>
          )}

          {/* User Profile Pill / Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button 
                type="button" 
                className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-full bg-white/10 hover:bg-white/15 border border-white/10 transition-colors focus:outline-none"
              >
                <div className="w-5 h-5 rounded-full bg-hack-coral text-hack-ink font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="font-mono text-xs font-semibold text-white/90 max-w-[80px] truncate hidden xl:inline">
                  {user?.full_name?.split(' ')[0] || 'You'}
                </span>
                <ChevronDown className="w-3 h-3 text-white/60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 bg-hack-surface border-2 border-hack-ink rounded-[8px] shadow-hack-lg p-1.5 font-mono text-xs">
              <div className="font-sans font-bold text-hack-ink px-2 py-1">
                <p className="truncate text-sm">{user?.full_name || 'Hacker'}</p>
                <p className="font-mono text-[11px] text-hack-subtext font-normal truncate">{user?.email}</p>
              </div>
              <DropdownMenuSeparator className="bg-hack-muted/50 my-1" />
              <DropdownMenuItem onClick={() => router.push('/vault')} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-hack-sand">
                <UserIcon className="w-3.5 h-3.5 text-hack-subtext" />
                <span>My Vault Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/friends')} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-hack-sand">
                <Users className="w-3.5 h-3.5 text-hack-subtext" />
                <span>Squads & Crew</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-hack-muted/50 my-1" />
              <DropdownMenuItem 
                onClick={handleSignOut} 
                className="flex items-center gap-2 px-2 py-1.5 rounded text-hack-coral-dark hover:bg-hack-coral/10 cursor-pointer font-bold"
              >
                <LogOut className="w-3.5 h-3.5 text-hack-coral-dark" />
                <span>Log Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* =========================================================================
          MOBILE TOP COMPACT BAR (<768px)
          ========================================================================= */}
      <header className="flex md:hidden h-14 shrink-0 items-center justify-between px-4 border-b border-hack-ink/15 bg-hack-surface/90 backdrop-blur-md sticky top-0 z-40">
        <Link href="/dashboard" prefetch={true} className="flex items-center gap-2">
          <HackFlowImageLogo className="w-7 h-7" />
          <span className="font-display font-extrabold text-base tracking-tight text-hack-ink">
            HackFlow
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('hackflow:open-add-hack'))
              }
            }}
            className="keycap-btn px-2.5 py-1 rounded-[6px] bg-hack-coral text-hack-ink font-mono text-xs font-bold shadow-sm"
          >
            + Add
          </button>
          {user?.id && <NotificationBell userId={user.id} />}
        </div>
      </header>

      {/* =========================================================================
          MAIN WORKBENCH CANVAS (100% Full-Viewport Breathing Room)
          ========================================================================= */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 pt-4 md:pt-20 pb-24 md:pb-12 overscroll-contain">
        {children}
      </main>

      {/* =========================================================================
          MOBILE FLOATING COMMAND THUMB ISLAND (<768px, Bottom-Center Dock)
          ========================================================================= */}
      <nav 
        className="fixed bottom-4 inset-x-3 z-50 h-14 rounded-full bg-[#10201D]/95 backdrop-blur-md border-2 border-[#10201D] shadow-[0_10px_25px_rgba(0,0,0,0.4)] px-3 flex items-center justify-around md:hidden"
        aria-label="Mobile Navigation Dock"
      >
        {/* Slot 1: Home */}
        <Link
          href="/dashboard"
          prefetch={true}
          className={cn(
            "flex flex-col items-center justify-center py-1 font-mono transition-all rounded-full select-none active:scale-90 touch-manipulation px-2",
            pathname === '/dashboard' ? "text-hack-coral font-bold" : "text-white/70 hover:text-white"
          )}
        >
          <LayoutDashboard className={cn("h-4 w-4 mb-0.5", pathname === '/dashboard' ? "text-hack-coral" : "text-white/60")} />
          <span className="text-[9px] uppercase font-bold tracking-tight">Home</span>
        </Link>

        {/* Slot 2: Vault */}
        <Link
          href="/vault"
          prefetch={true}
          className={cn(
            "flex flex-col items-center justify-center py-1 font-mono transition-all rounded-full select-none active:scale-90 touch-manipulation px-2",
            pathname.startsWith('/vault') ? "text-hack-coral font-bold" : "text-white/70 hover:text-white"
          )}
        >
          <FolderKanban className={cn("h-4 w-4 mb-0.5", pathname.startsWith('/vault') ? "text-hack-coral" : "text-white/60")} />
          <span className="text-[9px] uppercase font-bold tracking-tight">Vault</span>
        </Link>

        {/* Slot 3: Center Raised [+] Coral Keycap */}
        <button
          type="button"
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('hackflow:open-add-hack'))
            }
          }}
          aria-label="Add Hackathon"
          className="flex items-center justify-center -mt-5 h-12 w-12 rounded-full bg-hack-coral text-hack-ink border-2 border-[#10201D] shadow-[0_4px_12px_rgba(0,0,0,0.4)] active:scale-90 transition-transform shrink-0"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>

        {/* Slot 4: Squads */}
        <Link
          href="/friends"
          prefetch={true}
          className={cn(
            "flex flex-col items-center justify-center py-1 font-mono transition-all rounded-full select-none active:scale-90 touch-manipulation px-2",
            pathname.startsWith('/friends') ? "text-hack-coral font-bold" : "text-white/70 hover:text-white"
          )}
        >
          <Users className={cn("h-4 w-4 mb-0.5", pathname.startsWith('/friends') ? "text-hack-coral" : "text-white/60")} />
          <span className="text-[9px] uppercase font-bold tracking-tight">Squads</span>
        </Link>

        {/* Slot 5: Wins */}
        <Link
          href="/archive"
          prefetch={true}
          className={cn(
            "flex flex-col items-center justify-center py-1 font-mono transition-all rounded-full select-none active:scale-90 touch-manipulation px-2",
            pathname.startsWith('/archive') ? "text-hack-coral font-bold" : "text-white/70 hover:text-white"
          )}
        >
          <Trophy className={cn("h-4 w-4 mb-0.5", pathname.startsWith('/archive') ? "text-hack-coral" : "text-white/60")} />
          <span className="text-[9px] uppercase font-bold tracking-tight">Wins</span>
        </Link>
      </nav>
    </div>
  )
}
