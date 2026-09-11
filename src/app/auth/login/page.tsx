'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useLang, useToast } from '@/lib/providers'
import { isValidPhone } from '@/lib/utils'
import styles from '../auth.module.css'

export default function LoginPage() {
  const router = useRouter()
  const { t } = useLang()
  const { showToast } = useToast()
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

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
      // Use phone as email (phone@onecoffee.internal)
      const email = `${phone.replace(/\s/g, '')}@lsp.internal`
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        showToast('Số điện thoại hoặc mật khẩu không đúng', 'error')
      } else {
        showToast('Đăng nhập thành công!', 'success')
        router.replace('/home')
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
            <label className="input-label" htmlFor="password">{t('password')}</label>
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

        <p className={styles.switchText}>
          {t('no_account')}{' '}
          <Link href="/auth/register" className={styles.switchLink}>
            {t('register')}
          </Link>
        </p>
      </div>
    </div>
  )
}
