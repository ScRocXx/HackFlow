'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  User, LogOut, ChevronUp, Edit3, Loader2, Sparkles, 
  GraduationCap, Phone, Mail, Globe, CheckCircle2 
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { upsertVaultProfile, getVaultProfiles } from '@/app/actions/vault'
import type { TeamVaultProfile } from '@/lib/supabase/types'
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
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [profileData, setProfileData] = useState<Partial<TeamVaultProfile>>({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: '',
    college: '',
    roll_number: '',
    github_url: '',
    linkedin_url: '',
    portfolio_url: '',
    resume_url: '',
  })

  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const userInitials = (user?.full_name || user?.email || 'U')
    .slice(0, 2)
    .toUpperCase()

  // Load existing profile details if any
  useEffect(() => {
    if (!user?.id) return

    const loadProfile = async () => {
      try {
        const res = await getVaultProfiles()
        if (res.success && res.data) {
          const mine = res.data.find(p => p.user_id === user.id)
          if (mine) {
            setProfileData({
              full_name: mine.full_name || user.full_name || '',
              email: mine.email || user.email || '',
              phone: mine.phone || '',
              college: mine.college || '',
              roll_number: mine.roll_number || '',
              github_url: mine.github_url || '',
              linkedin_url: mine.linkedin_url || '',
              portfolio_url: mine.portfolio_url || '',
              resume_url: mine.resume_url || '',
            })
          }
        }
      } catch (err) {
        console.warn('Could not load profile details', err)
      }
    }

    loadProfile()
  }, [user?.id, user?.full_name, user?.email])

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

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profileData.full_name?.trim() || !profileData.email?.trim()) {
      toast({
        title: 'Required Fields Missing',
        description: 'Please enter at least your full name and email.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const res = await upsertVaultProfile({
        full_name: profileData.full_name.trim(),
        email: profileData.email.trim(),
        phone: profileData.phone?.trim() || undefined,
        college: profileData.college?.trim() || undefined,
        roll_number: profileData.roll_number?.trim() || undefined,
        github_url: profileData.github_url?.trim() || undefined,
        linkedin_url: profileData.linkedin_url?.trim() || undefined,
        portfolio_url: profileData.portfolio_url?.trim() || undefined,
        resume_url: profileData.resume_url?.trim() || undefined,
      })

      if (!res.success) {
        throw new Error(res.error || 'Failed to save details')
      }

      toast({
        title: 'Details Saved',
        description: 'Your registration profile has been updated.',
      })

      setIsDetailsModalOpen(false)
      router.refresh()
    } catch (err: any) {
      toast({
        title: 'Save Notice',
        description: err.message || 'Could not update profile details.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="border-t-2 border-[#10201d] p-3 bg-[#10201d]/60 relative">
      {/* Profile Bar */}
      <div className="flex items-center w-full">
        {/* Profile Details Trigger */}
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
                setIsDetailsModalOpen(true)
              }}
              className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-mono font-bold text-[#10201d] hover:bg-[#8bb2de] border border-transparent hover:border-[#10201d] transition-all text-left"
            >
              <Edit3 className="h-3.5 w-3.5 text-[#10201d]" />
              <span>Add / Edit Your Details</span>
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

      {/* Edit Registration Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto border-2 border-[#10201d] bg-[#f7f7f2] shadow-[8px_8px_0_#671912] p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold text-[#10201d]">
              Squad Registration Profile
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-[#34433f]">
              Saved once. Teammates can 1-click copy your phone, roll number, and resume link on Unstop or Devfolio forms.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDetails} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">Full Name *</label>
                <Input
                  value={profileData.full_name || ''}
                  onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                  placeholder="Your Full Name"
                  className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">Email *</label>
                <Input
                  type="email"
                  value={profileData.email || ''}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  placeholder="your.email@example.com"
                  className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">Phone Number</label>
                <Input
                  value={profileData.phone || ''}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">College / Institute</label>
                <Input
                  value={profileData.college || ''}
                  onChange={(e) => setProfileData({ ...profileData, college: e.target.value })}
                  placeholder="e.g. IIT Bombay / BITS Pilani"
                  className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">Roll Number / Student ID</label>
                <Input
                  value={profileData.roll_number || ''}
                  onChange={(e) => setProfileData({ ...profileData, roll_number: e.target.value })}
                  placeholder="e.g. 21BCE0912"
                  className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">GitHub Profile</label>
                <Input
                  value={profileData.github_url || ''}
                  onChange={(e) => setProfileData({ ...profileData, github_url: e.target.value })}
                  placeholder="https://github.com/username"
                  className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">LinkedIn Profile</label>
                <Input
                  value={profileData.linkedin_url || ''}
                  onChange={(e) => setProfileData({ ...profileData, linkedin_url: e.target.value })}
                  placeholder="https://linkedin.com/in/username"
                  className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">Portfolio URL</label>
                <Input
                  value={profileData.portfolio_url || ''}
                  onChange={(e) => setProfileData({ ...profileData, portfolio_url: e.target.value })}
                  placeholder="https://myportfolio.dev"
                  className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">Resume Link (Google Drive / Direct PDF)</label>
              <Input
                value={profileData.resume_url || ''}
                onChange={(e) => setProfileData({ ...profileData, resume_url: e.target.value })}
                placeholder="https://drive.google.com/file/d/..."
                className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
              />
            </div>

            <div className="flex justify-between items-center pt-4 border-t-2 border-[#10201d]">
              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="font-mono text-xs font-bold text-[#e53927] hover:underline flex items-center gap-1"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign Out
              </button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDetailsModalOpen(false)}
                  className="font-mono text-xs font-bold border-2 border-[#10201d] bg-[#f7f7f2]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="font-mono text-xs font-bold border-2 border-[#10201d] bg-[#e97b77] hover:bg-[#f6c4c1] text-[#10201d] shadow-[3px_3px_0_#671912]"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {isSaving ? 'Saving...' : 'Save Profile'}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
