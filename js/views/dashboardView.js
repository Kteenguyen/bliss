// ============================================================
// dashboardView.js — View component for metrics & KPI logs
// ============================================================

const DashboardView = {
  render() {
    const stats = DB.getStats();

    // KPI cards
    const statBookings = document.getElementById('stat-bookings');
    const statRevenue = document.getElementById('stat-revenue');
    const statOccupancy = document.getElementById('stat-occupancy');
    const statCheckin = document.getElementById('stat-checkin');
    const statCheckout = document.getElementById('stat-checkout');
    const statTotalBookings = document.getElementById('stat-total-bookings');
    const statTotalRooms = document.getElementById('stat-total-rooms');

    if (statBookings) statBookings.textContent = stats.activeBookings;
    if (statRevenue) statRevenue.textContent = UTIL.fmtPrice(stats.revenue);
    if (statOccupancy) statOccupancy.textContent = stats.occupancyRate + '%';
    if (statCheckin) statCheckin.textContent = stats.checkinTomorrow;
    if (statCheckout) statCheckout.textContent = stats.checkoutToday;
    if (statTotalBookings) statTotalBookings.textContent = stats.totalBookings + ' booking';
    if (statTotalRooms) statTotalRooms.textContent = stats.totalRooms + ' phòng';

    // Occupancy bar
    const bar = document.getElementById('occupancy-bar');
    if (bar) bar.style.width = stats.occupancyRate + '%';

    // Branch breakdown — use actual roomsPerBranch counts
    const branches = ['da_lat', 'hoi_an', 'nha_trang'];
    const branchNames = { da_lat: '🏔️ Đà Lạt', hoi_an: '🏮 Hội An', nha_trang: '🌊 Nha Trang' };
    const branchEl = document.getElementById('branch-stats');
    if (branchEl) {
      branchEl.innerHTML = branches.map(b => {
        const total = stats.roomsPerBranch[b] || 1;
        const active = stats.byBranch[b] || 0;
        const pct = Math.round((active / total) * 100);
        return `
        <div class="branch-stat">
          <span class="branch-name">${branchNames[b]}</span>
          <div class="branch-bar-wrap">
            <div class="branch-bar" style="width:${pct}%"></div>
          </div>
          <span class="branch-count">${active}/${total} phòng</span>
        </div>`;
      }).join('');
    }

    // Recent bookings
    const recentEl = document.getElementById('recent-bookings');
    if (recentEl) {
      const recent = DB.getBookings().slice(0, 5);
      recentEl.innerHTML = recent.map(b => `
        <div class="recent-row">
          <div class="recent-info">
            <span class="recent-id">#${b.booking_id}</span>
            <span class="recent-name">${b.customer_name}</span>
            <span class="recent-room">${b.room_name}</span>
            ${b.special_requests ? `<span title="${b.special_requests}" style="font-size:0.68rem;color:#fbbf24;cursor:help;">📝</span>` : ''}
          </div>
          <div class="recent-right">
            ${UTIL.statusBadge(b.status)}
            <span class="recent-price">${UTIL.fmtPrice(b.total_price)}</span>
          </div>
        </div>`).join('');
    }

    this.renderActivity();
  },

  renderActivity() {
    const el = document.getElementById('activity-feed');
    if (!el) return;
    const acts = DB.getActivity().slice(0, 10);
    el.innerHTML = acts.map(a => `
      <div class="activity-item activity-${a.color}">
        <div class="activity-dot"></div>
        <div class="activity-content">
          <p class="activity-msg">${a.msg}</p>
          <span class="activity-time">${UTIL.timeAgo(a.time)}</span>
        </div>
      </div>`).join('');
  }
};

window.DashboardView = DashboardView;
