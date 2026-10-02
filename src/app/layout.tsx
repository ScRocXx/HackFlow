import type { Metadata, Viewport } from 'next'
import { Space_Grotesk, Martian_Mono, Inter } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { ToastProvider } from '@/components/ui/toast'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-space',
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
  themeColor: '#172522',
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
    <html lang="en" className={cn(spaceGrotesk.variable, martianMono.variable, inter.variable, '[--font-barlow:var(--font-space)]')}>
      <head>
        <link rel="icon" type="image/png" href="/brand/hackflow_emblem.png?v=3" />
        <link rel="icon" type="image/jpeg" href="/brand/hackflow_emblem.jpg?v=3" />
        <link rel="shortcut icon" href="/brand/hackflow_emblem.png?v=3" />
        <link rel="apple-touch-icon" href="/apple-icon.png?v=3" />
      </head>
      <body className="min-h-screen bg-[#F6F1E7] text-[#172522] font-sans antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
