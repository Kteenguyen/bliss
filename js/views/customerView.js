// ============================================================
// customerView.js — View component for customer booking UI
// ============================================================

const CustomerView = {
  render() {
    const branch = document.getElementById('cust-branch-filter')?.value || 'da_lat';
    const rooms = DB.getRoomsByBranch(branch).filter(r => r.status === 'active');
    const container = document.getElementById('cust-rooms-list');
    if (!container) return;

    if (rooms.length === 0) {
      container.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:3rem;">Chưa có phòng hoạt động tại chi nhánh này.</div>`;
      return;
    }

    container.innerHTML = rooms.map(r => {
      const mainImage = r.images[0] || 'images/room_1_main.png';
      const subImage1 = r.images[1] || 'images/room_1_bath.png';
      const subImage2 = r.images[2] || r.images[0] || 'images/room_1_main.png';

      const priceK = Math.round(r.hourly_price_day / 1000) + 'k';

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
              <div class="cust-room-price">Giá chỉ từ ${priceK}/3h</div>
              <div class="cust-room-amenities">
                ${amenitiesHtml}
              </div>
            </div>
            <button class="cust-book-now-btn" onclick="CustomerController.openCustBookingModal('${r.room_id}')">ĐẶT NGAY ➔</button>
          </div>
        </div>
      `;
    }).join('');
  },

  openCustBookingModal(r) {
    if (!r) return;

    // Update modal title
    document.getElementById('cust-modal-room-name').textContent = r.room_name;

    // Render carousel slide photos
    const slidesContainer = document.getElementById('cust-modal-slides');
    const dotsContainer = document.getElementById('cust-modal-dots');
    if (slidesContainer && dotsContainer) {
      const imgs = r.images && r.images.length > 0 ? r.images : ['images/room_1_main.png', 'images/room_1_bath.png', 'images/room_1_main.png'];
      slidesContainer.innerHTML = imgs.map(img => `
        <div class="cust-modal-slide" style="min-width:100%; height:100%; position:relative;">
          <img src="${img}" style="width:100%; height:100%; object-fit:cover; display:block;" />
        </div>
      `).join('');

      dotsContainer.innerHTML = imgs.map((_, idx) => `
        <span class="cust-dot ${idx === 0 ? 'active' : ''}" onclick="CustomerController.goToSlide(${idx})"></span>
      `).join('');
    }

    // Price banner
    const banner = document.getElementById('cust-modal-price-banner');
    if (banner) {
      banner.textContent = `GIÁ CHỈ TỪ ${UTIL.fmtPrice(r.hourly_price_day)}/3H`;
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
      const price = slot.type === 'day' ? activeCustRoom.hourly_price_day : activeCustRoom.hourly_price_night;

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

    const count = selectedCustSlots.length;
    let subtotal = 0;

    selectedCustSlots.forEach(slotId => {
      const slot = DOZY_SLOTS.find(s => s.id === slotId);
      if (slot) {
        subtotal += slot.type === 'day' ? activeCustRoom.hourly_price_day : activeCustRoom.hourly_price_night;
      }
    });

    const discount = count >= 2 ? Math.round(subtotal * 0.1) : 0;
    const total = subtotal - discount;

    document.getElementById('cust-summary-slots-count').textContent = `${count} khung`;
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
