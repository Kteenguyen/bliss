const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const auth = require('../middleware/auth');

const roomController = require('../controllers/roomController');
const bookingController = require('../controllers/bookingController');
const customerController = require('../controllers/customerController');
const syncController = require('../controllers/syncController');

const JWT_SECRET = process.env.JWT_SECRET || 'BlissHomestaySecret2026';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'BlissAdmin2026';

/**
 * Timing-safe string comparison helper
 */
function timingSafeCompare(a, b) {
  const aBuf = Buffer.from(a || '');
  const bBuf = Buffer.from(b || '');
  if (aBuf.length !== bBuf.length) {
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

/**
 * POST /backend/api/login
 * Administrative Authentication
 */
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }

  const isUserValid = timingSafeCompare(username, ADMIN_USERNAME);
  const isPassValid = timingSafeCompare(password, ADMIN_PASSWORD);

  if (isUserValid && isPassValid) {
    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
    console.log('[Auth] Successful login for admin.');
    return res.status(200).json({ success: true, token });
  }

  console.warn('[Auth] Admin login attempt failed (invalid credentials).');
  return res.status(401).json({ success: false, message: 'Invalid username or password.' });
});

/**
 * Room Endpoints
 */
router.get('/rooms', roomController.getRooms);
router.get('/rooms/:id', roomController.getRoom);
router.post('/rooms', auth.validateJWT, roomController.createRoom);
router.put('/rooms/:id', auth.validateJWT, roomController.updateRoom);
router.delete('/rooms/:id', auth.validateJWT, roomController.deleteRoom);

/**
 * Booking Endpoints
 */
router.get('/bookings', auth.validateJWT, bookingController.getBookings);
router.get('/bookings/:id', auth.validateJWT, bookingController.getBooking);
router.post('/bookings', bookingController.createBooking);
router.put('/bookings/:id', auth.validateJWT, bookingController.updateBooking);
router.delete('/bookings/:id', auth.validateJWT, bookingController.deleteBooking);

/**
 * Customer Endpoints
 */
router.get('/customers', auth.validateJWT, customerController.getCustomers);
router.get('/customers/:id', auth.validateJWT, customerController.getCustomer);
router.post('/customers', auth.validateJWT, customerController.createCustomer);
router.put('/customers/:id', auth.validateJWT, customerController.updateCustomer);

/**
 * Chat & Communication Endpoints
 */
router.get('/chats', auth.validateJWT, (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const sheetsService = require('../services/sheetsService');
    const sessionsPath = path.join(__dirname, '../../../data/sessions_store.json');
    let sessions = {};
    if (fs.existsSync(sessionsPath)) {
      sessions = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'));
    }
    
    const customers = sheetsService.getCustomers();
    const formatted = Object.keys(sessions).map(senderId => {
      const s = sessions[senderId];
      const customer = customers.find(c => 
        c.facebook_psid === senderId || 
        c.telegram_chat_id === senderId || 
        c.whatsapp_phone_id === senderId
      );
      
      return {
        senderId,
        customerName: customer ? customer.customer_name : `Khách (${senderId})`,
        platform: s.platform || (senderId.length > 8 ? 'facebook' : 'telegram'),
        state: s.state,
        context: s.context,
        history: s.history || []
      };
    });
    
    res.status(200).json({ success: true, data: formatted });
  } catch (e) {
    console.error('[API] Get chats error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post('/chats/reply', auth.validateJWT, async (req, res) => {
  const { senderId, platform, message } = req.body;
  if (!senderId || !platform || !message) {
    return res.status(400).json({ success: false, message: 'senderId, platform, and message are required.' });
  }

  try {
    const chatbot = require('../services/chatbot');
    const queueService = require('../services/queueService');
    const fs = require('fs');
    const path = require('path');

    // 1. Send social message
    await chatbot.sendSocialMessage(senderId, platform, message);

    // 2. Log in queue/database
    queueService.logChat(senderId, platform, 'bot', message, 'human_reply', { human: true });

    // 3. Update session store history
    const sessionsPath = path.join(__dirname, '../../../data/sessions_store.json');
    let sessions = {};
    if (fs.existsSync(sessionsPath)) {
      sessions = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'));
    }
    if (!sessions[senderId]) {
      sessions[senderId] = { state: 'IDLE', context: {}, history: [] };
    }
    if (!sessions[senderId].history) sessions[senderId].history = [];
    sessions[senderId].history.push({ role: 'model', parts: [{ text: message }] });
    sessions[senderId].platform = platform; // preserve platform
    
    fs.writeFileSync(sessionsPath, JSON.stringify(sessions, null, 2), 'utf8');

    res.status(200).json({ success: true, message: 'Reply sent successfully.' });
  } catch (e) {
    console.error('[API] Reply chat error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/chats/logs', auth.validateJWT, (req, res) => {
  try {
    const db = require('../config/db');
    const logs = db.prepare('SELECT * FROM chat_logs ORDER BY timestamp DESC LIMIT 100').all();
    res.status(200).json({ success: true, data: logs });
  } catch (e) {
    console.error('[API] Get chat logs error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get('/settings/status', auth.validateJWT, (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        gemini: !!process.env.GEMINI_API_KEY,
        telegram: !!process.env.TELEGRAM_BOT_TOKEN,
        sheetsUrl: !!process.env.SHEETS_WEB_APP_URL,
        sheetsKey: !!process.env.SHEETS_API_KEY,
        messengerToken: !!process.env.MESSENGER_VERIFY_TOKEN,
        messengerSecret: !!process.env.MESSENGER_APP_SECRET
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/**
 * Cache Synchronization Endpoint
 * Triggered by Google Sheets Apps Script on spreadsheet modifications
 */
router.post('/sync-cache', auth.validateApiKey, syncController.syncCache);
router.get('/sync-cache', auth.validateApiKey, syncController.syncCache); // supports GET triggers

module.exports = router;
