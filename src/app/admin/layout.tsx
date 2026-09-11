import type { Metadata } from 'next'
import '../globals.css'
import './admin.css'
import { AppProvider } from '@/lib/providers'

export const metadata: Metadata = {
  title: 'One Coffee — Admin',
  description: 'One Coffee Order Management System',
  robots: 'noindex, nofollow',
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-root">
      {children}
    </div>
  )
}
