'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, ChevronUp, Loader2, Shield } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

export interface UserProfileSidebarWidgetProps {
  user: {
    id?: string
    email: string
    full_name: string
    avatar_url: string | null
  } | null
}

export function ProfileSidebarWidget({ user }: UserProfileSidebarWidgetProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const userInitials = (user?.full_name || user?.email || 'U')
    .slice(0, 2)
    .toUpperCase()

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await supabase.auth.signOut()
      toast({
        title: 'Signed Out',
        description: 'You have been successfully logged out.',
      })
    } catch (err) {
      console.error('Sign out error:', err)
    } finally {
      setIsSigningOut(false)
      setIsMenuOpen(false)
      router.push('/login')
      router.refresh()
    }
  }

  return (
    <div className="border-t border-hack-muted/20 p-3 bg-hack-ink/80 relative">
      {/* Profile Bar */}
      <div className="flex items-center w-full">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="w-full flex items-center gap-2.5 overflow-hidden min-w-0 text-left p-2 rounded-lg bg-hack-surface/90 hover:bg-hack-surface text-hack-ink border border-hack-muted/40 shadow-hack-sm transition-all active:scale-[0.98]"
          title="Open Profile Menu"
        >
          <Avatar className="h-8 w-8 border border-hack-muted/40 shrink-0 bg-white">
            <AvatarImage src={user?.avatar_url || ''} />
            <AvatarFallback className="bg-hack-blue text-hack-ink font-mono text-xs font-bold">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="truncate text-xs font-bold text-hack-ink font-mono tracking-tight">
              {user?.full_name || 'Hacker'}
            </span>
            <span className="truncate text-[10px] font-mono text-hack-subtext font-medium">
              {user?.email}
            </span>
          </div>
          <ChevronUp className={cn("h-4 w-4 text-hack-subtext shrink-0 transition-transform", isMenuOpen && "rotate-180")} />
        </button>
      </div>

      {/* Profile Popup Menu */}
      {isMenuOpen && (
        <div className="absolute left-3 right-3 bottom-full mb-2 bg-hack-surface border border-hack-muted/60 rounded-xl shadow-hack-dialog p-2 z-50 space-y-2">
          <div className="px-2 py-1.5 border-b border-hack-muted/40 bg-hack-sand/50 rounded-lg">
            <p className="font-mono text-xs font-bold text-hack-ink truncate">
              {user?.full_name || 'Hacker Profile'}
            </p>
            <p className="font-mono text-[10px] text-hack-subtext truncate">
              {user?.email}
            </p>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => {
                setIsMenuOpen(false)
                router.push('/vault')
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-mono font-bold text-hack-ink hover:bg-hack-sand rounded-lg border border-transparent transition-all text-left"
            >
              <Shield className="h-3.5 w-3.5 text-hack-blue-dark" />
              <span>Squad Vault & Profiles</span>
            </button>

            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-mono font-bold text-hack-red hover:bg-hack-red/10 rounded-lg border border-transparent transition-all text-left"
            >
              {isSigningOut ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <LogOut className="h-3.5 w-3.5" />
              )}
              <span>{isSigningOut ? 'Signing Out...' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
