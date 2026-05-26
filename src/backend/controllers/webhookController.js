const chatbot = require('../services/chatbot');
const auth = require('../middleware/auth');

const webhookController = {
  /**
   * Messenger Webhook Verification (GET /webhooks/messenger)
   */
  verifyMessenger(req, res) {
    return auth.validateMessengerWebhook(req, res);
  },

  /**
   * Messenger Message Intake (POST /webhooks/messenger)
   */
  async handleMessenger(req, res) {
    if (req.body.object === 'page') {
      try {
        const entries = req.body.entry || [];
        for (const entry of entries) {
          const messagingEvents = entry.messaging || [];
          for (const event of messagingEvents) {
            if (event.message && event.message.text) {
              const senderId = event.sender.id;
              const text = event.message.text;
              
              // Handle incoming message asynchronously to avoid blocking webhook response
              chatbot.handleIncomingMessage(senderId, 'facebook', text)
                .catch(err => console.error('[Webhook] Facebook message handle error:', err.message));
            }
          }
        }
        return res.status(200).send('EVENT_RECEIVED');
      } catch (err) {
        console.error('[Webhook] Messenger processing error:', err.message);
        return res.status(500).send('Internal Server Error');
      }
    }
    return res.status(404).send('Not Found');
  },

  /**
   * Telegram Message Intake (POST /webhooks/telegram)
   */
  async handleTelegram(req, res) {
    try {
      const update = req.body;
      if (update.message && update.message.text) {
        const chatId = update.message.chat.id.toString();
        const text = update.message.text;

        chatbot.handleIncomingMessage(chatId, 'telegram', text)
          .catch(err => console.error('[Webhook] Telegram message handle error:', err.message));
      }
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('[Webhook] Telegram processing error:', err.message);
      return res.status(500).json({ ok: false, error: err.message });
    }
  },

  /**
   * WhatsApp Webhook Verification (GET /webhooks/whatsapp)
   */
  verifyWhatsApp(req, res) {
    // WhatsApp/Meta uses the exact same hub verify protocol as Messenger
    return auth.validateMessengerWebhook(req, res);
  },

  /**
   * WhatsApp Message Intake (POST /webhooks/whatsapp)
   */
  async handleWhatsApp(req, res) {
    try {
      if (req.body.object === 'whatsapp_business_account') {
        const entries = req.body.entry || [];
        for (const entry of entries) {
          const changes = entry.changes || [];
          for (const change of changes) {
            const value = change.value || {};
            const messages = value.messages || [];
            for (const message of messages) {
              if (message.type === 'text' && message.text && message.text.body) {
                const senderId = message.from;
                const text = message.text.body;

                chatbot.handleIncomingMessage(senderId, 'whatsapp', text)
                  .catch(err => console.error('[Webhook] WhatsApp message handle error:', err.message));
              }
            }
          }
        }
        return res.status(200).send('EVENT_RECEIVED');
      }
      return res.status(404).send('Not Found');
    } catch (err) {
      console.error('[Webhook] WhatsApp processing error:', err.message);
      return res.status(500).send('Internal Server Error');
    }
  }
};

module.exports = webhookController;
