/**
 * Bliss Homestay AI Hub v3.0 - Automated Test Suite
 * File: test_runner.js
 * 
 * Description:
 * This script runs locally to test Express routes, webhook endpoints, cache sync,
 * concurrency locking (preventing double bookings), and auth.
 */

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');

// Ensure database directories exist
const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Set temporary env variables for testing
process.env.PORT = 3001;
process.env.JWT_SECRET = 'TestSecret2026';
process.env.ADMIN_USERNAME = 'admin';
process.env.ADMIN_PASSWORD = 'BlissAdmin2026';
process.env.SHEETS_API_KEY = 'BlissSecureToken2026';
process.env.MESSENGER_VERIFY_TOKEN = 'BlissVerifyToken2026';
// process.env.SHEETS_WEB_APP_URL = '';

// Import local SQLite db to clear locks before starting
const db = require('./src/backend/config/db');
db.prepare('DELETE FROM locks').run();
db.prepare('DELETE FROM deduplication').run();
db.prepare('DELETE FROM write_queue').run();
db.prepare('DELETE FROM chat_logs').run();

// Initialize the Express App
const app = express();
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

const apiRouter = require('./src/backend/routes/api');
const webhookRouter = require('./src/backend/routes/webhooks');

app.use('/backend/api', apiRouter);
app.use('/webhook', webhookRouter);

let server;
const PORT = 3001;
const BASE_URL = `http://localhost:${PORT}`;

// Test logs holder
const results = [];
function logTest(name, passed, details = '') {
  results.push({ name, passed, details });
  const symbol = passed ? '✅' : '❌';
  console.log(`${symbol} [${passed ? 'PASSED' : 'FAILED'}] ${name} ${details ? `- ${details}` : ''}`);
}

async function run() {
  console.log('\n============================================================');
  console.log('🧪 RUNNING BLISS HOMESTAY INTEGRATION & CONCURRENCY TESTS...');
  console.log('============================================================\n');

  // Start the server
  server = app.listen(PORT, async () => {
    console.log(`[Test Server] Listening on Port ${PORT}`);
    
    try {
      // 1. Initialize sheets cache service with mock data
      const sheetsService = require('./src/backend/services/sheetsService');
      await sheetsService.init(); // loads the roomsCache fallback data

      // 2. Run Tests
      await runAuthTests();
      const jwtToken = await loginAndGetToken();
      
      if (jwtToken) {
        await runRoomRouteTests(jwtToken);
        await runBookingRouteTests(jwtToken);
        await runWebhookTests();
        await runConcurrencyLockTests();
        await runCacheSyncTests();
      } else {
        logTest('Authentication Flow', false, 'Failed to retrieve JWT token. Skipping route tests.');
      }
      
    } catch (e) {
      console.error('Test suite crashed:', e);
    } finally {
      // Close the server and output final summary
      server.close(() => {
        console.log('\n============================================================');
        console.log('📊 TEST EXECUTION SUMMARY:');
        console.log('============================================================');
        const passedCount = results.filter(r => r.passed).length;
        const failedCount = results.filter(r => !r.passed).length;
        console.log(`Total Tests Run: ${results.length}`);
        console.log(`Passed: \x1b[32m${passedCount}\x1b[0m`);
        console.log(`Failed: \x1b[31m${failedCount}\x1b[0m`);
        console.log('============================================================\n');
        process.exit(failedCount > 0 ? 1 : 0);
      });
    }
  });
}

// --- TEST MODULES ---

async function runAuthTests() {
  console.log('\n--- 1. Auth & Session Security Tests ---');
  
  // Test invalid login
  try {
    const res = await fetch(`${BASE_URL}/backend/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'WrongPassword' })
    });
    logTest('Block Invalid Credentials', res.status === 401, `Status: ${res.status}`);
  } catch (err) {
    logTest('Block Invalid Credentials', false, err.message);
  }

  // Test access without JWT
  try {
    const res = await fetch(`${BASE_URL}/backend/api/bookings`, { method: 'GET' });
    logTest('Block Unauthorized Route Access', res.status === 401, `Status: ${res.status}`);
  } catch (err) {
    logTest('Block Unauthorized Route Access', false, err.message);
  }
}

async function loginAndGetToken() {
  try {
    const res = await fetch(`${BASE_URL}/backend/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'BlissAdmin2026' })
    });
    const data = await res.json();
    if (data.success && data.token) {
      logTest('JWT Login Handshake', true, 'Token generated successfully');
      return data.token;
    }
    logTest('JWT Login Handshake', false, 'Token missing in response');
    return null;
  } catch (err) {
    logTest('JWT Login Handshake', false, err.message);
    return null;
  }
}

async function runRoomRouteTests(token) {
  console.log('\n--- 2. Room API Route CRUD Tests ---');

  // GET /backend/api/rooms
  try {
    const res = await fetch(`${BASE_URL}/backend/api/rooms`);
    const data = await res.json();
    logTest('GET All Rooms', res.status === 200 && data.success && data.data.length > 0, `Found ${data.data?.length || 0} rooms`);
  } catch (err) {
    logTest('GET All Rooms', false, err.message);
  }

  // POST /backend/api/rooms
  let createdRoomId = '';
  try {
    const res = await fetch(`${BASE_URL}/backend/api/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        room_name: 'Phòng Sen Trắng',
        branch: 'hoi_an',
        branch_name: 'Hội An',
        address: 'Đường Lý Thường Kiệt, Hội An',
        capacity: 2,
        base_price_weekday: 1000000,
        base_price_weekend: 1500000,
        emoji: '🪷',
        amenities: ['Bếp', 'Bồn tắm', 'Trà chiều']
      })
    });
    const data = await res.json();
    createdRoomId = data.data?.room_id;
    logTest('POST Create New Room', res.status === 201 || res.status === 200, `Room ID: ${createdRoomId}`);
  } catch (err) {
    logTest('POST Create New Room', false, err.message);
  }

  // GET /backend/api/rooms/:id
  if (createdRoomId) {
    try {
      const res = await fetch(`${BASE_URL}/backend/api/rooms/${createdRoomId}`);
      const data = await res.json();
      logTest('GET Single Room By ID', res.status === 200 && data.data?.room_name === 'Phòng Sen Trắng');
    } catch (err) {
      logTest('GET Single Room By ID', false, err.message);
    }

    // PUT /backend/api/rooms/:id
    try {
      const res = await fetch(`${BASE_URL}/backend/api/rooms/${createdRoomId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          room_name: 'Phòng Sen Vàng',
          base_price_weekday: 1100000
        })
      });
      const data = await res.json();
      logTest('PUT Update Room Details', res.status === 200 && data.data?.room_name === 'Phòng Sen Vàng');
    } catch (err) {
      logTest('PUT Update Room Details', false, err.message);
    }

    // DELETE /backend/api/rooms/:id
    try {
      const res = await fetch(`${BASE_URL}/backend/api/rooms/${createdRoomId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      logTest('DELETE Soft-delete Room', res.status === 200);
    } catch (err) {
      logTest('DELETE Soft-delete Room', false, err.message);
    }
  }
}

async function runBookingRouteTests(token) {
  console.log('\n--- 3. Booking API Route CRUD Tests ---');

  // GET /backend/api/bookings
  try {
    const res = await fetch(`${BASE_URL}/backend/api/bookings`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    logTest('GET All Bookings', res.status === 200 && data.success);
  } catch (err) {
    logTest('GET All Bookings', false, err.message);
  }

  // POST /backend/api/bookings (Create booking)
  let bookingId = '';
  try {
    const res = await fetch(`${BASE_URL}/backend/api/bookings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room_id: 'XH01',
        check_in_date: '2026-06-15',
        check_out_date: '2026-06-17',
        customer_name: 'Trần Minh Quân',
        customer_phone: '0909123456',
        num_guests: 2
      })
    });
    const data = await res.json();
    bookingId = data.data?.booking_id;
    logTest('POST Create Reservation', res.status === 201 && data.success, `Booking ID: ${bookingId}`);
  } catch (err) {
    logTest('POST Create Reservation', false, err.message);
  }
 
  // PUT /backend/api/bookings/:id (Change status)
  if (bookingId) {
    try {
      const res = await fetch(`${BASE_URL}/backend/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ checkin_status: 'checked_in' })
      });
      const data = await res.json();
      logTest('PUT Update Booking Status (check-in)', res.status === 200 && data.data?.checkin_status === 'checked_in');
    } catch (err) {
      logTest('PUT Update Booking Status (check-in)', false, err.message);
    }

    // DELETE /backend/api/bookings/:id (Cancel booking)
    try {
      const res = await fetch(`${BASE_URL}/backend/api/bookings/${bookingId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      logTest('DELETE Cancel Reservation (soft)', res.status === 200);
    } catch (err) {
      logTest('DELETE Cancel Reservation (soft)', false, err.message);
    }
  }
}

async function runWebhookTests() {
  console.log('\n--- 4. Webhook Mock Handshakes & Messages ---');

  // Messenger handshake GET
  try {
    const query = 'hub.mode=subscribe&hub.verify_token=BlissVerifyToken2026&hub.challenge=test_challenge';
    const res = await fetch(`${BASE_URL}/webhook/messenger?${query}`);
    const text = await res.text();
    logTest('Messenger Webhook Handshake', res.status === 200 && text === 'test_challenge');
  } catch (err) {
    logTest('Messenger Webhook Handshake', false, err.message);
  }

  // Telegram webhook POST
  try {
    const payload = {
      update_id: 123456,
      message: {
        message_id: 11,
        chat: { id: 88888, type: 'private' },
        text: 'Có phòng trống không?'
      }
    };
    const res = await fetch(`${BASE_URL}/webhook/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    logTest('Telegram Message Webhook', res.status === 200 && data.ok === true);
  } catch (err) {
    logTest('Telegram Message Webhook', false, err.message);
  }

  // Telegram duplicate message test
  try {
    const payload = {
      update_id: 123456, // same update_id to test deduplication
      message: {
        message_id: 11,
        chat: { id: 88888, type: 'private' },
        text: 'Có phòng trống không?'
      }
    };
    const res = await fetch(`${BASE_URL}/webhook/telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    logTest('Telegram Webhook Deduplication Filter', res.status === 200 && text === 'EVENT_RECEIVED', 'Filtered out duplicate update_id successfully');
  } catch (err) {
    logTest('Telegram Webhook Deduplication Filter', false, err.message);
  }
}

async function runConcurrencyLockTests() {
  console.log('\n--- 5. Concurrency & Overlapping Booking Lock Tests ---');

  // Trigger double booking simulation (2 bookings for same room, same dates, fired in parallel)
  const room_id = 'BTH201';
  const randDay = 10 + Math.floor(Math.random() * 15);
  const check_in_date = `2027-08-${randDay}`;
  const check_out_date = `2027-08-${randDay + 2}`;

  const bookingPayload = {
    room_id,
    check_in_date,
    check_out_date,
    customer_name: 'Concurrent Guest',
    customer_phone: '0901112223',
    num_guests: 2
  };

  try {
    // Send two concurrent bookings
    const [res1, res2] = await Promise.all([
      fetch(`${BASE_URL}/backend/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...bookingPayload, customer_name: 'Guest A' })
      }),
      fetch(`${BASE_URL}/backend/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...bookingPayload, customer_name: 'Guest B' })
      })
    ]);

    const status1 = res1.status;
    const status2 = res2.status;

    // One should succeed (201) and the other should fail with either 409 (Conflict from lock) or 400 (Already occupied from double-check)
    const success = (status1 === 201 && (status2 === 409 || status2 === 400)) ||
                    (status2 === 201 && (status1 === 409 || status1 === 400));
    
    logTest('Double Booking Prevention (Concurrency)', success, `Request 1: ${status1}, Request 2: ${status2}`);
  } catch (err) {
    logTest('Double Booking Prevention (Concurrency)', false, err.message);
  }
}

async function runCacheSyncTests() {
  console.log('\n--- 6. Cache Sync Webhook Tests ---');

  // GET /backend/api/sync-cache without token
  try {
    const res = await fetch(`${BASE_URL}/backend/api/sync-cache`);
    logTest('Block Cache Sync without API Key', res.status === 401);
  } catch (err) {
    logTest('Block Cache Sync without API Key', false, err.message);
  }

  // GET /backend/api/sync-cache with token
  try {
    const res = await fetch(`${BASE_URL}/backend/api/sync-cache?token=BlissSecureToken2026`);
    const data = await res.json();
    logTest('GET Cache Sync validation', res.status === 200 && data.success);
  } catch (err) {
    logTest('GET Cache Sync validation', false, err.message);
  }
}

run();
