'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/providers'
import styles from './admin-login.module.css'

export default function AdminLoginPage() {
  const router = useRouter()
  const { showToast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        showToast('Email hoặc mật khẩu không đúng', 'error')
      } else {
        router.replace('/admin')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoArea}>
          <div className={styles.logoIcon}>☕</div>
          <h1 className={styles.title}>ONE COFFEE</h1>
          <p className={styles.subtitle}>Admin Management</p>
        </div>

        <form onSubmit={handleLogin} className={styles.form}>
          <div className="input-group">
            <label className="input-label">Email Admin</label>
            <input
              type="email"
              className="input"
              placeholder="admin@onecoffee.vn"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="input-group">
            <label className="input-label">Mật khẩu</label>
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
            {loading ? <><span className="spinner spinner-sm" />Đang đăng nhập...</> : 'Đăng nhập'}
          </button>
        </form>

        <p className={styles.note}>
          Trang quản lý dành riêng cho nhân viên One Coffee.<br />
          Không phải nhân viên? <a href="/">Đặt đồ uống tại đây</a>
        </p>
      </div>
    </div>
  )
}
