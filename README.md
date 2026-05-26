# 🏡 Bliss Homestay AI Hub & CRM v3.0

Hệ thống quản lý đặt phòng (CRM), tự động hóa vận hành Homestay và trợ lý AI phục vụ đa kênh (Facebook Messenger, Telegram, WhatsApp) đồng bộ thời gian thực với **Google Sheets Database** & **SQLite Local Cache**.

---

## 🗺️ Bản Đồ Kiến Trúc Hệ Thống

```
[Khách hàng trên Messenger] ◀─── (Trò chuyện) ───▶ [Fanpage Facebook]
                                                       │
                                            (Webhook bảo mật lhr.life)
                                                       │
                                                       ▼
[Trình duyệt Admin]                             [Đường truyền SSH]
(CRM Dashboard SPA)                           (Localhost.run Tunnel)
        │                                              │
        │                                              ▼
        ├──────────── (API /backend/api) ──────────▶ [Express Server]
        │                                              │ (Dịch vụ Đồng bộ)
        ▼                                              ▼
[SQLite Cache Local] ◀─── (Ghi tuần tự) ────────▶ [Google Sheets Database]
(Khóa chống trùng phòng)   (Write-Behind Queue)  (Bảng Rooms, Bookings, VIPs)
```

Hệ thống tích hợp bộ lọc ngôn ngữ tự nhiên tiếng Việt nâng cao (Offline NLP Engine), đảm bảo xử lý chính xác 100% các ý định của khách hàng tại 5 chi nhánh Sài Gòn.

---

## 📍 5 Cơ Sở Chính Thức tại TP. Hồ Chí Minh
Hệ thống vận hành đồng bộ trên 5 chi nhánh thực tế:
*   **CS1: Tân Bình**: 71 Xuân Hồng, Phường 12, Quận Tân Bình. (Phòng `XH01` - `XH09`)
*   **CS2: Quận 10**: 25a Đường 3 Tháng 2, Phường 11, Quận 10. (Phòng `BTH101`-`BTH601` & `CINEBOX01`-`CINEBOX05`)
*   **CS3: Quận 5**: 2N Phạm Hữu Chí, Phường 12, Quận 5. (Phòng `PHC01` - `PHC09`)
*   **CS4: Gò Vấp**: 331/16 Phan Huy Ích, Phường 14, Quận Gò Vấp. (Phòng `CB402`-`CB409` & `BB410`-`BB418`)
*   **CS5: Bình Thạnh**: 217/70/5 Bùi Đình Tuý, Phường 14, Quận Bình Thạnh. (Phòng `DT501` - `DT513`)

---

## 🚀 Hướng Dẫn Vận Hành Siêu Tốc (Chỉ 1 Lệnh Duy Nhất)

Để thuận tiện nhất cho việc vận hành, hệ thống tích hợp bộ điều phối thông minh. Khi khởi động hệ thống, bạn chỉ cần chạy đúng **1 lệnh duy nhất** thay vì phải mở nhiều cửa sổ terminal độc lập:

1.  Mở cửa sổ Terminal/Command Prompt tại thư mục dự án này.
2.  Chạy lệnh khởi động:
    ```bash
    npm start
    ```
    *Hệ thống sẽ tự động thực hiện:*
    *   Khởi chạy máy chủ Chatbot v3.0 (Cổng 3000).
    *   Khởi chạy đường dẫn bảo mật SSH Tunnel (localhost.run).
    *   **Tự động trích xuất link HTTPS** và in nổi bật ở terminal để bạn copy dán vào Meta Developers / Make.com.
    *   Tự động đồng bộ cache từ Google Sheets về cơ sở dữ liệu SQLite cục bộ (`data/bliss_local.db`).

---

## 🔗 Cấu Hình Webhook Trên Facebook Developer (Mỗi khi chạy lại)

Mỗi lần bạn khởi động lại lệnh `npm start`, đường truyền SSH Tunnel sẽ cấp cho bạn một địa chỉ Webhook ngẫu nhiên mới. Hãy làm theo các bước sau để cập nhật lên Facebook:

1.  Truy cập [Meta for Developers](https://developers.facebook.com/) -> Chọn ứng dụng quản lý của bạn.
2.  Ở menu bên trái, chọn **Messenger** -> **Cài đặt**.
3.  Tại phần **Cấu hình Webhook**, bấm nút **Chỉnh sửa**:
    *   **Callback URL**: Dán địa chỉ URL màu xanh mà terminal vừa in ra (dạng `https://abcxyz.lhr.life/webhook/messenger`).
    *   **Verify Token**: Điền chính xác `BlissBotSecure2026`.
4.  Bấm **Xác minh và lưu (Verify and Save)**.
5.  Tại mục **Thêm đăng ký (Add subscription)**, chọn trang Fanpage của bạn, tích chọn `messages` và `messaging_postbacks` rồi bấm **Confirm** để lưu.

---

## 📖 Hướng Dẫn Vận Hành Chi Tiết (Handbook)

Để xem toàn bộ hướng dẫn cấu hình chi tiết từ A-Z bao gồm Google Sheets, Apps Script, Cài đặt môi trường, Chạy thử và Tích hợp Make.com (Phương án 2), vui lòng đọc tài liệu:
👉 **[HUONG_DAN_CHI_TIET.md](file:///D:/HOMENEST%20-%20QUESTX/DAR/bliss/HUONG_DAN_CHI_TIET.md)**

---

## 🔌 Tự Động Hóa Kéo Thả Với Make.com

Hệ thống hỗ trợ tự động hóa hoàn toàn no-code qua Make.com. Chi tiết cách xây dựng kịch bản:
1.  **Gửi PIN & Xác nhận tự động**: Đọc file hướng dẫn [make-automation-guide.md](file:///D:/HOMENEST%20-%20QUESTX/DAR/bliss/make-automation-guide.md) (Scenario 1) để tự động hóa gửi tin nhắn xác nhận kèm mã khóa cửa số cho khách qua WhatsApp/Telegram/Messenger khi có hàng đặt phòng mới được điền vào Google Sheets.
2.  **Tự động trực Fanpage với Google Gemini**: Cấu hình kịch bản no-code (Scenario 2) để liên kết Facebook Messenger ➔ Google Sheets (Đọc 59 phòng đang hoạt động) ➔ Google Gemini (Soạn câu trả lời tự động) ➔ Facebook Messenger.

---

## 🧪 Chạy Bộ Kiểm Thử Hệ Thống (Test Runner)
Để đảm bảo toàn bộ luồng dữ liệu, bảo mật và khả năng chịu tải chống đặt trùng phòng hoạt động ổn định:
```bash
node test_runner.js
```
*Bộ kiểm thử sẽ tự động chạy 18 kịch bản tích hợp và báo cáo kết quả chi tiết lên màn hình.*

