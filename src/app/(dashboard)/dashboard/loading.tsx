import React from 'react'

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse max-w-7xl mx-auto">
      {/* Top Banner / URL Input Skeleton */}
      <div className="p-6 bg-[#2e4742] border-2 border-[#10201d] shadow-[5px_5px_0_#10201d]">
        <div className="h-6 w-48 bg-[#3d5f58] border border-[#10201d] mb-4" />
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="h-12 flex-1 bg-[#3d5f58] border-2 border-[#10201d]" />
          <div className="h-12 w-32 bg-[#f5b726] border-2 border-[#10201d] shadow-[3px_3px_0_#8a5d13]" />
        </div>
      </div>

      {/* Stats Row Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div 
            key={i} 
            className="p-4 border-2 border-[#10201d] bg-[#f7f7f2] shadow-[4px_4px_0_#10201d] space-y-2"
          >
            <div className="h-4 w-28 bg-[#e4e5da]" />
            <div className="h-8 w-16 bg-[#e4e5da]" />
          </div>
        ))}
      </div>

      {/* Events Grid Skeleton */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-7 w-40 bg-[#e4e5da] border border-[#10201d]" />
          <div className="h-7 w-24 bg-[#e4e5da] border border-[#10201d]" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div 
              key={i} 
              className="border-2 border-[#10201d] bg-[#f7f7f2] shadow-[6px_6px_0_#671912] h-[380px] flex flex-col"
            >
              <div className="h-32 bg-[#2e4742] border-b-2 border-[#10201d]" />
              <div className="p-5 flex-1 space-y-4">
                <div className="space-y-2">
                  <div className="h-6 w-3/4 bg-[#e4e5da]" />
                  <div className="h-4 w-1/2 bg-[#e4e5da]" />
                </div>
                <div className="h-16 bg-[#f2f2eb] border-2 border-[#10201d]" />
                <div className="h-3 bg-[#e4e5da] border border-[#10201d]" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
