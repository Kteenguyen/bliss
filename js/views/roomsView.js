// ============================================================
// roomsView.js — View component for admin rooms grid list
// ============================================================

const RoomsView = {
  render() {
    const filter = document.getElementById('room-branch-filter')?.value || 'all';
    const rooms = DB.getRoomsByBranch(filter);
    const grid = document.getElementById('rooms-grid');
    if (!grid) return;

    grid.innerHTML = rooms.map(r => {
      const bookings = DB.getBookings().filter(b => b.room_id === r.room_id && ['confirmed', 'checked_in'].includes(b.status));
      const today = new Date().toISOString().split('T')[0];
      const isOccupied = bookings.some(b => b.check_in_date <= today && b.check_out_date > today);
      const nextBooking = bookings.filter(b => b.check_in_date > today).sort((a, b) => a.check_in_date.localeCompare(b.check_in_date))[0];
      const isInactive = r.status === 'inactive';

      const previewImage = r.images && r.images[0] ? r.images[0] : 'images/room_1_main.png';

      return `
      <div class="room-card ${isOccupied ? 'occupied' : ''} ${isInactive ? 'inactive' : ''}">
        <div class="room-card-actions">
          <button class="btn-icon btn-icon-edit" onclick="RoomController.openEditRoomModal('${r.room_id}')" title="Sửa phòng">✏️</button>
          <button class="btn-icon btn-icon-delete" onclick="RoomController.deleteRoomAction('${r.room_id}')" title="Xoá phòng">🗑️</button>
        </div>
        <div class="room-card-image" style="width:100%; height:130px; border-radius:6px; overflow:hidden; margin-bottom:0.75rem; border:1px solid rgba(255,255,255,0.08); position:relative;">
          <img src="${previewImage}" alt="${r.room_name}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='images/room_1_main.png'" />
          <div style="position:absolute; top:8px; left:8px; font-size:1.2rem; background:rgba(0,0,0,0.5); width:32px; height:32px; border-radius:50%; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px);">${r.emoji || '🏠'}</div>
        </div>
        <div class="room-header">
          <h3 class="room-name">${r.room_name}</h3>
          <div style="display:flex; gap:0.4rem; align-items:center;">
            ${isInactive ? '<span class="badge-inactive">Inactive</span>' : ''}
            <span class="room-branch-tag">${r.branch_name}</span>
          </div>
        </div>
        <p class="room-desc">${r.description || 'Không có mô tả.'}</p>
        <div class="room-amenities">${(r.amenities || []).map(a => `<span class="amenity-tag">${a}</span>`).join('')}</div>
        <div class="room-pricing">
          <span>📅 Ngày thường: <strong>${UTIL.fmtPrice(r.base_price_weekday)}</strong></span>
          <span>🎉 Cuối tuần: <strong>${UTIL.fmtPrice(r.base_price_weekend)}</strong></span>
          <span>👥 Sức chứa: <strong>${r.capacity} khách</strong></span>
        </div>
        <div class="room-status ${isInactive ? 'status-occupied' : (isOccupied ? 'status-occupied' : 'status-free')}">
          ${isInactive ? '🔴 Ngừng hoạt động' : (isOccupied ? '🔴 Đang có khách' : '🟢 Còn trống')}
          ${!isInactive && nextBooking ? `<span class="next-booking">📅 Tiếp theo: ${UTIL.fmtDate(nextBooking.check_in_date)}</span>` : ''}
        </div>
      </div>`;
    }).join('');
  },

  renderImagesVisualList(images) {
    const list = document.getElementById('room-images-visual-list');
    if (!list) return;
    if (!images || images.length === 0) {
      list.innerHTML = `<span style="color:var(--text-muted); font-size:0.75rem;">Chưa có hình ảnh nào. Thêm URL ở bên dưới!</span>`;
      return;
    }
    list.innerHTML = images.map((url, idx) => `
      <div style="position: relative; width: 60px; height: 60px; border-radius: 6px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); display: inline-block;">
        <img src="${url}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='images/room_1_main.png'" />
        <button type="button" onclick="RoomController.deleteImageByIndex(${idx})" style="position: absolute; top: 2px; right: 2px; width: 16px; height: 16px; border-radius: 50%; background: rgba(239, 68, 68, 0.9); color: white; border: none; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; line-height: 1; font-weight: bold;" title="Xóa hình ảnh">×</button>
      </div>
    `).join('');
  },

  openAddRoomModal() {
    const modal = document.getElementById('room-modal');
    const title = document.getElementById('room-modal-title');
    const form = document.getElementById('room-form');
    if (!modal || !title || !form) return;

    title.innerHTML = '🏠 Thêm <span>Phòng Mới</span>';
    document.getElementById('room-id-input').value = '';
    document.getElementById('room-name-input').value = '';
    document.getElementById('room-emoji-input').value = '🏠';
    document.getElementById('room-branch-input').value = 'da_lat';
    document.getElementById('room-capacity-input').value = '2';
    document.getElementById('room-price-weekday').value = '';
    document.getElementById('room-price-weekend').value = '';
    document.getElementById('room-hourly-slot-1').value = '239000';
    document.getElementById('room-hourly-slot-2').value = '249000';
    document.getElementById('room-hourly-slot-3').value = '239000';
    document.getElementById('room-hourly-slot-4').value = '259000';
    document.getElementById('room-hourly-slot-5').value = '359000';
    document.getElementById('room-desc-input').value = '';
    document.getElementById('room-status-input').value = 'active';

    // Reset URL add input
    document.getElementById('room-image-add-input').value = '';

    // Manage temp images array
    RoomController.tempRoomImages = [];
    this.renderImagesVisualList(RoomController.tempRoomImages);

    // Uncheck all checkboxes in checklist
    document.querySelectorAll('#room-amenities-checklist input[type="checkbox"]').forEach(cb => {
      cb.checked = false;
    });

    modal.classList.remove('hidden');
  },

  openEditRoomModal(r) {
    const modal = document.getElementById('room-modal');
    const title = document.getElementById('room-modal-title');
    if (!modal || !title || !r) return;

    title.innerHTML = '✏️ Chỉnh Sửa <span>Phòng</span>';
    document.getElementById('room-id-input').value = r.room_id;
    document.getElementById('room-name-input').value = r.room_name;
    document.getElementById('room-emoji-input').value = r.emoji || '🏠';
    document.getElementById('room-branch-input').value = r.branch;
    document.getElementById('room-capacity-input').value = r.capacity;
    document.getElementById('room-price-weekday').value = r.base_price_weekday;
    document.getElementById('room-price-weekend').value = r.base_price_weekend;

    const slots = r.slot_prices || {};
    document.getElementById('room-hourly-slot-1').value = slots["08:00 - 11:00"] || r.hourly_price_day || 239000;
    document.getElementById('room-hourly-slot-2').value = slots["11:30 - 14:30"] || 249000;
    document.getElementById('room-hourly-slot-3').value = slots["15:00 - 18:00"] || r.hourly_price_day || 239000;
    document.getElementById('room-hourly-slot-4').value = slots["18:30 - 21:30"] || 259000;
    document.getElementById('room-hourly-slot-5').value = slots["22:00 - 08:00"] || r.hourly_price_night || 359000;

    // Reset URL add input
    document.getElementById('room-image-add-input').value = '';

    RoomController.tempRoomImages = [...(r.images || [])];
    this.renderImagesVisualList(RoomController.tempRoomImages);

    document.getElementById('room-desc-input').value = r.description || '';
    document.getElementById('room-status-input').value = r.status || 'active';

    // Check matching checkboxes in checklist
    const amenitiesSet = new Set(r.amenities || []);
    document.querySelectorAll('#room-amenities-checklist input[type="checkbox"]').forEach(cb => {
      cb.checked = amenitiesSet.has(cb.value);
    });

    modal.classList.remove('hidden');
  },

  closeRoomModal() {
    const modal = document.getElementById('room-modal');
    if (modal) modal.classList.add('hidden');
  }
};

window.RoomsView = RoomsView;
