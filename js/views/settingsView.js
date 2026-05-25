// ============================================================
// settingsView.js — View component for settings panel
// ============================================================

const SettingsView = {
  render() {
    const s = DB.getSettings();
    const el = document.getElementById('settings-gemini-key');
    const pinEl = document.getElementById('settings-pin');
    const fbPageEl = document.getElementById('settings-fb-pageid');
    const fbTokenEl = document.getElementById('settings-fb-token');
    const botUrlEl = document.getElementById('settings-bot-url');
    const s06El = document.getElementById('settings-webhook-s06');
    const s07El = document.getElementById('settings-webhook-s07');
    const s08El = document.getElementById('settings-webhook-s08');
    const themeEl = document.getElementById('settings-theme');

    if (el) el.value = s.gemini_key || '';
    if (pinEl) pinEl.value = s.pin_prefix || '6789';
    if (fbPageEl) fbPageEl.value = s.fb_pageid || '';
    if (fbTokenEl) fbTokenEl.value = s.fb_token || '';
    if (botUrlEl) botUrlEl.value = s.bot_url || 'http://localhost:3000';
    if (s06El) s06El.value = s.webhook_s06 || '';
    if (s07El) s07El.value = s.webhook_s07 || '';
    if (s08El) s08El.value = s.webhook_s08 || '';
    if (themeEl) themeEl.value = s.theme || 'dark';
  }
};

window.SettingsView = SettingsView;
