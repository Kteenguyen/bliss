const fs = require('fs');
const path = require('path');
const db = require('../config/db');
const NLP = require('./nlp');
const sheetsService = require('./sheetsService');
const queueService = require('./queueService');

const sessionsFilePath = path.join(__dirname, '../../../data/sessions_store.json');
let sessions = {};

// Load sessions from disk on startup
try {
  const dir = path.dirname(sessionsFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (fs.existsSync(sessionsFilePath)) {
    sessions = JSON.parse(fs.readFileSync(sessionsFilePath, 'utf8'));
  }
} catch (e) {
  console.error('[Chatbot] Error loading sessions file:', e.message);
}

function saveSessions() {
  try {
    fs.writeFileSync(sessionsFilePath, JSON.stringify(sessions, null, 2), 'utf8');
  } catch (e) {
    console.error('[Chatbot] Error saving sessions file:', e.message);
  }
}

function getSession(senderId) {
  if (!sessions[senderId]) {
    sessions[senderId] = {
      state: 'IDLE',
      context: {},
      history: []
    };
  }
  return sessions[senderId];
}

const FAQ_KB = {
  parking: '🚗 Có bãi đỗ xe máy miễn phí tại từng chi nhánh, bãi đỗ ô tô vui lòng liên hệ trước để check vị trí gần nhất.',
  breakfast: '🍳 Chúng mình không đi kèm bữa sáng, tuy nhiên quanh các cơ sở có vô vàn quán ăn ngon chuẩn vị Sài Gòn.',
  airport: '✈️ Có dịch vụ xe đưa đón sân bay Tân Sơn Nhất về các chi nhánh với giá ưu đãi cực kì tốt.',
  checkin_time: '⏰ Giờ check-in: từ 14:00. Giờ check-out: trước 12:00. Early check-in/Late check-out liên hệ trước nhé!',
  pet: '🐾 Rất tiếc, hiện tại chúng mình chưa cho phép mang thú cưng vào homestay.',
  wifi: '📶 WiFi tốc độ cao 100Mbps miễn phí tại tất cả phòng. Mật khẩu sẽ được gửi khi check-in.',
  payment: '💳 Thanh toán: Chuyển khoản ngân hàng hoặc tiền mặt. Đặt cọc 30% khi xác nhận booking.',
  refund: '💰 Hoàn tiền: Huỷ trước 3 ngày được hoàn 100%. Huỷ 1-3 ngày hoàn 50%. Dưới 24h không hoàn.',
  tour: '🗺️ Có dịch vụ City Tour Sài Gòn (xe máy/xe bus 2 tầng tham quan Bưu điện Tp, Dinh Độc Lập, Chợ Bến Thành).',
  smoking: '🚭 Phòng không hút thuốc. Có khu vực hút thuốc riêng tại ban công/tầng trệt.',
};

const UTIL = {
  fmtPrice: n => new Intl.NumberFormat('vi-VN').format(n) + ' ₫',
  fmtDate: s => {
    if (!s) return '?';
    const d = new Date(s);
    return d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
  },
  nightsBetween(from, to) {
    return Math.round((new Date(to) - new Date(from)) / 864e5);
  }
};

function isAvailable(roomId, checkIn, checkOut) {
  const bookings = sheetsService.getBookings().filter(b =>
    b.room_id === roomId && !['cancelled', 'checked_out'].includes(b.status)
  );
  return !bookings.some(b => !(checkOut <= b.check_in_date || checkIn >= b.check_out_date));
}

function calcPrice(room, checkIn, checkOut) {
  const ci = new Date(checkIn), co = new Date(checkOut);
  let weekdays = 0, weekends = 0;
  for (let d = new Date(ci); d < co; d.setDate(d.getDate() + 1)) {
    (d.getDay() === 0 || d.getDay() === 6) ? weekends++ : weekdays++;
  }
  return weekdays * room.base_price_weekday + weekends * room.base_price_weekend;
}

function generateBookingId() {
  const bookings = sheetsService.getBookings();
  let maxId = 0;
  bookings.forEach(b => {
    if (b.booking_id && b.booking_id.startsWith('BL')) {
      const num = parseInt(b.booking_id.replace('BL', ''));
      if (!isNaN(num) && num > maxId) {
        maxId = num;
      }
    }
  });
  return 'BL' + String(maxId + 1).padStart(3, '0');
}

const CHATBOT = {
  async handleIncomingMessage(senderId, platform, messageText) {
    console.log(`[Chatbot] Incoming message from [${platform}:${senderId}]: "${messageText}"`);
    
    // 1. Get or create session
    const session = getSession(senderId);
    
    // 2. Perform entity extraction (local rules or Gemini)
    const geminiKey = process.env.GEMINI_API_KEY || '';
    let entities;
    
    if (geminiKey) {
      entities = await NLP.extractWithGemini(messageText, geminiKey);
    }
    if (!entities) {
      entities = NLP.extract(messageText);
    }
    
    // Log user message to local SQLite
    queueService.logChat(senderId, platform, 'user', messageText, entities.intent, entities);
    
    // 3. Process conversation with Gemini if key exists
    let botReplyText = '';
    if (geminiKey) {
      botReplyText = await this._processWithGemini(senderId, platform, messageText, geminiKey, session);
    }
    
    // 4. Fallback to state machine if Gemini is not available or failed
    if (!botReplyText) {
      botReplyText = await this._processWithStateMachine(senderId, platform, messageText, entities, session);
    }
    
    // Log bot reply to local SQLite
    queueService.logChat(senderId, platform, 'bot', botReplyText, entities.intent, entities);
    
    // 5. Send message back to social channel
    await this.sendSocialMessage(senderId, platform, botReplyText);
    
    // Save session changes
    saveSessions();
  },

  async _processWithStateMachine(senderId, platform, messageText, entities, session) {
    const intent = entities.intent;
    
    if (session.state === 'COLLECTING_INFO') {
      this._mergeContext(session.context, entities);
      return this._continueCollecting(session);
    }

    if (session.state === 'SHOWING_QUOTE' && (intent === 'booking_confirm' || messageText.match(/^\d+$/))) {
      return this._handleRoomSelection(messageText, session);
    }

    if (session.state === 'CONFIRMING_BOOKING' && intent === 'booking_confirm') {
      return this._finalizeBooking(senderId, platform, session);
    }

    if (session.state === 'CONFIRMING_BOOKING' && messageText.toLowerCase().match(/không|sửa|đổi|thay|cancel|huỷ/)) {
      session.state = 'IDLE';
      session.context = {};
      return 'Đã huỷ yêu cầu đặt phòng. Bạn muốn tìm phòng khác không? Mình sẵn sàng tư vấn nhé! 😊';
    }

    switch (intent) {
      case 'greeting':
        session.state = 'IDLE';
        session.context = {};
        return `Xin chào! 👋 Mình là **Bliss AI Assistant** — trợ lý ảo của Bliss Homestay.\n\nMình có thể giúp bạn:\n• 🏠 Kiểm tra phòng trống & báo giá\n• 📅 Đặt phòng nhanh chóng\n• ❓ Trả lời mọi thắc mắc\n\nBạn đang muốn đặt phòng tại cơ sở nào?\n- **CS1: Tân Bình** 🏡\n- **CS2: Quận 10** ☀️\n- **CS3: Quận 5** 🌿\n- **CS4: Gò Vấp** 🍃\n- **CS5: Bình Thạnh** 🌅`;

      case 'booking_inquiry':
        session.context = { ...session.context, ...entities };
        return this._startBookingFlow(session);

      case 'complaint':
        return this._handleComplaint(messageText);

      case 'checkin_support':
        return this._handleCheckInSupport();

      case 'cancel_modify':
        session.state = 'IDLE';
        return 'Để huỷ hoặc đổi lịch, bạn vui lòng cho mình xin mã đặt phòng (vd: BL001). Hoặc nếu cần hỗ trợ trực tiếp, bạn hãy nhắn "gặp nhân viên" nha!';

      case 'feedback':
        return 'Cảm ơn bạn rất nhiều! 🙏 Phản hồi của bạn giúp chúng mình ngày càng tốt hơn.\n\n⭐ Để lại Google Review: [bit.ly/bliss-google]\n⭐ Facebook: [bit.ly/bliss-fb]\n\nHành trình của bạn luôn là niềm tự hào của Bliss! 💙';

      case 'faq':
        return this._handleFAQ(messageText);

      default:
        if (this._matchFAQ(messageText)) return this._handleFAQ(messageText);
        // Handoff to human
        session.state = 'IDLE';
        
        // Notify team via activity log (CRM dashboard alerts)
        // We simulate notifications by logging to sqlite chat_logs and creating activity
        console.log(`[HANDOFF] User ${senderId} requires human assistance for: "${messageText}"`);
        
        return 'Câu hỏi này cần nhân viên tư vấn trực tiếp nhé! 😊\n\nMình đã **thông báo cho bộ phận CSKH** rồi — nhân viên sẽ liên hệ với bạn ngay trong vòng **5 phút** qua cuộc hội thoại này.';
    }
  },

  _mergeContext(ctx, entities) {
    if (entities.check_in_date) ctx.check_in_date = entities.check_in_date;
    if (entities.check_out_date) ctx.check_out_date = entities.check_out_date;
    if (entities.num_adults) ctx.num_adults = entities.num_adults;
    if (entities.nights && ctx.check_in_date && !ctx.check_out_date) {
      const d = new Date(ctx.check_in_date);
      d.setDate(d.getDate() + entities.nights);
      ctx.check_out_date = d.toISOString().split('T')[0];
    }
    if (entities.branch) { 
      ctx.branch = entities.branch; 
      ctx.branch_name = entities.branch_name; 
    }
  },

  _startBookingFlow(session) {
    this._mergeContext(session.context, session.context);
    return this._continueCollecting(session);
  },

  _continueCollecting(session) {
    const ctx = session.context;
    const missing = [];

    if (!ctx.branch) missing.push('branch');
    if (!ctx.check_in_date) missing.push('check_in');
    if (!ctx.check_out_date) missing.push('check_out');
    if (!ctx.num_adults) missing.push('guests');

    if (missing.length === 0) {
      return this._showAvailableRooms(session);
    }

    session.state = 'COLLECTING_INFO';
    const q = missing[0];
    const questions = {
      branch: 'Bạn muốn đặt phòng tại chi nhánh nào?\n• 🏡 **CS1: Tân Bình**\n• ☀️ **CS2: Quận 10**\n• 🌿 **CS3: Quận 5**\n• 🍃 **CS4: Gò Vấp**\n• 🌅 **CS5: Bình Thạnh**',
      check_in: 'Ngày **check-in** (nhận phòng) là ngày mấy ạ? (vd: 28/06, thứ 6, ngày mai...)',
      check_out: `Ngày **check-out** (trả phòng) là ngày mấy ạ? Hoặc bạn ở mấy đêm?`,
      guests: 'Bạn đi tổng cộng bao nhiêu **khách** ạ? (vd: 2 người lớn, 4 người...)',
    };
    return questions[q];
  },

  _showAvailableRooms(session) {
    const ctx = session.context;
    const rooms = sheetsService.getRooms().filter(r => r.branch === ctx.branch && r.status === 'active');
    const available = rooms.filter(r => {
      if (ctx.num_adults && r.capacity < ctx.num_adults) return false;
      return isAvailable(r.room_id, ctx.check_in_date, ctx.check_out_date);
    });

    if (available.length === 0) {
      session.state = 'IDLE';
      return `😔 Rất tiếc, chi nhánh **${ctx.branch_name}** không còn phòng trống trong khoảng **${UTIL.fmtDate(ctx.check_in_date)} → ${UTIL.fmtDate(ctx.check_out_date)}** cho ${ctx.num_adults} khách.\n\nBạn muốn thử:\n• 📅 Thay đổi ngày đi?\n• 🗺️ Tìm phòng tại chi nhánh khác?`;
    }

    session.context.availableRooms = available.map(r => ({
      ...r,
      totalPrice: calcPrice(r, ctx.check_in_date, ctx.check_out_date),
    }));

    const nights = UTIL.nightsBetween(ctx.check_in_date, ctx.check_out_date);
    let msg = `✅ Tìm thấy **${available.length} phòng trống** tại ${ctx.branch_name} cho ${ctx.num_adults} khách (${nights} đêm):\n\n`;

    session.context.availableRooms.forEach((r, i) => {
      msg += `**[${i+1}] ${r.emoji || '🏠'} ${r.room_name}**\n`;
      msg += `👥 Sức chứa: ${r.capacity} khách | 💰 Tổng: **${UTIL.fmtPrice(r.totalPrice)}**\n`;
      msg += `✨ ${Array.isArray(r.amenities) ? r.amenities.slice(0,3).join(', ') : (r.amenities || '').split(',').slice(0, 3).join(', ')}\n\n`;
    });

    msg += `📩 Hãy nhắn số thứ tự **1, 2...** để chọn phòng nhé!`;

    // Upsell
    const upsells = [];
    if (ctx.num_adults >= 4) upsells.push('🍖 BBQ nhóm 300k');
    if (ctx.branch === 'cs5') upsells.push('🌅 Cafe ngắm hoàng hôn sông Sài Gòn');
    if (ctx.branch === 'cs1') upsells.push('🏍️ Thuê xe máy 150k/ngày');
    if (upsells.length) msg += `\n\n💡 **Gợi ý thêm:** ${upsells.join(' | ')}`;
    
    session.state = 'SHOWING_QUOTE';
    return msg;
  },

  _handleRoomSelection(messageText, session) {
    const num = parseInt(messageText.trim());
    const rooms = session.context.availableRooms;

    if (!rooms || isNaN(num) || num < 1 || num > rooms.length) {
      return `Bạn chọn phòng số mấy? Gõ số **1** đến **${rooms?.length || 1}** nhé!`;
    }

    const room = rooms[num - 1];
    session.context.selectedRoom = room;

    const ctx = session.context;
    const nights = UTIL.nightsBetween(ctx.check_in_date, ctx.check_out_date);

    const msg = `📋 **Xác nhận thông tin đặt phòng:**\n\n` +
      `🏠 Phòng: **${room.emoji || '🏠'} ${room.room_name}** (${ctx.branch_name})\n` +
      `📅 Nhận phòng: **${UTIL.fmtDate(ctx.check_in_date)}** (từ 14:00)\n` +
      `📅 Trả phòng: **${UTIL.fmtDate(ctx.check_out_date)}** (trước 12:00)\n` +
      `👥 Số khách: **${ctx.num_adults} người**\n` +
      `🌙 Số đêm: **${nights} đêm**\n` +
      `💰 Tổng cộng: **${UTIL.fmtPrice(room.totalPrice)}**\n\n` +
      `Bạn kiểm tra xem đúng chưa nhé?\nGõ **"Xác nhận"** hoặc **"OK"** để hoàn tất, hoặc **"Sửa"** để nhập lại.`;

    session.state = 'CONFIRMING_BOOKING';
    return msg;
  },

  async _finalizeBooking(senderId, platform, session) {
    const ctx = session.context;
    const room = ctx.selectedRoom;
    if (!room) return 'Không tìm thấy phòng đã chọn. Vui lòng nhắn "hello" để bắt đầu lại.';

    const bookingId = generateBookingId();

    const bookingPayload = {
      booking_id: bookingId,
      customer_name: `Khách ${platform.toUpperCase()}`,
      customer_phone: 'N/A',
      customer_social_id: senderId,
      branch: ctx.branch,
      branch_name: ctx.branch_name,
      room_id: room.room_id,
      room_name: room.room_name,
      check_in_date: ctx.check_in_date,
      check_out_date: ctx.check_out_date,
      num_guests: Number(ctx.num_adults),
      total_price: Number(room.totalPrice),
      status: 'confirmed',
      special_requests: `Tự động đặt qua chatbot (${platform})`,
      source: platform,
      review_sent: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Optimistic Local Update
    sheetsService.optimisticCreateBooking(bookingPayload);

    // Enqueue write to write_queue
    queueService.enqueue('CREATE_BOOKING', bookingPayload);

    // Reset session state
    session.state = 'IDLE';
    session.context = {};

    const msg = `🎉 **Đặt phòng thành công!**\n\n` +
      `🔖 Mã đặt phòng của bạn: **#${bookingId}**\n` +
      `${room.emoji || '🏠'} ${room.room_name} — ${ctx.branch_name}\n\n` +
      `📩 Hướng dẫn nhận phòng và mã khóa cửa sẽ được gửi đến bạn trước **24 tiếng** ngày nhận phòng.\n\n` +
      `Chúc bạn có một chuyến đi thật vui vẻ! Bliss cảm ơn bạn! 💙`;

    return msg;
  },

  _handleComplaint(messageText) {
    const branch = NLP.extractBranch(messageText)?.name || 'chi nhánh';
    console.log(`[COMPLAINT ALERT] Incident reported at ${branch}: "${messageText}"`);
    return `Chúng mình thành thật xin lỗi bạn vì sự cố này! 🙏\n\nMình đã **gửi thông báo khẩn cấp** cho nhân viên kỹ thuật tại ${branch}.\n\n⏱️ Nhân viên sẽ đến trực tiếp phòng hỗ trợ bạn trong vòng **15-30 phút**. Rất mong bạn thông cảm!`;
  },

  _handleCheckInSupport() {
    // Generate code matching PIN settings prefix
    const pinPrefix = '6789';
    return `🔑 **Hướng dẫn Nhận phòng tự động:**\n\n📍 Địa chỉ chi tiết: Bản đồ sẽ gửi trực tiếp cho bạn qua link Google Maps.\n🔐 **Mã số khóa cửa: ${pinPrefix}##** (Nhập chuỗi số và kết thúc bằng hai phím # để mở khóa).\n📶 Wifi: **BlissHome** / Mật khẩu: **bliss2024**.\n\n⏰ Thời gian: Nhận phòng từ 14:00 | Trả phòng trước 12:00.`;
  },

  _matchFAQ(text) {
    const t = text.toLowerCase();
    return Object.keys(FAQ_KB).some(k => t.includes(k.replace('_', ' ')));
  },

  _handleFAQ(messageText) {
    const t = messageText.toLowerCase();
    for (const [key, ans] of Object.entries(FAQ_KB)) {
      if (t.includes(key.replace('_', ' ')) || t.includes(key)) {
        return ans;
      }
    }
    if (t.match(/giá|tiền|bao nhiêu|phí/)) {
      return '💰 Giá phòng dao động từ **400k đến 700k/đêm** tùy từng chi nhánh và hạng phòng cụ thể. Bạn vui lòng cho biết ngày đi và số người để mình báo giá chính xác nha!';
    }
    return 'Câu hỏi hay quá! 😊 Bạn có thể chia sẻ thêm bạn đang quan tâm phòng tại chi nhánh nào? **CS1 (Tân Bình)**, **CS2 (Quận 10)**, **CS3 (Quận 5)**, **CS4 (Gò Vấp)** hay **CS5 (Bình Thạnh)**?';
  },

  async _processWithGemini(senderId, platform, messageText, apiKey, session) {
    const today = new Date().toISOString().split('T')[0];
    const rooms = sheetsService.getRooms();
    const bookings = sheetsService.getBookings();
    const pinPrefix = '6789';

    // Build message history
    if (!session.history) session.history = [];
    session.history.push({ role: 'user', parts: [{ text: messageText }] });

    // Limit history length
    if (session.history.length > 15) {
      session.history = session.history.slice(-15);
    }

    const systemInstruction = `Bạn là Trợ lý ảo AI cực kỳ thông minh và mến khách của Bliss Homestay (Việt Nam).
Nhiệm vụ của bạn là hỗ trợ khách hàng đặt phòng, giải đáp thắc mắc và xử lý sự cố hoàn toàn bằng ngôn ngữ tự nhiên sống động.

DỮ LIỆU HỆ THỐNG TRONG THỜI GIAN THỰC (REAL-TIME DATABASE):
- Danh sách phòng hiện có: ${JSON.stringify(rooms)}
- Danh sách đặt phòng hiện tại (Hãy kiểm tra ngày để tránh trùng lịch đặt): ${JSON.stringify(bookings)}
- Cấu hình PIN cửa check-in tự động: ${pinPrefix}##
- Ngày hôm nay là: ${today}

QUY ĐỊNH BÁN HÀNG & FAQs:
- Giờ nhận phòng (check-in): từ 14:00. Giờ trả phòng (check-out): trước 12:00.
- WiFi miễn phí: BlissHome / Mật khẩu: bliss2024.
- Đỗ xe: Có bãi đỗ xe ô tô và xe máy miễn phí ngay tại homestay.
- Dịch vụ đi kèm: Xe đạp miễn phí ở Hội An, Tour lặn biển ở Nha Trang (450k/người), Thuê xe máy ở Đà Lạt (150k/ngày).
- Quy định hủy phòng: Trước 3 ngày hoàn 100%, 1-3 ngày hoàn 50%, dưới 24h không hoàn tiền.

QUY TẮC PHẢN HỒI:
1. Hãy nói chuyện cực kỳ tự nhiên, lịch sự, mến khách và chuyên nghiệp. Tuyệt đối không trả lời khô khan hay theo khuôn mẫu cứng nhắc.
2. Khi khách muốn đặt phòng:
   - Hãy hỏi các thông tin cần thiết một cách khéo léo: Chi nhánh muốn ở (Tân Bình/Quận 10/Quận 5/Gò Vấp/Bình Thạnh), Ngày check-in, Ngày check-out (hoặc số đêm), Số lượng khách.
   - Khi có đủ thông tin, đối chiếu với dữ liệu phòng trống và lịch đặt phòng hiện tại ở trên để kiểm tra phòng trống.
   - Tính tổng tiền dựa trên giá phòng ngày thường/cuối tuần và số đêm, sau đó báo giá tự nhiên cho khách.
   - Nếu khách đồng ý chốt đặt phòng (nói "OK", "chốt", "xác nhận"), hãy thông báo đặt phòng thành công, sinh mã đặt phòng mới (ví dụ: #BL006, #BL007...) và báo với khách là hệ thống đã ghi nhận thành công.
3. Sử dụng các emoji phù hợp (🏔️, 🏮, 🌊, 🔑, 📶) để tin nhắn sinh động.
4. KHI XÁC NHẬN ĐẶT PHÒNG THÀNH CÔNG (sau khi khách đồng ý và bạn sinh mã đặt phòng mới như #BL006): Bạn BẮT BUỘC phải đính kèm ở CUỐI CÙNG câu trả lời của mình một thẻ ẩn HTML comment chứa chính xác thông tin đặt phòng dưới dạng JSON như sau:
<!-- BOOKING_DATA: {"booking_id":"BL006","customer_name":"Tên khách","customer_phone":"Số điện thoại nếu có","branch":"cs1","room_id":"XH01","check_in_date":"YYYY-MM-DD","check_out_date":"YYYY-MM-DD","num_guests":2,"total_price":1200000} -->
Hãy tự động trích xuất các trường từ cuộc trò chuyện thực tế của khách hàng. Hãy đảm bảo room_id và branch chính xác tương ứng với phòng được chọn, tính toán total_price chuẩn xác dựa trên giá phòng ngày thường/cuối tuần và số đêm thực tế.
`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: session.history,
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
          })
        }
      );
      const data = await res.json();
      const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      if (botReply) {
        session.history.push({ role: 'model', parts: [{ text: botReply }] });

        // Check if booking succeeded and sync
        if (botReply.includes('#BL') || botReply.includes('BOOKING_DATA')) {
          await this._syncAIBooking(botReply, senderId, platform);
        }

        return botReply;
      }
    } catch (e) {
      console.warn('[CHATBOT] Gemini generation error, falling back to State Machine:', e.message);
    }
    return null;
  },

  async _syncAIBooking(replyText, senderId, platform) {
    try {
      const jsonMatch = replyText.match(/<!-- BOOKING_DATA:\s*({.*?})\s*-->/);
      let info = {};
      
      if (jsonMatch) {
        info = JSON.parse(jsonMatch[1]);
      } else {
        // Fallback parser heuristics
        let branch = 'cs1';
        let branchName = 'Tân Bình';
        const text = replyText.toLowerCase();
        if (text.includes('quận 10') || text.includes('q10') || text.includes('cs2')) { branch = 'cs2'; branchName = 'Quận 10'; }
        else if (text.includes('quận 5') || text.includes('q5') || text.includes('cs3')) { branch = 'cs3'; branchName = 'Quận 5'; }
        else if (text.includes('gò vấp') || text.includes('go vap') || text.includes('cs4')) { branch = 'cs4'; branchName = 'Gò Vấp'; }
        else if (text.includes('bình thạnh') || text.includes('binh thanh') || text.includes('cs5')) { branch = 'cs5'; branchName = 'Bình Thạnh'; }

        const rooms = sheetsService.getRooms().filter(r => r.branch === branch && r.status === 'active');
        const room = rooms[0] || { room_id: 'R001', room_name: 'Phòng Sương Mù' };

        const idMatch = replyText.match(/#BL(\d+)/);
        const bookingId = idMatch ? `BL${idMatch[1]}` : generateBookingId();

        info = {
          booking_id: bookingId,
          customer_name: `Khách ${platform.toUpperCase()}`,
          customer_phone: 'N/A',
          branch: branch,
          branch_name: branchName,
          room_id: room.room_id,
          room_name: room.room_name,
          check_in_date: new Date().toISOString().split('T')[0],
          check_out_date: new Date(Date.now() + 864e5).toISOString().split('T')[0],
          num_guests: 2,
          total_price: room.base_price_weekday || 800000
        };
      }

      const room = sheetsService.getRooms().find(r => r.room_id === info.room_id) || { room_id: info.room_id, room_name: info.room_name || 'Phòng Homestay' };
      const bookingPayload = {
        booking_id: info.booking_id || generateBookingId(),
        customer_name: info.customer_name || `Khách ${platform.toUpperCase()}`,
        customer_phone: info.customer_phone || 'N/A',
        customer_social_id: senderId,
        branch: info.branch,
        branch_name: info.branch === 'cs1' ? 'Tân Bình' : info.branch === 'cs2' ? 'Quận 10' : info.branch === 'cs3' ? 'Quận 5' : info.branch === 'cs4' ? 'Gò Vấp' : info.branch === 'cs5' ? 'Bình Thạnh' : 'Sài Gòn',
        room_id: room.room_id,
        room_name: room.room_name,
        check_in_date: info.check_in_date,
        check_out_date: info.check_out_date,
        num_guests: Number(info.num_guests) || 2,
        total_price: Number(info.total_price) || 1000000,
        status: 'confirmed',
        special_requests: 'Được đặt tự động thông qua AI Chatbot v3.0',
        source: platform,
        review_sent: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Optimistic cache update
      sheetsService.optimisticCreateBooking(bookingPayload);
      // SQLite enqueuing
      queueService.enqueue('CREATE_BOOKING', bookingPayload);
      console.log('✅ [AI Sync] Synced booking from AI response payload:', bookingPayload.booking_id);
    } catch (e) {
      console.warn('[AI Sync] Error parsing AI booking data:', e.message);
    }
  },

  async sendSocialMessage(senderId, platform, text) {
    if (platform === 'facebook') {
      const pageToken = process.env.MESSENGER_PAGE_ACCESS_TOKEN;
      if (!pageToken) {
        console.log(`[MOCK MESSENGER SEND] to ${senderId}: "${text}"`);
        return;
      }
      try {
        await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${pageToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipient: { id: senderId },
            message: { text }
          })
        });
      } catch (err) {
        console.error('[Chatbot] Facebook Send API error:', err.message);
      }
    } else if (platform === 'telegram') {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (!botToken) {
        console.log(`[MOCK TELEGRAM SEND] to ${senderId}: "${text}"`);
        return;
      }
      try {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: senderId,
            text: text,
            parse_mode: 'Markdown'
          })
        });
      } catch (err) {
        console.error('[Chatbot] Telegram Send API error:', err.message);
      }
    } else if (platform === 'whatsapp') {
      const waToken = process.env.WHATSAPP_ACCESS_TOKEN;
      const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
      if (!waToken || !phoneId) {
        console.log(`[MOCK WHATSAPP SEND] to ${senderId}: "${text}"`);
        return;
      }
      try {
        await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${waToken}`
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: senderId,
            type: 'text',
            text: { body: text }
          })
        });
      } catch (err) {
        console.error('[Chatbot] WhatsApp Send API error:', err.message);
      }
    } else {
      console.log(`[MOCK SOCIAL SEND] Platform [${platform}] User [${senderId}]: "${text}"`);
    }
  }
};

module.exports = CHATBOT;
