'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, Calendar, Menu, X, LogOut, ChevronDown, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { HackFlowLogo } from '@/components/brand/Logo'
import { NotificationBell } from '@/components/notifications/NotificationBell'
import { NotificationToast } from '@/components/notifications/NotificationToast'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
    { name: 'My Events', href: '/events', icon: Calendar },
  ]

  const userInitials = (user?.full_name || user?.email || 'U')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="flex h-screen overflow-hidden bg-[#f2f2eb]">
      {/* Global Realtime Notification Toast */}
      {user?.id && <NotificationToast userId={user.id} />}

      {/* Mobile menu backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-[#10201d]/60 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation (#2e4742) */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 transform flex-col bg-[#2e4742] text-[#f7f7f2] border-r-2 border-[#10201d] transition-transform duration-200 ease-in-out lg:static lg:flex lg:translate-x-0 shadow-[4px_0_0_#10201d]",
        isMobileMenuOpen ? "flex translate-x-0" : "-translate-x-full"
      )}>
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b-2 border-[#10201d] bg-[#10201d]/30">
          <Link href="/dashboard" className="flex items-center">
            <HackFlowLogo textClassName="text-[#f7f7f2] text-xl" />
          </Link>
          <button 
            className="p-1 text-[#8bb2de] hover:text-white lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-2 px-4 py-6">
          <div className="px-3 mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#8bb2de]">
            Execution Console
          </div>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center px-3.5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider transition-all",
                  isActive 
                    ? "bg-[#e97b77] text-[#10201d] border-2 border-[#10201d] shadow-[3px_3px_0_#671912]" 
                    : "text-[#f7f7f2] hover:bg-[#3d5f58] hover:translate-x-1"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className={cn("mr-3 h-4 w-4", isActive ? "text-[#10201d]" : "text-[#8bb2de]")} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Bottom Profile Widget */}
        <div className="border-t-2 border-[#10201d] p-4 bg-[#10201d]/40">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border-2 border-[#10201d] shrink-0 bg-[#f7f7f2]">
              <AvatarImage src={user?.avatar_url || ''} />
              <AvatarFallback className="bg-[#8bb2de] text-[#10201d] font-mono text-xs font-bold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-col overflow-hidden min-w-0">
              <span className="truncate text-xs font-bold text-[#f7f7f2] font-mono">
                {user?.full_name || 'Hacker'}
              </span>
              <span className="truncate text-[10px] font-mono text-[#8bb2de]">
                {user?.email}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 border border-[#10201d] bg-[#10201d]/50 text-[#8bb2de] hover:bg-[#e53927] hover:text-white transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar (#3d5f58) */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b-2 border-[#10201d] bg-[#3d5f58] text-[#f7f7f2] px-4 sm:px-8">
          <div className="flex items-center">
            <button
              className="mr-4 p-1.5 text-[#f7f7f2] hover:bg-[#2e4742] border border-[#10201d] lg:hidden"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[#f7f7f2]">
              {pathname === '/dashboard' ? 'Operational Console' : 
               pathname.startsWith('/events') ? 'Event Execution' : 'HackFlow'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Realtime Notification Bell */}
            {user?.id ? (
              <NotificationBell userId={user.id} />
            ) : null}

            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 border-2 border-[#10201d] bg-[#f7f7f2] text-[#10201d] shadow-[3px_3px_0_#10201d] px-2 py-1 font-mono text-xs font-bold hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
                  <Avatar className="h-6 w-6 border border-[#10201d]">
                    <AvatarImage src={user?.avatar_url || ''} />
                    <AvatarFallback className="bg-[#8bb2de] text-[#10201d] text-[10px] font-bold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block max-w-[120px] truncate">
                    {user?.full_name || 'Hacker'}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-[#10201d] hidden sm:block" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56 bg-[#f7f7f2] border-2 border-[#10201d] shadow-[6px_6px_0_#671912] p-1.5">
                <div className="px-3 py-2 border-b-2 border-[#10201d]">
                  <p className="font-mono text-xs font-bold text-[#10201d] truncate">
                    {user?.full_name || 'Signed In'}
                  </p>
                  <p className="font-mono text-[10px] text-[#34433f] truncate">
                    {user?.email}
                  </p>
                </div>

                <div className="py-1">
                  <Link href="/dashboard">
                    <DropdownMenuItem className="cursor-pointer font-mono text-xs font-bold px-3 py-2 text-[#10201d] hover:bg-[#e4e5da]">
                      <LayoutDashboard className="h-3.5 w-3.5 mr-2 text-[#10201d]" />
                      Dashboard
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/events">
                    <DropdownMenuItem className="cursor-pointer font-mono text-xs font-bold px-3 py-2 text-[#10201d] hover:bg-[#e4e5da]">
                      <Calendar className="h-3.5 w-3.5 mr-2 text-[#10201d]" />
                      My Events
                    </DropdownMenuItem>
                  </Link>
                </div>

                <DropdownMenuSeparator className="bg-[#10201d]" />

                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="cursor-pointer font-mono text-xs font-bold px-3 py-2 text-[#e53927] hover:bg-[#f2f2eb]"
                >
                  <LogOut className="h-3.5 w-3.5 mr-2 text-[#e53927]" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main View */}
        <main className="flex-1 overflow-y-auto bg-[#f2f2eb] p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )

}
