const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const deduplicateMiddleware = require('../middleware/deduplicate');
const auth = require('../middleware/auth');

/**
 * Facebook Messenger Webhook
 */
router.get('/messenger', webhookController.verifyMessenger);
router.post('/messenger', deduplicateMiddleware, auth.verifyMetaSignature, webhookController.handleMessenger);

/**
 * Telegram Webhook
 */
router.post('/telegram', deduplicateMiddleware, webhookController.handleTelegram);

/**
 * WhatsApp Webhook
 */
router.get('/whatsapp', webhookController.verifyWhatsApp);
router.post('/whatsapp', deduplicateMiddleware, webhookController.handleWhatsApp);

module.exports = router;
