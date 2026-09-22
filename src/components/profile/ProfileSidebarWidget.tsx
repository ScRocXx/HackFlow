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
    <div className="border-t-2 border-[#10201d] p-3 bg-[#10201d]/60 relative">
      {/* Profile Bar */}
      <div className="flex items-center w-full">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="w-full flex items-center gap-2.5 overflow-hidden min-w-0 text-left p-2 bg-[#f7f7f2] hover:bg-[#e97b77] text-[#10201d] border-2 border-[#10201d] shadow-[2px_2px_0_#10201d] transition-all active:translate-x-[1px] active:translate-y-[1px]"
          title="Open Profile Menu"
        >
          <Avatar className="h-8 w-8 border-2 border-[#10201d] shrink-0 bg-[#ffffff]">
            <AvatarImage src={user?.avatar_url || ''} />
            <AvatarFallback className="bg-[#8bb2de] text-[#10201d] font-mono text-xs font-black">
              {userInitials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="truncate text-xs font-bold text-[#10201d] font-mono tracking-tight">
              {user?.full_name || 'Hacker'}
            </span>
            <span className="truncate text-[10px] font-mono text-[#57726d] font-medium">
              {user?.email}
            </span>
          </div>
          <ChevronUp className={cn("h-4 w-4 text-[#10201d] shrink-0 transition-transform", isMenuOpen && "rotate-180")} />
        </button>
      </div>

      {/* Profile Popup Menu */}
      {isMenuOpen && (
        <div className="absolute left-3 right-3 bottom-full mb-2 bg-[#f7f7f2] border-2 border-[#10201d] shadow-[6px_6px_0_#671912] p-2 z-50 space-y-2">
          <div className="px-2 py-1.5 border-b-2 border-[#10201d] bg-[#f2f2eb]">
            <p className="font-mono text-xs font-bold text-[#10201d] truncate">
              {user?.full_name || 'Hacker Profile'}
            </p>
            <p className="font-mono text-[10px] text-[#34433f] truncate">
              {user?.email}
            </p>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => {
                setIsMenuOpen(false)
                router.push('/vault')
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-mono font-bold text-[#10201d] hover:bg-[#8bb2de] border border-transparent hover:border-[#10201d] transition-all text-left"
            >
              <Shield className="h-3.5 w-3.5 text-[#10201d]" />
              <span>Squad Vault & Profiles</span>
            </button>

            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-mono font-bold text-[#e53927] hover:bg-[#f6c4c1] border border-transparent hover:border-[#10201d] transition-all text-left"
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
