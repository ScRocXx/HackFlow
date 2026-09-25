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
 * Official HackFlow Stopwatch Emblem:
 * Authentic brand asset featuring the stopwatch silhouette with dual kinetic
 * sprint flow arrows (crimson & steel blue) and high-voltage lightning bolt dial.
 */
export function HackFlowEmblem({
  className = "w-8 h-8",
  variant = "dark",
  alt = "HackFlow"
}: {
  className?: string;
  variant?: "dark" | "light";
  alt?: string;
}) {
  return (
    <div className={cn("relative inline-flex items-center justify-center shrink-0 select-none", className)}>
      <img
        src="/brand/hackflow_emblem.png"
        alt={alt}
        className="w-full h-full object-contain filter drop-shadow-[2px_2px_0px_rgba(16,32,29,0.4)]"
      />
    </div>
  );
}

/**
 * Render the official HackFlow brand asset (emblem or full wordmark logo)
 */
export function HackFlowImageLogo({
  className = "w-8 h-8",
  type = "emblem"
}: {
  className?: string;
  type?: "emblem" | "full";
}) {
  const src = type === "full" ? "/brand/hackflow_logo.png" : "/brand/hackflow_emblem.png";
  return (
    <div className={cn("relative inline-flex items-center justify-center shrink-0 select-none", className)}>
      <img
        src={src}
        alt="HackFlow"
        className="w-full h-full object-contain filter drop-shadow-[2px_2px_0px_rgba(16,32,29,0.4)]"
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
      <HackFlowEmblem className={iconSizes[size]} />
      <div className="flex items-center tracking-tight">
        <span className={cn("font-display font-extrabold uppercase text-[#10201d] flex items-center tracking-tight", textSizes[size], textClassName)}>
          HACK<span className="text-[#e53927]">FLOW</span>
        </span>
      </div>
    </div>
  );
}
