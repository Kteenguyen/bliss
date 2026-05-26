const db = require('../config/db');
const sheetsService = require('./sheetsService');

let isProcessing = false;
let isFlushingChats = false;

const queueService = {
  enqueue(type, payload) {
    try {
      const statement = db.prepare(`
        INSERT INTO write_queue (type, payload, attempts, status, created_at)
        VALUES (?, ?, 0, 'pending', ?)
      `);
      statement.run(type, JSON.stringify(payload), Date.now());
    } catch (e) {
      console.error('[QueueService] Enqueue error:', e.message);
    }
  },

  async startQueueProcessor() {
    // Run queue check every 3 seconds
    setInterval(async () => {
      if (isProcessing) return;
      isProcessing = true;
      try {
        await this.processQueue();
      } catch (e) {
        console.error('[QueueService] Processor error:', e.message);
      } finally {
        isProcessing = false;
      }
    }, 3000);

    // Run chat logs flush every 5 minutes (or trigger if count > 100)
    setInterval(async () => {
      if (isFlushingChats) return;
      isFlushingChats = true;
      try {
        await this.flushChatLogs();
      } catch (e) {
        console.error('[QueueService] Chat flush error:', e.message);
      } finally {
        isFlushingChats = false;
      }
    }, 5 * 60 * 1000);

    // Quick check to see if we should flush immediately on startup
    setTimeout(() => this.triggerChatFlushIfBulk(), 5000);
  },

  async processQueue() {
    let pending;
    try {
      pending = db.prepare(`
        SELECT * FROM write_queue 
        WHERE status = 'pending' 
        ORDER BY id ASC
      `).all();
    } catch (e) {
      console.error('[QueueService] SQLite select error:', e.message);
      return;
    }

    if (pending.length === 0) return;

    console.log(`[QueueService] Processing ${pending.length} pending sheet writes...`);

    for (const task of pending) {
      const payload = JSON.parse(task.payload);
      let success = false;

      try {
        switch (task.type) {
          case 'CREATE_BOOKING':
            await sheetsService.directCreate('bookings', payload);
            success = true;
            break;
          case 'UPDATE_BOOKING':
            await sheetsService.directUpdate('bookings', payload.id, payload.data);
            success = true;
            break;
          case 'CREATE_CUSTOMER':
            await sheetsService.directCreate('customers', payload);
            success = true;
            break;
          case 'UPDATE_CUSTOMER':
            await sheetsService.directUpdate('customers', payload.id, payload.data);
            success = true;
            break;
          case 'CREATE_ROOM':
            await sheetsService.directCreate('rooms', payload);
            success = true;
            break;
          case 'UPDATE_ROOM':
            await sheetsService.directUpdate('rooms', payload.id, payload.data);
            success = true;
            break;
          case 'DELETE_ROOM':
            await sheetsService.directDelete('rooms', payload.id, payload.force);
            success = true;
            break;
          default:
            console.warn(`[QueueService] Unknown task type: ${task.type}`);
            db.prepare('DELETE FROM write_queue WHERE id = ?').run(task.id);
            continue;
        }

        if (success) {
          db.prepare('DELETE FROM write_queue WHERE id = ?').run(task.id);
        }
      } catch (error) {
        console.error(`[QueueService] Error processing task ${task.id} (${task.type}):`, error.message);
        
        const attempts = task.attempts + 1;
        if (attempts >= 5) {
          // Move to dead letter state (status = 'failed')
          db.prepare("UPDATE write_queue SET attempts = ?, status = 'failed' WHERE id = ?")
            .run(attempts, task.id);
        } else {
          // Increment attempts, try again next cycle
          db.prepare("UPDATE write_queue SET attempts = ? WHERE id = ?")
            .run(attempts, task.id);
          // Pause queue execution on error to allow backoff
          break;
        }
      }
    }
  },

  async flushChatLogs() {
    let logs;
    try {
      logs = db.prepare('SELECT * FROM chat_logs ORDER BY timestamp ASC').all();
    } catch (e) {
      console.error('[QueueService] SQLite chat_logs read error:', e.message);
      return;
    }

    if (logs.length === 0) return;

    console.log(`[QueueService] Flushing ${logs.length} chat logs to Google Sheets...`);
    
    // Batch up to 100 logs at a time
    const batchSize = 100;
    for (let i = 0; i < logs.length; i += batchSize) {
      const batch = logs.slice(i, i + batchSize);
      const formattedBatch = batch.map(log => ({
        log_id: log.log_id,
        social_id: log.social_id,
        channel: log.channel,
        sender_role: log.sender_role,
        message_content: log.message_content,
        parsed_intent: log.parsed_intent || '',
        parsed_entities: log.parsed_entities || '{}',
        timestamp: new Date(log.timestamp).toISOString()
      }));

      try {
        const response = await sheetsService.directCreateBatch('chat_logs', formattedBatch);
        if (response.success) {
          const ids = batch.map(l => l.log_id);
          const placeholders = ids.map(() => '?').join(',');
          db.prepare(`DELETE FROM chat_logs WHERE log_id IN (${placeholders})`).run(...ids);
          console.log(`[QueueService] Successfully flushed batch of ${batch.length} logs.`);
        }
      } catch (e) {
        console.error('[QueueService] Error flushing chat log batch:', e.message);
        break; // Wait for next run
      }
    }
  },

  async triggerChatFlushIfBulk() {
    try {
      const countResult = db.prepare('SELECT count(*) as count FROM chat_logs').get();
      if (countResult && countResult.count >= 100) {
        if (isFlushingChats) return;
        isFlushingChats = true;
        try {
          await this.flushChatLogs();
        } finally {
          isFlushingChats = false;
        }
      }
    } catch (e) {
      console.error('[QueueService] Error checking chat log count:', e.message);
    }
  },

  logChat(socialId, channel, senderRole, content, intent = '', entities = {}) {
    try {
      const logId = 'LOG' + Date.now().toString() + Math.random().toString(36).substring(2, 6).toUpperCase();
      const statement = db.prepare(`
        INSERT INTO chat_logs (log_id, social_id, channel, sender_role, message_content, parsed_intent, parsed_entities, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      statement.run(
        logId,
        socialId,
        channel,
        senderRole,
        content,
        intent || null,
        entities ? JSON.stringify(entities) : null,
        Date.now()
      );
      
      // Check if we should flush immediately (reached bulk size)
      this.triggerChatFlushIfBulk();
      return logId;
    } catch (e) {
      console.error('[QueueService] Error logging chat locally:', e.message);
      return null;
    }
  }
};

module.exports = queueService;
