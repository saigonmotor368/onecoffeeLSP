import type { Metadata, Viewport } from 'next'
import '../globals.css'
import './admin.css'
import AdminAuthGuard from '@/components/AdminAuthGuard'

export const metadata: Metadata = {
  title: 'OneCoffeeLSP_Admin — Quản Trị Hệ Thống',
  description: 'Trung tâm điều hành và quản lý đơn hàng One Coffee LSP',
  robots: 'noindex, nofollow',
  manifest: '/manifest-admin.json',
  appleWebApp: {
    capable: true,
    title: 'OneCoffeeLSP_Admin',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icon-admin-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-admin-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icon-admin-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-admin-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0F172A',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-root">
      <AdminAuthGuard>
        {children}
      </AdminAuthGuard>
    </div>
  )
}
