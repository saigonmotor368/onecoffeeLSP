import type { Metadata } from 'next'
import WelcomePageClient from './WelcomePageClient'

// ─── Page-level OG metadata (server-rendered → bots can read) ───
export const metadata: Metadata = {
  title: 'One Coffee LSP — Cà Phê Ngon, Ngày Tươi Sáng ☕',
  description: 'Đặt đồ uống One Coffee tại LSP Petrochemical Complex. Good Coffee — Brighter Workdays. Giao hàng nội bộ, thanh toán QR.',
  openGraph: {
    title: 'One Coffee LSP — Cà Phê Ngon, Ngày Tươi Sáng ☕',
    description: 'Đặt đồ uống One Coffee tại LSP · Good Coffee — Brighter Workdays · Giao hàng nội bộ nhà máy',
    type: 'website',
    url: 'https://onecafe.lspvn.com',
    siteName: 'One Coffee LSP',
    images: [
      {
        url: 'https://onecafe.lspvn.com/og-banner.jpg',
        width: 1200,
        height: 630,
        alt: 'One Coffee LSP — Good Coffee, Brighter Workdays',
      },
    ],
    locale: 'vi_VN',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'One Coffee LSP — Cà Phê Ngon, Ngày Tươi Sáng ☕',
    description: 'Đặt đồ uống One Coffee tại LSP · Good Coffee — Brighter Workdays',
    images: ['https://onecafe.lspvn.com/og-banner.jpg'],
  },
}

// Server component — metadata gets injected into <head> at build/request time
// Bots (Zalo, Telegram, FB, Messenger) will see the OG tags
export default function WelcomePage() {
  return <WelcomePageClient />
}
