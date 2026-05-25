// ============================================================
// settingsController.js — Controller logic for Settings Page
// ============================================================

const SettingsController = {
  setupSettings() {
    document.getElementById('btn-save-settings')?.addEventListener('click', async () => {
      const key = document.getElementById('settings-gemini-key')?.value?.trim() || '';
      const pin = document.getElementById('settings-pin')?.value?.trim() || '6789';
      const fbPage = document.getElementById('settings-fb-pageid')?.value?.trim() || '';
      const fbToken = document.getElementById('settings-fb-token')?.value?.trim() || '';
      const botUrl = document.getElementById('settings-bot-url')?.value?.trim() || 'http://localhost:3000';
      const s06 = document.getElementById('settings-webhook-s06')?.value?.trim() || '';
      const s07 = document.getElementById('settings-webhook-s07')?.value?.trim() || '';
      const s08 = document.getElementById('settings-webhook-s08')?.value?.trim() || '';
      const theme = document.getElementById('settings-theme')?.value || 'dark';

      DB.saveSettings({
        gemini_key: key,
        pin_prefix: pin,
        fb_pageid: fbPage,
        fb_token: fbToken,
        bot_url: botUrl,
        webhook_s06: s06,
        webhook_s07: s07,
        webhook_s08: s08,
        theme: theme
      });

      if (theme === 'light-beige') {
        document.body.classList.add('light-beige');
      } else {
        document.body.classList.remove('light-beige');
      }
      showToast('✅ Cài đặt đã được lưu!', 'success');
      await AppController.pushToServer();
    });

    document.getElementById('btn-reset-data')?.addEventListener('click', async () => {
      if (confirm('Reset toàn bộ dữ liệu demo? (Rooms và Bookings sẽ về dữ liệu mẫu ban đầu)')) {
        DB.reset();
        CHATBOT.state = 'IDLE';
        CHATBOT.context = {};
        showToast('🔄 Dữ liệu đã được reset!', 'info');
        AppController.navigateTo('dashboard');
        await AppController.pushToServer();
      }
    });
  }
};

window.SettingsController = SettingsController;
