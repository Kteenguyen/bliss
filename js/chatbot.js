// ============================================================
// chatbot.js — Conversation state machine & response generator
// ============================================================

const CHATBOT = {
  state: 'IDLE',
  context: {},

  FAQ_KB: {
    parking: '🚗 Có bãi đỗ xe miễn phí ngay tại homestay, sức chứa 10 xe máy và 3 ô tô.',
    breakfast: '🍳 Bữa sáng miễn phí cho phòng Lantern Loft (Hội An). Các phòng khác có thể đặt thêm 80k/người.',
    airport: '✈️ Có dịch vụ đón sân bay: 150k/lượt (Đà Lạt), 200k/lượt (Hội An), 120k/lượt (Nha Trang).',
    checkin_time: '⏰ Giờ check-in: từ 14:00. Giờ check-out: trước 12:00. Early check-in/Late check-out liên hệ trước nhé!',
    pet: '🐾 Rất tiếc, hiện tại chúng mình chưa cho phép mang thú cưng vào homestay.',
    wifi: '📶 WiFi tốc độ cao 100Mbps miễn phí tại tất cả phòng. Mật khẩu sẽ được gửi khi check-in.',
    payment: '💳 Thanh toán: Chuyển khoản ngân hàng hoặc tiền mặt. Đặt cọc 30% khi xác nhận booking.',
    refund: '💰 Hoàn tiền: Huỷ trước 3 ngày được hoàn 100%. Huỷ 1-3 ngày hoàn 50%. Dưới 24h không hoàn.',
    tour: '🗺️ Có dịch vụ tour: Đà Lạt (xe máy, cà phê), Hội An (phố cổ, làng gốm), Nha Trang (lặn biển, đảo).',
    smoking: '🚭 Phòng không hút thuốc. Có khu vực hút thuốc riêng tại tầng trệt.',
  },

  async process(message, addBotMsg, updateTyping) {
    const settings = DB.getSettings();
    let entities;

    // ─── TỰ ĐỘNG CHẠY BẰNG GPT/GEMINI NẾU CÓ KEY ───
    if (settings.gemini_key) {
      if (typeof updateTyping === 'function') updateTyping(true);
      const reply = await this._processWithGemini(message, settings.gemini_key, addBotMsg);
      if (typeof updateTyping === 'function') updateTyping(false);
      if (reply) return; // Đã xử lý và phản hồi thành công bằng Gemini AI!
    }

    // Fallback về State Machine cứng nếu không có key
    if (settings.gemini_key) {
      entities = await NLP.extractWithGemini(message, settings.gemini_key);
    }
    if (!entities) entities = NLP.extract(message);

    const intent = entities.intent;

    // Debug panel
    window.lastEntities = entities;
    document.getElementById('nlp-debug')?.classList.remove('hidden');
    const dbgEl = document.getElementById('nlp-debug-content');
    if (dbgEl) dbgEl.textContent = JSON.stringify(entities, null, 2);

    // ─── State Machine ────────────────────────────────────────

    // If currently collecting info for a booking
    if (this.state === 'COLLECTING_INFO') {
      this._mergeContext(entities);
      return this._continueCollecting(addBotMsg);
    }

    if (this.state === 'SHOWING_QUOTE' && (intent === 'booking_confirm' || message.match(/^\d+$/))) {
      return this._handleRoomSelection(message, addBotMsg);
    }

    if (this.state === 'CONFIRMING_BOOKING' && intent === 'booking_confirm') {
      return this._finalizeBooking(addBotMsg);
    }

    if (this.state === 'CONFIRMING_BOOKING' && message.toLowerCase().match(/không|sửa|đổi|thay|cancel|huỷ/)) {
      this.state = 'IDLE';
      this.context = {};
      return addBotMsg('Đã huỷ. Bạn muốn tìm phòng khác không? Mình sẵn sàng tư vấn nhé! 😊', 'bot');
    }

    // ─── New intents ────────────────────────────────────────

    switch (intent) {
      case 'greeting':
        this.state = 'IDLE';
        return addBotMsg(`Xin chào! 👋 Mình là **Bliss AI Assistant** — trợ lý ảo của Bliss Homestay.\n\nMình có thể giúp bạn:\n• 🏠 Kiểm tra phòng trống & báo giá\n• 📅 Đặt phòng nhanh chóng\n• ❓ Trả lời mọi thắc mắc\n\nBạn đang muốn đặt phòng ở chi nhánh nào? **Đà Lạt**, **Hội An** hay **Nha Trang**? 🌟`, 'bot');

      case 'booking_inquiry':
        this.context = { ...this.context, ...entities };
        return this._startBookingFlow(addBotMsg);

      case 'complaint':
        return this._handleComplaint(message, addBotMsg);

      case 'checkin_support':
        return this._handleCheckInSupport(addBotMsg);

      case 'cancel_modify':
        this.state = 'IDLE';
        return addBotMsg('Để huỷ hoặc đổi lịch, mình cần số mã đặt phòng của bạn (vd: BL001). Bạn có thể cung cấp không? Hoặc để kết nối với nhân viên hỗ trợ: Nhắn "gặp nhân viên" nhé!', 'bot');

      case 'feedback':
        return addBotMsg('Cảm ơn bạn rất nhiều! 🙏 Phản hồi của bạn giúp chúng mình ngày càng tốt hơn.\n\n⭐ Để lại Google Review: [bit.ly/bliss-google]\n⭐ Facebook: [bit.ly/bliss-fb]\n\nHẹn gặp lại bạn lần sau nhé! 💙', 'bot');

      case 'faq':
        return this._handleFAQ(message, addBotMsg);

      default:
        // Check if it's a FAQ keyword
        if (this._matchFAQ(message)) return this._handleFAQ(message, addBotMsg);
        // Handoff
        this.state = 'IDLE';
        DB.addActivity({ type: 'handoff', msg: `🔔 Handoff: Khách cần hỗ trợ thêm — "${message.substring(0,40)}..."`, color: 'orange' });
        NOTIFICATIONS.sendAlert('🔔 HANDOFF REQUEST', `Khách cần hỗ trợ: "${message.substring(0,60)}..."`, 'orange');
        return addBotMsg('Câu hỏi này cần nhân viên tư vấn trực tiếp nhé! 😊\n\nMình đã **thông báo ngay cho team Sales** rồi — trong vòng **5 phút** sẽ có người liên hệ với bạn.\n\nBạn có thể để lại số điện thoại để tiện liên hệ không? 📞', 'bot', 'handoff');
    }
  },

  _mergeContext(entities) {
    if (entities.check_in_date) this.context.check_in_date = entities.check_in_date;
    if (entities.check_out_date) this.context.check_out_date = entities.check_out_date;
    if (entities.num_adults) this.context.num_adults = entities.num_adults;
    if (entities.nights && this.context.check_in_date && !this.context.check_out_date) {
      const d = new Date(this.context.check_in_date);
      d.setDate(d.getDate() + entities.nights);
      this.context.check_out_date = d.toISOString().split('T')[0];
    }
    if (entities.branch) { this.context.branch = entities.branch; this.context.branch_name = entities.branch_name; }
  },

  _startBookingFlow(addBotMsg) {
    this._mergeContext(this.context);
    return this._continueCollecting(addBotMsg);
  },

  _continueCollecting(addBotMsg) {
    const ctx = this.context;
    const missing = [];

    if (!ctx.branch) missing.push('chi_nhánh');
    if (!ctx.check_in_date) missing.push('check_in');
    if (!ctx.check_out_date) missing.push('check_out');
    if (!ctx.num_adults) missing.push('so_nguoi');

    if (missing.length === 0) {
      return this._showAvailableRooms(addBotMsg);
    }

    this.state = 'COLLECTING_INFO';
    const q = missing[0];
    const questions = {
      chi_nhánh: 'Bạn muốn đặt phòng tại chi nhánh nào?\n• 🏔️ **Đà Lạt**\n• 🏮 **Hội An**\n• 🌊 **Nha Trang**',
      check_in: 'Ngày **check-in** (nhận phòng) là ngày mấy ạ? (vd: 28/6, thứ 6, ngày mai...)',
      check_out: `Ngày **check-out** (trả phòng) là ngày mấy ạ? Hoặc bạn ở mấy đêm?`,
      so_nguoi: 'Có bao nhiêu **khách** ạ? (vd: 2 người, 4 khách...)',
    };
    return addBotMsg(questions[q], 'bot', 'collecting');
  },

  _showAvailableRooms(addBotMsg) {
    const ctx = this.context;
    const rooms = DB.getRoomsByBranch(ctx.branch);
    const available = rooms.filter(r => {
      if (ctx.num_adults && r.capacity < ctx.num_adults) return false;
      return DB.isAvailable(r.room_id, ctx.check_in_date, ctx.check_out_date);
    });

    if (available.length === 0) {
      this.state = 'IDLE';
      return addBotMsg(`😔 Rất tiếc, **${ctx.branch_name}** không còn phòng trống trong khoảng **${UTIL.fmtDate(ctx.check_in_date)} → ${UTIL.fmtDate(ctx.check_out_date)}** cho ${ctx.num_adults} khách.\n\nBạn muốn thử:\n• 📅 Đổi ngày khác?\n• 🗺️ Tìm ở chi nhánh khác?`, 'bot', 'warning');
    }

    // Calculate prices
    this.context.availableRooms = available.map(r => ({
      ...r,
      totalPrice: DB.calcPrice(r, ctx.check_in_date, ctx.check_out_date),
    }));

    const nights = UTIL.nightsBetween(ctx.check_in_date, ctx.check_out_date);
    let msg = `✅ Tìm thấy **${available.length} phòng trống** tại ${ctx.branch_name} cho ${ctx.num_adults} khách (${nights} đêm):\n\n`;

    this.context.availableRooms.forEach((r, i) => {
      msg += `**[${i+1}] ${r.emoji} ${r.room_name}**\n`;
      msg += `👥 Sức chứa: ${r.capacity} khách | 💰 Tổng: **${UTIL.fmtPrice(r.totalPrice)}**\n`;
      msg += `✨ ${r.amenities.slice(0,3).join(', ')}\n\n`;
    });

    msg += `📩 Gõ số **1, 2...** để chọn phòng hoặc hỏi mình thêm nhé!`;

    // Upsell hint
    const upsells = [];
    if (ctx.num_adults >= 4) upsells.push('🍖 Gói BBQ thêm 300k/nhóm');
    if (ctx.branch === 'nha_trang') upsells.push('🤿 Tour lặn biển 450k/người');
    if (ctx.branch === 'da_lat') upsells.push('🏍️ Thuê xe máy 150k/ngày');
    if (ctx.branch === 'hoi_an') upsells.push('🚲 Xe đạp miễn phí included!');
    if (upsells.length) msg += `\n\n💡 **Gợi ý thêm:** ${upsells.join(' | ')}`;

    this.state = 'SHOWING_QUOTE';
    return addBotMsg(msg, 'bot', 'quote');
  },

  _handleRoomSelection(message, addBotMsg) {
    const num = parseInt(message.trim());
    const rooms = this.context.availableRooms;

    if (!rooms || isNaN(num) || num < 1 || num > rooms.length) {
      return addBotMsg(`Bạn chọn phòng số mấy? Gõ số **1** đến **${rooms?.length || 1}** nhé!`, 'bot');
    }

    const room = rooms[num - 1];
    this.context.selectedRoom = room;

    const ctx = this.context;
    const nights = UTIL.nightsBetween(ctx.check_in_date, ctx.check_out_date);

    const msg = `📋 **Xác nhận đặt phòng:**\n\n` +
      `🏠 Phòng: **${room.emoji} ${room.room_name}** (${ctx.branch_name})\n` +
      `📅 Check-in: **${UTIL.fmtDate(ctx.check_in_date)}** (14:00)\n` +
      `📅 Check-out: **${UTIL.fmtDate(ctx.check_out_date)}** (12:00)\n` +
      `👥 Khách: **${ctx.num_adults} người**\n` +
      `🌙 Số đêm: **${nights} đêm**\n` +
      `💰 Tổng tiền: **${UTIL.fmtPrice(room.totalPrice)}**\n\n` +
      `Bạn xác nhận thông tin đúng chưa?\nGõ **"OK"** hoặc **"Xác nhận"** để chốt, hoặc **"Sửa"** nếu muốn thay đổi.`;

    this.state = 'CONFIRMING_BOOKING';
    return addBotMsg(msg, 'bot', 'confirm');
  },

  _finalizeBooking(addBotMsg) {
    const ctx = this.context;
    const room = ctx.selectedRoom;
    if (!room) return;

    const booking = DB.createBooking({
      customer_name: 'Khách Demo',
      customer_phone: 'N/A',
      customer_fb_id: 'demo_user',
      branch: ctx.branch,
      branch_name: ctx.branch_name,
      room_id: room.room_id,
      room_name: room.room_name,
      check_in_date: ctx.check_in_date,
      check_out_date: ctx.check_out_date,
      num_guests: ctx.num_adults,
      total_price: room.totalPrice,
      status: 'confirmed',
      special_requests: ctx.special_requests || null,
    });

    this.state = 'IDLE';
    this.context = {};

    // Update dashboard if visible
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof renderBookings === 'function') renderBookings();

    const msg = `🎉 **Đặt phòng thành công!**\n\n` +
      `🔖 Mã đặt phòng: **#${booking.booking_id}**\n` +
      `${room.emoji} ${room.room_name} — ${ctx.branch_name}\n\n` +
      `📩 Chúng mình sẽ gửi hướng dẫn check-in trước **24 giờ** qua tin nhắn này.\n\n` +
      `Cần hỗ trợ thêm không? Mình luôn ở đây! 😊`;

    NOTIFICATIONS.sendAlert('✅ Booking mới', `#${booking.booking_id} — ${room.room_name}`, 'green');
    return addBotMsg(msg, 'bot', 'success');
  },

  _handleComplaint(message, addBotMsg) {
    const branch = NLP.extractBranch(message)?.name || 'chi nhánh';
    DB.addActivity({ type: 'complaint', msg: `⚠️ Sự cố: "${message.substring(0,50)}..." tại ${branch}`, color: 'red' });
    NOTIFICATIONS.sendAlert('⚠️ SỰ CỐ VẬN HÀNH', `Báo cáo từ khách tại ${branch}: "${message.substring(0,80)}"`, 'red');
    this.state = 'IDLE';
    return addBotMsg(`Mình rất xin lỗi về sự bất tiện này! 🙏\n\nMình đã **gửi ngay cảnh báo cho bộ phận kỹ thuật** tại ${branch} rồi.\n\n⏱️ Nhân viên sẽ đến xử lý trong vòng **15-30 phút**.\n\nBạn có thể mô tả thêm vấn đề không? Để mình note đầy đủ cho team nhé!`, 'bot', 'warning');
  },

  _handleCheckInSupport(addBotMsg) {
    const settings = DB.getSettings();
    const pin = settings.pin_prefix || '6789';
    this.state = 'IDLE';
    return addBotMsg(`🔑 **Hướng dẫn Check-in:**\n\n📍 Địa chỉ: Mình sẽ gửi riêng qua link Google Maps\n🔐 **Mã cửa: ${pin}##** (nhập số rồi nhấn # hai lần)\n📶 WiFi: **BlissHome** / Pass: **bliss2024**\n🅿️ Parking: Tầng hầm B1, biển số xe mình ghi nhận rồi\n\n⏰ Check-in từ 14:00 | Check-out trước 12:00\n\nCần hỗ trợ gì thêm cứ nhắn mình nhé! 😊`, 'bot', 'info');
  },

  _matchFAQ(text) {
    const t = text.toLowerCase();
    return Object.keys(this.FAQ_KB).some(k => t.includes(k.replace('_', ' ')));
  },

  _handleFAQ(message, addBotMsg) {
    const t = message.toLowerCase();
    for (const [key, ans] of Object.entries(this.FAQ_KB)) {
      if (t.includes(key.replace('_', ' ')) || t.includes(key)) {
        return addBotMsg(ans, 'bot', 'info');
      }
    }
    // Generic FAQ
    if (t.match(/giá|tiền|bao nhiêu|phí/)) {
      return addBotMsg('💰 Giá phòng dao động từ **700k - 5.000k/đêm** tuỳ chi nhánh và ngày. Cho mình biết bạn muốn đặt bao giờ để báo giá chính xác nhé!', 'bot', 'info');
    }
    return addBotMsg('Câu hỏi hay đó! 😊 Bạn cho mình hỏi thêm một chút — bạn đang muốn hỏi về phòng tại chi nhánh nào? **Đà Lạt**, **Hội An** hay **Nha Trang**?', 'bot');
  },

  async _processWithGemini(message, apiKey, addBotMsg) {
    const today = new Date().toISOString().split('T')[0];
    const rooms = DB.getRooms();
    const bookings = DB.getBookings();
    const settings = DB.getSettings();
    const pin = settings.pin_prefix || '6789';

    // Khởi tạo lịch sử hội thoại cục bộ nếu chưa có
    if (!this.history) this.history = [];
    this.history.push({ role: 'user', parts: [{ text: message }] });

    // Giới hạn lịch sử hội thoại gần nhất (tối đa 15 tin nhắn) để tiết kiệm token
    if (this.history.length > 15) {
      this.history = this.history.slice(-15);
    }

    const systemInstruction = `Bạn là Trợ lý ảo AI cực kỳ thông minh và mến khách của Bliss Homestay (Việt Nam).
Nhiệm vụ của bạn là hỗ trợ khách hàng đặt phòng, giải đáp thắc mắc và xử lý sự cố hoàn toàn bằng ngôn ngữ tự nhiên sống động.

DỮ LIỆU HỆ THỐNG TRONG THỜI GIAN THỰC (REAL-TIME DATABASE):
- Danh sách phòng hiện có: ${JSON.stringify(rooms)}
- Danh sách đặt phòng hiện tại (Hãy kiểm tra ngày để tránh trùng lịch đặt): ${JSON.stringify(bookings)}
- Cấu hình PIN cửa check-in tự động: ${pin}##
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
   - Hãy hỏi các thông tin cần thiết một cách khéo léo: Chi nhánh muốn ở (Đà Lạt/Hội An/Nha Trang), Ngày check-in, Ngày check-out (hoặc số đêm), Số lượng khách.
   - Khi có đủ thông tin, đối chiếu với dữ liệu phòng trống và lịch đặt phòng hiện tại ở trên để kiểm tra phòng trống.
   - Tính tổng tiền dựa trên giá phòng ngày thường/cuối tuần và số đêm, sau đó báo giá tự nhiên cho khách.
   - Nếu khách đồng ý chốt đặt phòng (nói "OK", "chốt", "xác nhận"), hãy thông báo đặt phòng thành công, sinh mã đặt phòng mới (ví dụ: #BL006, #BL007...) và báo với khách là hệ thống đã ghi nhận thành công.
3. Sử dụng các emoji phù hợp (🏔️, 🏮, 🌊, 🔑, 📶) để tin nhắn sinh động.
4. KHI XÁC NHẬN ĐẶT PHÒNG THÀNH CÔNG (sau khi khách đồng ý và bạn sinh mã đặt phòng mới như #BL006): Bạn BẮT BUỘC phải đính kèm ở CUỐI CÙNG câu trả lời của mình một thẻ ẩn HTML comment chứa chính xác thông tin đặt phòng dưới dạng JSON như sau:
<!-- BOOKING_DATA: {"booking_id":"BL006","customer_name":"Tên khách hoặc Khách hàng","customer_phone":"Số điện thoại nếu có","branch":"da_lat","room_id":"R001","check_in_date":"YYYY-MM-DD","check_out_date":"YYYY-MM-DD","num_guests":2,"total_price":2400000} -->
Hãy tự động trích xuất các trường từ cuộc trò chuyện thực tế của khách hàng. Hãy đảm bảo room_id và branch chính xác tương ứng với phòng được chọn, tính toán total_price chuẩn xác dựa trên giá phòng ngày thường/cuối tuần và số đêm thực tế.
`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: this.history,
            systemInstruction: { parts: [{ text: systemInstruction }] },
            generationConfig: { temperature: 0.3, maxOutputTokens: 1024 }
          })
        }
      );
      const data = await res.json();
      const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      if (botReply) {
        this.history.push({ role: 'model', parts: [{ text: botReply }] });

        // Tự động đồng bộ đặt phòng vào cơ sở dữ liệu thực tế nếu AI báo thành công
        if (botReply.includes('#BL')) {
          this._syncAIBooking(botReply);
        }

        addBotMsg(botReply, 'bot');
        return botReply;
      }
    } catch (e) {
      console.warn('[CHATBOT] Gemini generation error, falling back to State Machine:', e.message);
    }
    return null;
  },

  _syncAIBooking(replyText) {
    try {
      // 1. Dò tìm và phân tích khối dữ liệu ẩn HTML comment chứ JSON
      const jsonMatch = replyText.match(/<!-- BOOKING_DATA:\s*({.*?})\s*-->/);
      if (jsonMatch) {
        const info = JSON.parse(jsonMatch[1]);
        const rooms = DB.getRooms();
        const room = rooms.find(r => r.room_id === info.room_id) || rooms.find(r => r.branch === info.branch) || rooms[0];
        
        const booking = DB.createBooking({
          booking_id: info.booking_id || `BL00${Date.now() % 10}`,
          customer_name: info.customer_name || 'Khách AI Facebook',
          customer_phone: info.customer_phone || 'N/A',
          customer_fb_id: 'fb_ai',
          branch: info.branch || room.branch,
          branch_name: (info.branch === 'da_lat' ? 'Đà Lạt' : info.branch === 'hoi_an' ? 'Hội An' : info.branch === 'nha_trang' ? 'Nha Trang' : room.branch_name),
          room_id: room.room_id,
          room_name: room.room_name,
          check_in_date: info.check_in_date || new Date().toISOString().split('T')[0],
          check_out_date: info.check_out_date || new Date(Date.now() + 864e5).toISOString().split('T')[0],
          num_guests: Number(info.num_guests) || 2,
          total_price: Number(info.total_price) || room.base_price_weekday,
          status: 'confirmed',
          source: 'facebook',
          special_requests: 'Được tạo hoàn toàn tự động bằng trí tuệ nhân tạo Live AI Chatbot',
        });
        console.log('✅ [AI Sync] Đã tự động tạo đặt phòng thực tế CHÍNH XÁC từ AI JSON:', booking);
        
        // Hỗ trợ cập nhật giao diện ngay lập tức nếu đang mở trên trình duyệt
        if (typeof renderDashboard === 'function') renderDashboard();
        if (typeof renderBookings === 'function') renderBookings();
        return;
      }

      // 2. Heuristics Fallback nếu không có JSON ẩn (ngăn lỗi tương thích)
      let branch = 'da_lat';
      let branchName = 'Đà Lạt';
      const text = replyText.toLowerCase();
      if (text.includes('hội an') || text.includes('hoi an')) { branch = 'hoi_an'; branchName = 'Hội An'; }
      else if (text.includes('nha trang') || text.includes('nha trang')) { branch = 'nha_trang'; branchName = 'Nha Trang'; }

      const rooms = DB.getRoomsByBranch(branch);
      const room = rooms[0] || { room_id: 'R001', room_name: 'Phòng Sương Mù' };

      // Trích xuất mã đặt phòng
      const match = replyText.match(/#BL(\d+)/);
      const bookingId = match ? `BL${match[1]}` : `BL00${Date.now() % 10}`;

      const booking = DB.createBooking({
        booking_id: bookingId,
        customer_name: 'Khách AI Facebook',
        customer_phone: 'N/A',
        customer_fb_id: 'fb_ai',
        branch: branch,
        branch_name: branchName,
        room_id: room.room_id,
        room_name: room.room_name,
        check_in_date: new Date().toISOString().split('T')[0],
        check_out_date: new Date(Date.now() + 864e5).toISOString().split('T')[0],
        num_guests: 2,
        total_price: room.base_price_weekday || 800000,
        status: 'confirmed',
        special_requests: 'Được tạo hoàn toàn tự động bằng trí tuệ nhân tạo Live AI Chatbot',
      });
      console.log('✅ [AI Sync] Đã tự động tạo đặt phòng thực tế đồng bộ vào DB:', booking);
      
      if (typeof renderDashboard === 'function') renderDashboard();
      if (typeof renderBookings === 'function') renderBookings();
    } catch (e) {
      console.warn('Lỗi đồng bộ đặt phòng AI:', e.message);
    }
  }
};

// ─── Notification System (simulates Slack/Telegram alerts) ───
const NOTIFICATIONS = {
  alerts: [],
  sendAlert(title, message, color = 'blue') {
    const alert = { id: Date.now(), title, message, color, time: new Date().toISOString() };
    this.alerts.unshift(alert);
    this.render();
  },
  render() {
    const el = document.getElementById('notification-panel');
    if (!el) return;
    el.innerHTML = this.alerts.slice(0, 5).map(a => `
      <div class="notif-item notif-${a.color}">
        <div class="notif-title">${a.title}</div>
        <div class="notif-msg">${a.message}</div>
        <div class="notif-time">${UTIL.timeAgo(a.time)}</div>
      </div>`).join('');
  }
};

// ─── Utility helpers ────────────────────────────────────────
const UTIL = {
  fmtPrice: n => new Intl.NumberFormat('vi-VN').format(n) + ' ₫',
  fmtDate: s => {
    if (!s) return '?';
    const d = new Date(s);
    return d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
  },
  nightsBetween(from, to) {
    return Math.round((new Date(to) - new Date(from)) / 864e5);
  },
  timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60000) return 'Vừa xong';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' phút trước';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' giờ trước';
    return Math.floor(diff / 86400000) + ' ngày trước';
  },
  statusBadge(s) {
    const map = {
      confirmed: ['✅ Xác nhận', 'badge-confirmed'],
      checked_in: ['🏠 Đang ở', 'badge-checkedin'],
      checked_out: ['👋 Đã trả', 'badge-out'],
      cancelled: ['❌ Huỷ', 'badge-cancelled'],
      inquiring: ['💬 Đang hỏi', 'badge-inquiring'],
    };
    const [label, cls] = map[s] || [s, ''];
    return `<span class="badge ${cls}">${label}</span>`;
  },
  sourceBadge(s) {
    const icons = { facebook: '📘 Facebook', zalo: '💙 Zalo', website: '🌐 Website', chat_demo: '🤖 Chat Demo', direct: '📞 Direct' };
    return icons[s] || s;
  }
};
