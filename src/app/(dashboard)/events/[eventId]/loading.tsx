import React from 'react'

export default function EventDetailLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="p-6 bg-[#2e4742] border-2 border-[#10201d] shadow-[6px_6px_0_#10201d] text-[#f7f7f2] space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="h-5 w-20 bg-[#3d5f58] border border-[#10201d]" />
          <div className="h-5 w-24 bg-[#3d5f58] border border-[#10201d]" />
          <div className="h-5 w-28 bg-[#f5b726] border border-[#10201d]" />
        </div>
        <div className="h-9 w-2/3 bg-[#3d5f58] border border-[#10201d]" />
        <div className="h-4 w-1/3 bg-[#3d5f58]" />
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Stage & Countdown Box */}
          <div className="p-6 border-2 border-[#10201d] bg-[#f7f7f2] shadow-[5px_5px_0_#10201d] space-y-4">
            <div className="flex justify-between items-center">
              <div className="h-6 w-48 bg-[#e4e5da]" />
              <div className="h-6 w-24 bg-[#e4e5da]" />
            </div>
            <div className="h-20 bg-[#f2f2eb] border-2 border-[#10201d]" />
          </div>

          {/* Checklist Box */}
          <div className="p-6 border-2 border-[#10201d] bg-[#f7f7f2] shadow-[5px_5px_0_#10201d] space-y-3">
            <div className="h-6 w-40 bg-[#e4e5da] mb-4" />
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-10 bg-[#f2f2eb] border border-[#10201d]" />
            ))}
          </div>
        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-6">
          {/* Team / Squad Box */}
          <div className="p-6 border-2 border-[#10201d] bg-[#f7f7f2] shadow-[5px_5px_0_#10201d] space-y-3">
            <div className="h-6 w-32 bg-[#e4e5da]" />
            <div className="h-12 bg-[#f2f2eb] border border-[#10201d]" />
            <div className="h-12 bg-[#f2f2eb] border border-[#10201d]" />
          </div>

          {/* Resources Box */}
          <div className="p-6 border-2 border-[#10201d] bg-[#f7f7f2] shadow-[5px_5px_0_#10201d] space-y-3">
            <div className="h-6 w-32 bg-[#e4e5da]" />
            <div className="h-8 bg-[#f2f2eb] border border-[#10201d]" />
            <div className="h-8 bg-[#f2f2eb] border border-[#10201d]" />
          </div>
        </div>
      </div>
    </div>
  )
}
