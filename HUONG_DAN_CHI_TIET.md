# 🌿 Bliss Homestay AI Hub & CRM v3.0 - Hướng Dẫn Vận Hành Chi Tiết

Tài liệu này cung cấp toàn bộ hướng dẫn từ A-Z để thiết lập, cấu hình và vận hành hệ thống **Bliss Homestay AI Hub & CRM v3.0** tại 5 chi nhánh Sài Gòn (59 phòng). Hệ thống hỗ trợ hai phương án kết nối chính cho Chatbot Facebook Messenger: qua máy chủ Express cục bộ hoặc qua nền tảng Make.com (No-Code).

---

## 🗺️ 1. Bản Đồ Kiến Trúc Hệ Thống

Hệ thống hoạt động trên mô hình lai (Hybrid Cloud/Local) kết hợp ưu điểm của cả hai công nghệ:

```
[Facebook Messenger User] ◀─── (Chat) ───▶ [Fanpage Facebook]
                                                   │
                            ┌──────────────────────┴──────────────────────┐
                            │ (Phương án 1: Trực tiếp)                     │ (Phương án 2: No-Code)
                            ▼                                             ▼
                     [Express Server]                                [Make.com]
                  (Dịch vụ đồng bộ cache)                   (Bộ tích hợp Messenger/Sheets/Gemini)
                            │                                             │
                            ├─────────────────────────────────────────────┘
                            ▼
                [Google Sheets Database] (Rooms, Bookings, Customers, ChatLogs)
                            ▲
                            │ (Ghi tuần tự đồng bộ)
                   [SQLite Local Cache] (Khóa chống đặt trùng phòng, hàng đợi ghi lùi)
```

---

## 📍 2. Danh Sách 5 Chi Nhánh & 59 Phòng Sài Gòn (Seeded)

Dữ liệu thực tế được đồng bộ trực tiếp với Google Sheets từ nguồn `beacons.ai/blisshome/cs5bnhthnh`:

### 🏡 CS1: Tân Bình
*   **Địa chỉ**: 71 Xuân Hồng, Phường 12, Quận Tân Bình.
*   **Danh sách phòng**: 9 phòng (`XH01` - `XH09`).
*   **Tiện ích**: Bếp tự nấu, bàn bida, PS4, ban công/cửa sổ thoáng mát.

### 🏡 CS2: Quận 10
*   **Địa chỉ**: 25a Đường 3 Tháng 2, Phường 11, Quận 10.
*   **Danh sách phòng**: 11 phòng.
    *   *Homestay/Bida*: `BTH101` - `BTH601`.
    *   *Cinebox giải trí*: `CINEBOX01` - `CINEBOX05`.

### 🏡 CS3: Quận 5
*   **Địa chỉ**: 2N Phạm Hữu Chí, Phường 12, Quận 5.
*   **Danh sách phòng**: 9 phòng (`PHC01` - `PHC09`).
*   **Đặc trưng**: Thiết kế ấm cúng, bàn bida riêng, hệ máy chơi game Nintendo Switch/PS4.

### 🏡 CS4: Gò Vấp
*   **Địa chỉ**: 331/16 Phan Huy Ích, Phường 14, Quận Gò Vấp.
*   **Danh sách phòng**: 17 phòng.
    *   *Cinebox Cozy*: `CB402` - `CB409`.
    *   *Bigbox Game Studio*: `BB410` - `BB418` (Phòng theo chủ đề: *It Takes Two, Little Nightmares, Overcooked, Hogwarts, Cyberpunk*...).

### 🏡 CS5: Bình Thạnh
*   **Địa chỉ**: 217/70/5 Bùi Đình Tuý, Phường 14, Quận Bình Thạnh.
*   **Danh sách phòng**: 13 phòng (`DT501` - `DT513`).
*   **Đặc trưng**: Căn hộ Duplex/phòng riêng ấm cúng chủ đề hoạt hình (Zelda, Mario, Kirby, Harry Potter, Mickey...), có bồn tắm cực chill.

---

## 📊 3. Thiết Lập Google Sheets & Apps Script (Database API)

### Bước 3.1: Tạo bảng tính Google Sheets
1. Tạo một bảng tính Google Sheets mới trên Google Drive.
2. Thiết lập 4 trang tính (Tabs) với tên chính xác: `Rooms`, `Bookings`, `Customers`, `ChatLogs`.

### Bước 3.2: Dán mã nguồn Apps Script
1. Trên Google Sheets, nhấp vào **Tiện ích mở rộng** (Extensions) ➔ **Apps Script**.
2. Xóa toàn bộ mã mặc định và dán nội dung từ tệp [google-apps-script.js](file:///D:/HOMENEST%20-%20QUESTX/DAR/bliss/google-apps-script.js).
3. Nhấp biểu tượng 💾 **Lưu** (`Ctrl + S`).

### Bước 3.3: Khởi tạo và nạp dữ liệu mẫu tự động
1. Ở thanh công cụ Apps Script, chọn hàm `initializeSpreadsheet` từ danh sách thả xuống.
2. Nhấp nút **Chạy** (Run). Bạn sẽ thấy bảng tính tự động tạo các tiêu đề cột và nạp cấu trúc chuẩn đẹp mắt.

### Bước 3.4: Triển khai thành Web App (Cung cấp URL API)
1. Nhấp vào nút **Triển khai** (Deploy) ➔ **Triển khai mới** (New deployment).
2. Nhấp biểu tượng bánh răng chọn **Ứng dụng web** (Web app).
3. Cấu hình:
   * **Thực thi dưới dạng** (Execute as): Chọn **Tôi** (đại chỉ email Google của bạn).
   * **Ai có quyền truy cập** (Who has access): Chọn **Bất kỳ ai** (Anyone).
4. Nhấp **Triển khai**. Xác nhận cấp quyền và sao chép **URL ứng dụng web** (Web App URL) có định dạng:
   `https://script.google.com/macros/s/AKfycb.../exec`

### Bước 3.5: Cấu hình thuộc tính bảo mật (Script Properties)
Đi tới **Cài đặt dự án** (Project Settings - biểu tượng bánh răng bên trái) ➔ **Thuộc tính tập lệnh** (Script Properties), thêm 3 biến sau:
* `API_KEY`: Mã bảo mật tự chọn (Ví dụ: `BlissSecureToken2026`).
* `SERVER_URL`: Địa chỉ máy chủ Express của bạn (Xem terminal khi chạy `npm start`).
* `SERVER_TOKEN`: Token JWT của máy chủ để nhận tín hiệu thay đổi dữ liệu.

### Bước 3.6: Tạo Trigger tự động đồng bộ thời gian thực (Installable Trigger)
1. Tại thanh menu bên trái, nhấp vào biểu tượng đồng hồ ⏰ **Trình kích hoạt** (Triggers) ➔ **Thêm trình kích hoạt** (Add Trigger).
2. Cấu hình:
   * **Hàm chạy**: `onEditTrigger`
   * **Nguồn sự kiện**: `Từ bảng tính`
   * **Loại sự kiện**: `Khi chỉnh sửa` (On edit)
3. Nhấp **Lưu** và hoàn tất xác thực.

---

## 💻 4. Cấu HìNH & Chạy Máy Chủ Express Backend

### Bước 4.1: Cấu hình file `.env`
Tạo tệp `.env` tại thư mục gốc của dự án (`D:\HOMENEST - QUESTX\DAR\bliss\.env`) và điền các thông số:

```env
PORT=3000
JWT_SECRET=YourSuperSecretKeyHere
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourCRMAdminPassword

# URL Web App từ bước 3.4
SHEETS_WEB_APP_URL=https://script.google.com/macros/s/AKfycb.../exec
SHEETS_API_KEY=BlissSecureToken2026

# Token AI Studio
GEMINI_API_KEY=your_gemini_api_key_here

# Meta Credentials (Để chạy chatbot trực tiếp qua server - Phương án 1)
MESSENGER_PAGE_ACCESS_TOKEN=your_fb_page_token
MESSENGER_VERIFY_TOKEN=BlissBotSecure2026
MESSENGER_APP_SECRET=your_fb_app_secret
```

### Bước 4.2: Khởi chạy dự án
Chạy lệnh duy nhất tại terminal thư mục dự án:
```bash
npm install
npm start
```
*Hệ thống sẽ khởi chạy Express Server, SQLite Cache, và mở đường truyền bảo mật (SSH Tunnel). Hãy chú ý địa chỉ Webhook lhr.life hiển thị ở cửa sổ dòng lệnh.*

---

## 💬 5. Hướng Dẫn Kết Nối Chatbot Facebook Messenger

Bạn chọn một trong hai phương án vận hành sau tùy thuộc nhu cầu dự án:

### 🔴 PHƯƠNG ÁN 1: Kết nối trực tiếp vào Express Server (Khuyên dùng)
*Phù hợp khi bạn muốn dùng bộ State Machine, NLP tiếng Việt ngoại tuyến và AI Gemini đã lập trình sẵn để quản lý đặt phòng tự động, đồng thời cho phép nhân viên trực tiếp chat với khách hàng trên giao diện CRM Dashboard.*

1. Truy cập [Meta for Developers](https://developers.facebook.com/) ➔ Chọn ứng dụng của bạn.
2. Thêm sản phẩm **Messenger** ➔ Đi tới **Messenger Settings**:
   * **Configure Webhook**:
     * **Callback URL**: Dán địa chỉ in trên Terminal server (Dạng `https://xxx.lhr.life/webhook/messenger`).
     * **Verify Token**: Điền `BlissBotSecure2026`.
     * Nhấp **Verify and Save**.
   * **Webhook Fields**: Click **Manage** và tích chọn `messages` và `messaging_postbacks`, click **Save**.
3. **Access Tokens**: Nhấp **Add or Remove Pages** để chọn Fanpage Bliss Homestay của bạn, tạo **Page Access Token** và cập nhật vào biến `MESSENGER_PAGE_ACCESS_TOKEN` ở file `.env`.

---

### 🟢 PHƯƠNG ÁN 2: Lập cấu hình kịch bản tự động trên Make.com (No-Code)
*Phù hợp nếu bạn muốn tự cấu hình luồng kéo thả của Make.com mà không cần sử dụng webhook của máy chủ Express.*

#### 🛠️ Sơ đồ luồng kịch bản trên Make.com:
`Facebook Messenger (Watch Messages)` ➔ `Google Sheets (Search Rows)` ➔ `Google Gemini (Generate Content)` ➔ `Facebook Messenger (Send a Message)`

#### 📝 Hướng dẫn thiết lập từng bước:

##### 1. Module 1: Facebook Messenger (Watch Messages)
* **Tác vụ**: Lắng nghe và nhận tin nhắn mới từ khách hàng.
* **Cấu hình**:
  * Nhấp **Add** để liên kết tài khoản Facebook chứa Trang của bạn.
  * Chọn đúng Trang Fanpage Bliss Homestay.
  * Make.com sẽ tự động đăng ký webhook bảo mật với Fanpage.

##### 2. Module 2: Google Sheets (Search Rows)
* **Tác vụ**: Đọc danh sách 59 phòng đang hoạt động cùng địa chỉ của từng phòng.
* **Cấu hình**:
  * **Connection**: Chọn tài khoản Google Drive của bạn.
  * **Spreadsheet**: Chọn tệp bảng tính quản lý Bliss Homestay.
  * **Sheet**: Chọn trang tính `Rooms`.
  * **Filter**: Chọn cột `status` **Equal to** `active`.
  * Nhấp **OK**.

##### 3. Module 3: Google Gemini (Generate Content)
* **Tác vụ**: Đọc nội dung chat, danh sách phòng và soạn câu trả lời phù hợp.
* **Cấu hình**:
  * **Model**: Chọn `gemini-1.5-flash` để phản hồi tức thì.
  * **Prompt (Hệ thống)**: Sao chép và dán prompt mẫu sau:
    ```text
    Bạn là Trợ lý ảo AI cực kỳ nhiệt tình, mến khách và chuyên nghiệp của chuỗi homestay Bliss Homestay tại TP.HCM.
    Hãy đọc danh sách các phòng và địa chỉ thực tế từ cơ sở dữ liệu Google Sheets dưới đây để tư vấn chính xác nhất cho khách hàng:

    ---
    DANH SÁCH PHÒNG ĐANG HOẠT ĐỘNG:
    {{2.output}} 
    (Kéo thả biến đầu ra danh sách dòng của module Google Sheets vào đây)
    ---

    QUY ĐỊNH CHUNG CỦA BLISS:
    - Giờ nhận phòng (check-in): sau 14h00. Giờ trả phòng (check-out): trước 12h00.
    - Mật khẩu WiFi tại các chi nhánh: Tên mạng: "BlissHome" | Mật khẩu: "bliss2024".
    - Tiện ích: Đỗ xe máy miễn phí. Ô tô vui lòng liên hệ trước để check vị trí bãi đỗ.

    QUY TẮC PHẢN HỒI:
    1. Trả lời thân thiện bằng tiếng Việt, xưng hô lịch sự, ấm áp (ví dụ: dạ, vâng, chúng mình...).
    2. Nếu khách hỏi tìm phòng hoặc hỏi về chi nhánh cụ thể (Tân Bình - CS1, Quận 10 - CS2, Quận 5 - CS3, Gò Vấp - CS4, Bình Thạnh - CS5), hãy lọc danh sách phòng trên và giới thiệu các phòng phù hợp tại chi nhánh đó.
    3. Sử dụng các emoji phù hợp (🏡, 🔑, 🎮, 🎬) để làm tin nhắn sinh động.
    4. Trả lời ngắn gọn, trực diện, không dài dòng.

    Tin nhắn của khách hàng: "{{1.sender.message.text}}"
    (Kéo thả trường văn bản tin nhắn của khách từ module Facebook Messenger vào đây)
    ```

##### 4. Module 4: Facebook Messenger (Send a Message)
* **Tác vụ**: Gửi câu trả lời của AI Gemini lại cho khách.
* **Cấu hình**:
  * **Page**: Chọn Trang Fanpage của bạn.
  * **Recipient ID**: Map biến `Sender ID` từ module 1.
  * **Message Type**: Chọn `Response`.
  * **Text**: Map trường `Text` đầu ra của module Google Gemini (`Candidates` ➔ `Content` ➔ `Parts` ➔ `Text`).
  * Bấm **Save**, chuyển công tắc **Scheduling** ở góc dưới cùng bên trái sang **ON** để kích hoạt!

---

## 🎨 6. Vận Hành Giao Diện Boutique CRM Admin Dashboard

Sau khi máy chủ Express khởi chạy thành công:
1. Mở trình duyệt và truy cập: `http://localhost:3000/frontend/crm/`
2. **Đăng nhập**: Điền thông tin tài khoản admin mặc định (Tên đăng nhập: `admin` | Mật khẩu: `BlissAdmin2026`).
3. **Các tính năng cốt lõi**:
   * **Dashboard**: Xem thống kê doanh thu, tỷ lệ lấp đầy phòng theo thời gian thực và trạng thái hoạt động của hàng đợi đồng bộ.
   * **Bookings**: Quản lý trạng thái check-in/check-out của khách, tạo đơn đặt phòng mới thủ công.
   * **Rooms**: Thêm mới phòng, tải ảnh, cập nhật giá ngày thường/cuối tuần và sửa đổi tiện ích.
   * **Customers**: Quản lý thông tin liên lạc, số lần tương tác và ghi chú VIP của từng khách hàng.
   * **Chat Console**: Giao diện trực quan 3 cột để theo dõi luồng hội thoại của khách với AI Chatbot. Nhân viên có thể click chọn một khách hàng và gửi tin nhắn trả lời đè lên bot khi cần can thiệp thủ công.

---

## 🧪 7. Kiểm Thử Hệ Thống (Test Runner)

Để đảm bảo toàn bộ hệ thống (xác thực, khả năng ghi đồng thời chống trùng đặt phòng, xử lý webhook và đồng bộ dữ liệu) hoạt động hoàn hảo:
```bash
node test_runner.js
```
*Nếu tất cả 18 kịch bản kiểm thử trả về kết quả màu xanh `✅ [PASSED]`, hệ thống đã sẵn sàng đưa vào vận hành thực tế.*
