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
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* Global Realtime Notification Toast */}
      {user?.id && <NotificationToast userId={user.id} />}

      {/* Mobile menu backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 transform flex-col bg-slate-900 text-white transition-transform duration-200 ease-in-out lg:static lg:flex lg:translate-x-0 shadow-xl",
        isMobileMenuOpen ? "flex translate-x-0" : "-translate-x-full"
      )}>
        {/* Brand Header */}
        <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-slate-800">
          <Link href="/dashboard" className="flex items-center">
            <HackFlowLogo textClassName="text-white text-lg" />
          </Link>
          <button 
            className="rounded-md p-1 text-slate-400 hover:text-white lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-1.5 px-4 py-6">
          <div className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Navigation
          </div>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center rounded-lg px-3.5 py-2.5 text-sm font-medium transition-all",
                  isActive 
                    ? "bg-blue-600 text-white shadow-sm font-semibold" 
                    : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <item.icon className={cn("mr-3 h-4 w-4", isActive ? "text-white" : "text-slate-400")} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Sidebar Bottom Profile Widget */}
        <div className="border-t border-slate-800 p-4 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-slate-700 shrink-0">
              <AvatarImage src={user?.avatar_url || ''} />
              <AvatarFallback className="bg-slate-800 text-slate-200 text-xs font-semibold">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-1 flex-col overflow-hidden min-w-0">
              <span className="truncate text-xs font-semibold text-white">
                {user?.full_name || 'User'}
              </span>
              <span className="truncate text-[11px] text-slate-400">
                {user?.email}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="rounded-lg p-2 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-4 shadow-sm lg:px-8">
          <div className="flex items-center">
            <button
              className="mr-4 rounded-md p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <h1 className="text-base sm:text-lg font-semibold text-slate-900">
              {pathname === '/dashboard' ? 'Operational Dashboard' : 
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
                <button className="flex items-center gap-2 rounded-full p-1 pl-2 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                  <Avatar className="h-8 w-8 border border-slate-200">
                    <AvatarImage src={user?.avatar_url || ''} />
                    <AvatarFallback className="bg-blue-50 text-blue-700 text-xs font-semibold">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block text-xs font-medium text-slate-700 max-w-[120px] truncate">
                    {user?.full_name || 'Account'}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400 mr-1 hidden sm:block" />
                </button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="w-56 bg-white shadow-lg border border-slate-200 p-1.5 rounded-xl">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {user?.full_name || 'Signed In'}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {user?.email}
                  </p>
                </div>

                <div className="py-1">
                  <Link href="/dashboard">
                    <DropdownMenuItem className="cursor-pointer text-xs rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50">
                      <LayoutDashboard className="h-3.5 w-3.5 mr-2 text-slate-400" />
                      Dashboard
                    </DropdownMenuItem>
                  </Link>
                  <Link href="/events">
                    <DropdownMenuItem className="cursor-pointer text-xs rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-50">
                      <Calendar className="h-3.5 w-3.5 mr-2 text-slate-400" />
                      My Events
                    </DropdownMenuItem>
                  </Link>
                </div>

                <DropdownMenuSeparator />

                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="cursor-pointer text-xs rounded-lg px-3 py-2 text-red-600 hover:bg-red-50 font-medium"
                >
                  <LogOut className="h-3.5 w-3.5 mr-2 text-red-500" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main View */}
        <main className="flex-1 overflow-y-auto bg-slate-50/70 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
