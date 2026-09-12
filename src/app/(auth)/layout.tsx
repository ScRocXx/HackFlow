import React from "react";
import Link from "next/link";
import { HackFlowLogo } from "@/components/brand/Logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#3d5f58] p-4 relative overflow-hidden selection:bg-[#e97b77] selection:text-[#10201d]">
      {/* Decorative Corner Pixel SVGs */}
      <div aria-hidden="true" className="absolute top-0 left-0 pointer-events-none opacity-30 w-32 sm:w-48">
        <svg viewBox="0 0 317.71 293.34" fill="none">
          <path d="M122.2 195.59H73.32V244.47H122.2V195.59Z" fill="#F7F7F2" />
          <path d="M73.32 244.46H24.44V293.34H73.32V244.46Z" fill="#F7F7F2" />
          <path d="M146.63 48.88H171.07V0H146.63V48.88Z" fill="#E53927" />
          <path d="M97.76 48.88H122.2V0H97.76V48.88Z" fill="#E53927" />
          <path d="M48.88 48.88H73.32V0H48.88V48.88Z" fill="#E53927" />
        </svg>
      </div>

      <div aria-hidden="true" className="absolute bottom-0 right-0 pointer-events-none opacity-30 w-32 sm:w-48">
        <svg viewBox="0 0 317.94 293.26" fill="none">
          <path d="M49.11 244.38H0V293.26H49.11V244.38Z" fill="#F7F7F2" />
          <path d="M97.99 195.51H49.11V244.39H97.99V195.51Z" fill="#F7F7F2" />
          <path d="M171.31 244.38H146.87V293.26H171.31V244.38Z" fill="#E53927" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col items-center mb-8">
        <Link href="/" className="flex items-center">
          <HackFlowLogo textClassName="text-[#f7f7f2]" size="lg" />
        </Link>
        <p className="font-mono text-xs text-[#8bb2de] tracking-wider mt-2">
          Built for teams that'd rather build than panic
        </p>
      </div>

      <div className="w-full max-w-md relative z-10">
        {children}
      </div>
    </div>
  );
}

