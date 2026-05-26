const sheetsService = require('../services/sheetsService');
const queueService = require('../services/queueService');
const lockService = require('../services/lockService');
const chatbot = require('../services/chatbot');

// Helper to calculate pricing
function calcPrice(room, checkIn, checkOut) {
  const ci = new Date(checkIn), co = new Date(checkOut);
  let weekdays = 0, weekends = 0;
  for (let d = new Date(ci); d < co; d.setDate(d.getDate() + 1)) {
    (d.getDay() === 0 || d.getDay() === 6) ? weekends++ : weekdays++;
  }
  return weekdays * room.base_price_weekday + weekends * room.base_price_weekend;
}

const bookingController = {
  getBookings(req, res) {
    try {
      const bookings = sheetsService.getBookings();
      res.status(200).json({ success: true, data: bookings });
    } catch (e) {
      console.error('[BookingController] getBookings error:', e.message);
      res.status(500).json({ success: false, message: e.message });
    }
  },

  getBooking(req, res) {
    try {
      const id = req.params.id;
      const booking = sheetsService.getBookings().find(b => b.booking_id === id);
      
      if (!booking) {
        return res.status(404).json({ success: false, message: `Booking with ID ${id} not found.` });
      }
      
      res.status(200).json({ success: true, data: booking });
    } catch (e) {
      console.error('[BookingController] getBooking error:', e.message);
      res.status(500).json({ success: false, message: e.message });
    }
  },

  async createBooking(req, res) {
    const data = req.body;
    const { room_id, check_in_date, check_out_date } = data;

    if (!room_id || !check_in_date || !check_out_date) {
      return res.status(400).json({ success: false, message: 'room_id, check_in_date, and check_out_date are required.' });
    }

    // 1. Acquire distributed transaction lock
    const lockAcquired = lockService.acquireLock(room_id, check_in_date, check_out_date, 10);
    if (!lockAcquired) {
      return res.status(409).json({ success: false, message: 'This room is currently being locked by another booking operation. Please retry.' });
    }

    try {
      // 2. Double-check room availability in cache
      const room = sheetsService.getRooms().find(r => r.room_id === room_id && r.status === 'active');
      if (!room) {
        lockService.releaseLock(room_id, check_in_date, check_out_date);
        return res.status(404).json({ success: false, message: 'Room not found or is inactive.' });
      }

      const isRoomOccupied = sheetsService.getBookings().some(b => 
        b.room_id === room_id && 
        !['cancelled', 'checked_out'].includes(b.checkin_status) &&
        !(check_out_date <= b.check_in_date || check_in_date >= b.check_out_date)
      );

      if (isRoomOccupied) {
        lockService.releaseLock(room_id, check_in_date, check_out_date);
        return res.status(400).json({ success: false, message: 'Room is already occupied/booked for the selected dates.' });
      }

      // Generate Booking ID
      const bookings = sheetsService.getBookings();
      let maxId = 0;
      bookings.forEach(b => {
        if (b.booking_id && b.booking_id.startsWith('BL')) {
          const num = parseInt(b.booking_id.replace('BL', ''));
          if (!isNaN(num) && num > maxId) maxId = num;
        }
      });
      const newBookingId = 'BL' + String(maxId + 1).padStart(3, '0');

      const totalPrice = data.total_price || calcPrice(room, check_in_date, check_out_date);

      const newBooking = {
        booking_id: newBookingId,
        customer_name: data.customer_name || 'Khách Vãng Lai',
        customer_phone: data.customer_phone || 'N/A',
        customer_social_id: data.customer_social_id || '',
        branch: room.branch,
        branch_name: room.branch_name,
        room_id: room_id,
        room_name: room.room_name,
        check_in_date: check_in_date,
        check_out_date: check_out_date,
        num_guests: Number(data.num_guests) || 1,
        total_price: Number(totalPrice),
        payment_status: data.payment_status || 'pending',
        checkin_status: data.checkin_status || 'pending',
        special_requests: data.special_requests || '',
        source: data.source || 'website',
        review_sent: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // 3. Optimistic local write
      sheetsService.optimisticCreateBooking(newBooking);

      // 4. Enqueue Sheets sync task
      queueService.enqueue('CREATE_BOOKING', newBooking);

      // 5. Release distributed transaction lock
      lockService.releaseLock(room_id, check_in_date, check_out_date);

      res.status(201).json({ success: true, data: newBooking });
    } catch (e) {
      lockService.releaseLock(room_id, check_in_date, check_out_date);
      console.error('[BookingController] createBooking error:', e.message);
      res.status(500).json({ success: false, message: e.message });
    }
  },

  async updateBooking(req, res) {
    try {
      const id = req.params.id;
      const updates = req.body;
      
      const bookings = sheetsService.getBookings();
      const existing = bookings.find(b => b.booking_id === id);
      
      if (!existing) {
        return res.status(404).json({ success: false, message: `Booking with ID ${id} not found.` });
      }

      const oldCheckinStatus = existing.checkin_status;
      const newCheckinStatus = updates.checkin_status || oldCheckinStatus;

      const updatedData = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      // Optimistic cache update
      sheetsService.optimisticUpdateBooking(id, updatedData);
      
      // Enqueue to write queue
      queueService.enqueue('UPDATE_BOOKING', { id, data: updatedData });

      // Trigger Automations on transitions
      if (oldCheckinStatus !== newCheckinStatus) {
        if (newCheckinStatus === 'checked_in') {
          // Trigger Door Code PIN notification
          const pinPrefix = '6789';
          const msg = `🔑 **Chào ${existing.customer_name}!** Hướng dẫn nhận phòng cho mã đặt phòng **#${id}** tại chi nhánh **${existing.branch_name}** (${existing.room_name}):\n\n` +
            `- 📍 Địa chỉ: Vị trí chi tiết gửi qua Google Maps.\n` +
            `- 🔐 **Mã cửa: ${pinPrefix}##** (Nhập chuỗi số và kết thúc bằng hai phím # để mở khóa).\n` +
            `- 📶 Wifi: **BlissHome** / Mật khẩu: **bliss2024**.\n\n` +
            `Check-in từ 14:00. Chúc bạn có một hành trình vui vẻ! 😊`;

          if (existing.customer_social_id) {
            chatbot.sendSocialMessage(existing.customer_social_id, existing.source || 'facebook', msg)
              .catch(err => console.error('[BookingController] Error sending check-in message:', err.message));
          }
        } else if (newCheckinStatus === 'checked_out') {
          // Trigger Review invitation
          const msg = `⭐ **Chào ${existing.customer_name}!** Bliss Homestay hy vọng bạn đã có một thời gian lưu trú thật tuyệt vời tại **${existing.branch_name}** (${existing.room_name}).\n\n` +
            `Để giúp chúng mình cải thiện dịch vụ, bạn có thể dành 1 phút chia sẻ cảm nhận không ạ?\n` +
            `- Google Review: [bit.ly/bliss-google]\n` +
            `- Facebook: [bit.ly/bliss-fb]\n\n` +
            `Cảm ơn bạn rất nhiều! Hẹn gặp lại bạn trong chuyến đi tiếp theo! 💙`;

          if (existing.customer_social_id) {
            chatbot.sendSocialMessage(existing.customer_social_id, existing.source || 'facebook', msg)
              .catch(err => console.error('[BookingController] Error sending review request message:', err.message));
          }
        }
      }

      res.status(200).json({ success: true, data: { ...existing, ...updatedData } });
    } catch (e) {
      console.error('[BookingController] updateBooking error:', e.message);
      res.status(500).json({ success: false, message: e.message });
    }
  },

  deleteBooking(req, res) {
    try {
      const id = req.params.id;
      
      const bookings = sheetsService.getBookings();
      const existing = bookings.find(b => b.booking_id === id);
      
      if (!existing) {
        return res.status(404).json({ success: false, message: `Booking with ID ${id} not found.` });
      }

      // Optimistic soft-delete
      sheetsService.optimisticUpdateBooking(id, { checkin_status: 'cancelled' });
      
      // Enqueue to write queue
      queueService.enqueue('UPDATE_BOOKING', { id, data: { checkin_status: 'cancelled', updated_at: new Date().toISOString() } });

      res.status(200).json({ success: true, message: `Booking ${id} soft-deleted/cancelled successfully.` });
    } catch (e) {
      console.error('[BookingController] deleteBooking error:', e.message);
      res.status(500).json({ success: false, message: e.message });
    }
  }
};

module.exports = bookingController;
