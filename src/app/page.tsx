'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import styles from './welcome.module.css'
import { useLang } from '@/lib/providers'

export default function WelcomePage() {
  const router = useRouter()
  const { lang, setLang, t } = useLang()

  // Auto redirect if already logged in
  useEffect(() => {
    // Check auth on client - redirect to home if session exists
    const checkSession = async () => {
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (session) router.replace('/home')
    }
    checkSession()
  }, [router])

  return (
    <div className={styles.page}>
      {/* Background coffee imagery */}
      <div className={styles.bg} />
      <div className={styles.overlay} />

      <div className={styles.content}>
        {/* Logo */}
        <div className={styles.logoWrap}>
          <div className={styles.logoCircle}>
            {/* SVG Logo inline from the logo images */}
            <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={styles.logoSvg}>
              {/* Cup */}
              <ellipse cx="100" cy="155" rx="52" ry="12" fill="currentColor" opacity="0.9"/>
              <path d="M55 120 Q58 155 100 162 Q142 155 145 120Z" fill="currentColor"/>
              {/* Cup handle */}
              <path d="M145 125 Q165 125 165 140 Q165 155 145 155" stroke="currentColor" strokeWidth="8" fill="none" strokeLinecap="round"/>
              {/* Cream swirl */}
              <path d="M75 120 Q85 95 100 90 Q115 95 125 120" fill="white" opacity="0.9"/>
              <path d="M80 115 Q88 100 100 95 Q112 100 120 115" fill="white"/>
              {/* Coffee bean */}
              <ellipse cx="100" cy="65" rx="28" ry="35" fill="currentColor"/>
              <path d="M100 32 Q85 65 100 98 Q115 65 100 32Z" fill="white" opacity="0.4"/>
              {/* Bean line */}
              <path d="M100 35 C96 50 96 80 100 95" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6"/>
            </svg>
          </div>
          <h1 className={styles.brandName}>ONE COFFEE</h1>
          <p className={styles.tagline}>{t('welcome_tagline')}</p>
        </div>

        {/* Language selector */}
        <div className={styles.langSelector}>
          <button
            className={`${styles.langBtn} ${lang === 'vi' ? styles.langActive : ''}`}
            onClick={() => setLang('vi')}
            aria-label="Tiếng Việt"
          >
            🇻🇳 Tiếng Việt
          </button>
          <button
            className={`${styles.langBtn} ${lang === 'en' ? styles.langActive : ''}`}
            onClick={() => setLang('en')}
            aria-label="English"
          >
            🇬🇧 English
          </button>
        </div>

        {/* CTA Buttons */}
        <div className={styles.actions}>
          <button
            className={`btn btn-primary btn-full btn-lg ${styles.ctaBtn}`}
            onClick={() => router.push('/home')}
          >
            {t('get_started')}
          </button>
          <button
            className={`btn btn-outline btn-full ${styles.loginBtn}`}
            onClick={() => router.push('/auth/login')}
          >
            {t('login')}
          </button>
        </div>

        {/* Tagline footer */}
        <p className={styles.footer}>
          Good Coffee — Brighter Workdays ✦ Since 2026
        </p>
      </div>
    </div>
  )
}
