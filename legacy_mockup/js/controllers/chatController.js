// ============================================================
// chatController.js — Controller logic for AI chat dashboard
// ============================================================

const ChatController = {
  setupChat() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');

    sendBtn?.addEventListener('click', () => this.sendMessage());
    input?.addEventListener('keydown', e => { 
      if (e.key === 'Enter' && !e.shiftKey) { 
        e.preventDefault(); 
        this.sendMessage(); 
      } 
    });

    // Quick reply chips
    document.querySelectorAll('.quick-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        if (input) {
          input.value = chip.textContent;
          this.sendMessage();
        }
      });
    });

    // Welcome message
    setTimeout(() => {
      ChatView.addMessage('Xin chào! 👋 Mình là **Bliss AI Assistant**.\n\nHãy thử hỏi mình:\n• "Còn phòng ở Đà Lạt cuối tuần này không?"\n• "Giá phòng 2 người từ 28/6 đến 30/6 ở Hội An"\n• "Mã cửa check-in"\n• "Wifi homestay là gì"\n\n*AI hoạt động offline, không cần API key!* 🎉', 'bot', 'info');
    }, 500);
  },

  sendMessage() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    ChatView.addMessage(text, 'user');
    input.value = '';

    // Typing indicator
    const typingId = ChatView.showTypingIndicator();

    const settings = DB.getSettings();
    const delay = settings.gemini_key ? 1800 : 600;

    setTimeout(async () => {
      ChatView.hideTypingIndicator(typingId);
      await CHATBOT.process(text, ChatView.addMessage.bind(ChatView));
      AppController.pushToServer();
    }, delay);
  }
};

window.ChatController = ChatController;
