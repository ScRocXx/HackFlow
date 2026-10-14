import React from "react";
import Link from "next/link";
import { HackFlowLogo } from "@/components/brand/Logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-hack-ink p-4 relative overflow-hidden selection:bg-hack-coral selection:text-white">
      <div className="relative z-10 flex flex-col items-center mb-8">
        <Link href="/" className="flex items-center">
          <HackFlowLogo textClassName="text-hack-sand" size="lg" />
        </Link>
        <p className="font-mono text-xs text-hack-sand/60 tracking-wider mt-2">
          Built for teams that&apos;d rather build than panic
        </p>
      </div>

      <div className="w-full max-w-md relative z-10">
        {children}
      </div>
    </div>
  );
}

