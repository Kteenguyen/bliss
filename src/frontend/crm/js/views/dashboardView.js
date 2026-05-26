/**
 * BLISS BOUTIQUE CRM — DASHBOARD VIEW (dashboardView.js)
 * Displays KPI metrics, occupancy summaries, and recent activity logs.
 */

export const dashboardView = {
  /**
   * Render View Content
   */
  render(container, controller) {
    const { rooms, bookings, chats, customers } = controller.state;
    
    // 1. Calculate Analytics
    const totalRooms = rooms.length;
    const activeRooms = rooms.filter(r => r.status === 'active');
    const totalActiveRoomsCount = activeRooms.length;

    const todayStr = new Date().toISOString().split('T')[0];
    
    // Helper to check if date spans today
    const isOccupiedToday = (roomId) => {
      return bookings.some(b => 
        b.room_id === roomId && 
        !['cancelled', 'checked_out'].includes(b.status) &&
        (todayStr >= b.check_in_date && todayStr < b.check_out_date)
      );
    };

    const occupiedRoomsCount = activeRooms.filter(r => isOccupiedToday(r.room_id)).length;
    const occupancyRate = totalActiveRoomsCount > 0 ? Math.round((occupiedRoomsCount / totalActiveRoomsCount) * 100) : 0;
    
    // Revenue (Sum of valid bookings)
    const validBookings = bookings.filter(b => ['confirmed', 'checked_in', 'checked_out'].includes(b.status));
    const totalRevenue = validBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);

    // Bookings Status Counts
    const activeBookingsCount = bookings.filter(b => ['confirmed', 'checked_in'].includes(b.status)).length;
    
    // Check-ins / Check-outs today
    const checkinsToday = bookings.filter(b => b.check_in_date === todayStr && b.status !== 'cancelled').length;
    const checkoutsToday = bookings.filter(b => b.check_out_date === todayStr && b.status !== 'cancelled').length;

    // Chat alerts (active chats that are not IDLE)
    const activeChatsCount = chats.filter(c => c.state !== 'IDLE').length;

    // Format currency
    const fmtCurrency = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    // 2. Render Page Frame
    container.innerHTML = `
      <div class="page-title-area animate-fade-in">
        <h1 class="page-title">Hệ Thống <span>Bliss Dashboard</span></h1>
        <p class="page-subtitle">Tổng quan trạng thái hoạt động thực tế đồng bộ từ Google Sheets</p>
      </div>

      <!-- KPI Grid -->
      <div class="kpi-grid animate-fade-in" style="animation-delay: 0.05s;">
        <!-- Occupancy Rate Card -->
        <div class="glass-card kpi-card kpi-indigo">
          <div class="kpi-header">
            <span class="kpi-label">Công Suất Phòng</span>
            <span class="kpi-icon">📊</span>
          </div>
          <div class="kpi-value">${occupancyRate}%</div>
          <div class="kpi-subtext">Đang ở: ${occupiedRoomsCount} / ${totalActiveRoomsCount} phòng hoạt động</div>
          <div class="kpi-progress">
            <div class="kpi-progress-bar indigo" style="width: ${occupancyRate}%"></div>
          </div>
        </div>

        <!-- Revenue Card -->
        <div class="glass-card kpi-card kpi-emerald">
          <div class="kpi-header">
            <span class="kpi-label">Tổng Doanh Thu</span>
            <span class="kpi-icon">💰</span>
          </div>
          <div class="kpi-value" style="font-size: 1.55rem; padding-top: 0.2rem;">${fmtCurrency(totalRevenue)}</div>
          <div class="kpi-subtext">Từ ${validBookings.length} booking thành công</div>
        </div>

        <!-- Active Bookings Card -->
        <div class="glass-card kpi-card kpi-pink">
          <div class="kpi-header">
            <span class="kpi-label">Bookings Active</span>
            <span class="kpi-icon">📅</span>
          </div>
          <div class="kpi-value">${activeBookingsCount}</div>
          <div class="kpi-subtext">Tổng đặt phòng đang hiệu lực</div>
        </div>

        <!-- Checkins / Checkouts Today Card -->
        <div class="glass-card kpi-card kpi-amber">
          <div class="kpi-header">
            <span class="kpi-label">Lịch Hôm Nay</span>
            <span class="kpi-icon">🔑</span>
          </div>
          <div class="kpi-value" style="font-size: 1.6rem;">👉 ${checkinsToday} CI / ${checkoutsToday} CO</div>
          <div class="kpi-subtext">Nhận phòng CI / Trả phòng CO</div>
        </div>
      </div>

      <!-- Main Columns Layout -->
      <div class="dashboard-split-layout animate-fade-in" style="animation-delay: 0.1s;">
        <!-- Left Side: Recent Bookings -->
        <div class="glass-card" style="padding: 1.5rem;">
          <div class="panel-header">
            <h3 class="panel-title">📋 Đặt Phòng Mới Gần Đây</h3>
            <button class="btn btn-secondary btn-sm" id="btn-dash-go-bookings">Xem tất cả →</button>
          </div>

          <div class="table-responsive">
            <table class="crm-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Khách Hàng</th>
                  <th>Phòng / Chi Nhánh</th>
                  <th>Ngày Nhận/Trả</th>
                  <th>Tổng Tiền</th>
                  <th>Trạng Thái</th>
                </tr>
              </thead>
              <tbody id="dash-bookings-tbody">
                <!-- Injected below -->
              </tbody>
            </table>
          </div>
        </div>

        <!-- Right Side: Branch Capacity & Action Hub -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          <!-- Branch Capacity Stats -->
          <div class="glass-card">
            <h3 class="panel-title" style="margin-bottom: 1rem;">📍 Công Suất Chi Nhánh</h3>
            <div id="dash-branch-stats" style="display: flex; flex-direction: column; gap: 1rem;">
              <!-- Injected below -->
            </div>
          </div>

          <!-- Quick Console Alerts -->
          <div class="glass-card">
            <h3 class="panel-title" style="margin-bottom: 0.8rem;">🚨 Thông Báo Đang Chờ</h3>
            <div style="display: flex; flex-direction: column; gap: 0.75rem;">
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem; background: rgba(255,255,255,0.03); border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span>💬</span>
                  <span style="font-size: 0.82rem; font-weight: 600;">Hội thoại chatbot chờ CSKH</span>
                </div>
                <span class="badge ${activeChatsCount > 0 ? 'badge-danger' : 'badge-success'}">${activeChatsCount} chat</span>
              </div>
              
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem; background: rgba(255,255,255,0.03); border-radius: 6px; border: 1px solid rgba(255,255,255,0.05);">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                  <span>💎</span>
                  <span style="font-size: 0.82rem; font-weight: 600;">Danh sách VIP Khách hàng</span>
                </div>
                <span class="badge badge-info">${customers.length} VIPs</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // 3. Inject Recent Bookings Rows
    const tbody = document.getElementById('dash-bookings-tbody');
    const recentBookings = bookings.slice(0, 5);

    if (recentBookings.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Không có dữ liệu đặt phòng nào.</td></tr>`;
    } else {
      tbody.innerHTML = recentBookings.map(b => {
        let statusBadgeClass = 'badge-info';
        let statusLabel = b.status;
        
        if (b.status === 'confirmed') { statusBadgeClass = 'badge-success'; statusLabel = 'Xác nhận'; }
        else if (b.status === 'checked_in') { statusBadgeClass = 'badge-info'; statusLabel = 'Đang ở'; }
        else if (b.status === 'checked_out') { statusBadgeClass = 'badge-success'; statusLabel = 'Đã trả'; }
        else if (b.status === 'cancelled') { statusBadgeClass = 'badge-danger'; statusLabel = 'Đã hủy'; }

        // Short date formats
        const fmtShortDate = (dateStr) => {
          const d = new Date(dateStr);
          return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        };

        return `
          <tr>
            <td><strong>#${b.booking_id}</strong></td>
            <td>
              <div style="font-weight: 600;">${b.customer_name}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">${b.customer_phone}</div>
            </td>
            <td>
              <div style="font-weight: 600;">${b.room_name}</div>
              <div style="font-size: 0.72rem; color: var(--text-muted);">${b.branch_name || b.branch}</div>
            </td>
            <td>
              <span>${fmtShortDate(b.check_in_date)}</span> 
              <span style="color: var(--text-inactive);">➔</span> 
              <span>${fmtShortDate(b.check_out_date)}</span>
            </td>
            <td><strong>${fmtCurrency(b.total_price || 0)}</strong></td>
            <td><span class="badge ${statusBadgeClass}">${statusLabel}</span></td>
          </tr>
        `;
      }).join('');
    }

    // 4. Inject Branch Capacity Bars
    const branchContainer = document.getElementById('dash-branch-stats');
    
    // Group rooms by branch dynamically
    const branches = {};
    activeRooms.forEach(r => {
      const branchKey = r.branch;
      if (!branches[branchKey]) {
        branches[branchKey] = { name: r.branch_name || branchKey, total: 0, occupied: 0 };
      }
      branches[branchKey].total++;
      if (isOccupiedToday(r.room_id)) {
        branches[branchKey].occupied++;
      }
    });

    if (Object.keys(branches).length === 0) {
      branchContainer.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 0.8rem; padding: 1rem 0;">Không có chi nhánh nào hoạt động</div>`;
    } else {
      branchContainer.innerHTML = Object.keys(branches).map(key => {
        const b = branches[key];
        const rate = b.total > 0 ? Math.round((b.occupied / b.total) * 100) : 0;
        return `
          <div>
            <div style="display: flex; justify-content: space-between; font-size: 0.82rem; margin-bottom: 0.25rem;">
              <span style="font-weight: 600;">${b.name}</span>
              <span style="color: var(--text-muted);">${b.occupied}/${b.total} phòng (${rate}%)</span>
            </div>
            <div style="width: 100%; height: 8px; background: rgba(255,255,255,0.06); border-radius: 4px; overflow: hidden;">
              <div style="width: ${rate}%; height: 100%; background: linear-gradient(90deg, var(--primary), var(--primary-light)); border-radius: 4px;"></div>
            </div>
          </div>
        `;
      }).join('');
    }

    // Bind navigation buttons
    document.getElementById('btn-dash-go-bookings')?.addEventListener('click', () => {
      controller.switchView('bookings');
    });
  }
};
