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

### G. Hoàn tất backlog: ghi chú tài khoản, Realtime dự phòng và in bill 80 mm
- Trang đặt hàng truyền cờ `accountCreated=1` khi tài khoản vừa được tạo. Trang cảm ơn chỉ trong trường hợp này mới hiện ghi chú nhẹ: khách có thể dùng SĐT vừa đăng ký để đăng nhập và theo dõi đơn.
- Realtime Admin dùng đúng Supabase client scope `admin`, hiển thị trạng thái kết nối ở Sidebar và tự động polling mỗi 15 giây nếu WebSocket bị mạng KCN chặn.
- Cơ chế nhận đơn mới lưu danh sách ID đã thấy để polling và WebSocket không phát chuông/thông báo trùng nhau. Dashboard cũng không còn phát chuông lần hai.
- Trang `/admin/orders/[id]` có nút **In bill 80 mm** và stylesheet riêng cho máy in nhiệt, gồm thông tin khách, món, số lượng, ghi chú, giảm giá, phí giao, thanh toán và tổng tiền.
- Đã kiểm tra `npx tsc --noEmit`, ESLint trên toàn bộ file thay đổi và `npm run build` thành công ngày 11/09/2026.

### H. Hoàn thiện Quản lý người dùng và đơn theo khách hàng
- Trang `/admin/customers` hỗ trợ chỉnh sửa họ tên, SĐT đăng nhập, địa chỉ mặc định và quyền Customer/Admin; role được đọc trực tiếp từ Supabase Auth thay vì suy đoán bằng SĐT.
- Chức năng đặt lại mật khẩu có ô xác nhận mật khẩu, kiểm tra tối thiểu 6 ký tự và trả đúng lỗi từ Supabase Auth.
- Nút **Đơn hàng** mở lịch sử của từng người dùng, hiển thị tổng đơn, tổng chi tiêu, thanh toán, trạng thái và liên kết sang trang chi tiết để quản lý đơn.
- Thống kê/lịch sử ghép đơn theo cả `user_id` và SĐT người nhận, giúp nhận diện đúng các đơn cũ từng bị gắn nhầm session Admin.
- Các API quản lý người dùng hiện yêu cầu access token của Admin ở server; request không đăng nhập trả `401`, tài khoản không có role Admin trả `403`.
- API cập nhật không còn bỏ qua lỗi Auth/profile hoặc báo thành công giả; đồng thời chặn Admin tự gỡ quyền hoặc tự xóa tài khoản đang đăng nhập.
- Đã kiểm tra trên Supabase thật ở chế độ chỉ đọc: API danh sách trả 4 người dùng, API chi tiết người dùng trả lịch sử đơn thành công.

### I. Bắt buộc xác thực tài khoản trước khi thanh toán
- Tại `/checkout`, khách chưa xác thực chỉ thấy thông báo thanh toán đang khóa; phần chọn Tiền mặt/VietQR, mã QR và nút xác nhận đặt hàng đều chỉ xuất hiện sau khi tạo tài khoản hoặc đăng nhập thành công.
- Việc tạo tài khoản/đăng nhập là bước riêng, không còn tự động chạy khi khách bấm nút đặt hàng.
- API `POST /api/orders/create` bắt buộc Bearer token hợp lệ và luôn lấy `user_id` từ phiên Auth, không tin `user_id` do browser gửi lên.
- Khi phiên hết hạn hoặc API tạo đơn lỗi, checkout giữ nguyên giỏ hàng, hiện lỗi và không chuyển giả sang trang đặt hàng thành công.
- Đã kiểm tra: request tạo đơn không có token trả `401`; token hợp lệ đi qua bước xác thực và dữ liệu rỗng trả validation `400` mà không tạo đơn thật.

### J. Sửa đồng bộ đơn mới và thông báo Admin
- Nguyên nhân: RLS của bảng `orders` chỉ cho `auth.uid() = user_id`, vì vậy tài khoản Admin đọc trực tiếp từ browser nhận danh sách rỗng; Realtime có thể báo kết nối nhưng không được cấp payload của đơn khách.
- Thêm `GET /api/admin/orders` dùng service role sau khi xác thực Bearer token Admin, hỗ trợ danh sách, lọc trạng thái và chi tiết đơn kèm items.
- Dashboard, danh sách đơn, chi tiết đơn và badge Sidebar đều tải dữ liệu qua API Admin mới nên không còn phụ thuộc quyền SELECT của browser.
- Polling dự phòng rút xuống 5 giây. Sidebar so sánh ID đơn đã thấy để nhận diện đơn mới, phát chuông/native notification và luôn hiện notification nổi trong giao diện Admin kể cả khi trình duyệt chưa cấp quyền notification.
- Các API cập nhật trạng thái và xóa đơn cũng đã bắt buộc token Admin; toàn bộ caller chuyển sang helper `adminFetch` dùng chung.
- Đã kiểm tra production build thành công, `/admin/orders` trả `200`, API không có token trả `401`.

### K. Bắt buộc xem chi tiết đơn trước khi xác nhận/xử lý
- Dashboard và trang danh sách đơn (cả desktop lẫn mobile) không còn nút đổi trạng thái, hủy hoặc xóa trực tiếp trên bản tóm tắt.
- Mỗi đơn chỉ còn hành động chính **Xem chi tiết & xử lý**; việc xác nhận, chuyển pha chế/giao hàng, thanh toán, hủy và xóa chỉ thực hiện tại `/admin/orders/[id]` sau khi Admin đã xem đầy đủ người nhận, món, số lượng, ghi chú và tổng tiền.
- Popup **Xem món** là chế độ chỉ đọc, không còn dropdown đổi trạng thái hoặc nút xóa.
- Notification đơn mới mở thẳng trang chi tiết đúng đơn thay vì mở danh sách chung.
- Đã kiểm thử trực tiếp: Dashboard và danh sách hiện đúng 6 đơn/4 đơn chờ; trang tóm tắt không có nút xử lý nhanh, trang chi tiết vẫn có đầy đủ nút nghiệp vụ. TypeScript, ESLint và production build đều thành công ngày 12/09/2026.

### L. Hoàn thiện quản lý Voucher
- Trang `/admin/vouchers` có đầy đủ tạo mới, tìm kiếm, chỉnh sửa mã/nội dung ưu đãi/điều kiện/hạn dùng/giới hạn lượt dùng, bật-tắt và xóa voucher trên cả desktop lẫn mobile.
- Thêm API `GET/POST/PATCH/DELETE /api/admin/vouchers`; mọi thao tác đều xác thực Bearer token và quyền Admin ở server, không còn ghi trực tiếp từ browser rồi bị RLS chặn.
- Voucher chưa từng dùng có thể xóa vĩnh viễn. Voucher đã gắn với đơn hoặc có lịch sử sử dụng được bảo vệ, Admin cần tắt voucher để giữ nguyên dữ liệu đối soát.
- Chuẩn hóa trường tiền sang đơn vị đồng; dữ liệu cũ từng lưu theo nghìn đồng vẫn được tự nhận diện và tính đúng ở giỏ hàng.
- Khi tạo đơn, server kiểm tra voucher còn hoạt động, chưa hết hạn/chưa hết lượt, đủ giá trị đơn tối thiểu và khách chưa dùng mã này; sau khi đặt thành công ghi `voucher_usage` và tăng `used_count`.
- Đã kiểm tra dữ liệu thật ở chế độ chỉ đọc: hiển thị đúng 2 voucher `WELCOME10` và `LSP50K`; form sửa nạp đúng nội dung và đơn vị tiền. TypeScript, ESLint, kiểm tra API không token (`401`) và production build đều thành công ngày 12/09/2026.

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
   - Xem đơn mới đặt -> Bấm **Xem chi tiết & xử lý** -> kiểm tra đầy đủ thông tin rồi mới bấm **Xác nhận đơn** hoặc chuyển trạng thái tại trang chi tiết.
   - Truy cập: `http://localhost:3000/admin/customers` -> Kiểm tra khách hàng vừa đặt đơn đã hiển thị trong danh sách kèm tổng số đơn và doanh thu.

---

## 6. DANH SÁCH VIỆC CẦN LÀM TIẾP THEO (BACKLOG CHO DEV MỚI)
- [x] **Thông báo cho khách về tài khoản:** Đã hiện ghi chú đúng khi vừa tạo tài khoản tại checkout.
- [x] **Realtime Admin:** Đã thêm trạng thái kết nối, polling dự phòng 15 giây và chống thông báo trùng.
- [x] **In hóa đơn / Bill:** Đã bổ sung nút và mẫu in nhiệt POS 80 mm tại trang chi tiết đơn.

### Việc nên kiểm thử tại quán
- Mở Admin trên đúng mạng KCN, quan sát Sidebar hiển thị trạng thái đồng bộ; nếu WebSocket bị chặn, polling dự phòng vẫn nhận đơn tối đa sau khoảng 5 giây.
- Chọn đúng khổ giấy **80 mm**, lề mặc định hoặc tối thiểu, tắt header/footer của trình duyệt trước khi in bill thật lần đầu.
