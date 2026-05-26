require('dotenv').config();

const WEB_APP_URL = process.env.SHEETS_WEB_APP_URL;
const API_KEY = process.env.SHEETS_API_KEY || 'BlissSecureToken2026';

if (!WEB_APP_URL) {
  console.error('Lỗi: Chưa cấu hình SHEETS_WEB_APP_URL trong file .env!');
  process.exit(1);
}

// 59 Real rooms across 5 branches in Saigon
const newRooms = [];

// --- CS1: Tân Bình ---
const cs1Address = '71 Xuân Hồng, Phường 12, Quận Tân Bình';
const cs1BranchName = 'Chi nhánh Tân Bình (CS1)';
const cs1Rooms = [
  { id: 'XH01', name: 'Phòng Việt Nam', emoji: '🇻🇳', cap: 2, priceWd: 600000, priceWe: 800000, amenities: ['Bếp tự nấu', 'WiFi', 'NVS riêng', 'Điều hòa', 'PS4', 'Ban công'] },
  { id: 'XH02', name: 'Phòng Nhật Bản', emoji: '🇯🇵', cap: 2, priceWd: 550000, priceWe: 750000, amenities: ['Bếp tự nấu', 'WiFi', 'NVS riêng', 'Điều hòa', 'Ban công'] },
  { id: 'XH03', name: 'Phòng Boho', emoji: '🌵', cap: 2, priceWd: 550000, priceWe: 750000, amenities: ['Bếp tự nấu', 'WiFi', 'NVS riêng', 'Điều hòa', 'Ban công'] },
  { id: 'XH04', name: 'Phòng Vintage', emoji: '🪵', cap: 2, priceWd: 550000, priceWe: 750000, amenities: ['Bếp tự nấu', 'WiFi', 'NVS riêng', 'Điều hòa', 'Ban công'] },
  { id: 'XH05', name: 'Phòng Đen Trắng', emoji: '🏁', cap: 2, priceWd: 500000, priceWe: 700000, amenities: ['Bếp tự nấu', 'WiFi', 'NVS riêng', 'Điều hòa', 'Cửa sổ'] },
  { id: 'XH06', name: 'Phòng Bida Standard', emoji: '🎱', cap: 2, priceWd: 600000, priceWe: 800000, amenities: ['Bàn bida', 'PS4', 'WiFi', 'NVS riêng', 'Điều hòa'] },
  { id: 'XH07', name: 'Phòng Entertainment', emoji: '🎮', cap: 2, priceWd: 600000, priceWe: 800000, amenities: ['Bàn bida', 'PS4', 'WiFi', 'NVS riêng', 'Điều hòa'] },
  { id: 'XH08', name: 'Phòng Bida & PS4 Premium', emoji: '🏆', cap: 3, priceWd: 650000, priceWe: 850000, amenities: ['Bàn bida', 'PS4', 'Sofa bàn trà', 'WiFi', 'NVS riêng', 'Điều hòa'] },
  { id: 'XH09', name: 'Phòng Game Hub', emoji: '🕹️', cap: 2, priceWd: 600000, priceWe: 800000, amenities: ['Bàn bida', 'PS4', 'WiFi', 'NVS riêng', 'Điều hòa'] },
];
cs1Rooms.forEach(r => {
  newRooms.push({
    room_id: r.id,
    room_name: r.name,
    branch: 'cs1',
    branch_name: cs1BranchName,
    address: cs1Address,
    capacity: r.cap,
    base_price_weekday: r.priceWd,
    base_price_weekend: r.priceWe,
    slot_prices: { "08:00 - 11:00": 150000, "11:30 - 14:30": 170000, "15:00 - 18:00": 150000, "18:30 - 21:30": 180000, "22:00 - 08:00": 250000 },
    amenities: r.amenities,
    images: ["images/room_1_main.png", "images/room_1_bath.png"],
    emoji: r.emoji,
    description: `Phòng nghỉ không gian độc đáo chủ đề ${r.name} với tiện ích đặc trưng mang đến trải nghiệm lưu trú và thư giãn trọn vẹn.`,
    status: 'active'
  });
});

// --- CS2: Quận 10 ---
const cs2Address = '25a Đường 3 Tháng 2, Phường 11, Quận 10';
const cs2BranchName = 'Chi nhánh Quận 10 (CS2)';
const cs2Rooms = [
  { id: 'BTH101', name: 'Phòng Bida Standard', emoji: '🎱', cap: 2, priceWd: 580000, priceWe: 780000, amenities: ['Bàn bida', 'WiFi', 'NVS riêng', 'Điều hòa'] },
  { id: 'BTH201', name: 'Phòng Homestay Cosy', emoji: '🏡', cap: 2, priceWd: 620000, priceWe: 820000, amenities: ['Bếp tự nấu', 'PS4', 'WiFi', 'NVS riêng', 'Điều hòa'] },
  { id: 'BTH301', name: 'Phòng Homestay Deluxe', emoji: '🛋️', cap: 2, priceWd: 650000, priceWe: 850000, amenities: ['Bếp tự nấu', 'PS4', 'Sofa bàn trà', 'WiFi', 'NVS riêng', 'Điều hòa'] },
  { id: 'BTH401', name: 'Phòng Bida Premium', emoji: '🎱', cap: 2, priceWd: 620000, priceWe: 820000, amenities: ['Bàn bida', 'WiFi', 'NVS riêng', 'Điều hòa', 'Sofa bàn trà'] },
  { id: 'BTH501', name: 'Phòng Homestay Suite', emoji: '✨', cap: 3, priceWd: 700000, priceWe: 900000, amenities: ['Bếp tự nấu', 'PS4', 'Sofa bàn trà', 'WiFi', 'NVS riêng', 'Điều hòa'] },
  { id: 'BTH601', name: 'Phòng Bida Luxury', emoji: '👑', cap: 2, priceWd: 650000, priceWe: 850000, amenities: ['Bàn bida', 'WiFi', 'NVS riêng', 'Điều hòa', 'Sofa bàn trà'] },
  { id: 'CINEBOX01', name: 'Cinebox Cozy', emoji: '🎬', cap: 2, priceWd: 400000, priceWe: 550000, amenities: ['PS4', 'Máy chiếu', 'WiFi', 'NVS riêng', 'Điều hòa'] },
  { id: 'CINEBOX02', name: 'Cinebox Sweet', emoji: '🍿', cap: 2, priceWd: 400000, priceWe: 550000, amenities: ['PS4', 'Máy chiếu', 'WiFi', 'NVS riêng', 'Điều hòa'] },
  { id: 'CINEBOX03', name: 'Cinebox Classic', emoji: '🎥', cap: 2, priceWd: 400000, priceWe: 550000, amenities: ['PS4', 'Máy chiếu', 'WiFi', 'NVS riêng', 'Điều hòa'] },
  { id: 'CINEBOX04', name: 'Cinebox Special', emoji: '🎮', cap: 2, priceWd: 450000, priceWe: 600000, amenities: ['PS4', 'Máy chiếu', 'WiFi', 'NVS riêng', 'Điều hòa', 'Sofa bàn trà'] },
  { id: 'CINEBOX05', name: 'Cinebox Lounge', emoji: '🥂', cap: 2, priceWd: 450000, priceWe: 600000, amenities: ['PS4', 'Máy chiếu', 'WiFi', 'NVS riêng', 'Điều hòa', 'Sofa bàn trà'] },
];
cs2Rooms.forEach(r => {
  newRooms.push({
    room_id: r.id,
    room_name: r.name,
    branch: 'cs2',
    branch_name: cs2BranchName,
    address: cs2Address,
    capacity: r.cap,
    base_price_weekday: r.priceWd,
    base_price_weekend: r.priceWe,
    slot_prices: { "08:00 - 11:00": 150000, "11:30 - 14:30": 170000, "15:00 - 18:00": 150000, "18:30 - 21:30": 180000, "22:00 - 08:00": 250000 },
    amenities: r.amenities,
    images: ["images/room_2_main.png", "images/room_2_bath.png"],
    emoji: r.emoji,
    description: `Hạng phòng ${r.name} tiện nghi tại trung tâm Quận 10, thiết kế sang trọng, tối ưu cho giải trí nhóm bạn hoặc cặp đôi.`,
    status: 'active'
  });
});

// --- CS3: Quận 5 ---
const cs3Address = '2N Phạm Hữu Chí, Phường 12, Quận 5';
const cs3BranchName = 'Chi nhánh Quận 5 (CS3)';
const cs3Rooms = [
  { id: 'PHC01', name: 'Phòng Homestay Bida', emoji: '🎱', cap: 2, priceWd: 600000, priceWe: 800000, amenities: ['Bàn bida', 'Bếp tự nấu', 'WiFi', 'NVS riêng', 'Cửa sổ'] },
  { id: 'PHC02', name: 'Phòng Homestay Nintendo', emoji: '🎮', cap: 2, priceWd: 620000, priceWe: 820000, amenities: ['Nintendo Switch', 'Bếp tự nấu', 'WiFi', 'NVS riêng', 'Ban công'] },
  { id: 'PHC03', name: 'Phòng Homestay PS4', emoji: '🕹️', cap: 2, priceWd: 580000, priceWe: 780000, amenities: ['PS4', 'Bếp tự nấu', 'WiFi', 'NVS riêng', 'Cửa sổ'] },
  { id: 'PHC04', name: 'Phòng Nintendo View Ban Công', emoji: '🌱', cap: 2, priceWd: 620000, priceWe: 820000, amenities: ['Nintendo Switch', 'Bếp tự nấu', 'WiFi', 'NVS riêng', 'Ban công'] },
  { id: 'PHC05', name: 'Phòng PS4 Cozy', emoji: '🛋️', cap: 2, priceWd: 580000, priceWe: 780000, amenities: ['PS4', 'Bếp tự nấu', 'WiFi', 'NVS riêng', 'Cửa sổ'] },
  { id: 'PHC06', name: 'Phòng Nintendo Sweet', emoji: '🌸', cap: 2, priceWd: 620000, priceWe: 820000, amenities: ['Nintendo Switch', 'Bếp tự nấu', 'WiFi', 'NVS riêng', 'Ban công'] },
  { id: 'PHC07', name: 'Phòng Bida Deluxe', emoji: '🎯', cap: 2, priceWd: 620000, priceWe: 820000, amenities: ['Bàn bida', 'Bếp tự nấu', 'WiFi', 'NVS riêng', 'Cửa sổ'] },
  { id: 'PHC08', name: 'Phòng PS4 Ban Công', emoji: '🍃', cap: 2, priceWd: 650000, priceWe: 850000, amenities: ['PS4', 'Bếp tự nấu', 'WiFi', 'NVS riêng', 'Ban công'] },
  { id: 'PHC09', name: 'Phòng Bida Premium', emoji: '🏆', cap: 2, priceWd: 650000, priceWe: 850000, amenities: ['Bàn bida', 'Bếp tự nấu', 'WiFi', 'NVS riêng', 'Cửa sổ'] },
];
cs3Rooms.forEach(r => {
  newRooms.push({
    room_id: r.id,
    room_name: r.name,
    branch: 'cs3',
    branch_name: cs3BranchName,
    address: cs3Address,
    capacity: r.cap,
    base_price_weekday: r.priceWd,
    base_price_weekend: r.priceWe,
    slot_prices: { "08:00 - 11:00": 140000, "11:30 - 14:30": 160000, "15:00 - 18:00": 140000, "18:30 - 21:30": 170000, "22:00 - 08:00": 240000 },
    amenities: r.amenities,
    images: ["images/room_1_main.png", "images/room_1_bath.png"],
    emoji: r.emoji,
    description: `Phòng homestay ấm cúng phong cách Chợ Lớn tại Quận 5. Trang bị đầy đủ bếp nấu ăn cùng thiết bị giải trí chất lượng cao.`,
    status: 'active'
  });
});

// --- CS4: Gò Vấp ---
const cs4Address = '331/16 Phan Huy Ích, Phường 14, Quận Gò Vấp';
const cs4BranchName = 'Chi nhánh Gò Vấp (CS4)';
const cs4Rooms = [
  { id: 'CB402', name: 'Cinebox Mario', emoji: '🍄', cap: 2, priceWd: 420000, priceWe: 570000, amenities: ['PS4', 'Máy chiếu', 'WiFi', 'NVS riêng', 'Điều hòa'] },
  { id: 'CB403', name: 'Cinebox Pokemon', emoji: '⚡', cap: 2, priceWd: 420000, priceWe: 570000, amenities: ['PS4', 'Máy chiếu', 'WiFi', 'NVS riêng', 'Điều hòa'] },
  { id: 'CB404', name: 'Cinebox Naruto', emoji: '🦊', cap: 2, priceWd: 420000, priceWe: 570000, amenities: ['PS4', 'Máy chiếu', 'WiFi', 'NVS riêng', 'Điều hòa'] },
  { id: 'CB405', name: 'Cinebox One Piece', emoji: '☠️', cap: 2, priceWd: 420000, priceWe: 570000, amenities: ['PS4', 'Máy chiếu', 'WiFi', 'NVS riêng', 'Điều hòa'] },
  { id: 'CB406', name: 'Cinebox Ghibli', emoji: '🐈', cap: 2, priceWd: 420000, priceWe: 570000, amenities: ['PS4', 'Máy chiếu', 'WiFi', 'NVS riêng', 'Điều hòa'] },
  { id: 'CB407', name: 'Cinebox Marvel', emoji: '🛡️', cap: 2, priceWd: 450000, priceWe: 600000, amenities: ['PS4', 'Máy chiếu', 'WiFi', 'NVS riêng', 'Điều hòa', 'Sofa bàn trà'] },
  { id: 'CB408', name: 'Cinebox DC Comics', emoji: '🦇', cap: 2, priceWd: 450000, priceWe: 600000, amenities: ['PS4', 'Máy chiếu', 'WiFi', 'NVS riêng', 'Điều hòa', 'Sofa bàn trà'] },
  { id: 'CB409', name: 'Cinebox Retro', emoji: '📺', cap: 2, priceWd: 420000, priceWe: 570000, amenities: ['PS4', 'Máy chiếu', 'WiFi', 'NVS riêng', 'Điều hòa'] },
  { id: 'BB410', name: 'Bigbox Game Studio', emoji: '🖥️', cap: 2, priceWd: 500000, priceWe: 700000, amenities: ['PS4', 'WiFi', 'NVS riêng', 'Điều hòa', 'Sofa bàn trà'] },
  { id: 'BB411', name: 'Bigbox It Takes Two', emoji: '🧸', cap: 2, priceWd: 580000, priceWe: 780000, amenities: ['PS4', 'WiFi', 'NVS riêng', 'Sofa bàn trà', 'Cửa sổ', 'Điều hòa'] },
  { id: 'BB412', name: 'Bigbox Little Nightmares', emoji: '👁️', cap: 2, priceWd: 580000, priceWe: 780000, amenities: ['PS4', 'WiFi', 'NVS riêng', 'Sofa bàn trà', 'Cửa sổ', 'Điều hòa'] },
  { id: 'BB413', name: 'Bigbox Overcooked', emoji: '🍳', cap: 2, priceWd: 580000, priceWe: 780000, amenities: ['PS4', 'WiFi', 'NVS riêng', 'Sofa bàn trà', 'Cửa sổ', 'Điều hòa'] },
  { id: 'BB414', name: 'Bigbox Hogwarts', emoji: '🪄', cap: 2, priceWd: 600000, priceWe: 800000, amenities: ['PS4', 'WiFi', 'NVS riêng', 'Sofa bàn trà', 'Cửa sổ', 'Điều hòa'] },
  { id: 'BB415', name: 'Bigbox Cyberpunk', emoji: '🏙️', cap: 2, priceWd: 600000, priceWe: 800000, amenities: ['PS4', 'WiFi', 'NVS riêng', 'Sofa bàn trà', 'Cửa sổ', 'Điều hòa'] },
  { id: 'BB416', name: 'Bigbox FIFA Hub', emoji: '⚽', cap: 2, priceWd: 580000, priceWe: 780000, amenities: ['PS4', 'WiFi', 'NVS riêng', 'Sofa bàn trà', 'Cửa sổ', 'Điều hòa'] },
  { id: 'BB417', name: 'Bigbox GTA World', emoji: '🚗', cap: 2, priceWd: 600000, priceWe: 800000, amenities: ['PS4', 'WiFi', 'NVS riêng', 'Sofa bàn trà', 'Cửa sổ', 'Điều hòa'] },
  { id: 'BB418', name: 'Bigbox Coop Deluxe', emoji: '👑', cap: 3, priceWd: 650000, priceWe: 850000, amenities: ['PS4', 'WiFi', 'NVS riêng', 'Sofa bàn trà', 'Cửa sổ', 'Điều hòa'] },
];
cs4Rooms.forEach(r => {
  newRooms.push({
    room_id: r.id,
    room_name: r.name,
    branch: 'cs4',
    branch_name: cs4BranchName,
    address: cs4Address,
    capacity: r.cap,
    base_price_weekday: r.priceWd,
    base_price_weekend: r.priceWe,
    slot_prices: { "08:00 - 11:00": 160000, "11:30 - 14:30": 180000, "15:00 - 18:00": 160000, "18:30 - 21:30": 190000, "22:00 - 08:00": 270000 },
    amenities: r.amenities,
    images: ["images/room_2_main.png", "images/room_2_bath.png"],
    emoji: r.emoji,
    description: `Căn phòng chủ đề độc đáo tại chi nhánh Gò Vấp. Được trang bị thiết bị giải trí Cinebox/Bigbox, máy chiếu và PS4 đỉnh cao.`,
    status: 'active'
  });
});

// --- CS5: Bình Thạnh ---
const cs5Address = '217/70/5 Bùi Đình Tuý, Phường 14, Quận Bình Thạnh';
const cs5BranchName = 'Chi nhánh Bình Thạnh (CS5)';
const cs5Rooms = [
  { id: 'DT501', name: 'Phòng Mario', emoji: '🍄', cap: 2, priceWd: 550000, priceWe: 750000, amenities: ['PS4', 'Sofa bàn trà', 'WiFi', 'NVS riêng', 'Pantry'] },
  { id: 'DT502', name: 'Phòng Kirby', emoji: '🌸', cap: 2, priceWd: 550000, priceWe: 750000, amenities: ['PS4', 'Sofa bàn trà', 'WiFi', 'NVS riêng', 'Pantry'] },
  { id: 'DT503', name: 'Phòng Pokemon', emoji: '⚡', cap: 2, priceWd: 550000, priceWe: 750000, amenities: ['PS4', 'Sofa bàn trà', 'WiFi', 'NVS riêng', 'Pantry'] },
  { id: 'DT504', name: 'Phòng Animal Crossing', emoji: '🍃', cap: 2, priceWd: 550000, priceWe: 750000, amenities: ['PS4', 'Sofa bàn trà', 'WiFi', 'NVS riêng', 'Pantry'] },
  { id: 'DT505', name: 'Phòng Overcooked', emoji: '🍳', cap: 2, priceWd: 550000, priceWe: 750000, amenities: ['PS4', 'Sofa bàn trà', 'WiFi', 'NVS riêng', 'Pantry'] },
  { id: 'DT506', name: 'Phòng Mickey', emoji: '🐭', cap: 2, priceWd: 550000, priceWe: 750000, amenities: ['PS4', 'Sofa bàn trà', 'WiFi', 'NVS riêng', 'Pantry'] },
  { id: 'DT507', name: 'Phòng Harry Potter', emoji: '🪄', cap: 2, priceWd: 580000, priceWe: 780000, amenities: ['PS4', 'Sofa bàn trà', 'WiFi', 'NVS riêng', 'Pantry'] },
  { id: 'DT508', name: 'Phòng Star Wars', emoji: '🚀', cap: 2, priceWd: 580000, priceWe: 780000, amenities: ['PS4', 'Sofa bàn trà', 'WiFi', 'NVS riêng', 'Pantry'] },
  { id: 'DT509', name: 'Phòng Dark Mode', emoji: '🖤', cap: 2, priceWd: 600000, priceWe: 800000, amenities: ['PS4', 'Sofa bàn trà', 'WiFi', 'NVS riêng', 'Pantry'] },
  { id: 'DT510', name: 'Phòng Ghibli Cozy', emoji: '🐾', cap: 2, priceWd: 550000, priceWe: 750000, amenities: ['PS4', 'Sofa bàn trà', 'WiFi', 'NVS riêng', 'Pantry'] },
  { id: 'DT511', name: 'Phòng Zelda Adventure', emoji: '🗡️', cap: 2, priceWd: 580000, priceWe: 780000, amenities: ['PS4', 'Sofa bàn trà', 'WiFi', 'NVS riêng', 'Pantry'] },
  { id: 'DT512', name: 'Phòng Cinebox Premium', emoji: '🎬', cap: 2, priceWd: 600000, priceWe: 800000, amenities: ['PS4', 'Sofa bàn trà', 'WiFi', 'NVS riêng', 'Pantry', 'Máy chiếu'] },
  { id: 'DT513', name: 'Phòng VIP Suite', emoji: '🛁', cap: 3, priceWd: 700000, priceWe: 900000, amenities: ['Bồn tắm', 'PS4', 'Sofa bàn trà', 'WiFi', 'NVS riêng', 'Pantry'] },
];
cs5Rooms.forEach(r => {
  newRooms.push({
    room_id: r.id,
    room_name: r.name,
    branch: 'cs5',
    branch_name: cs5BranchName,
    address: cs5Address,
    capacity: r.cap,
    base_price_weekday: r.priceWd,
    base_price_weekend: r.priceWe,
    slot_prices: { "08:00 - 11:00": 170000, "11:30 - 14:30": 190000, "15:00 - 18:00": 170000, "18:30 - 21:30": 200000, "22:00 - 08:00": 290000 },
    amenities: r.amenities,
    images: ["images/room_1_main.png", "images/room_1_bath.png"],
    emoji: r.emoji,
    description: `Căn hộ duplex hoặc phòng riêng phong cách ${r.name} ấm cúng tại đường Bùi Đình Túy, Bình Thạnh. Có Sofa, PS4 và Pantry tiện dụng.`,
    status: 'active'
  });
});

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
  console.log(`🔄 ĐANG RESET VÀ SEED ${newRooms.length} PHÒNG SAIGON CƠ SỞ CHÍNH XÁC...`);
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
  console.log(`4. Đang nạp danh sách ${newRooms.length} phòng Saigon mới...`);
  // Cắt bớt và nạp theo cụm nếu mảng quá dài, nhưng 59 phòng nạp một lần cũng OK
  const seedRes = await callAPI('rooms', 'create', { data: newRooms });
  if (seedRes.success) {
    console.log(`✅ Đã nạp thành công ${newRooms.length} phòng Saigon mới!`);
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
