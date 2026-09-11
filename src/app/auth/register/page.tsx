'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useLang, useToast } from '@/lib/providers'
import { isValidPhone } from '@/lib/utils'
import styles from '../auth.module.css'

export default function RegisterPage() {
  const router = useRouter()
  const { t, lang } = useLang()
  const { showToast } = useToast()
  const [form, setForm] = useState({
    phone: '', password: '', confirm_password: '',
    full_name: '', default_delivery_address: '',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const update = (field: string, val: string) =>
    setForm(f => ({ ...f, [field]: val }))

  const validate = () => {
    const e: Record<string, string> = {}
    if (!isValidPhone(form.phone)) e.phone = 'Số điện thoại không hợp lệ'
    if (form.full_name.trim().length < 2) e.full_name = 'Vui lòng nhập họ tên'
    if (form.password.length < 6) e.password = 'Mật khẩu tối thiểu 6 ký tự'
    if (form.password !== form.confirm_password) e.confirm_password = 'Mật khẩu không khớp'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const cleanPhone = form.phone.replace(/\s/g, '').replace(/[^0-9]/g, '')
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          full_name: form.full_name,
          password: form.password,
          default_delivery_address: form.default_delivery_address,
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        showToast(data.error || 'Lỗi đăng ký tài khoản', 'error')
        if (data.alreadyRegistered) {
          router.push('/auth/login')
        }
        return
      }

      // Auto login
      const supabase = createClient()
      const email = `${cleanPhone}@onecoffee.vn`
      await supabase.auth.signInWithPassword({ email, password: form.password })

      // Save customer info to localStorage for instant reuse
      localStorage.setItem('oc_customer_name', form.full_name.trim())
      localStorage.setItem('oc_customer_phone', cleanPhone)
      if (form.default_delivery_address) {
        localStorage.setItem('oc_delivery_location', form.default_delivery_address.trim())
      }

      showToast('Đăng ký tài khoản thành công!', 'success')
      router.replace('/home')
    } catch {
      showToast('Không thể kết nối đến máy chủ đăng ký', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()}>←</button>
        <div className={styles.logoMini}>☕</div>
      </div>

      <div className={styles.content}>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>{t('register')}</h1>
          <p className={styles.subtitle}>Tạo tài khoản để đặt hàng nhanh hơn</p>
        </div>

        <form onSubmit={handleRegister} className={styles.form}>
          <div className="input-group">
            <label className="input-label" htmlFor="reg-phone">{t('phone')}</label>
            <input id="reg-phone" type="tel" className={`input ${errors.phone ? 'input-error' : ''}`}
              placeholder={t('phone_placeholder')} value={form.phone}
              onChange={e => update('phone', e.target.value)} inputMode="tel" autoComplete="tel" />
            {errors.phone && <span className="error-text">{errors.phone}</span>}
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="reg-name">{t('full_name')}</label>
            <input id="reg-name" type="text" className={`input ${errors.full_name ? 'input-error' : ''}`}
              placeholder={t('full_name_placeholder')} value={form.full_name}
              onChange={e => update('full_name', e.target.value)} autoComplete="name" />
            {errors.full_name && <span className="error-text">{errors.full_name}</span>}
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="reg-addr">{t('default_address')}</label>
            <input id="reg-addr" type="text" className="input"
              placeholder={t('default_address_placeholder')} value={form.default_delivery_address}
              onChange={e => update('default_delivery_address', e.target.value)} />
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
              Có thể thay đổi khi đặt hàng
            </span>
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="reg-pw">{t('password')}</label>
            <input id="reg-pw" type="password" className={`input ${errors.password ? 'input-error' : ''}`}
              placeholder={t('password_placeholder')} value={form.password}
              onChange={e => update('password', e.target.value)} autoComplete="new-password" />
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>

          <div className="input-group">
            <label className="input-label" htmlFor="reg-cpw">Xác nhận mật khẩu</label>
            <input id="reg-cpw" type="password" className={`input ${errors.confirm_password ? 'input-error' : ''}`}
              placeholder="Nhập lại mật khẩu" value={form.confirm_password}
              onChange={e => update('confirm_password', e.target.value)} autoComplete="new-password" />
            {errors.confirm_password && <span className="error-text">{errors.confirm_password}</span>}
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading}>
            {loading ? <><span className="spinner spinner-sm" />{t('loading')}</> : t('register')}
          </button>
        </form>

        <p className={styles.switchText}>
          {t('already_have_account')}{' '}
          <Link href="/auth/login" className={styles.switchLink}>{t('login')}</Link>
        </p>
      </div>
    </div>
  )
}
