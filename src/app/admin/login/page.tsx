'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/providers'
import styles from './admin-login.module.css'

function AdminLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const err = searchParams.get('error')
    if (err === 'not_admin' || err === 'unauthorized') {
      setErrorMessage('Tài khoản này không có quyền Quản trị viên! Vui lòng dùng tài khoản Admin.')
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage('')

    const cleanEmail = email.trim().toLowerCase()
    const finalEmail = cleanEmail === 'admin'
      ? 'admin@onecoffee.vn'
      : cleanEmail.includes('@')
      ? cleanEmail
      : `${cleanEmail}@onecoffee.vn`

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: finalEmail,
        password: password.trim(),
      })

      if (error || !data.user) {
        console.error('Admin login error:', error)
        const isCredError = error?.message?.toLowerCase().includes('invalid login credentials')
        const detailedMsg = isCredError
          ? 'Email hoặc mật khẩu quản trị không chính xác!'
          : `Lỗi xác thực: ${error?.message || 'Không thể đăng nhập. Vui lòng kiểm tra cấu hình kết nối!'}`
        setErrorMessage(detailedMsg)
        showToast(detailedMsg, 'error')
        return
      }

      // Check admin role
      const isRoleAdmin =
        data.user.app_metadata?.role === 'admin' ||
        data.user.user_metadata?.role === 'admin' ||
        data.user.email === 'admin@onecoffee.vn' ||
        data.user.email?.startsWith('admin@')

      if (!isRoleAdmin) {
        await supabase.auth.signOut()
        setErrorMessage('Tài khoản này là tài khoản khách hàng, không có quyền truy cập trang Quản trị!')
        showToast('Không có quyền Admin', 'error')
        return
      }

      showToast('Đăng nhập Quản trị viên thành công! ☕', 'success')
      router.replace('/admin')
    } catch {
      setErrorMessage('Lỗi kết nối máy chủ xác thực. Vui lòng thử lại!')
      showToast('Lỗi kết nối máy chủ', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fillDefaultAdmin = () => {
    setEmail('admin@onecoffee.vn')
    setPassword('admin@123')
    setErrorMessage('')
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}>☕</div>
          <h1 className={styles.title}>ONE COFFEE</h1>
          <p className={styles.subtitle}>Cổng Quản Trị Hệ Thống</p>
        </div>

        {errorMessage && (
          <div
            style={{
              background: '#FEE2E2',
              border: '1px solid #FCA5A5',
              color: '#991B1B',
              borderRadius: '12px',
              padding: '12px 14px',
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '16px',
              lineHeight: 1.4,
            }}
          >
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className={styles.form}>
          <div className="input-group">
            <label className="input-label">Tài khoản Admin / Email</label>
            <input
              type="text"
              className="input"
              placeholder="admin@onecoffee.vn hoặc admin"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label">Mật khẩu Quản trị</label>
            <input
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner spinner-sm" />
                Đang kiểm tra quyền Admin...
              </>
            ) : (
              'Đăng nhập Quản Trị'
            )}
          </button>
        </form>

        {/* Demo Admin Quick Fill */}
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button
            type="button"
            onClick={fillDefaultAdmin}
            style={{
              background: 'none',
              border: '1px dashed #CBD5E1',
              color: '#475569',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            🔑 Điền nhanh tài khoản Admin mặc định
          </button>
        </div>

        <p className={styles.note}>
          Trang quản trị dành riêng cho nhân viên và quản lý One Coffee.<br />
          Khách hàng đặt món? <a href="/home">Mở menu đặt đồ uống</a>
        </p>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0F172A' }} />}>
      <AdminLoginContent />
    </Suspense>
  )
}
