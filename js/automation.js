// ============================================================
// automation.js — Scheduled scenario simulator (FR05)
// ============================================================

const AUTOMATION = {
  scenarios: [
    {
      id: 'S06',
      name: 'Pre Check-in Reminder',
      description: 'Gửi hướng dẫn check-in cho khách có lịch ngày mai',
      trigger: 'Hàng ngày lúc 09:00',
      icon: '📩',
      color: 'blue',
      lastRun: null,
      status: 'active',
      totalRuns: 47,
    },
    {
      id: 'S07',
      name: 'Post Check-out Review',
      description: 'Xin đánh giá sau khi khách trả phòng 2 giờ',
      trigger: 'Mỗi giờ',
      icon: '⭐',
      color: 'yellow',
      lastRun: null,
      status: 'active',
      totalRuns: 28,
    },
    {
      id: 'S08',
      name: 'Anti-Overbooking Monitor',
      description: 'Phát hiện xung đột lịch đặt phòng và cảnh báo ngay',
      trigger: 'Khi có booking mới (Watch)',
      icon: '🛡️',
      color: 'red',
      lastRun: null,
      status: 'active',
      totalRuns: 234,
    },
    {
      id: 'S01',
      name: 'Message Intake & NLP Router',
      description: 'Nhận tin nhắn webhook, phân tích intent và điều hướng',
      trigger: 'Webhook (tức thì)',
      icon: '🧠',
      color: 'purple',
      lastRun: null,
      status: 'active',
      totalRuns: 1847,
    },
    {
      id: 'S02',
      name: 'Quoting Engine',
      description: 'Kiểm tra phòng trống và tính giá tự động',
      trigger: 'Gọi từ S01',
      icon: '💰',
      color: 'green',
      lastRun: null,
      status: 'active',
      totalRuns: 892,
    },
    {
      id: 'S09',
      name: 'Calendar iCal Sync',
      description: 'Đồng bộ lịch phòng lên OTA (Airbnb, Booking.com)',
      trigger: 'Khi tạo/huỷ booking',
      icon: '📅',
      color: 'orange',
      lastRun: null,
      status: 'active',
      totalRuns: 156,
    },
  ],

  logs: [],

  runScenario(scenarioId, addLog) {
    const sc = this.scenarios.find(s => s.id === scenarioId);
    if (!sc) return;

    sc.lastRun = new Date().toISOString();
    sc.status = 'running';
    this.renderScenarios();

    const bookings = DB.getBookings();
    const settings = DB.getSettings();
    let result = '';

    setTimeout(() => {
      switch (scenarioId) {
        case 'S06': {
          const tomorrow = todayPlus(1);
          const targets = bookings.filter(b => b.check_in_date === tomorrow && b.status === 'confirmed');
          if (targets.length === 0) {
            result = 'Không có booking nào check-in ngày mai.';
          } else {
            targets.forEach(b => {
              const msg = `📩 Gửi check-in guide → ${b.customer_name}: "${b.room_name}" ngày ${UTIL.fmtDate(b.check_in_date)}`;
              this._addLog(scenarioId, msg, 'success');
              DB.addActivity({ type: 'automation', msg: `📩 Check-in reminder → ${b.customer_name} (${b.booking_id})`, color: 'blue' });
            });
            result = `Đã gửi ${targets.length} tin nhắn check-in thành công!`;
            if (settings.webhook_s06) {
              this._triggerMakeWebhook(settings.webhook_s06, { scenario: 'S06', bookings: targets });
            }
          }
          this._addLog(scenarioId, '✅ ' + result, 'success');
          break;
        }
        case 'S07': {
          const today = new Date().toISOString().split('T')[0];
          const targets = bookings.filter(b => b.check_out_date === today && b.status === 'checked_in' && !b.review_sent);
          if (targets.length === 0) {
            result = 'Không có booking nào cần gửi review hôm nay.';
          } else {
            targets.forEach(b => {
              b.review_sent = true;
              DB.saveBooking(b);
              this._addLog(scenarioId, `⭐ Gửi review request → ${b.customer_name} (${b.booking_id})`, 'success');
              DB.addActivity({ type: 'automation', msg: `⭐ Review request → ${b.customer_name} (${b.booking_id})`, color: 'yellow' });
            });
            result = `Đã gửi ${targets.length} yêu cầu đánh giá!`;
            if (settings.webhook_s07) {
              this._triggerMakeWebhook(settings.webhook_s07, { scenario: 'S07', bookings: targets });
            }
          }
          this._addLog(scenarioId, '✅ ' + result, 'success');
          break;
        }
        case 'S08': {
          let conflicts = 0;
          const roomGroups = {};
          const conflictTargets = [];
          bookings.filter(b => ['confirmed', 'checked_in'].includes(b.status))
            .forEach(b => { (roomGroups[b.room_id] = roomGroups[b.room_id] || []).push(b); });
          for (const [roomId, bList] of Object.entries(roomGroups)) {
            for (let i = 0; i < bList.length; i++) {
              for (let j = i + 1; j < bList.length; j++) {
                const a = bList[i], b = bList[j];
                if (!(a.check_out_date <= b.check_in_date || a.check_in_date >= b.check_out_date)) {
                  conflicts++;
                  conflictTargets.push({ a, b });
                  this._addLog(scenarioId, `⚠️ CONFLICT: ${a.room_name} — ${a.booking_id} vs ${b.booking_id}`, 'error');
                }
              }
            }
          }
          result = conflicts === 0 ? `Không phát hiện conflict nào. Tất cả ${bookings.length} booking hợp lệ.` : `⚠️ Phát hiện ${conflicts} xung đột!`;
          if (settings.webhook_s08) {
            this._triggerMakeWebhook(settings.webhook_s08, { scenario: 'S08', conflicts: conflictTargets, totalBookings: bookings.length });
          }
          this._addLog(scenarioId, '🛡️ ' + result, conflicts ? 'error' : 'success');
          break;
        }
        default: {
          result = `Scenario ${scenarioId} chạy thành công.`;
          this._addLog(scenarioId, `✅ ${result}`, 'success');
          DB.addActivity({ type: 'automation', msg: `🤖 ${sc.name} chạy thành công`, color: sc.color });
          break;
        }
      }

      sc.status = 'active';
      sc.totalRuns++;
      this.renderScenarios();

      // Refresh activity
      if (typeof renderActivity === 'function') renderActivity();
    }, 1500);
  },

  _addLog(scenarioId, message, type = 'info') {
    const log = { id: Date.now(), scenarioId, message, type, time: new Date().toISOString() };
    this.logs.unshift(log);
    this.renderLogs();
  },

  async _triggerMakeWebhook(url, payload) {
    const scenarioId = payload.scenario;
    try {
      this._addLog(scenarioId, `📡 Đang gọi webhook Make.com...`, 'info');
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        this._addLog(scenarioId, `✅ Make.com Webhook phản hồi thành công!`, 'success');
      } else {
        this._addLog(scenarioId, `❌ Make.com Webhook báo lỗi: ${res.status}`, 'error');
      }
    } catch (e) {
      this._addLog(scenarioId, `❌ Lỗi kết nối Make.com Webhook: ${e.message}`, 'error');
    }
  },

  renderScenarios() {
    const el = document.getElementById('scenarios-grid');
    if (!el) return;
    el.innerHTML = this.scenarios.map(sc => `
      <div class="scenario-card scenario-${sc.color} ${sc.status === 'running' ? 'running' : ''}">
        <div class="scenario-header">
          <span class="scenario-icon">${sc.icon}</span>
          <span class="scenario-id">${sc.id}</span>
          <span class="scenario-status ${sc.status === 'running' ? 'status-running' : 'status-active'}">
            ${sc.status === 'running' ? '⚙️ Running...' : '● Active'}
          </span>
        </div>
        <h3 class="scenario-name">${sc.name}</h3>
        <p class="scenario-desc">${sc.description}</p>
        <div class="scenario-meta">
          <span>⏱ ${sc.trigger}</span>
          <span>🏃 ${sc.totalRuns.toLocaleString()} runs</span>
        </div>
        <button class="btn-run ${sc.status === 'running' ? 'btn-disabled' : ''}" 
          onclick="AUTOMATION.runScenario('${sc.id}')" 
          ${sc.status === 'running' ? 'disabled' : ''}>
          ${sc.status === 'running' ? '⚙️ Đang chạy...' : '▶ Chạy ngay'}
        </button>
      </div>`).join('');
  },

  renderLogs() {
    const el = document.getElementById('automation-logs');
    if (!el) return;
    if (this.logs.length === 0) {
      el.innerHTML = '<div class="log-empty">Chưa có log nào. Bấm "Chạy ngay" để thử!</div>';
      return;
    }
    el.innerHTML = this.logs.slice(0, 30).map(l => `
      <div class="log-entry log-${l.type}">
        <span class="log-time">${UTIL.timeAgo(l.time)}</span>
        <span class="log-scenario">[${l.scenarioId}]</span>
        <span class="log-msg">${l.message}</span>
      </div>`).join('');
  },

  init() {
    this.renderScenarios();
    this.renderLogs();
  }
};
