import React from "react";
import { HackFlowLogo } from "@/components/brand/Logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 p-4">
      <div className="flex items-center space-x-2 mb-8">
        <HackFlowLogo textClassName="text-white text-2xl" />
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
