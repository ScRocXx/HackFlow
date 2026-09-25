import type { Metadata, Viewport } from 'next'
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

export const viewport: Viewport = {
  themeColor: '#10201d',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  title: 'HackFlow | Built for Hackathons',
  description: "Stop losing hackathons to disorganization. Auto-extract rounds, deadlines, deliverables, and stay on schedule with your team.",
  icons: {
    icon: [
      { url: '/brand/hackflow_emblem.png?v=3', type: 'image/png' },
      { url: '/brand/hackflow_emblem.jpg?v=3' },
      { url: '/favicon.ico?v=3', sizes: 'any' },
    ],
    shortcut: '/brand/hackflow_emblem.png?v=3',
    apple: [
      { url: '/apple-icon.png?v=3' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={cn(barlow.variable, martianMono.variable, inter.variable)}>
      <head>
        <link rel="icon" type="image/png" href="/brand/hackflow_emblem.png?v=3" />
        <link rel="icon" type="image/jpeg" href="/brand/hackflow_emblem.jpg?v=3" />
        <link rel="shortcut icon" href="/brand/hackflow_emblem.png?v=3" />
        <link rel="apple-touch-icon" href="/apple-icon.png?v=3" />
      </head>
      <body className="min-h-screen bg-[#f2f2eb] text-[#10201d] font-sans antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
