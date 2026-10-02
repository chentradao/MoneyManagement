# Kiến trúc và khả năng tương thích dữ liệu

## Thành phần

- app/: Next.js App Router pages và API proxy.
- components/: giao diện dashboard, tài chính, chấm công, công ty, cài đặt.
- services/api.ts: client gọi cùng origin /api.
- types/: kiểu dữ liệu hiển thị.
- lib/: ngày Asia/Ho_Chi_Minh và định dạng tiền.
- config/sheets.ts: tên workbook tabs và timezone ở phía ứng dụng.
- google-apps-script/Code.gs: adapter Sheets, validation, tính dữ liệu và soft delete.
- docs/: thiết lập, contract và deployment.

Browser không giao tiếp trực tiếp Google Sheets. Next.js API lấy NEXT_PUBLIC_API_URL, thêm APP_API_TOKEN ở server rồi gọi Apps Script. Credential không được gửi cho React.

## Workbook đã đối chiếu

Workbook tài chính 1l95SzXVJ7aVzSAMH6pzvT7R-0740ug_iBgXQ8ToAteU:

| Sheet | Header dùng bởi API |
| --- | --- |
| TienMat | Ngày, Mô tả, Số tiền (+/-), Số dư |
| TaiKhoan | Ngày, Số tiền, Số dư, Ghi chú |
| DauTu | Loại đầu tư, Tên, Số vốn, Giá trị hiện tại, Lãi/Lỗ |
| ChoVay | Người vay, Ngày cho vay, Số tiền, Lãi suất, Ngày trả, Trạng thái, Tiền còn, Ghi chú |
| Dashboard | Không dùng làm bảng giao dịch; dashboard website tính từ dữ liệu detail. |

Workbook chấm công 1H7GFmhKdwzUPuezYX2Iz8PQzFudZBid6ukl6AoTHwrs:

| Sheet | Header dùng bởi API |
| --- | --- |
| Companies | Company_ID, Tên công ty, Đang sử dụng, Ghi chú |
| Salary_Rates | Rate_ID, Company_ID, Từ ngày, Đến ngày, Đơn giá/giờ, Đơn vị, Ghi chú |
| ChamCong_Data | ID, Ngày, Company_ID, Giờ vào, Giờ ra, Số giờ, Trạng thái, Lý do/Ghi chú, Đơn giá, Tiền công |
| BaoCao_Thang | Không ghi; website tổng hợp từ ChamCong_Data. |
| Dashboard | Không ghi; website tổng hợp từ dữ liệu chi tiết. |

Hai workbook có đúng 5 sheet như trên. Companies có thêm cột trạng thái và ghi chú; ChamCong_Data có thêm Đơn giá và Tiền công. Adapter ánh xạ theo header, giữ nguyên các cột này. Header được chuẩn hóa dấu/hoa thường cho mục đích đối chiếu, nhưng không đổi header trong workbook. Nếu thiếu cột bắt buộc, thao tác ghi dừng với thông báo cụ thể.

## ID và dữ liệu cũ

- ChamCong_Data có cột ID; ID cũ (hiện là số) được giữ và ID mới là UUID có tiền tố ATT.
- Salary_Rates có Rate_ID; Companies có Company_ID.
- TienMat, TaiKhoan, DauTu, ChoVay không có cột ID. App tạo khóa legacy ổn định từ các trường nghiệp vụ, sau lần sửa/xóa đầu tiên gắn khóa thật trong Developer Metadata của dòng. Không dựa vào số dòng làm ID và không thêm cột/sheet.
- Nếu hai dòng cũ giống nhau hoàn toàn, khóa legacy trùng sẽ bị phát hiện và thao tác ghi/xóa bị từ chối để tránh sửa nhầm. Người dùng cần phân biệt các dòng trùng bằng cách sửa một trường nghiệp vụ trên Sheets hoặc bổ sung ID theo migration có backup.
- Đọc bỏ qua các dòng công thức trống trong vùng mẫu, dựa vào các trường nghiệp vụ bắt buộc; số 0 công thức không bị nhầm thành bản ghi.

## Công thức và quy tắc nghiệp vụ

- Tiền mặt/tài khoản: backend ghi số dư cho dòng mới bằng số dư trước đó + dòng tiền. Tổng dashboard lấy tổng giao dịch có dấu, theo cùng logic với workbook.
- Đầu tư: Lãi/Lỗ = Giá trị hiện tại - Số vốn.
- Cho vay: Đã trả → Tiền còn = 0; ngược lại Tiền còn = Số tiền.
- Chấm công: ngày làm được so với Từ ngày/Đến ngày của công ty. Mức lương và tiền công đã tính được lưu vào Đơn giá/Tiền công; khi đọc, giá trị Tiền công đã có được ưu tiên, chỉ dùng Số giờ × Đơn giá nếu ô tiền công trống.
- Website không tạo giao dịch tiền lương trong tài chính. Không có liên kết lương tự động ở bản này.
- Ngày API theo YYYY-MM-DD; hiển thị DD/MM/YYYY; xử lý theo Asia/Ho_Chi_Minh. Giờ kết thúc phải sau giờ bắt đầu; ca qua đêm chưa hỗ trợ.

## Dashboard

Tổng tài sản = tiền mặt + tiền tài khoản + giá trị hiện tại đầu tư + tiền còn phải thu. Không cộng tiền công như một tài sản mới.

Dashboard được trả bởi một request tổng hợp. Thu/chi theo ngày gộp giao dịch tiền mặt và tài khoản; giờ làm/tiền công lọc theo tháng và công ty.

## Xóa và khôi phục

DELETE không xóa dòng vật lý. API lưu APP_RECORD_ID nếu cần, gắn APP_SOFT_DELETED, rồi ẩn dòng. Danh sách bỏ qua dòng đã xóa; POST /api/{resource}/{id}/restore bỏ metadata và hiện dòng lại. Không thêm sheet log.

## Ghi chú từ dữ liệu nguồn

Trong ChamCong_Data hiện có hai dòng ngày 01/10/2026 (mỗi công ty một dòng) nhưng chưa nhập giờ vào/ra; công thức hiện cho số giờ và tiền công bằng 0. App vẫn hiển thị đó là bản ghi và cho phép sửa, không bỏ hoặc tái tạo. Salary_Rates hiện có hai mức 50.000/giờ có hiệu lực từ 01/01/2026. Một số dòng trống công thức trong file tài chính và dòng trống Companies không được xem là dữ liệu.
