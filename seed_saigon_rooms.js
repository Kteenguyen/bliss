require('dotenv').config();

const WEB_APP_URL = process.env.SHEETS_WEB_APP_URL;
const API_KEY = process.env.SHEETS_API_KEY || 'BlissSecureToken2026';

if (!WEB_APP_URL) {
  console.error('Lỗi: Chưa cấu hình SHEETS_WEB_APP_URL trong file .env!');
  process.exit(1);
}

const newRooms = [
  {
    room_id: 'SG-CS1-01',
    room_name: 'Phòng Studio Cát Tường',
    branch: 'cs1',
    branch_name: 'Chi nhánh Tân Bình (CS1)',
    address: '71 Xuân Hồng, Phường 12, Quận Tân Bình',
    capacity: 2,
    base_price_weekday: 500000,
    base_price_weekend: 700000,
    slot_prices: { "08:00 - 11:00": 150000, "11:30 - 14:30": 170000, "15:00 - 18:00": 150000, "18:30 - 21:30": 180000, "22:00 - 08:00": 250000 },
    amenities: ["Bếp tự nấu", "WiFi", "NVS riêng", "Điều hòa", "Tủ lạnh", "Gương lớn"],
    images: ["images/room_1_main.png", "images/room_1_bath.png"],
    emoji: '🏡',
    description: 'Phòng Studio thiết kế hiện đại, đầy đủ tiện nghi ngay trung tâm quận Tân Bình.',
    status: 'active'
  },
  {
    room_id: 'SG-CS2-01',
    room_name: 'Phòng Standard Hoa Nắng',
    branch: 'cs2',
    branch_name: 'Chi nhánh Quận 10 (CS2)',
    address: '25a Đường 3 Tháng 2, Phường 11, Quận 10',
    capacity: 2,
    base_price_weekday: 550000,
    base_price_weekend: 750000,
    slot_prices: { "08:00 - 11:00": 160000, "11:30 - 14:30": 180000, "15:00 - 18:00": 160000, "18:30 - 21:30": 190000, "22:00 - 08:00": 270000 },
    amenities: ["WiFi", "Sofa bàn trà", "NVS riêng", "Điều hòa", "Gương lớn", "Tủ lạnh"],
    images: ["images/room_2_main.png", "images/room_2_bath.png"],
    emoji: '☀️',
    description: 'Không gian sống ấm cúng, tinh tế trên trục đường chính 3 Tháng 2.',
    status: 'active'
  },
  {
    room_id: 'SG-CS3-01',
    room_name: 'Phòng Vintage Memory',
    branch: 'cs3',
    branch_name: 'Chi nhánh Quận 5 (CS3)',
    address: '2N Phạm Hữu Chí, Phường 12, Quận 5',
    capacity: 2,
    base_price_weekday: 480000,
    base_price_weekend: 680000,
    slot_prices: { "08:00 - 11:00": 140000, "11:30 - 14:30": 160000, "15:00 - 18:00": 140000, "18:30 - 21:30": 170000, "22:00 - 08:00": 240000 },
    amenities: ["Bếp tự nấu", "WiFi", "NVS riêng", "Điều hòa", "Board game", "Tủ lạnh"],
    images: ["images/room_1_main.png", "images/room_1_bath.png"],
    emoji: '🌿',
    description: 'Thiết kế phong cách hoài cổ yên bình, thư thái giữa lòng Quận 5 nhộn nhịp.',
    status: 'active'
  },
  {
    room_id: 'SG-CS4-01',
    room_name: 'Phòng Loft Ban Công',
    branch: 'cs4',
    branch_name: 'Chi nhánh Gò Vấp (CS4)',
    address: '331/16 Phan Huy Ích, Phường 14, Quận Gò Vấp',
    capacity: 3,
    base_price_weekday: 600000,
    base_price_weekend: 850000,
    slot_prices: { "08:00 - 11:00": 180000, "11:30 - 14:30": 200000, "15:00 - 18:00": 180000, "18:30 - 21:30": 220000, "22:00 - 08:00": 300000 },
    amenities: ["Bếp tự nấu", "Máy chiếu", "WiFi", "Ban công", "NVS riêng", "Điều hòa", "Tủ lạnh"],
    images: ["images/room_2_main.png", "images/room_2_bath.png"],
    emoji: '🍃',
    description: 'Căn Loft áp mái thoáng đãng có ban công rộng ngắm hoàng hôn cực chill.',
    status: 'active'
  },
  {
    room_id: 'SG-CS5-01',
    room_name: 'Phòng View Sông Sài Gòn',
    branch: 'cs5',
    branch_name: 'Chi nhánh Bình Thạnh (CS5)',
    address: '217/70/5 Bùi Đình Túy, Phường 14, Quận Bình Thạnh',
    capacity: 2,
    base_price_weekday: 650000,
    base_price_weekend: 900000,
    slot_prices: { "08:00 - 11:00": 190000, "11:30 - 14:30": 220000, "15:00 - 18:00": 190000, "18:30 - 21:30": 240000, "22:00 - 08:00": 330000 },
    amenities: ["Bếp tự nấu", "Bồn tắm", "WiFi", "NVS riêng", "Điều hòa", "Tủ lạnh", "Gương lớn"],
    images: ["images/room_1_main.png", "images/room_1_bath.png"],
    emoji: '🌅',
    description: 'Phòng lãng mạn lộng gió với tầm nhìn trực diện ra sông Sài Gòn rộng mở.',
    status: 'active'
  }
];

async function callAPI(sheet, action, payload = {}) {
  const url = `${WEB_APP_URL}?token=${API_KEY}`;
  const body = {
    token: API_KEY,
    sheet: sheet,
    action: action,
    ...payload
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function run() {
  console.log('============================================================');
  console.log('🔄 ĐANG RESET VÀ SEED DỮ LIỆU PHÒNG SAIGON THEO HÌNH ẢNH...');
  console.log('============================================================');

  // 1. Fetch và xóa tất cả phòng hiện tại
  console.log('1. Đang truy vấn danh sách phòng hiện tại...');
  const roomsRes = await fetch(`${WEB_APP_URL}?token=${API_KEY}&sheet=rooms`).then(r => r.json());
  if (roomsRes.success && roomsRes.data) {
    console.log(`Tìm thấy ${roomsRes.data.length} phòng. Tiến hành xóa cứng...`);
    for (const r of roomsRes.data) {
      console.log(`-> Xóa phòng ${r.room_id}...`);
      await callAPI('rooms', 'delete', { id: r.room_id, force: true });
    }
  }

  // 2. Fetch và xóa tất cả bookings hiện tại để tránh lỗi ràng buộc/rác
  console.log('2. Đang truy vấn danh sách bookings hiện tại...');
  const bookingsRes = await fetch(`${WEB_APP_URL}?token=${API_KEY}&sheet=bookings`).then(r => r.json());
  if (bookingsRes.success && bookingsRes.data) {
    console.log(`Tìm thấy ${bookingsRes.data.length} bookings. Tiến hành xóa cứng...`);
    for (const b of bookingsRes.data) {
      console.log(`-> Xóa booking ${b.booking_id}...`);
      await callAPI('bookings', 'delete', { id: b.booking_id, force: true });
    }
  }

  // 3. Fetch và xóa tất cả customers hiện tại
  console.log('3. Đang truy vấn danh sách khách hàng hiện tại...');
  const customersRes = await fetch(`${WEB_APP_URL}?token=${API_KEY}&sheet=customers`).then(r => r.json());
  if (customersRes.success && customersRes.data) {
    console.log(`Tìm thấy ${customersRes.data.length} khách hàng. Tiến hành xóa cứng...`);
    for (const c of customersRes.data) {
      console.log(`-> Xóa khách hàng ${c.customer_id}...`);
      await callAPI('customers', 'delete', { id: c.customer_id, force: true });
    }
  }

  // 4. Seeding danh sách phòng mới
  console.log('4. Đang nạp danh sách 5 phòng Saigon mới...');
  const seedRes = await callAPI('rooms', 'create', { data: newRooms });
  if (seedRes.success) {
    console.log('✅ Đã nạp 5 hạng phòng Saigon mới thành công!');
  } else {
    console.error('❌ Thất bại khi nạp hạng phòng mới:', seedRes.message);
  }

  // 5. Đồng bộ lại cache cho Express server
  console.log('5. Đang kích hoạt đồng bộ lại cache cho Express server...');
  try {
    const syncRes = await fetch('http://localhost:3000/backend/api/sync-cache', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    }).then(r => r.json());
    
    if (syncRes.success) {
      console.log('✅ Đã đồng bộ cache thành công trên Express server!');
    } else {
      console.warn('⚠️ Lỗi đồng bộ cache:', syncRes.message);
    }
  } catch (err) {
    console.warn('⚠️ Không thể gọi API đồng bộ cache của Express (có thể server chưa chạy hoặc cổng khác):', err.message);
  }

  console.log('============================================================');
  console.log('🎉 QUÁ TRÌNH SEED DỮ LIỆU ĐÃ HOÀN TẤT THÀNH CÔNG!');
  console.log('============================================================');
}

run().catch(console.error);
