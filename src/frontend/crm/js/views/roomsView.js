/**
 * BLISS BOUTIQUE CRM — ROOMS VIEW (roomsView.js)
 * Manages homestay rooms list, room creation, status editing, and pricing adjustments.
 */

export const roomsView = {
  // Local filter states
  filter: {
    branch: 'all'
  },

  /**
   * Render View Content
   */
  render(container, controller) {
    const { rooms } = controller.state;
    const fmtCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    // 1. Filter rooms
    let filteredRooms = [...rooms];
    if (this.filter.branch !== 'all') {
      filteredRooms = filteredRooms.filter(r => r.branch === this.filter.branch);
    }

    // 2. Render Page Layout HTML
    container.innerHTML = `
      <div class="page-title-area animate-fade-in">
        <h1 class="page-title">🏠 Quản Lý <span>Phòng Homestay</span></h1>
        <p class="page-subtitle">Quản lý danh sách phòng nghỉ, trạng thái hoạt động và cấu hình bảng giá dịch vụ</p>
      </div>

      <!-- Filters & Toolbar -->
      <div class="glass-card toolbar-row animate-fade-in" style="animation-delay: 0.05s; padding: 1rem 1.5rem;">
        <div class="toolbar-filters">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Lọc chi nhánh:</span>
            <select id="room-branch-filter" class="form-input" style="width: 160px; padding: 0.5rem; font-size: 0.8rem; height: 35px;">
              <option value="all" ${this.filter.branch === 'all' ? 'selected' : ''}>Tất cả chi nhánh</option>
              <option value="cs1" ${this.filter.branch === 'cs1' ? 'selected' : ''}>🏡 Tân Bình (CS1)</option>
              <option value="cs2" ${this.filter.branch === 'cs2' ? 'selected' : ''}>☀️ Quận 10 (CS2)</option>
              <option value="cs3" ${this.filter.branch === 'cs3' ? 'selected' : ''}>🌿 Quận 5 (CS3)</option>
              <option value="cs4" ${this.filter.branch === 'cs4' ? 'selected' : ''}>🍃 Gò Vấp (CS4)</option>
              <option value="cs5" ${this.filter.branch === 'cs5' ? 'selected' : ''}>🌅 Bình Thạnh (CS5)</option>
            </select>
          </div>
        </div>

        <button class="btn btn-primary btn-sm" id="btn-add-room-modal" style="height: 35px; border-radius: var(--radius-sm);">
          ➕ Thêm Hạng Phòng Mới
        </button>
      </div>

      <!-- Rooms Grid List -->
      <div class="rooms-grid animate-fade-in" style="animation-delay: 0.1s;" id="rooms-list-grid">
        <!-- Room cards will be injected below -->
      </div>
    `;

    // 3. Inject Room Cards
    const grid = document.getElementById('rooms-list-grid');
    if (filteredRooms.length === 0) {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;" class="glass-card">Không có phòng homestay nào được cấu hình cho chi nhánh này.</div>`;
    } else {
      grid.innerHTML = filteredRooms.map(r => {
        const isRoomActive = r.status === 'active';
        
        // Parse amenities
        let amenitiesList = [];
        if (Array.isArray(r.amenities)) {
          amenitiesList = r.amenities;
        } else if (r.amenities) {
          amenitiesList = r.amenities.split(',').map(a => a.trim());
        }

        // Parse images
        let mainImage = 'https://images.unsplash.com/photo-1582719478250-c89cae4db85b?auto=format&fit=crop&w=600&q=80'; // fallback
        if (Array.isArray(r.images) && r.images.length > 0) {
          mainImage = r.images[0];
        } else if (r.images && typeof r.images === 'string') {
          const imgArr = r.images.split(',').map(i => i.trim());
          if (imgArr.length > 0 && imgArr[0]) mainImage = imgArr[0];
        }

        // Price formatting
        const priceWd = r.base_price_weekday || r.base_price || 0;
        const priceWe = r.base_price_weekend || priceWd;

        return `
          <div class="glass-card room-card animate-zoom-in" style="opacity: ${isRoomActive ? '1' : '0.6'};">
            <div class="room-card-image" style="background-image: url('${mainImage}');">
              <span class="badge ${isRoomActive ? 'badge-success' : 'badge-danger'} room-card-status-badge">
                ${isRoomActive ? 'Hoạt động' : 'Tạm ngưng'}
              </span>
            </div>
            
            <div class="room-card-details">
              <h3 class="room-card-name">
                <span>${r.emoji || '🏠'}</span>
                <span>${r.room_name}</span>
              </h3>
              
              <div class="room-card-branch">📍 ${r.branch_name || (r.branch === 'cs1' ? 'Tân Bình' : r.branch === 'cs2' ? 'Quận 10' : r.branch === 'cs3' ? 'Quận 5' : r.branch === 'cs4' ? 'Gò Vấp' : r.branch === 'cs5' ? 'Bình Thạnh' : r.branch)}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.25rem;">🏠 ${r.address || 'Chưa cập nhật địa chỉ'}</div>
              
              <p style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.5rem; line-height: 1.4; flex-grow: 1;">
                ${r.description || 'Chưa cấu hình mô tả ngắn cho phòng này.'}
              </p>

              <div class="room-card-price">
                Weekday: <strong>${fmtCurrency(priceWd)}</strong><br>
                Weekend: <strong style="color: var(--secondary);">${fmtCurrency(priceWe)}</strong>
              </div>

              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.5rem;">
                👥 Sức chứa tối đa: <strong>${r.capacity || 2} khách</strong>
              </div>

              <div class="room-card-amenities">
                ${amenitiesList.slice(0, 4).map(a => `<span class="room-amenity-tag">${a}</span>`).join('')}
                ${amenitiesList.length > 4 ? `<span class="room-amenity-tag">+${amenitiesList.length - 4}</span>` : ''}
              </div>

              <div class="room-card-actions">
                <button class="btn btn-secondary btn-sm btn-edit-room" data-id="${r.room_id}" style="flex: 1;">✏️ Sửa Phòng</button>
                <button class="btn btn-ghost btn-sm btn-delete-room" data-id="${r.room_id}" style="color: var(--danger); font-size: 0.75rem;">🗑️ Xóa</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    // 4. Bind event listeners
    document.getElementById('room-branch-filter')?.addEventListener('change', (e) => {
      this.filter.branch = e.target.value;
      this.render(container, controller);
    });

    document.getElementById('btn-add-room-modal')?.addEventListener('click', () => {
      this.openRoomModal(null, controller);
    });

    container.querySelectorAll('.btn-edit-room').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.openRoomModal(id, controller);
      });
    });

    container.querySelectorAll('.btn-delete-room').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        controller.handleDeleteRoom(id);
      });
    });
  },

  /**
   * Modal form overlay for Rooms Creation and Modification
   */
  openRoomModal(id = null, controller) {
    const isEdit = !!id;
    const room = isEdit ? controller.state.rooms.find(r => r.room_id === id) : null;

    // Parse existing amenities checkmarks
    let roomAmenities = [];
    if (room) {
      if (Array.isArray(room.amenities)) {
        roomAmenities = room.amenities;
      } else if (room.amenities) {
        roomAmenities = room.amenities.split(',').map(a => a.trim());
      }
    }

    const availableAmenities = [
      'Bếp tự nấu', 'Máy chiếu', 'Sofa bàn trà', 'Bồn tắm', 'Board game', 'Tủ lạnh', 'NVS riêng', 'Gương lớn', 'WiFi', 'Điều hòa', 'View sông', 'Ban công'
    ];

    const checklistHTML = availableAmenities.map(amenity => {
      const isChecked = roomAmenities.includes(amenity);
      return `
        <label class="checklist-item">
          <input type="checkbox" name="room-amenities" value="${amenity}" ${isChecked ? 'checked' : ''}>
          <span>${amenity}</span>
        </label>
      `;
    }).join('');

    const modalHTML = `
      <form id="room-modal-form">
        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label" for="room-name">Tên hạng phòng *</label>
            <input type="text" id="room-name" class="form-input" required placeholder="Deluxe Double Room" value="${room ? room.room_name : ''}">
          </div>
          <div class="form-group" style="width: 100px;">
            <label class="form-label" for="room-emoji">Emoji *</label>
            <input type="text" id="room-emoji" class="form-input" required style="text-align: center;" placeholder="🏠" value="${room ? room.emoji || '🏠' : '🏠'}">
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label" for="room-branch">Chi nhánh *</label>
            <select id="room-branch" class="form-input" required>
              <option value="cs1" ${room && room.branch === 'cs1' ? 'selected' : ''}>🏡 Chi nhánh Tân Bình (CS1)</option>
              <option value="cs2" ${room && room.branch === 'cs2' ? 'selected' : ''}>☀️ Chi nhánh Quận 10 (CS2)</option>
              <option value="cs3" ${room && room.branch === 'cs3' ? 'selected' : ''}>🌿 Chi nhánh Quận 5 (CS3)</option>
              <option value="cs4" ${room && room.branch === 'cs4' ? 'selected' : ''}>🍃 Chi nhánh Gò Vấp (CS4)</option>
              <option value="cs5" ${room && room.branch === 'cs5' ? 'selected' : ''}>🌅 Chi nhánh Bình Thạnh (CS5)</option>
            </select>
          </div>
          <div class="form-group flex-1">
            <label class="form-label" for="room-capacity">Sức chứa tối đa (Khách) *</label>
            <input type="number" id="room-capacity" class="form-input" min="1" max="20" required value="${room ? room.capacity : 2}">
          </div>
        </div>
 
        <div class="form-group">
          <label class="form-label" for="room-address">Địa chỉ cụ thể *</label>
          <input type="text" id="room-address" class="form-input" required placeholder="Đường Đống Đa, Phường 3, TP. Đà Lạt" value="${room ? room.address || '' : ''}">
        </div>

        <div class="form-row">
          <div class="form-group flex-1">
            <label class="form-label" for="room-price-wd">Giá ngày thường (Weekday) *</label>
            <input type="number" id="room-price-wd" class="form-input" min="0" required placeholder="800000" value="${room ? room.base_price_weekday || room.base_price || 0 : ''}">
          </div>
          <div class="form-group flex-1">
            <label class="form-label" for="room-price-we">Giá cuối tuần (Weekend) *</label>
            <input type="number" id="room-price-we" class="form-input" min="0" required placeholder="1200000" value="${room ? room.base_price_weekend || room.base_price || 0 : ''}">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Chọn các tiện nghi của phòng</label>
          <div class="amenities-checklist-grid">
            ${checklistHTML}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="room-images">Đường dẫn hình ảnh (Cách nhau bằng dấu phẩy)</label>
          <input type="text" id="room-images" class="form-input" placeholder="Ví dụ: images/room_1.png, images/room_2.png" value="${room ? (Array.isArray(room.images) ? room.images.join(', ') : room.images || '') : ''}">
        </div>

        <div class="form-group">
          <label class="form-label" for="room-desc">Mô tả chi tiết phòng</label>
          <textarea id="room-desc" class="form-input" rows="3" placeholder="Phòng hạng sang có view nhìn ra dòng sông Hoài thơ mộng...">${room ? room.description || '' : ''}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label" for="room-status">Trạng thái phòng</label>
          <select id="room-status" class="form-input">
            <option value="active" ${room && room.status === 'active' ? 'selected' : ''}>🟢 Đang hoạt động (Active)</option>
            <option value="inactive" ${room && room.status === 'inactive' ? 'selected' : ''}>🔴 Tạm ngưng hoạt động (Inactive)</option>
          </select>
        </div>

        <div class="form-actions">
          <button type="button" class="btn btn-ghost" id="btn-room-modal-cancel">Hủy</button>
          <button type="submit" class="btn btn-primary">💾 Lưu Lại</button>
        </div>
      </form>
    `;

    const title = isEdit ? `Chỉnh Sửa Phòng ${room.room_id}` : 'Thêm Phòng Homestay Mới';

    controller.showModal(title, modalHTML, (modalBody) => {
      // Bind Cancel btn
      modalBody.querySelector('#btn-room-modal-cancel')?.addEventListener('click', () => {
        controller.closeModal();
      });

      // Submit Form
      modalBody.querySelector('#room-modal-form')?.addEventListener('submit', (e) => {
        e.preventDefault();

        // Collect Checked checkboxes
        const checkedBoxes = modalBody.querySelectorAll('input[name="room-amenities"]:checked');
        const amenitiesArr = Array.from(checkedBoxes).map(cb => cb.value);

        // Gather Branch Names helper
        const branchSelect = modalBody.querySelector('#room-branch');
        const branchKey = branchSelect.value;
        const branchName = branchSelect.options[branchSelect.selectedIndex].text.replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi, '').trim();

        // Images split helper
        const imagesInput = modalBody.querySelector('#room-images').value;
        const imagesArr = imagesInput ? imagesInput.split(',').map(img => img.trim()).filter(i => i !== '') : [];

        const payload = {
          room_name: modalBody.querySelector('#room-name').value.trim(),
          emoji: modalBody.querySelector('#room-emoji').value.trim(),
          branch: branchKey,
          branch_name: branchName,
          address: modalBody.querySelector('#room-address').value.trim(),
          capacity: Number(modalBody.querySelector('#room-capacity').value),
          base_price_weekday: Number(modalBody.querySelector('#room-price-wd').value),
          base_price_weekend: Number(modalBody.querySelector('#room-price-we').value),
          amenities: amenitiesArr, // send array
          images: imagesArr,       // send array
          description: modalBody.querySelector('#room-desc').value.trim(),
          status: modalBody.querySelector('#room-status').value
        };

        controller.handleSaveRoom(room ? room.room_id : null, payload);
      });
    });
  }
};
