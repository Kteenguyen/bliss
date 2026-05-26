const db = require('../config/db');

const lockService = {
  cleanupExpiredLocks() {
    const now = Date.now();
    try {
      db.prepare('DELETE FROM locks WHERE expires_at <= ?').run(now);
    } catch (e) {
      console.error('[LockService] Error cleaning up expired locks:', e.message);
    }
  },

  acquireLock(roomId, checkInDate, checkOutDate, ttlSeconds = 300) {
    this.cleanupExpiredLocks();
    const now = Date.now();
    const expiresAt = now + (ttlSeconds * 1000);

    // Using transaction for atomicity
    const runTransaction = db.transaction(() => {
      const checkLock = db.prepare(`
        SELECT count(*) as count FROM locks 
        WHERE room_id = ? 
          AND NOT (check_out_date <= ? OR check_in_date >= ?)
          AND expires_at > ?
      `).get(roomId, checkInDate, checkOutDate, now);

      if (checkLock.count > 0) {
        return false; // Lock is busy / overlap
      }

      db.prepare(`
        INSERT INTO locks (room_id, check_in_date, check_out_date, expires_at) 
        VALUES (?, ?, ?, ?)
      `).run(roomId, checkInDate, checkOutDate, expiresAt);
      return true; // Lock acquired
    });

    try {
      return runTransaction();
    } catch (e) {
      console.error('[LockService] Transaction error acquiring lock:', e.message);
      return false;
    }
  },

  releaseLock(roomId, checkInDate, checkOutDate) {
    try {
      const result = db.prepare(`
        DELETE FROM locks 
        WHERE room_id = ? AND check_in_date = ? AND check_out_date = ?
      `).run(roomId, checkInDate, checkOutDate);
      return result.changes > 0;
    } catch (e) {
      console.error('[LockService] Error releasing lock:', e.message);
      return false;
    }
  }
};

module.exports = lockService;
