# Hướng Dẫn Thiết Lập Google Sheets & Apps Script Database API
**Bliss Homestay AI Hub v3.0**

Tài liệu này hướng dẫn chi tiết các bước thiết lập bảng tính Google Sheets làm cơ sở dữ liệu (Database), triển khai mã Google Apps Script thành Web App, cấu hình các biến bảo mật, và cài đặt Trigger đồng bộ bộ nhớ đệm (Cache Sync) tự động về máy chủ Express.

---

## 1. Kiến Trúc Lưu Trữ Dữ Liệu

Để tối ưu hóa chi phí vận hành ở mức tối thiểu ($0 USD cho Database), Bliss Homestay AI Hub v3.0 sử dụng cấu trúc lưu trữ kết hợp:
*   **Google Sheets (Cloud/Primary)**: Hệ thống ghi nhận chính (System of Record) giúp người quản trị dễ dàng theo dõi, chỉnh sửa giá cả, phòng ốc và cập nhật trạng thái đơn đặt phòng bằng giao diện bảng tính quen thuộc.
*   **SQLite (Local/Cache/Queue)**: Lưu trữ các hoạt động tần suất cao, khóa chống trùng lịch (Locks), khử trùng lặp webhook (Deduplication) và hàng đợi ghi lùi (Write-Behind Queue) để tránh vượt quá hạn mức (Quota) của Google API.

---

## 2. Cấu Trúc Bảng Tính Google Sheets (Schema)

Tạo một bảng tính Google Sheets mới và thiết lập 4 trang tính (tabs) tương ứng với cấu trúc cột (các cột viết hoa chữ cái đầu và viết cách nhau bằng dấu gạch dưới). 

> [!TIP]
> Bạn có thể bỏ qua bước tự tạo cột thủ công. Hãy xem **Mục 4** để biết cách chạy hàm `initializeSpreadsheet()` tự động tạo và định dạng tất cả các cột tiêu đề này chỉ với 1 click!

### 2.1 Sheet: `Rooms` (Quản lý phòng trống)
*   **Mô tả**: Lưu trữ thông tin phân loại phòng, chi nhánh, sức chứa tối đa và cấu hình bảng giá.
*   **Cấu trúc cột (A -> P)**:

| Cột | Tên Cột | Kiểu Dữ Liệu | Khóa | Cho Phép Rỗng | Ràng Buộc / Định Dạng | Ví Dụ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A** | `room_id` | String | PK | Không | Định dạng mã phòng (e.g. `XH01`, `BTH101`, `DT501`) | `XH01` |
| **B** | `room_name` | String | - | Không | Tối đa 100 ký tự | `Phòng Việt Nam` |
| **C** | `branch` | String | - | Không | Giá trị: `cs1`, `cs2`, `cs3`, `cs4`, `cs5` | `cs1` |
| **D** | `branch_name` | String | - | Không | Tên chi nhánh cụ thể | `Chi nhánh Tân Bình (CS1)` |
| **E** | `address` | String | - | Không | Địa chỉ cụ thể chi nhánh | `71 Xuân Hồng, Phường 12, Quận Tân Bình` |
| **F** | `capacity` | Integer | - | Không | Giá trị >= 1 | `2` |
| **G** | `base_price_weekday` | Decimal | - | Không | Số nguyên >= 0 (Giá ngày thường T2 - T5) | `800000` |
| **H** | `base_price_weekend` | Decimal | - | Không | Số nguyên >= 0 (Giá cuối tuần T6 - CN) | `1200000` |
| **I** | `slot_prices` | JSON String | - | Không | Bản đồ giá thuê theo giờ (JSON Dictionary) | `{"08:00 - 11:00": 239000}` |
| **J** | `amenities` | JSON String | - | Không | Danh sách tiện ích (JSON Array of Strings) | `["Bồn tắm", "Máy chiếu"]` |
| **K** | `images` | JSON String | - | Không | Mảng liên kết ảnh phòng (JSON Array) | `["images/room_1_main.png"]` |
| **L** | `emoji` | String | - | Không | Ký tự Emoji đại diện | `🏔️` |
| **M** | `description` | String | - | Có | Mô tả phòng ngủ | `Phòng lãng mạn view thung lũng...` |
| **N** | `status` | String | - | Không | Giá trị: `active`, `inactive` | `active` |
| **O** | `created_at` | DateTime | - | Không | Định dạng ISO 8601 UTC | `2026-05-26T16:25:47.000Z` |
| **P** | `updated_at` | DateTime | - | Không | Định dạng ISO 8601 UTC | `2026-05-26T16:26:12.000Z` |

---

### 2.2 Sheet: `Bookings` (Quản lý đơn đặt phòng)
*   **Mô tả**: Ghi nhận toàn bộ giao dịch đặt phòng của khách qua các kênh.
*   **Cấu trúc cột (A -> S)**:

| Cột | Tên Cột | Kiểu Dữ Liệu | Khóa | Cho Phép Rỗng | Ràng Buộc / Định Dạng | Ví Dụ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A** | `booking_id` | String | PK | Không | Định dạng: `^BL\d{3,}$` | `BL001` |
| **B** | `customer_name` | String | - | Không | Tên khách đặt | `Nguyễn Thị Lan` |
| **C** | `customer_phone` | String | - | Có | Số điện thoại di động Việt Nam | `0901234567` |
| **D** | `customer_social_id` | String | FK | Có | ID chat từ MXH của khách | `8839201` |
| **E** | `branch` | String | - | Không | Giá trị: `cs1`, `cs2`, `cs3`, `cs4`, `cs5` | `cs1` |
| **F** | `branch_name` | String | - | Không | Tên chi nhánh lưu trú | `Chi nhánh Tân Bình (CS1)` |
| **G** | `room_id` | String | FK | Không | Liên kết sang sheet `Rooms` | `XH01` |
| **H** | `room_name` | String | - | Không | Tên phòng denormalized | `Phòng Việt Nam` |
| **I** | `check_in_date` | Date | - | Không | Định dạng `YYYY-MM-DD` | `2026-05-27` |
| **J** | `check_out_date` | Date | - | Không | `YYYY-MM-DD`, phải lớn hơn `check_in_date` | `2026-05-29` |
| **K** | `num_guests` | Integer | - | Không | Giá trị >= 1 | `2` |
| **L** | `total_price` | Decimal | - | Không | Giá trị >= 0 | `2800000` |
| **M** | `payment_status` | String | - | Không | Trạng thái thanh toán: `pending`, `paid`, `refunded` | `pending` |
| **N** | `checkin_status` | String | - | Không | Trạng thái nhận phòng: `pending`, `checked_in`, `checked_out`, `cancelled` | `pending` |
| **O** | `special_requests`| String | - | Có | Yêu cầu đặc biệt, ghi chú | `Phòng yên tĩnh, hoa trang trí` |
| **P** | `source` | String | - | Không | Nguồn đặt: `facebook`, `telegram`, `whatsapp`, `website`, `walk_in` | `facebook` |
| **Q** | `review_sent` | Boolean | - | Không | Trạng thái gửi link review: `TRUE` / `FALSE` | `FALSE` |
| **R** | `created_at` | DateTime | - | Không | Định dạng ISO 8601 UTC | `2026-05-26T16:25:47.000Z` |
| **S** | `updated_at` | DateTime | - | Không | Định dạng ISO 8601 UTC | `2026-05-26T16:26:12.000Z` |

---

### 2.3 Sheet: `Customers` (Hồ sơ khách hàng)
*   **Mô tả**: Lưu trữ hồ sơ liên hệ tổng hợp của khách từ nhiều kênh chat và website.
*   **Cấu trúc cột (A -> K)**:

| Cột | Tên Cột | Kiểu Dữ Liệu | Khóa | Cho Phép Rỗng | Ràng Buộc / Định Dạng | Ví Dụ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A** | `customer_id` | String | PK | Không | Định dạng: `^C\d{3,}$` | `C001` |
| **B** | `customer_name` | String | - | Không | Tên hiển thị của khách | `Nguyễn Thị Lan` |
| **C** | `customer_phone` | String | - | Có | Số điện thoại duy nhất | `0901234567` |
| **D** | `facebook_psid` | String | - | Có | Page-Scoped ID từ Messenger | `psid_98123` |
| **E** | `telegram_chat_id`| String | - | Có | Chat ID từ Telegram | `8839201` |
| **F** | `whatsapp_phone_id`| String| - | Có | Số điện thoại định dạng WhatsApp | `84909876543` |
| **G** | `interaction_count`| Integer| - | Không | Tổng số tin nhắn khách đã gửi | `42` |
| **H** | `last_booking_id` | String | FK | Có | Mã booking gần nhất (Liên kết `Bookings`)| `BL001` |
| **I** | `notes` | String | - | Có | Ghi chú chăm sóc khách hàng, phân hạng VIP | `VIP bạc, thích phòng ban công`|
| **J** | `created_at` | DateTime | - | Không | Định dạng ISO 8601 UTC | `2026-05-26T16:25:47.000Z` |
| **K** | `updated_at` | DateTime | - | Không | Định dạng ISO 8601 UTC | `2026-05-26T16:26:12.000Z` |

---

### 2.4 Sheet: `ChatLogs` (Lịch sử hội thoại)
*   **Mô tả**: Lưu trữ tin nhắn đầu vào/đầu ra để kiểm tra hoạt động bot, phân tích hành vi hoặc huấn luyện AI.
*   **Cấu trúc cột (A -> H)**:

| Cột | Tên Cột | Kiểu Dữ Liệu | Khóa | Cho Phép Rỗng | Ràng Buộc / Định Dạng | Ví Dụ |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A** | `log_id` | String | PK | Không | UUID duy nhất hoặc chuỗi băm | `LOG20260526000001` |
| **B** | `social_id` | String | FK | Không | Định danh từ Messenger/Telegram/WhatsApp | `8839201` |
| **C** | `channel` | String | - | Không | Kênh chat: `facebook`, `telegram`, `whatsapp` | `telegram` |
| **D** | `sender_role` | String | - | Không | Vai trò gửi: `user`, `bot`, `staff` | `user` |
| **E** | `message_content` | String| - | Không | Nội dung chi tiết tin nhắn | `Mình muốn đặt phòng 2 người` |
| **F** | `parsed_intent` | String | - | Có | Nhãn ý định phân tích từ AI NLP | `booking_inquiry` |
| **G** | `parsed_entities` | JSON String | - | Có | Metadata bóc tách (JSON Object) | `{"branch":"cs1","guests":2}` |
| **H** | `timestamp` | DateTime | - | Không | Định dạng ISO 8601 UTC | `2026-05-26T16:25:47.000Z` |

---

## 3. Các Bước Triển Khai Google Apps Script thành Web App

Để biến Google Sheets thành một API cơ sở dữ liệu có khả năng xử lý các yêu cầu HTTP từ Express, làm theo trình tự sau:

### 3.1 Dán mã nguồn vào Script Editor
1. Mở bảng tính Google Sheets của bạn.
2. Trên thanh công cụ, chọn **Tiện ích mở rộng** (Extensions) -> **Apps Script**.
3. Xóa toàn bộ mã mặc định trong tệp `Mã.gs` (hoặc `Code.gs`).
4. Sao chép nội dung tệp tin [google-apps-script.js](file:///D:/HOMENEST%20-%20QUESTX/DAR/bliss/google-apps-script.js) và dán vào cửa sổ soạn thảo.
5. Nhấn biểu tượng 💾 **Lưu dự án** (Save) hoặc tổ hợp phím `Ctrl + S`.

### 3.2 Triển khai Web App (Deploy)
1. Ở góc trên bên phải giao diện Apps Script, nhấp vào nút **Triển khai** (Deploy) -> **Triển khai mới** (New deployment).
2. Chọn loại triển khai bằng cách nhấp vào biểu tượng bánh răng ⚙️ bên cạnh chữ "Chọn loại" (Select type) và chọn **Ứng dụng web** (Web app).
3. Cấu hình thông tin như sau:
    *   **Mô tả**: `Bliss Homestay DB Engine v3.0`
    *   **Thực thi dưới dạng** (Execute as): Chọn **Tôi** (Me - địa chỉ email Google của bạn).
    *   **Ai có quyền truy cập** (Who has access): Chọn **Bất kỳ ai** (Anyone). 
4. Nhấp vào nút **Triển khai** (Deploy).
5. Lúc này Google sẽ yêu cầu cấp quyền truy cập. Nhấp vào **Ủy quyền truy cập** (Authorize access), chọn tài khoản email của bạn.
6. Khi thấy cảnh báo màu đỏ "Google chưa xác minh ứng dụng này" (Google hasn't verified this app), nhấp vào **Nâng cao** (Advanced) -> Chọn **Đi tới Bliss Homestay AI Hub (không an toàn)** (Go to ... (unsafe)).
7. Nhấp **Cho phép** (Allow) ở màn hình điều khoản tiếp theo.
8. Sau khi triển khai hoàn tất, sao chép **URL của ứng dụng web** (Web app URL) được cung cấp. Nó sẽ có dạng như sau:
    `https://script.google.com/macros/s/AKfycbz...-Y1z/exec`

> [!IMPORTANT]
> Mỗi lần bạn chỉnh sửa mã nguồn Apps Script trong tương lai, bạn **BẮT BUỘC** phải tạo một phiên bản triển khai mới (hoặc cập nhật phiên bản cũ) để các thay đổi có hiệu lực. Cách làm: Nhấp **Triển khai** -> **Quản lý cấu hình triển khai** -> Chọn phiên bản Web App -> Nhấp biểu tượng bút chì để sửa -> Chọn Phiên bản là "Mới" -> Nhấp **Triển khai**.

---

## 4. Khởi Tạo Cơ Sở Dữ Liệu Tự Động

Để tạo nhanh 4 trang tính chuẩn và nạp dữ liệu phòng mẫu (seed data):
1. Trong màn hình soạn thảo Apps Script, tìm thanh công cụ chọn hàm thực thi.
2. Chọn hàm có tên `initializeSpreadsheet` từ danh sách thả xuống.
3. Nhấp nút **Chạy** (Run) bên cạnh.
4. Xem bảng điều khiển nhật ký phía dưới (Execution log). Bạn sẽ thấy thông báo khởi tạo thành công 4 sheet và nạp 6 phòng mẫu vào sheet `Rooms`.
5. Quay lại Google Sheets để xác nhận các trang tính mới đã xuất hiện kèm định dạng màu sắc đẹp mắt.

---

## 5. Cấu Hình Thuộc Tính Dự Án (Script Properties)

Để bảo mật khóa kết nối và điều phối cơ chế thông báo đổi cache về Express Server, hãy cấu hình các biến môi trường trong Google Apps Script:

1. Trong giao diện Apps Script, nhấp vào biểu tượng bánh răng **Cài đặt dự án** (Project Settings) ở danh mục menu bên trái.
2. Cuộn xuống phần **Thuộc tính tập lệnh** (Script Properties).
3. Nhấp vào **Thêm thuộc tính tập lệnh** (Add script property) và khai báo 3 biến sau:

| Tên Thuộc Tính (Key) | Giá Trị (Value) | Mô Tả |
| :--- | :--- | :--- |
| `API_KEY` | *Ví dụ: `BlissSecureToken2026`* | Khóa xác thực mà Express Server phải truyền lên trong URL hoặc Request Body để được phép đọc/ghi dữ liệu. |
| `SERVER_URL` | *Ví dụ: `https://bliss-ai-hub.ngrok-free.app`* | URL gốc của Express Server. Apps Script sẽ gọi webhook đến địa chỉ này để báo thay đổi dữ liệu. |
| `SERVER_TOKEN` | *Ví dụ: `ServerWebAccessSecretHashKey`* | Khóa bảo mật Bearer JWT để xác thực Apps Script khi gọi POST về route `/backend/api/sync-cache` của server. |

4. Nhấp **Lưu thuộc tính tập lệnh** (Save script properties).

---

## 6. Thiết Lập Trigger Tự Động Đồng Bộ Bộ Nhớ Đệm (Real-time Cache Sync)

Để giải quyết triệt để lỗi **Stale Cache** (Dữ liệu cache trên server bị cũ khi Admin sửa trực tiếp ô trong Google Sheets) được cảnh báo trong bài đánh giá bảo mật, chúng ta cần cấu hình một **Installable Trigger**.

> [!CAUTION]
> Tuyệt đối không đổi tên hàm `onEditTrigger` thành `onEdit`. Trong Google Apps Script, `onEdit(e)` là Trigger đơn giản (Simple Trigger). Trình kích hoạt này bị Google giới hạn quyền bảo mật nghiêm ngặt và sẽ chặn hàm `UrlFetchApp.fetch` thực hiện gọi mạng, dẫn đến lỗi silent fail. Cần cấu hình trigger cài đặt theo hướng dẫn dưới đây.

### Các bước cài đặt Installable Trigger:
1. Tại thanh menu bên trái của giao diện Apps Script, nhấp vào biểu tượng đồng hồ ⏰ **Trình kích hoạt** (Triggers).
2. Nhấp vào nút **Thêm trình kích hoạt** (+ Add Trigger) ở góc dưới cùng bên phải.
3. Cấu hình bảng cài đặt như sau:
    *   **Chọn hàm sẽ chạy**: `onEditTrigger`
    *   **Chọn phần triển khai để chạy**: `Khả dụng (Đầu/Head)`
    *   **Chọn nguồn sự kiện**: `Từ bảng tính`
    *   **Chọn loại sự kiện**: `Khi chỉnh sửa` (On edit)
    *   **Cài đặt thông báo lỗi**: `Thông báo cho tôi ngay lập tức`
4. Nhấp **Lưu** (Save). Hệ thống có thể hiển thị hộp thoại xác thực bảo mật một lần nữa, hãy thực hiện ủy quyền tương tự như Bước 3.2.

---

## 7. Các Kịch Bản Kiểm Thử Kết Nối (Integration Testing)

Sử dụng `curl`, Postman hoặc các thư viện gọi HTTP trên máy chủ để kiểm tra các hành động CRUD qua Web App URL của bạn:

### 7.1 Lấy Danh Sách Phòng (READ)
```bash
curl -X GET "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec?token=BlissSecureToken2026&sheet=rooms"
```
*   **Phản hồi thành công (200 OK)**:
    ```json
    {
      "success": true,
      "data": [
        {
          "_rowNum": 2,
          "room_id": "XH01",
          "room_name": "Phòng Việt Nam",
          "branch": "cs1",
          "branch_name": "Chi nhánh Tân Bình (CS1)",
          "capacity": 2,
          "base_price_weekday": 600000,
          "base_price_weekend": 800000,
          "slot_prices": {"08:00 - 11:00": 150000},
          "amenities": ["Bếp tự nấu", "WiFi", "NVS riêng", "Điều hòa"],
          "images": ["images/room_1_main.png"],
          "emoji": "🇻🇳",
          "status": "active",
          "created_at": "2026-05-26T16:25:47.000Z",
          "updated_at": "2026-05-26T16:26:12.000Z"
        }
      ],
      "status": 200
    }
    ```

### 7.2 Tạo Mới Một Booking (CREATE)
```bash
curl -X POST "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec" \
     -H "Content-Type: application/json" \
     -d '{
       "token": "BlissSecureToken2026",
       "sheet": "bookings",
       "action": "create",
       "data": {
         "customer_name": "Nguyễn Văn A",
         "customer_phone": "0912345678",
         "customer_social_id": "fb_user_1122",
         "branch": "cs1",
         "branch_name": "Chi nhánh Tân Bình (CS1)",
         "room_id": "XH01",
         "room_name": "Phòng Việt Nam",
         "check_in_date": "2026-06-01",
         "check_out_date": "2026-06-03",
         "num_guests": 2,
         "total_price": 1600000,
         "status": "confirmed",
         "special_requests": "Cần nhận phòng muộn lúc 15:00",
         "source": "facebook"
       }
     }'
```

### 7.3 Cập Nhật Trạng Thái Đặt Phòng (UPDATE)
```bash
curl -X POST "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec" \
     -H "Content-Type: application/json" \
     -d '{
       "token": "BlissSecureToken2026",
       "sheet": "bookings",
       "action": "update",
       "id": "BL006",
       "data": {
         "status": "checked_in"
       }
     }'
```

### 7.4 Xóa Phòng (DELETE)
*   **Xóa mềm (Soft-delete)** - Cập nhật trạng thái status thành `inactive` hoặc `cancelled`:
```bash
curl -X POST "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec" \
     -H "Content-Type: application/json" \
     -d '{
       "token": "BlissSecureToken2026",
       "sheet": "rooms",
       "action": "delete",
       "id": "XH09",
       "force": false
     }'
```

*   **Xóa cứng (Hard-delete)** - Xóa hoàn toàn dòng khỏi Google Sheet:
```bash
curl -X POST "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec" \
     -H "Content-Type: application/json" \
     -d '{
       "token": "BlissSecureToken2026",
       "sheet": "rooms",
       "action": "delete",
       "id": "XH09",
       "force": true
     }'
```

---

## 8. Khuyến Nghị & Biện Bảo Đảm Vận Hành Tốt Nhất (Best Practices)

Để đảm bảo hệ thống duy trì hiệu suất cao và không phát sinh lỗi bất ngờ:

1.  **Chia Sẻ Bảng Tính (Spreadsheet Sharing)**:
    *   Chia sẻ quyền xem/chỉnh sửa tệp Google Sheets với địa chỉ Google Service Account Email của dự án (ví dụ: `bliss-sheets-account@bliss-homestay.iam.gserviceaccount.com`).
    *   Hạn chế chia sẻ công khai bảng tính cho người lạ. Chỉ cho phép các Admin nội bộ có quyền chỉnh sửa thủ công.
2.  **Quản Lý Secrets**:
    *   Tuyệt đối không lưu cứng (hardcode) mật khẩu, `API_KEY` của Apps Script hoặc Token kết nối trong mã nguồn. Hãy sử dụng hệ thống **Script Properties** trong cài đặt của Google Apps Script như hướng dẫn ở **Mục 5**.
3.  **Tối Ưu Hạn Mức Ghi Hàng Loạt (Batch Updates)**:
    *   Hạn mức API đọc/ghi của Google Sheets là **100 lượt gọi/100 giây/mỗi tài khoản**. Để tránh lỗi nghẽn dòng (Error `429 Too Many Requests`), Express Server nên gửi dữ liệu chat logs dạng mảng lớn thông qua hành động ghi hàng loạt (`create` với `data` dạng mảng `[...]`) sau mỗi 5 phút thay vì gửi từng dòng mỗi khi phát sinh tin nhắn.
4.  **Bảo Vệ Khóa ID Trùng Lặp**:
    *   Apps Script sử dụng khóa logic `LockService.getScriptLock()` để ngăn chặn hai phiên đồng thời sinh cùng một ID (ví dụ: cùng tạo `BL006`). Luôn giữ hàm tạo ID nằm trong phạm vi được bao bọc bởi Lock để tránh xung đột dữ liệu.
