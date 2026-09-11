'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useLang, useToast } from '@/lib/providers'
import { isValidPhone } from '@/lib/utils'
import styles from '../auth.module.css'

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTarget = searchParams.get('redirect') || '/home'
  const { t } = useLang()
  const { showToast } = useToast()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [showForgotModal, setShowForgotModal] = useState(false)

  const validate = () => {
    const e: Record<string, string> = {}
    if (!isValidPhone(phone)) e.phone = 'Số điện thoại không hợp lệ'
    if (password.length < 6) e.password = 'Mật khẩu tối thiểu 6 ký tự'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const supabase = createClient()
      const cleanPhone = phone.replace(/\s/g, '').replace(/[^0-9]/g, '')
      const email = `${cleanPhone}@onecoffee.vn`
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        showToast('Số điện thoại hoặc mật khẩu không đúng', 'error')
      } else {
        showToast('Đăng nhập thành công!', 'success')
        router.replace(redirectTarget)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          ←
        </button>
        <div className={styles.logoMini}>☕</div>
      </div>

      <div className={styles.content}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{t('login')}</h1>
          <p className={styles.subtitle}>
            {t('welcome_tagline')}
          </p>
        </div>

        <form onSubmit={handleLogin} className={styles.form}>
          <div className="input-group">
            <label className="input-label" htmlFor="phone">{t('phone')}</label>
            <input
              id="phone"
              type="tel"
              className={`input ${errors.phone ? 'input-error' : ''}`}
              placeholder={t('phone_placeholder')}
              value={phone}
              onChange={e => setPhone(e.target.value)}
              autoComplete="tel"
              inputMode="tel"
            />
            {errors.phone && <span className="error-text">{errors.phone}</span>}
          </div>

          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="input-label" htmlFor="password" style={{ marginBottom: 0 }}>{t('password')}</label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                style={{ background: 'none', border: 'none', color: '#1E4D3B', fontSize: '12px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                Quên mật khẩu?
              </button>
            </div>
            <input
              id="password"
              type="password"
              className={`input ${errors.password ? 'input-error' : ''}`}
              placeholder={t('password_placeholder')}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
          >
            {loading ? <><span className="spinner spinner-sm" />{t('loading')}</> : t('login')}
          </button>
        </form>

        <div className={styles.footer}>
          <span>{t('no_account')} </span>
          <Link href={`/auth/register${redirectTarget !== '/home' ? `?redirect=${encodeURIComponent(redirectTarget)}` : ''}`} className={styles.link}>
            {t('register')}
          </Link>
        </div>
      </div>

      {/* Hotline Forgot Password Modal */}
      {showForgotModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setShowForgotModal(false)}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              padding: '24px',
              maxWidth: '380px',
              width: '100%',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', fontSize: '32px', marginBottom: '8px' }}>📞</div>
            <h3 style={{ margin: '0 0 10px', fontSize: '17px', fontWeight: 800, color: '#1E4D3B', textAlign: 'center' }}>
              Quên mật khẩu đăng nhập?
            </h3>
            <p style={{ fontSize: '13px', color: '#4A5568', lineHeight: '1.6', margin: '0 0 16px', textAlign: 'center' }}>
              Do tài khoản được định danh theo Số điện thoại nội bộ, quý khách vui lòng liên hệ Hotline One Coffee để nhân viên hỗ trợ đặt lại mật khẩu trong 1 phút!
            </p>
            <div
              style={{
                background: '#F0FFF4',
                border: '1px solid #C6F6D5',
                borderRadius: '12px',
                padding: '12px',
                textAlign: 'center',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '12px', color: '#2F855A', fontWeight: 700 }}>HOTLINE HỖ TRỢ / ZALO</div>
              <a
                href="tel:0977999948"
                style={{ fontSize: '20px', fontWeight: 800, color: '#1E4D3B', textDecoration: 'none', display: 'block', marginTop: '4px' }}
              >
                0977 999 948
              </a>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #E2E8F0',
                  background: '#EDF2F7',
                  color: '#4A5568',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Đóng
              </button>
              <a
                href="tel:0977999948"
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#1E4D3B',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  textAlign: 'center',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                }}
              >
                <span>📞</span> Gọi ngay
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ padding: '48px', display: 'flex', justifyContent: 'center' }}><span className="spinner" /></div>}>
      <LoginContent />
    </Suspense>
  )
}
