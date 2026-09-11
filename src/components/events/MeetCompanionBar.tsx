'use client'

import { useState } from 'react'
import { Video, ExternalLink, Settings2, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { updateEventMeetUrl } from '@/app/actions/events'

interface MeetCompanionBarProps {
  eventId: string
  meetUrl?: string | null
}

export function MeetCompanionBar({ eventId, meetUrl }: MeetCompanionBarProps) {
  const [currentMeetUrl, setCurrentMeetUrl] = useState(meetUrl || '')
  const [inputUrl, setInputUrl] = useState(meetUrl || '')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()

  const handleSaveMeet = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    try {
      const res = await updateEventMeetUrl(eventId, inputUrl)
      if (!res.success) throw new Error(res.error || 'Failed to update Google Meet URL')

      setCurrentMeetUrl(inputUrl.trim())
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
    <div className="flex items-center gap-2">
      {currentMeetUrl ? (
        <a
          href={currentMeetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider px-3.5 py-2 border-2 border-[#10201d] bg-[#8bb2de] hover:bg-[#a6c8ee] text-[#10201d] shadow-[3px_3px_0_#2e4742] transition-transform hover:translate-x-0.5 hover:translate-y-0.5"
        >
          <Video className="w-4 h-4 text-[#10201d]" />
          <span>Join Team Meet</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      ) : (
        <Button
          onClick={() => setIsModalOpen(true)}
          className="font-mono text-xs font-bold uppercase tracking-wider border-2 border-[#10201d] bg-[#f5b726] hover:bg-[#ffcf66] text-[#10201d] shadow-[3px_3px_0_#8a5d13]"
        >
          <Video className="w-4 h-4 mr-1.5" />
          + Set Team Meet Link
        </Button>
      )}

      {currentMeetUrl && (
        <button
          onClick={() => {
            setInputUrl(currentMeetUrl)
            setIsModalOpen(true)
          }}
          className="p-2 border-2 border-[#10201d] bg-[#f7f7f2] hover:bg-[#e4e5da] text-[#10201d] shadow-[2px_2px_0_#10201d]"
          title="Configure Team Meet URL"
        >
          <Settings2 className="w-4 h-4" />
        </button>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[480px] border-2 border-[#10201d] bg-[#f7f7f2] shadow-[8px_8px_0_#671912] p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold text-[#10201d]">
              Permanent Squad Meet Link
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-[#34433f]">
              Paste your Google Meet or Zoom link. It will remain pinned in your event header for 1-click teammate access.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMeet} className="space-y-4 py-2">
            <div className="space-y-1">
              <label className="font-mono text-xs font-bold uppercase text-[#10201d] block">
                Google Meet / Call URL
              </label>
              <Input
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://meet.google.com/abc-defg-hij"
                className="font-mono text-xs border-2 border-[#10201d] bg-white shadow-[2px_2px_0_#10201d]"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="font-mono text-xs font-bold border-2 border-[#10201d] bg-[#f2f2eb]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="font-mono text-xs font-bold border-2 border-[#10201d] bg-[#e97b77] hover:bg-[#f6c4c1] text-[#10201d] shadow-[3px_3px_0_#671912]"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pin Meet Link'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
