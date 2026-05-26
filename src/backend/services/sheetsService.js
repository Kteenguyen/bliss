const config = require('../config/sheets');

let roomsCache = [];
let bookingsCache = [];
let customersCache = [];
let isLoaded = false;

const sheetsService = {
  getRooms() {
    return roomsCache;
  },

  getBookings() {
    return bookingsCache;
  },

  getCustomers() {
    return customersCache;
  },

  isLoaded() {
    return isLoaded;
  },

  async callGet(sheetKey, params = {}) {
    if (!config.webAppUrl) {
      if (process.env.NODE_ENV === 'test' || process.env.PORT === '3001') {
        // If roomsCache is empty, we must throw to force fallback initialization
        if (roomsCache.length === 0) {
          throw new Error('SHEETS_WEB_APP_URL is not configured (Triggering offline fallback).');
        }
        if (sheetKey === 'rooms') return roomsCache;
        if (sheetKey === 'bookings') return bookingsCache;
        if (sheetKey === 'customers') return customersCache;
      }
      throw new Error('SHEETS_WEB_APP_URL is not configured.');
    }

    try {
      const url = new URL(config.webAppUrl);
      url.searchParams.append('token', config.apiKey);
      url.searchParams.append('sheet', sheetKey);
      Object.keys(params).forEach(key => {
        url.searchParams.append(key, params[key]);
      });

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      if (result.status !== 200) {
        throw new Error(result.message || `Error fetching ${sheetKey} from Google Sheets`);
      }
      return result.data;
    } catch (e) {
      console.error(`[SheetsService] GET request error on '${sheetKey}':`, e.message);
      throw e;
    }
  },

  async callPost(sheetKey, action, payload = {}) {
    if (!config.webAppUrl) {
      console.warn('[SheetsService] SHEETS_WEB_APP_URL is not configured. Skipping post write.');
      return { success: true, id: payload.id || 'MOCK_ID', data: payload.data };
    }

    try {
      const body = {
        token: config.apiKey,
        sheet: sheetKey,
        action: action,
        ...payload
      };

      const response = await fetch(config.webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      if (result.status !== 200) {
        throw new Error(result.message || `Error executing '${action}' on '${sheetKey}'`);
      }
      return result;
    } catch (e) {
      console.error(`[SheetsService] POST request error on '${sheetKey}' [${action}]:`, e.message);
      throw e;
    }
  },

  async init() {
    console.log('[SheetsService] Initializing cache bootstrap...');
    try {
      await Promise.all([
        this.syncCache('rooms'),
        this.syncCache('bookings'),
        this.syncCache('customers')
      ]);
      isLoaded = true;
      console.log('[SheetsService] Cache bootstrap completed successfully.');
    } catch (e) {
      console.warn('[SheetsService] Warning: Cache bootstrap failed. Using local offline fallback data.', e.message);
      // Generate some dummy offline fallback data if cache is empty
      if (roomsCache.length === 0) {
        roomsCache = [
          { room_id:'XH01', room_name:'Phòng Việt Nam', branch:'cs1', branch_name:'Chi nhánh Tân Bình (CS1)', address:'71 Xuân Hồng, Phường 12, Quận Tân Bình', capacity:2, base_price_weekday:600000, base_price_weekend:800000, emoji:'🇻🇳', status:'active', amenities:['Bếp tự nấu','WiFi','PS4','Ban công'], images:['images/room_1_main.png'], slot_prices:{"08:00 - 11:00": 150000, "11:30 - 14:30": 170000, "15:00 - 18:00": 150000, "18:30 - 21:30": 180000, "22:00 - 08:00": 250000} },
          { room_id:'BTH201', room_name:'Phòng Homestay Cosy', branch:'cs2', branch_name:'Chi nhánh Quận 10 (CS2)', address:'25a Đường 3 Tháng 2, Phường 11, Quận 10', capacity:2, base_price_weekday:620000, base_price_weekend:820000, emoji:'🏡', status:'active', amenities:['Bếp tự nấu','PS4','WiFi','NVS riêng'], images:['images/room_2_main.png'], slot_prices:{"08:00 - 11:00": 150000, "11:30 - 14:30": 170000, "15:00 - 18:00": 150000, "18:30 - 21:30": 180000, "22:00 - 08:00": 250000} },
          { room_id:'PHC01', room_name:'Phòng Homestay Bida', branch:'cs3', branch_name:'Chi nhánh Quận 5 (CS3)', address:'2N Phạm Hữu Chí, Phường 12, Quận 5', capacity:2, base_price_weekday:600000, base_price_weekend:800000, emoji:'🎱', status:'active', amenities:['Bàn bida','Bếp tự nấu','Cửa sổ','WiFi'], images:['images/room_1_main.png'], slot_prices:{"08:00 - 11:00": 140000, "11:30 - 14:30": 160000, "15:00 - 18:00": 140000, "18:30 - 21:30": 170000, "22:00 - 08:00": 240000} },
          { room_id:'BB411', room_name:'Bigbox It Takes Two', branch:'cs4', branch_name:'Chi nhánh Gò Vấp (CS4)', address:'331/16 Phan Huy Ích, Phường 14, Quận Gò Vấp', capacity:2, base_price_weekday:580000, base_price_weekend:780000, emoji:'🧸', status:'active', amenities:['PS4','Sofa bàn trà','Cửa sổ','WiFi'], images:['images/room_2_main.png'], slot_prices:{"08:00 - 11:00": 160000, "11:30 - 14:30": 180000, "15:00 - 18:00": 160000, "18:30 - 21:30": 190000, "22:00 - 08:00": 270000} },
          { room_id:'DT501', room_name:'Phòng Mario', branch:'cs5', branch_name:'Chi nhánh Bình Thạnh (CS5)', address:'217/70/5 Bùi Đình Tuý, Phường 14, Quận Bình Thạnh', capacity:2, base_price_weekday:550000, base_price_weekend:750000, emoji:'🍄', status:'active', amenities:['PS4','Sofa bàn trà','WiFi','Pantry'], images:['images/room_1_main.png'], slot_prices:{"08:00 - 11:00": 170000, "11:30 - 14:30": 190000, "15:00 - 18:00": 170000, "18:30 - 21:30": 200000, "22:00 - 08:00": 290000} }
        ];
      }
      isLoaded = true;
    }
  },

  startSyncPolling() {
    // Run periodic sync polling every 60 seconds
    setInterval(async () => {
      console.log('[SheetsService] Running periodic polling cache sync...');
      try {
        await Promise.all([
          this.syncCache('rooms'),
          this.syncCache('bookings'),
          this.syncCache('customers')
        ]);
        console.log('[SheetsService] Periodic sync successful.');
      } catch (e) {
        console.warn('[SheetsService] Periodic sync failed:', e.message);
      }
    }, 60000);
  },

  async syncCache(sheetKey) {
    const data = await this.callGet(sheetKey);
    if (!data) return;

    if (sheetKey === 'rooms') {
      roomsCache = data;
    } else if (sheetKey === 'bookings') {
      bookingsCache = data;
    } else if (sheetKey === 'customers') {
      customersCache = data;
    }
    console.log(`[SheetsService] Synced cache for '${sheetKey}': ${data.length} records.`);
  },

  // --- OPTIMISTIC WRITE METHODS (Instantly update server cache) ---
  optimisticCreateBooking(booking) {
    bookingsCache.unshift(booking);
  },

  optimisticUpdateBooking(id, data) {
    const idx = bookingsCache.findIndex(b => b.booking_id === id);
    if (idx >= 0) {
      bookingsCache[idx] = { ...bookingsCache[idx], ...data, updated_at: new Date().toISOString() };
    }
  },

  optimisticCreateCustomer(customer) {
    customersCache.unshift(customer);
  },

  optimisticUpdateCustomer(id, data) {
    const idx = customersCache.findIndex(c => c.customer_id === id);
    if (idx >= 0) {
      customersCache[idx] = { ...customersCache[idx], ...data, updated_at: new Date().toISOString() };
    }
  },

  optimisticCreateRoom(room) {
    roomsCache.push(room);
  },

  optimisticUpdateRoom(id, data) {
    const idx = roomsCache.findIndex(r => r.room_id === id);
    if (idx >= 0) {
      roomsCache[idx] = { ...roomsCache[idx], ...data, updated_at: new Date().toISOString() };
    }
  },

  optimisticDeleteRoom(id) {
    const idx = roomsCache.findIndex(r => r.room_id === id);
    if (idx >= 0) {
      roomsCache[idx].status = 'inactive';
    }
  },

  // --- DIRECT WRITE METHODS (Used by QueueService to execute writes in background) ---
  async directCreate(sheetKey, data) {
    return this.callPost(sheetKey, 'create', { data });
  },

  async directUpdate(sheetKey, id, data) {
    return this.callPost(sheetKey, 'update', { id, data });
  },

  async directDelete(sheetKey, id, force = false) {
    return this.callPost(sheetKey, 'delete', { id, force });
  },

  async directCreateBatch(sheetKey, dataArray) {
    return this.callPost(sheetKey, 'create', { data: dataArray });
  }
};

module.exports = sheetsService;
