'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react'
import Link from 'next/link'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard runtime error:', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="p-4 rounded-2xl bg-red-50 text-red-600 border border-red-100 mb-4 shadow-sm">
        <AlertTriangle className="h-10 w-10" />
      </div>
      <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
      <p className="text-sm text-slate-500 max-w-md mb-6">
        {error.message || 'An unexpected error occurred while loading this page.'}
      </p>
      <div className="flex gap-3">
        <Button onClick={() => reset()} className="bg-blue-600 hover:bg-blue-700 text-xs font-semibold h-9">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Try Again
        </Button>
        <Link href="/dashboard">
          <Button variant="outline" className="text-xs font-semibold h-9">
            <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" /> Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}
