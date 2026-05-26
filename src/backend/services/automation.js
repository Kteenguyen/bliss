const sheetsService = require('./sheetsService');
const chatbot = require('./chatbot');

const automationService = {
  async triggerWebhook(url, payload) {
    if (!url) return;
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log(`[Automation] Triggered Make.com webhook: ${url}`);
    } catch (e) {
      console.error(`[Automation] Error calling webhook ${url}:`, e.message);
    }
  },

  async runPreCheckInReminder() {
    console.log('[Automation] Running Pre-Check-in Reminder (S06)...');
    const bookings = sheetsService.getBookings();
    
    // Find guests checking in tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const targets = bookings.filter(b => 
      b.check_in_date === tomorrowStr && 
      b.status === 'confirmed'
    );

    if (targets.length === 0) {
      console.log('[Automation] No bookings check in tomorrow.');
      return { success: true, processed: 0 };
    }

    for (const b of targets) {
      const pinPrefix = '6789';
      const msg = `🔑 **Chào ${b.customer_name}!** Hướng dẫn nhận phòng cho mã đặt phòng **#${b.booking_id}** tại chi nhánh **${b.branch_name}** (${b.room_name}):\n\n` +
        `- 📍 Địa chỉ: Vị trí chi tiết gửi qua Google Maps.\n` +
        `- 🔐 **Mã cửa: ${pinPrefix}##** (Nhập chuỗi số và kết thúc bằng hai phím # để mở khóa).\n` +
        `- 📶 Wifi: **BlissHome** / Mật khẩu: **bliss2024**.\n\n` +
        `Check-in từ 14:00. Chúc bạn có một hành trình vui vẻ! 😊`;

      if (b.customer_social_id) {
        await chatbot.sendSocialMessage(b.customer_social_id, b.source || 'facebook', msg);
      }
    }

    const webhookUrl = process.env.MAKE_WEBHOOK_S06;
    if (webhookUrl) {
      await this.triggerWebhook(webhookUrl, { scenario: 'S06', bookings: targets });
    }

    console.log(`[Automation] Pre-check-in sent to ${targets.length} guests.`);
    return { success: true, processed: targets.length };
  },

  async runPostCheckOutReview() {
    console.log('[Automation] Running Post-Check-out Review (S07)...');
    const bookings = sheetsService.getBookings();
    
    const todayStr = new Date().toISOString().split('T')[0];
    const targets = bookings.filter(b => 
      b.check_out_date === todayStr && 
      b.status === 'checked_in' && 
      !b.review_sent
    );

    if (targets.length === 0) {
      console.log('[Automation] No bookings checkout today requiring review.');
      return { success: true, processed: 0 };
    }

    const queueService = require('./queueService'); // Resolve circular dependency at runtime
    for (const b of targets) {
      const msg = `⭐ **Chào ${b.customer_name}!** Bliss Homestay hy vọng bạn đã có một thời gian lưu trú thật tuyệt vời tại **${b.branch_name}** (${b.room_name}).\n\n` +
        `Để giúp chúng mình cải thiện dịch vụ, bạn có thể dành 1 phút chia sẻ cảm nhận không ạ?\n` +
        `- Google Review: [bit.ly/bliss-google]\n` +
        `- Facebook: [bit.ly/bliss-fb]\n\n` +
        `Cảm ơn bạn rất nhiều! Hẹn gặp lại bạn trong chuyến đi tiếp theo! 💙`;

      if (b.customer_social_id) {
        await chatbot.sendSocialMessage(b.customer_social_id, b.source || 'facebook', msg);
      }
      
      // Update locally
      b.review_sent = true;
      sheetsService.optimisticUpdateBooking(b.booking_id, { review_sent: true });
      
      // Enqueue to queue
      queueService.enqueue('UPDATE_BOOKING', { id: b.booking_id, data: { review_sent: true } });
    }

    const webhookUrl = process.env.MAKE_WEBHOOK_S07;
    if (webhookUrl) {
      await this.triggerWebhook(webhookUrl, { scenario: 'S07', bookings: targets });
    }

    console.log(`[Automation] Review requests sent to ${targets.length} guests.`);
    return { success: true, processed: targets.length };
  },

  async runAntiOverbookingMonitor() {
    console.log('[Automation] Running Anti-Overbooking Monitor (S08)...');
    const bookings = sheetsService.getBookings();
    
    const activeBookings = bookings.filter(b => ['confirmed', 'checked_in'].includes(b.status));
    const conflicts = [];
    const roomGroups = {};

    activeBookings.forEach(b => {
      if (!roomGroups[b.room_id]) roomGroups[b.room_id] = [];
      roomGroups[b.room_id].push(b);
    });

    for (const [roomId, list] of Object.entries(roomGroups)) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const b1 = list[i];
          const b2 = list[j];
          if (!(b1.check_out_date <= b2.check_in_date || b1.check_in_date >= b2.check_out_date)) {
            conflicts.push({ b1, b2 });
            console.warn(`[Automation] Overbooking conflict detected on room ${roomId}: ${b1.booking_id} vs ${b2.booking_id}`);
          }
        }
      }
    }

    const webhookUrl = process.env.MAKE_WEBHOOK_S08;
    if (webhookUrl) {
      await this.triggerWebhook(webhookUrl, { 
        scenario: 'S08', 
        conflicts: conflicts.map(c => ({ a: c.b1, b: c.b2 })), 
        totalBookings: activeBookings.length 
      });
    }

    return { success: true, conflictsCount: conflicts.length, conflicts };
  },

  startAutomationSchedules() {
    // Schedule check-in reminder daily at 09:00 AM local time
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 9 && now.getMinutes() === 0) {
        this.runPreCheckInReminder();
      }
    }, 60000);

    // Schedule check-out review checker daily at 02:00 PM local time
    setInterval(() => {
      const now = new Date();
      if (now.getHours() === 14 && now.getMinutes() === 0) {
        this.runPostCheckOutReview();
      }
    }, 60000);

    // Run overbooking check every 15 minutes
    setInterval(() => {
      this.runAntiOverbookingMonitor();
    }, 15 * 60 * 1000);
    
    console.log('[Automation] Scheduler jobs loaded successfully.');
  }
};

module.exports = automationService;
