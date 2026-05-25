// ─── SERVER SYNC LOGIC ──────────────────────────────────────
function getBotUrl() {
  const localSettings = JSON.parse(localStorage.getItem('bliss_settings') || '{}');
  let url = localSettings.bot_url || 'http://localhost:3000';
  if (url.endsWith('/')) url = url.slice(0, -1);
  return url;
}

async function pushToServer() {
  try {
    const botUrl = getBotUrl();
    const data = {
      bliss_rooms: localStorage.getItem('bliss_rooms'),
      bliss_bookings: localStorage.getItem('bliss_bookings'),
      bliss_settings: localStorage.getItem('bliss_settings'),
      bliss_activity: localStorage.getItem('bliss_activity'),
      bliss_counters: localStorage.getItem('bliss_counters')
    };
    await fetch(`${botUrl}/api/db`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  } catch (e) {
    console.warn('⚠️ Không thể đẩy dữ liệu lên bot server:', e.message);
  }
}

async function syncWithServer() {
  try {
    const botUrl = getBotUrl();
    const res = await fetch(`${botUrl}/api/db`);
    if (!res.ok) return;
    const serverData = await res.json();
    
    // Merge settings
    if (serverData.bliss_settings) {
      const serverSettings = JSON.parse(serverData.bliss_settings);
      const localSettings = JSON.parse(localStorage.getItem('bliss_settings') || '{}');
      if (serverSettings.gemini_key && !localSettings.gemini_key) {
        localSettings.gemini_key = serverSettings.gemini_key;
      }
      if (serverSettings.fb_token && !localSettings.fb_token) {
        localSettings.fb_token = serverSettings.fb_token;
      }
      if (serverSettings.fb_pageid && !localSettings.fb_pageid) {
        localSettings.fb_pageid = serverSettings.fb_pageid;
      }
      if (serverSettings.bot_url && !localSettings.bot_url) {
        localSettings.bot_url = serverSettings.bot_url;
      }
      if (serverSettings.webhook_s06 && !localSettings.webhook_s06) {
        localSettings.webhook_s06 = serverSettings.webhook_s06;
      }
      if (serverSettings.webhook_s07 && !localSettings.webhook_s07) {
        localSettings.webhook_s07 = serverSettings.webhook_s07;
      }
      if (serverSettings.webhook_s08 && !localSettings.webhook_s08) {
        localSettings.webhook_s08 = serverSettings.webhook_s08;
      }
      localStorage.setItem('bliss_settings', JSON.stringify(localSettings));
    }
    
    // Merge bookings: server bookings + local bookings (merge by booking_id)
    if (serverData.bliss_bookings) {
      const serverBookings = JSON.parse(serverData.bliss_bookings);
      const localBookings = JSON.parse(localStorage.getItem('bliss_bookings') || '[]');
      const mergedBookings = [...localBookings];
      serverBookings.forEach(sb => {
        const idx = mergedBookings.findIndex(lb => lb.booking_id === sb.booking_id);
        if (idx >= 0) {
          mergedBookings[idx] = sb; // Ghi đè bằng bản server
        } else {
          mergedBookings.unshift(sb);
        }
      });
      localStorage.setItem('bliss_bookings', JSON.stringify(mergedBookings));
    }

    // Merge activities
    if (serverData.bliss_activity) {
      const serverActs = JSON.parse(serverData.bliss_activity);
      const localActs = JSON.parse(localStorage.getItem('bliss_activity') || '[]');
      const mergedActs = [...localActs];
      serverActs.forEach(sa => {
        if (!mergedActs.some(la => la.id === sa.id)) {
          mergedActs.unshift(sa);
        }
      });
      localStorage.setItem('bliss_activity', JSON.stringify(mergedActs.slice(0, 100)));
    }

    // Merge counters
    if (serverData.bliss_counters) {
      const serverCounters = JSON.parse(serverData.bliss_counters);
      const localCounters = JSON.parse(localStorage.getItem('bliss_counters') || '{}');
      const mergedCounters = { ...localCounters };
      if (serverCounters.booking_seq > (localCounters.booking_seq || 0)) {
        mergedCounters.booking_seq = serverCounters.booking_seq;
      }
      if (serverCounters.room_seq > (localCounters.room_seq || 0)) {
        mergedCounters.room_seq = serverCounters.room_seq;
      }
      localStorage.setItem('bliss_counters', JSON.stringify(mergedCounters));
    }
    
    await pushToServer();
    
    // Re-render
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof renderBookings === 'function') renderBookings();
    if (typeof renderRooms === 'function') renderRooms();
    if (typeof renderSettings === 'function') renderSettings();
  } catch (e) {
    console.warn('⚠️ Không thể kết nối với bot server cục bộ:', e.message);
  }
}

// ─── INIT ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  DB.init();
  navigateTo('dashboard');
  setupSidebar();
  setupChat();
  setupSettings();
  AUTOMATION.init();
  setInterval(() => { if (document.getElementById('view-dashboard').classList.contains('active')) renderActivity(); }, 30000);
  setInterval(NOTIFICATIONS.render.bind(NOTIFICATIONS), 5000);
  
  // Tự động đồng bộ với máy chủ chatbot khi khởi động giao diện
  syncWithServer();
});

// ─── NAVIGATION ─────────────────────────────────────────────
function navigateTo(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const viewEl = document.getElementById(`view-${view}`);
  const navEl = document.querySelector(`.nav-item[data-view="${view}"]`);
  if (viewEl) viewEl.classList.add('active');
  if (navEl) navEl.classList.add('active');

  // Render view
  switch (view) {
    case 'dashboard': renderDashboard(); break;
    case 'rooms': renderRooms(); break;
    case 'bookings': renderBookings(); break;
    case 'customer': renderCustomerPortal(); break;
    case 'automation': AUTOMATION.init(); break;
    case 'settings': renderSettings(); break;
  }

  // Mobile: close sidebar
  document.getElementById('sidebar').classList.remove('open');
}

function setupSidebar() {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.view));
  });
  document.getElementById('menu-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });
}

// ─── DASHBOARD ──────────────────────────────────────────────
function renderDashboard() {
  const stats = DB.getStats();

  // KPI cards
  document.getElementById('stat-bookings').textContent = stats.activeBookings;
  document.getElementById('stat-revenue').textContent = UTIL.fmtPrice(stats.revenue);
  document.getElementById('stat-occupancy').textContent = stats.occupancyRate + '%';
  document.getElementById('stat-checkin').textContent = stats.checkinTomorrow;

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

  renderActivity();
}

function renderActivity() {
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

// ─── ROOMS ──────────────────────────────────────────────────
function renderRooms() {
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
        <button class="btn-icon btn-icon-edit" onclick="openEditRoomModal('${r.room_id}')" title="Sửa phòng">✏️</button>
        <button class="btn-icon btn-icon-delete" onclick="deleteRoomAction('${r.room_id}')" title="Xoá phòng">🗑️</button>
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
      <div class="room-amenities">${r.amenities.map(a => `<span class="amenity-tag">${a}</span>`).join('')}</div>
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
}

// ─── ROOM MODAL CRUD WIRING ─────────────────────────────────
function openAddRoomModal() {
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
}

function openEditRoomModal(id) {
  const modal = document.getElementById('room-modal');
  const title = document.getElementById('room-modal-title');
  const r = DB.getRoom(id);
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
}

function closeRoomModal() {
  const modal = document.getElementById('room-modal');
  if (modal) modal.classList.add('hidden');
}

function saveRoom(event) {
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

  closeRoomModal();
  renderRooms();
  renderDashboard();
  if (typeof renderCustomerPortal === 'function') renderCustomerPortal();
  pushToServer();
}

function deleteRoomAction(id) {
  if (confirm('Bạn có chắc chắn muốn xoá phòng này khỏi hệ thống?')) {
    const res = DB.deleteRoom(id, true); // force hard delete for demo
    if (res && res.error) {
      showToast('⚠️ ' + res.error, 'error');
    } else {
      showToast('🗑️ Đã xoá phòng thành công!', 'success');
      renderRooms();
      renderDashboard();
      pushToServer();
    }
  }
}

// ─── BOOKINGS ───────────────────────────────────────────────
function renderBookings() {
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
          ${b.status === 'confirmed' ? `<button class="btn-action btn-checkin" onclick="changeStatus('${b.booking_id}','checked_in')">Check-in</button>` : ''}
          ${b.status === 'checked_in' ? `<button class="btn-action btn-checkout" onclick="changeStatus('${b.booking_id}','checked_out')">Check-out</button>` : ''}
          ${!['cancelled','checked_out'].includes(b.status) ? `<button class="btn-action btn-cancel" onclick="changeStatus('${b.booking_id}','cancelled')">Huỷ</button>` : ''}
          <button class="btn-action" style="background:rgba(239,68,68,0.12); color:#f87171;" onclick="deleteBookingAction('${b.booking_id}')" title="Xoá vĩnh viễn">Xoá</button>
        </div>
      </td>
    </tr>`).join('') || '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:2rem">Không có booking nào</td></tr>';
}

function deleteBookingAction(id) {
  if (confirm('Bạn chắc chắn muốn xoá đặt phòng #' + id + '? Thao tác này không thể hoàn tác.')) {
    DB.deleteBooking(id);
    showToast('🗑️ Đã xoá đặt phòng #' + id, 'success');
    renderBookings();
    renderDashboard();
    pushToServer();
  }
}

// Bind to window for HTML accessibility
window.openAddRoomModal = openAddRoomModal;
window.openEditRoomModal = openEditRoomModal;
window.closeRoomModal = closeRoomModal;
window.saveRoom = saveRoom;
window.deleteRoomAction = deleteRoomAction;
window.deleteBookingAction = deleteBookingAction;

function changeStatus(id, status) {
  DB.updateBookingStatus(id, status);
  const labels = { checked_in: 'đã Check-in', checked_out: 'đã Check-out', cancelled: 'đã Huỷ' };
  DB.addActivity({ type: 'status', msg: `🔄 Booking #${id} ${labels[status] || status}`, color: status === 'cancelled' ? 'red' : 'blue' });
  renderBookings();
  NOTIFICATIONS.sendAlert('🔄 Cập nhật trạng thái', `Booking #${id} ${labels[status]}`, status === 'cancelled' ? 'red' : 'blue');
  pushToServer();
}

// ─── SETTINGS ───────────────────────────────────────────────
function renderSettings() {
  const s = DB.getSettings();
  const el = document.getElementById('settings-gemini-key');
  const pinEl = document.getElementById('settings-pin');
  const fbPageEl = document.getElementById('settings-fb-pageid');
  const fbTokenEl = document.getElementById('settings-fb-token');
  const botUrlEl = document.getElementById('settings-bot-url');
  const s06El = document.getElementById('settings-webhook-s06');
  const s07El = document.getElementById('settings-webhook-s07');
  const s08El = document.getElementById('settings-webhook-s08');
  
  if (el) el.value = s.gemini_key || '';
  if (pinEl) pinEl.value = s.pin_prefix || '6789';
  if (fbPageEl) fbPageEl.value = s.fb_pageid || '';
  if (fbTokenEl) fbTokenEl.value = s.fb_token || '';
  if (botUrlEl) botUrlEl.value = s.bot_url || 'http://localhost:3000';
  if (s06El) s06El.value = s.webhook_s06 || '';
  if (s07El) s07El.value = s.webhook_s07 || '';
  if (s08El) s08El.value = s.webhook_s08 || '';
}

function setupSettings() {
  document.getElementById('btn-save-settings')?.addEventListener('click', async () => {
    const key = document.getElementById('settings-gemini-key')?.value?.trim() || '';
    const pin = document.getElementById('settings-pin')?.value?.trim() || '6789';
    const fbPage = document.getElementById('settings-fb-pageid')?.value?.trim() || '';
    const fbToken = document.getElementById('settings-fb-token')?.value?.trim() || '';
    const botUrl = document.getElementById('settings-bot-url')?.value?.trim() || 'http://localhost:3000';
    const s06 = document.getElementById('settings-webhook-s06')?.value?.trim() || '';
    const s07 = document.getElementById('settings-webhook-s07')?.value?.trim() || '';
    const s08 = document.getElementById('settings-webhook-s08')?.value?.trim() || '';
    
    DB.saveSettings({ 
      gemini_key: key, 
      pin_prefix: pin,
      fb_pageid: fbPage,
      fb_token: fbToken,
      bot_url: botUrl,
      webhook_s06: s06,
      webhook_s07: s07,
      webhook_s08: s08
    });
    showToast('✅ Cài đặt đã được lưu!', 'success');
    await pushToServer();
  });

  document.getElementById('btn-reset-data')?.addEventListener('click', async () => {
    if (confirm('Reset toàn bộ dữ liệu demo? (Rooms và Bookings sẽ về dữ liệu mẫu ban đầu)')) {
      DB.reset();
      CHATBOT.state = 'IDLE';
      CHATBOT.context = {};
      showToast('🔄 Dữ liệu đã được reset!', 'info');
      navigateTo('dashboard');
      await pushToServer();
    }
  });
}

// ─── CHAT SETUP ─────────────────────────────────────────────
function setupChat() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');
  const chatMessages = document.getElementById('chat-messages');

  function sendMessage() {
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, 'user');
    input.value = '';

    // Typing indicator
    const typingId = 'typing-' + Date.now();
    chatMessages.insertAdjacentHTML('beforeend', `
      <div class="msg-wrap msg-bot" id="${typingId}">
        <div class="msg-avatar">🤖</div>
        <div class="msg-bubble typing-indicator"><span></span><span></span><span></span></div>
      </div>`);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    const settings = DB.getSettings();
    const delay = settings.gemini_key ? 1800 : 600;

    setTimeout(async () => {
      document.getElementById(typingId)?.remove();
      await CHATBOT.process(text, addMessage);
      pushToServer();
    }, delay);
  }

  sendBtn?.addEventListener('click', sendMessage);
  input?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });

  // Quick reply chips
  document.querySelectorAll('.quick-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      input.value = chip.textContent;
      sendMessage();
    });
  });

  // Welcome message
  setTimeout(() => {
    addMessage('Xin chào! 👋 Mình là **Bliss AI Assistant**.\n\nHãy thử hỏi mình:\n• "Còn phòng ở Đà Lạt cuối tuần này không?"\n• "Giá phòng 2 người từ 28/6 đến 30/6 ở Hội An"\n• "Mã cửa check-in"\n• "Wifi homestay là gì"\n\n*AI hoạt động offline, không cần API key!* 🎉', 'bot', 'info');
  }, 500);
}

function addMessage(text, role, type = '') {
  const chatMessages = document.getElementById('chat-messages');
  if (!chatMessages) return;

  const isBot = role === 'bot';
  const typeClass = type ? `msg-type-${type}` : '';

  // Convert **bold** markdown và ẩn đi dữ liệu BOOKING_DATA JSON
  const formattedText = text
    .replace(/<!-- BOOKING_DATA:[\s\S]*?-->/g, '')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');

  const html = `
    <div class="msg-wrap ${isBot ? 'msg-bot' : 'msg-user'} ${typeClass}">
      ${isBot ? '<div class="msg-avatar">🤖</div>' : ''}
      <div class="msg-bubble">
        <div class="msg-text">${formattedText}</div>
        <div class="msg-time">${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
    </div>`;

  chatMessages.insertAdjacentHTML('beforeend', html);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  // Log activity for booking-related messages
  if (type === 'success' || type === 'quote') {
    DB.addActivity({ type: 'message', msg: `💬 Bot: ${text.substring(0, 50).replace(/<[^>]+>/g, '')}...`, color: type === 'success' ? 'green' : 'purple' });
  }
}

// ─── TOAST ──────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}

// ─── FILTER EVENTS ──────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('room-branch-filter')?.addEventListener('change', renderRooms);
  document.getElementById('booking-status-filter')?.addEventListener('change', renderBookings);
  document.getElementById('cust-branch-filter')?.addEventListener('change', renderCustomerPortal);
});

// ============================================================
// Dozy Home Customer Portal Controllers
// ============================================================
let activeCustRoom = null;
let activeCustDate = '';
let selectedCustSlots = [];
let currentSlideIndex = 0;

const DOZY_SLOTS = [
  { id: '10:00 - 13:00', label: '10:00 - 13:00', type: 'day' },
  { id: '13:30 - 16:30', label: '13:30 - 16:30', type: 'day' },
  { id: '17:00 - 20:00', label: '17:00 - 20:00', type: 'day' },
  { id: '20:30 - 09:30', label: '20:30 - 09:30', type: 'night' }
];

function renderCustomerPortal() {
  const branch = document.getElementById('cust-branch-filter')?.value || 'da_lat';
  const rooms = DB.getRoomsByBranch(branch).filter(r => r.status === 'active');
  const container = document.getElementById('cust-rooms-list');
  if (!container) return;

  if (rooms.length === 0) {
    container.innerHTML = `<div style="text-align:center; color:var(--text-muted); padding:3rem;">Chưa có phòng hoạt động tại chi nhánh này.</div>`;
    return;
  }

  container.innerHTML = rooms.map(r => {
    const mainImage = r.images[0] || 'images/room_1_main.png';
    const subImage1 = r.images[1] || 'images/room_1_bath.png';
    const subImage2 = r.images[2] || r.images[0] || 'images/room_1_main.png';

    const priceK = Math.round(r.hourly_price_day / 1000) + 'k';

    const amenityIcons = {
      'Bếp tự nấu': '🍳',
      'Máy chiếu': '📽️',
      'Sofa bàn trà': '🛋️',
      'Bồn tắm': '🛁',
      'Board game': '🎲',
      'Tủ lạnh': '🍦',
      'NVS riêng': '🚽',
      'Gương lớn': '🪞',
      'WiFi': '📶',
      'Wifi': '📶'
    };

    const amenitiesHtml = (r.amenities || []).map(a => `
      <div class="cust-amenity-item">
        <span class="cust-amenity-icon">${amenityIcons[a] || '✨'}</span>
        <span>${a}</span>
      </div>
    `).join('');

    return `
      <div class="cust-room-card">
        <!-- Collage Container (Left) -->
        <div class="cust-collage-container">
          <div class="cust-collage-main">
            <img src="${mainImage}" alt="${r.room_name} main" />
          </div>
          <div class="cust-collage-subs">
            <div class="cust-collage-sub">
              <img src="${subImage1}" alt="${r.room_name} sub 1" />
            </div>
            <div class="cust-collage-sub">
              <img src="${subImage2}" alt="${r.room_name} sub 2" />
            </div>
          </div>
        </div>
        
        <!-- Room Details (Right) -->
        <div class="cust-room-details">
          <div>
            <h2 class="cust-room-title">${r.emoji || '🏠'} ${r.room_name}</h2>
            <div class="cust-room-price">Giá chỉ từ ${priceK}/3h</div>
            <div class="cust-room-amenities">
              ${amenitiesHtml}
            </div>
          </div>
          <button class="cust-book-now-btn" onclick="openCustBookingModal('${r.room_id}')">ĐẶT NGAY ➔</button>
        </div>
      </div>
    `;
  }).join('');
}

function openCustBookingModal(roomId) {
  const r = DB.getRoom(roomId);
  if (!r) return;

  activeCustRoom = r;
  selectedCustSlots = [];

  // Update modal title
  document.getElementById('cust-modal-room-name').textContent = r.room_name;

  // Render carousel slide photos
  const slidesContainer = document.getElementById('cust-modal-slides');
  const dotsContainer = document.getElementById('cust-modal-dots');
  if (slidesContainer && dotsContainer) {
    const imgs = r.images && r.images.length > 0 ? r.images : ['images/room_1_main.png', 'images/room_1_bath.png', 'images/room_1_main.png'];
    slidesContainer.innerHTML = imgs.map(img => `
      <div class="cust-modal-slide" style="min-width:100%; height:100%; position:relative;">
        <img src="${img}" style="width:100%; height:100%; object-fit:cover; display:block;" />
      </div>
    `).join('');

    dotsContainer.innerHTML = imgs.map((_, idx) => `
      <span class="cust-dot ${idx === 0 ? 'active' : ''}" onclick="goToSlide(${idx})"></span>
    `).join('');
  }

  currentSlideIndex = 0;
  updateCarouselUI();

  // Price banner
  const banner = document.getElementById('cust-modal-price-banner');
  if (banner) {
    banner.textContent = `GIÁ CHỈ TỪ ${UTIL.fmtPrice(r.hourly_price_day)}/3H`;
  }

  // Setup date picker carousel
  const datesContainer = document.getElementById('cust-modal-dates-container');
  if (datesContainer) {
    const dates = generateCustDates();
    activeCustDate = dates[0].dateStr; // default to today
    datesContainer.innerHTML = dates.map((d, idx) => `
      <button type="button" class="cust-date-btn ${idx === 0 ? 'active' : ''}" id="cust-date-btn-${d.dateStr}" onclick="selectCustDate('${d.dateStr}')">
        <div class="cust-date-header">${d.headerText}</div>
        <div class="cust-date-body">${d.bodyText}</div>
      </button>
    `).join('');
  }

  renderCustSlots();

  // Reset fields & checklist
  document.getElementById('cust-book-name').value = '';
  document.getElementById('cust-book-phone').value = '';
  updateCustSummary();

  document.getElementById('cust-booking-modal').classList.remove('hidden');
}

function closeCustBookingModal() {
  document.getElementById('cust-booking-modal').classList.add('hidden');
}

function selectCustDate(dateStr) {
  activeCustDate = dateStr;

  document.querySelectorAll('.cust-date-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`cust-date-btn-${dateStr}`)?.classList.add('active');

  selectedCustSlots = [];

  renderCustSlots();
  updateCustSummary();
}

function renderCustSlots() {
  const grid = document.getElementById('cust-modal-slots-grid');
  if (!grid || !activeCustRoom) return;

  grid.innerHTML = DOZY_SLOTS.map(slot => {
    const isBooked = isSlotBooked(activeCustRoom.room_id, activeCustDate, slot.id);
    const isSelected = selectedCustSlots.includes(slot.id);
    const price = slot.type === 'day' ? activeCustRoom.hourly_price_day : activeCustRoom.hourly_price_night;

    let cls = 'available';
    let disabledAttr = '';
    if (isBooked) {
      cls = 'booked';
      disabledAttr = 'disabled';
    } else if (isSelected) {
      cls = 'selected';
    }

    return `
      <button type="button" class="cust-slot-btn ${cls}" ${disabledAttr} onclick="toggleCustSlot('${slot.id}')">
        <div class="cust-slot-time">${slot.label}</div>
        <div class="cust-slot-price">${UTIL.fmtPrice(price)}</div>
      </button>
    `;
  }).join('');
}

function isSlotBooked(roomId, dateStr, slotId) {
  const bookings = DB.getBookings().filter(b => 
    b.room_id === roomId && 
    b.check_in_date === dateStr && 
    !['cancelled', 'checked_out'].includes(b.status)
  );
  
  return bookings.some(b => {
    const reqs = b.special_requests || '';
    return reqs.includes(slotId);
  });
}

function toggleCustSlot(slotId) {
  const idx = selectedCustSlots.indexOf(slotId);
  if (idx >= 0) {
    selectedCustSlots.splice(idx, 1);
  } else {
    selectedCustSlots.push(slotId);
  }

  renderCustSlots();
  updateCustSummary();
}

function updateCustSummary() {
  if (!activeCustRoom) return;

  const count = selectedCustSlots.length;
  let subtotal = 0;

  selectedCustSlots.forEach(slotId => {
    const slot = DOZY_SLOTS.find(s => s.id === slotId);
    if (slot) {
      subtotal += slot.type === 'day' ? activeCustRoom.hourly_price_day : activeCustRoom.hourly_price_night;
    }
  });

  const discount = count >= 2 ? Math.round(subtotal * 0.1) : 0;
  const total = subtotal - discount;

  document.getElementById('cust-summary-slots-count').textContent = `${count} khung`;
  document.getElementById('cust-summary-discount').textContent = `-${UTIL.fmtPrice(discount)}`;
  document.getElementById('cust-summary-total').textContent = UTIL.fmtPrice(total);
}

function submitCustBooking(event) {
  event.preventDefault();
  if (!activeCustRoom) return;

  if (selectedCustSlots.length === 0) {
    showToast('⚠️ Vui lòng chọn ít nhất một khung giờ!', 'error');
    return;
  }

  const name = document.getElementById('cust-book-name').value.trim();
  const phone = document.getElementById('cust-book-phone').value.trim();

  if (!name || !phone) {
    showToast('⚠️ Vui lòng điền đầy đủ tên và số điện thoại!', 'error');
    return;
  }

  let subtotal = 0;
  selectedCustSlots.forEach(slotId => {
    const slot = DOZY_SLOTS.find(s => s.id === slotId);
    if (slot) {
      subtotal += slot.type === 'day' ? activeCustRoom.hourly_price_day : activeCustRoom.hourly_price_night;
    }
  });

  const discount = selectedCustSlots.length >= 2 ? Math.round(subtotal * 0.1) : 0;
  const totalPrice = subtotal - discount;
  const slotsStr = selectedCustSlots.join(', ');

  const bookingData = {
    customer_name: name,
    customer_phone: phone,
    customer_fb_id: 'cust_web_' + Date.now(),
    branch: activeCustRoom.branch,
    branch_name: activeCustRoom.branch_name,
    room_id: activeCustRoom.room_id,
    room_name: activeCustRoom.room_name,
    check_in_date: activeCustDate,
    check_out_date: activeCustDate, // Same check-out date for single day hourly booking
    num_guests: 2,
    total_price: totalPrice,
    status: 'confirmed',
    special_requests: `Đặt giờ Dozy Home: Khung giờ [ ${slotsStr} ]`,
    source: 'website'
  };

  const booking = DB.createBooking(bookingData);
  if (booking) {
    showToast('🎉 Đặt phòng thành công! Lịch phòng đã được cập nhật.', 'success');
    
    if (typeof NOTIFICATIONS !== 'undefined' && typeof NOTIFICATIONS.sendAlert === 'function') {
      NOTIFICATIONS.sendAlert(
        '🎉 Đặt giờ Dozy Home', 
        `Khách ${name} đã đặt phòng ${activeCustRoom.room_name} (${activeCustRoom.branch_name}) các khung: ${slotsStr}`, 
        'green'
      );
    }

    closeCustBookingModal();
    pushToServer();
    
    renderCustomerPortal();
    if (typeof renderBookings === 'function') renderBookings();
    if (typeof renderDashboard === 'function') renderDashboard();
  } else {
    showToast('❌ Đặt phòng không thành công, vui lòng thử lại.', 'error');
  }
}

// Helper date generator
function generateCustDates() {
  const dates = [];
  const daysOfWeek = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split('T')[0];
    
    let headerText = daysOfWeek[d.getDay()];
    if (i === 0) headerText = 'Hôm nay';
    
    const parts = dateStr.split('-');
    const bodyText = `${parts[2]}/${parts[1]}`;
    
    dates.push({ dateStr, headerText, bodyText });
  }
  return dates;
}

// Carousel controls
function slidePrev() {
  const slides = document.querySelectorAll('.cust-modal-slide');
  if (slides.length <= 1) return;
  currentSlideIndex = (currentSlideIndex - 1 + slides.length) % slides.length;
  updateCarouselUI();
}

function slideNext() {
  const slides = document.querySelectorAll('.cust-modal-slide');
  if (slides.length <= 1) return;
  currentSlideIndex = (currentSlideIndex + 1) % slides.length;
  updateCarouselUI();
}

function goToSlide(index) {
  currentSlideIndex = index;
  updateCarouselUI();
}

function updateCarouselUI() {
  const container = document.getElementById('cust-modal-slides');
  if (!container) return;
  container.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
  
  const dots = document.querySelectorAll('#cust-modal-dots .cust-dot');
  dots.forEach((dot, idx) => {
    if (idx === currentSlideIndex) dot.classList.add('active');
    else dot.classList.remove('active');
  });
}

// Horizontal scroll buttons
function scrollDatesLeft() {
  const container = document.getElementById('cust-modal-dates-container');
  if (container) container.scrollLeft -= 150;
}

// Horizontal scroll buttons
function scrollDatesRight() {
  const container = document.getElementById('cust-modal-dates-container');
  if (container) container.scrollLeft += 150;
}

// Bind to window for HTML accessibility
window.openCustBookingModal = openCustBookingModal;
window.closeCustBookingModal = closeCustBookingModal;
window.selectCustDate = selectCustDate;
window.toggleCustSlot = toggleCustSlot;
window.submitCustBooking = submitCustBooking;
window.slidePrev = slidePrev;
window.slideNext = slideNext;
window.goToSlide = goToSlide;
window.scrollDatesLeft = scrollDatesLeft;
window.scrollDatesRight = scrollDatesRight;
window.renderCustomerPortal = renderCustomerPortal;

