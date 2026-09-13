'use client'

import { usePushSubscription } from '@/lib/use-push-subscription'
import { useLang } from '@/lib/providers'
import styles from './PushNotificationCard.module.css'

export default function PushNotificationCard() {
  const { lang } = useLang()
  const { state, error, requestPermissionAndSubscribe } = usePushSubscription('customer')
  const vi = lang === 'vi'
  const enabled = state === 'enabled'
  const waiting = state === 'loading'

  const message = enabled
    ? (vi ? 'Đã bật. Đổi trạng thái đơn sẽ báo trên màn hình khóa, kể cả khi bạn đóng app.' : 'On. Order updates will appear even when the app is closed.')
    : state === 'install_required'
      ? (vi ? 'Trên iPhone, hãy bấm Chia sẻ → Thêm vào Màn hình chính, mở app từ biểu tượng rồi bật thông báo.' : 'On iPhone, Share → Add to Home Screen, open the installed app, then enable notifications.')
      : state === 'denied'
        ? (vi ? 'Thông báo đang bị chặn. Hãy cho phép One Coffee trong cài đặt thông báo của điện thoại/trình duyệt.' : 'Notifications are blocked. Allow One Coffee in your device or browser settings.')
        : state === 'unsupported'
          ? (vi ? 'Trình duyệt hoặc môi trường hiện tại chưa hỗ trợ push. Hãy mở One Coffee bằng HTTPS hoặc cài app lên màn hình chính.' : 'Push is not supported here. Open One Coffee over HTTPS or install it on your home screen.')
          : state === 'login_required'
            ? (vi ? 'Đăng nhập để nhận thông báo cho đơn hàng của bạn.' : 'Sign in to receive your order updates.')
            : error || (vi ? 'Biết ngay khi đơn đang pha chế, đang giao và hoàn thành.' : 'Get updates when your order is preparing, on the way and delivered.')

  return (
    <section className={styles.card} aria-label={vi ? 'Thông báo đơn hàng' : 'Order notifications'}>
      <div className={styles.icon} aria-hidden="true">🔔</div>
      <div className={styles.content}>
        <h2>{vi ? 'Thông báo đơn hàng' : 'Order notifications'}</h2>
        <p>{message}</p>
        {(state === 'prompt' || state === 'error') && (
          <button type="button" className={styles.button} onClick={() => { void requestPermissionAndSubscribe() }}>
            {vi ? 'Bật thông báo' : 'Enable notifications'}
          </button>
        )}
        {enabled && <span className={styles.active}>{vi ? '● Đang hoạt động' : '● Active'}</span>}
        {waiting && <span className={styles.waiting}>{vi ? 'Đang kiểm tra…' : 'Checking…'}</span>}
      </div>
    </section>
  )
}
