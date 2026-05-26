/**
 * ============================================================
 * facebook-bot-server.js — Live Zero-Dependency Facebook Chatbot Server v2.0
 * ============================================================
 * Chạy bot Messenger trực tiếp từ máy của bạn bằng công cụ NLP & Chatbot State Machine.
 * Hỗ trợ hội thoại đặt phòng thông minh, hỏi ngày, số khách, gợi ý phòng y hệt trên web!
 * 
 * Hướng dẫn chạy:
 * 1. Mở terminal tại thư mục dự án và chạy: node facebook-bot-server.js
 * 2. Mở ngrok hoặc SSH Tunnel:
 *    ssh -o StrictHostKeyChecking=no -R 80:localhost:3000 nokey@localhost.run
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const vm = require('vm');

// --- CẤU HÌNH TOKEN ---
const PAGE_ACCESS_TOKEN = 'EAASt37igz3cBRoJZBckgvlYcjLZCpojK42GrWWFL9z2kTc28AzLkQRzusWwn8D1iPDoSX04ZA73VAXSGqhi7xpiEXtspZAvAAbuL62VVMQFIAnisnG2PpEuaSC9MFpTgWOqeNpmi44r7ZAJ8dSUmloBlnuP6h3erUUIXXnaQqafXTIv63XFjRCtWnJNAkWlcmqrWhh0lNpgZDZD';
const VERIFY_TOKEN = 'BlissBotSecure2026';
const PORT = 3000;

// --- IN-MEMORY LOCALSTORAGE MOCK WITH DISK PERSISTENCE ---
const DB_FILE = 'server-db.json';
let storage = {};
try {
  if (fs.existsSync(DB_FILE)) {
    storage = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    console.log('✅ Đã nạp thành công cơ sở dữ liệu lưu trữ từ server-db.json!');
  } else {
    console.log('ℹ️ Chưa có file server-db.json, khởi tạo database mới!');
  }
} catch (e) {
  console.error('❌ Lỗi nạp database server-db.json:', e.message);
}

const persistStorage = () => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(storage, null, 2), 'utf8');
  } catch (e) {
    console.error('❌ Lỗi lưu database server-db.json:', e.message);
  }
};

const mockLocalStorage = {
  getItem: (key) => storage[key] || null,
  setItem: (key, val) => { 
    storage[key] = String(val); 
    persistStorage();
  },
  removeItem: (key) => { 
    delete storage[key]; 
    persistStorage();
  },
  clear: () => { 
    Object.keys(storage).forEach(k => delete storage[k]); 
    persistStorage();
  }
};

// --- MOCK NOTIFICATIONS ---
const mockNotifications = {
  sendAlert: (title, message, color) => {
    console.log(`🔔 NOTIFICATION ALERT: [${title}] — ${message} (${color})`);
  }
};

// --- MOCK BROWSER GLOBALS FOR NODE VM ---
const mockDocument = {
  getElementById: (id) => null,
  querySelector: (sel) => null
};

// --- TAO SANDBOX CONTEXT ---
const sandbox = {
  console,
  localStorage: mockLocalStorage,
  NOTIFICATIONS: mockNotifications,
  window: {},
  document: mockDocument,
  Date,
  Intl,
  parseFloat,
  parseInt,
  isNaN,
  Math,
  String,
  Object,
  Array,
  RegExp,
  JSON,
  setTimeout,
  setInterval,
  fetch: fetch
};
const context = vm.createContext(sandbox);

try {
  // Đọc các file logic lõi của dự án
  const dataCode = fs.readFileSync('js/data.js', 'utf8');
  const nlpCode = fs.readFileSync('js/services/nlp.js', 'utf8');
  const chatbotCode = fs.readFileSync('js/services/chatbot.js', 'utf8');
  
  // Nạp vào Sandbox
  vm.runInContext(dataCode + '\nthis.DB = DB;', context);
  vm.runInContext(nlpCode + '\nthis.NLP = NLP;', context);
  vm.runInContext(chatbotCode + '\nthis.CHATBOT = CHATBOT; this.UTIL = UTIL;', context);
  
  // Khởi tạo Database mẫu trong Sandbox
  context.DB.init();
  console.log('✅ Đã nạp thành công NLP, Database & Chatbot State Machine cục bộ!');
} catch (e) {
  console.error('❌ Lỗi nạp động cơ chatbot:', e.message);
  process.exit(1);
}

// --- QUẢN LÝ TRẠNG THÁI CUỘC HỘI THOẠI ĐA NGƯỜI DÙNG ---
const sessionStore = {};

function getSession(senderId) {
  if (!sessionStore[senderId]) {
    sessionStore[senderId] = {
      state: 'IDLE',
      context: {},
      history: []
    };
  }
  return sessionStore[senderId];
}

// --- GỬI TIN NHẮN PHẢN HỒI LÊN FACEBOOK Messenger ---
function sendFacebookMessage(senderId, text) {
  // Thay thế các cú pháp markdown **bold** sang chữ thường vì Messenger không hỗ trợ Markdown trực tiếp mặc định
  const cleanText = text
    .replace(/<!-- BOOKING_DATA:[\s\S]*?-->/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/<br>/g, '\n');

  // --- TỰ ĐỘNG TẠO BONG BÓNG LỰA CHỌN (QUICK REPLIES) ---
  const quickReplies = [];
  const t = cleanText.toLowerCase();

  // 1. Lựa chọn chi nhánh
  if (t.includes('chi nhánh nào') || t.includes('chọn chi nhánh')) {
    quickReplies.push(
      { content_type: 'text', title: '🏔️ Đà Lạt', payload: 'da_lat' },
      { content_type: 'text', title: '🏮 Hội An', payload: 'hoi_an' },
      { content_type: 'text', title: '🌊 Nha Trang', payload: 'nha_trang' }
    );
  }
  // 2. Lựa chọn xác nhận thông tin đặt phòng
  else if (t.includes('xác nhận thông tin đúng chưa') || t.includes('xác nhận để chốt')) {
    quickReplies.push(
      { content_type: 'text', title: '✅ OK', payload: 'OK' },
      { content_type: 'text', title: '✏️ Sửa', payload: 'Sửa' },
      { content_type: 'text', title: '❌ Huỷ', payload: 'Huỷ' }
    );
  }
  // 3. Lựa chọn số lượng phòng trống có sẵn
  else if (t.includes('gõ số 1, 2') || t.includes('chọn phòng số mấy')) {
    const matches = cleanText.match(/\[(\d+)\]/g);
    if (matches && matches.length > 0) {
      matches.forEach(m => {
        const num = m.replace('[', '').replace(']', '');
        quickReplies.push({ content_type: 'text', title: `Chọn Phòng ${num}`, payload: num });
      });
    } else {
      quickReplies.push(
        { content_type: 'text', title: '1', payload: '1' },
        { content_type: 'text', title: '2', payload: '2' },
        { content_type: 'text', title: '3', payload: '3' }
      );
    }
  }
  // 4. Lựa chọn gợi ý ở tin nhắn chào mừng
  else if (t.includes('xin chào') && (t.includes('trợ lý đặt phòng') || t.includes('bliss ai assistant'))) {
    quickReplies.push(
      { content_type: 'text', title: '🏔️ Xem Đà Lạt', payload: 'Đà Lạt' },
      { content_type: 'text', title: '🏮 Xem Hội An', payload: 'Hội An' },
      { content_type: 'text', title: '🔑 Mã check-in', payload: 'Mã check-in' },
      { content_type: 'text', title: '📶 WiFi homestay', payload: 'WiFi' }
    );
  }
  // 5. Giao diện ngắt kết nối hoặc gặp lỗi
  else if (t.includes('gặp nhân viên') || t.includes('tư vấn viên')) {
    quickReplies.push(
      { content_type: 'text', title: '📞 Gặp nhân viên', payload: 'Gặp nhân viên' },
      { content_type: 'text', title: '🏠 Quay lại từ đầu', payload: 'Hello' }
    );
  }

  const messagePayload = { text: cleanText };
  if (quickReplies.length > 0) {
    messagePayload.quick_replies = quickReplies.slice(0, 13); // Facebook giới hạn tối đa 13 câu trả lời nhanh
  }

  const payload = JSON.stringify({
    recipient: { id: senderId },
    messaging_type: 'RESPONSE',
    message: messagePayload
  });

  const options = {
    hostname: 'graph.facebook.com',
    port: 443,
    path: `/v20.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      if (res.statusCode !== 200) {
        console.error(`❌ Gửi tin nhắn Facebook thất bại (${res.statusCode}):`, body);
      } else {
        console.log(`✉️ Đã gửi phản hồi thành công đến khách hàng #${senderId}`);
      }
    });
  });

  req.on('error', (e) => {
    console.error('❌ Lỗi kết nối gửi tin nhắn đến Facebook:', e.message);
  });

  req.write(payload);
  req.end();
}

// --- XỬ LÝ TIN NHẮN NHẬN ĐƯỢC ---
// --- XỬ LÝ TIN NHẮN QUA MAKE.COM GPT WEBHOOK (ĐỒNG BỘ) ---
async function processIncomingMessage(senderId, messageText) {
  console.log(`\n💬 [Make.com Mode] Nhận tin nhắn từ khách hàng #${senderId}: "${messageText}"`);

  // 1. Đọc link Make.com Webhook từ cài đặt (Settings)
  let webhookUrl = '';
  try {
    const settingsStr = mockLocalStorage.getItem('bliss_settings');
    if (settingsStr) {
      const settings = JSON.parse(settingsStr);
      webhookUrl = settings.webhook_chatbot;
    }
  } catch (e) {
    console.error('❌ Lỗi đọc settings từ database:', e.message);
  }

  // Nếu không có cấu hình webhook, thông báo cho người dùng
  if (!webhookUrl) {
    console.warn('⚠️ Chưa cấu hình Make.com Webhook URL - Chatbot (S01) trong cài đặt. Vui lòng cấu hình trên Web Admin!');
    sendFacebookMessage(senderId, '⚠️ Hệ thống AI của Bliss Homestay hiện đang được bảo trì (Chưa cấu hình Make.com Webhook). Quý khách vui lòng liên hệ hotline để được hỗ trợ nhanh nhất!');
    return;
  }

  console.log(`📡 Chuyển tiếp tin nhắn sang Make.com Webhook: ${webhookUrl}`);

  // 2. Gửi request POST đồng bộ sang Make.com Webhook
  const payload = JSON.stringify({
    senderId: senderId,
    messageText: messageText
  });

  try {
    const parsedWebhook = new URL(webhookUrl);
    const options = {
      hostname: parsedWebhook.hostname,
      port: parsedWebhook.port || (parsedWebhook.protocol === 'https:' ? 443 : 80),
      path: parsedWebhook.pathname + parsedWebhook.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const client = parsedWebhook.protocol === 'https:' ? https : http;

    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          console.log(`📥 Make.com phản hồi (${res.statusCode}):`, body);
          let replyText = '';
          
          if (res.statusCode === 200) {
            try {
              const resData = JSON.parse(body);
              replyText = resData.replyText || resData.message || body;
            } catch (e) {
              replyText = body; // Fallback nếu là chuỗi văn bản thuần
            }
          }

          if (replyText && replyText.trim()) {
            sendFacebookMessage(senderId, replyText);
          } else {
            console.warn('⚠️ Make.com phản hồi rỗng hoặc lỗi.');
            sendFacebookMessage(senderId, 'Bliss Homestay đã nhận được thông tin và sẽ phản hồi quý khách sớm nhất!');
          }
        } catch (err) {
          console.error('❌ Lỗi xử lý phản hồi từ Make.com:', err.message);
          sendFacebookMessage(senderId, 'Bliss Homestay đã nhận được tin nhắn và sẽ phản hồi ngay lập tức!');
        }
      });
    });

    req.on('error', (e) => {
      console.error('❌ Lỗi kết nối đến Make.com Webhook:', e.message);
      sendFacebookMessage(senderId, 'Bliss Homestay đã nhận được thông tin. Đội ngũ CSKH sẽ liên hệ với quý khách ngay lập tức!');
    });

    req.write(payload);
    req.end();
  } catch (urlErr) {
    console.error('❌ Định dạng Make.com Webhook URL không hợp lệ:', urlErr.message);
    sendFacebookMessage(senderId, '⚠️ Hệ thống đang cấu hình lại kết nối AI. Quý khách vui lòng thử lại sau ít phút!');
  }
}

// --- TỰ ĐỘNG QUÉT VÀ TRẢ LỜI KHÁCH HÀNG CŨ CHƯA ĐƯỢC PHẢN HỒI ---
let PAGE_ID = null;

// Tìm Page ID từ giao điểm các bên tham gia hoặc qua signature tin nhắn chào mừng của bot
function discoverPageIdFromThreads(threads) {
  if (!threads || threads.length === 0) return null;
  
  // 1. Quét tìm qua signature tin nhắn chào mừng của chatbot trong lịch sử tin nhắn (Độ chính xác tuyệt đối)
  for (const t of threads) {
    if (t.messages && t.messages.data) {
      for (const msg of t.messages.data) {
        const text = msg.message || '';
        const lower = text.toLowerCase();
        // Kiểm tra xem tin nhắn có chứa từ khóa nhận diện của chatbot Bliss không
        if (
          lower.includes('bliss ai assistant') || 
          lower.includes('trợ lý ảo của bliss') || 
          lower.includes('bliss homestay') ||
          lower.includes('trợ lý đặt phòng ảo bliss')
        ) {
          if (msg.from && msg.from.id) {
            return msg.from.id;
          }
        }
      }
    }
  }

  // 2. Tìm theo tên chứa "Bliss" hoặc "Homestay" trong danh sách thành viên tham gia
  for (const t of threads) {
    if (t.participants && t.participants.data) {
      const parts = t.participants.data;
      const pagePart = parts.find(p => p.name.toLowerCase().includes('bliss') || p.name.toLowerCase().includes('homestay'));
      if (pagePart) return pagePart.id;
    }
  }

  // 3. Giải thuật Giao điểm (Heuristic Intersection) nếu có nhiều cuộc trò chuyện
  const counts = {};
  threads.forEach(t => {
    if (t.participants && t.participants.data) {
      t.participants.data.forEach(p => {
        counts[p.id] = (counts[p.id] || 0) + 1;
      });
    }
  });

  let bestId = null;
  let maxCount = 0;
  for (const [id, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      bestId = id;
    }
  }

  return bestId;
}

function fetchPageId() {
  return new Promise((resolve) => {
    const url = `https://graph.facebook.com/v20.0/me?access_token=${PAGE_ACCESS_TOKEN}`;
    const req = https.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const data = JSON.parse(body);
          if (data.id) {
            PAGE_ID = data.id;
            console.log(`ℹ️ [Facebook] Đã tự động tìm thấy Page ID: ${PAGE_ID} (${data.name})`);
            resolve(PAGE_ID);
          } else {
            console.warn(`⚠️ [Facebook] Nhận phản hồi không thể tự tìm Page ID thông thường (Lỗi quyền/review). Sẽ tự động dùng Heuristic Fallback khi quét hội thoại.`);
            resolve(null);
          }
        } catch (e) {
          console.error('❌ Lỗi phân tích cú pháp Page ID:', e.message);
          resolve(null);
        }
      });
    });
    req.on('error', (e) => {
      console.error('❌ Lỗi kết nối lấy thông tin Page ID:', e.message);
      resolve(null);
    });
  });
}

function scanAndReplyUnreplied() {
  console.log('🔍 [Scanner] Bắt đầu quét hộp thư tìm khách hàng cũ chưa được phản hồi...');

  return new Promise((resolve) => {
    // Truy vấn kèm trường participants và lịch sử 5 tin nhắn để dò tìm Page ID tự động
    const url = `https://graph.facebook.com/v20.0/me/conversations?fields=messages.limit(5){from,message,created_time},participants&access_token=${PAGE_ACCESS_TOKEN}`;
    
    const req = https.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', async () => {
        try {
          const result = JSON.parse(body);
          if (!result.data) {
            console.warn('⚠️ [Scanner] Không nhận được danh sách cuộc hội thoại hợp lệ. Phản hồi API:', body);
            return resolve({ success: false, reason: 'Không có dữ liệu hội thoại' });
          }

          // Kích hoạt Heuristic Discovery nếu PAGE_ID trống
          if (!PAGE_ID) {
            PAGE_ID = discoverPageIdFromThreads(result.data);
            if (PAGE_ID) {
              console.log(`💡 [Scanner] Giải thuật Heuristic phát hiện thành công Page ID từ danh sách hộp thư: ${PAGE_ID}`);
            }
          }

          if (!PAGE_ID) {
            console.warn('⚠️ [Scanner] Không thể xác định được Page ID để phân biệt giữa khách hàng và trang.');
            return resolve({ success: false, reason: 'Chưa xác định được Page ID' });
          }

          let count = 0;
          for (const thread of result.data) {
            if (thread.messages && thread.messages.data && thread.messages.data.length > 0) {
              const lastMsg = thread.messages.data[0];
              const senderId = lastMsg.from.id;
              const senderName = lastMsg.from.name || 'Khách Facebook';
              const messageText = lastMsg.message;

              // Nếu người gửi cuối không trùng khớp với Page ID của trang -> Chưa trả lời!
              if (senderId !== PAGE_ID) {
                count++;
                console.log(`⚠️ [Scanner] Phát hiện khách hàng chưa được trả lời: ${senderName} (#${senderId}) — "${messageText}"`);
                
                // Gửi tin nhắn qua luồng xử lý tự động của chatbot
                await processIncomingMessage(senderId, messageText);
              }
            }
          }

          console.log(`📊 [Scanner] Hoàn tất quét! Đã tự động phản hồi cho ${count} khách hàng cũ.`);
          resolve({ success: true, count });
        } catch (e) {
          console.error('❌ [Scanner] Lỗi xử lý dữ liệu quét hội thoại:', e.message);
          resolve({ success: false, error: e.message });
        }
      });
    });

    req.on('error', (e) => {
      console.error('❌ [Scanner] Lỗi kết nối quét hộp thư:', e.message);
      resolve({ success: false, error: e.message });
    });
  });
}

// --- TẠO MÁY CHỦ HTTP ---
const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

  // Hỗ trợ CORS OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // A. GET /api/db — Đọc dữ liệu từ mock local storage của server
  if (req.method === 'GET' && parsedUrl.pathname === '/api/db') {
    res.writeHead(200, { 
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(JSON.stringify(storage));
    return;
  }

  // B. POST /api/db — Ghi đè dữ liệu mới từ Browser lên mock local storage của server
  if (req.method === 'POST' && parsedUrl.pathname === '/api/db') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        for (const [key, val] of Object.entries(data)) {
          mockLocalStorage.setItem(key, val);
        }
        res.writeHead(200, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // 1. GET /check-unreplied — Kích hoạt quét và trả lời tự động khách hàng cũ thủ công
  if (req.method === 'GET' && parsedUrl.pathname === '/check-unreplied') {
    console.log('🔌 [HTTP] Nhận lệnh quét thủ công khách chưa phản hồi từ Endpoint...');
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    
    const triggerScan = () => {
      scanAndReplyUnreplied().then(scanRes => {
        res.end(JSON.stringify({ 
          success: true, 
          message: `Lệnh quét và tự động trả lời đã hoàn thành!`, 
          data: scanRes 
        }));
      }).catch(err => {
        res.end(JSON.stringify({ success: false, error: err.message }));
      });
    };

    if (!PAGE_ID) {
      fetchPageId().then(id => {
        if (!id) {
          // Cố gắng quét luôn vì scanAndReplyUnreplied có cơ chế Heuristic Fallback tự tìm ID
          triggerScan();
        } else {
          triggerScan();
        }
      });
    } else {
      triggerScan();
    }
  }
  // 2. GET /webhook — Xác thực Webhook với Facebook
  else if (req.method === 'GET' && parsedUrl.pathname === '/webhook') {
    const mode = parsedUrl.searchParams.get('hub.mode');
    const token = parsedUrl.searchParams.get('hub.verify_token');
    const challenge = parsedUrl.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Webhook đã được xác thực thành công bởi Facebook!');
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(challenge);
    } else {
      console.warn('⚠️ Xác thực Webhook thất bại: Token xác minh không trùng khớp.');
      res.writeHead(403);
      res.end();
    }
  }
  // 3. POST /webhook — Nhận tin nhắn mới từ Facebook
  else if (req.method === 'POST' && parsedUrl.pathname === '/webhook') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);

        if (data.object === 'page') {
          for (const entry of data.entry) {
            // Tự động gán Page ID học được trực tiếp từ Webhook Event (Độ chính xác 100%)
            if (entry.id && !PAGE_ID) {
              PAGE_ID = entry.id;
              console.log(`ℹ️ [Facebook] Tự động học Page ID trực tiếp từ webhook event: ${PAGE_ID}`);
            }

            if (entry.messaging) {
              for (const event of entry.messaging) {
                // Nhận tin nhắn văn bản thông thường
                if (event.message && event.message.text) {
                  const senderId = event.sender.id;
                  const text = event.message.text;
                  await processIncomingMessage(senderId, text);
                }
              }
            }
          }
        }
        res.writeHead(200);
        res.end('EVENT_RECEIVED');
      } catch (err) {
        console.error('❌ Lỗi xử lý yêu cầu POST:', err.message);
        res.writeHead(400);
        res.end();
      }
    });
  }
  // 4. Fallback 404
  else {
    res.writeHead(404);
    res.end();
  }
});

// --- KHỞI CHẠY SERVER ---
server.listen(PORT, () => {
  console.log(`
  ============================================================
  🚀 Bliss Facebook Chatbot Server v2.2 đang chạy tại cổng ${PORT}!
  --------------------------------================------------
  ⚙️ Đã tích hợp đầy đủ State Machine & Offline DB mẫu!
  🔑 Token xác minh (Verify Token): ${VERIFY_TOKEN}
  📍 Đường dẫn cục bộ (Local URL): http://localhost:${PORT}/webhook
  ============================================================
  `);

  // Tự động phát hiện thông tin Page và chạy quét khách cũ sau 5 giây
  setTimeout(async () => {
    console.log('🤖 [Auto-Responder] Đang phát hiện thông tin Page và chạy quét khách hàng cũ...');
    const id = await fetchPageId();
    // Bắt đầu quét (nếu id trống, giải thuật Heuristic tự động dò tìm khi tải các cuộc hội thoại)
    await scanAndReplyUnreplied();
  }, 5000);

  // Đặt lịch quét định kỳ mỗi 10 phút để tự động phản hồi các khách hàng chưa được trả lời
  setInterval(async () => {
    console.log('🤖 [Auto-Responder] Quét định kỳ tự động tìm khách chưa phản hồi...');
    await scanAndReplyUnreplied();
  }, 10 * 60 * 1000);
});
