# 🏡 Bliss Homestay AI Hub & Live Facebook Chatbot

Hệ thống quản lý đặt phòng (CRM), tự động hoá vận hành Homestay và **Live Facebook Messenger Chatbot** chạy cục bộ với **chi phí vận hành bằng 0**.

Hệ thống tích hợp bộ lọc ngôn ngữ tự nhiên tiếng Việt nâng cao (Offline NLP Engine) đạt độ chính xác 100% trên bộ kiểm thử, cùng với giao diện đặt phòng boutique lấy cảm hứng từ DozyHome.

---

## 🗺️ Bản Đồ Kiến Trúc Hệ Thống

```
[Khách hàng trên Messenger] ◀─── (Tin nhắn thật) ───▶ [Fanpage Facebook]
                                                               │
                                                       (Webhook công khai)
                                                               │
                                                               ▼
[Trình duyệt Admin]                                    [Đường truyền SSH]
(index.html - Live CRM)                               (lhr.life / Localhost.run)
       │                                                       │
 (localStorage)                                                │
       │                                                       ▼
       └───────────◀─── [facebook-bot-server.js] ◀─────────────┘
                        (NLP & Chatbot State Machine)
```

---

## 🚀 Hướng Dẫn Khởi Chạy Siêu Tốc (Chỉ 1 Lệnh Duy Nhất)

Để giúp bạn vận hành hệ thống thuận tiện nhất, tôi đã tích hợp bộ điều phối thông minh. Khi khởi động lại hệ thống, bạn chỉ cần chạy đúng **1 lệnh duy nhất** thay vì phải mở nhiều cửa sổ terminal độc lập:

1. Mở cửa sổ Terminal/Command Prompt tại thư mục dự án này.
2. Chạy lệnh khởi động:
   ```bash
   npm start
   ```
   *(hoặc `node start.js` nếu bạn không dùng npm)*

### 💫 Máy chủ sẽ tự động thực hiện:
* Khởi chạy máy chủ Chatbot v2.1 (Port 3000).
* Khởi chạy đường dẫn bảo mật SSH Tunnel (localhost.run).
* **Tự động trích xuất link HTTPS** và in ra một bảng thông báo màu sắc nổi bật ngay tại terminal để bạn copy dán vào Facebook!

---

## 🔗 Cấu Hình Webhook Trên Facebook Developer (Khi chạy lại)

Mỗi lần bạn khởi động lại lệnh `npm start`, đường truyền SSH Tunnel sẽ cấp cho bạn một địa chỉ Webhook ngẫu nhiên mới. Hãy làm theo 3 bước sau để cập nhật lên Facebook:

1. Truy cập [Meta for Developers](https://developers.facebook.com/) -> Chọn ứng dụng **Bliss Homestay Chatbot**.
2. Ở menu bên trái, chọn **Trường hợp sử dụng** -> **Tùy chỉnh** -> **Cài đặt API Messenger**.
3. Tại phần **1. Đặt cấu hình webhook**, bấm nút **Chỉnh sửa**:
   * **URL gọi lại (Callback URL)**: Dán địa chỉ URL màu xanh mà terminal vừa in ra (dạng `https://abcxyz.lhr.life/webhook`).
   * **Xác minh mã (Verify Token)**: Điền chính xác `BlissBotSecure2026`.
4. Bấm **Xác minh và lưu (Verify and Save)**.
5. Kiểm tra phần **2. Tạo mã truy cập**:
   * Nếu nút **Thêm đăng ký (Add subscription)** ở Fanpage của bạn hiện lên, hãy click vào đó, tích chọn lại `messages` và `messaging_postbacks` rồi bấm **Confirm** để lưu.

🎉 **Xong!** Chatbot đã hoạt động trở lại. Bạn có thể nhắn tin tới Fanpage Facebook của mình để kiểm tra!

---

## 🛠️ Bảo Trì & Xử Lý Sự Cố (Troubleshooting)

| Sự cố | Nguyên nhân | Cách khắc phục |
|---|---|---|
| **Facebook báo lỗi không Webhook được** | Chưa bật máy chủ ở Bước 2 hoặc SSH Tunnel ở Bước 3 bị ngắt. | Khởi chạy lại lệnh `node facebook-bot-server.js` và lệnh `ssh...`, dán lại Callback URL mới. |
| **Không thấy Token được sinh ra** | Chưa bấm **Confirm** xác nhận đăng ký Webhook ở Bước 2. | Bấm nút "Thêm đăng ký" ở Bước 2, tích chọn `messages` và `messaging_postbacks` -> Confirm. |
| **Muốn đổi mã PIN cửa tự động** | Cần thay đổi cấu hình mặc định. | Vào tab **Cài đặt** trên giao diện Web UI -> Sửa **Mã PIN cửa check-in** và lưu lại. |
| **Lỗi cổng 3000 đang bị chiếm dụng** | Có một máy chủ cũ đang chạy ngầm trên máy của bạn. | Khởi động lại máy tính của bạn hoặc tìm kill process chạy ngầm tại cổng 3000 trước khi chạy lệnh. |
