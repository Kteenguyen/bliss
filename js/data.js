// ============================================================
// data.js — Mock data & localStorage management
// ============================================================

const STORAGE = {
  ROOMS:     'bliss_rooms',
  BOOKINGS:  'bliss_bookings',
  SETTINGS:  'bliss_settings',
  ACTIVITY:  'bliss_activity',
  COUNTERS:  'bliss_counters',
};

function todayPlus(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

const BRANCH_META = {
  da_lat:    { name: 'Đà Lạt',   flag: '🏔️' },
  hoi_an:    { name: 'Hội An',   flag: '🏮' },
  nha_trang: { name: 'Nha Trang', flag: '🌊' },
};

const SEED_ROOMS = [
  { room_id:'R001', room_name:'Phòng Sương Mù',    branch:'da_lat',    branch_name:'Đà Lạt',    capacity:2, base_price_weekday:800000,  base_price_weekend:1200000, amenities:['WiFi','TV','Điều hoà','Bồn tắm','Ban công view núi'], emoji:'🏔️', description:'Phòng lãng mạn với view núi sương mù buổi sáng, bồn tắm đá và ban công riêng.', status:'active' },
  { room_id:'R002', room_name:'Suite Hoa Anh Đào', branch:'da_lat',    branch_name:'Đà Lạt',    capacity:4, base_price_weekday:1500000, base_price_weekend:2200000, amenities:['WiFi','TV','Điều hoà','Bếp mini','Phòng khách','Lò sưởi'], emoji:'🌸', description:'Suite gia đình rộng rãi, phòng khách riêng, lò sưởi ấm cúng mùa đông.', status:'active' },
  { room_id:'R003', room_name:'Phòng Hội An Cổ',  branch:'hoi_an',    branch_name:'Hội An',    capacity:2, base_price_weekday:900000,  base_price_weekend:1400000, amenities:['WiFi','TV','Điều hoà','Hồ bơi chung','Xe đạp miễn phí'], emoji:'🏮', description:'Phong cách cổ trấn Hội An, hồ bơi và xe đạp để khám phá phố cổ.', status:'active' },
  { room_id:'R004', room_name:'Lantern Loft',      branch:'hoi_an',    branch_name:'Hội An',    capacity:3, base_price_weekday:1200000, base_price_weekend:1800000, amenities:['WiFi','TV','Điều hoà','Hồ bơi','Bữa sáng included'], emoji:'🪔', description:'Phòng Loft 2 tầng độc đáo, view kênh nước Hội An, bao gồm bữa sáng.', status:'active' },
  { room_id:'R005', room_name:'Phòng Biển Xanh',  branch:'nha_trang', branch_name:'Nha Trang', capacity:2, base_price_weekday:700000,  base_price_weekend:1100000, amenities:['WiFi','TV','Điều hoà','View biển trực tiếp','Bãi tắm riêng'], emoji:'🌊', description:'View biển trực tiếp từ giường ngủ, 50m đến bãi tắm riêng.', status:'active' },
  { room_id:'R006', room_name:'Sunset Villa',      branch:'nha_trang', branch_name:'Nha Trang', capacity:6, base_price_weekday:3500000, base_price_weekend:5000000, amenities:['WiFi','3 phòng ngủ','Hồ bơi riêng','Bếp đầy đủ','BBQ','View hoàng hôn'], emoji:'🌅', description:'Villa hạng sang 3 phòng ngủ, hồ bơi riêng, lý tưởng cho nhóm và gia đình.', status:'active' },
];

const SEED_BOOKINGS = [
  { booking_id:'BL001', customer_name:'Nguyễn Thị Lan',  customer_phone:'0901234567', customer_fb_id:'fb_001', branch:'da_lat',    branch_name:'Đà Lạt',    room_id:'R001', room_name:'Phòng Sương Mù',   check_in_date:todayPlus(1),  check_out_date:todayPlus(3),  num_guests:2, total_price:2800000,  status:'confirmed',  special_requests:'Phòng yên tĩnh, hoa trang trí', created_at:new Date().toISOString(),                        source:'facebook', review_sent:false },
  { booking_id:'BL002', customer_name:'Trần Văn Minh',   customer_phone:'0912345678', customer_fb_id:'fb_002', branch:'hoi_an',    branch_name:'Hội An',    room_id:'R003', room_name:'Phòng Hội An Cổ', check_in_date:todayPlus(-1), check_out_date:todayPlus(0),  num_guests:2, total_price:2700000,  status:'checked_in', special_requests:null,                             created_at:new Date(Date.now()-2*864e5).toISOString(),       source:'zalo',     review_sent:false },
  { booking_id:'BL003', customer_name:'Phạm Thị Hương',  customer_phone:'0923456789', customer_fb_id:'fb_003', branch:'nha_trang', branch_name:'Nha Trang', room_id:'R005', room_name:'Phòng Biển Xanh', check_in_date:todayPlus(3),  check_out_date:todayPlus(5),  num_guests:2, total_price:2200000,  status:'confirmed',  special_requests:'Honeymoon — hoa & nến',           created_at:new Date(Date.now()-864e5).toISOString(),         source:'facebook', review_sent:false },
  { booking_id:'BL004', customer_name:'Lê Quang Đức',    customer_phone:'0934567890', customer_fb_id:'fb_004', branch:'nha_trang', branch_name:'Nha Trang', room_id:'R006', room_name:'Sunset Villa',     check_in_date:todayPlus(7),  check_out_date:todayPlus(10), num_guests:6, total_price:17500000, status:'confirmed',  special_requests:'BBQ package, đón sân bay',         created_at:new Date().toISOString(),                        source:'website',  review_sent:false },
  { booking_id:'BL005', customer_name:'Hoàng Thị Mai',   customer_phone:'0945678901', customer_fb_id:'fb_005', branch:'da_lat',    branch_name:'Đà Lạt',    room_id:'R002', room_name:'Suite Hoa Anh Đào',check_in_date:todayPlus(-3), check_out_date:todayPlus(-1), num_guests:4, total_price:6600000,  status:'checked_out',special_requests:null,                             created_at:new Date(Date.now()-4*864e5).toISOString(),       source:'direct',   review_sent:true  },
];

const SEED_ACTIVITY = [
  { id:'A001', time:new Date(Date.now()-5*60000).toISOString(),    type:'booking',    msg:'🎉 Đặt phòng mới: BL004 — Sunset Villa (Nha Trang)', color:'green'  },
  { id:'A002', time:new Date(Date.now()-18*60000).toISOString(),   type:'checkin',    msg:'✅ Check-in: BL002 — Trần Văn Minh đã nhận phòng',  color:'blue'   },
  { id:'A003', time:new Date(Date.now()-45*60000).toISOString(),   type:'message',    msg:'💬 Bot tự động trả lời báo giá cho 3 khách',        color:'purple' },
  { id:'A004', time:new Date(Date.now()-2*3600000).toISOString(),  type:'automation', msg:'📩 Gửi reminder check-in cho BL001 (Nguyễn Thị Lan)',color:'orange' },
  { id:'A005', time:new Date(Date.now()-3*3600000).toISOString(),  type:'booking',    msg:'🎉 Đặt phòng mới: BL003 — Phòng Biển Xanh',        color:'green'  },
];

// ════════════════════════════════════════════════════════════
const DB = {
  // ─── Bootstrap ──────────────────────────────────────────
  init() {
    if (!localStorage.getItem(STORAGE.ROOMS))    localStorage.setItem(STORAGE.ROOMS,    JSON.stringify(SEED_ROOMS));
    if (!localStorage.getItem(STORAGE.BOOKINGS)) localStorage.setItem(STORAGE.BOOKINGS, JSON.stringify(SEED_BOOKINGS));
    if (!localStorage.getItem(STORAGE.ACTIVITY)) localStorage.setItem(STORAGE.ACTIVITY, JSON.stringify(SEED_ACTIVITY));
    if (!localStorage.getItem(STORAGE.SETTINGS)) localStorage.setItem(STORAGE.SETTINGS, JSON.stringify({ gemini_key:'', pin_prefix:'6789' }));
    if (!localStorage.getItem(STORAGE.COUNTERS)) localStorage.setItem(STORAGE.COUNTERS, JSON.stringify({ room_seq:6, booking_seq:5 }));
  },

  reset() {
    Object.values(STORAGE).forEach(k => localStorage.removeItem(k));
    this.init();
  },

  // ─── ID generators ──────────────────────────────────────
  _nextId(counterKey, prefix, pad) {
    const c = JSON.parse(localStorage.getItem(STORAGE.COUNTERS) || '{}');
    c[counterKey] = (c[counterKey] || 0) + 1;
    localStorage.setItem(STORAGE.COUNTERS, JSON.stringify(c));
    return prefix + String(c[counterKey]).padStart(pad, '0');
  },
  nextRoomId()    { return this._nextId('room_seq',    'R', 3); },
  nextBookingId() { return this._nextId('booking_seq', 'BL', 3); },

  // ════════════════════════════════════════════════════════
  // ROOMS CRUD
  // ════════════════════════════════════════════════════════
  getRooms()              { return JSON.parse(localStorage.getItem(STORAGE.ROOMS) || '[]'); },
  getRoomsByBranch(branch){ return this.getRooms().filter(r => branch === 'all' || r.branch === branch); },
  getRoom(id)             { return this.getRooms().find(r => r.room_id === id) || null; },

  /** Create a new room — auto-assigns room_id */
  createRoom(data) {
    const rooms = this.getRooms();
    const room  = {
      room_id:             this.nextRoomId(),
      room_name:           data.room_name,
      branch:              data.branch,
      branch_name:         BRANCH_META[data.branch]?.name || data.branch,
      capacity:            Number(data.capacity) || 2,
      base_price_weekday:  Number(data.base_price_weekday) || 0,
      base_price_weekend:  Number(data.base_price_weekend) || 0,
      amenities:           Array.isArray(data.amenities) ? data.amenities : (data.amenities||'').split(',').map(s=>s.trim()).filter(Boolean),
      emoji:               data.emoji || '🏠',
      description:         data.description || '',
      status:              data.status || 'active',
      created_at:          new Date().toISOString(),
    };
    rooms.push(room);
    localStorage.setItem(STORAGE.ROOMS, JSON.stringify(rooms));
    this.addActivity({ type:'room', msg:`🏠 Thêm phòng mới: ${room.room_name} (${room.branch_name})`, color:'green' });
    return room;
  },

  /** Update existing room by room_id */
  updateRoom(id, updates) {
    const rooms = this.getRooms();
    const idx   = rooms.findIndex(r => r.room_id === id);
    if (idx < 0) return null;
    if (updates.branch && !updates.branch_name)
      updates.branch_name = BRANCH_META[updates.branch]?.name || updates.branch;
    if (updates.amenities && !Array.isArray(updates.amenities))
      updates.amenities = updates.amenities.split(',').map(s=>s.trim()).filter(Boolean);
    if (updates.capacity)          updates.capacity          = Number(updates.capacity);
    if (updates.base_price_weekday) updates.base_price_weekday = Number(updates.base_price_weekday);
    if (updates.base_price_weekend) updates.base_price_weekend = Number(updates.base_price_weekend);
    rooms[idx] = { ...rooms[idx], ...updates, updated_at: new Date().toISOString() };
    localStorage.setItem(STORAGE.ROOMS, JSON.stringify(rooms));
    this.addActivity({ type:'room', msg:`✏️ Cập nhật phòng: ${rooms[idx].room_name}`, color:'blue' });
    return rooms[idx];
  },

  /** Soft-delete: set status = 'inactive'. Pass force=true to hard delete */
  deleteRoom(id, force = false) {
    const rooms = this.getRooms();
    const room  = rooms.find(r => r.room_id === id);
    if (!room) return false;
    // Guard: cannot delete if active bookings exist
    const hasActive = this.getBookings().some(b =>
      b.room_id === id && ['confirmed','checked_in'].includes(b.status)
    );
    if (hasActive) return { error: 'Phòng đang có booking active — không thể xoá!' };
    if (force) {
      const updated = rooms.filter(r => r.room_id !== id);
      localStorage.setItem(STORAGE.ROOMS, JSON.stringify(updated));
    } else {
      this.updateRoom(id, { status: 'inactive' });
    }
    this.addActivity({ type:'room', msg:`🗑️ ${force?'Xoá':'Ẩn'} phòng: ${room.room_name}`, color:'red' });
    return true;
  },

  /** Restore an inactive room */
  restoreRoom(id) {
    return this.updateRoom(id, { status: 'active' });
  },

  // ════════════════════════════════════════════════════════
  // BOOKINGS CRUD
  // ════════════════════════════════════════════════════════
  getBookings()     { return JSON.parse(localStorage.getItem(STORAGE.BOOKINGS) || '[]'); },
  getBooking(id)    { return this.getBookings().find(b => b.booking_id === id) || null; },

  saveBooking(booking) {
    const list = this.getBookings();
    const idx  = list.findIndex(b => b.booking_id === booking.booking_id);
    if (idx >= 0) list[idx] = booking; else list.unshift(booking);
    localStorage.setItem(STORAGE.BOOKINGS, JSON.stringify(list));
    return booking;
  },

  createBooking(data) {
    const booking = {
      booking_id:      this.nextBookingId(),
      created_at:      new Date().toISOString(),
      review_sent:     false,
      source:          'chat_demo',
      ...data,
    };
    const list = this.getBookings();
    list.unshift(booking);
    localStorage.setItem(STORAGE.BOOKINGS, JSON.stringify(list));
    this.addActivity({ type:'booking', msg:`🎉 Đặt phòng mới: ${booking.booking_id} — ${data.room_name} (${data.branch_name})`, color:'green' });
    return booking;
  },

  updateBooking(id, updates) {
    const b = this.getBooking(id);
    if (!b) return null;
    return this.saveBooking({ ...b, ...updates, updated_at: new Date().toISOString() });
  },

  updateBookingStatus(id, status) {
    return this.updateBooking(id, { status });
  },

  deleteBooking(id) {
    const list    = this.getBookings();
    const booking = list.find(b => b.booking_id === id);
    if (!booking) return false;
    const updated = list.filter(b => b.booking_id !== id);
    localStorage.setItem(STORAGE.BOOKINGS, JSON.stringify(updated));
    this.addActivity({ type:'booking', msg:`🗑️ Xoá booking: ${id}`, color:'red' });
    return true;
  },

  // ─── Availability check ────────────────────────────────
  isAvailable(roomId, checkIn, checkOut) {
    const bookings = this.getBookings().filter(b =>
      b.room_id === roomId && !['cancelled','checked_out'].includes(b.status)
    );
    return !bookings.some(b => !(checkOut <= b.check_in_date || checkIn >= b.check_out_date));
  },

  // ─── Price calculation ────────────────────────────────
  calcPrice(room, checkIn, checkOut) {
    const ci = new Date(checkIn), co = new Date(checkOut);
    let weekdays = 0, weekends = 0;
    for (let d = new Date(ci); d < co; d.setDate(d.getDate()+1)) {
      (d.getDay()===0||d.getDay()===6) ? weekends++ : weekdays++;
    }
    return weekdays * room.base_price_weekday + weekends * room.base_price_weekend;
  },

  // ─── Activity feed ────────────────────────────────────
  getActivity()       { return JSON.parse(localStorage.getItem(STORAGE.ACTIVITY) || '[]'); },
  addActivity(item)   {
    const list = this.getActivity();
    list.unshift({ id:'A'+Date.now(), time:new Date().toISOString(), ...item });
    localStorage.setItem(STORAGE.ACTIVITY, JSON.stringify(list.slice(0,100)));
  },

  // ─── Settings ─────────────────────────────────────────
  getSettings()       { return JSON.parse(localStorage.getItem(STORAGE.SETTINGS) || '{}'); },
  saveSettings(s)     { localStorage.setItem(STORAGE.SETTINGS, JSON.stringify(s)); },

  // ─── Stats ────────────────────────────────────────────
  getStats() {
    const bookings  = this.getBookings();
    const rooms     = this.getRooms().filter(r => r.status !== 'inactive');
    const today     = new Date().toISOString().split('T')[0];
    const confirmed = bookings.filter(b => ['confirmed','checked_in'].includes(b.status));
    const revenue   = confirmed.reduce((s,b) => s + b.total_price, 0);
    const checkinTomorrow  = bookings.filter(b => b.check_in_date === todayPlus(1) && b.status==='confirmed').length;
    const checkoutToday    = bookings.filter(b => b.check_out_date === today && b.status==='checked_in').length;
    const totalRooms = rooms.length || 1;

    const countByBranch = branch =>
      confirmed.filter(b => b.branch === branch).length;

    return {
      totalBookings:  bookings.length,
      totalRooms,
      activeBookings: confirmed.length,
      revenue,
      occupancyRate:  Math.round((confirmed.length / totalRooms) * 100),
      checkinTomorrow,
      checkoutToday,
      byBranch: {
        da_lat:    countByBranch('da_lat'),
        hoi_an:    countByBranch('hoi_an'),
        nha_trang: countByBranch('nha_trang'),
      },
      roomsPerBranch: {
        da_lat:    rooms.filter(r=>r.branch==='da_lat').length,
        hoi_an:    rooms.filter(r=>r.branch==='hoi_an').length,
        nha_trang: rooms.filter(r=>r.branch==='nha_trang').length,
      },
    };
  },
};
