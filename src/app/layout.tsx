import type { Metadata, Viewport } from 'next'
import { Plus_Jakarta_Sans, Caveat, Playfair_Display, Dancing_Script } from 'next/font/google'
import './globals.css'
import { AppProvider } from '@/lib/providers'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
})

const caveat = Caveat({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-artistic',
  display: 'swap',
})

const dancingScript = Dancing_Script({
  subsets: ['latin', 'vietnamese'],
  weight: ['600', '700'],
  variable: '--font-script',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin', 'vietnamese'],
  weight: ['700', '800', '900'],
  variable: '--font-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'One Coffee LSP — Cà Phê Ngon, Ngày Tươi Sáng',
  description: 'Đặt đồ uống One Coffee trong nhà máy LSP | Order One Coffee at LSP Factory',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo-circle.png',
    apple: '/logo-circle.png',
  },
  openGraph: {
    title: 'One Coffee LSP',
    description: 'Good Coffee — Brighter Workdays',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#1E4D3B',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi" className={`${jakarta.variable} ${caveat.variable} ${dancingScript.variable} ${playfair.variable}`}>
      <body className={jakarta.className}>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  )
}

