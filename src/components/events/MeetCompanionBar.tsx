'use client'

import { useState } from 'react'
import { Video, ExternalLink, Settings2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { updateEventMeetUrl } from '@/app/actions/events'
import { ensureExternalUrl } from '@/lib/utils/url'
import { cn } from '@/lib/utils'

interface MeetCompanionBarProps {
  eventId: string
  meetUrl?: string | null
  className?: string
}

export function MeetCompanionBar({ eventId, meetUrl, className }: MeetCompanionBarProps) {
  const [currentMeetUrl, setCurrentMeetUrl] = useState(meetUrl || '')
  const [inputUrl, setInputUrl] = useState(meetUrl || '')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const handleSaveMeet = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const sanitized = ensureExternalUrl(inputUrl)
      const res = await updateEventMeetUrl(eventId, sanitized)
      if (!res.success) throw new Error(res.error || 'Failed to update Google Meet URL')

      setCurrentMeetUrl(sanitized)
      toast({
        title: 'Team Meet Link Updated',
        description: 'Teammates can now 1-click join the sprint meeting.',
      })
      setIsModalOpen(false)
    } catch (err: any) {
      toast({
        title: 'Error Updating Link',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      {currentMeetUrl ? (
        <div className="inline-flex items-center gap-1">
          <a
            href={ensureExternalUrl(currentMeetUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-hack-mint/60 bg-hack-mint/20 hover:bg-hack-mint/30 text-hack-mint-dark shadow-hack-sm inline-flex items-center gap-1.5 transition-all h-8 active:scale-95"
            title="Join squad meet"
          >
            <Video className="w-3.5 h-3.5 text-hack-mint-dark shrink-0" />
            <span>Meet</span>
            <ExternalLink className="w-3 h-3 text-hack-mint-dark opacity-80 shrink-0" />
          </a>
          <button
            type="button"
            onClick={() => {
              setInputUrl(currentMeetUrl)
              setIsModalOpen(true)
            }}
            className="p-1.5 border border-hack-muted/60 bg-hack-surface hover:bg-hack-sand text-hack-subtext hover:text-hack-ink rounded-lg shadow-hack-sm transition-all h-8 w-8 flex items-center justify-center shrink-0 active:scale-95"
            title="Configure squad meet URL"
            aria-label="Configure squad meet URL"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setIsModalOpen(true)}
          className="font-mono text-xs font-semibold rounded-lg border border-hack-muted/60 bg-hack-surface hover:bg-hack-sand text-hack-subtext hover:text-hack-ink shadow-hack-sm h-8 px-2.5 flex items-center gap-1.5 active:scale-95"
          title="Set Google Meet or Zoom link for your squad"
        >
          <Video className="w-3.5 h-3.5 text-hack-subtext shrink-0" />
          <span>+ Meet</span>
        </Button>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[440px] border border-hack-muted/60 bg-hack-surface shadow-hack-dialog rounded-xl p-5 sm:p-6 font-mono text-xs">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-bold text-hack-ink">
              Squad Meet Link
            </DialogTitle>
            <DialogDescription className="font-sans text-xs text-hack-subtext mt-1">
              Add your Google Meet, Zoom, or Discord link. It stays pinned in your event toolbar for 1-click team access.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMeet} className="space-y-4 pt-3">
            <div className="space-y-1.5">
              <label className="font-mono text-xs font-bold uppercase tracking-wider text-hack-subtext block">
                Meet URL
              </label>
              <Input
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://meet.google.com/abc-defg-hij"
                className="font-mono text-xs border border-hack-muted/60 bg-hack-sand/40 text-hack-ink rounded-lg px-3 py-2 shadow-hack-sm focus:border-hack-coral focus:ring-0"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="font-mono text-xs font-semibold border border-hack-muted bg-hack-surface hover:bg-hack-sand text-hack-ink rounded-lg px-3 py-1.5 shadow-hack-sm"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="font-mono text-xs font-bold uppercase tracking-wider rounded-lg border border-hack-coral bg-hack-coral text-hack-ink shadow-hack-hero hover:brightness-105 active:scale-95 px-3.5 py-1.5"
              >
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Pin Meet Link'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
