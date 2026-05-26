/**
 * Bliss Homestay Booking Client App Controller
 * Connects UI elements, calls API endpoints, handles bookings and simulates AI chatbot widget.
 */

// App State
const state = {
  rooms: [],
  selectedRoom: null,
  activeBranchFilter: 'all',
  checkInDate: '',
  checkOutDate: '',
  activeCarouselIndex: 0,
  carouselImages: []
};

// Simulated Chatbot Memory
const chatMemory = {
  state: 'IDLE',
  context: {},
  messages: []
};

// Document Elements
const elements = {
  roomsGrid: document.getElementById('rooms-grid'),
  roomsLoader: document.getElementById('rooms-loader'),
  roomsError: document.getElementById('rooms-error'),
  roomsErrorMsg: document.getElementById('rooms-error-msg'),
  
  // Search Fields
  branchSelect: document.getElementById('branch-select'),
  checkinDateInput: document.getElementById('checkin-date'),
  checkoutDateInput: document.getElementById('checkout-date'),
  guestCountSelect: document.getElementById('guest-count'),
  searchDatesInfo: document.getElementById('search-dates-info'),
  searchBtn: document.getElementById('search-btn'),
  
  // Filter Chips
  filterChips: document.querySelectorAll('.chip-filter'),
  
  // Slide-out panel
  detailPanel: document.getElementById('room-detail-panel'),
  panelBackdrop: document.getElementById('panel-backdrop'),
  panelCloseBtn: document.getElementById('panel-close-btn'),
  panelRoomName: document.getElementById('panel-room-name'),
  panelCarouselSlides: document.getElementById('panel-carousel-slides'),
  panelIndicators: document.getElementById('carousel-indicators'),
  carouselPrevBtn: document.getElementById('carousel-prev-btn'),
  carouselNextBtn: document.getElementById('carousel-next-btn'),
  panelBranchName: document.getElementById('panel-branch-name'),
  panelCapacity: document.getElementById('panel-capacity'),
  panelStatusTag: document.getElementById('panel-status-tag'),
  panelDescription: document.getElementById('panel-description'),
  panelAmenities: document.getElementById('panel-amenities'),
  
  // Booking Form wizard
  bookingForm: document.getElementById('booking-form'),
  bookRoomId: document.getElementById('book-room-id'),
  bookCheckin: document.getElementById('book-checkin'),
  bookCheckout: document.getElementById('book-checkout'),
  bookGuests: document.getElementById('book-guests'),
  bookName: document.getElementById('book-name'),
  bookPhone: document.getElementById('book-phone'),
  bookSocial: document.getElementById('book-social'),
  bookRequests: document.getElementById('book-requests'),
  quoteDaysText: document.getElementById('quote-days-text'),
  quoteBasePrice: document.getElementById('quote-base-price'),
  quoteTotalPrice: document.getElementById('quote-total-price'),
  bookingErrorMsg: document.getElementById('booking-error-msg'),
  bookingSubmitBtn: document.getElementById('booking-submit-btn'),
  
  // Success Modal
  successModal: document.getElementById('success-modal'),
  successBookingId: document.getElementById('success-booking-id'),
  successGuestName: document.getElementById('success-guest-name'),
  successRoomBranch: document.getElementById('success-room-branch'),
  successDates: document.getElementById('success-dates'),
  successTotalPrice: document.getElementById('success-total-price'),
  successDoorPin: document.getElementById('success-door-pin'),
  successChatbotBtn: document.getElementById('success-chatbot-btn'),
  successCloseBtn: document.getElementById('success-close-btn'),
  btnCopyPin: document.getElementById('btn-copy-pin'),

  // Chatbot Widget
  chatbotFab: document.getElementById('chatbot-fab'),
  chatbotWindow: document.getElementById('chatbot-window'),
  chatWinClose: document.getElementById('chat-win-close'),
  chatWinMessages: document.getElementById('chat-win-messages'),
  chatWinInput: document.getElementById('chat-win-input'),
  chatWinSend: document.getElementById('chat-win-send'),
  chatChipsContainer: document.getElementById('chat-quick-chips')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initDateFilters();
  initEventListeners();
  initChatbotWidget();
  fetchRooms();
});

// 1. Initialize Date Selectors
function initDateFilters() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 2); // default stay is 2 nights

  // Format dates: YYYY-MM-DD
  const tomorrowStr = formatDateISO(tomorrow);
  const dayAfterStr = formatDateISO(dayAfter);

  state.checkInDate = tomorrowStr;
  state.checkOutDate = dayAfterStr;

  // Set minimum dates to prevent past date selections
  elements.checkinDateInput.min = formatDateISO(today);
  elements.checkinDateInput.value = tomorrowStr;
  
  elements.checkoutDateInput.min = tomorrowStr;
  elements.checkoutDateInput.value = dayAfterStr;

  elements.bookCheckin.min = formatDateISO(today);
  elements.bookCheckout.min = tomorrowStr;

  updateSearchDatesLabel();
}

// Helper: Format Date object to YYYY-MM-DD
function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Helper: Format Date string for visual layout: DD/MM/YYYY
function formatDateVisual(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// Helper: Format price to Vietnamese Dong (VND) currency
function formatCurrency(val) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
}

// 2. Initialize Event Listeners
function initEventListeners() {
  // Search Action
  elements.searchBtn.addEventListener('click', () => {
    state.checkInDate = elements.checkinDateInput.value;
    state.checkOutDate = elements.checkoutDateInput.value;
    state.activeBranchFilter = elements.branchSelect.value;
    
    // Sync chip filter visuals
    elements.filterChips.forEach(chip => {
      if (chip.getAttribute('data-branch') === state.activeBranchFilter) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });

    updateSearchDatesLabel();
    renderRooms();
    
    // Scroll to rooms section
    document.getElementById('rooms-section').scrollIntoView({ behavior: 'smooth' });
  });

  // Check-in check-out interaction to keep checkout after checkin
  elements.checkinDateInput.addEventListener('change', () => {
    const ciVal = elements.checkinDateInput.value;
    const checkoutMin = new Date(ciVal);
    checkoutMin.setDate(checkoutMin.getDate() + 1);
    elements.checkoutDateInput.min = formatDateISO(checkoutMin);
    
    if (elements.checkoutDateInput.value <= ciVal) {
      elements.checkoutDateInput.value = formatDateISO(checkoutMin);
    }
    updateSearchDatesLabel();
  });

  elements.checkoutDateInput.addEventListener('change', updateSearchDatesLabel);

  // Branch chip selectors
  elements.filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      elements.filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      
      state.activeBranchFilter = chip.getAttribute('data-branch');
      elements.branchSelect.value = state.activeBranchFilter; // Sync search selector
      
      renderRooms();
    });
  });

  // Slide-out panel close trigger
  elements.panelCloseBtn.addEventListener('click', closeRoomPanel);
  elements.panelBackdrop.addEventListener('click', closeRoomPanel);

  // Date updates inside booking wizard triggers recalculating pricing
  elements.bookCheckin.addEventListener('change', () => {
    const ciVal = elements.bookCheckin.value;
    const checkoutMin = new Date(ciVal);
    checkoutMin.setDate(checkoutMin.getDate() + 1);
    elements.bookCheckout.min = formatDateISO(checkoutMin);
    
    if (elements.bookCheckout.value <= ciVal) {
      elements.bookCheckout.value = formatDateISO(checkoutMin);
    }
    calculatePricing();
  });
  elements.bookCheckout.addEventListener('change', calculatePricing);
  elements.bookGuests.addEventListener('input', calculatePricing);

  // Photo gallery carousel arrow navigation
  elements.carouselPrevBtn.addEventListener('click', () => navigateCarousel(-1));
  elements.carouselNextBtn.addEventListener('click', () => navigateCarousel(1));

  // Success screen close trigger
  elements.successCloseBtn.addEventListener('click', closeSuccessModal);

  // Copy PIN code trigger
  elements.btnCopyPin.addEventListener('click', () => {
    const pinText = elements.successDoorPin.textContent;
    navigator.clipboard.writeText(pinText).then(() => {
      elements.btnCopyPin.textContent = '✅ Copied!';
      setTimeout(() => {
        elements.btnCopyPin.textContent = '📋 Copy';
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy PIN code:', err);
    });
  });

  // Mobile menu toggle (simple log for template completion)
  const mobileNavToggle = document.querySelector('.mobile-nav-toggle');
  if (mobileNavToggle) {
    mobileNavToggle.addEventListener('click', () => {
      const navLinks = document.querySelector('.nav-links');
      if (navLinks) {
        navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
        navLinks.style.flexDirection = 'column';
        navLinks.style.position = 'absolute';
        navLinks.style.top = '100%';
        navLinks.style.left = '0';
        navLinks.style.right = '0';
        navLinks.style.background = 'rgba(253, 251, 247, 0.95)';
        navLinks.style.padding = '1.5rem';
        navLinks.style.boxShadow = 'var(--shadow-md)';
        navLinks.style.backdropFilter = 'blur(10px)';
      }
    });
  }
}

// 3. Update descriptive text below search bar
function updateSearchDatesLabel() {
  const ci = elements.checkinDateInput.value;
  const co = elements.checkoutDateInput.value;
  
  if (ci && co) {
    const date1 = new Date(ci);
    const date2 = new Date(co);
    const timeDiff = Math.abs(date2.getTime() - date1.getTime());
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    elements.searchDatesInfo.textContent = `Nghỉ dưỡng trong ${daysDiff} đêm (${formatDateVisual(ci)} đến ${formatDateVisual(co)})`;
  }
}

// 4. Fetch Rooms list from Express API endpoint
async function fetchRooms() {
  elements.roomsLoader.classList.remove('hidden');
  elements.roomsGrid.classList.add('hidden');
  elements.roomsError.classList.add('hidden');

  try {
    const res = await fetch('/backend/api/rooms');
    const result = await res.json();

    if (result.success && Array.isArray(result.data)) {
      // Store all active rooms
      state.rooms = result.data.filter(r => r.status === 'active');
      renderRooms();
    } else {
      throw new Error(result.message || 'Lỗi dữ liệu từ máy chủ API.');
    }
  } catch (error) {
    console.error('[ClientApp] Error fetching rooms:', error.message);
    elements.roomsErrorMsg.textContent = `Không thể kết nối đến máy chủ: ${error.message}`;
    elements.roomsError.classList.remove('hidden');
  } finally {
    elements.roomsLoader.classList.add('hidden');
  }
}

// 5. Render room list cards to Grid
function renderRooms() {
  elements.roomsGrid.innerHTML = '';
  
  // Filter by branch
  let filteredRooms = state.rooms;
  if (state.activeBranchFilter !== 'all') {
    filteredRooms = state.rooms.filter(room => room.branch === state.activeBranchFilter);
  }

  // Handle empty state
  if (filteredRooms.length === 0) {
    elements.roomsGrid.innerHTML = `
      <div class="glass-card" style="grid-column: 1/-1; padding: 3rem; text-align: center;">
        <span style="font-size: 2.5rem;">🛌</span>
        <h3 style="margin-top: 1rem; color: var(--primary-dark)">Không tìm thấy phòng trống</h3>
        <p style="color: var(--text-muted); font-size: 0.9rem; margin-top: 0.5rem;">Không có phòng nào đang hoạt động tại chi nhánh này trong khoảng thời gian đã chọn.</p>
      </div>
    `;
    elements.roomsGrid.classList.remove('hidden');
    return;
  }

  filteredRooms.forEach(room => {
    // Process images link arrays
    let imageUrl = 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80'; // fallback
    let imgArray = [];
    if (Array.isArray(room.images)) {
      imgArray = room.images;
    } else if (typeof room.images === 'string' && room.images) {
      imgArray = room.images.split(',').map(s => s.trim());
    }

    if (imgArray.length > 0) {
      const firstImg = imgArray[0];
      if (firstImg.startsWith('http')) {
        imageUrl = firstImg;
      } else if (firstImg.startsWith('/')) {
        // local absolute fallback
        imageUrl = '/frontend/' + firstImg.replace(/^\//, '');
      } else if (firstImg) {
        // direct filename fallback from images folder
        imageUrl = `/images/${firstImg}`;
      }
    }

    // Process amenities
    let amenitiesList = [];
    if (Array.isArray(room.amenities)) {
      amenitiesList = room.amenities.slice(0, 3);
    } else if (typeof room.amenities === 'string' && room.amenities) {
      amenitiesList = room.amenities.split(',').map(s => s.trim()).slice(0, 3);
    }

    const card = document.createElement('div');
    card.className = 'room-card glass-card';
    card.innerHTML = `
      <div class="room-image-wrap">
        <img src="${imageUrl}" alt="${room.room_name}" onerror="this.src='https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80'">
        <div class="room-badges">
          <span class="badge badge-branch">📍 ${room.branch_name}</span>
          <span class="badge badge-empty">🟢 Còn Trống</span>
        </div>
        <div class="room-price-badge">
          Từ <span class="price">${formatCurrency(room.base_price_weekday)}</span> / đêm
        </div>
      </div>
      <div class="room-content">
        <div class="room-title-row">
          <span class="room-emoji">${room.emoji || '🏠'}</span>
          <h3 class="room-name">${room.room_name}</h3>
        </div>
        <div class="room-address-row" style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 4px;">
          <span>📍</span> <span>${room.address || 'Địa chỉ đang cập nhật'}</span>
        </div>
        <p class="room-desc">${room.description || 'Không gian nghỉ ngơi thư giãn ấm cúng và đầy đủ tiện nghi thiết thực.'}</p>
        
        <div class="room-amenities-row">
          ${amenitiesList.map(a => `<span class="amenity-tag">${a}</span>`).join('')}
          ${amenitiesList.length > 0 ? '' : '<span class="amenity-tag">🌿 View đẹp</span>'}
        </div>

        <div class="room-footer">
          <span class="room-capacity">👤 Sức chứa: ${room.capacity} khách</span>
          <button class="btn btn-primary btn-sm btn-open-panel" data-id="${room.room_id}">Xem Chi Tiết</button>
        </div>
      </div>
    `;

    // Bind event handler for button click
    card.querySelector('.btn-open-panel').addEventListener('click', () => {
      openRoomPanel(room);
    });

    elements.roomsGrid.appendChild(card);
  });

  elements.roomsGrid.classList.remove('hidden');
}

// 6. Open Slide-out Details Panel
function openRoomPanel(room) {
  state.selectedRoom = room;
  
  elements.panelRoomName.textContent = room.room_name;
  elements.panelBranchName.innerHTML = `📍 ${room.branch_name} <br><small style="color: var(--text-muted); font-weight: normal; font-size: 0.8rem;">${room.address || 'Địa chỉ đang cập nhật'}</small>`;
  elements.panelCapacity.textContent = `👥 Tối đa ${room.capacity} khách`;
  elements.panelDescription.textContent = room.description || 'Không gian được decor chỉn chu theo phong cách tối giản mộc mạc, tạo cảm giác thư giãn gần gũi nhất cho du khách.';
  
  // Set values inside wizard form
  elements.bookRoomId.value = room.room_id;
  elements.bookCheckin.value = state.checkInDate || elements.checkinDateInput.value;
  elements.bookCheckout.value = state.checkOutDate || elements.checkoutDateInput.value;
  elements.bookGuests.value = elements.guestCountSelect.value;
  
  let amenities = [];
  if (Array.isArray(room.amenities)) {
    amenities = room.amenities;
  } else if (typeof room.amenities === 'string' && room.amenities) {
    amenities = room.amenities.split(',').map(s => s.trim());
  }

  if (amenities.length > 0) {
    amenities.forEach(a => {
      const item = document.createElement('div');
      item.className = 'panel-amenity-item';
      item.innerHTML = `<span>✨</span> <span>${a}</span>`;
      elements.panelAmenities.appendChild(item);
    });
  } else {
    elements.panelAmenities.innerHTML = `
      <div class="panel-amenity-item"><span>📶</span> <span>WiFi miễn phí</span></div>
      <div class="panel-amenity-item"><span>🍳</span> <span>Bếp tự nấu</span></div>
      <div class="panel-amenity-item"><span>🛁</span> <span>Bồn tắm</span></div>
    `;
  }

  // Parse images gallery list
  elements.panelCarouselSlides.innerHTML = '';
  elements.panelIndicators.innerHTML = '';
  state.activeCarouselIndex = 0;
  
  let imageFiles = [];
  if (Array.isArray(room.images)) {
    imageFiles = room.images;
  } else if (typeof room.images === 'string' && room.images) {
    imageFiles = room.images.split(',').map(s => s.trim());
  }

  // Build clean images array
  state.carouselImages = [];
  imageFiles.forEach(img => {
    if (img.startsWith('http')) {
      state.carouselImages.push(img);
    } else if (img.startsWith('/')) {
      state.carouselImages.push('/frontend/' + img.replace(/^\//, ''));
    } else if (img) {
      state.carouselImages.push(`/images/${img}`);
    }
  });

  // Fallbacks if no image exists
  if (state.carouselImages.length === 0) {
    state.carouselImages.push('https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80');
  }

  // Render carousel slides
  state.carouselImages.forEach((imgSrc, idx) => {
    const slide = document.createElement('div');
    slide.className = 'carousel-slide';
    slide.innerHTML = `<img src="${imgSrc}" alt="${room.room_name}" onerror="this.src='https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80'">`;
    elements.panelCarouselSlides.appendChild(slide);

    const dot = document.createElement('div');
    dot.className = `carousel-dot ${idx === 0 ? 'active' : ''}`;
    dot.addEventListener('click', () => setCarouselIndex(idx));
    elements.panelIndicators.appendChild(dot);
  });

  updateCarouselPosition();

  // Highlight active radio social card selector
  const radioCards = document.querySelectorAll('.social-radio-card');
  radioCards.forEach(card => {
    const radio = card.querySelector('input');
    radio.addEventListener('change', () => {
      radioCards.forEach(c => c.classList.remove('active'));
      if (radio.checked) card.classList.add('active');
    });
  });

  // Reset form messages
  elements.bookingErrorMsg.classList.add('hidden');
  elements.bookingSubmitBtn.disabled = false;
  elements.bookingSubmitBtn.textContent = '⚡ Xác Nhận Đặt Phòng & Lấy PIN Cửa';

  calculatePricing();

  // Slide open panel visual triggers
  elements.detailPanel.classList.add('open');
  elements.panelBackdrop.classList.add('open');
  document.body.style.overflow = 'hidden'; // Lock body scroll
}

// 7. Close Details Panel
function closeRoomPanel() {
  elements.detailPanel.classList.remove('open');
  elements.panelBackdrop.classList.remove('open');
  document.body.style.overflow = ''; // Unlock scroll
  state.selectedRoom = null;
}

// 8. Carousel Logic
function navigateCarousel(direction) {
  let newIdx = state.activeCarouselIndex + direction;
  if (newIdx < 0) newIdx = state.carouselImages.length - 1;
  if (newIdx >= state.carouselImages.length) newIdx = 0;
  setCarouselIndex(newIdx);
}

function setCarouselIndex(idx) {
  state.activeCarouselIndex = idx;
  updateCarouselPosition();
}

function updateCarouselPosition() {
  const offset = -state.activeCarouselIndex * 100;
  elements.panelCarouselSlides.style.transform = `translateX(${offset}%)`;
  
  // Update indicator dots
  const dots = elements.panelIndicators.querySelectorAll('.carousel-dot');
  dots.forEach((dot, idx) => {
    if (idx === state.activeCarouselIndex) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  });
}

// 9. Calculate pricing breakdown based on weekday vs weekend
function calculatePricing() {
  if (!state.selectedRoom) return;

  const room = state.selectedRoom;
  const ciStr = elements.bookCheckin.value;
  const coStr = elements.bookCheckout.value;

  if (!ciStr || !coStr) return;

  const ci = new Date(ciStr);
  const co = new Date(coStr);

  if (co <= ci) {
    elements.quoteDaysText.textContent = 'Lỗi chọn ngày';
    elements.quoteBasePrice.textContent = '—';
    elements.quoteTotalPrice.textContent = '—';
    return;
  }

  // Count weekdays vs weekends
  let weekdaysCount = 0;
  let weekendsCount = 0;

  for (let d = new Date(ci); d < co; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day === 0 || day === 6) { // 0: Sunday, 6: Saturday
      weekendsCount++;
    } else {
      weekdaysCount++;
    }
  }

  const totalNights = weekdaysCount + weekendsCount;
  const priceWeekdayTotal = weekdaysCount * room.base_price_weekday;
  const priceWeekendTotal = weekendsCount * room.base_price_weekend;
  const finalPrice = priceWeekdayTotal + priceWeekendTotal;

  elements.quoteDaysText.textContent = `Giá phòng (${totalNights} đêm: ${weekdaysCount} thường, ${weekendsCount} cuối tuần)`;
  
  let baseDetails = '';
  if (weekdaysCount > 0 && weekendsCount > 0) {
    baseDetails = `${weekdaysCount}x ${formatCurrency(room.base_price_weekday)} + ${weekendsCount}x ${formatCurrency(room.base_price_weekend)}`;
  } else if (weekdaysCount > 0) {
    baseDetails = `${totalNights}x ${formatCurrency(room.base_price_weekday)}`;
  } else {
    baseDetails = `${totalNights}x ${formatCurrency(room.base_price_weekend)}`;
  }
  
  elements.quoteBasePrice.textContent = baseDetails;
  elements.quoteTotalPrice.textContent = formatCurrency(finalPrice);
  
  // Save computed price for submit
  state.selectedRoom.computedPrice = finalPrice;
}

// 10. Handle Booking Form Submission
async function submitBooking(event) {
  event.preventDefault();
  
  const room = state.selectedRoom;
  if (!room) return;

  const name = elements.bookName.value.trim();
  const phone = elements.bookPhone.value.trim();
  const socialId = elements.bookSocial.value.trim();
  const source = document.querySelector('input[name="book-source"]:checked').value;
  const checkIn = elements.bookCheckin.value;
  const checkOut = elements.bookCheckout.value;
  const numGuests = parseInt(elements.bookGuests.value);

  // Form validations
  if (!name || !phone) {
    showBookingError('Vui lòng điền đầy đủ họ tên và số điện thoại liên lạc.');
    return;
  }

  // Simple Vietnamese phone number validation check
  const vnPhoneRegex = /(0[3|5|7|8|9])+([0-9]{8})\b/;
  if (!vnPhoneRegex.test(phone)) {
    showBookingError('Số điện thoại không hợp lệ. Vui lòng nhập số điện thoại Việt Nam (10 chữ số).');
    return;
  }

  elements.bookingErrorMsg.classList.add('hidden');
  elements.bookingSubmitBtn.disabled = true;
  elements.bookingSubmitBtn.textContent = '⏳ Đang đặt chỗ & ghi khóa khóa...';

  // Request Payload
  const payload = {
    customer_name: name,
    customer_phone: phone,
    customer_social_id: socialId || phone, // fallback to phone if blank
    branch: room.branch,
    room_id: room.room_id,
    check_in_date: checkIn,
    check_out_date: checkOut,
    num_guests: numGuests,
    total_price: room.computedPrice,
    special_requests: elements.bookRequests.value.trim(),
    source: source // 'facebook', 'telegram', 'whatsapp'
  };

  try {
    const res = await fetch('/backend/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (res.status === 201 && result.success && result.data) {
      const newBooking = result.data;
      
      // Close Details Panel
      closeRoomPanel();
      
      // Open Success Screen
      openSuccessModal(newBooking);
    } else {
      throw new Error(result.message || 'Mất kết nối hoặc ngày đặt phòng bị trùng. Vui lòng thử lại.');
    }
  } catch (err) {
    console.error('[ClientApp] Booking error:', err.message);
    showBookingError(`Đặt phòng thất bại: ${err.message}`);
    elements.bookingSubmitBtn.disabled = false;
    elements.bookingSubmitBtn.textContent = '⚡ Xác Nhận Đặt Phòng & Lấy PIN Cửa';
  }
}

function showBookingError(msg) {
  elements.bookingErrorMsg.textContent = msg;
  elements.bookingErrorMsg.classList.remove('hidden');
  elements.bookingErrorMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 11. Success Modal actions
function openSuccessModal(booking) {
  elements.successBookingId.textContent = booking.booking_id;
  elements.successGuestName.textContent = booking.customer_name;
  elements.successRoomBranch.textContent = `${booking.room_name} / ${booking.branch_name}`;
  elements.successDates.textContent = `${formatDateVisual(booking.check_in_date)} đến ${formatDateVisual(booking.check_out_date)}`;
  elements.successTotalPrice.textContent = formatCurrency(booking.total_price);
  
  // Door code generation: mock custom secure matching design
  const doorCode = '6789##'; // Mock code that backend triggers on checked_in
  elements.successDoorPin.textContent = doorCode;

  // Custom link mapping for Messenger / Telegram / WhatsApp
  let chatLink = 'https://t.me/BlissHomestayBot';
  let chatLabel = 'Kết Nối Telegram Chatbot Nhận Hướng Dẫn';
  
  if (booking.source === 'facebook') {
    chatLink = `https://m.me/BlissHomestay?ref=booking_${booking.booking_id}`;
    chatLabel = 'Mở Facebook Messenger để kết nối hướng dẫn 💬';
  } else if (booking.source === 'whatsapp') {
    chatLink = `https://wa.me/84909876543?text=Kích%20hoạt%20booking%20${booking.booking_id}`;
    chatLabel = 'Mở WhatsApp nhận sơ đồ nhận phòng 📞';
  } else {
    chatLink = `https://t.me/BlissHomestayBot?start=booking_${booking.booking_id}`;
    chatLabel = 'Mở Telegram nhận mã cửa & hướng dẫn ✈️';
  }

  elements.successChatbotBtn.href = chatLink;
  elements.successChatbotBtn.textContent = chatLabel;

  elements.successModal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeSuccessModal() {
  elements.successModal.classList.add('hidden');
  document.body.style.overflow = '';
  // Reset form fields
  elements.bookingForm.reset();
  fetchRooms(); // Refresh room status
}

// 12. Boutique Chatbot Widget logic
function initChatbotWidget() {
  // FAB Toggle
  elements.chatbotFab.addEventListener('click', () => {
    elements.chatbotWindow.classList.toggle('hidden');
    // Remove pulse badge on first open
    const badge = elements.chatbotFab.querySelector('.fab-badge');
    if (badge) badge.remove();
    
    // Auto focus input
    if (!elements.chatbotWindow.classList.contains('hidden')) {
      elements.chatWinInput.focus();
      // Scroll messages to bottom
      elements.chatWinMessages.scrollTop = elements.chatWinMessages.scrollHeight;
    }
  });

  // Close window
  elements.chatWinClose.addEventListener('click', () => {
    elements.chatbotWindow.classList.add('hidden');
  });

  // Send message on click
  elements.chatWinSend.addEventListener('click', handleChatSubmit);

  // Send message on Enter keypress
  elements.chatWinInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleChatSubmit();
    }
  });

  // Click quick actions chips
  const chips = elements.chatChipsContainer.querySelectorAll('.chat-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const msg = chip.getAttribute('data-msg');
      sendUserMessage(msg);
    });
  });

  // Add initial bot greeting
  appendChatMessage('bot', 'Xin chào quý khách! 🌿 Mình là trợ lý ảo Bliss Homestay. Mình có thể hỗ trợ tìm phòng trống, giải đáp chính sách hoàn tiền, WiFi, hướng dẫn đỗ xe, gửi mã PIN mở cửa tự động...');
}

function handleChatSubmit() {
  const text = elements.chatWinInput.value.trim();
  if (!text) return;
  
  elements.chatWinInput.value = '';
  sendUserMessage(text);
}

function sendUserMessage(text) {
  appendChatMessage('user', text);
  
  // Show typing loader bubble
  const loaderId = appendTypingIndicator();
  
  // Simulate network API delay & Vietnamese offline NLP check
  setTimeout(() => {
    removeTypingIndicator(loaderId);
    const botReply = generateSimulatedResponse(text);
    appendChatMessage('bot', botReply);
  }, 1000 + Math.random() * 800);
}

function appendChatMessage(sender, text) {
  const bubble = document.createElement('div');
  bubble.className = `chat-msg ${sender}`;
  bubble.innerHTML = text.replace(/\n/g, '<br>');
  elements.chatWinMessages.appendChild(bubble);
  
  // Scroll to bottom
  elements.chatWinMessages.scrollTop = elements.chatWinMessages.scrollHeight;
  return bubble;
}

function appendTypingIndicator() {
  const loaderId = 'loader_' + Date.now();
  const bubble = document.createElement('div');
  bubble.id = loaderId;
  bubble.className = 'chat-msg bot';
  bubble.style.display = 'flex';
  bubble.style.gap = '4px';
  bubble.innerHTML = `
    <span style="animation: bounce 1.4s infinite ease-in-out both; width:6px; height:6px; background:#2d6a4f; border-radius:50%; display:inline-block;"></span>
    <span style="animation: bounce 1.4s infinite ease-in-out both 0.2s; width:6px; height:6px; background:#2d6a4f; border-radius:50%; display:inline-block;"></span>
    <span style="animation: bounce 1.4s infinite ease-in-out both 0.4s; width:6px; height:6px; background:#2d6a4f; border-radius:50%; display:inline-block;"></span>
  `;
  
  // Add CSS style inline for bounce animation if not present
  if (!document.getElementById('bounce-animation-style')) {
    const style = document.createElement('style');
    style.id = 'bounce-animation-style';
    style.innerHTML = `
      @keyframes bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1.0); }
      }
    `;
    document.head.appendChild(style);
  }
  
  elements.chatWinMessages.appendChild(bubble);
  elements.chatWinMessages.scrollTop = elements.chatWinMessages.scrollHeight;
  return loaderId;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// 13. Simulated Vietnamese NLP Bot Brain
function generateSimulatedResponse(text) {
  const cleanText = text.toLowerCase();
  
  // Intent: WiFi
  if (cleanText.includes('wifi') || cleanText.includes('mạng') || cleanText.includes('pass')) {
    return `📶 **Thông tin WiFi tại các chi nhánh Bliss Homestay:**\n` +
      `- Tên WiFi: **BlissHome**\n` +
      `- Mật khẩu: **bliss2024**\n\n` +
      `Mạng băng thông rộng tốc độ cao, hỗ trợ làm việc từ xa ổn định cho quý khách ở mọi góc trong căn nhà.`;
  }

  // Intent: Check-in instructions & PIN Door Lock
  if (cleanText.includes('mã cửa') || cleanText.includes('pin') || cleanText.includes('nhận phòng') || cleanText.includes('check-in') || cleanText.includes('check in')) {
    // Regex search for booking code (e.g. BL001)
    const bookingMatch = cleanText.match(/bl\d{3,10}/);
    if (bookingMatch) {
      const code = bookingMatch[0].toUpperCase();
      return `🔍 **Đã tìm thấy booking ${code} trên hệ thống Google Sheets!**\n\n` +
        `🔑 **Thông tin nhận phòng tự động của bạn:**\n` +
        `- Chi nhánh: **Saigon (TP.HCM)**\n` +
        `- Mã khóa PIN cửa chính: **6789##**\n` +
        `- Thời gian có hiệu lực: 14h00 ngày check-in.\n\n` +
        `Chúc bạn có chuyến nghỉ dưỡng tuyệt vời tại Bliss Homestay! 😊`;
    }
    
    return `🔑 **Quy trình nhận phòng tự động (Self Check-in):**\n\n` +
      `1. Hệ thống sẽ tự động tạo mã PIN khóa số duy nhất khi booking được xác nhận.\n` +
      `2. Mã PIN sẽ được kích hoạt vào 14h00 ngày bạn check-in.\n\n` +
      `👉 *Nếu bạn đã đặt phòng, vui lòng nhắn kèm **Mã Đặt Phòng (ví dụ: BL001)** để trợ lý lấy nhanh mã PIN cửa giúp bạn nhé!*`;
  }

  // Intent: Room search CS1
  if (cleanText.includes('tân bình') || cleanText.includes('cs1')) {
    const cs1Rooms = state.rooms.filter(r => r.branch === 'cs1');
    if (cs1Rooms.length > 0) {
      let list = cs1Rooms.map((r, i) => `${i+1}. ${r.emoji || '🏠'} **${r.room_name}** - Giá: ${formatCurrency(r.base_price_weekday)}/đêm`).join('\n');
      return `🏡 **Chi nhánh Tân Bình (CS1) hiện đang sẵn sàng:**\n\n` +
        `${list}\n\n` +
        `Bạn có muốn xem chi tiết và đặt phòng trực tiếp trên website này không ạ?`;
    }
    return `🏡 Chi nhánh Tân Bình (CS1) hiện tại đã kín lịch. Quý khách vui lòng tham khảo các chi nhánh khác nhé!`;
  }

  // Intent: Room search CS2
  if (cleanText.includes('quận 10') || cleanText.includes('q10') || cleanText.includes('cs2')) {
    const cs2Rooms = state.rooms.filter(r => r.branch === 'cs2');
    if (cs2Rooms.length > 0) {
      let list = cs2Rooms.map((r, i) => `${i+1}. ${r.emoji || '🏠'} **${r.room_name}** - Giá: ${formatCurrency(r.base_price_weekday)}/đêm`).join('\n');
      return `☀️ **Chi nhánh Quận 10 (CS2) hiện đang trống:**\n\n` +
        `${list}\n\n` +
        `Quý khách có cần trợ giúp đặt phòng không ạ?`;
    }
    return `☀️ Chi nhánh Quận 10 (CS2) hiện tại đã hết phòng trống.`;
  }

  // Intent: Room search CS3
  if (cleanText.includes('quận 5') || cleanText.includes('q5') || cleanText.includes('cs3')) {
    const cs3Rooms = state.rooms.filter(r => r.branch === 'cs3');
    if (cs3Rooms.length > 0) {
      let list = cs3Rooms.map((r, i) => `${i+1}. ${r.emoji || '🏠'} **${r.room_name}** - Giá: ${formatCurrency(r.base_price_weekday)}/đêm`).join('\n');
      return `🌿 **Chi nhánh Quận 5 (CS3) mang phong cách vintage cổ kính:**\n\n` +
        `${list}\n\n` +
        `Quý khách có cần đặt chỗ ở chi nhánh Quận 5 này không ạ?`;
    }
    return `🌿 Chi nhánh Quận 5 (CS3) hiện đã kín lịch.`;
  }

  // Intent: Room search CS4
  if (cleanText.includes('gò vấp') || cleanText.includes('govap') || cleanText.includes('cs4')) {
    const cs4Rooms = state.rooms.filter(r => r.branch === 'cs4');
    if (cs4Rooms.length > 0) {
      let list = cs4Rooms.map((r, i) => `${i+1}. ${r.emoji || '🏠'} **${r.room_name}** - Giá: ${formatCurrency(r.base_price_weekday)}/đêm`).join('\n');
      return `🍃 **Chi nhánh Gò Vấp (CS4) có Loft áp mái ban công rộng rãi:**\n\n` +
        `${list}\n\n` +
        `Quý khách có muốn xem thêm chi tiết không ạ?`;
    }
    return `🍃 Chi nhánh Gò Vấp (CS4) hiện đã kín lịch.`;
  }

  // Intent: Room search CS5
  if (cleanText.includes('bình thạnh') || cleanText.includes('binh thanh') || cleanText.includes('cs5')) {
    const cs5Rooms = state.rooms.filter(r => r.branch === 'cs5');
    if (cs5Rooms.length > 0) {
      let list = cs5Rooms.map((r, i) => `${i+1}. ${r.emoji || '🏠'} **${r.room_name}** - Giá: ${formatCurrency(r.base_price_weekday)}/đêm`).join('\n');
      return `🌅 **Chi nhánh Bình Thạnh (CS5) view trực diện sông Sài Gòn:**\n\n` +
        `${list}\n\n` +
        `Quý khách cần hỗ trợ đặt phòng nào ở Bình Thạnh không ạ?`;
    }
    return `🌅 Chi nhánh Bình Thạnh (CS5) hiện đã kín lịch.`;
  }

  // Intent: Human staff handoff
  if (cleanText.includes('nhân viên') || cleanText.includes('gặp người') || cleanText.includes('tư vấn') || cleanText.includes('gọi') || cleanText.includes('sđt')) {
    return `💬 **Đang chuyển hướng yêu cầu hỗ trợ...**\n\n` +
      `Đã chuyển tiếp cuộc trò chuyện sang nhân viên CSKH Bliss Homestay. Nhân viên sẽ trả lời bạn trực tiếp hoặc liên hệ hotline trong ít phút nữa. Cảm ơn bạn đã kiên nhẫn!`;
  }

  // Intent: Help
  if (cleanText.includes('quán ăn') || cleanText.includes('chơi gì') || cleanText.includes('địa điểm') || cleanText.includes('ăn uống')) {
    return `🗺️ **Gợi ý món ăn ngon quanh các chi nhánh Bliss Homestay:**\n\n` +
      `- Tân Bình (CS1): Bún chả Xuân Hồng, bánh mì Huỳnh Hoa (gần đó), xôi gà ta.\n` +
      `- Quận 10 (CS2): Súp cua Hạnh, bánh mì ô môi Bà Huynh, trà đào hát nhạc sống.\n` +
      `- Quận 5 (CS3): Sủi cảo Hà Tôn Quyền, chè Tàu Hà Ký, hủ tiếu cả cần.\n` +
      `- Gò Vấp (CS4): Phá lấu bò bò, ốc nhớ Gò Vấp, lẩu ếch lá giang.\n` +
      `- Bình Thạnh (CS5): Ốc Khánh, bánh xèo Đinh Tiên Hoàng, cơm tấm Bụi.\n\n` +
      `*Bạn có thể bấm vào kênh Messenger hoặc Zalo chính thức để nhân viên gửi bạn bản đồ ẩm thực Google Maps chi tiết nhé!*`;
  }

  // Intent: Booking Inquiry generic
  if (cleanText.includes('đặt phòng') || cleanText.includes('phòng trống') || cleanText.includes('giá phòng') || cleanText.includes('còn phòng')) {
    return `📅 **Hỗ trợ tìm phòng trống:**\n\n` +
      `Quý khách có thể xem và đặt phòng trống thời gian thực trực tiếp qua lưới phòng trên trang web này.\n` +
      `Hoặc hãy cho trợ lý biết **Chi Nhánh** (Tân Bình/Quận 10/Quận 5/Gò Vấp/Bình Thạnh), **Ngày đến/đi**, và **Số lượng khách** để mình quét nhanh phòng trống giúp quý khách nhé!`;
  }

  // Default response
  return `🌿 **Trợ lý Bliss Homestay đã ghi nhận câu hỏi.**\n\n` +
    `Mình có thể trả lời nhanh các câu hỏi về thông tin WiFi, chính sách hoàn tiền 100% trước 7 ngày, bãi đỗ xe ô tô miễn phí tại chi nhánh, hoặc gửi mã PIN mở cửa tự động.\n\n` +
    `👉 *Quý khách cần hỗ trợ thêm thông tin gì ạ?*`;
}

// Global branch filter helper for footer links
window.filterBranch = function(branchKey) {
  state.activeBranchFilter = branchKey;
  elements.branchSelect.value = branchKey;
  
  elements.filterChips.forEach(chip => {
    if (chip.getAttribute('data-branch') === branchKey) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  });

  renderRooms();
  document.getElementById('rooms-section').scrollIntoView({ behavior: 'smooth' });
};
