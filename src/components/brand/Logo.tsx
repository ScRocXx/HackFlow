import React from 'react';
import { cn } from '@/lib/utils';

export function HackFlowSquares({ className = "", size = "w-3 h-3" }: { className?: string; size?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-0.5 shrink-0", className)} aria-hidden="true">
      <span className={cn(size, "bg-[#e53927] inline-block")} />
      <span className={cn(size, "bg-[#8bb2de] inline-block")} />
      <span className={cn(size, "bg-[#f5b726] inline-block")} />
      <span className={cn(size, "bg-[#e97b77] inline-block")} />
    </div>
  );
}

export function HackFlowIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-1 bg-[#10201d] border-2 border-[#10201d] shadow-[3px_3px_0_#671912]", className)}>
      <div className="grid grid-cols-2 gap-0.5">
        <span className="w-2.5 h-2.5 bg-[#e53927]" />
        <span className="w-2.5 h-2.5 bg-[#8bb2de]" />
        <span className="w-2.5 h-2.5 bg-[#f5b726]" />
        <span className="w-2.5 h-2.5 bg-[#e97b77]" />
      </div>
    </div>
  );
}

export function HackFlowLogo({ className = "", textClassName = "" }: { className?: string; textClassName?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      <HackFlowSquares size="w-3.5 h-3.5" />
      <div className="flex items-center">
        <span className={cn("font-display text-2xl font-extrabold uppercase tracking-tight text-[#10201d]", textClassName)}>
          HACK<span className="text-[#e97b77]">FLOW</span>
          <span className="text-xs font-mono ml-1 px-1.5 py-0.5 border border-current rounded font-bold text-[#8bb2de]">2026</span>
        </span>
      </div>
    </div>
  );
}

