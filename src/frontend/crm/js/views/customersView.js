/**
 * BLISS BOUTIQUE CRM — CUSTOMERS VIEW (customersView.js)
 * Displays VIP customer profiles, lifetime spends, and loyalty preferences.
 */

export const customersView = {
  // Local filter states
  filter: {
    searchQuery: ''
  },

  /**
   * Render View Content
   */
  render(container, controller) {
    const { customers, bookings } = controller.state;
    const fmtCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    // 1. Calculate stats per customer dynamically based on bookings to ensure real-time accuracy
    const enrichedCustomers = customers.map(c => {
      // Find matching bookings
      const matchBookings = bookings.filter(b => 
        (b.customer_phone && c.customer_phone && b.customer_phone === c.customer_phone) ||
        b.customer_name.toLowerCase() === c.customer_name.toLowerCase()
      );
      
      const successfulBookings = matchBookings.filter(b => ['confirmed', 'checked_in', 'checked_out'].includes(b.status));
      const spend = successfulBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);

      return {
        ...c,
        total_bookings: matchBookings.length,
        total_spend: spend
      };
    });

    // Sort: VIP level, then spend descending
    const loyaltyWeights = { 'VIP': 3, 'Member': 2, 'Regular': 1 };
    enrichedCustomers.sort((a, b) => {
      const weightA = loyaltyWeights[a.loyalty_level] || 0;
      const weightB = loyaltyWeights[b.loyalty_level] || 0;
      if (weightB !== weightA) return weightB - weightA;
      return b.total_spend - a.total_spend;
    });

    // 2. Filter list
    let filteredCustomers = [...enrichedCustomers];
    if (this.filter.searchQuery.trim() !== '') {
      const q = this.filter.searchQuery.toLowerCase();
      filteredCustomers = filteredCustomers.filter(c => 
        c.customer_name.toLowerCase().includes(q) ||
        (c.customer_phone && c.customer_phone.includes(q)) ||
        (c.facebook_psid && c.facebook_psid.includes(q)) ||
        (c.telegram_chat_id && c.telegram_chat_id.includes(q))
      );
    }

    // 3. Render HTML frame
    container.innerHTML = `
      <div class="page-title-area animate-fade-in">
        <h1 class="page-title">👑 Khách Hàng <span>VIP Profiles</span></h1>
        <p class="page-subtitle">Quản lý cơ sở dữ liệu khách hàng VIP, xếp hạng thẻ thành viên và ghi chú sở thích cá nhân</p>
      </div>

      <!-- Filters & Toolbar -->
      <div class="glass-card toolbar-row animate-fade-in" style="animation-delay: 0.05s; padding: 1rem 1.5rem;">
        <div class="toolbar-filters">
          <div style="position: relative; width: 280px;">
            <input type="text" id="cust-search-input" class="form-input" style="padding-top: 0.5rem; padding-bottom: 0.5rem; font-size: 0.8rem;" placeholder="Tìm tên, SĐT, Facebook PSID..." value="${this.filter.searchQuery}">
          </div>
        </div>

        <button class="btn btn-primary btn-sm" id="btn-add-customer-modal" style="height: 35px; border-radius: var(--radius-sm);">
          ➕ Thêm Khách Hàng VIP
        </button>
      </div>

      <!-- Customers List Table -->
      <div class="glass-card animate-fade-in" style="animation-delay: 0.1s; padding: 1rem;">
        <div class="table-responsive">
          <table class="crm-table">
            <thead>
              <tr>
                <th>Khách VIP</th>
                <th>Xếp Hạng</th>
                <th>SĐT Liên Hệ</th>
                <th>Kênh Social ID</th>
                <th style="text-align: center;">Tổng Đặt</th>
                <th>Tích Lũy Chi Tiêu</th>
                <th>Sở Thích & Ghi Chú VIP</th>
                <th style="text-align: center;">Hành Động</th>
              </tr>
            </thead>
            <tbody id="customers-table-tbody">
              <!-- Injected below -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    // 4. Inject Rows
    const tbody = document.getElementById('customers-table-tbody');
    if (filteredCustomers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 2rem;">Không tìm thấy thông tin khách hàng VIP nào.</td></tr>`;
    } else {
      tbody.innerHTML = filteredCustomers.map(c => {
        let levelBadge = 'badge-info';
        if (c.loyalty_level === 'VIP') levelBadge = 'badge-warning';
        else if (c.loyalty_level === 'Member') levelBadge = 'badge-success';

        return `
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div class="user-avatar" style="width: 32px; height: 32px; font-size: 0.9rem;">👑</div>
                <div style="font-weight: 700;">${c.customer_name}</div>
              </div>
            </td>
            <td>
              <span class="badge ${levelBadge}">${c.loyalty_level || 'Regular'}</span>
            </td>
            <td><strong>${c.customer_phone || 'N/A'}</strong></td>
            <td>
              ${c.facebook_psid ? `<div style="font-size: 0.72rem;"><span class="chat-session-platform platform-facebook" style="font-size: 0.6rem; padding: 1px 4px;">FB</span> ${c.facebook_psid}</div>` : ''}
              ${c.telegram_chat_id ? `<div style="font-size: 0.72rem; margin-top: 0.2rem;"><span class="chat-session-platform platform-telegram" style="font-size: 0.6rem; padding: 1px 4px;">TG</span> ${c.telegram_chat_id}</div>` : ''}
              ${c.whatsapp_phone_id ? `<div style="font-size: 0.72rem; margin-top: 0.2rem;"><span class="chat-session-platform platform-whatsapp" style="font-size: 0.6rem; padding: 1px 4px;">WA</span> ${c.whatsapp_phone_id}</div>` : ''}
              ${!c.facebook_psid && !c.telegram_chat_id && !c.whatsapp_phone_id ? '<span style="color: var(--text-inactive); font-size: 0.72rem;">Chưa liên kết</span>' : ''}
            </td>
            <td style="text-align: center;"><strong>${c.total_bookings}</strong></td>
            <td><strong>${fmtCurrency(c.total_spend || 0)}</strong></td>
            <td style="max-width: 250px; font-size: 0.78rem; line-height: 1.4; color: var(--text-muted);">
              ${c.notes || '<span style="color: var(--text-inactive);">Không có ghi chú đặc biệt.</span>'}
            </td>
            <td style="text-align: center;">
              <button class="btn btn-secondary btn-sm btn-edit-customer" data-id="${c.customer_id}">✏️ Sửa Profile</button>
            </td>
          </tr>
        `;
      }).join('');
    }

    // 5. Bind events
    document.getElementById('cust-search-input')?.addEventListener('input', (e) => {
      this.filter.searchQuery = e.target.value;
      this.render(container, controller);
    });

    document.getElementById('btn-add-customer-modal')?.addEventListener('click', () => {
      this.openCustomerModal(null, controller);
    });

    container.querySelectorAll('.btn-edit-customer').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.openCustomerModal(id, controller);
      });
    });
  },

  /**
   * Modal Form popup for VIP Customer creation and profiling
   */
  openCustomerModal(id = null, controller) {
    const isEdit = !!id;
    const customer = isEdit ? controller.state.customers.find(c => c.customer_id === id) : null;

    const modalHTML = `
      <form id="customer-modal-form">
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label" for="cust-name">Họ và tên khách *</label>
            <input type="text" id="cust-name" class="form-input" required placeholder="Trần Thị B" value="${customer ? customer.customer_name : ''}">
          </div>
          <div class="form-group flex-1">
            <label class="form-label" for="cust-phone">Số điện thoại *</label>
            <input type="text" id="cust-phone" class="form-input" required placeholder="0911222333" value="${customer ? customer.customer_phone : ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label" for="cust-loyalty">Xếp hạng loyalty thẻ</label>
            <select id="cust-loyalty" class="form-input">
              <option value="Regular" ${customer && customer.loyalty_level === 'Regular' ? 'selected' : ''}>Regular Member</option>
              <option value="Member" ${customer && customer.loyalty_level === 'Member' ? 'selected' : ''}>Standard Member (Tích lũy)</option>
              <option value="VIP" ${customer && customer.loyalty_level === 'VIP' ? 'selected' : ''}>👑 Khách Hàng VIP (Ưu tiên)</option>
            </select>
          </div>
          <div class="form-group flex-1">
            <label class="form-label" for="cust-tg">Telegram Chat ID</label>
            <input type="text" id="cust-tg" class="form-input" placeholder="Ví dụ: 12893821" value="${customer ? customer.telegram_chat_id || '' : ''}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label" for="cust-fb">Facebook PSID</label>
            <input type="text" id="cust-fb" class="form-input" placeholder="Ví dụ: 3012898371289" value="${customer ? customer.facebook_psid || '' : ''}">
          </div>
          <div class="form-group flex-1">
            <label class="form-label" for="cust-wa">WhatsApp Phone ID</label>
            <input type="text" id="cust-wa" class="form-input" placeholder="Ví dụ: 84911222333" value="${customer ? customer.whatsapp_phone_id || '' : ''}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="cust-notes">Sở thích & Ghi chú chăm sóc VIP</label>
          <textarea id="cust-notes" class="form-input" rows="4" placeholder="Ví dụ: Hay đi du lịch cùng gia đình, thích phòng yên tĩnh, thích uống trà ô long sen đá lạnh...">${customer ? customer.notes || '' : ''}</textarea>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-ghost" id="btn-customer-modal-cancel">Hủy</button>
          <button type="submit" class="btn btn-primary">💾 Lưu Lại</button>
        </div>
      </form>
    `;

    const title = isEdit ? `Chỉnh Sửa Profile VIP ${customer.customer_id}` : 'Thêm Hồ Sơ Khách Hàng VIP';

    controller.showModal(title, modalHTML, (modalBody) => {
      // Bind cancel btn
      modalBody.querySelector('#btn-customer-modal-cancel')?.addEventListener('click', () => {
        controller.closeModal();
      });

      // Submit form
      modalBody.querySelector('#customer-modal-form')?.addEventListener('submit', (e) => {
        e.preventDefault();

        const payload = {
          customer_name: modalBody.querySelector('#cust-name').value.trim(),
          customer_phone: modalBody.querySelector('#cust-phone').value.trim(),
          loyalty_level: modalBody.querySelector('#cust-loyalty').value,
          telegram_chat_id: modalBody.querySelector('#cust-tg').value.trim() || null,
          facebook_psid: modalBody.querySelector('#cust-fb').value.trim() || null,
          whatsapp_phone_id: modalBody.querySelector('#cust-wa').value.trim() || null,
          notes: modalBody.querySelector('#cust-notes').value.trim()
        };

        controller.handleSaveCustomer(customer ? customer.customer_id : null, payload);
      });
    });
  }
};
