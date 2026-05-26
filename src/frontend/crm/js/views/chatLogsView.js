/**
 * BLISS BOUTIQUE CRM — CHAT LOGS AUDITOR VIEW (chatLogsView.js)
 * Multi-channel chat responder console allowing human-in-the-loop replies
 * and auditing raw SQLite chat logs.
 */

export const chatLogsView = {
  // Local state for active selection
  selectedSenderId: null,
  rawLogs: [],

  /**
   * Render View Content
   */
  async render(container, controller) {
    const { chats } = controller.state;
    
    // Fetch raw audit logs if not loaded yet
    if (this.rawLogs.length === 0) {
      try {
        const response = await controller.fetchAPI('chats/logs');
        this.rawLogs = response.data || [];
      } catch (e) {
        console.warn('Could not load raw audit logs:', e);
      }
    }

    // Set initial selection to first session if null and sessions exist
    if (!this.selectedSenderId && chats.length > 0) {
      this.selectedSenderId = chats[0].senderId;
    }

    const selectedChat = chats.find(c => c.senderId === this.selectedSenderId);

    // 1. Render primary layout columns
    container.innerHTML = `
      <div class="page-title-area animate-fade-in">
        <h1 class="page-title">💬 Chat Responder <span>& Auditor Console</span></h1>
        <p class="page-subtitle">Giám sát các cuộc hội thoại AI Chatbot của khách, phản hồi thủ công tức thời qua Telegram/Messenger</p>
      </div>

      <div class="chat-console-layout animate-fade-in" style="animation-delay: 0.05s;">
        <!-- Column 1: Active Conversations List -->
        <div class="glass-card chat-console-sidebar-left" style="display: flex; flex-direction: column; padding: 1rem; overflow: hidden; height: 100%;">
          <h3 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.85rem; display: flex; justify-content: space-between; align-items: center;">
            <span>Conversations</span>
            <span class="badge badge-info" style="font-size: 0.65rem;">${chats.length} active</span>
          </h3>
          
          <div class="chat-console-sessions-list" id="chat-sessions-list-div">
            <!-- Injected below -->
          </div>
        </div>

        <!-- Column 2: Central Chat Thread -->
        <div class="glass-card chat-thread-container" id="chat-thread-container-div" style="padding: 0;">
          <!-- Injected below (Selected chat or Empty State) -->
        </div>

        <!-- Column 3: Intent/Context & Raw SQLite Audit Trails -->
        <div class="chat-console-sidebar-right">
          <!-- Session Context Metadata -->
          <div class="glass-card" style="padding: 1.25rem;">
            <h3 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 6px;">
              <span>🤖 State & Context</span>
            </h3>
            <div id="chat-metadata-context-div">
              <!-- Injected below -->
            </div>
          </div>

          <!-- Raw SQLite Audit Trail -->
          <div class="glass-card" style="padding: 1.25rem; flex: 1; display: flex; flex-direction: column; overflow: hidden; max-height: calc(100% - 220px);">
            <h3 style="font-size: 0.9rem; font-weight: 700; margin-bottom: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
              <span>📝 SQLite Audit Log</span>
              <button class="btn btn-ghost btn-sm" id="btn-refresh-audit-logs" style="padding: 2px 6px; font-size: 0.7rem;">🔄 Ref</button>
            </h3>
            <div id="chat-sqlite-audit-trail" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.75rem;">
              <!-- Injected below -->
            </div>
          </div>
        </div>
      </div>
    `;

    // 2. Render Left Pane: Active Sessions List
    const sessionsListDiv = document.getElementById('chat-sessions-list-div');
    if (chats.length === 0) {
      sessionsListDiv.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 2rem; font-size: 0.8rem;">Không có hội thoại hoạt động.</div>`;
    } else {
      sessionsListDiv.innerHTML = chats.map(c => {
        const isSelected = c.senderId === this.selectedSenderId;
        const lastMsg = c.history.length > 0 ? c.history[c.history.length - 1] : null;
        let lastMsgText = 'No messages';
        if (lastMsg) {
          lastMsgText = lastMsg.parts && lastMsg.parts[0] ? lastMsg.parts[0].text : (lastMsg.text || '');
        }
        
        let platformLabel = 'Telegram';
        let platformClass = 'platform-telegram';
        if (c.platform === 'facebook') { platformLabel = 'Messenger'; platformClass = 'platform-facebook'; }
        else if (c.platform === 'whatsapp') { platformLabel = 'WhatsApp'; platformClass = 'platform-whatsapp'; }

        return `
          <button class="chat-session-item ${isSelected ? 'selected' : ''}" data-sender-id="${c.senderId}">
            <div class="chat-session-header">
              <span class="chat-session-name">${c.customerName}</span>
              <span class="chat-session-platform ${platformClass}">${platformLabel}</span>
            </div>
            <div class="chat-session-preview">${lastMsgText}</div>
            <div class="chat-session-meta">
              <span class="chat-session-state-pill">State: ${c.state || 'IDLE'}</span>
              <span>ID: ${c.senderId.slice(0, 8)}...</span>
            </div>
          </button>
        `;
      }).join('');
    }

    // 3. Render Middle Pane: Selected Chat details or empty placeholder
    const threadDiv = document.getElementById('chat-thread-container-div');
    if (!selectedChat) {
      threadDiv.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); gap: 1rem; padding: 2rem; text-align: center;">
          <span style="font-size: 3.5rem;">💬</span>
          <h3 style="font-weight: 700; color: var(--text-main);">Chưa chọn hội thoại</h3>
          <p style="font-size: 0.82rem; max-width: 320px;">Hãy chọn một trong những cuộc hội thoại đang hoạt động bên trái để bắt đầu giám sát hoặc can thiệp.</p>
        </div>
      `;
    } else {
      let platformIcon = '🔵';
      if (selectedChat.platform === 'telegram') platformIcon = '✈️';
      else if (selectedChat.platform === 'whatsapp') platformIcon = '🟢';

      threadDiv.innerHTML = `
        <!-- Thread Header -->
        <div class="chat-thread-header">
          <div class="chat-thread-user">
            <span class="chat-thread-avatar">${platformIcon}</span>
            <div>
              <div class="chat-thread-user-name">${selectedChat.customerName}</div>
              <div class="chat-thread-user-sub">Sender ID: ${selectedChat.senderId} | Platform: ${selectedChat.platform}</div>
            </div>
          </div>
          <span class="badge ${selectedChat.state !== 'IDLE' ? 'badge-warning' : 'badge-success'}">
            State: ${selectedChat.state}
          </span>
        </div>

        <!-- Thread History Scroll Pane -->
        <div class="chat-thread-history" id="chat-messages-scroll-pane">
          <!-- Bubbles injected below -->
        </div>

        <!-- Thread Text Input Area -->
        <div class="chat-console-input-bar">
          <textarea id="chat-reply-textarea" class="chat-input-textarea" rows="2" placeholder="Gõ phản hồi của bạn để can thiệp thủ công..."></textarea>
          <button class="btn btn-primary" id="btn-send-reply-msg" style="align-self: flex-end;">
            Send ➔
          </button>
        </div>
      `;

      // Render bubbles
      const bubblesPane = document.getElementById('chat-messages-scroll-pane');
      bubblesPane.innerHTML = selectedChat.history.map(msg => {
        const isUser = msg.role === 'user';
        const msgText = msg.parts && msg.parts[0] ? msg.parts[0].text : (msg.text || '');
        const roleLabel = isUser ? 'Khách hàng' : 'Homestay AI';
        
        return `
          <div class="chat-bubble-wrap ${isUser ? 'user' : 'bot'} animate-zoom-in">
            <div class="chat-bubble">
              <div>${msgText}</div>
              <span class="chat-bubble-meta">${roleLabel}</span>
            </div>
          </div>
        `;
      }).join('');

      // Auto scroll to bottom
      bubblesPane.scrollTop = bubblesPane.scrollHeight;
    }

    // 4. Render Right Pane: Context Metadata & raw logs
    const metaContextDiv = document.getElementById('chat-metadata-context-div');
    if (!selectedChat) {
      metaContextDiv.innerHTML = `<div style="font-size: 0.8rem; color: var(--text-muted); font-style: italic;">Chưa có hội thoại nào được chọn.</div>`;
    } else {
      metaContextDiv.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.82rem;">
          <div>🤖 <strong>Gemini Chatbot State:</strong></div>
          <div style="background: rgba(255,255,255,0.04); padding: 6px; border-radius: 4px; font-weight: 700; border: 1px solid var(--glass-border); color: var(--accent);">
            ${selectedChat.state || 'IDLE'}
          </div>
          
          <div style="margin-top: 0.5rem;">📁 <strong>Session Context JSON:</strong></div>
          <div class="debug-json-block">${JSON.stringify(selectedChat.context || {}, null, 2)}</div>
        </div>
      `;
    }

    // Render SQLite Audit trail rows
    const auditDiv = document.getElementById('chat-sqlite-audit-trail');
    if (this.rawLogs.length === 0) {
      auditDiv.innerHTML = `<div style="text-align: center; color: var(--text-inactive); padding-top: 1rem;">Không có nhật ký SQLite.</div>`;
    } else {
      // Filter logs for selected user if selected
      let filteredLogs = this.rawLogs;
      if (selectedChat) {
        filteredLogs = this.rawLogs.filter(l => l.sender_id === selectedChat.senderId);
      }
      
      if (filteredLogs.length === 0) {
        auditDiv.innerHTML = `<div style="text-align: center; color: var(--text-inactive); padding-top: 1rem;">Không có lịch sử SQLite cho ID này.</div>`;
      } else {
        auditDiv.innerHTML = filteredLogs.slice(0, 15).map(log => {
          const isUser = log.role === 'user';
          const platformColor = log.platform === 'facebook' ? '#3b82f6' : '#38bdf8';
          
          return `
            <div style="padding: 0.5rem; background: rgba(0,0,0,0.15); border: 1px solid rgba(255,255,255,0.03); border-radius: 6px;">
              <div style="display: flex; justify-content: space-between; font-size: 0.65rem; color: var(--text-inactive); margin-bottom: 0.2rem;">
                <span style="color: ${platformColor}; font-weight: 700;">${log.platform.toUpperCase()}</span>
                <span>${new Date(log.timestamp).toLocaleTimeString('vi-VN')}</span>
              </div>
              <div style="font-weight: 600; color: ${isUser ? 'var(--text-main)' : 'var(--primary-light)'};">
                ${isUser ? '👤 Khách' : '🤖 AI'}: ${log.message_text}
              </div>
              ${log.intent ? `<div style="font-size: 0.65rem; color: var(--accent); margin-top: 0.15rem;">Intent: ${log.intent}</div>` : ''}
            </div>
          `;
        }).join('');
      }
    }

    // 5. Event Bindings
    // Click session item to change active conversation
    container.querySelectorAll('.chat-session-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-sender-id');
        this.selectedSenderId = id;
        this.render(container, controller);
      });
    });

    // Send human-in-the-loop reply
    document.getElementById('btn-send-reply-msg')?.addEventListener('click', async () => {
      const textarea = document.getElementById('chat-reply-textarea');
      if (!textarea || !selectedChat) return;

      const replyText = textarea.value.trim();
      if (!replyText) return;

      // Optimistic rendering: push to local history and render immediately
      selectedChat.history.push({
        role: 'model',
        parts: [{ text: replyText }]
      });

      // Clear input
      textarea.value = '';

      // Send to server via controller
      await controller.handleSendChatReply(selectedChat.senderId, selectedChat.platform, replyText);
      
      // Force refresh visual bubble lists
      this.render(container, controller);
    });

    // Support Ctrl+Enter to send message
    document.getElementById('chat-reply-textarea')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('btn-send-reply-msg')?.click();
      }
    });

    // Refresh audit logs
    document.getElementById('btn-refresh-audit-logs')?.addEventListener('click', async () => {
      try {
        const response = await controller.fetchAPI('chats/logs');
        this.rawLogs = response.data || [];
        controller.showToast('Làm mới SQLite log thành công', 'success');
        this.render(container, controller);
      } catch (err) {
        console.error(err);
      }
    });
  }
};
