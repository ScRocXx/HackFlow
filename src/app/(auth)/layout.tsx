import { Zap } from "lucide-react";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="flex items-center space-x-2 mb-8">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Zap className="h-6 w-6 text-white" />
        </div>
        <span className="text-2xl font-bold tracking-tight">HackFlow</span>
      </div>
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
