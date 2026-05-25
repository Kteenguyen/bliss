// ============================================================
// roomController.js — Controller logic for Admin Room CRUD
// ============================================================

const RoomController = {
  tempRoomImages: [],

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

  addImageUrl() {
    const input = document.getElementById('room-image-add-input');
    if (!input) return;
    const url = input.value.trim();
    if (!url) {
      showToast('⚠️ Vui lòng nhập link ảnh!', 'error');
      return;
    }
    this.tempRoomImages.push(url);
    input.value = '';
    RoomsView.renderImagesVisualList(this.tempRoomImages);
  },

  deleteImageByIndex(index) {
    this.tempRoomImages.splice(index, 1);
    RoomsView.renderImagesVisualList(this.tempRoomImages);
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

    const slotPrices = {
      "08:00 - 11:00": parseFloat(document.getElementById('room-hourly-slot-1').value) || 239000,
      "11:30 - 14:30": parseFloat(document.getElementById('room-hourly-slot-2').value) || 249000,
      "15:00 - 18:00": parseFloat(document.getElementById('room-hourly-slot-3').value) || 239000,
      "18:30 - 21:30": parseFloat(document.getElementById('room-hourly-slot-4').value) || 259000,
      "22:00 - 08:00": parseFloat(document.getElementById('room-hourly-slot-5').value) || 359000,
    };

    const images = this.tempRoomImages || [];
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
      slot_prices: slotPrices,
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
