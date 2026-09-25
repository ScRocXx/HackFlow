import React from 'react';
import { cn } from '@/lib/utils';

export function HackFlowSquares({ className = "", size = "w-3 h-3" }: { className?: string; size?: string }) {
  return (
    <div className={cn("inline-flex items-center gap-1 shrink-0", className)} aria-hidden="true">
      <span className={cn(size, "bg-[#e53927] inline-block shadow-[1px_1px_0px_#10201d]")} />
      <span className={cn(size, "bg-[#8bb2de] inline-block shadow-[1px_1px_0px_#10201d]")} />
      <span className={cn(size, "bg-[#f5b726] inline-block shadow-[1px_1px_0px_#10201d]")} />
      <span className={cn(size, "bg-[#e97b77] inline-block shadow-[1px_1px_0px_#10201d]")} />
    </div>
  );
}

/**
 * Scalable retro-brutalist vector emblem:
 * Circular stopwatch housing with dynamic lightning bolt and cyclic flow tracks.
 */
export function HackFlowEmblem({
  className = "w-8 h-8",
  variant = "dark"
}: {
  className?: string;
  variant?: "dark" | "light";
}) {
  const isDarkBg = variant === "light";
  const bg = isDarkBg ? "#f7f7f2" : "#10201d";
  const ring = isDarkBg ? "#e53927" : "#8bb2de";
  const bolt = "#f5b726";
  const tick = isDarkBg ? "#10201d" : "#f7f7f2";

  return (
    <div className={cn("relative inline-flex items-center justify-center shrink-0 select-none", className)}>
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-[2px_2px_0px_#10201d]">
        {/* Outer stopwatch top crown */}
        <rect x="21" y="2" width="6" height="4" rx="1" fill={bg} stroke="#10201d" strokeWidth="2" />
        <rect x="33" y="5" width="4" height="4" rx="1" transform="rotate(30 33 5)" fill="#e53927" stroke="#10201d" strokeWidth="1.5" />

        {/* Outer circle casing */}
        <circle cx="24" cy="26" r="19" fill={bg} stroke="#10201d" strokeWidth="3" />
        
        {/* Segmented sprint track */}
        <circle cx="24" cy="26" r="14.5" stroke={ring} strokeWidth="2.5" strokeDasharray="16 6" strokeLinecap="round" />

        {/* Stopwatch tick marks */}
        <line x1="24" y1="13" x2="24" y2="15.5" stroke={tick} strokeWidth="2" strokeLinecap="round" />
        <line x1="37" y1="26" x2="34.5" y2="26" stroke={tick} strokeWidth="2" strokeLinecap="round" />
        <line x1="24" y1="39" x2="24" y2="36.5" stroke={tick} strokeWidth="2" strokeLinecap="round" />
        <line x1="11" y1="26" x2="13.5" y2="26" stroke={tick} strokeWidth="2" strokeLinecap="round" />

        {/* Central dynamic lightning bolt */}
        <path
          d="M25.5 15L17 26.5H23.5L22.5 37L31 25.5H24.5L25.5 15Z"
          fill={bolt}
          stroke="#10201d"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />

        {/* Accent mini-dot */}
        <circle cx="33" cy="18" r="2" fill="#e53927" stroke="#10201d" strokeWidth="1" />
      </svg>
    </div>
  );
}

/**
 * Render the aesthetic generated image asset with a brutalist frame
 */
export function HackFlowImageLogo({
  className = "w-8 h-8",
  type = "emblem"
}: {
  className?: string;
  type?: "emblem" | "full";
}) {
  const src = type === "full" ? "/brand/hackflow_logo.jpg" : "/brand/hackflow_emblem.jpg";
  return (
    <div className={cn("relative overflow-hidden rounded-md border-2 border-[#10201d] shadow-[2px_2px_0px_#10201d] bg-[#10201d] shrink-0", className)}>
      <img
        src={src}
        alt="HackFlow"
        className="w-full h-full object-cover"
      />
    </div>
  );
}

export function HackFlowIcon({ className = "h-7 w-7" }: { className?: string }) {
  return <HackFlowEmblem className={className} />;
}

export function HackFlowLogo({
  className = "",
  textClassName = "",
  showImage = true,
  size = "md"
}: {
  className?: string;
  textClassName?: string;
  showImage?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-8 h-8",
    lg: "w-10 h-10"
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-xl sm:text-2xl",
    lg: "text-2xl sm:text-3xl"
  };

  return (
    <div className={cn("flex items-center gap-2.5 select-none group", className)}>
      {showImage ? (
        <HackFlowImageLogo className={iconSizes[size]} />
      ) : (
        <HackFlowEmblem className={iconSizes[size]} />
      )}
      <div className="flex items-center tracking-tight">
        <span className={cn("font-display font-extrabold uppercase text-[#10201d] flex items-center tracking-tight", textSizes[size], textClassName)}>
          HACK<span className="text-[#e53927]">FLOW</span>
        </span>
      </div>
    </div>
  );
}
