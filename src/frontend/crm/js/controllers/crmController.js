/**
 * BLISS BOUTIQUE CRM — MAIN CONTROLLER (crmController.js)
 * Manages routing, authentication state, API communication, and dynamic modals.
 */

import { dashboardView } from '../views/dashboardView.js';
import { bookingsView } from '../views/bookingsView.js';
import { roomsView } from '../views/roomsView.js';
import { customersView } from '../views/customersView.js';
import { chatLogsView } from '../views/chatLogsView.js';
import { settingsView } from '../views/settingsView.js';

export const crmController = {
  // Application State
  state: {
    token: localStorage.getItem('crm_jwt_token') || '',
    username: localStorage.getItem('crm_username') || '',
    rooms: [],
    bookings: [],
    customers: [],
    chats: [],
    chatLogs: [],
    syncStatus: 'synced', // synced, syncing, error
    activeView: 'dashboard'
  },

  // Views Map
  views: {
    dashboard: dashboardView,
    bookings: bookingsView,
    rooms: roomsView,
    customers: customersView,
    chat: chatLogsView,
    settings: settingsView
  },

  /**
   * Initialize CRM Application
   */
  init() {
    console.log('[crmController] Initializing controller...');
    
    // Bind Event Listeners
    this.bindEvents();
    
    // Start live clock
    this.startClock();
    
    // Check Auth State
    this.checkAuthentication();
  },

  /**
   * Bind static global UI elements
   */
  bindEvents() {
    // Login form submission
    const loginForm = document.getElementById('crm-login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Logout trigger
    const logoutBtn = document.getElementById('btn-logout-trigger');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    // Sidebar navigation tabs
    const navItems = document.querySelectorAll('.sidebar-menu .nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const viewName = item.getAttribute('data-view');
        this.switchView(viewName);
      });
    });

    // Global refresh button
    const refreshBtn = document.getElementById('btn-global-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.showToast('Đang làm mới toàn bộ dữ liệu...', 'info');
        this.loadData();
      });
    }

    // Global modal close triggers
    const modalCloseBtn = document.getElementById('modal-close-trigger');
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', () => this.closeModal());
    }
    const modalOverlay = document.getElementById('crm-global-modal');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) this.closeModal();
      });
    }
  },

  /**
   * Digital Clock on Header
   */
  startClock() {
    const clockDisplay = document.getElementById('header-clock-display');
    if (!clockDisplay) return;

    const updateClock = () => {
      const now = new Date();
      clockDisplay.textContent = now.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
    };
    updateClock();
    setInterval(updateClock, 1000);
  },

  /**
   * Verify JWT exists, then toggle overlay vs app viewport
   */
  checkAuthentication() {
    const loginOverlay = document.getElementById('crm-login-overlay');
    const appContainer = document.getElementById('crm-app');

    if (this.state.token) {
      // User is logged in
      loginOverlay.classList.add('hidden');
      appContainer.classList.remove('hidden');
      
      const userDisplay = document.getElementById('user-display-name');
      if (userDisplay) userDisplay.textContent = this.state.username || 'Admin';

      this.showToast(`Chào mừng trở lại, ${this.state.username || 'Admin'}!`, 'success');
      
      // Load initial config parameters
      this.applyThemeConfig();
      
      // Load tables data
      this.loadData();
    } else {
      // User needs to authenticate
      loginOverlay.classList.remove('hidden');
      appContainer.classList.add('hidden');
    }
  },

  /**
   * Perform administrative credentials validation
   */
  async handleLogin(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const errorMsg = document.getElementById('login-error-msg');
    const submitBtn = document.getElementById('btn-login-submit');

    if (!usernameInput || !passwordInput) return;

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    errorMsg.classList.add('hidden');
    submitBtn.disabled = true;
    submitBtn.textContent = '⚡ Đang Xác Thực...';

    try {
      const response = await fetch('/backend/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const result = await response.json();
      
      if (response.ok && result.success && result.token) {
        // Auth Success
        this.state.token = result.token;
        this.state.username = username;
        localStorage.setItem('crm_jwt_token', result.token);
        localStorage.setItem('crm_username', username);

        // Reset Form inputs
        usernameInput.value = '';
        passwordInput.value = '';

        // Trigger App View Bootstrap
        this.checkAuthentication();
      } else {
        // Auth Fail
        errorMsg.textContent = `❌ ${result.message || 'Đăng nhập không thành công.'}`;
        errorMsg.classList.remove('hidden');
      }
    } catch (err) {
      console.error('[crmController] Login fetch error:', err);
      errorMsg.textContent = '❌ Lỗi kết nối đến máy chủ!';
      errorMsg.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = '🔑 Đăng Nhập Hệ Thống';
    }
  },

  /**
   * Clear JWT, display Login overlay
   */
  handleLogout() {
    this.state.token = '';
    this.state.username = '';
    localStorage.removeItem('crm_jwt_token');
    localStorage.removeItem('crm_username');
    
    this.showToast('Bạn đã đăng xuất khỏi hệ thống.', 'info');
    this.checkAuthentication();
  },

  /**
   * Authenticated API request helper with Bearer authorization
   */
  async fetchAPI(endpoint, options = {}) {
    this.updateSyncIndicator('syncing');
    
    const url = endpoint.startsWith('/') ? endpoint : `/backend/api/${endpoint}`;
    
    // Set headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    if (this.state.token) {
      headers['Authorization'] = `Bearer ${this.state.token}`;
    }

    const config = {
      ...options,
      headers
    };

    try {
      const response = await fetch(url, config);
      
      // Auto handle JWT expiration (401 Unauthorized)
      if (response.status === 401 || response.status === 403) {
        this.updateSyncIndicator('error');
        this.showToast('Phiên làm việc hết hạn. Vui lòng đăng nhập lại.', 'error');
        this.handleLogout();
        throw new Error('Unauthorized API Call');
      }

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `API error: ${response.status}`);
      }

      this.updateSyncIndicator('synced');
      return result;
    } catch (err) {
      this.updateSyncIndicator('error');
      console.error(`[crmController] fetchAPI Error on ${url}:`, err);
      this.showToast(err.message || 'Lỗi kết nối API', 'error');
      throw err;
    }
  },

  /**
   * Fetch all records across domains and trigger view re-renders
   */
  async loadData() {
    if (!this.state.token) return;

    try {
      // 1. Fetch data arrays from Backend
      const [roomsRes, bookingsRes, customersRes, chatsRes] = await Promise.all([
        this.fetchAPI('rooms'),
        this.fetchAPI('bookings'),
        this.fetchAPI('customers'),
        this.fetchAPI('chats')
      ]);

      // 2. Sync variables in local state
      this.state.rooms = roomsRes.data || [];
      this.state.bookings = bookingsRes.data || [];
      this.state.customers = customersRes.data || [];
      this.state.chats = chatsRes.data || [];

      // Sort Bookings: check-in date descending or ID descending
      this.state.bookings.sort((a, b) => b.booking_id.localeCompare(a.booking_id));

      // Calculate alerts/unread count in chats
      const pendingChats = this.state.chats.filter(c => c.state !== 'IDLE').length;
      const chatBadge = document.getElementById('chat-alert-badge');
      if (chatBadge) {
        if (pendingChats > 0) {
          chatBadge.textContent = pendingChats;
          chatBadge.classList.remove('hidden');
        } else {
          chatBadge.classList.add('hidden');
        }
      }

      // 3. Render active view
      this.renderActiveView();
    } catch (err) {
      console.error('[crmController] Error loading collections:', err);
    }
  },

  /**
   * Router implementation for SPA view switching
   */
  switchView(viewName) {
    if (!this.views[viewName]) return;

    this.state.activeView = viewName;
    
    // Toggle active sidebar items style
    const navItems = document.querySelectorAll('.sidebar-menu .nav-item');
    navItems.forEach(item => {
      if (item.getAttribute('data-view') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Update Header Breadcrumb Title
    const currentBreadcrumb = document.getElementById('header-view-title');
    if (currentBreadcrumb) {
      const viewLabels = {
        dashboard: 'Tổng Quan Dashboard',
        bookings: 'Đặt Phòng Registry',
        rooms: 'Danh Sách Phòng',
        customers: 'Khách VIP Profiles',
        chat: 'Chat Responder Console',
        settings: 'Cấu Hình Hệ Thống'
      };
      currentBreadcrumb.textContent = viewLabels[viewName] || viewName;
    }

    // Toggle viewport sections visibility
    const viewSections = document.querySelectorAll('.crm-views-container .crm-view');
    viewSections.forEach(section => {
      const id = section.getAttribute('id');
      if (id === `view-${viewName}`) {
        section.classList.add('active');
      } else {
        section.classList.remove('active');
      }
    });

    // Render contents
    this.renderActiveView();
  },

  /**
   * Render the active viewport layout
   */
  renderActiveView() {
    const container = document.getElementById(`view-${this.state.activeView}`);
    if (!container) return;

    const viewModule = this.views[this.state.activeView];
    if (viewModule && typeof viewModule.render === 'function') {
      viewModule.render(container, this);
    }
  },

  /**
   * Update header status indicator dot & text
   */
  updateSyncIndicator(status) {
    this.state.syncStatus = status;
    const indicator = document.getElementById('sync-status-indicator');
    const textEl = document.getElementById('sync-status-text');

    if (!indicator || !textEl) return;

    // Reset status classes
    indicator.className = 'sync-status-pill';
    
    if (status === 'synced') {
      indicator.classList.add('synced');
      textEl.textContent = 'Đồng bộ Google Sheets';
    } else if (status === 'syncing') {
      indicator.classList.add('syncing');
      textEl.textContent = 'Đang đồng bộ...';
    } else {
      indicator.classList.add('error');
      textEl.textContent = 'Mất kết nối Sheets!';
    }
  },

  /**
   * Settings customization loader
   */
  applyThemeConfig() {
    const localTheme = localStorage.getItem('crm_settings_theme') || 'dark';
    if (localTheme === 'light-beige') {
      document.body.classList.add('light-beige');
    } else {
      document.body.classList.remove('light-beige');
    }
  },

  /* ==========================================================================
     CRUD OPERATIONS DISPATCHERS
     ========================================================================== */

  // --- Rooms CRUD ---
  async handleSaveRoom(id, roomData) {
    try {
      let result;
      if (id) {
        // Edit Mode
        result = await this.fetchAPI(`rooms/${id}`, {
          method: 'PUT',
          body: JSON.stringify(roomData)
        });
        this.showToast(`Đã cập nhật phòng R${String(id).replace('R','')}`, 'success');
      } else {
        // Create Mode
        result = await this.fetchAPI('rooms', {
          method: 'POST',
          body: JSON.stringify(roomData)
        });
        this.showToast(`Thêm phòng mới ${result.data.room_name} thành công`, 'success');
      }
      this.closeModal();
      this.loadData();
    } catch (e) {
      console.error(e);
    }
  },

  async handleDeleteRoom(id) {
    if (!confirm(`Bạn có chắc chắn muốn xóa phòng ${id}?`)) return;
    try {
      await this.fetchAPI(`rooms/${id}?force=true`, {
        method: 'DELETE'
      });
      this.showToast(`Đã soft-delete phòng ${id}`, 'warning');
      this.loadData();
    } catch (e) {
      console.error(e);
    }
  },

  // --- Bookings CRUD ---
  async handleSaveBooking(id, bookingData) {
    try {
      if (id) {
        // Edit Mode
        await this.fetchAPI(`bookings/${id}`, {
          method: 'PUT',
          body: JSON.stringify(bookingData)
        });
        this.showToast(`Cập nhật thành công đặt phòng #${id}`, 'success');
      } else {
        // Create Mode
        await this.fetchAPI('bookings', {
          method: 'POST',
          body: JSON.stringify(bookingData)
        });
        this.showToast('Tạo đặt phòng mới thành công', 'success');
      }
      this.closeModal();
      this.loadData();
    } catch (e) {
      console.error(e);
    }
  },

  async handleCancelBooking(id) {
    if (!confirm(`Bạn muốn hủy đặt phòng #${id}?`)) return;
    try {
      await this.fetchAPI(`bookings/${id}`, {
        method: 'DELETE'
      });
      this.showToast(`Đã chuyển trạng thái booking ${id} sang Cancelled`, 'warning');
      this.loadData();
    } catch (e) {
      console.error(e);
    }
  },

  // --- Customers CRUD ---
  async handleSaveCustomer(id, customerData) {
    try {
      if (id) {
        await this.fetchAPI(`customers/${id}`, {
          method: 'PUT',
          body: JSON.stringify(customerData)
        });
        this.showToast(`Đã lưu profile khách VIP ${id}`, 'success');
      } else {
        await this.fetchAPI('customers', {
          method: 'POST',
          body: JSON.stringify(customerData)
        });
        this.showToast('Đã thêm khách VIP mới', 'success');
      }
      this.closeModal();
      this.loadData();
    } catch (e) {
      console.error(e);
    }
  },

  // --- Chat responder replies ---
  async handleSendChatReply(senderId, platform, messageText) {
    try {
      await this.fetchAPI('chats/reply', {
        method: 'POST',
        body: JSON.stringify({ senderId, platform, message: messageText })
      });
      this.showToast('Gửi tin nhắn phản hồi thành công', 'success');
      
      // Instantly load data (specifically chat log changes)
      this.loadData();
    } catch (e) {
      console.error(e);
    }
  },

  // --- Cache trigger sheets sync ---
  async triggerForceSyncSheets(apiKey) {
    try {
      this.updateSyncIndicator('syncing');
      const response = await fetch('/backend/api/sync-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        }
      });
      
      const result = await response.json();
      if (response.ok && result.success) {
        this.showToast('⚡ Buộc đồng bộ Google Sheets thành công!', 'success');
        this.updateSyncIndicator('synced');
        this.loadData();
      } else {
        throw new Error(result.message || 'Lỗi đồng bộ');
      }
    } catch (e) {
      this.updateSyncIndicator('error');
      this.showToast(e.message || 'Đồng bộ thất bại, check API Key', 'error');
    }
  },

  /* ==========================================================================
     MODALS & POPUPS SYSTEM
     ========================================================================== */

  /**
   * Open the custom modal dialogue
   */
  showModal(title, contentHTML, onRenderCallback = null) {
    const modalOverlay = document.getElementById('crm-global-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body-content');

    if (!modalOverlay || !modalTitle || !modalBody) return;

    modalTitle.textContent = title;
    modalBody.innerHTML = contentHTML;
    modalOverlay.classList.remove('hidden');

    if (onRenderCallback && typeof onRenderCallback === 'function') {
      onRenderCallback(modalBody);
    }
  },

  /**
   * Hide the modal dialog
   */
  closeModal() {
    const modalOverlay = document.getElementById('crm-global-modal');
    if (modalOverlay) {
      modalOverlay.classList.add('hidden');
    }
  },

  /* ==========================================================================
     TOAST NOTIFICATIONS
     ========================================================================== */

  /**
   * Display temporary toast alert on screen
   */
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Icon match
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    const icon = icons[type] || '🔔';

    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(toast);

    // Auto remove toast
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'opacity 0.25s, transform 0.25s';
      
      setTimeout(() => {
        if (toast.parentNode === container) {
          container.removeChild(toast);
        }
      }, 250);
    }, 3500);
  }
};
