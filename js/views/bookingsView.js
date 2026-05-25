// ============================================================
// bookingsView.js — View component for admin bookings list
// ============================================================

const BookingsView = {
  render() {
    const filter = document.getElementById('booking-status-filter')?.value || 'all';
    let bookings = DB.getBookings();
    if (filter !== 'all') bookings = bookings.filter(b => b.status === filter);

    const tbody = document.getElementById('bookings-tbody');
    if (!tbody) return;

    tbody.innerHTML = bookings.map(b => `
      <tr>
        <td><strong>#${b.booking_id}</strong></td>
        <td>${b.customer_name}<br><small style="color:var(--text-muted)">${b.customer_phone}</small></td>
        <td>${b.room_name}<br><small style="color:var(--text-muted)">${b.branch_name}</small></td>
        <td>${UTIL.fmtDate(b.check_in_date)}<br><small>→ ${UTIL.fmtDate(b.check_out_date)}</small></td>
        <td>${b.num_guests} người</td>
        <td><strong>${UTIL.fmtPrice(b.total_price)}</strong></td>
        <td>${UTIL.sourceBadge(b.source)}</td>
        <td>${UTIL.statusBadge(b.status)}</td>
        <td>
          <div class="action-btns">
            ${b.status === 'confirmed' ? `<button class="btn-action btn-checkin" onclick="BookingController.changeStatus('${b.booking_id}','checked_in')">Check-in</button>` : ''}
            ${b.status === 'checked_in' ? `<button class="btn-action btn-checkout" onclick="BookingController.changeStatus('${b.booking_id}','checked_out')">Check-out</button>` : ''}
            ${!['cancelled','checked_out'].includes(b.status) ? `<button class="btn-action btn-cancel" onclick="BookingController.changeStatus('${b.booking_id}','cancelled')">Huỷ</button>` : ''}
            <button class="btn-action" style="background:rgba(239,68,68,0.12); color:#f87171;" onclick="BookingController.deleteBookingAction('${b.booking_id}')" title="Xoá vĩnh viễn">Xoá</button>
          </div>
        </td>
      </tr>`).join('') || '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:2rem">Không có booking nào</td></tr>';
  }
};

window.BookingsView = BookingsView;
