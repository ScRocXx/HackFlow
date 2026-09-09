'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { createEvent } from '@/app/actions/events'
import { useRouter } from 'next/navigation'

interface URLParseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialUrl?: string
}

export function URLParseDialog({ open, onOpenChange, initialUrl }: URLParseDialogProps) {
  const [url, setUrl] = useState(initialUrl || '')
  const [loading, setLoading] = useState(false)
  const [parsedData, setParsedData] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    if (open && initialUrl && !parsedData) {
      setUrl(initialUrl)
      handleParse(initialUrl)
    }
  }, [open, initialUrl])

  const handleParse = async (targetUrl: string) => {
    if (!targetUrl) return
    setLoading(true)
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      })
      if (!res.ok) throw new Error('Failed to parse')
      const data = await res.json()
      setParsedData(data)
    } catch (error) {
      console.error(error)
      // Provide dummy fallback for demo if extraction fails
      setParsedData({
        title: 'New Hackathon Event',
        organizer_name: 'Tech Organizer',
        source_platform: 'devpost',
        mode: 'online',
        stages: []
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const res = await createEvent(parsedData)
      if (res && res.success && res.data) {
        onOpenChange(false)
        router.push(`/events/${(res.data as any).id}`)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Hackathon</DialogTitle>
          <DialogDescription>
            Review the extracted details before saving.
          </DialogDescription>
        </DialogHeader>

        {!parsedData ? (
          <div className="space-y-4 py-4">
            <Input 
              placeholder="https://..." 
              value={url} 
              onChange={(e) => setUrl(e.target.value)} 
            />
            <Button onClick={() => handleParse(url)} disabled={loading} className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Parse URL
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input 
                value={parsedData.title || ''} 
                onChange={e => setParsedData({...parsedData, title: e.target.value})} 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Organizer</label>
                <Input 
                  value={parsedData.organizer_name || ''} 
                  onChange={e => setParsedData({...parsedData, organizer_name: e.target.value})} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Platform</label>
                <Input 
                  value={parsedData.source_platform || ''} 
                  onChange={e => setParsedData({...parsedData, source_platform: e.target.value})} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium">Stages</label>
                <Button variant="outline" size="sm" onClick={() => {
                  setParsedData({
                    ...parsedData, 
                    stages: [...(parsedData.stages || []), { title: 'New Stage', stage_type: 'submission' }]
                  })
                }}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              <div className="space-y-2">
                {parsedData.stages?.map((stage: any, idx: number) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Input 
                      value={stage.title} 
                      onChange={e => {
                        const newStages = [...parsedData.stages]
                        newStages[idx].title = e.target.value
                        setParsedData({...parsedData, stages: newStages})
                      }}
                      className="flex-1"
                    />
                    <Button variant="ghost" size="icon" onClick={() => {
                      const newStages = parsedData.stages.filter((_:any, i:number) => i !== idx)
                      setParsedData({...parsedData, stages: newStages})
                    }}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Button onClick={handleSubmit} disabled={loading} className="w-full">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Event
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
