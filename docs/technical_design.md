# Technical Design Document: Bliss Homestay AI Hub v3.0

## 1. System Architecture Overview

Bliss Homestay AI Hub v3.0 expands from a local-only Facebook Chatbot server to a multi-channel, enterprise-ready booking hub. It integrates Messenger, Telegram, and WhatsApp into a single Node.js/Express server that orchestrates messaging state machines and synchronizes all operational data (Rooms, Bookings, Customers, and ChatLogs) directly with Google Sheets acting as a zero-cost serverless database.

### 1.1 Architecture Diagram

```mermaid
graph TD
    %% User Channels
    subgraph Users ["Customer Channels"]
        U_FB["Messenger User"]
        U_TG["Telegram User"]
        U_WA["WhatsApp User"]
    end

    %% Webhook Gateways
    subgraph WebhookGateways ["Meta & Telegram Gateways"]
        FB_API["Facebook Messenger API"]
        TG_API["Telegram Bot API"]
        WA_API["WhatsApp Cloud API"]
    end

    %% Server Application
    subgraph Server ["Express Server (Bliss AI Hub v3.0)"]
        Router["Express Router"]
        
        subgraph Middlewares ["Security & Validation"]
            AuthMod["HMAC Signature Verify"]
            RateLimit["Rate Limiting Middleware"]
        end
        
        subgraph Controllers ["Controllers"]
            FBCtrl["Facebook Webhook Controller"]
            TGCtrl["Telegram Webhook Controller"]
            WACtrl["WhatsApp Webhook Controller"]
            RoomCtrl["Rooms CRUD Controller"]
            BookCtrl["Bookings CRUD Controller"]
            CustCtrl["Customers CRUD Controller"]
        end

        subgraph CoreEngine ["Core NLP & Chatbot Logic"]
            NLPEngine["Offline NLP Engine / Gemini AI Extraction"]
            StateMachine["State Machine Engine"]
        end

        subgraph ServiceLayer ["Database & Sync Services"]
            GoogleSheetsSync["Google Sheets Sync Service"]
            InMemoryCache["In-Memory Cache & Locking"]
        end
    end

    %% Storage & UI
    subgraph Storage ["Persistent Storage"]
        GSheetsDB["Google Sheets API v4"]
        RoomsSheet["Sheet: Rooms"]
        BookingsSheet["Sheet: Bookings"]
        CustomersSheet["Sheet: Customers"]
        ChatLogsSheet["Sheet: ChatLogs"]
    end

    subgraph AdminUI ["Admin Dashboard"]
        CRM_Web["Boutique Web UI (index.html)"]
    end

    %% Connectivity Flow
    U_FB <--> FB_API
    U_TG <--> TG_API
    U_WA <--> WA_API

    FB_API -- "POST /webhook/facebook" --> Router
    TG_API -- "POST /webhook/telegram" --> Router
    WA_API -- "POST /webhook/whatsapp" --> Router
    
    CRM_Web -- "REST API (CRUD)" --> Router

    Router --> AuthMod --> RateLimit
    RateLimit --> FBCtrl
    RateLimit --> TGCtrl
    RateLimit --> WACtrl
    RateLimit --> RoomCtrl
    RateLimit --> BookCtrl
    RateLimit --> CustCtrl

    FBCtrl & TGCtrl & WACtrl --> CoreEngine
    CoreEngine --> ServiceLayer
    
    ServiceLayer <--> GSheetsDB
    GSheetsDB --- RoomsSheet
    GSheetsDB --- BookingsSheet
    GSheetsDB --- CustomersSheet
    GSheetsDB --- ChatLogsSheet

    RoomCtrl & BookCtrl & CustCtrl --> ServiceLayer
```

### 1.2 Existing Core Code References
* Local DB & In-Memory Operations: [js/data.js](file:///D:/HOMENEST%20-%20QUESTX/DAR/bliss/js/data.js)
* Vietnamese Offline NLP Engine: [js/services/nlp.js](file:///D:/HOMENEST%20-%20QUESTX/DAR/bliss/js/services/nlp.js)
* State Machine & AI Integration: [js/services/chatbot.js](file:///D:/HOMENEST%20-%20QUESTX/DAR/bliss/js/services/chatbot.js)
* Current Zero-Dependency Facebook Hook: [facebook-bot-server.js](file:///D:/HOMENEST%20-%20QUESTX/DAR/bliss/facebook-bot-server.js)

---

## 2. Google Sheets Database Schema

To support zero-cost database hosting, Google Sheets acts as the system of record. The Express server uses the `googleapis` library with a Google Service Account to read and write rows.

### 2.1 Sheet: Rooms (`rooms`)
This sheet acts as the inventory index of the Homestay.

| Column Letter | Field Name | Data Type | Primary/Foreign Key | Nullable | Description | Validation/Constraint |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A** | `room_id` | String | PK | No | Unique room code (e.g., XH01) | Unique regex: `^[A-Z0-9]+$` |
| **B** | `room_name` | String | - | No | Friendly room name | Max length 100 |
| **C** | `branch` | String | - | No | Branch key (`cs1` to `cs5`) | In: `[cs1, cs2, cs3, cs4, cs5]` |
| **D** | `branch_name` | String | - | No | Unicode branch display name | matching branch |
| **E** | `capacity` | Integer | - | No | Maximum guest occupancy count | Integer >= 1 |
| **F** | `base_price_weekday` | Decimal | - | No | Price per night for Mon - Thu | Numeric >= 0 |
| **G** | `base_price_weekend` | Decimal | - | No | Price per night for Fri - Sun | Numeric >= 0 |
| **H** | `slot_prices` | JSON String | - | No | Hourly/slot pricing model dictionary | Valid JSON dictionary structure |
| **I** | `amenities` | JSON String | - | No | Array of amenities (e.g., `["Bếp", "Bồn tắm"]`) | Valid JSON array of strings |
| **J** | `images` | JSON String | - | No | Array of image assets URLs | Valid JSON array of string URLs |
| **K** | `emoji` | String | - | No | Character representative emoji | Max length 4 |
| **L** | `description` | String | - | Yes | Room layout details and views | Max length 1000 |
| **M** | `status` | String | - | No | Availability toggle (`active` / `inactive`) | In: `[active, inactive]` |
| **N** | `created_at` | DateTime | - | No | Timestamp of creation | ISO 8601 UTC format |
| **O** | `updated_at` | DateTime | - | No | Timestamp of last modification | ISO 8601 UTC format |

### 2.2 Sheet: Bookings (`bookings`)
Records booking transactions, syncing local bookings into the cloud sheet.

| Column Letter | Field Name | Data Type | Primary/Foreign Key | Nullable | Description | Validation/Constraint |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A** | `booking_id` | String | PK | No | Unique reservation identifier | Unique regex: `^BL\d{3,10}$` |
| **B** | `customer_name` | String | - | No | Name provided or fetched from social profile | Max length 100 |
| **C** | `customer_phone` | String | - | Yes | Contact phone number | Valid Vietnamese phone format |
| **D** | `customer_social_id` | String | FK | No | User ID on social (PSID, Chat ID, Phone) | Linked to `Customers` sheet |
| **E** | `branch` | String | - | No | Target branch identifier | In: `[cs1, cs2, cs3, cs4, cs5]` |
| **F** | `branch_name` | String | - | No | Branch display label | - |
| **G** | `room_id` | String | FK | No | Room booked | Must exist in `Rooms` sheet |
| **H** | `room_name` | String | - | No | Room booked name denormalized | - |
| **I** | `check_in_date` | Date | - | No | Start date of stay | YYYY-MM-DD format |
| **J** | `check_out_date` | Date | - | No | End date of stay | YYYY-MM-DD format, > `check_in_date` |
| **K** | `num_guests` | Integer | - | No | Total guest count | Integer >= 1 |
| **L** | `total_price` | Decimal | - | No | Total calculated bill for the stay | Numeric >= 0 |
| **M** | `status` | String | - | No | Booking status state | In: `[confirmed, checked_in, checked_out, cancelled]` |
| **N** | `special_requests` | String | - | Yes | Custom wishes, extra beds, notes | Max length 500 |
| **O** | `source` | String | - | No | Intake channel | In: `[facebook, telegram, whatsapp, website, direct]` |
| **P** | `review_sent` | Boolean | - | No | Flag indicating post-stay feedback ask | TRUE / FALSE |
| **Q** | `created_at` | DateTime | - | No | Reservation timestamp | ISO 8601 UTC format |
| **R** | `updated_at` | DateTime | - | No | Last modification timestamp | ISO 8601 UTC format |

### 2.3 Sheet: Customers (`customers`)
Tracks client profiles across the multiple integrated networks.

| Column Letter | Field Name | Data Type | Primary/Foreign Key | Nullable | Description | Validation/Constraint |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A** | `customer_id` | String | PK | No | Internal system customer code (e.g. C001) | Unique regex: `^C\d{3,8}$` |
| **B** | `customer_name` | String | - | No | Contact display name | Max length 150 |
| **C** | `customer_phone` | String | - | Yes | Phone number | Must be unique if present |
| **D** | `facebook_psid` | String | - | Yes | Messenger Page-Scoped User ID | Unique across Facebook channel |
| **E** | `telegram_chat_id` | String | - | Yes | Telegram User/Chat ID | Unique across Telegram channel |
| **F** | `whatsapp_phone_id` | String | - | Yes | WhatsApp normalized Phone number | Unique across WhatsApp channel |
| **G** | `interaction_count` | Integer | - | No | Total incoming messages processed | Integer >= 0 |
| **H** | `last_booking_id` | String | FK | Yes | Most recent reservation made | Must exist in `Bookings` |
| **I** | `notes` | String | - | Yes | Profile notes, VIP level, warnings | Max length 1000 |
| **J** | `created_at` | DateTime | - | No | Creation date | ISO 8601 UTC format |
| **K** | `updated_at` | DateTime | - | No | Modification date | ISO 8601 UTC format |

### 2.4 Sheet: ChatLogs (`chat_logs`)
Audits all incoming/outgoing messages for debugging, dashboard feeds, and future AI fine-tuning.

| Column Letter | Field Name | Data Type | Primary/Foreign Key | Nullable | Description | Validation/Constraint |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **A** | `log_id` | String | PK | No | Log item entry ID | Unique UUID or timestamp hash |
| **B** | `social_id` | String | FK | No | Identifier matching social channel user | Linked to `Customers` sheet |
| **C** | `channel` | String | - | No | Messaging service | In: `[facebook, telegram, whatsapp]` |
| **D** | `sender_role` | String | - | No | Sender classification | In: `[user, bot, staff]` |
| **E** | `message_content` | String | - | No | Full text payload of communication | Max length 4000 |
| **F** | `parsed_intent` | String | - | Yes | NLP extracted intent classification | Valid state intent |
| **G** | `parsed_entities` | JSON String | - | Yes | NLP extracted dates, guests, branch, budget | Valid JSON metadata object |
| **H** | `timestamp` | DateTime | - | No | Instant message occurred | ISO 8601 UTC format |

---

## 3. Express Server Routes & API Contracts

All API paths return JSON, enforce input validation using standard JSON schemas, and log errors globally.

### 3.1 Room Inventory Endpoints

#### GET `/api/rooms`
Retrieves list of rooms, optionally filtered by branch.

*   **Headers:**
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <AdminJWTToken>`
*   **Query Parameters:**
    *   `branch` (Optional): `cs1` | `cs2` | `cs3` | `cs4` | `cs5` | `all` (Default: `all`)
    *   `status` (Optional): `active` | `inactive` | `all` (Default: `active`)
*   **Response Body (200 OK):**
    ```json
    [
      {
        "room_id": "XH01",
        "room_name": "Phòng Việt Nam",
        "branch": "cs1",
        "branch_name": "Chi nhánh Tân Bình (CS1)",
        "capacity": 2,
        "base_price_weekday": 600000,
        "base_price_weekend": 800000,
        "emoji": "🇻🇳",
        "status": "active"
      }
    ]
    ```

#### POST `/api/rooms`
Creates a new room in the Google Sheet database.

*   **Headers:**
    *   `Content-Type: application/json`
    *   `Authorization: Bearer <AdminJWTToken>`
*   **Request Body:**
    ```json
    {
      "room_name": "Phòng Việt Nam",
      "branch": "cs1",
      "capacity": 2,
      "base_price_weekday": 600000,
      "base_price_weekend": 800000,
      "emoji": "🇻🇳",
      "amenities": ["Bếp tự nấu", "Bồn tắm", "Máy chiếu"],
      "images": ["https://res.cloudinary.com/bliss/image1.jpg"],
      "description": "Phòng ngủ ấm cúng view thung lũng cẩm tú cầu rực rỡ."
    }
    ```
*   **Response Body (210 Created):**
    ```json
    {
      "success": true,
      "room_id": "R007",
      "message": "Phòng mới đã được tạo và lưu trữ thành công trên Google Sheet."
    }
    ```

#### PUT `/api/rooms/:id`
Updates room configurations.

*   **Request Body:** (Partial update payload matching `POST` structure)
*   **Response Body (200 OK):**
    ```json
    {
      "success": true,
      "message": "Thông tin phòng R001 đã được cập nhật thành công."
    }
    ```

#### DELETE `/api/rooms/:id`
Performs a soft delete (marking status = `inactive`). Supports hard delete if `force=true` is supplied as query parameter (guarded by active booking checks).

*   **Response Body (200 OK):**
    ```json
    {
      "success": true,
      "message": "Phòng R001 đã được chuyển trạng thái sang ngưng hoạt động."
    }
    ```

---

### 3.2 Booking Transaction Endpoints

#### GET `/api/bookings`
Fetch list of reservations. Supports parameters: `status`, `check_in_date` range, `branch`.

*   **Headers:**
    *   `Authorization: Bearer <AdminJWTToken>`
*   **Response Body (200 OK):**
    ```json
    [
      {
        "booking_id": "BL001",
        "customer_name": "Nguyễn Thị Lan",
        "customer_phone": "0901234567",
        "customer_social_id": "fb_001",
        "room_id": "R001",
        "check_in_date": "2026-05-27",
        "check_out_date": "2026-05-29",
        "num_guests": 2,
        "total_price": 2800000,
        "status": "confirmed",
        "source": "facebook"
      }
    ]
    ```

#### POST `/api/bookings`
Manually records a booking. Checks inventory availability first.

*   **Request Body:**
    ```json
    {
      "customer_name": "Trần Cao Minh",
      "customer_phone": "0987654321",
      "customer_social_id": "manual_staff",
      "branch": "cs3",
      "room_id": "PHC01",
      "check_in_date": "2026-06-10",
      "check_out_date": "2026-06-12",
      "num_guests": 2,
      "total_price": 1200000,
      "special_requests": "Phòng bida giải trí",
      "source": "direct"
    }
    ```
*   **Response Body (201 Created):**
    ```json
    {
      "success": true,
      "booking_id": "BL006",
      "message": "Đặt phòng mới thành công và đã gửi xác nhận đến cổng dữ liệu."
    }
    ```
*   **Error Response (409 Conflict):**
    ```json
    {
      "success": false,
      "error": "ERR_ROOM_UNAVAILABLE",
      "message": "Phòng đã có khách đặt trong khoảng thời gian này. Vui lòng chọn phòng hoặc ngày khác!"
    }
    ```

#### PUT `/api/bookings/:id`
Updates customer reservation status (e.g. `checked_in`, `checked_out`, `cancelled`). Triggers automatic actions (like generating PIN door codes or sending review requests).

*   **Request Body:**
    ```json
    {
      "status": "checked_in"
    }
    ```
*   **Response Body (200 OK):**
    ```json
    {
      "success": true,
      "booking_id": "BL001",
      "status": "checked_in",
      "message": "Đã đổi trạng thái booking sang ĐANG Ở. Hệ thống đã tự động kích hoạt mã cửa pin và gửi hướng dẫn check-in."
    }
    ```

---

## 4. Multi-Channel Webhook Handlers

To support multiple chat interfaces, the server exposes dedicated webhook endpoints. All endpoints run verification checks to block unauthenticated requests.

### 4.1 Facebook Messenger Webhook

#### Verification (GET `/webhook/facebook`)
Verifies endpoint legitimacy with Facebook Developer Portal.

*   **Query Parameters:**
    *   `hub.mode`: Should equal `subscribe`
    *   `hub.verify_token`: Custom secure token (e.g., `BlissBotSecure2026`)
    *   `hub.challenge`: Random challenge token sent by Meta
*   **Response:** Plain text containing `hub.challenge` value (if token matches).

#### Message Handling (POST `/webhook/facebook`)
Processes incoming messages and callback postbacks. Signature verified using `X-Hub-Signature-256` SHA-256 header hash of the raw body.

*   **Incoming Message Payload Example (Text & Quick Reply):**
    ```json
    {
      "object": "page",
      "entry": [
        {
          "id": "PAGE_ID",
          "time": 1782292837382,
          "messaging": [
            {
              "sender": { "id": "FB_USER_PSID" },
              "recipient": { "id": "PAGE_ID" },
              "timestamp": 1782292837300,
              "message": {
                "mid": "mid.gB67H...",
                "text": "Mình muốn chọn Tân Bình",
                "quick_reply": {
                  "payload": "cs1"
                }
              }
            }
          ]
        }
      ]
    }
    ```

*   **Outgoing Response Payload Format (Quick Replies Template):**
    ```json
    {
      "recipient": { "id": "FB_USER_PSID" },
      "messaging_type": "RESPONSE",
      "message": {
        "text": "Bạn muốn ở phòng nào tại chi nhánh Tân Bình?",
        "quick_replies": [
          {
            "content_type": "text",
            "title": "🇻🇳 Phòng Việt Nam",
            "payload": "select_room_XH01"
          },
          {
            "content_type": "text",
            "title": "🇯🇵 Phòng Nhật Bản",
            "payload": "select_room_XH02"
          }
        ]
      }
    }
    ```

---

### 4.2 Telegram Webhook

#### Register Webhook (Setup)
Call API to configure hook: `https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://your-domain.com/webhook/telegram&secret_token=<YOUR_SECURE_TOKEN>`.

#### Message Handling (POST `/webhook/telegram`)
Checks `X-Telegram-Bot-Api-Secret-Token` header value matches the configured secure token.

*   **Incoming Payload Example:**
    ```json
    {
      "update_id": 9811228,
      "message": {
        "message_id": 402,
        "from": {
          "id": 8839201,
          "is_bot": false,
          "first_name": "Lan",
          "last_name": "Nguyen",
          "username": "lannguyen99"
        },
        "chat": {
          "id": 8839201,
          "first_name": "Lan",
          "last_name": "Nguyen",
          "type": "private"
        },
        "date": 1782292837,
        "text": "/start"
      }
    }
    ```

*   **Outgoing Response Payload Format:**
    Uses the Telegram Bot API `sendMessage` protocol:
    ```json
    {
      "chat_id": 8839201,
      "text": "Xin chào Lan Nguyen! 👋 Mình là Bliss AI Assistant. Hãy chọn chi nhánh để xem phòng trống:",
      "reply_markup": {
        "keyboard": [
          [{"text": "🏔️ Đà Lạt"}, {"text": "🏮 Hội An"}],
          [{"text": "🌊 Nha Trang"}]
        ],
        "one_time_keyboard": true,
        "resize_keyboard": true
      }
    }
    ```

---

### 4.3 WhatsApp Business Cloud API Webhook

#### Verification (GET `/webhook/whatsapp`)
Identical GET verification flow as Messenger Webhooks, validating Meta callback parameters.

#### Message Handling (POST `/webhook/whatsapp`)
Verifies signature with `X-Hub-Signature-256`.

*   **Incoming Payload Example:**
    ```json
    {
      "object": "whatsapp_business_account",
      "entry": [
        {
          "id": "WABA_ID",
          "changes": [
            {
              "value": {
                "messaging_product": "whatsapp",
                "metadata": {
                  "display_phone_number": "15550293847",
                  "phone_number_id": "WA_PHONE_NUMBER_ID"
                },
                "contacts": [
                  {
                    "profile": { "name": "Nguyễn Hoàng An" },
                    "wa_id": "84909876543"
                  }
                ],
                "messages": [
                  {
                    "from": "84909876543",
                    "id": "wamid.HBgM..." ,
                    "timestamp": "1782292837",
                    "text": {
                      "body": "Có phòng cho 2 người ở Hội An ngày mai không?"
                    },
                    "type": "text"
                  }
                ]
              },
              "field": "messages"
            }
          ]
        }
      ]
    }
    ```

*   **Outgoing Response Payload Format:**
    Sent via `POST https://graph.facebook.com/v20.0/<WA_PHONE_NUMBER_ID>/messages` with auth token:
    ```json
    {
      "messaging_product": "whatsapp",
      "recipient_type": "individual",
      "to": "84909876543",
      "type": "interactive",
      "interactive": {
        "type": "button",
        "header": {
          "type": "text",
          "text": "Bliss Homestay - Hội An 🏮"
        },
        "body": {
          "text": "Chào anh/chị An. Ngày mai chúng em còn các phòng trống sau ở Hội An. Xin vui lòng chọn phòng:"
        },
        "footer": {
          "text": "Chọn 1 trong các tùy chọn phía dưới"
        },
        "action": {
          "buttons": [
            {
              "type": "reply",
              "reply": {
                "id": "select_R003",
                "title": "Phòng Hội An Cổ"
              }
            },
            {
              "type": "reply",
              "reply": {
                "id": "select_R004",
                "title": "Lantern Loft"
              }
            }
          ]
        }
      }
    }
    ```

---

## 5. Webhook State Machine Conversation Flow

The sequence diagram below displays how the Express server receives incoming webhooks, validates signatures, retrieves conversation context, runs rule-based or generative AI (Gemini Flash) extraction, constructs response payloads, and saves booking data back to Google Sheets.

```mermaid
sequenceDiagram
    autonumber
    actor Guest as Customer Channel
    participant WH as Webhook Router
    participant SEC as Security Middleware
    participant SM as State Machine Controller
    participant NLP as NLP Engine (Local/Gemini)
    participant DB as Google Sheets Database Service
    participant MsgAPI as Platform Message API

    %% 1. Initial Greeting
    Guest->>WH: Sends message "Hello, mình muốn đặt phòng" (Messenger/TG/WA)
    WH->>SEC: Forward request
    Note over SEC: Validates token / HMAC SHA-256 signature
    SEC->>SM: Extract sender_id & message text
    SM->>DB: Fetch Customer Profile & Active State Machine Context
    DB-->>SM: Return context (State: IDLE, Context: {})
    SM->>NLP: Parse: "Hello, mình muốn đặt phòng"
    NLP-->>SM: Intent: greeting, entities: {}
    Note over SM: Transition state: IDLE -> COLLECTING_INFO
    SM->>MsgAPI: Build greeting message + Quick Replies (Dalalat/Hoi An/Nha Trang)
    MsgAPI-->>Guest: Deliver greeting bubble options

    %% 2. Data Collection
    Guest->>WH: Clicks "Tân Bình" button
    WH->>SEC: Validate & process payload
    SEC->>SM: Process input "Tân Bình" (payload: "cs1")
    SM->>NLP: Parse "Tân Bình"
    NLP-->>SM: Intent: booking_inquiry, entities: { branch: "cs1" }
    Note over SM: Update context: { branch: "cs1" }
    SM->>MsgAPI: Ask for dates: "Ngày check-in là ngày mấy?"
    MsgAPI-->>Guest: Deliver date inquiry

    Guest->>WH: Sends "ngày mai 2 đêm, 2 người"
    WH->>SEC: Validate & process
    SEC->>SM: Process input "ngày mai 2 đêm, 2 người"
    SM->>NLP: Extract (text: "ngày mai 2 đêm, 2 người", today: "2026-05-26")
    NLP-->>SM: parsed: { check_in: "2026-05-27", check_out: "2026-05-29", guests: 2 }
    Note over SM: Context updated. Check-in, check-out, guests found. All criteria met.
    SM->>DB: Check room availability & pricing (XH01, XH02 for Tan Binh)
    DB-->>SM: XH01: Available (Total: 1,200,000đ), XH02: Available (Total: 1,100,000đ)
    Note over SM: Transition state: COLLECTING_INFO -> SHOWING_QUOTE
    SM->>MsgAPI: Show rooms quote: "[1] Phòng Việt Nam (1.2M)... Gõ số 1 hoặc 2 để đặt"
    MsgAPI-->>Guest: Deliver room selection quote

    %% 3. Booking Confirmation
    Guest->>WH: Sends "1" (select Room XH01)
    WH->>SEC: Validate & process
    SEC->>SM: Process input "1"
    Note over SM: Match selected room: Room XH01. State: SHOWING_QUOTE -> CONFIRMING_BOOKING
    SM->>MsgAPI: Show confirmation: "Xác nhận đặt: Phòng Việt Nam, 27/5-29/5. Gõ OK để chốt"
    MsgAPI-->>Guest: Deliver final invoice verify

    Guest->>WH: Sends "OK"
    WH->>SEC: Validate & process
    SEC->>SM: Process input "OK"
    Note over SM: State: CONFIRMING_BOOKING -> IDLE
    SM->>DB: Write row to 'bookings' sheet (new booking BL006)
    DB-->>SM: Success written (locking updated)
    SM->>MsgAPI: Success: "Đặt phòng thành công! Mã booking #BL006. Mã PIN cửa: 6789##"
    MsgAPI-->>Guest: Deliver final success invoice message
```

---

## 6. Synchronization Service & Database Reliability

Interacting with Google Sheets introduces API network latency and Google API usage quota limits (currently **100 read/write requests per 100 seconds per user**). To ensure reliability, the server implements an asynchronous queue and write-behind cache.

```
[API Endpoint / Webhook]
        │  (Fast Read/Write)
        ▼
┌────────────────────────────────┐
│      Server Memory Cache       │ <─── Optimistic reads return in < 5ms
└────────────────────────────────┘
        │
        │  (Asynchronous Flush Queue)
        ▼
┌────────────────────────────────┐
│     Write-Behind Buffer        │ <─── Batches writes to avoid rate limits
└────────────────────────────────┘
        │
        │  (Throttled API Calls)
        ▼
┌────────────────────────────────┐
│      Google Sheets API         │
└────────────────────────────────┘
```

### 6.1 Real-time Read Caching & Locking
1.  **Bootstrapping Cache:** On application boot, the server loads the entire `rooms`, `bookings`, and `customers` sheets into memory. All availability checks (e.g. `isAvailable()`) and pricing calculations (`calcPrice()`) run against this memory array.
2.  **Optimistic UI / Writes:** When a webhook state machine books a room:
    *   An in-memory lock is placed on `room_id` for the target dates.
    *   The booking is appended to the local in-memory array instantly.
    *   The sync service queues a write operation to Google Sheets in the background.
    *   The client API receives a success code without waiting for the Google Sheets HTTP roundtrip.

### 6.2 Write Queue & Throttling
A queue processor executes background tasks to update Google Sheets. It ensures the server does not exceed the write limits:

*   **Batching Writes:** The scheduler buffers database write requests (`appendRow` or `updateRow`) and flushes them in batches every **3 seconds** using `spreadsheets.values.batchUpdate`. This aggregates multiple updates (bookings, logs, customer metrics) into a single API request, counting as 1 quota usage.
*   **Backoff Retry Engine:** In the event of a Google API timeout or HTTP `429 Too Many Requests` response, the task pauses, waits for **5 seconds**, and retries with an exponential delay increment.

### 6.3 Concurrency Control (Double Booking Prevention)
To prevent double bookings when two separate webhooks (e.g. one from Telegram and one from Messenger) request the same room at the exact same millisecond:

```javascript
// Mutex lock implementation
const reservationLocks = new Map();

async function acquireRoomLock(roomId, checkInDate, checkOutDate) {
  const lockKey = `${roomId}:${checkInDate}:${checkOutDate}`;
  if (reservationLocks.has(lockKey)) {
    return false; // Lock busy, conflict
  }
  reservationLocks.set(lockKey, { timestamp: Date.now() });
  return true; // Lock acquired
}

function releaseRoomLock(roomId, checkInDate, checkOutDate) {
  const lockKey = `${roomId}:${checkInDate}:${checkOutDate}`;
  reservationLocks.delete(lockKey);
}
```

Every room booking operation must acquire the lock. If it fails, the system retries with a sleep loop or automatically falls back to suggest another available room to the customer.

---

## 7. Security, Environment, and Operations

### 7.1 Webhook Authenticity Verification
To prevent malicious agents from making fake POST requests to the webhooks:

#### Messenger and WhatsApp (Meta HMAC-SHA256)
Meta webhook events send an `X-Hub-Signature-256` header. The payload is verified by hashing it with the app's App Secret key:
```javascript
const crypto = require('crypto');

function verifyMetaSignature(req, res, buf) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    throw new Error('Mất chữ ký xác thực Webhook Meta.');
  }
  const elements = signature.split('=');
  const hash = elements[1];
  const expectedHash = crypto
    .createHmac('sha256', process.env.META_APP_SECRET)
    .update(buf)
    .digest('hex');

  if (hash !== expectedHash) {
    throw new Error('Chữ ký xác thực Meta không khớp!');
  }
}
```

#### Telegram Webhook Security
During setup, a `secret_token` string is passed. Telegram sends this token in the `X-Telegram-Bot-Api-Secret-Token` header of every webhook post. The middleware verifies this header value:
```javascript
function verifyTelegramSecret(req, res, next) {
  const secretHeader = req.headers['x-telegram-bot-api-secret-token'];
  if (secretHeader !== process.env.TELEGRAM_SECRET_TOKEN) {
    return res.status(403).json({ error: 'Truy cập trái phép vào Webhook Telegram' });
  }
  next();
}
```

### 7.2 Configuration Environment Variables
The application requires the following variables configured in a secure `.env` file:

```env
# Server configs
PORT=3000
NODE_ENV=production

# Meta Credentials (Facebook & WhatsApp)
META_APP_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
FB_PAGE_ACCESS_TOKEN=EAASt37igz3cBRo...
FB_VERIFY_TOKEN=BlissBotSecure2026
WA_PHONE_NUMBER_ID=109283748291029
WA_ACCESS_TOKEN=EAASt37...

# Telegram Credentials
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
TELEGRAM_SECRET_TOKEN=SecureTelegramTokenString2026

# Gemini AI Engine Credentials
GEMINI_API_KEY=AIzaSyA...

# Google Cloud Service Account (Google Sheets API Integration)
GOOGLE_SERVICE_ACCOUNT_EMAIL=bliss-sheets-account@bliss-homestay.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC7...\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=1a2b3c4d5e6f7g8h9i0j-klmnopqrstu
```

---

## 8. Summary of Design Benefits (v3.0 vs v2.0)

1.  **Multi-channel Reach:** Expands user base from Facebook Messenger to Telegram and WhatsApp.
2.  **Centralized Persistent Database:** Replaces local `server-db.json` and client-side `localStorage` with Google Sheets, allowing non-technical admins to edit rooms or view bookings in real-time directly inside Google Sheets.
3.  **Low Latency & High Scale:** Uses in-memory caching to guarantee `<10ms` response times while throttling updates to Google Sheets in background queues, mitigating Google Sheet API quota exhaustion.
4.  **Bulletproof Security:** Uses Meta signature check, Telegram token verify, and Google Cloud IAM service account keys to protect homestay information.
