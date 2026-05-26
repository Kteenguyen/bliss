// ============================================================
// bookingController.js — Controller logic for Admin Bookings CRM
// ============================================================

const BookingController = {
  changeStatus(id, status) {
    DB.updateBookingStatus(id, status);
    const labels = { checked_in: 'đã Check-in', checked_out: 'đã Check-out', cancelled: 'đã Huỷ' };
    DB.addActivity({ type: 'status', msg: `🔄 Booking #${id} ${labels[status] || status}`, color: status === 'cancelled' ? 'red' : 'blue' });
    
    BookingsView.render();
    DashboardView.render();
    
    if (typeof NOTIFICATIONS !== 'undefined' && typeof NOTIFICATIONS.sendAlert === 'function') {
      NOTIFICATIONS.sendAlert('🔄 Cập nhật trạng thái', `Booking #${id} ${labels[status]}`, status === 'cancelled' ? 'red' : 'blue');
    }
    
    AppController.pushToServer();
  },

  deleteBookingAction(id) {
    if (confirm('Bạn chắc chắn muốn xoá đặt phòng #' + id + '? Thao tác này không thể hoàn tác.')) {
      DB.deleteBooking(id);
      showToast('🗑️ Đã xoá đặt phòng #' + id, 'success');
      BookingsView.render();
      DashboardView.render();
      AppController.pushToServer();
    }
  }
};

window.BookingController = BookingController;
