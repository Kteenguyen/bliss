// ============================================================
// appController.js — Unified Orchestrator & App Entrypoint
// ============================================================

function getBotUrl() {
  const localSettings = JSON.parse(localStorage.getItem('bliss_settings') || '{}');
  let url = localSettings.bot_url || 'http://localhost:3000';
  if (url.endsWith('/')) url = url.slice(0, -1);
  return url;
}

const AppController = {
  // ─── SERVER SYNC LOGIC ──────────────────────────────────────
  async pushToServer() {
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
  },

  async syncWithServer() {
    // Update sync status UI
    const syncIcon = document.getElementById('sync-status-icon');
    const syncText = document.getElementById('sync-status-text');
    if (syncIcon) syncIcon.textContent = '⏳';
    if (syncText) syncText.textContent = 'Đang đồng bộ...';
    try {
      const botUrl = getBotUrl();
      const res = await fetch(`${botUrl}/api/db`);
      if (!res.ok) throw new Error('Server không phản hồi');
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
        if (serverSettings.webhook_chatbot && !localSettings.webhook_chatbot) {
          localSettings.webhook_chatbot = serverSettings.webhook_chatbot;
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
      
      // Merge bookings
      if (serverData.bliss_bookings) {
        const serverBookings = JSON.parse(serverData.bliss_bookings);
        const localBookings = JSON.parse(localStorage.getItem('bliss_bookings') || '[]');
        const mergedBookings = [...localBookings];
        serverBookings.forEach(sb => {
          const idx = mergedBookings.findIndex(lb => lb.booking_id === sb.booking_id);
          if (idx >= 0) {
            mergedBookings[idx] = sb; 
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
      
      await this.pushToServer();
      
      // Re-render active views
      this.refreshCurrentView();

      // Update sync status UI — success
      if (syncIcon) syncIcon.textContent = '✅';
      if (syncText) syncText.textContent = 'Đã đồng bộ';
      setTimeout(() => {
        if (syncIcon) syncIcon.textContent = '🔄';
        if (syncText) syncText.textContent = 'Đồng bộ bot server';
      }, 3000);
    } catch (e) {
      console.warn('⚠️ Không thể kết nối với bot server cục bộ:', e.message);
      // Update sync status UI — offline
      if (syncIcon) syncIcon.textContent = '⚡';
      if (syncText) syncText.textContent = 'Bot offline (demo local)';
      setTimeout(() => {
        if (syncIcon) syncIcon.textContent = '🔄';
        if (syncText) syncText.textContent = 'Đồng bộ bot server';
      }, 4000);
    }
  },

  // ─── NAVIGATION ─────────────────────────────────────────────
  navigateTo(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const viewEl = document.getElementById(`view-${view}`);
    const navEl = document.querySelector(`.nav-item[data-view="${view}"]`);
    if (viewEl) viewEl.classList.add('active');
    if (navEl) navEl.classList.add('active');

    // Render active view
    switch (view) {
      case 'dashboard': DashboardView.render(); break;
      case 'rooms': RoomsView.render(); break;
      case 'bookings': BookingsView.render(); break;
      case 'customer': CustomerView.render(); break;
      case 'automation': AUTOMATION.init(); break;
      case 'settings': SettingsView.render(); break;
    }

    // Mobile: close sidebar
    document.getElementById('sidebar').classList.remove('open');
  },

  refreshCurrentView() {
    const activeViewEl = document.querySelector('.view.active');
    if (!activeViewEl) return;
    const viewId = activeViewEl.id.replace('view-', '');
    switch (viewId) {
      case 'dashboard': DashboardView.render(); break;
      case 'rooms': RoomsView.render(); break;
      case 'bookings': BookingsView.render(); break;
      case 'customer': CustomerView.render(); break;
      case 'settings': SettingsView.render(); break;
    }
  },

  setupSidebar() {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', () => this.navigateTo(el.dataset.view));
    });
    document.getElementById('menu-toggle')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });
  },

  // ─── QUICK THEME TOGGLE ─────────────────────────────────────
  quickToggleTheme() {
    const isLight = document.body.classList.toggle('light-beige');
    const theme = isLight ? 'light-beige' : 'dark';
    // Persist to settings
    const s = DB.getSettings();
    s.theme = theme;
    DB.saveSettings(s);
    // Sync the Settings page dropdown if visible
    const dropdown = document.getElementById('settings-theme');
    if (dropdown) dropdown.value = theme;
    // Update toggle button UI
    this.updateThemeToggleUI(isLight);
    AppController.pushToServer();
  },

  updateThemeToggleUI(isLight) {
    const icon = document.getElementById('theme-toggle-icon');
    const label = document.getElementById('theme-toggle-label');
    const btn = document.getElementById('btn-quick-theme-toggle');
    if (!icon || !label || !btn) return;
    if (isLight) {
      icon.textContent = '☀️';
      label.textContent = 'Light Mode';
      btn.style.background = 'rgba(150,114,75,0.12)';
      btn.style.borderColor = 'rgba(150,114,75,0.3)';
      btn.style.color = '#96724b';
    } else {
      icon.textContent = '🌙';
      label.textContent = 'Dark Mode';
      btn.style.background = 'rgba(255,255,255,0.05)';
      btn.style.borderColor = 'rgba(255,255,255,0.1)';
      btn.style.color = '';
    }
  }
};

// ─── TOAST helper ────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}

// ─── INIT ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  DB.init();
  
  // Apply saved theme
  const settings = DB.getSettings();
  if (settings.theme === 'light-beige') {
    document.body.classList.add('light-beige');
    AppController.updateThemeToggleUI(true);
  } else {
    document.body.classList.remove('light-beige');
    AppController.updateThemeToggleUI(false);
  }

  AppController.navigateTo('dashboard');
  AppController.setupSidebar();
  
  // Setup Controllers
  ChatController.setupChat();
  SettingsController.setupSettings();
  AUTOMATION.init();
  
  // Background logs updates
  setInterval(() => { 
    if (document.getElementById('view-dashboard').classList.contains('active')) {
      DashboardView.renderActivity(); 
    }
  }, 30000);
  
  setInterval(NOTIFICATIONS.render.bind(NOTIFICATIONS), 5000);
  
  // Bind filters
  document.getElementById('room-branch-filter')?.addEventListener('change', () => RoomsView.render());
  document.getElementById('booking-status-filter')?.addEventListener('change', () => BookingsView.render());
  document.getElementById('cust-branch-filter')?.addEventListener('change', () => CustomerView.render());
  document.getElementById('cust-lang-selector')?.addEventListener('change', () => CustomerView.render());

  // Sync server on startup
  AppController.syncWithServer();
});

// Bind globals for backwards HTML markup access
window.AppController = AppController;
window.navigateTo = AppController.navigateTo.bind(AppController);
window.showToast = showToast;
