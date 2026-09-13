# One Coffee LSP — Web App

> Hệ thống đặt đồ uống nội bộ cho nhân viên LSP tại nhà máy

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Database & Auth**: Supabase
- **Deploy**: Vercel
- **Payment**: VietQR (MB Bank)
- **PWA**: Web Push Notifications

## Structure
```
/src/app
├── page.tsx                    # Welcome / Splash screen
├── (customer)/                 # Customer app
│   ├── home/                   # Home screen
│   ├── menu/                   # Menu list + product detail
│   ├── cart/                   # Shopping cart
│   ├── checkout/               # Checkout + VietQR payment
│   ├── orders/                 # Order history + tracking
│   └── profile/                # User profile
└── admin/                      # Admin management app
    ├── page.tsx                # Dashboard
    ├── orders/                 # Order management
    ├── menu/                   # Menu management
    ├── customers/              # Customer management
    ├── vouchers/               # Voucher management
    └── reports/                # Revenue reports
```

## Setup

### 1. Environment Variables
Copy `.env.example` to `.env.local` and fill in:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=mailto:admin@onecoffee.vn
```

### 2. Database
For a fresh installation, run `supabase/schema.sql` in your Supabase SQL Editor, then run
`supabase/migrations/20260913_push_subscriptions_favorites.sql` to align the push
subscription table with older installations. The migration is safe to re-run.

### 3. Install & Run
```bash
npm install
npm run dev
```

### 4. Seed Menu Products
Visit `/admin` and use the Menu management to add product images.
Or run the seed script: products are pre-seeded from `src/lib/menu-data.ts`.

## Deploy to Vercel
1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Customer Web Push

Add the three VAPID variables above to Vercel **Production** and redeploy after
changing `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (it is embedded at build time). Generate
one key pair with `npx web-push generate-vapid-keys`; do not rotate it without
re-subscribing existing devices. Customers must sign in and tap **Bật thông báo**
on the Account or order-success screen once. On iPhone/iPad, they must first add
the customer app to the Home Screen and open it from there (iOS 16.4+). Android
Chrome and supported desktop browsers can receive Web Push over HTTPS without
keeping the app open. Notification layout and sound are ultimately controlled by
the phone OS and browser.

## URLs
- **Customer App**: `https://your-domain.vercel.app/`
- **Admin App**: `https://your-domain.vercel.app/admin`

## VietQR Payment
Configured for MB Bank account `0977999948` (PHAM XUAN DINH).
To change: update `NEXT_PUBLIC_BANK_ID`, `NEXT_PUBLIC_BANK_ACCOUNT`, `NEXT_PUBLIC_ACCOUNT_NAME` in `.env.local`.
