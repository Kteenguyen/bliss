/**
 * BLISS BOUTIQUE CRM — BOOKINGS VIEW (bookingsView.js)
 * Manages booking registrations, status transitions (CI/CO triggers), and booking creations.
 */

export const bookingsView = {
  // Local filter states
  filter: {
    status: 'all',
    searchQuery: ''
  },

  /**
   * Render View Content
   */
  render(container, controller) {
    const { bookings, rooms } = controller.state;
    const fmtCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    // 1. Filter bookings
    let filteredBookings = [...bookings];

    if (this.filter.status !== 'all') {
      filteredBookings = filteredBookings.filter(b => b.checkin_status === this.filter.status);
    }
    if (this.filter.searchQuery.trim() !== '') {
      const q = this.filter.searchQuery.toLowerCase();
      filteredBookings = filteredBookings.filter(b => 
        b.customer_name.toLowerCase().includes(q) || 
        (b.customer_phone && b.customer_phone.includes(q)) || 
        b.booking_id.toLowerCase().includes(q) ||
        b.room_name.toLowerCase().includes(q)
      );
    }

    // 2. Render Page layout HTML
    container.innerHTML = `
      <div class="page-title-area animate-fade-in">
        <h1 class="page-title">📅 Đặt Phòng <span>Registry</span></h1>
        <p class="page-subtitle">Quản lý đặt phòng, cập nhật trạng thái check-in, check-out và kích hoạt mã cửa</p>
      </div>

      <!-- Filters & Toolbar -->
      <div class="glass-card toolbar-row animate-fade-in" style="animation-delay: 0.05s; padding: 1rem 1.5rem;">
        <div class="toolbar-filters">
          <!-- Search -->
          <div style="position: relative; width: 220px;">
            <input type="text" id="booking-search-input" class="form-input" style="padding-top: 0.5rem; padding-bottom: 0.5rem; font-size: 0.8rem;" placeholder="Tìm tên, SĐT, mã đặt..." value="${this.filter.searchQuery}">
          </div>

          <!-- Status Filter -->
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Trạng thái:</span>
            <select id="booking-status-filter" class="form-input" style="width: 140px; padding: 0.5rem; font-size: 0.8rem; height: 35px;">
              <option value="all" ${this.filter.status === 'all' ? 'selected' : ''}>Tất cả</option>
              <option value="confirmed" ${this.filter.status === 'confirmed' ? 'selected' : ''}>Xác nhận (Confirmed)</option>
              <option value="checked_in" ${this.filter.status === 'checked_in' ? 'selected' : ''}>Đang ở (Checked In)</option>
              <option value="checked_out" ${this.filter.status === 'checked_out' ? 'selected' : ''}>Đã trả (Checked Out)</option>
              <option value="cancelled" ${this.filter.status === 'cancelled' ? 'selected' : ''}>Đã hủy (Cancelled)</option>
            </select>
          </div>
        </div>

        <button class="btn btn-primary btn-sm" id="btn-add-booking-modal" style="height: 35px; border-radius: var(--radius-sm);">
          ➕ Tạo Booking Thủ Công
        </button>
      </div>

      <!-- Bookings Table Panel -->
      <div class="glass-card animate-fade-in" style="animation-delay: 0.1s; padding: 1rem;">
        <div class="table-responsive">
          <table class="crm-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Khách Hàng</th>
                <th>Phòng / Chi Nhánh</th>
                <th>Thời Gian Ở</th>
                <th>Giá Trị</th>
                <th>Nguồn</th>
                <th>Thanh Toán</th>
                <th>Nhận Phòng</th>
                <th style="text-align: center;">Thao Tác Hệ Thống</th>
              </tr>
            </thead>
            <tbody id="bookings-table-tbody">
              <!-- Injected dynamically below -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    // 3. Inject rows
    const tbody = document.getElementById('bookings-table-tbody');
    if (filteredBookings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">Không tìm thấy đặt phòng nào phù hợp bộ lọc.</td></tr>`;
    } else {
      tbody.innerHTML = filteredBookings.map(b => {
        // Payment status badge
        let payBadgeClass = 'badge-secondary';
        let payLabel = b.payment_status || 'Chờ thanh toán';
        if (b.payment_status === 'paid') { payBadgeClass = 'badge-success'; payLabel = 'Đã thanh toán'; }
        else if (b.payment_status === 'refunded') { payBadgeClass = 'badge-danger'; payLabel = 'Đã hoàn tiền'; }
        
        // Checkin status badge
        let ciBadgeClass = 'badge-info';
        let ciLabel = b.checkin_status || 'Đang chờ';
        if (b.checkin_status === 'checked_in') { ciBadgeClass = 'badge-info'; ciLabel = 'Đang ở'; }
        else if (b.checkin_status === 'checked_out') { ciBadgeClass = 'badge-success'; ciLabel = 'Đã trả'; }
        else if (b.checkin_status === 'cancelled') { ciBadgeClass = 'badge-danger'; ciLabel = 'Đã hủy'; }

        // Source icon/badge
        let sourceClass = 'platform-telegram';
        if (b.source === 'facebook') sourceClass = 'platform-facebook';
        else if (b.source === 'whatsapp') sourceClass = 'platform-whatsapp';

        // Quick state transition actions
        let quickActionsHTML = '';
        if (b.checkin_status === 'pending' || b.checkin_status === 'confirmed') {
          quickActionsHTML = `
            <button class="btn btn-secondary btn-sm btn-quick-ci" data-id="${b.booking_id}" title="Khách nhận phòng: Gửi mã khóa PIN cửa tự động">
              🔑 Check-In
            </button>
          `;
        } else if (b.checkin_status === 'checked_in') {
          quickActionsHTML = `
            <button class="btn btn-secondary btn-sm btn-quick-co" data-id="${b.booking_id}" title="Khách trả phòng: Gửi link review đánh giá">
              👋 Check-Out
            </button>
          `;
        }

        return `
          <tr>
            <td><strong>#${b.booking_id}</strong></td>
            <td>
              <div style="font-weight: 700;">${b.customer_name}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.15rem;">
                📞 ${b.customer_phone || 'N/A'}
              </div>
              ${b.customer_social_id ? `<div style="font-size: 0.68rem; color: var(--primary-light); opacity: 0.85;">🆔 PSID: ${b.customer_social_id}</div>` : ''}
            </td>
            <td>
              <div style="font-weight: 700;">${b.room_name}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">${b.branch_name || b.branch}</div>
            </td>
            <td>
              <div style="font-size: 0.82rem;"><strong>CI:</strong> ${b.check_in_date}</div>
              <div style="font-size: 0.82rem; margin-top: 0.15rem;"><strong>CO:</strong> ${b.check_out_date}</div>
              <div style="font-size: 0.68rem; color: var(--text-inactive); margin-top: 0.15rem;">👥 ${b.num_guests || 1} khách</div>
            </td>
            <td>
              <div style="font-weight: 700;">${fmtCurrency(b.total_price || 0)}</div>
            </td>
            <td>
              <span class="chat-session-platform ${sourceClass}" style="padding: 2px 6px; font-size: 0.65rem;">
                ${b.source || 'website'}
              </span>
            </td>
            <td>
              <span class="badge ${payBadgeClass}">${payLabel}</span>
            </td>
            <td>
              <span class="badge ${ciBadgeClass}">${ciLabel}</span>
            </td>
            <td style="text-align: center;">
              <div style="display: flex; gap: 0.4rem; justify-content: center; align-items: center;">
                ${quickActionsHTML}
                <button class="btn btn-secondary btn-sm btn-edit-booking" data-id="${b.booking_id}" title="Chỉnh sửa đặt phòng">✏️ Sửa</button>
                ${b.checkin_status !== 'cancelled' ? `<button class="btn btn-ghost btn-sm btn-cancel-booking" data-id="${b.booking_id}" style="color: var(--danger);" title="Hủy đặt phòng">❌ Hủy</button>` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    // 4. Bind event listeners
    // Filters change
    document.getElementById('booking-search-input')?.addEventListener('input', (e) => {
      this.filter.searchQuery = e.target.value;
      this.render(container, controller);
    });

    document.getElementById('booking-status-filter')?.addEventListener('change', (e) => {
      this.filter.status = e.target.value;
      this.render(container, controller);
    });

    // Create new booking button
    document.getElementById('btn-add-booking-modal')?.addEventListener('click', () => {
      this.openBookingModal(null, controller);
    });

    // Edit booking buttons
    container.querySelectorAll('.btn-edit-booking').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.openBookingModal(id, controller);
      });
    });

    // Cancel booking buttons
    container.querySelectorAll('.btn-cancel-booking').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        controller.handleCancelBooking(id);
      });
    });

    // Quick Check-in button (triggers door code PIN message to client)
    container.querySelectorAll('.btn-quick-ci').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        btn.disabled = true;
        btn.textContent = '⚡ Checking-in...';
        controller.handleSaveBooking(id, { checkin_status: 'checked_in' });
      });
    });

    // Quick Check-out button (triggers feedback links to client)
    container.querySelectorAll('.btn-quick-co').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        btn.disabled = true;
        btn.textContent = '⚡ Checking-out...';
        controller.handleSaveBooking(id, { checkin_status: 'checked_out' });
      });
    });
  },

  /**
   * Dynamic Modal popup for Creating / Updating Booking
   */
  openBookingModal(id = null, controller) {
    const isEdit = !!id;
    const booking = isEdit ? controller.state.bookings.find(b => b.booking_id === id) : null;
    const { rooms } = controller.state;

    // Build room select list
    const roomOptionsHTML = rooms.map(r => 
      `<option value="${r.room_id}" ${booking && booking.room_id === r.room_id ? 'selected' : ''}>
        ${r.emoji || '🏠'} ${r.room_name} (${r.branch_name || r.branch}) - ${new Intl.NumberFormat('vi-VN').format(r.base_price_weekday)}đ
      </option>`
    ).join('');

    const modalHTML = `
      <form id="booking-modal-form">
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label" for="book-cust-name">Tên khách hàng *</label>
            <input type="text" id="book-cust-name" class="form-input" required placeholder="Nguyễn Văn A" value="${booking ? booking.customer_name : ''}">
          </div>
          <div class="form-group flex-1">
            <label class="form-label" for="book-cust-phone">Số điện thoại *</label>
            <input type="text" id="book-cust-phone" class="form-input" required placeholder="0901234567" value="${booking ? booking.customer_phone : ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label" for="book-cust-social">Social Chat ID (PSID / Telegram ChatID)</label>
            <input type="text" id="book-cust-social" class="form-input" placeholder="Ví dụ: 82719283719" value="${booking ? booking.customer_social_id || '' : ''}">
            <div class="form-hint">Dùng để tự động nhắn tin PIN cửa qua Messenger/Telegram khi Check-in</div>
          </div>
          <div class="form-group flex-1">
            <label class="form-label" for="book-source">Nguồn đặt phòng</label>
            <select id="book-source" class="form-input">
              <option value="website" ${booking && booking.source === 'website' ? 'selected' : ''}>Website Booking Page</option>
              <option value="facebook" ${booking && booking.source === 'facebook' ? 'selected' : ''}>Facebook Messenger</option>
              <option value="telegram" ${booking && booking.source === 'telegram' ? 'selected' : ''}>Telegram Bot</option>
              <option value="whatsapp" ${booking && booking.source === 'whatsapp' ? 'selected' : ''}>WhatsApp Channel</option>
              <option value="walk_in" ${booking && booking.source === 'walk_in' ? 'selected' : ''}>Trực tiếp (Walk-In)</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="book-room-id">Chọn hạng phòng *</label>
          <select id="book-room-id" class="form-input" required>
            <option value="" disabled ${!booking ? 'selected' : ''}>-- Chọn phòng trống --</option>
            ${roomOptionsHTML}
          </select>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label" for="book-checkin">Ngày nhận phòng (Check-in) *</label>
            <input type="date" id="book-checkin" class="form-input" required value="${booking ? booking.check_in_date : ''}">
          </div>
          <div class="form-group flex-1">
            <label class="form-label" for="book-checkout">Ngày trả phòng (Check-out) *</label>
            <input type="date" id="book-checkout" class="form-input" required value="${booking ? booking.check_out_date : ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label" for="book-guests">Số lượng khách *</label>
            <input type="number" id="book-guests" class="form-input" min="1" max="15" required value="${booking ? booking.num_guests : 2}">
          </div>
          <div class="form-group flex-1">
            <label class="form-label" for="book-price">Tổng giá trị đặt phòng (VND) *</label>
            <input type="number" id="book-price" class="form-input" min="0" required placeholder="Auto tính nếu đổi phòng/ngày" value="${booking ? booking.total_price : ''}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="book-requests">Yêu cầu đặc biệt</label>
          <textarea id="book-requests" class="form-input" rows="2" placeholder="Ghi chú đón sân bay, set up trăng mật...">${booking ? booking.special_requests || '' : ''}</textarea>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label" for="book-payment-status">Trạng thái thanh toán</label>
            <select id="book-payment-status" class="form-input">
              <option value="pending" ${booking && booking.payment_status === 'pending' ? 'selected' : ''}>🟡 Chờ thanh toán (Pending)</option>
              <option value="paid" ${booking && booking.payment_status === 'paid' ? 'selected' : ''}>🟢 Đã thanh toán (Paid)</option>
              <option value="refunded" ${booking && booking.payment_status === 'refunded' ? 'selected' : ''}>🔴 Đã hoàn tiền (Refunded)</option>
            </select>
          </div>
          <div class="form-group flex-1">
            <label class="form-label" for="book-checkin-status">Trạng thái nhận phòng</label>
            <select id="book-checkin-status" class="form-input">
              <option value="pending" ${booking && booking.checkin_status === 'pending' ? 'selected' : ''}>⚪ Đang chờ (Pending)</option>
              <option value="checked_in" ${booking && booking.checkin_status === 'checked_in' ? 'selected' : ''}>🔵 Đang ở (Checked In)</option>
              <option value="checked_out" ${booking && booking.checkin_status === 'checked_out' ? 'selected' : ''}>🟡 Đã trả (Checked Out)</option>
              <option value="cancelled" ${booking && booking.checkin_status === 'cancelled' ? 'selected' : ''}>🔴 Hủy bỏ (Cancelled)</option>
            </select>
          </div>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-ghost" id="btn-booking-modal-cancel">Hủy</button>
          <button type="submit" class="btn btn-primary">💾 Lưu Lại</button>
        </div>
      </form>
    `;

    const title = isEdit ? `Chỉnh Sửa Đặt Phòng #${id}` : 'Tạo Đặt Phòng Mới';

    controller.showModal(title, modalHTML, (modalBody) => {
      // Bind Cancel button inside form
      modalBody.querySelector('#btn-booking-modal-cancel')?.addEventListener('click', () => {
        controller.closeModal();
      });

      // Price Calculator Helper trigger when dates or room changes
      const calcPriceInput = () => {
        const roomId = modalBody.querySelector('#book-room-id').value;
        const ciVal = modalBody.querySelector('#book-checkin').value;
        const coVal = modalBody.querySelector('#book-checkout').value;
        const priceInput = modalBody.querySelector('#book-price');

        if (!roomId || !ciVal || !coVal) return;

        const roomObj = rooms.find(r => r.room_id === roomId);
        if (!roomObj) return;

        const ci = new Date(ciVal);
        const co = new Date(coVal);
        if (ci >= co) return;

        // Count weekdays/weekends
        let weekdays = 0, weekends = 0;
        for (let d = new Date(ci); d < co; d.setDate(d.getDate() + 1)) {
          (d.getDay() === 0 || d.getDay() === 6) ? weekends++ : weekdays++;
        }
        
        const priceWeekday = Number(roomObj.base_price_weekday) || 0;
        const priceWeekend = Number(roomObj.base_price_weekend) || 0;
        const calculated = (weekdays * priceWeekday) + (weekends * priceWeekend);
        
        priceInput.value = calculated;
      };

      modalBody.querySelector('#book-room-id')?.addEventListener('change', calcPriceInput);
      modalBody.querySelector('#book-checkin')?.addEventListener('change', calcPriceInput);
      modalBody.querySelector('#book-checkout')?.addEventListener('change', calcPriceInput);

      // Handle form submission
      modalBody.querySelector('#booking-modal-form')?.addEventListener('submit', (e) => {
        e.preventDefault();

        const payload = {
          customer_name: modalBody.querySelector('#book-cust-name').value.trim(),
          customer_phone: modalBody.querySelector('#book-cust-phone').value.trim(),
          customer_social_id: modalBody.querySelector('#book-cust-social').value.trim(),
          source: modalBody.querySelector('#book-source').value,
          room_id: modalBody.querySelector('#book-room-id').value,
          check_in_date: modalBody.querySelector('#book-checkin').value,
          check_out_date: modalBody.querySelector('#book-checkout').value,
          num_guests: Number(modalBody.querySelector('#book-guests').value),
          total_price: Number(modalBody.querySelector('#book-price').value),
          payment_status: modalBody.querySelector('#book-payment-status').value,
          checkin_status: modalBody.querySelector('#book-checkin-status').value
        };

        // Dispatch call
        controller.handleSaveBooking(id, payload);
      });
    });
  }
};
