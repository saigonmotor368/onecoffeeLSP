import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AppProvider } from '@/lib/providers'

export const metadata: Metadata = {
  title: 'One Coffee LSP — Order',
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
  themeColor: '#2D5A3D',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body>
        <AppProvider>
          {children}
        </AppProvider>
      </body>
    </html>
  )
}
