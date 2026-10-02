# Deploy production

## 1. Chuẩn bị

1. Hoàn tất Apps Script và xác nhận trang Cài đặt đọc được Google Sheets.
2. Đẩy source lên Git provider riêng tư.
3. Tạo dự án trên Vercel (hoặc host chạy Next.js server/Node.js).
4. Dùng Node.js 20+ và lệnh build npm run build; start npm start.

## 2. Environment variables

Đặt trên môi trường Production (và Preview riêng khi cần):

- NEXT_PUBLIC_API_URL: URL Apps Script /exec.
- APP_API_TOKEN: token Apps Script; server-only.
- APP_PASSWORD: mật khẩu website đủ mạnh.
- SESSION_SECRET: secret ngẫu nhiên riêng, tối thiểu 32 ký tự.

Chỉ NEXT_PUBLIC_API_URL được phép công khai. Không đưa .env.local, token Apps Script, mật khẩu, hay session secret lên Git. Sau khi đặt env, redeploy để runtime nhận giá trị.

## 3. Kiểm tra sau deploy

1. Truy cập domain: hệ thống phải chuyển tới trang đăng nhập.
2. Đăng nhập; mở **Cài đặt**, bấm kiểm tra kết nối.
3. Mở từng trang và đối chiếu số dư/record với Sheets.
4. Thử thêm một giao dịch ít rủi ro, xác nhận đúng một dòng mới, rồi dùng giao diện để soft-delete; khôi phục qua API khi cần.
5. Thêm ngày công thử với công ty/ngày có mức lương hiệu lực, kiểm tra giờ × đơn giá trong ChamCong_Data.
6. Kiểm tra access log phía host nếu Apps Script trả lỗi.

## 4. Bảo mật và vận hành

- Mật khẩu được so sánh server-side; cookie phiên HttpOnly, SameSite=Strict, Secure trong production và hết hạn sau 7 ngày.
- Thiếu APP_PASSWORD/SESSION_SECRET trong production thì middleware chặn app thay vì mở công khai.
- Apps Script Web App thực thi dưới tài khoản chủ sở hữu, do đó bảo vệ token như credential. Nếu token lộ: đổi Script Property, đổi env APP_API_TOKEN, rồi deploy lại.
- Trước khi đổi cấu trúc sheet hoặc alias header, tạo bản sao/backup từ Google Sheets. Không chạy migration tự động trên dữ liệu thật.
- Các thao tác xóa website là soft-delete; dòng không bị xóa vật lý.
- Dashboard gom dữ liệu trong một API call; không gọi từng card riêng.

## 5. Rollback

Nếu bản web mới phát sinh lỗi, redeploy commit trước. Dữ liệu Sheets vẫn là nguồn chuẩn. Với dòng soft-delete, gọi endpoint /api/{resource}/{id}/restore; nếu cần backup workbook, dùng **File → Make a copy** hoặc **Version history** của Google Sheets trước khi migration thủ công.
