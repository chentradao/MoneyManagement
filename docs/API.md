# API Contract

Frontend chỉ gọi API cùng origin Next.js; proxy thêm APP_API_TOKEN phía server và gọi Apps Script. Response JSON; lỗi có dạng { "error": "Thông báo tiếng Việt" }. Các ngày là YYYY-MM-DD; số tiền/giờ là JSON number.

## Dữ liệu và tổng quan

| Method | Route | Kết quả |
| --- | --- | --- |
| GET | /api/data | Một lần đọc toàn bộ nhóm cần cho UI: cash, accounts, investments, loans, companies, rates, attendance. |
| GET | /api/dashboard?month=YYYY-MM&companyId=CT01 | Tổng tài sản, dòng tiền theo ngày, giờ và tiền công theo tháng. companyId tùy chọn. |

## Tài chính

Các nhóm chấp nhận alias /api/cash và /api/finance/cash (tương tự accounts, investments, loans).

| Method | Route | Body/kết quả |
| --- | --- | --- |
| GET | /api/finance/cash | {items:[{id,date,description,amount,balance}]} |
| POST | /api/finance/cash | date, description, amount có dấu; trả record đã tạo. |
| PUT | /api/finance/cash/{id} | Cùng field POST; cập nhật record. |
| DELETE | /api/finance/cash/{id} | Soft-delete. |
| GET/POST/PUT/DELETE | /api/finance/accounts[/{id}] | date, amount có dấu, note; record gồm balance. |
| GET/POST/PUT/DELETE | /api/finance/investments[/{id}] | type, name, principal, currentValue; profitLoss tính server-side. |
| GET/POST/PUT/DELETE | /api/finance/loans[/{id}] | borrower, loanDate, amount, interestRate, dueDate, status, note; remaining tính server-side. |

Khôi phục: POST /api/finance/{cash|accounts|investments|loans}/{id}/restore.

## Chấm công và thiết lập

| Method | Route | Body/kết quả |
| --- | --- | --- |
| GET/POST | /api/companies | {id?,name,active?,note?}. |
| GET/POST | /api/salary-rates | {companyId,effectiveFrom,effectiveTo?,rate,unit,note?}. |
| GET/POST | /api/attendance | {date,companyId,startTime,endTime,status,note?}; server chọn mức lương theo ngày và tính giờ/tiền. |
| PUT/DELETE | /api/attendance/{id} | Cập nhật/xóa mềm record theo ID. |
| POST | /api/{resource}/{id}/restore | Bỏ đánh dấu xóa và hiện dòng lại. |

Danh sách và cập nhật mức lương/chấm công theo ID dùng /api/salary-rates/{id} và /api/attendance/{id}. Mỗi công ty/ngày chỉ cho một ngày công; ca kết thúc không thể nhỏ hơn hoặc bằng giờ bắt đầu. Mức lương phải khớp khoảng ngày hiệu lực.

## Quy ước nghiệp vụ

- cash.amount: Thu dương, Chi âm; balance được tính tuần tự.
- accounts.amount: tiền vào dương, tiền ra âm.
- Cho vay đã trả có remaining=0; chưa trả có remaining=amount.
- Mức lương là giá theo giờ; tiền công lưu tại thời điểm tạo/sửa ngày công.
- Nếu workbook trả về một giá trị Tiền công đã có, giá trị đó được ưu tiên.
- API kiểm tra header bắt buộc trước khi ghi. Thiếu cột thì trả lỗi và không tự tạo/đổi sheet.
