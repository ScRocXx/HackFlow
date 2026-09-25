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
 * Scalable Neo-Brutalist Vector Emblem for HackFlow:
 * Deep ink octagonal shield, dual kinetic sprint flow chevrons (Crimson & Steel Blue),
 * and high-voltage solar amber lightning bolt with tactical telemetry markers.
 */
export function HackFlowEmblem({
  className = "w-8 h-8",
  variant = "dark"
}: {
  className?: string;
  variant?: "dark" | "light";
}) {
  const isLight = variant === "light";
  const badgeBg = isLight ? "#f7f7f2" : "#10201d";
  const innerBg = isLight ? "#ffffff" : "#182d28";
  const rimStroke = isLight ? "#d1d5db" : "#2e4742";
  const inkStroke = "#10201d";
  const boltColor = "#f5b726";
  const crimsonFlow = "#e53927";
  const cyanFlow = "#8bb2de";
  const dotColor = isLight ? "#10201d" : "#f7f7f2";

  return (
    <div className={cn("relative inline-flex items-center justify-center shrink-0 select-none", className)}>
      <svg 
        viewBox="0 0 64 64" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg" 
        className="w-full h-full drop-shadow-[2px_2px_0px_#10201d]"
      >
        {/* Outer Brutalist Badge Foundation */}
        <rect x="4" y="4" width="56" height="56" rx="14" fill={badgeBg} stroke={inkStroke} strokeWidth="2.5" />
        <rect x="6.5" y="6.5" width="51" height="51" rx="11.5" fill={innerBg} stroke={rimStroke} strokeWidth="1.5" />

        {/* Dual Kinetic Flow Arcs (Sprint Velocity) */}
        {/* Upper-left Crimson Flow Track */}
        <path d="M14 18L26 18L21 26L11 26L14 18Z" fill={crimsonFlow} />
        <circle cx="12" cy="14" r="2" fill={crimsonFlow} />

        {/* Lower-right Steel Blue Flow Track */}
        <path d="M43 38L53 38L48 46L38 46L43 38Z" fill={cyanFlow} />
        <circle cx="52" cy="50" r="2" fill={cyanFlow} />

        {/* High-Voltage Central Lightning Bolt */}
        <path 
          d="M37 11L19 32H31L25 53L47 28H34L37 11Z" 
          fill={boltColor} 
          stroke={inkStroke} 
          strokeWidth="2.5" 
          strokeLinejoin="round" 
          strokeLinecap="round" 
        />

        {/* High-contrast Tactical Telemetry Dots */}
        <circle cx="18" cy="48" r="2" fill={dotColor} />
        <circle cx="48" cy="16" r="2" fill={boltColor} />
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
    <div className={cn("relative overflow-hidden rounded-md border-2 border-[#10201d] shadow-[2px_2px_0_#10201d] bg-[#10201d] shrink-0", className)}>
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
  showImage = false,
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
