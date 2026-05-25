// ============================================================
// chatView.js — View component for AI Chat Demo interface
// ============================================================

const ChatView = {
  addMessage(text, role, type = '') {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const isBot = role === 'bot';
    const typeClass = type ? `msg-type-${type}` : '';

    // Convert **bold** markdown and hide booking data XML comments
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
  },

  showTypingIndicator() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return null;

    const typingId = 'typing-' + Date.now();
    chatMessages.insertAdjacentHTML('beforeend', `
      <div class="msg-wrap msg-bot" id="${typingId}">
        <div class="msg-avatar">🤖</div>
        <div class="msg-bubble typing-indicator"><span></span><span></span><span></span></div>
      </div>`);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return typingId;
  },

  hideTypingIndicator(typingId) {
    if (typingId) {
      document.getElementById(typingId)?.remove();
    }
  }
};

window.ChatView = ChatView;
