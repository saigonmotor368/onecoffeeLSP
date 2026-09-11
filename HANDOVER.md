# 📋 TÀI LIỆU BÀN GIAO CÔNG VIỆC (HANDOVER NOTE) - ONE COFFEE LSP

**Dự án:** One Coffee LSP (Hệ thống đặt cà phê cho công nhân KCN Long Sơn LSP & Giao diện quản lý Admin)  
**Cập nhật lần cuối:** 11/09/2026  
**Nhánh Git:** `main`

---

## 1. TỔNG QUAN DỰ ÁN & CÔNG NGHỆ
- **Framework:** Next.js 16+ (App Router), React 19, TypeScript
- **Database & Auth:** Supabase (PostgreSQL, Supabase Auth, Row Level Security - RLS)
- **Styling:** Vanilla CSS & CSS Modules (Tối ưu Mobile First cho khách hàng, Desktop/Tablet cho Admin)
- **Dev Server:** Đang chạy tại `http://localhost:3000` (`npm run dev`)

---

## 2. NHỮNG THAY ĐỔI & TÍNH NĂNG VỪA HOÀN THÀNH (ĐÃ FIX & TEST)

### A. Tách biệt hoàn toàn Session Auth giữa Khách và Admin
- **Vấn đề trước đây:** Khách hàng và Admin dùng chung Supabase client instance ở browser, dẫn đến khi Admin vào xem hoặc test đặt hàng thì session bị chồng lấn, đơn hàng của khách lại bị gán cho `user_id` của admin.
- **Giải pháp:**
  - File `src/lib/supabase/client.ts` hỗ trợ 2 storage key riêng biệt: `'customer'` và `'admin'`.
  - Khi đặt hàng ở `/checkout`, luồng tạo đơn gọi qua Server API: `POST /api/orders/create` truyền tường minh `user_id` của khách hàng được tạo hoặc đăng nhập lúc checkout, dùng `SUPABASE_SERVICE_ROLE_KEY` ghi thẳng vào DB, loại bỏ hoàn toàn lỗi gán sai `user_id`.

### B. Bỏ popup/toast "Tạo tài khoản thành công" gây phiền phức tại Checkout
- **Yêu cầu của khách:** Khi khách đặt hàng lần đầu, nếu tạo tài khoản thì không hiện toast/màn hình thông báo tài khoản thành công nữa (vì ngay sau đó trang Thank You / Chờ xác nhận đã hiện ra, 2 thông báo liên tiếp gây khó chịu).
- **Trạng thái:** Đã gỡ bỏ `showToast` thông báo tạo tài khoản trong `handleInlineRegister` tại `src/app/(customer)/checkout/page.tsx`. Khách nhấn Đặt hàng sẽ chuyển thẳng sang màn hình Cảm ơn.

### C. Khắc phục lỗi Quản lý Khách hàng (`/admin/customers`) không hiện danh sách
- **Nguyên nhân:** Supabase RLS mặc định chặn người dùng (dù có role admin ở frontend) đọc dữ liệu từ bảng `profiles` của các user khác qua client SDK.
- **Giải pháp:**
  - Tạo route `GET /api/admin/customers` sử dụng `getAdminClient()` (Service Role) để lấy toàn bộ `profiles` kèm thống kê số đơn và chi tiêu.
  - Trang `src/app/admin/customers/page.tsx` đã chuyển sang gọi API này. Danh sách hiển thị đầy đủ, không còn bị rỗng.

### D. Khắc phục lỗi Admin không thể Chuyển trạng thái / Xác nhận đơn hàng
- **Nguyên nhân:** Tương tự, client SDK của Admin bị RLS chặn lệnh `update` lên bảng `orders`.
- **Giải pháp:**
  - Tạo route `POST /api/admin/orders/update-status` (Service Role). Nhận `orderId`, `status` và/hoặc `paymentStatus`.
  - Cập nhật cả 2 trang `src/app/admin/orders/page.tsx` và `src/app/admin/orders/[id]/page.tsx` gọi API này. Việc chuyển trạng thái từ `Chờ duyệt` -> `Đã xác nhận` -> `Đang pha` -> `Đang giao` -> `Đã giao` hoạt động mượt mà.

### E. Tối ưu giao diện Admin trên Desktop
- File `src/app/admin/admin.css` và `src/app/admin/page.tsx` đã được tinh chỉnh layout grid, sidebar và header để hiển thị rộng rãi, cân đối trên màn hình Desktop của quản lý quán.

### F. Sửa dứt điểm lỗi cú pháp tại `checkout/page.tsx`
- Đã kiểm tra và sửa chuỗi tiếng Việt bị lỗi ký tự ở `discountNotes` (dòng 282-287).
- `GET /checkout`, `GET /admin/customers`, `GET /admin/orders` đều trả về HTTP `200 OK`.

---

## 3. CẤU TRÚC FILE & API MỚI CẦN LƯU Ý

```
one-coffee-lsp/
├── src/
│   ├── app/
│   │   ├── (customer)/
│   │   │   └── checkout/page.tsx          # Form checkout, đăng ký/đăng nhập inline, gọi /api/orders/create
│   │   ├── admin/
│   │   │   ├── admin.css                  # CSS giao diện quản lý
│   │   │   ├── customers/page.tsx         # Quản lý khách hàng (gọi /api/admin/customers)
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx               # Danh sách đơn (gọi /api/admin/orders/update-status)
│   │   │   │   └── [id]/page.tsx          # Chi tiết đơn (gọi /api/admin/orders/update-status)
│   │   └── api/
│   │       ├── admin/
│   │       │   ├── customers/route.ts     # [MỚI] Service Role: lấy danh sách khách hàng + stats
│   │       │   └── orders/update-status/route.ts # [MỚI] Service Role: cập nhật trạng thái đơn/thanh toán
│   │       └── orders/
│   │           └── create/route.ts        # [MỚI] Service Role: tạo đơn hàng gắn đúng user_id
│   └── lib/
│       └── supabase/
│           ├── admin.ts                   # getAdminClient() sử dụng SUPABASE_SERVICE_ROLE_KEY
│           └── client.ts                  # createClient('customer' | 'admin')
```

---

## 4. BIẾN MÔI TRƯỜNG (.env.local)
Các biến đã được cấu hình trong `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`: URL dự án Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anon Key cho client
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key cho các route API phía server (Admin bypass RLS)

---

## 5. CÁCH CHẠY VÀ KIỂM THỬ CHO DEV MỚI

1. **Khởi động dự án:**
   ```bash
   cd "e:\One Coffee\one-coffee-lsp"
   npm run dev
   ```
2. **Kiểm tra luồng Khách hàng (Mobile viewport khuyến nghị):**
   - Truy cập: `http://localhost:3000/menu`
   - Chọn món -> Vào Giỏ hàng (`/cart`) -> Bấm Thanh toán (`/checkout`)
   - Nhập tên, SĐT, địa chỉ (hoặc bấm tab Đăng ký / Đăng nhập) -> Bấm **Đặt hàng**
   - **Kỳ vọng:** Không hiện popup "Tạo tài khoản thành công", chuyển thẳng sang trang đơn hàng thành công `/order-success` hoặc `/orders`.
3. **Kiểm tra luồng Admin (Desktop):**
   - Truy cập: `http://localhost:3000/admin/orders`
   - Xem đơn mới đặt -> Bấm nút **Xác nhận đơn** hoặc chuyển trạng thái -> Đơn đổi trạng thái ngay lập tức.
   - Truy cập: `http://localhost:3000/admin/customers` -> Kiểm tra khách hàng vừa đặt đơn đã hiển thị trong danh sách kèm tổng số đơn và doanh thu.

---

## 6. DANH SÁCH VIỆC CẦN LÀM TIẾP THEO (BACKLOG CHO DEV MỚI)
- [ ] **Thông báo cho khách về tài khoản:** Khách lần đầu đặt đơn dùng SĐT + mật khẩu thì hiển thị một dòng ghi chú nhỏ nhẹ nhàng ở trang Thank You: *"Lần sau bạn có thể dùng SĐT [sdt] để đăng nhập và theo dõi đơn hàng"*.
- [ ] **Realtime Admin:** Kiểm tra Supabase Realtime channel cho admin dashboard khi có khách đặt đơn mới (đã có hook, cần kiểm tra kết nối websocket nếu mạng KCN chặn).
- [ ] **In hóa đơn / Bill:** Xem xét bổ sung nút in nhiệt (POS 80mm) cho đơn hàng trong trang chi tiết đơn của Admin nếu quán cần in bill dán ly.
