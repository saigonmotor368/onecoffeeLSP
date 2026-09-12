import type { Metadata, Viewport } from 'next'
import { Be_Vietnam_Pro, Playfair_Display, Dancing_Script } from 'next/font/google'
import './globals.css'
import { AppProvider } from '@/lib/providers'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'

const beVietnam = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  variable: '--font-sans',
  display: 'swap',
})

const dancingScript = Dancing_Script({
  subsets: ['latin', 'vietnamese'],
  weight: ['600', '700'],
  variable: '--font-artistic',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin', 'vietnamese'],
  weight: ['600', '700', '800'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'OneCoffeeLSP_Order — Cà Phê Ngon, Ngày Tươi Sáng',
  description: 'Đặt đồ uống One Coffee trong nhà máy LSP | Order One Coffee at LSP Factory',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'OneCoffeeLSP_Order',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icon-order-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-order-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-order-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-order-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'OneCoffeeLSP_Order',
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
    <html lang="vi" className={`${beVietnam.variable} ${dancingScript.variable} ${playfair.variable}`}>
      <body className={beVietnam.className}>
        <AppProvider>
          {children}
          <PWAInstallPrompt />
        </AppProvider>
      </body>
    </html>
  )
}

