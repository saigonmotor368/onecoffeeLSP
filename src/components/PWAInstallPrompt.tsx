'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import styles from './pwa-install.module.css'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallPrompt() {
  const pathname = usePathname()
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [showSteps, setShowSteps] = useState(false)

  const isAdmin = pathname.startsWith('/admin')
  const appName = isAdmin ? 'One Coffee Admin' : 'One Coffee LSP'
  const appIcon = isAdmin ? '/icon-admin-192.png' : '/icon-order-192.png'

  useEffect(() => {
    // 1. Check if already running in standalone mode (PWA installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true

    if (isStandalone) {
      setIsInstalled(true)
    }

    // 2. Check if iOS device
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isAppleDevice)

    // 3. Check URL query parameters (e.g. from scanning QR code: ?action=install or ?install=1)
    const urlParams = new URLSearchParams(window.location.search)
    const forceInstall = urlParams.get('action') === 'install' || urlParams.get('install') === '1'

    // 4. Capture native beforeinstallprompt event (Android, Chrome, Edge)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)

      if (forceInstall) {
        setIsInstalled(false)
        setShowModal(true)
      }
    }

    // 5. Allow any button (like Admin Sidebar or manual prompt) to trigger installation modal
    const handleCustomTrigger = () => {
      setIsInstalled(false)
      setShowModal(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('open-pwa-install', handleCustomTrigger)

    // If forced via QR code, trigger modal
    if (forceInstall) {
      const timer = setTimeout(() => {
        setIsInstalled(false)
        setShowModal(true)
        if (isAppleDevice) setShowSteps(true)
      }, 300)
      return () => {
        clearTimeout(timer)
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
        window.removeEventListener('open-pwa-install', handleCustomTrigger)
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('open-pwa-install', handleCustomTrigger)
    }
  }, [pathname])

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowSteps(true)
      return
    }

    if (!deferredPrompt) {
      // Fallback: show platform-specific steps
      setShowSteps(true)
      return
    }

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowModal(false)
      }
      setDeferredPrompt(null)
    } catch {
      setShowSteps(true)
    }
  }

  const handleDismiss = () => {
    setShowModal(false)
  }

  if (isInstalled || !showModal) {
    return null
  }

  return (
    <div className={styles.backdrop} onClick={handleDismiss}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={handleDismiss}
          aria-label="Đóng"
        >
          ✕
        </button>

        <div className={styles.iconWrapper}>
          <img src={appIcon} alt={appName} className={styles.appIcon} />
        </div>

        <div className={styles.badgeHighlight}>
          ✨ Ứng dụng chính thức One Coffee
        </div>

        <h3 className={styles.title}>Cài Đặt App {appName}</h3>
        <p className={styles.subtitle}>
          {isAdmin
            ? 'Thêm Cổng Quản Trị ra màn hình chính để duyệt đơn, nhận chuông báo và quản lý quán tiện lợi nhất!'
            : 'Thêm vào màn hình chính để đặt đồ uống nhanh 1 chạm, theo dõi shipper giao nước tận xưởng!'}
        </p>

        {showSteps ? (
          isIOS ? (
            <div className={styles.iosGuideBox}>
              <div className={styles.iosStep}>
                <span className={styles.iosStepNum}>1</span>
                <div>
                  Chạm vào biểu tượng <strong>Chia sẻ</strong>{' '}
                  <span className={styles.iosShareIcon}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  </span>{' '}
                  ở thanh công cụ Safari (dưới cùng màn hình).
                </div>
              </div>
              <div className={styles.iosStep}>
                <span className={styles.iosStepNum}>2</span>
                <div>
                  Cuộn xuống chọn dòng <strong>"Thêm vào MH chính" (Add to Home Screen)</strong>.
                </div>
              </div>
              <div className={styles.iosStep}>
                <span className={styles.iosStepNum}>3</span>
                <div>
                  Nhấn nút <strong>"Thêm" (Add)</strong> ở góc trên bên phải để hoàn tất.
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.iosGuideBox}>
              <div className={styles.iosStep}>
                <span className={styles.iosStepNum}>1</span>
                <div>
                  Chạm vào biểu tượng menu <strong>3 chấm (⋮)</strong> ở góc trên bên phải màn hình Chrome.
                </div>
              </div>
              <div className={styles.iosStep}>
                <span className={styles.iosStepNum}>2</span>
                <div>
                  Chọn dòng <strong>"Cài đặt ứng dụng"</strong> (hoặc <strong>"Thêm vào Màn hình chính"</strong>).
                </div>
              </div>
              <div className={styles.iosStep}>
                <span className={styles.iosStepNum}>3</span>
                <div>
                  Nhấn <strong>"Cài đặt" (Install)</strong> để biểu tượng {appName} xuất hiện độc lập trên điện thoại!
                </div>
              </div>
            </div>
          )
        ) : (
          <div className={styles.perksList}>
            <div className={perkItemClass}>
              <span className={styles.perkIcon}>⚡</span>
              <span>Mở tức thì, biểu tượng riêng biệt trên màn hình chính</span>
            </div>
            <div className={perkItemClass}>
              <span className={styles.perkIcon}>🔔</span>
              <span>Chuông và thông báo đẩy trực tiếp khi có trạng thái mới</span>
            </div>
            <div className={perkItemClass}>
              <span className={styles.perkIcon}>🛡️</span>
              <span>Hoạt động độc lập, không bị lẫn giữa App Order và App Admin</span>
            </div>
          </div>
        )}

        <div className={styles.btnGroup}>
          {!showSteps && (
            <button
              type="button"
              className={styles.installBtn}
              onClick={handleInstallClick}
            >
              <span>📲 Cài Đặt Ngay</span>
            </button>
          )}

          <button
            type="button"
            className={styles.dismissBtn}
            onClick={handleDismiss}
          >
            {showSteps ? 'Tôi đã hiểu / Đóng' : 'Để sau / Dùng trên web'}
          </button>
        </div>
      </div>
    </div>
  )
}

const perkItemClass = styles.perkItem
