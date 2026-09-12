const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.join(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

// Helper to convert image to Base64 data URI
function toBase64(filePath) {
  if (!fs.existsSync(filePath)) return '';
  const ext = path.extname(filePath).slice(1);
  const data = fs.readFileSync(filePath).toString('base64');
  return `data:image/${ext === 'svg' ? 'svg+xml' : ext};base64,${data}`;
}

const logoOrderB64 = toBase64(path.join(publicDir, 'icon-order-512.png'));
const logoAdminB64 = toBase64(path.join(publicDir, 'icon-admin-512.png'));
const logoEmblemB64 = toBase64(path.join(publicDir, 'logo.png'));

const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Cẩm Nang Hướng Dẫn Sử Dụng — One Coffee LSP</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap');

    @page {
      size: A4;
      margin: 16mm 14mm 16mm 14mm;
    }

    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1A202C;
      background: #FFFFFF;
      line-height: 1.55;
      font-size: 13.5px;
      -webkit-font-smoothing: antialiased;
    }

    .page-break {
      page-break-before: always;
      break-before: page;
    }

    .card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.03);
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 14px;
      background: linear-gradient(135deg, #184F38 0%, #103828 100%);
      color: #FFFFFF;
      padding: 14px 18px;
      border-radius: 12px;
      margin-bottom: 16px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .cover-page {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 960px;
      text-align: center;
      background: linear-gradient(180deg, #103828 0%, #184F38 45%, #0B291D 100%);
      color: #FFFFFF;
      border-radius: 16px;
      padding: 50px 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.15);
      position: relative;
      overflow: hidden;
    }

    .cover-badge {
      display: inline-block;
      background: rgba(200, 155, 60, 0.25);
      border: 1.5px solid #C89B3C;
      color: #F8E6B8;
      padding: 6px 18px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 13px;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 25px;
    }

    .cover-logo-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 30px;
      margin-bottom: 30px;
    }

    .cover-logo-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    .cover-logo-img {
      width: 110px;
      height: 110px;
      border-radius: 24px;
      box-shadow: 0 12px 28px rgba(0,0,0,0.4);
      border: 2px solid rgba(255,255,255,0.3);
    }

    .cover-logo-label {
      font-size: 12px;
      font-weight: 700;
      color: #E2E8F0;
      letter-spacing: 1px;
    }

    .cover-title {
      font-size: 30px;
      font-weight: 900;
      line-height: 1.25;
      color: #FFFFFF;
      margin-bottom: 12px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .cover-title span {
      color: #F5D38A;
    }

    .cover-subtitle {
      font-size: 16px;
      color: #E2E8F0;
      max-width: 620px;
      margin-bottom: 35px;
      line-height: 1.6;
    }

    .cover-features {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      width: 100%;
      max-width: 650px;
      margin-bottom: 40px;
      text-align: left;
    }

    .feature-card {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 12px;
      padding: 14px;
      backdrop-filter: blur(8px);
    }

    .feature-icon {
      font-size: 22px;
      margin-bottom: 6px;
    }

    .feature-title {
      font-size: 13px;
      font-weight: 700;
      color: #FCD34D;
      margin-bottom: 4px;
    }

    .feature-desc {
      font-size: 11px;
      color: #CBD5E1;
      line-height: 1.4;
    }

    .cover-footer {
      font-size: 12px;
      color: #94A3B8;
      border-top: 1px solid rgba(255,255,255,0.15);
      padding-top: 18px;
      width: 100%;
      max-width: 500px;
    }

    /* Section Header */
    .section-header {
      display: flex;
      align-items: center;
      gap: 14px;
      background: linear-gradient(135deg, #184F38 0%, #103828 100%);
      color: #FFFFFF;
      padding: 14px 18px;
      border-radius: 12px;
      margin-bottom: 20px;
      margin-top: 15px;
    }

    .section-header.admin {
      background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%);
      border-left: 5px solid #E11D48;
    }

    .section-header-icon {
      font-size: 26px;
      line-height: 1;
    }

    .section-header-title {
      font-size: 18px;
      font-weight: 800;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    .section-header-desc {
      font-size: 11.5px;
      color: #CBD5E1;
      font-weight: 400;
    }

    /* Cards and Grids */
    .card {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.03);
    }

    .card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 15px;
      font-weight: 800;
      color: #184F38;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1.5px solid #E2E8F0;
    }

    .card-title.admin {
      color: #0F172A;
      border-bottom-color: #CBD5E1;
    }

    .step-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 14px;
      margin-top: 10px;
    }

    .step-box {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 10px;
      padding: 12px 14px;
      position: relative;
    }

    .step-num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      background: #184F38;
      color: #FFFFFF;
      border-radius: 50%;
      font-size: 12px;
      font-weight: 800;
      margin-right: 6px;
    }

    .step-num.admin {
      background: #E11D48;
    }

    .step-heading {
      font-size: 13px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 6px;
    }

    .step-desc {
      font-size: 12px;
      color: #475569;
      line-height: 1.45;
    }

    .step-desc strong {
      color: #0F172A;
    }

    .highlight-box {
      background: #FEF3C7;
      border-left: 4px solid #F59E0B;
      border-radius: 6px;
      padding: 10px 14px;
      margin: 12px 0;
      font-size: 12px;
      color: #92400E;
      line-height: 1.5;
    }

    .tip-box {
      background: #ECFDF5;
      border-left: 4px solid #10B981;
      border-radius: 6px;
      padding: 10px 14px;
      margin: 12px 0;
      font-size: 12px;
      color: #065F46;
      line-height: 1.5;
    }

    /* Tables */
    .styled-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 12px;
    }

    .styled-table th {
      background: #184F38;
      color: #FFFFFF;
      padding: 8px 10px;
      text-align: left;
      font-weight: 700;
    }

    .styled-table.admin th {
      background: #0F172A;
    }

    .styled-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #E2E8F0;
      color: #334155;
    }

    .styled-table tr:nth-child(even) td {
      background: #F8FAFC;
    }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 10.5px;
      font-weight: 700;
    }
    .badge-pending   { background: #FEF3C7; color: #92400E; }
    .badge-confirmed { background: #DBEAFE; color: #1E40AF; }
    .badge-preparing { background: #F3E8FF; color: #6B21A8; }
    .badge-delivering{ background: #FFEDD5; color: #9A3412; }
    .badge-delivered { background: #D1FAE5; color: #065F46; }

    /* Visual illustration mockup */
    .visual-mockup {
      display: flex;
      align-items: center;
      gap: 16px;
      background: #F1F5F9;
      border: 1px dashed #CBD5E1;
      border-radius: 10px;
      padding: 12px;
      margin: 12px 0;
    }

    .mockup-icon {
      width: 54px;
      height: 54px;
      border-radius: 12px;
      flex-shrink: 0;
      box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    }

    .mockup-info {
      flex: 1;
    }

    .mockup-title {
      font-size: 13px;
      font-weight: 700;
      color: #0F172A;
      margin-bottom: 3px;
    }

    .mockup-desc {
      font-size: 11.5px;
      color: #475569;
      line-height: 1.4;
    }
  </style>
</head>
<body>

  <!-- ==================== BÌA TÀI LIỆU ==================== -->
  <div class="cover-page">
    <div class="cover-badge">CẨM NANG HƯỚNG DẪN CHÍNH THỨC · NĂM 2026</div>

    <div class="cover-logo-row">
      <div class="cover-logo-box">
        <img class="cover-logo-img" src="${logoOrderB64}" alt="OneCoffeeLSP_Order" />
        <span class="cover-logo-label">APP KHÁCH HÀNG</span>
      </div>
      <div class="cover-logo-box">
        <img class="cover-logo-img" src="${logoAdminB64}" alt="OneCoffeeLSP_Admin" />
        <span class="cover-logo-label">APP QUẢN TRỊ VIÊN</span>
      </div>
    </div>

    <h1 class="cover-title">ONE COFFEE <span>LSP</span></h1>
    <p class="cover-subtitle">
      Hệ thống đặt đồ uống trực tuyến & Quản lý đơn hàng thông minh phục vụ toàn diện cán bộ, công nhân viên và chuyên gia tại Tổ hợp Hóa dầu Long Sơn (LSP).
    </p>

    <div class="cover-features">
      <div class="feature-card">
        <div class="feature-icon">🛵</div>
        <div class="feature-title">GIAO TẬN NƠI 21 KHU VỰC</div>
        <div class="feature-desc">Giao nhanh đến từng phòng ban, cổng kiểm soát, xưởng & nhà điều hành.</div>
      </div>
      <div class="feature-card">
        <div class="feature-icon">📲</div>
        <div class="feature-title">CÀI APP 1 CHẠM (PWA)</div>
        <div class="feature-desc">Không cần tải từ App Store/CH Play, mở tức thì, nhẹ máy & mượt mà.</div>
      </div>
      <div class="feature-card">
        <div class="feature-icon">💳</div>
        <div class="feature-title">VIETQR TỰ ĐỘNG & TIỀN MẶT</div>
        <div class="feature-desc">Tự khớp số tiền và nội dung đơn hàng, thanh toán chính xác 100%.</div>
      </div>
    </div>

    <div class="cover-footer">
      <strong>ONE COFFEE LSP PETROCHEMICAL COMPLEX</strong><br>
      Hotline / Zalo hỗ trợ: <strong>0977 999 948</strong> · Phiên bản hệ thống: 2.0 (Tháng 09/2026)
    </div>
  </div>

  <div class="page-break"></div>

  <!-- ==================== PHẦN 1: DÀNH CHO KHÁCH HÀNG ==================== -->
  <div class="section-header">
    <div class="section-header-icon">☕</div>
    <div>
      <div class="section-header-title">PHẦN 1: DÀNH CHO KHÁCH HÀNG (CÔNG NHÂN & KỸ SƯ LSP)</div>
      <div class="section-header-desc">Hướng dẫn cài đặt App điện thoại, chọn món, thanh toán và theo dõi đơn hàng</div>
    </div>
  </div>

  <!-- BƯỚC 1: CÀI APP -->
  <div class="card">
    <div class="card-title">
      <span>📱 1. HƯỚNG DẪN CÀI ĐẶT APP LÊN MÀN HÌNH CHÍNH (KHÔNG CẦN TẢI TỪ KHO ỨNG DỤNG)</span>
    </div>
    <p style="font-size: 12.5px; color: #475569; margin-bottom: 12px;">
      Ứng dụng One Coffee LSP ứng dụng công nghệ <strong>PWA (Progressive Web App)</strong>. Khách hàng không cần tìm kiếm trên App Store hay CH Play, chỉ cần thêm ra màn hình chính là dùng y hệt một App xịn:
    </p>

    <div class="visual-mockup">
      <img src="${logoOrderB64}" class="mockup-icon" alt="One Coffee Order Icon" />
      <div class="mockup-info">
        <div class="mockup-title">Biểu tượng App Khách hàng: OneCoffeeLSP_Order</div>
        <div class="mockup-desc">Logo vòng tròn One Café màu xanh ngọc bích trên nền xanh rừng sang trọng. Biểu tượng này sẽ xuất hiện trên màn hình điện thoại của bạn sau khi cài đặt.</div>
      </div>
    </div>

    <div class="step-grid">
      <!-- Cài trên iPhone -->
      <div class="step-box">
        <div class="step-heading"><span class="step-num">A</span> Dành cho iPhone / iPad (Trình duyệt Safari)</div>
        <div class="step-desc">
          1. Mở trình duyệt <strong>Safari</strong> và truy cập link web đặt món.<br>
          2. Nhấn vào biểu tượng <strong>Chia sẻ (Share)</strong>: Hình ô vuông có mũi tên chỉ lên ở thanh công cụ dưới đáy.<br>
          3. Cuộn xuống và chọn dòng <strong>"Thêm vào MH chính" (Add to Home Screen)</strong>.<br>
          4. Nhấn <strong>"Thêm" (Add)</strong> ở góc trên bên phải. Xong! Biểu tượng One Coffee đã xuất hiện trên màn hình chính.
        </div>
      </div>

      <!-- Cài trên Android -->
      <div class="step-box">
        <div class="step-heading"><span class="step-num">B</span> Dành cho Android (Samsung, Xiaomi, Oppo...)</div>
        <div class="step-desc">
          1. Mở trình duyệt <strong>Google Chrome</strong> và truy cập link web đặt món.<br>
          2. Nhấn vào biểu tượng <strong>3 dấu chấm (⋮)</strong> ở góc trên bên phải màn hình.<br>
          3. Chọn dòng <strong>"Cài đặt ứng dụng"</strong> hoặc <strong>"Thêm vào màn hình chính"</strong>.<br>
          4. Bấm <strong>"Cài đặt"</strong> xác nhận. Ứng dụng sẽ được tạo lối tắt trực tiếp ra màn hình chính để mở nhanh lần sau.
        </div>
      </div>
    </div>

    <div class="tip-box">
      💡 <strong>Lợi ích khi cài App:</strong> Mở ngay trong 1 giây không cần gõ lại địa chỉ web, không bị thanh công cụ trình duyệt che mất màn hình, nhận được thông báo khi ly cà phê bắt đầu được giao!
    </div>

    <div class="highlight-box" style="margin-top: 10px;">
      📷 <strong>Cách Cài Nhanh Nhất (Quét Mã QR Đặt Tại Quầy/Xưởng):</strong> Chỉ cần dùng Camera điện thoại hoặc Zalo quét mã QR đặt tại quầy ➜ Màn hình tự động hiện hộp thoại hỏi <strong>"Bạn có muốn cài đặt ứng dụng One Coffee LSP lên máy không?"</strong> ➜ Chỉ cần bấm <strong>"Cài đặt ngay"</strong> là hoàn tất trong 2 giây!
    </div>
  </div>

  <!-- BƯỚC 2: CHỌN MÓN VÀ TÙY CHỈNH -->
  <div class="card">
    <div class="card-title">
      <span>🍹 2. CHỌN ĐỒ UỐNG & TÙY CHỈNH THEO GU RIÊNG</span>
    </div>

    <div class="step-grid">
      <div class="step-box">
        <div class="step-heading">Khám phá Menu phong phú</div>
        <div class="step-desc">
          Menu được phân chia danh mục rõ ràng: <strong>Cà Phê Truyền Thống, Cà Phê Ý / Máy, Trà Sữa Thơm Béo, Trà Trái Cây Tươi Mát, Nước Ép & Đá Xay</strong>. Có thanh tìm kiếm nhanh tên món.
        </div>
      </div>

      <div class="step-box">
        <div class="step-heading">Tùy biến từng ly nước</div>
        <div class="step-desc">
          - <strong>Chọn Size:</strong> Size M (vừa) hoặc Size L (lớn).<br>
          - <strong>Độ ngọt / Đá:</strong> Ít ngọt, vừa ngọt, ít đá, không đá.<br>
          - <strong>Topping:</strong> Trân châu đen, thạch phô mai, pudding trứng...<br>
          - <strong>Ghi chú:</strong> Dặn dò pha chế (ví dụ: <em>"Cà phê đậm vị"</em>).
        </div>
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- BƯỚC 3: BẮT BUỘC TẠO TÀI KHOẢN KHI ĐẶT HÀNG -->
  <div class="card">
    <div class="card-title">
      <span>🔐 3. BẮT BUỘC TẠO TÀI KHOẢN ĐỂ ĐẶT HÀNG & BẢO VỆ QUYỀN LỢI</span>
    </div>

    <div class="step-desc" style="margin-bottom: 10px;">
      Để đảm bảo chất lượng phục vụ và chống đơn ảo tại khu vực an ninh nhà máy LSP, <strong>hệ thống yêu cầu khách hàng hoàn tất tạo tài khoản (hoặc đăng nhập) mới được tiến hành thanh toán</strong>:
    </div>

    <div class="step-grid">
      <div class="step-box">
        <div class="step-heading">Tại sao phải tạo tài khoản?</div>
        <div class="step-desc">
          - <strong>Xác thực người nhận:</strong> Gắn chính xác đơn hàng với SĐT và phòng ban/xưởng của bạn.<br>
          - <strong>Bảo vệ quyền lợi:</strong> Lưu lịch sử đặt món, tích lũy điểm thưởng và áp dụng voucher cá nhân.<br>
          - <strong>Đặt lại siêu tốc:</strong> Lần sau chỉ cần đăng nhập bằng SĐT + Mật khẩu, không cần gõ lại địa chỉ.
        </div>
      </div>

      <div class="step-box">
        <div class="step-heading">Tạo tài khoản siêu tốc ngay tại Checkout</div>
        <div class="step-desc">
          - Nhập <strong>Họ tên & Số điện thoại</strong> (10 chữ số).<br>
          - Tạo <strong>Mật khẩu</strong> (tối thiểu 6 ký tự dễ nhớ).<br>
          - Nhập <strong>Khu vực nhận hàng</strong> trong nhà máy LSP.<br>
          - <em>Không cần chờ mã OTP rườm rà, tạo xong là đơn hàng được xác nhận ngay trong 3 giây!</em>
        </div>
      </div>
    </div>
  </div>

  <!-- BƯỚC 4: ÁP VOUCHER & THANH TOÁN THÔNG MINH -->
  <div class="card">
    <div class="card-title">
      <span>💳 4. ÁP DỤNG VOUCHER & THANH TOÁN VIETQR KÈM MÃ ĐƠN HÀNG</span>
    </div>

    <div class="step-grid">
      <div class="step-box">
        <div class="step-heading">🎁 Áp dụng Voucher & Giảm giá LSP</div>
        <div class="step-desc">
          - <strong>Nhập mã Voucher:</strong> Điền mã khuyến mãi vào ô <em>"Mã giảm giá"</em> ➜ Bấm <strong>Áp dụng</strong>. Hệ thống tự động trừ tiền (% hoặc số tiền cố định) trực tiếp trên bill.<br>
          - <strong>Ưu đãi nhân viên LSP:</strong> Tích chọn <em>"Tôi là nhân viên LSP"</em> để hưởng mức giá ưu đãi nội bộ và chính sách Freeship tận xưởng.
        </div>
      </div>

      <div class="step-box">
        <div class="step-heading">📲 VietQR kèm Mã Đơn Hàng tự động</div>
        <div class="step-desc">
          - Mỗi đơn hàng được cấp <strong>Mã đơn hàng duy nhất</strong> (Ví dụ: <code>OC-2609-8888</code>).<br>
          - Khi chọn <strong>Chuyển khoản VietQR</strong>: Mã QR tự sinh trên màn hình đã tích hợp sẵn <strong>Số TK ngân hàng MB + Số tiền chính xác + Nội dung chuyển khoản chứa Mã đơn</strong>.<br>
          - Khách mở App ngân hàng quét là xong ngay, <strong>không cần gõ tay</strong>, không lo chuyển nhầm số tài khoản hay sai số tiền!
        </div>
      </div>
    </div>

    <div class="tip-box" style="margin-top: 10px;">
      💵 <strong>Lựa chọn Tiền mặt (COD):</strong> Quý khách cũng có thể chọn <em>"Tiền mặt khi nhận hàng"</em>. Shipper One Coffee sẽ mang ly nước kèm hóa đơn có in rõ mã đơn hàng đến tận tay quý khách trước khi thu tiền.
    </div>
  </div>

  <!-- BƯỚC 5: THEO DÕI ĐƠN HÀNG -->
  <div class="card">
    <div class="card-title">
      <span>🛵 5. THEO DÕI TRẠNG THÁI ĐƠN HÀNG THỜI GIAN THỰC</span>
    </div>
    <p style="font-size: 12px; color: #475569; margin-bottom: 8px;">
      Sau khi hoàn tất đặt đơn, màn hình sẽ hiển thị trực tiếp tiến độ đơn hàng chuyển đổi theo từng giai đoạn:
    </p>

    <table class="styled-table">
      <thead>
        <tr>
          <th style="width: 25%;">Trạng thái</th>
          <th>Ý nghĩa quy trình</th>
          <th style="width: 30%;">Thời gian ước tính</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><span class="badge badge-pending">Chờ xác nhận</span></td>
          <td>Đơn hàng đã vào hệ thống, nhân viên đang tiếp nhận kiểm tra.</td>
          <td>1 – 2 phút</td>
        </tr>
        <tr>
          <td><span class="badge badge-confirmed">Đã xác nhận</span></td>
          <td>Đơn hàng đã được duyệt, in bill sang quầy pha chế.</td>
          <td>Ngay lập tức</td>
        </tr>
        <tr>
          <td><span class="badge badge-preparing">Đang pha chế</span></td>
          <td>Barista đang pha chế đúng theo yêu cầu (size, đá, ngọt của bạn).</td>
          <td>3 – 7 phút</td>
        </tr>
        <tr>
          <td><span class="badge badge-delivering">Đang giao hàng</span></td>
          <td>Shipper nhận đồ uống đóng gói và đang chạy đến khu vực của bạn.</td>
          <td>5 – 15 phút (tùy vị trí xưởng)</td>
        </tr>
        <tr>
          <td><span class="badge badge-delivered">Đã giao thành công</span></td>
          <td>Bạn đã nhận nước, thưởng thức cà phê ngon cho ca làm việc tỉnh táo!</td>
          <td>Hoàn tất</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="page-break"></div>

  <!-- ==================== PHẦN 2: DÀNH CHO ADMIN & NHÂN VIÊN ==================== -->
  <div class="section-header admin">
    <div class="section-header-icon">⚙️</div>
    <div>
      <div class="section-header-title">PHẦN 2: DÀNH CHO NHÂN VIÊN VẬN HÀNH & ADMIN QUẢN TRỊ</div>
      <div class="section-header-desc">Quy trình duyệt đơn, cập nhật trạng thái, quản lý menu, khách hàng và doanh thu</div>
    </div>
  </div>

  <!-- CÀI APP VÀ ĐĂNG NHẬP ADMIN -->
  <div class="card">
    <div class="card-title admin">
      <span>🔐 1. CÀI ĐẶT APP ADMIN & ĐĂNG NHẬP HỆ THỐNG</span>
    </div>

    <div class="visual-mockup">
      <img src="${logoAdminB64}" class="mockup-icon" alt="One Coffee Admin Icon" />
      <div class="mockup-info">
        <div class="mockup-title">Biểu tượng App Quản Trị: OneCoffeeLSP_Admin</div>
        <div class="mockup-desc">Logo One Café trên nền tối Dark Slate (#0F172A) với huy hiệu đỏ ADMIN nổi bật dưới chân để phân biệt hoàn toàn với App Khách hàng.</div>
      </div>
    </div>

    <div class="step-grid">
      <div class="step-box">
        <div class="step-heading"><span class="step-num admin">1</span> Cài App Admin ra điện thoại/POS</div>
        <div class="step-desc">
          Truy cập đường dẫn: <strong>domain/admin</strong>.<br>
          Bấm nút <strong>"Thêm vào MH chính" (Add to Home Screen)</strong> trên trình duyệt của máy thu ngân hoặc điện thoại nhân viên. Một icon Admin riêng biệt sẽ xuất hiện.
        </div>
      </div>

      <div class="step-box">
        <div class="step-heading"><span class="step-num admin">2</span> Đăng nhập quyền Quản trị</div>
        <div class="step-desc">
          - <strong>Email:</strong> <code>admin@onecoffee.vn</code> (hoặc gõ tắt: <code>admin</code>)<br>
          - <strong>Mật khẩu:</strong> <code>admin@123</code><br>
          - Có thể bấm nút <em>"Dùng tài khoản mẫu"</em> để điền nhanh.<br>
          - <em>Lưu ý: Tài khoản khách hàng thông thường sẽ bị chặn không thể vào trang này.</em>
        </div>
      </div>
    </div>
  </div>

  <!-- QUY TRÌNH QUẢN LÝ ĐƠN HÀNG -->
  <div class="card">
    <div class="card-title admin">
      <span>📋 2. QUY TRÌNH XỬ LÝ & ĐỔI TRẠNG THÁI ĐƠN HÀNG</span>
    </div>

    <div class="tip-box">
      🔔 <strong>Chuông báo có đơn mới:</strong> Hệ thống được trang bị chuông âm thanh thời gian thực và thông báo đẩy (Push Notification). Khi công nhân đặt đơn, máy admin sẽ phát âm thanh và hiển thị thanh thông báo nổi để nhân viên không bao giờ bị sót đơn!
    </div>

    <div class="step-grid">
      <div class="step-box">
        <div class="step-heading">Bước 1: Nhận & Duyệt Đơn</div>
        <div class="step-desc">
          Vào mục <strong>"Đơn hàng"</strong> ➜ Xem các đơn ở tab <strong>"Chờ duyệt"</strong>. Bấm nút <strong>"Xác nhận đơn"</strong> để chấp nhận đơn hàng.
        </div>
      </div>

      <div class="step-box">
        <div class="step-heading">Bước 2: Báo Pha Chế</div>
        <div class="step-desc">
          Chuyển trạng thái sang <strong>"Đang pha chế"</strong>. Barista nhìn bill làm đúng món, đúng size và ghi chú của khách.
        </div>
      </div>

      <div class="step-box">
        <div class="step-heading">Bước 3: Bàn Giao Giao Hàng</div>
        <div class="step-desc">
          Khi pha xong, đóng túi cẩn thận và chuyển trạng thái sang <strong>"Đang giao"</strong>. Shipper nhìn địa chỉ khu vực và SĐT để liên hệ khách.
        </div>
      </div>

      <div class="step-box">
        <div class="step-heading">Bước 4: Xác Nhận Thu Tiền & Hoàn Tất</div>
        <div class="step-desc">
          Khi shipper giao xong, bấm <strong>"Đã giao"</strong>. Nếu đơn là Tiền mặt, bấm chuyển <strong>"Đã thanh toán"</strong> để hệ thống ghi nhận doanh thu chuẩn xác.
        </div>
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- CÁC TÍNH NĂNG NÂNG CAO KHÁC -->
  <div class="card">
    <div class="card-title admin">
      <span>📊 3. QUẢN LÝ MENU, VOUCHER, KHÁCH HÀNG & BÁO CÁO</span>
    </div>

    <div class="tip-box" style="margin-bottom: 12px;">
      💡 <strong>Đối soát tự động qua Mã Đơn Hàng (Order Code):</strong> Khi khách thanh toán qua VietQR, mã đơn hàng (ví dụ: <code>OC-2609-XXXX</code>) tự động xuất hiện trên sao kê App ngân hàng MB của quán. Thu ngân chỉ cần đối chiếu mã đơn là biết chính xác khách nào đã chuyển tiền, không bao giờ lo trùng lặp hay nhầm lẫn!
    </div>

    <table class="styled-table admin">
      <thead>
        <tr>
          <th style="width: 25%;">Phân hệ</th>
          <th>Chức năng quản trị chính</th>
          <th style="width: 28%;">Thao tác nhanh</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>☕ Quản lý Menu</strong></td>
          <td>Bật/Tắt trạng thái Còn hàng / Hết hàng; cập nhật giá tiền món, thêm món mới vào từng danh mục.</td>
          <td>Bật công tắc "Hết hàng" khi nguyên liệu hết</td>
        </tr>
        <tr>
          <td><strong>🎫 Quản lý Voucher</strong></td>
          <td>Tạo mã giảm giá (% hoặc số tiền cố định), đặt giá trị đơn tối thiểu, số lượng giới hạn và ngày hết hạn.</td>
          <td>Thêm mã khuyến mãi cho từng phòng ban LSP</td>
        </tr>
        <tr>
          <td><strong>👥 Quản lý Khách hàng</strong></td>
          <td>Xem danh bạ toàn bộ khách hàng đã đăng ký, tra cứu số điện thoại, tổng số đơn đã đặt và tổng chi tiêu.</td>
          <td>Chăm sóc khách hàng thân thiết, khách VIP</td>
        </tr>
        <tr>
          <td><strong>📈 Báo cáo Doanh thu</strong></td>
          <td>Biểu đồ doanh thu theo ngày/tháng, thống kê top món bán chạy nhất, số lượng đơn hoàn tất.</td>
          <td>Bấm nút <strong>"Xuất Excel (.xlsx)"</strong> để lấy báo cáo</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- LƯU Ý QUAN TRỌNG -->
  <div class="card" style="margin-bottom: 0;">
    <div class="card-title admin">
      <span>⚠️ 4. NHỮNG ĐIỂM QUAN TRỌNG NHÂN VIÊN CẦN GHI NHỚ</span>
    </div>
    <ul style="padding-left: 20px; font-size: 12px; color: #334155; line-height: 1.6;">
      <li><strong>Môi trường mạng tại nhà máy LSP:</strong> Mạng nội bộ nhà máy có thể chập chờn hoặc chặn kết nối WebSocket. Hệ thống đã tích hợp cơ chế Polling tự động quét đơn 5 giây/lần. Nhân viên vẫn nên giữ màn hình mở hoặc thường xuyên kiểm tra tab Đơn hàng.</li>
      <li><strong>Kiểm tra thanh toán chuyển khoản:</strong> Khách quét mã VietQR thì tiền sẽ về thẳng tài khoản MB Bank của quán. Luôn đối chiếu tin nhắn biến động số dư trước khi chuyển đơn sang trạng thái Đã giao.</li>
      <li><strong>Bảo mật tài khoản Admin:</strong> Tuyệt đối không chia sẻ mật khẩu quản trị ra bên ngoài. Khi hết ca làm việc trên máy chung, hãy bấm nút Đăng xuất.</li>
    </ul>
  </div>

</body>
</html>
`;

// Save HTML
const htmlPath = path.join(rootDir, 'HUONG_DAN_SU_DUNG_ONE_COFFEE_LSP.html');
fs.writeFileSync(htmlPath, htmlContent, 'utf-8');
console.log('Saved HTML manual:', htmlPath);

// PDF Export using headless Chrome / Edge
const pdfPath = path.join(rootDir, 'HUONG_DAN_SU_DUNG_ONE_COFFEE_LSP.pdf');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

let browserExe = fs.existsSync(chromePath) ? chromePath : edgePath;

console.log('Using browser for PDF generation:', browserExe);

try {
  const cmd = `"${browserExe}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" "file:///${htmlPath.replace(/\\\\/g, '/')}"`;
  execSync(cmd, { stdio: 'inherit' });
  console.log('Successfully generated PDF manual at:', pdfPath);
} catch (err) {
  console.error('Error generating PDF with headless browser:', err);
}
