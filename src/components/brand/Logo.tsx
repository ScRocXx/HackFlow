import React from 'react';
import { cn } from '@/lib/utils';

export function HackFlowIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg 
      className={cn("shrink-0", className)} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="hf-grad-1" x1="2" y1="4" x2="30" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3B82F6" />
          <stop offset="0.5" stopColor="#6366F1" />
          <stop offset="1" stopColor="#8B5CF6" />
        </linearGradient>
        <linearGradient id="hf-grad-2" x1="10" y1="6" x2="26" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#60A5FA" />
          <stop offset="1" stopColor="#A78BFA" />
        </linearGradient>
      </defs>
      
      {/* Background Rounded Shield / Hexagonal Flow Container */}
      <rect x="2" y="2" width="28" height="28" rx="7" fill="#0F172A" />
      
      {/* Code bracket slash & forward velocity chevrons */}
      <path 
        d="M9 11L14 16L9 21" 
        stroke="url(#hf-grad-1)" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <path 
        d="M17 11L22 16L17 21" 
        stroke="url(#hf-grad-2)" 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      {/* Dynamic timeline flow pulse dot */}
      <circle cx="23" cy="9" r="2" fill="#38BDF8" className="animate-pulse" />
    </svg>
  );
}

export function HackFlowLogo({ className = "", textClassName = "" }: { className?: string; textClassName?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <HackFlowIcon className="h-7 w-7" />
      <div className="flex items-center">
        <span className={cn("text-xl font-bold tracking-tight text-slate-900 dark:text-white font-mono", textClassName)}>
          Hack<span className="text-blue-500">Flow</span>
        </span>
      </div>
    </div>
  );
}
