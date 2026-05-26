const db = require('../config/db');

module.exports = function deduplicateMiddleware(req, res, next) {
  let messageId = null;

  // 1. Messenger webhook structure
  if (req.body.object === 'page' && req.body.entry) {
    try {
      const entry = req.body.entry[0];
      const messaging = entry?.messaging?.[0];
      messageId = messaging?.message?.mid;
    } catch (e) {
      // Ignore parsing errors and fallback
    }
  }
  // 2. Telegram webhook structure
  else if (req.body.update_id) {
    messageId = 'TG_' + req.body.update_id;
  }
  // 3. WhatsApp webhook structure
  else if (req.body.object === 'whatsapp_business_account' && req.body.entry) {
    try {
      const entry = req.body.entry[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const message = value?.messages?.[0];
      messageId = message?.id;
    } catch (e) {
      // Ignore parsing errors
    }
  }

  // If no message ID could be extracted, bypass deduplication
  if (!messageId) {
    return next();
  }

  const now = Date.now();
  const duplicateWindow = 5 * 60 * 1000; // 5 minutes sliding window

  try {
    // Delete expired entries to keep database clean
    db.prepare('DELETE FROM deduplication WHERE processed_at < ?').run(now - duplicateWindow);

    // Check if message ID has already been processed
    const exists = db.prepare('SELECT 1 FROM deduplication WHERE message_id = ?').get(messageId);
    
    if (exists) {
      console.log(`[Deduplicate] Duplicate detected and filtered out for message ID: ${messageId}`);
      // Send 200 OK immediately back to the channel server to avoid redeliveries
      return res.status(200).send('EVENT_RECEIVED');
    }

    // Record message ID as processed
    db.prepare('INSERT INTO deduplication (message_id, processed_at) VALUES (?, ?)').run(messageId, now);
    next();
  } catch (err) {
    console.error('[Deduplicate] SQLite deduplication check failed:', err.message);
    // On SQLite errors, continue request to prevent system lockout
    next();
  }
};
