# Design Critique & Security Review: Bliss Homestay AI Hub v3.0

This document provides a technical critique and security review of the Bliss Homestay AI Hub v3.0 architecture and implementation plan outlined in [technical_design.md](file:///D:/HOMENEST%20-%20QUESTX/DAR/bliss/docs/technical_design.md). It outlines critical edge cases, scalability limitations, data consistency issues, and security vulnerabilities, followed by verification questions for the development team.

---

## 1. Concurrency & Double Booking Risks

The technical design relies on an in-memory lock mechanism (`reservationLocks = new Map()`) to manage concurrent room bookings. This introduces several critical points of failure:

### 1.1 Single-Process In-Memory Locking Limits
*   **The Problem:** The `reservationLocks` Map is scoped exclusively to the local memory of a single Node.js process. If the application is scaled horizontally (e.g., deployed in PM2 cluster mode, running multiple instances behind a load balancer on Render/Heroku/AWS, or during server redeployment), each instance will have its own independent Map.
*   **The Consequence:** Two concurrent users on different channels (e.g., one on Facebook and one on Telegram) hitting different server instances can simultaneously request the same room for the same dates. Both instances will successfully acquire their local locks and write the booking, resulting in a **double booking**.
*   **Recommendation:** Replace the local in-memory lock with a distributed locking mechanism. Since a full Redis instance might break the "zero-cost" constraint, the application can implement locking by storing lock states directly in a dedicated `locks` sheet in Google Sheets (using atomic cell writes) or by migrating the locking registry to a lightweight database like a shared SQLite database if hosting permits.

### 1.2 Lock Abandonment and Memory Leaks
*   **The Problem:** The design snippet sets locks using `reservationLocks.set(lockKey, { timestamp: Date.now() })` but shows no automatic cleanup mechanism or Time-to-Live (TTL) enforcement.
*   **The Consequence:** If a user abandons the booking flow mid-conversation (e.g., at the `CONFIRMING_BOOKING` stage) or if the server crashes before `releaseRoomLock` is called, the lock will remain in memory indefinitely. This results in the room being permanently shown as unavailable to other users, and constitutes an in-memory memory leak.
*   **Recommendation:** Implement a TTL-based lock map with `setTimeout` or a periodic cleanup loop (e.g., automatically deleting locks older than 5 minutes).

### 1.3 Asynchronous Gaps in Lock Checks
*   **The Problem:** The check-in and check-out dates are checked against the local cache using `DB.isAvailable(roomId, checkIn, checkOut)`. Since database operations (writing to sheets) are asynchronous, there is a delay between when a lock is checked, when the user confirms, and when the booking is actually saved and synced.
*   **The Consequence:** If two users query the same room dates concurrently, both will pass the availability check before either has confirmed.
*   **Recommendation:** The lock must be acquired *at the moment the user is shown the room quote* (with a short TTL of 5-10 minutes) rather than only at the final confirmation step, ensuring other users cannot choose the same room while a transaction is pending.

---

## 2. Data Consistency, Cache Sync, and Write-Behind Queue Vulnerabilities

Using Google Sheets as the system of record introduces significant latency and synchronization challenges.

### 2.1 Server Crashes & Data Loss in the Write-Behind Buffer
*   **The Problem:** The write-behind cache queues writes (`appendRow` or `updateRow`) in a memory-only array and returns success to the client API immediately.
*   **The Consequence:** If the Node.js server crashes, restarts (due to an unhandled exception, OOM, PM2 reload, or platform restart), or loses power while writes are still in the queue, **all pending booking records, customer profiles, and chat logs in the buffer are permanently lost**. The customer has already received a confirmation message ("Đặt phòng thành công! Mã booking #BL006"), but no record will ever exist in Google Sheets, leading to severe discrepancies and lost bookings.
*   **Recommendation:** Implement a persistent transactional queue. Before sending a success message to the user, write the pending sync task to a local disk-based file (e.g., using `better-sqlite3` or a simple append-only JSON file log). The background sync service should process tasks from this persistent queue and remove them only after receiving a successful response from the Google Sheets API.

### 2.2 Unidirectional Cache Sync (Stale Cache)
*   **The Problem:** The server bootstraps its cache by reading the Google Sheets on startup. The design does not define any mechanism to sync subsequent changes from Google Sheets back to the server.
*   **The Consequence:** If an administrator directly edits the Google Sheet (e.g., manually cancels a booking, updates a room's base price, or marks a room as `inactive`), the chatbot server will remain completely unaware of these changes until it is restarted. The bot will continue to book inactive rooms or quote outdated prices.
*   **Recommendation:** Implement a polling sync service that periodically fetches updates from Google Sheets (e.g., every 30-60 seconds) or configure an **Apps Script Webhook Trigger** in Google Sheets that makes a POST request to `/api/sync-cache` on the Express server whenever a row is modified.

---

## 3. Webhook Duplicate Deliveries, Replays, and State Machine Robustness

Webhook delivery over HTTP is inherently unreliable and subject to retries.

### 3.1 Webhook Retries causing Race Conditions and State Duplication
*   **The Problem:** Messaging platforms (Meta, Telegram) expect a `200 OK` response within a very tight window (usually 3 seconds for Meta). If our Express server is busy calling the Gemini API (which can take 3-5 seconds to return a response), the platform will timeout, assume delivery failed, and retry sending the exact same webhook payload.
*   **The Consequence:** The server will receive the retried webhook while the first one is still processing. This triggers concurrent executions of the state machine for the same message, causing duplicate Gemini API calls (increasing API costs), duplicate database writes, and corrupting the user's conversational state (e.g., processing "OK" twice and creating two duplicate bookings).
*   **Recommendation:** Implement a **Message Deduplication Middleware** that checks incoming message IDs (`mid` for Messenger, `update_id` for Telegram, and change message `id` for WhatsApp) against a short-lived cache (e.g., using an in-memory Set or local cache with a 10-minute TTL). If a message ID is currently processing or has already been completed, immediately return `200 OK` to the platform and discard the incoming retry.

### 3.2 Webhook Replay Attacks
*   **The Problem:** Without message ID deduplication and timestamp checks, an attacker who intercepts a webhook request can replay it to the server.
*   **The Consequence:** The server will process the replayed message, allowing malicious users to forge confirmations or manipulate bookings.
*   **Recommendation:** Enforce message ID deduplication and verify that the event's timestamp (e.g., `entry[0].time` in Meta) is within a reasonable window (e.g., not older than 5 minutes) before processing.

---

## 4. Platform Quotas, Rate Limits, and Messaging Policies

Each external API integrated into the system imposes strict constraints.

### 4.1 Google Sheets API Quota Exhaustion
*   **The Problem:** Google Sheets API v4 has a limit of 300 read/write requests per minute per project. Writing a new row to `ChatLogs` for *every* incoming and outgoing message will rapidly consume this quota under normal use, and will exhaust it immediately during traffic spikes or denial-of-service attempts.
*   **The Consequence:** Critical CRUD operations (like booking a room) will fail with `429 Too Many Requests` errors when the quota is exhausted.
*   **Recommendation:** Do not use Google Sheets as a real-time log database. Write chat logs to a local file (e.g., SQLite) and only sync summaries or write logs in large, delayed batches (e.g., once every 5 minutes or 100 entries).

### 4.2 Messaging Platform Policies (24-Hour Windows)
*   **The Problem:** Meta Messenger and WhatsApp Cloud API enforce a **24-hour customer service window**. Once 24 hours have elapsed since the user's last message, standard interactive or text messages cannot be sent.
*   **The Consequence:** Automatic workflows like sending check-in details (24 hours before stay) or post-stay review requests (after checkout) will fail with API errors if sent as standard messages.
*   **Recommendation:**
    *   **WhatsApp:** Use pre-approved **WhatsApp Template Messages** for business-initiated notifications outside the 24-hour window (incurs per-message fee).
    *   **Messenger:** Attach appropriate **Message Tags** (such as `CONFIRMED_EVENT_UPDATE` or `POST_PURCHASE_RECEIPT`) to messages sent outside the window.

### 4.3 Telegram Bot API Rate Limits
*   **The Problem:** Telegram enforces a strict limit of **1 message per second** to any individual chat and **30 messages per second** globally across all chats.
*   **The Consequence:** Group notifications or high-frequency automated updates will trigger `429` rate limit exceptions.
*   **Recommendation:** Implement an outgoing message queue with an rate-limiter/scheduler that throttles messages to ensure they conform to Telegram's limits.

---

## 5. Security Review: Token Leakage & Signature Verification

### 5.1 Timing Attacks on Signature and Secret Verification
*   **The Problem:** The signature verification middlewares use standard string comparison (`===` and `!==`):
    ```javascript
    if (hash !== expectedHash) { ... }
    if (secretHeader !== process.env.TELEGRAM_SECRET_TOKEN) { ... }
    ```
    Standard comparison operators evaluate characters sequentially and exit early on the first mismatch. An attacker can analyze the network latency down to microseconds to guess the signature or token character-by-character.
*   **The Consequence:** Attackers can potentially bypass the webhook authentication check and forge incoming events.
*   **Recommendation:** Use `crypto.timingSafeEqual()` for cryptographic comparisons.
    ```javascript
    const crypto = require('crypto');
    
    function safeCompare(a, b) {
      if (!a || !b || a.length !== b.length) return false;
      return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
    }
    ```

### 5.2 Environment Variable Parsing Errors (Google Private Key)
*   **The Problem:** Storing a multiline Google Cloud Service Account Private Key in a `.env` file can lead to parsing issues. Libraries like `dotenv` may load newline characters literally as `\n` strings rather than actual control characters.
*   **The Consequence:** The Google APIs client library will throw cryptographic format errors (`PEM_read_bio_PrivateKey failed`) and fail to connect to Google Sheets.
*   **Recommendation:** Sanitize the private key upon loading:
    ```javascript
    const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
    ```

### 5.3 Token Leakage in Logging and Source Code
*   **The Problem:** Secrets like `FB_PAGE_ACCESS_TOKEN` and `TELEGRAM_BOT_TOKEN` are defined inline in existing scripts (e.g., `facebook-bot-server.js` lines 20-21).
*   **The Consequence:** Committing these files to source control (GitHub, GitLab) will expose credentials to unauthorized parties immediately, triggering automated key scrapers.
*   **Recommendation:** Remove all hardcoded tokens from the codebase. Enforce that all secrets are injected strictly via environment variables, and add `.env` to the `.gitignore` file.

---

## 6. Verification Questions for the Development Team

To resolve design conflicts and ensure system reliability, please address the following verification questions during implementation:

1.  **Distributed Lock & Scaling:** How will the application prevent double bookings if we scale the Node.js server horizontally to multiple instances? Are we planning to migrate the lock registry to a shared service (e.g., Redis or a dedicated lock ledger sheet)?
2.  **Stale Cache Resolution:** If an admin modifies, deletes, or cancels a booking directly in Google Sheets, how will the Express server's in-memory cache detect these updates to prevent stale inventory states? Should we implement an Apps Script trigger or periodic cache pulling?
3.  **Data Loss Prevention:** If the server undergoes an unexpected restart or crash, what mechanism prevents the loss of pending booking writes stored in the in-memory write-behind queue? Should we implement a persistent SQLite queue?
4.  **Webhook Deduplication:** How will the webhook routers handle duplicated retry requests from Meta or Telegram when processing times (e.g., during Gemini AI API calls) exceed 3 seconds? Will a deduplication middleware using message IDs be introduced?
5.  **Quota Management:** Given the 300 write requests per minute limit on the Google Sheets API, how will we prevent rate limit exhaustion from `ChatLogs` during peak traffic? Can we log chats locally instead of writing each message to the spreadsheet?
6.  **24-Hour Messaging Limits:** How will the system send automated check-in PIN reminders or checkout review requests to customers if they fall outside the platform's 24-hour messaging window? Have we registered WhatsApp template messages and configured Facebook message tags?
7.  **Timing Attack Protection:** Will the security middleware be updated to use constant-time comparisons (`crypto.timingSafeEqual`) for validating incoming Meta HMAC signatures and Telegram secret tokens?
8.  **Secrets Management:** Can we confirm that all hardcoded page tokens and API keys are completely stripped from `facebook-bot-server.js` and other script files before committing to Git?
