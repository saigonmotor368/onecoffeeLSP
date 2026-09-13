'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AdminPushInitializer from '@/components/AdminPushInitializer'

export default function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [authorized, setAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    // If we're on the login page itself, don't guard it
    if (pathname === '/admin/login') {
      setAuthorized(true)
      return
    }

    const checkAdmin = async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()

        if (!session?.user) {
          router.replace('/admin/login')
          return
        }

        const u = session.user
        const isRoleAdmin =
          u.app_metadata?.role === 'admin' ||
          u.user_metadata?.role === 'admin' ||
          u.email === 'admin@onecoffee.vn' ||
          u.email?.startsWith('admin@')

        if (!isRoleAdmin) {
          // Customer account attempting to view admin
          await supabase.auth.signOut()
          router.replace('/admin/login?error=not_admin')
          return
        }

        setAuthorized(true)
      } catch {
        router.replace('/admin/login')
      }
    }

    checkAdmin()
  }, [pathname, router])

  if (pathname === '/admin/login') {
    return <>{children}</>
  }

  if (authorized === null) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#0F172A',
          color: '#E2E8F0',
          fontFamily: 'var(--font-sans), system-ui, sans-serif',
          gap: '16px',
        }}
      >
        <span className="spinner spinner-lg" style={{ borderColor: 'rgba(255,255,255,0.2)', borderTopColor: '#22c55e' }} />
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#94A3B8' }}>
          Đang xác thực quyền Quản trị viên...
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Auto-subscribe admin to Web Push for new order notifications */}
      <AdminPushInitializer />
      {children}
    </>
  )
}
