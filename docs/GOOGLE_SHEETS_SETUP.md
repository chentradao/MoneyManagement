# Thiết lập Google Sheets và Apps Script

Hướng dẫn này dùng trực tiếp hai Google Sheets được cung cấp. Không tạo workbook hoặc tab mới.

## 1. Kiểm tra hai workbook

- Tài chính: [mở Google Sheets tài chính](https://docs.google.com/spreadsheets/d/FINANCE_SPREADSHEET_ID/edit)
- Chấm công: [mở Google Sheets chấm công](https://docs.google.com/spreadsheets/d/ATTENDANCE_SPREADSHEET_ID/edit)

Tài khoản Google dùng chạy Apps Script phải có quyền chỉnh sửa cả hai file. Không đổi tên sheet hoặc dòng header.

## 2. Tạo Apps Script API

1. Mở workbook tài chính.
2. Chọn **Extensions → Apps Script**.
3. Đổi tên project, ví dụ Personal Finance Sheets API.
4. Mở Code.gs, xóa nội dung mặc định trong editor rồi dán toàn bộ nội dung từ google-apps-script/Code.gs của project.
5. Nhấn **Save**.

Apps Script gắn với workbook tài chính nhưng script mở workbook chấm công theo ID; vì vậy không cần tạo dự án Apps Script thứ hai.

## 3. Thêm Script Properties

Trong Apps Script:

1. Chọn **Project Settings** (biểu tượng bánh răng).
2. Kéo đến **Script Properties** → **Add script property**.
3. Thêm đúng ba cặp:

| Property | Value |
| --- | --- |
| FINANCE_SPREADSHEET_ID | PASTE_FINANCE_SPREADSHEET_ID |
| ATTENDANCE_SPREADSHEET_ID | PASTE_ATTENDANCE_SPREADSHEET_ID |
| APP_API_TOKEN | Chuỗi ngẫu nhiên dài, ví dụ tạo bằng lệnh PowerShell trong README |

Lưu token này để đặt cùng giá trị vào biến server APP_API_TOKEN của website. Không gửi token cho người khác.

## 4. Deploy thành Web App

1. Nhấn **Deploy → New deployment**.
2. Bấm bánh răng **Select type** và chọn **Web app**.
3. **Execute as**: Me (tài khoản có quyền với hai workbook).
4. **Who has access**: Anyone. URL Web App là điểm vào public, nhưng mọi request POST cần token bí mật khớp nên request không có token bị từ chối. Next.js giữ token phía server; không đặt token trong browser.
5. Chọn **Deploy**. Cấp quyền Apps Script khi Google hỏi để đọc và cập nhật Sheets.
6. Sao chép URL kết thúc bằng /exec.

Nếu chính sách Google Workspace không cho chọn Anyone, deploy trong tài khoản cá nhân có quyền phù hợp hoặc dùng Google Sheets API với OAuth ở backend; không làm workbook public để né chính sách.

## 5. Khai báo cho website

Tạo .env.local:

~~~env
NEXT_PUBLIC_API_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
APP_API_TOKEN=gia-tri-APP_API_TOKEN-da-luu
APP_PASSWORD=mat-khau-dang-nhap-website
SESSION_SECRET=chuoi-ngau-nhien-khac-token-dai-it-nhat-32-ky-tu
~~~

Chạy npm install và npm run dev, mở **Cài đặt**. Trạng thái phải báo đã kết nối. Nếu chưa, kiểm tra URL, Script Properties, quyền editor với cả hai workbook, và tên/header sheet. Đừng tạo sheet mới để xử lý lỗi mapping; đọc nội dung lỗi rồi sửa alias trong Apps Script sau khi đối chiếu header.

## 6. Cập nhật Apps Script về sau

Khi sửa Code.gs, nhấn **Deploy → Manage deployments → Edit → New version → Deploy**. URL deployment thường giữ nguyên khi cập nhật phiên bản. Không thay ID workbook trừ khi chủ động chuyển sang file khác.

## 7. Phục hồi dữ liệu soft-delete

Giao diện xác nhận trước khi xóa. Backend gắn metadata và ẩn dòng thay vì xóa vật lý. Khôi phục qua API đã đăng nhập:

~~~http
POST /api/finance/cash/{id}/restore
POST /api/finance/accounts/{id}/restore
POST /api/finance/investments/{id}/restore
POST /api/finance/loans/{id}/restore
POST /api/attendance/{id}/restore
~~~

ID hiện có trong API trả về khi đọc danh sách; dòng vẫn nằm nguyên trong sheet trong suốt quá trình soft-delete.
