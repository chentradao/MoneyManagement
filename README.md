# Sổ tay tài chính & chấm công

Ứng dụng cá nhân dùng Next.js, TypeScript và Google Sheets làm nguồn dữ liệu chính. Website không lưu giao dịch vào LocalStorage hay database riêng. Luồng dữ liệu:

**Trình duyệt → Next.js API (server) → Google Apps Script Web App → Google Sheets**

Apps Script dùng đúng hai workbook đã cung cấp và các sheet hiện có. API ghép cột theo header, không dựa vào địa chỉ ô cố định, không tạo sheet theo tháng và không ghi đè workbook.

## Tính tương thích workbook đã kiểm tra

Hai file Excel nguồn có đúng 5 sheet mỗi file:

- Tài chính: Dashboard, TienMat, TaiKhoan, DauTu, ChoVay.
- Chấm công: Dashboard, Companies, Salary_Rates, ChamCong_Data, BaoCao_Thang.

Mapping đúng header hiện có và những điểm cần biết được mô tả trong [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Tiền mặt/tài khoản không có cột ID nên app gắn ID bằng Developer Metadata của dòng; không chèn cột mới. Các dòng mẫu chỉ chứa công thức 0 được bỏ qua khi đọc. Dữ liệu chấm công hiện có vẫn được giữ nguyên.

## Chạy local

1. Cài Node.js 20 LTS trở lên.
2. Tạo .env.local từ .env.example.
3. Cấu hình Apps Script như trong [docs/GOOGLE_SHEETS_SETUP.md](docs/GOOGLE_SHEETS_SETUP.md), sau đó điền URL Web App và token.
4. Cài thư viện và chạy:

   ~~~bash
   npm install
   npm run dev
   ~~~

5. Mở http://localhost:3000. Nếu để trống APP_PASSWORD trong môi trường local, đăng nhập được bỏ qua để tiện phát triển.

Ứng dụng không dùng dữ liệu giả để thay cho lỗi kết nối. Khi chưa cấu hình URL, trang Cài đặt hiển thị lỗi kết nối để phân biệt với dữ liệu trống.

## Cấu hình môi trường

~~~env
NEXT_PUBLIC_API_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
APP_API_TOKEN=chuoi-bi-mat-trung-voi-app-script
APP_PASSWORD=mat-khau-dang-nhap-website
SESSION_SECRET=chuoi-ngau-nhien-khac-token-dai-it-nhat-32-ky-tu
~~~

Chỉ URL API được đưa vào trình duyệt. Token Apps Script, mật khẩu và session secret chỉ được dùng ở server. Không đặt các bí mật này dưới tên bắt đầu bằng NEXT_PUBLIC_. Trong production, thiếu mật khẩu hoặc session secret sẽ chặn truy cập.

Tạo secret ngẫu nhiên bằng PowerShell:

~~~powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
~~~

## Tài liệu

- [Kiến trúc và mapping workbook](docs/ARCHITECTURE.md)
- [Cài đặt Google Sheets và Apps Script](docs/GOOGLE_SHEETS_SETUP.md)
- [API contract](docs/API.md)
- [Deploy production](docs/DEPLOYMENT.md)

## Bảo toàn và xóa dữ liệu

- Thao tác thêm/sửa chỉ cập nhật các cột nghiệp vụ; cột công thức dư/lãi vẫn được ghi kết quả đúng cho dòng mới/cập nhật.
- Xóa là **soft delete**: gắn Developer Metadata và ẩn dòng; không xóa vật lý. API có thao tác khôi phục.
- Xóa trên giao diện luôn hỏi xác nhận.
- Không có thao tác reset, tạo lại workbook hoặc tự động chuyển tiền công sang giao dịch tài chính.

## Lệnh

~~~bash
npm run dev
npm run build
npm start
~~~

Khi thêm hoặc đổi tên header trong workbook, cập nhật alias trong google-apps-script/Code.gs và kiểm tra với bản sao workbook trước khi triển khai. API dừng ghi nếu thiếu header bắt buộc.
