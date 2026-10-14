'use client'

import { useState, useEffect } from 'react'
import { Keyboard } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

export function KeyboardShortcutsDialog() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when modifying keys are pressed (Cmd/Ctrl/Alt)
      if (e.metaKey || e.ctrlKey || e.altKey) return

      // Ignore when user is actively focused on text input fields
      const target = e.target as HTMLElement | null
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)

      if (isInput) {
        if (e.key === 'Escape') {
          target.blur()
        }
        return
      }

      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault()
        setIsOpen((prev) => !prev)
        return
      }

      if (e.key === 'n' || e.key === 'N') {
        const input = document.getElementById('add-deliverable-input') as HTMLInputElement | null
        if (input) {
          e.preventDefault()
          input.focus()
          input.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
        return
      }

      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return (
    <>
      {/* Small subtle trigger in bottom bar / workspace */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        title="Keyboard shortcuts (?)"
        aria-label="View keyboard shortcuts"
        className="fixed bottom-4 right-4 z-40 hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-hack-muted/60 bg-hack-surface/90 backdrop-blur-sm text-hack-subtext hover:text-hack-ink hover:border-hack-muted shadow-hack-sm text-[11px] font-mono transition-all"
      >
        <Keyboard className="w-3.5 h-3.5" />
        <span className="font-bold">?</span>
        <span className="opacity-75">shortcuts</span>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md border border-hack-muted/60 bg-hack-surface text-hack-ink p-6 rounded-xl shadow-hack-dialog font-mono">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-lg font-bold text-hack-ink">
              <Keyboard className="w-5 h-5 text-hack-coral-dark" />
              <span>Workspace Shortcuts</span>
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-hack-subtext pt-1">
              Quick keyboard controls to keep you moving fast during sprint crunches.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-3">
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-hack-muted/40 bg-hack-sand/50">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 rounded bg-hack-surface border border-hack-muted/80 text-xs font-bold text-hack-ink shadow-hack-sm">
                  N
                </kbd>
                <span className="font-sans text-xs text-hack-ink font-medium">Add Deliverable</span>
              </div>
              <span className="text-[11px] text-hack-subtext">Focuses task intake</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border border-hack-muted/40 bg-hack-sand/50">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 rounded bg-hack-surface border border-hack-muted/80 text-xs font-bold text-hack-ink shadow-hack-sm">
                  ?
                </kbd>
                <span className="font-sans text-xs text-hack-ink font-medium">Shortcut Help</span>
              </div>
              <span className="text-[11px] text-hack-subtext">Toggles this dialog</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border border-hack-muted/40 bg-hack-sand/50">
              <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 rounded bg-hack-surface border border-hack-muted/80 text-xs font-bold text-hack-ink shadow-hack-sm">
                  Esc
                </kbd>
                <span className="font-sans text-xs text-hack-ink font-medium">Close / Cancel</span>
              </div>
              <span className="text-[11px] text-hack-subtext">Dismisses dialog or unfocuses</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
