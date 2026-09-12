import React from 'react'

export default function FriendsLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-pulse">
      {/* Top Banner */}
      <div className="p-6 bg-[#2e4742] border-2 border-[#10201d] shadow-[5px_5px_0_#10201d] space-y-2">
        <div className="h-4 w-20 bg-[#f5b726]" />
        <div className="h-8 w-64 bg-[#3d5f58]" />
        <div className="h-4 w-96 bg-[#3d5f58]" />
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-2 border-b-2 border-[#10201d] pb-2">
        <div className="h-10 w-32 bg-[#e97b77] border-2 border-[#10201d]" />
        <div className="h-10 w-32 bg-[#e4e5da] border-2 border-[#10201d]" />
      </div>

      {/* List Skeleton */}
      <div className="space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-4 border-2 border-[#10201d] bg-[#f7f7f2] shadow-[4px_4px_0_#10201d] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-[#e4e5da] border-2 border-[#10201d]" />
              <div className="space-y-1.5">
                <div className="h-4 w-36 bg-[#e4e5da]" />
                <div className="h-3 w-48 bg-[#e4e5da]" />
              </div>
            </div>
            <div className="h-8 w-20 bg-[#e4e5da] border border-[#10201d]" />
          </div>
        ))}
      </div>
    </div>
  )
}
