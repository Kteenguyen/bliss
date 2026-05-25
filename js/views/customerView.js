// ============================================================
// customerView.js — View component for customer booking UI
// ============================================================

const CUST_LANGS = {
  vi: {
    find_room: "Tìm phòng xinh xắn cho bạn",
    select_branch: "Chọn chi nhánh để khám phá phòng",
    no_rooms: "Chưa có phòng hoạt động tại chi nhánh này.",
    price_from: "Giá chỉ từ",
    book_now: "ĐẶT NGAY ➔",
    booking_title: "Đặt chỗ",
    discount_promo: "🎁 Ưu đãi thêm 10% khi đặt từ 2 khung giờ trở lên!",
    step_1: "1. CHỌN NGÀY NHẬN PHÒNG",
    step_2: "2. CHỌN CÁC KHUNG GIỜ",
    today: "Hôm nay",
    legend_booked: "Đã Đặt",
    legend_free: "Còn Trống",
    legend_selecting: "Đang Chọn",
    label_name: "Tên của bạn *",
    label_phone: "Số điện thoại *",
    summary_slots: "Số khung giờ chọn:",
    summary_slots_unit: "khung",
    summary_discount: "Khấu trừ giảm giá (10%):",
    summary_total: "TỔNG THANH TOÁN:",
    btn_back: "Quay lại",
    btn_book: "⚡ ĐẶT NGAY"
  },
  en: {
    find_room: "Find a cozy room for yourself",
    select_branch: "Select branch to explore rooms",
    no_rooms: "No active rooms in this branch yet.",
    price_from: "Price from",
    book_now: "BOOK NOW ➔",
    booking_title: "Book",
    discount_promo: "🎁 Extra 10% off when booking 2 or more slots!",
    step_1: "1. SELECT CHECK-IN DATE",
    step_2: "2. SELECT TIME SLOTS",
    today: "Today",
    legend_booked: "Booked",
    legend_free: "Available",
    legend_selecting: "Selecting",
    label_name: "Your name *",
    label_phone: "Phone number *",
    summary_slots: "Selected slots:",
    summary_slots_unit: "slots",
    summary_discount: "Discount (10%):",
    summary_total: "TOTAL PAYMENT:",
    btn_back: "Back",
    btn_book: "⚡ BOOK NOW"
  }
};

const CustomerView = {
  render() {
    const lang = document.getElementById('cust-lang-selector')?.value || 'vi';
    const trans = CUST_LANGS[lang];

    // Translate headers
    const titleEl = document.querySelector('#view-customer h3');
    if (titleEl) titleEl.textContent = trans.find_room;
    const subEl = document.querySelector('#view-customer p');
    if (subEl) subEl.textContent = trans.select_branch;

    const branch = document.getElementById('cust-branch-filter')?.value || 'da_lat';
    const rooms = DB.getRoomsByBranch(branch).filter(r => r.status === 'active');
    const container = document.getElementById('cust-rooms-list');
    if (!container) return;

    if (rooms.length === 0) {
      container.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:3rem;">${trans.no_rooms}</div>`;
      return;
    }

    container.innerHTML = rooms.map(r => {
      const mainImage = r.images[0] || 'images/room_1_main.png';
      const subImage1 = r.images[1] || 'images/room_1_bath.png';
      const subImage2 = r.images[2] || r.images[0] || 'images/room_1_main.png';

      const minPrice = r.slot_prices ? Math.min(...Object.values(r.slot_prices)) : (r.hourly_price_day || 239000);
      const priceK = Math.round(minPrice / 1000) + 'k';

      const amenityIcons = {
        'Bếp tự nấu': '🍳',
        'Máy chiếu': '📽️',
        'Sofa bàn trà': '🛋️',
        'Bồn tắm': '🛁',
        'Board game': '🎲',
        'Tủ lạnh': '🍦',
        'NVS riêng': '🚽',
        'Gương lớn': '🪞',
        'WiFi': '📶',
        'Wifi': '📶'
      };

      const amenitiesHtml = (r.amenities || []).map(a => `
        <div class="cust-amenity-item">
          <span class="cust-amenity-icon">${amenityIcons[a] || '✨'}</span>
          <span>${a}</span>
        </div>
      `).join('');

      return `
        <div class="cust-room-card">
          <!-- Collage Container (Left) -->
          <div class="cust-collage-container">
            <div class="cust-collage-main">
              <img src="${mainImage}" alt="${r.room_name} main" />
            </div>
            <div class="cust-collage-subs">
              <div class="cust-collage-sub">
                <img src="${subImage1}" alt="${r.room_name} sub 1" />
              </div>
              <div class="cust-collage-sub">
                <img src="${subImage2}" alt="${r.room_name} sub 2" />
              </div>
            </div>
          </div>
          
          <!-- Room Details (Right) -->
          <div class="cust-room-details">
            <div>
              <h2 class="cust-room-title">${r.emoji || '🏠'} ${r.room_name}</h2>
              <div class="cust-room-price">${trans.price_from} ${priceK}/3h</div>
              <div class="cust-room-amenities">
                ${amenitiesHtml}
              </div>
            </div>
            <button class="cust-book-now-btn" onclick="CustomerController.openCustBookingModal('${r.room_id}')">${trans.book_now}</button>
          </div>
        </div>
      `;
    }).join('');
  },

  openCustBookingModal(r) {
    if (!r) return;

    const lang = document.getElementById('cust-lang-selector')?.value || 'vi';
    const trans = CUST_LANGS[lang];

    // Update modal text values dynamically
    document.getElementById('cust-modal-title-text').textContent = trans.booking_title;
    document.getElementById('cust-modal-room-name').textContent = r.room_name;
    document.getElementById('cust-modal-discount-promo').textContent = trans.discount_promo;
    document.getElementById('cust-modal-step-1-label').textContent = trans.step_1;
    document.getElementById('cust-modal-step-2-label').textContent = trans.step_2;
    document.getElementById('cust-modal-legend-booked').textContent = trans.legend_booked;
    document.getElementById('cust-modal-legend-free').textContent = trans.legend_free;
    document.getElementById('cust-modal-legend-selecting').textContent = trans.legend_selecting;
    document.getElementById('cust-modal-label-name').textContent = trans.label_name;
    document.getElementById('cust-modal-label-phone').textContent = trans.label_phone;
    document.getElementById('cust-modal-summary-slots-label').textContent = trans.summary_slots;
    document.getElementById('cust-modal-summary-discount-label').textContent = trans.summary_discount;
    document.getElementById('cust-modal-summary-total-label').textContent = trans.summary_total;
    document.getElementById('cust-modal-btn-back').textContent = trans.btn_back;
    document.getElementById('cust-modal-btn-submit').textContent = trans.btn_book;

    // Render carousel slide photos
    const slidesContainer = document.getElementById('cust-modal-slides');
    const dotsContainer = document.getElementById('cust-modal-dots');
    if (slidesContainer && dotsContainer) {
      const imgs = r.images && r.images.length > 0 ? r.images : ['images/room_1_main.png', 'images/room_1_bath.png', 'images/room_1_main.png'];
      slidesContainer.innerHTML = imgs.map(img => `
        <div class="cust-modal-slide" style="min-width:100%; height:100%; position:relative;">
          <img src="${img}" style="width:100%; height:100%; object-fit:cover; display:block;" onerror="this.src='images/room_1_main.png'" />
        </div>
      `).join('');

      dotsContainer.innerHTML = imgs.map((_, idx) => `
        <span class="cust-dot ${idx === 0 ? 'active' : ''}" onclick="CustomerController.goToSlide(${idx})"></span>
      `).join('');
    }

    // Price banner
    const banner = document.getElementById('cust-modal-price-banner');
    if (banner) {
      const minPrice = r.slot_prices ? Math.min(...Object.values(r.slot_prices)) : (r.hourly_price_day || 239000);
      banner.textContent = `${trans.price_from.toUpperCase()} ${UTIL.fmtPrice(minPrice)}/3H`;
    }

    // Setup date picker carousel
    const datesContainer = document.getElementById('cust-modal-dates-container');
    if (datesContainer) {
      const dates = CustomerController.generateCustDates();
      datesContainer.innerHTML = dates.map((d, idx) => `
        <button type="button" class="cust-date-btn ${idx === 0 ? 'active' : ''}" id="cust-date-btn-${d.dateStr}" onclick="CustomerController.selectCustDate('${d.dateStr}')">
          <div class="cust-date-header">${d.headerText}</div>
          <div class="cust-date-body">${d.bodyText}</div>
        </button>
      `).join('');
    }

    this.renderCustSlots();

    // Reset fields & checklist
    document.getElementById('cust-book-name').value = '';
    document.getElementById('cust-book-phone').value = '';
    this.updateCustSummary();

    document.getElementById('cust-booking-modal').classList.remove('hidden');
  },

  closeCustBookingModal() {
    document.getElementById('cust-booking-modal').classList.add('hidden');
  },

  selectCustDate(dateStr) {
    document.querySelectorAll('.cust-date-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`cust-date-btn-${dateStr}`)?.classList.add('active');

    this.renderCustSlots();
    this.updateCustSummary();
  },

  renderCustSlots() {
    const grid = document.getElementById('cust-modal-slots-grid');
    if (!grid || !activeCustRoom) return;

    grid.innerHTML = DOZY_SLOTS.map(slot => {
      const isBooked = CustomerController.isSlotBooked(activeCustRoom.room_id, activeCustDate, slot.id);
      const isSelected = selectedCustSlots.includes(slot.id);
      const price = (activeCustRoom.slot_prices && activeCustRoom.slot_prices[slot.id]) 
        || (slot.type === 'day' ? activeCustRoom.hourly_price_day : activeCustRoom.hourly_price_night);

      let cls = 'available';
      let disabledAttr = '';
      if (isBooked) {
        cls = 'booked';
        disabledAttr = 'disabled';
      } else if (isSelected) {
        cls = 'selected';
      }

      return `
        <button type="button" class="cust-slot-btn ${cls}" ${disabledAttr} onclick="CustomerController.toggleCustSlot('${slot.id}')">
          <div class="cust-slot-time">${slot.label}</div>
          <div class="cust-slot-price">${UTIL.fmtPrice(price)}</div>
        </button>
      `;
    }).join('');
  },

  updateCustSummary() {
    if (!activeCustRoom) return;

    const lang = document.getElementById('cust-lang-selector')?.value || 'vi';
    const trans = CUST_LANGS[lang];

    const count = selectedCustSlots.length;
    let subtotal = 0;

    selectedCustSlots.forEach(slotId => {
      const slot = DOZY_SLOTS.find(s => s.id === slotId);
      if (slot) {
        subtotal += (activeCustRoom.slot_prices && activeCustRoom.slot_prices[slotId])
          || (slot.type === 'day' ? activeCustRoom.hourly_price_day : activeCustRoom.hourly_price_night);
      }
    });

    const discount = count >= 2 ? Math.round(subtotal * 0.1) : 0;
    const total = subtotal - discount;

    document.getElementById('cust-summary-slots-count').textContent = `${count} ${trans.summary_slots_unit}`;
    document.getElementById('cust-summary-discount').textContent = `-${UTIL.fmtPrice(discount)}`;
    document.getElementById('cust-summary-total').textContent = UTIL.fmtPrice(total);
  },

  updateCarouselUI() {
    const container = document.getElementById('cust-modal-slides');
    if (!container) return;
    container.style.transform = `translateX(-${currentSlideIndex * 100}%)`;

    const dots = document.querySelectorAll('#cust-modal-dots .cust-dot');
    dots.forEach((dot, idx) => {
      if (idx === currentSlideIndex) dot.classList.add('active');
      else dot.classList.remove('active');
    });
  }
};

window.CustomerView = CustomerView;
