/**
 * BLISS BOUTIQUE CRM — SETTINGS VIEW (settingsView.js)
 * Configures system parameters, visual appearance themes, and syncs caches.
 */

export const settingsView = {
  envStatus: null,

  /**
   * Render View Content
   */
  async render(container, controller) {
    // 1. Fetch backend configuration env checks
    if (!this.envStatus) {
      try {
        const response = await controller.fetchAPI('settings/status');
        this.envStatus = response.data;
      } catch (e) {
        console.warn('Could not load environment status:', e);
      }
    }

    const currentTheme = localStorage.getItem('crm_settings_theme') || 'dark';
    const sheetsApiKey = localStorage.getItem('crm_settings_sheets_key') || 'BlissSecureToken2026';

    const renderCheck = (isOk) => isOk 
      ? '<span style="color: var(--success); font-weight: bold;">✓ Đã cấu hình (Enabled)</span>'
      : '<span style="color: var(--danger); font-weight: bold;">✗ Chưa cấu hình (Disabled)</span>';

    // 2. Render Page Layout
    container.innerHTML = `
      <div class="page-title-area animate-fade-in">
        <h1 class="page-title">⚙️ Cấu Hình <span>Hệ Thống</span></h1>
        <p class="page-subtitle">Quản trị giao diện CRM, kiểm tra tích hợp API và đồng bộ cưỡng bức dữ liệu</p>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;" class="animate-fade-in" style="animation-delay: 0.05s;">
        <!-- Left Side: Customization & Sync triggers -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          <!-- Visual Personalization theme -->
          <div class="glass-card">
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 6px;">
              <span>🎨 Giao Diện Hệ Thống</span>
            </h3>
            
            <div class="form-group">
              <label class="form-label">Chọn chế độ hiển thị</label>
              <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                  <input type="radio" name="crm-theme-opt" value="dark" ${currentTheme === 'dark' ? 'checked' : ''} style="cursor: pointer;">
                  <span>Elegant Dark Mode (Mặc định)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                  <input type="radio" name="crm-theme-opt" value="light-beige" ${currentTheme === 'light-beige' ? 'checked' : ''} style="cursor: pointer;">
                  <span>Premium Light-Beige Mode</span>
                </label>
              </div>
              <div class="form-hint">Thay đổi chủ đề màu sắc sang kính mờ hoặc gỗ sồi kem tùy biến theo sở thích.</div>
            </div>
          </div>

          <!-- Sheets Synchronization -->
          <div class="glass-card">
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 6px;">
              <span>⚡ Đồng Bộ Cưỡng Bức</span>
            </h3>
            
            <div class="form-group">
              <label class="form-label" for="setting-sheets-key">Google Sheets API Key (Token)</label>
              <input type="password" id="setting-sheets-key" class="form-input" placeholder="Mặc định: BlissSecureToken2026" value="${sheetsApiKey}">
              <div class="form-hint">Dùng để xác thực yêu cầu đồng bộ giữa máy chủ Bliss CRM và bảng tính Google Sheets.</div>
            </div>

            <button class="btn btn-primary btn-block" id="btn-force-sheets-sync">
              ⚡ Buộc Đồng Bộ Cache Google Sheets
            </button>
          </div>
        </div>

        <!-- Right Side: Webhooks URLs & Environment Check status -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          <!-- System Configuration Status (Credentials Checks) -->
          <div class="glass-card">
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 6px;">
              <span>🔑 Trạng Thái API Credentials</span>
            </h3>
            
            <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.85rem;" id="env-credentials-status-div">
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 0.5rem;">
                <span style="font-weight: 600;">Gemini AI Assistant Service</span>
                <span>${this.envStatus ? renderCheck(this.envStatus.gemini) : 'Đang tải...'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 0.5rem;">
                <span style="font-weight: 600;">Telegram API Bot Token</span>
                <span>${this.envStatus ? renderCheck(this.envStatus.telegram) : 'Đang tải...'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 0.5rem;">
                <span style="font-weight: 600;">Google Sheets WebApp Script URL</span>
                <span>${this.envStatus ? renderCheck(this.envStatus.sheetsUrl) : 'Đang tải...'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 0.5rem;">
                <span style="font-weight: 600;">Google Sheets Secret Sync Token</span>
                <span>${this.envStatus ? renderCheck(this.envStatus.sheetsKey) : 'Đang tải...'}</span>
              </div>
              <div style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 0.5rem;">
                <span style="font-weight: 600;">Messenger Verify Webhook Token</span>
                <span>${this.envStatus ? renderCheck(this.envStatus.messengerToken) : 'Đang tải...'}</span>
              </div>
              <div style="display: flex; justify-content: space-between;">
                <span style="font-weight: 600;">Messenger App Secret Key</span>
                <span>${this.envStatus ? renderCheck(this.envStatus.messengerSecret) : 'Đang tải...'}</span>
              </div>
            </div>
          </div>

          <!-- Webhooks URLs -->
          <div class="glass-card">
            <h3 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 1rem; display: flex; align-items: center; gap: 6px;">
              <span>🌐 Webhook Endpoints (Meta & Telegram)</span>
            </h3>
            
            <div style="display: flex; flex-direction: column; gap: 0.85rem; font-size: 0.82rem;">
              <div>
                <strong>Telegram Bot Webhook Receiver:</strong>
                <div style="background: rgba(0,0,0,0.2); padding: 0.5rem; border-radius: 4px; font-family: monospace; color: #38bdf8; margin-top: 0.25rem;">
                  POST /webhooks/telegram
                </div>
              </div>
              <div>
                <strong>Meta Messenger Webhook Receiver:</strong>
                <div style="background: rgba(0,0,0,0.2); padding: 0.5rem; border-radius: 4px; font-family: monospace; color: #3b82f6; margin-top: 0.25rem;">
                  GET & POST /webhooks/messenger
                </div>
              </div>
              <div class="form-hint" style="font-style: italic;">
                Lưu ý: Để bots hoạt động thực tế trên internet, bạn cần proxy bằng ngrok/cloudflare tunnel trỏ về port 3000 của máy chủ này.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // 3. Bind events
    // Theme switch radios
    const themeRadios = container.querySelectorAll('input[name="crm-theme-opt"]');
    themeRadios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        const selectedTheme = e.target.value;
        localStorage.setItem('crm_settings_theme', selectedTheme);
        
        // Instantly apply theme to page body
        controller.applyThemeConfig();
        controller.showToast(`Đã đổi sang giao diện ${selectedTheme === 'light-beige' ? 'Premium Light-Beige' : 'Elegant Dark'}!`, 'success');
      });
    });

    // Force sheets cache sync button click
    document.getElementById('btn-force-sheets-sync')?.addEventListener('click', async () => {
      const apiKeyEl = document.getElementById('setting-sheets-key');
      const apiKey = apiKeyEl ? apiKeyEl.value.trim() : 'BlissSecureToken2026';
      
      // Save input API key to localStorage for developer comfort
      localStorage.setItem('crm_settings_sheets_key', apiKey);
      
      const btn = document.getElementById('btn-force-sheets-sync');
      btn.disabled = true;
      btn.textContent = '⚡ Đang thực thi đồng bộ sheets...';
      
      await controller.triggerForceSyncSheets(apiKey);
      
      btn.disabled = false;
      btn.textContent = '⚡ Buộc Đồng Bộ Cache Google Sheets';
    });
  }
};
