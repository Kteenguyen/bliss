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

      return `
      <div class="room-card ${isOccupied ? 'occupied' : ''} ${isInactive ? 'inactive' : ''}">
        <div class="room-card-actions">
          <button class="btn-icon btn-icon-edit" onclick="RoomController.openEditRoomModal('${r.room_id}')" title="Sửa phòng">✏️</button>
          <button class="btn-icon btn-icon-delete" onclick="RoomController.deleteRoomAction('${r.room_id}')" title="Xoá phòng">🗑️</button>
        </div>
        <div class="room-emoji">${r.emoji || '🏠'}</div>
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
    document.getElementById('room-hourly-day').value = '239000';
    document.getElementById('room-hourly-night').value = '359000';
    document.getElementById('room-images-input').value = '';
    document.getElementById('room-desc-input').value = '';
    document.getElementById('room-status-input').value = 'active';

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
    document.getElementById('room-hourly-day').value = r.hourly_price_day || 239000;
    document.getElementById('room-hourly-night').value = r.hourly_price_night || 359000;
    document.getElementById('room-images-input').value = (r.images || []).join(', ');
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
