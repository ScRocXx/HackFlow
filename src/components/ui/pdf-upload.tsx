'use client'

import React, { useState, useRef } from 'react'
import { FileText, UploadCloud, Link as LinkIcon, ExternalLink, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { ensureExternalUrl } from '@/lib/utils/url'

interface PdfUploadProps {
  value: string
  onChange: (url: string, metadata?: { fileName?: string; fileSize?: number }) => void
  label?: string
  placeholder?: string
  folder?: string
  className?: string
  disabled?: boolean
}

export function PdfUpload({
  value,
  onChange,
  label = 'Pitch Deck / Slides',
  placeholder = 'https://drive.google.com/... or https://figma.com/...',
  folder = 'pitch_decks',
  className = '',
  disabled = false,
}: PdfUploadProps) {
  const isPdfValue = Boolean(
    value &&
    (value.toLowerCase().endsWith('.pdf') ||
     value.toLowerCase().includes('hackflow_uploads') ||
     value.toLowerCase().includes('/uploads/') ||
     value.toLowerCase().includes('presentation'))
  )

  const [mode, setMode] = useState<'upload' | 'link'>(isPdfValue ? 'upload' : (value ? 'link' : 'upload'))
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string>(() => {
    if (!value) return ''
    try {
      const parts = value.split('/')
      const last = parts[parts.length - 1]
      return decodeURIComponent(last.replace(/^\d+_/, ''))
    } catch {
      return 'Pitch_Deck.pdf'
    }
  })
  const [fileSize, setFileSize] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleFileUpload = async (file: File) => {
    setUploadError(null)

    if (!file) return

    // Verify format
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    const isPpt = file.name.toLowerCase().endsWith('.ppt') || file.name.toLowerCase().endsWith('.pptx')
    if (!isPdf && !isPpt) {
      setUploadError('Please select a PDF document (.pdf) or slide presentation')
      return
    }

    // Verify size (50MB)
    if (file.size > 50 * 1024 * 1024) {
      setUploadError('File size exceeds the 50MB limit')
      return
    }

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to upload pitch deck PDF')
      }

      setFileName(data.fileName || file.name)
      setFileSize(data.fileSize || file.size)
      onChange(data.url, { fileName: data.fileName || file.name, fileSize: data.fileSize || file.size })
    } catch (err: any) {
      console.error('PDF upload error:', err)
      setUploadError(err.message || 'Failed to upload file. You can also paste an external link.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (disabled || isUploading) return

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const handleClear = () => {
    setFileName('')
    setFileSize(null)
    setUploadError(null)
    onChange('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        {label && (
          <label className="font-mono text-xs font-bold uppercase tracking-wider text-[#10201d] block">
            {label}
          </label>
        )}
        
        {/* Toggle Mode Segmented Control */}
        <div className="inline-flex p-0.5 border border-[#10201d] bg-[#f2f2eb] shadow-[1px_1px_0_#10201d]">
          <button
            type="button"
            onClick={() => {
              setMode('upload')
              setUploadError(null)
            }}
            className={cn(
              'px-2.5 py-1 font-mono text-[10px] font-bold uppercase transition-all flex items-center gap-1',
              mode === 'upload'
                ? 'bg-[#10201d] text-[#f7f7f2]'
                : 'text-[#34433f] hover:text-[#10201d]'
            )}
          >
            <FileText className="w-3 h-3" />
            Upload PDF
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('link')
              setUploadError(null)
            }}
            className={cn(
              'px-2.5 py-1 font-mono text-[10px] font-bold uppercase transition-all flex items-center gap-1',
              mode === 'link'
                ? 'bg-[#10201d] text-[#f7f7f2]'
                : 'text-[#34433f] hover:text-[#10201d]'
            )}
          >
            <LinkIcon className="w-3 h-3" />
            External Link
          </button>
        </div>
      </div>

      {mode === 'upload' ? (
        <div>
          {value && isPdfValue ? (
            /* Uploaded PDF Active Card */
            <div className="p-3 border-2 border-[#10201d] bg-white shadow-[3px_3px_0_#10201d] flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-9 h-9 border-2 border-[#10201d] bg-[#e53927] text-white flex items-center justify-center shrink-0 shadow-[1px_1px_0_#10201d]">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#10201d] truncate block" title={fileName || value}>
                      {fileName || 'Pitch_Deck.pdf'}
                    </span>
                    <span className="font-mono text-[9px] font-bold uppercase px-1.5 py-0.2 border border-[#10201d] bg-[#8bb2de] text-[#10201d] shrink-0">
                      PDF Ready
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-[#34433f] mt-0.5">
                    {fileSize ? <span>{formatBytes(fileSize)}</span> : null}
                    {fileSize ? <span>•</span> : null}
                    <span className="text-emerald-700 flex items-center gap-0.5 font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Uploaded to HackFlow
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={ensureExternalUrl(value)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs font-bold px-2.5 py-1.5 border-2 border-[#10201d] bg-[#f5b726] hover:bg-[#ffcf66] text-[#10201d] shadow-[2px_2px_0_#10201d] inline-flex items-center gap-1 transition-all"
                  title="Open PDF in new tab"
                >
                  View <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={disabled || isUploading}
                  className="p-1.5 border-2 border-[#10201d] bg-[#f2f2eb] hover:bg-[#e53927] hover:text-white text-[#10201d] transition-colors"
                  title="Remove or replace file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* Upload Dropzone */
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => !isUploading && !disabled && fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed border-[#10201d] bg-white p-4 text-center cursor-pointer transition-all hover:bg-[#f2f2eb] shadow-[2px_2px_0_#10201d]',
                isUploading && 'opacity-70 pointer-events-none cursor-wait',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.ppt,.pptx,application/pdf"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileUpload(e.target.files[0])
                  }
                }}
                className="hidden"
                disabled={disabled || isUploading}
              />

              {isUploading ? (
                <div className="flex flex-col items-center justify-center py-2 space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-[#e53927]" />
                  <p className="font-mono text-xs font-bold text-[#10201d]">Uploading presentation deck...</p>
                  <span className="font-mono text-[10px] text-[#34433f]">Storing securely on HackFlow Storage</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-2 space-y-1.5">
                  <div className="w-10 h-10 border-2 border-[#10201d] bg-[#f5b726] text-[#10201d] flex items-center justify-center shadow-[2px_2px_0_#10201d]">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-mono text-xs font-bold text-[#10201d] underline">Click to browse</span>
                    <span className="font-mono text-xs text-[#34433f]"> or drag and drop your PDF deck</span>
                  </div>
                  <p className="font-mono text-[10px] text-[#57726d]">
                    PDF, PPT, or PPTX up to 50MB • Direct download and presentation view
                  </p>
                </div>
              )}
            </div>
          )}

          {uploadError && (
            <div className="mt-2 p-2 border border-[#e53927] bg-[#f6c4c1] text-[#671912] font-mono text-xs flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-[#e53927]" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      ) : (
        /* External Link Input */
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              className="font-mono text-xs border-2 border-[#10201d] bg-white h-10 flex-1 shadow-[2px_2px_0_#10201d]"
            />
            {value && (
              <a
                href={ensureExternalUrl(value)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-xs font-bold px-3 py-2 border-2 border-[#10201d] bg-[#f5b726] hover:bg-[#ffcf66] text-[#10201d] shadow-[2px_2px_0_#10201d] inline-flex items-center gap-1 shrink-0"
                title="Verify link opens"
              >
                Open <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <p className="font-mono text-[10px] text-[#34433f]">
            Paste Google Drive, Canva, Figma, or Pitch.com link. Make sure link permissions are set to "Anyone with the link can view".
          </p>
        </div>
      )}
    </div>
  )
}
