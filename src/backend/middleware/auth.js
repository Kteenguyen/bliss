const crypto = require('crypto');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'BlissHomestaySecret2026';
const MESSENGER_VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN || 'BlissVerifyToken2026';
const MESSENGER_APP_SECRET = process.env.MESSENGER_APP_SECRET || '';

/**
 * Timing-safe string comparison to prevent side-channel attacks
 */
function timingSafeCompare(a, b) {
  const aBuf = Buffer.from(a || '');
  const bBuf = Buffer.from(b || '');
  
  if (aBuf.length !== bBuf.length) {
    // Run a dummy timingSafeEqual to simulate processing time
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

const authMiddleware = {
  /**
   * Timing-safe Facebook Webhook Validation Handshake (GET /webhooks/messenger)
   */
  validateMessengerWebhook(req, res) {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token) {
      const isTokenValid = timingSafeCompare(token, MESSENGER_VERIFY_TOKEN);
      if (isTokenValid) {
        console.log('[Auth] Webhook subscription handshake verified.');
        return res.status(200).send(challenge);
      }
    }
    console.warn('[Auth] Webhook subscription handshake failed (unauthorized).');
    return res.status(403).send('Forbidden');
  },

  /**
   * Facebook Signature Verification (x-hub-signature-256)
   */
  verifyMetaSignature(req, res, next) {
    if (!MESSENGER_APP_SECRET) {
      return next(); // Skip signature verification if APP_SECRET is not configured
    }

    const signature = req.headers['x-hub-signature-256'];
    if (!signature) {
      console.warn('[Auth] Meta Signature Header missing.');
      return res.status(401).send('Signature missing');
    }

    const elements = signature.split('=');
    const signatureHash = elements[1];

    const expectedHash = crypto
      .createHmac('sha256', MESSENGER_APP_SECRET)
      .update(req.rawBody || JSON.stringify(req.body))
      .digest('hex');

    if (timingSafeCompare(signatureHash, expectedHash)) {
      next();
    } else {
      console.warn('[Auth] Meta Signature comparison mismatch.');
      res.status(401).send('Signature mismatch');
    }
  },

  /**
   * JWT Authentication for CRM Backend Endpoints
   */
  validateJWT(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'Authorization header missing.' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ success: false, message: 'Invalid Authorization header format.' });
    }

    const token = parts[1];
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
      }
      req.user = decoded;
      next();
    });
  },

  /**
   * General API Key Check (for simple service-to-service calls)
   */
  validateApiKey(req, res, next) {
    const key = req.headers['x-api-key'] || req.query.token;
    const expectedKey = process.env.SHEETS_API_KEY || 'BlissSecureToken2026';
    
    if (key && timingSafeCompare(key, expectedKey)) {
      next();
    } else {
      res.status(401).json({ success: false, message: 'Unauthorized API key access.' });
    }
  }
};

module.exports = authMiddleware;
