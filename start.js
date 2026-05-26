/**
 * ============================================================
 * start.js — Unified Orchestrator Script for Bliss Homestay
 * ============================================================
 * Khởi chạy đồng thời cả Máy chủ Chatbot (Port 3000) và Đường truyền SSH Tunnel.
 * Tự động lọc đường dẫn webhook công khai và in nổi bật ở terminal!
 * 
 * Chỉ cần chạy đúng 1 lệnh duy nhất:
 * >> npm start   (hoặc node start.js)
 */

const { spawn } = require('child_process');

console.log(`
============================================================
🚀 KHỞI ĐỘNG HỆ THỐNG BLISS HOMESTAY AI CHATBOT TOÀN DIỆN...
============================================================
`);

// 1. Khởi chạy Máy chủ Chatbot v3.0
const server = spawn('node', ['server.js'], { shell: true });

server.stdout.on('data', (data) => {
  process.stdout.write(data.toString());
});

server.stderr.on('data', (data) => {
  process.stderr.write(`\x1b[31m[Server Error] ${data}\x1b[0m`);
});

// 2. Khởi chạy SSH Tunnel (localhost.run)
const tunnel = spawn('ssh', ['-o', 'StrictHostKeyChecking=no', '-R', '80:localhost:3000', 'nokey@localhost.run'], { shell: true });

tunnel.stdout.on('data', (data) => {
  const output = data.toString();
  
  // Tự động phân tích cú pháp để tìm link HTTPS và in nổi bật
  if (output.includes('tunneled with tls termination')) {
    const match = output.match(/https:\/\/[a-z0-9.]+/i);
    if (match) {
      console.log(`
============================================================
🛡️  ĐƯỜNG TRUYỀN LIVE CHATBOT ĐÃ THÔNG TUYẾN THÀNH CÔNG!
------------------------------------------------------------
📍 Callback URL (Dán vào Facebook Developer):
👉 \x1b[36m${match[0]}/webhook\x1b[0m

🔑 Verify Token (Mã xác minh Webhook):
👉 \x1b[32mBlissBotSecure2026\x1b[0m
============================================================
`);
    }
  } else if (output.includes('Welcome') || output.includes('connection id')) {
    // Log nhẹ thông tin kết nối tunnel
    console.log(`\x1b[90m[Tunnel] ${output.trim()}\x1b[0m`);
  }
});

tunnel.stderr.on('data', (data) => {
  const msg = data.toString();
  // Bỏ qua cảnh báo RSA key thông thường của SSH
  if (!msg.includes('Warning') && !msg.includes('Permanently added')) {
    process.stderr.write(`\x1b[33m[Tunnel Msg] ${msg}\x1b[0m`);
  }
});

// Xử lý dọn dẹp tiến trình khi bấm Ctrl + C
process.on('SIGINT', () => {
  console.log('\n\x1b[31m🛑 Đang đóng tất cả đường truyền và tắt máy chủ an toàn...\x1b[0m');
  server.kill('SIGINT');
  tunnel.kill('SIGINT');
  setTimeout(() => {
    process.exit(0);
  }, 500);
});
