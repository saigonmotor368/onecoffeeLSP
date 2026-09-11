import type { Metadata } from 'next'
import '../globals.css'
import './admin.css'
import AdminAuthGuard from '@/components/AdminAuthGuard'

export const metadata: Metadata = {
  title: 'One Coffee — Admin Management',
  description: 'One Coffee Order Management System',
  robots: 'noindex, nofollow',
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
