import type { Metadata } from 'next'
import { Barlow_Semi_Condensed, Martian_Mono, Inter } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { ToastProvider } from '@/components/ui/toast'

const barlow = Barlow_Semi_Condensed({
  subsets: ['latin'],
  weight: ['700', '800'],
  variable: '--font-barlow',
  display: 'swap',
})

const martianMono = Martian_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-martian',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'HackFlow | Built for Hackathons',
  description: "Stop losing hackathons to disorganization. Auto-extract rounds, deadlines, deliverables, and stay on schedule with your team.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={cn(barlow.variable, martianMono.variable, inter.variable)}>
      <body className="min-h-screen bg-[#f2f2eb] text-[#10201d] font-sans antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}

