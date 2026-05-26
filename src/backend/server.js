require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const db = require('./config/db');
const sheetsService = require('./services/sheetsService');
const queueService = require('./services/queueService');
const automationService = require('./services/automation');

const apiRouter = require('./routes/api');
const webhookRouter = require('./routes/webhooks');
const frontendRouter = require('./routes/frontend');

const app = express();
const PORT = process.env.PORT || 3000;

// Capture raw body for webhook HMAC signature checks
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// --- ROUTE MOUNTING ---
// Mount frontend routing router (for redirects)
app.use('/frontend', frontendRouter);

// --- STATIC ASSETS FOR THE FRONTEND ---
// Mount specific static folder for the guest client-facing booking page
app.use('/frontend/client', express.static(path.join(__dirname, '../frontend/client')));
// Mount Boutique CRM admin dashboard static files
app.use('/frontend/crm', express.static(path.join(__dirname, '../frontend/crm')));
// Mount static folder mapping D:/HOMENEST - QUESTX/DAR/bliss/ at /frontend (for shared assets/images)
app.use('/frontend', express.static(path.join(__dirname, '../../')));
// Provide root fallbacks for assets resolving directly from the client/crm pages
app.use('/images', express.static(path.join(__dirname, '../../images')));

app.use('/backend/api', apiRouter);

// Support both new v3 webhook base (/webhooks) and legacy v2 webhook callback (/webhook) for seamless migration
app.use('/webhooks', webhookRouter);
app.use('/webhook', webhookRouter);

// Redirect / to /frontend/crm for dashboard access
app.get('/', (req, res) => {
  res.redirect('/frontend/crm');
});

// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
  console.error('[Global Error Handler]', err);
  res.status(500).json({ success: false, message: 'An unexpected server error occurred.' });
});

// --- ENGINE INITIALIZATION AND BOOTSTRAP ---
async function bootstrap() {
  console.log('============================================================');
  console.log('🌟 STARTING BLISS HOMESTAY BACKEND ENGINE v3.0 (from src/backend)...');
  console.log('============================================================');
  
  // 1. Initialise local caches from Google Sheets
  await sheetsService.init();

  // 2. Start polling for sheets modifications (frequency 60s)
  sheetsService.startSyncPolling();

  // 3. Start write-behind transaction queue processing (frequency 3s)
  queueService.startQueueProcessor();

  // 4. Start scheduler for automated notifications (S06, S07, S08)
  automationService.startAutomationSchedules();

  // 5. Start listening
  app.listen(PORT, () => {
    console.log('------------------------------------------------------------');
    console.log(`🚀 Server listening on Port ${PORT}`);
    console.log(`📍 Admin Dashboard: http://localhost:${PORT}/frontend`);
    console.log(`📍 CRM API Path:    http://localhost:${PORT}/backend/api`);
    console.log(`📍 Webhook URL:     http://localhost:${PORT}/webhook`);
    console.log('============================================================');
  });
}

bootstrap().catch(err => {
  console.error('[Server Bootstrap Failure]', err);
  process.exit(1);
});
