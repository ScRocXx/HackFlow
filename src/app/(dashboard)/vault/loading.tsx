import React from 'react'

export default function VaultLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-pulse">
      {/* Top Banner */}
      <div className="p-6 bg-[#2e4742] border-2 border-[#10201d] shadow-[5px_5px_0_#10201d] flex justify-between items-center">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-[#3d5f58]" />
          <div className="h-4 w-72 bg-[#3d5f58]" />
        </div>
        <div className="h-10 w-44 bg-[#f5b726] border-2 border-[#10201d]" />
      </div>

      {/* Squad Selector */}
      <div className="p-4 border-2 border-[#10201d] bg-[#f7f7f2] shadow-[4px_4px_0_#10201d] flex items-center gap-3">
        <div className="h-5 w-24 bg-[#e4e5da]" />
        <div className="h-9 w-48 bg-[#e4e5da] border border-[#10201d]" />
      </div>

      {/* Asset Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="p-5 border-2 border-[#10201d] bg-[#f7f7f2] shadow-[5px_5px_0_#10201d] space-y-3 h-48 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="h-5 w-24 bg-[#8bb2de]" />
              <div className="h-6 w-3/4 bg-[#e4e5da]" />
            </div>
            <div className="h-4 w-1/2 bg-[#e4e5da]" />
          </div>
        ))}
      </div>
    </div>
  )
}
