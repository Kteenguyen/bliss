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

    if (statBookings) statBookings.textContent = stats.activeBookings;
    if (statRevenue) statRevenue.textContent = UTIL.fmtPrice(stats.revenue);
    if (statOccupancy) statOccupancy.textContent = stats.occupancyRate + '%';
    if (statCheckin) statCheckin.textContent = stats.checkinTomorrow;

    // Occupancy bar
    const bar = document.getElementById('occupancy-bar');
    if (bar) bar.style.width = stats.occupancyRate + '%';

    // Branch breakdown
    const branches = ['da_lat', 'hoi_an', 'nha_trang'];
    const branchNames = { da_lat: '🏔️ Đà Lạt', hoi_an: '🏮 Hội An', nha_trang: '🌊 Nha Trang' };
    const branchEl = document.getElementById('branch-stats');
    if (branchEl) {
      branchEl.innerHTML = branches.map(b => `
        <div class="branch-stat">
          <span class="branch-name">${branchNames[b]}</span>
          <div class="branch-bar-wrap">
            <div class="branch-bar" style="width:${Math.round((stats.byBranch[b] / 2) * 100)}%"></div>
          </div>
          <span class="branch-count">${stats.byBranch[b]}/2 phòng</span>
        </div>`).join('');
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
