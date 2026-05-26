const sheetsService = require('../services/sheetsService');

const syncController = {
  async syncCache(req, res) {
    try {
      const sheet = req.query.sheet; // Optional query param to sync only one sheet, e.g. /sync-cache?sheet=bookings
      
      console.log(`[SyncController] Manual cache sync requested for: ${sheet || 'all sheets'}`);

      if (sheet) {
        if (!['rooms', 'bookings', 'customers'].includes(sheet)) {
          return res.status(400).json({ success: false, message: `Invalid sheet key: '${sheet}'. Must be rooms, bookings, or customers.` });
        }
        await sheetsService.syncCache(sheet);
      } else {
        // Sync all sheets
        await Promise.all([
          sheetsService.syncCache('rooms'),
          sheetsService.syncCache('bookings'),
          sheetsService.syncCache('customers')
        ]);
      }

      res.status(200).json({ success: true, message: 'Cache refreshed successfully from Google Sheets.' });
    } catch (e) {
      console.error('[SyncController] Cache sync failed:', e.message);
      res.status(500).json({ success: false, message: `Cache sync failed: ${e.message}` });
    }
  }
};

module.exports = syncController;
