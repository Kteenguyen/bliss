// ============================================================
// roomController.js — Controller logic for Admin Room CRUD
// ============================================================

const RoomController = {
  openAddRoomModal() {
    RoomsView.openAddRoomModal();
  },

  openEditRoomModal(id) {
    const r = DB.getRoom(id);
    if (r) RoomsView.openEditRoomModal(r);
  },

  closeRoomModal() {
    RoomsView.closeRoomModal();
  },

  saveRoom(event) {
    event.preventDefault();
    const id = document.getElementById('room-id-input').value;
    const name = document.getElementById('room-name-input').value.trim();
    const emoji = document.getElementById('room-emoji-input').value.trim();
    const branch = document.getElementById('room-branch-input').value;
    const capacity = parseInt(document.getElementById('room-capacity-input').value);
    const weekday = parseFloat(document.getElementById('room-price-weekday').value) || 0;
    const weekend = parseFloat(document.getElementById('room-price-weekend').value) || 0;
    const hourlyDay = parseFloat(document.getElementById('room-hourly-day').value) || 239000;
    const hourlyNight = parseFloat(document.getElementById('room-hourly-night').value) || 359000;
    const images = document.getElementById('room-images-input').value.trim();
    const desc = document.getElementById('room-desc-input').value.trim();
    const status = document.getElementById('room-status-input').value;

    if (!name) {
      showToast('⚠️ Tên phòng không được trống!', 'error');
      return;
    }

    // Collect checked checkboxes for amenities
    const checkedBoxes = document.querySelectorAll('#room-amenities-checklist input[type="checkbox"]:checked');
    const amenities = Array.from(checkedBoxes).map(cb => cb.value);

    const roomData = {
      room_name: name,
      emoji: emoji || '🏠',
      branch: branch,
      capacity: capacity || 2,
      base_price_weekday: weekday,
      base_price_weekend: weekend,
      hourly_price_day: hourlyDay,
      hourly_price_night: hourlyNight,
      images: images,
      amenities: amenities,
      description: desc,
      status: status,
    };

    if (id) {
      DB.updateRoom(id, roomData);
      showToast('✏️ Cập nhật thông tin phòng thành công!', 'success');
    } else {
      DB.createRoom(roomData);
      showToast('🏠 Thêm phòng mới thành công!', 'success');
    }

    this.closeRoomModal();
    RoomsView.render();
    DashboardView.render();
    if (typeof CustomerView !== 'undefined' && typeof CustomerView.render === 'function') {
      CustomerView.render();
    }
    AppController.pushToServer();
  },

  deleteRoomAction(id) {
    if (confirm('Bạn có chắc chắn muốn xoá phòng này khỏi hệ thống?')) {
      const res = DB.deleteRoom(id, true); // force hard delete for demo
      if (res && res.error) {
        showToast('⚠️ ' + res.error, 'error');
      } else {
        showToast('🗑️ Đã xoá phòng thành công!', 'success');
        RoomsView.render();
        DashboardView.render();
        AppController.pushToServer();
      }
    }
  }
};

window.RoomController = RoomController;
