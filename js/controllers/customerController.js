// ============================================================
// customerController.js — Controller logic for Dozy hourly slots
// ============================================================

const CustomerController = {
  openCustBookingModal(roomId) {
    const r = DB.getRoom(roomId);
    if (!r) return;

    activeCustRoom = r;
    selectedCustSlots = [];
    currentSlideIndex = 0;

    const dates = this.generateCustDates();
    activeCustDate = dates[0].dateStr; // default to today

    CustomerView.openCustBookingModal(r);
  },

  closeCustBookingModal() {
    CustomerView.closeCustBookingModal();
  },

  selectCustDate(dateStr) {
    activeCustDate = dateStr;
    selectedCustSlots = [];
    CustomerView.selectCustDate(dateStr);
  },

  toggleCustSlot(slotId) {
    const idx = selectedCustSlots.indexOf(slotId);
    if (idx >= 0) {
      selectedCustSlots.splice(idx, 1);
    } else {
      selectedCustSlots.push(slotId);
    }
    CustomerView.renderCustSlots();
    CustomerView.updateCustSummary();
  },

  submitCustBooking(event) {
    event.preventDefault();
    if (!activeCustRoom) return;

    if (selectedCustSlots.length === 0) {
      showToast('⚠️ Vui lòng chọn ít nhất một khung giờ!', 'error');
      return;
    }

    const name = document.getElementById('cust-book-name').value.trim();
    const phone = document.getElementById('cust-book-phone').value.trim();

    if (!name || !phone) {
      showToast('⚠️ Vui lòng điền đầy đủ tên và số điện thoại!', 'error');
      return;
    }

    let subtotal = 0;
    selectedCustSlots.forEach(slotId => {
      const slot = DOZY_SLOTS.find(s => s.id === slotId);
      if (slot) {
        subtotal += slot.type === 'day' ? activeCustRoom.hourly_price_day : activeCustRoom.hourly_price_night;
      }
    });

    const discount = selectedCustSlots.length >= 2 ? Math.round(subtotal * 0.1) : 0;
    const totalPrice = subtotal - discount;
    const slotsStr = selectedCustSlots.join(', ');

    const bookingData = {
      customer_name: name,
      customer_phone: phone,
      customer_fb_id: 'cust_web_' + Date.now(),
      branch: activeCustRoom.branch,
      branch_name: activeCustRoom.branch_name,
      room_id: activeCustRoom.room_id,
      room_name: activeCustRoom.room_name,
      check_in_date: activeCustDate,
      check_out_date: activeCustDate, // Same check-out date for single day hourly booking
      num_guests: 2,
      total_price: totalPrice,
      status: 'confirmed',
      special_requests: `Đặt giờ Dozy Home: Khung giờ [ ${slotsStr} ]`,
      source: 'website'
    };

    const booking = DB.createBooking(bookingData);
    if (booking) {
      showToast('🎉 Đặt phòng thành công! Lịch phòng đã được cập nhật.', 'success');
      
      if (typeof NOTIFICATIONS !== 'undefined' && typeof NOTIFICATIONS.sendAlert === 'function') {
        NOTIFICATIONS.sendAlert(
          '🎉 Đặt giờ Dozy Home', 
          `Khách ${name} đã đặt phòng ${activeCustRoom.room_name} (${activeCustRoom.branch_name}) các khung: ${slotsStr}`, 
          'green'
        );
      }

      this.closeCustBookingModal();
      AppController.pushToServer();
      
      CustomerView.render();
      BookingsView.render();
      DashboardView.render();
    } else {
      showToast('❌ Đặt phòng không thành công, vui lòng thử lại.', 'error');
    }
  },

  isSlotBooked(roomId, dateStr, slotId) {
    const bookings = DB.getBookings().filter(b => 
      b.room_id === roomId && 
      b.check_in_date === dateStr && 
      !['cancelled', 'checked_out'].includes(b.status)
    );
    
    return bookings.some(b => {
      const reqs = b.special_requests || '';
      return reqs.includes(slotId);
    });
  },

  generateCustDates() {
    const dates = [];
    const daysOfWeek = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      
      let headerText = daysOfWeek[d.getDay()];
      if (i === 0) headerText = 'Hôm nay';
      
      const parts = dateStr.split('-');
      const bodyText = `${parts[2]}/${parts[1]}`;
      
      dates.push({ dateStr, headerText, bodyText });
    }
    return dates;
  },

  slidePrev() {
    const slides = document.querySelectorAll('.cust-modal-slide');
    if (slides.length <= 1) return;
    currentSlideIndex = (currentSlideIndex - 1 + slides.length) % slides.length;
    CustomerView.updateCarouselUI();
  },

  slideNext() {
    const slides = document.querySelectorAll('.cust-modal-slide');
    if (slides.length <= 1) return;
    currentSlideIndex = (currentSlideIndex + 1) % slides.length;
    CustomerView.updateCarouselUI();
  },

  goToSlide(index) {
    currentSlideIndex = index;
    CustomerView.updateCarouselUI();
  },

  scrollDatesLeft() {
    const container = document.getElementById('cust-modal-dates-container');
    if (container) container.scrollLeft -= 150;
  },

  scrollDatesRight() {
    const container = document.getElementById('cust-modal-dates-container');
    if (container) container.scrollLeft += 150;
  }
};

window.CustomerController = CustomerController;
