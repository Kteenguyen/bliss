// Use native fetch in Node 22

const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxzI6zQP6Ga3C4QX0C3LQoulgvjxc8kOTgnKIUj_NykKziPLwXFo20EgDxVCGP9W2VizQ/exec';
const API_KEY = 'BlissSecureToken2026';

const defaultRooms = [
  {
    room_id: 'R001',
    room_name: 'Phòng Sương Mù',
    branch: 'da_lat',
    branch_name: 'Đà Lạt',
    capacity: 2,
    base_price_weekday: 800000,
    base_price_weekend: 1200000,
    slot_prices: {"08:00 - 11:00": 239000, "11:30 - 14:30": 249000, "15:00 - 18:00": 239000, "18:30 - 21:30": 259000, "22:00 - 08:00": 359000},
    amenities: ["Bếp tự nấu", "Máy chiếu", "Bồn tắm", "Board game", "Tủ lạnh", "NVS riêng", "Gương lớn"],
    images: ["images/room_1_main.png", "images/room_1_bath.png"],
    emoji: '🏔️',
    description: 'Phòng lãng mạn view núi thung lũng sương mù, bồn tắm đá và ban công riêng.',
    status: 'active'
  },
  {
    room_id: 'R002',
    room_name: 'Suite Hoa Anh Đào',
    branch: 'da_lat',
    branch_name: 'Đà Lạt',
    capacity: 4,
    base_price_weekday: 1500000,
    base_price_weekend: 2200000,
    slot_prices: {"08:00 - 11:00": 249000, "11:30 - 14:30": 259000, "15:00 - 18:00": 249000, "18:30 - 21:30": 279000, "22:00 - 08:00": 379000},
    amenities: ["Bếp tự nấu", "Máy chiếu", "Sofa bàn trà", "Bồn tắm", "Board game", "Tủ lạnh", "NVS riêng", "Gương lớn"],
    images: ["images/room_2_main.png", "images/room_2_bath.png"],
    emoji: '🌸',
    description: 'Suite gia đình rộng rãi view thung lũng, phòng khách riêng, lò sưởi ấm cúng.',
    status: 'active'
  },
  {
    room_id: 'R003',
    room_name: 'Phòng Hội An Cổ',
    branch: 'hoi_an',
    branch_name: 'Hội An',
    capacity: 2,
    base_price_weekday: 900000,
    base_price_weekend: 1400000,
    slot_prices: {"08:00 - 11:00": 239000, "11:30 - 14:30": 249000, "15:00 - 18:00": 239000, "18:30 - 21:30": 259000, "22:00 - 08:00": 359000},
    amenities: ["Bếp tự nấu", "Bồn tắm", "Board game", "Tủ lạnh", "NVS riêng", "Gương lớn"],
    images: ["images/room_1_main.png", "images/room_1_bath.png"],
    emoji: '🏮',
    description: 'Phòng thiết kế phong cách phố cổ Hội An mộc mạc, gần hồ bơi và kèm xe đạp miễn phí.',
    status: 'active'
  },
  {
    room_id: 'R004',
    room_name: 'Lantern Loft',
    branch: 'hoi_an',
    branch_name: 'Hội An',
    capacity: 3,
    base_price_weekday: 1200000,
    base_price_weekend: 1800000,
    slot_prices: {"08:00 - 11:00": 249000, "11:30 - 14:30": 259000, "15:00 - 18:00": 249000, "18:30 - 21:30": 279000, "22:00 - 08:00": 379000},
    amenities: ["Bếp tự nấu", "Máy chiếu", "Sofa bàn trà", "Bồn tắm", "Tủ lạnh", "NVS riêng", "Gương lớn"],
    images: ["images/room_2_main.png", "images/room_2_bath.png"],
    emoji: '🪔',
    description: 'Phòng Loft 2 tầng hiện đại, view kênh nước cổ kính Hội An, miễn phí bữa sáng.',
    status: 'active'
  },
  {
    room_id: 'R005',
    room_name: 'Phòng Biển Xanh',
    branch: 'nha_trang',
    branch_name: 'Nha Trang',
    capacity: 2,
    base_price_weekday: 700000,
    base_price_weekend: 1100000,
    slot_prices: {"08:00 - 11:00": 239000, "11:30 - 14:30": 249000, "15:00 - 18:00": 239000, "18:30 - 21:30": 259000, "22:00 - 08:00": 359000},
    amenities: ["Máy chiếu", "Bồn tắm", "Board game", "Tủ lạnh", "NVS riêng", "Gương lớn"],
    images: ["images/room_1_main.png", "images/room_1_bath.png"],
    emoji: '🌊',
    description: 'Tầm nhìn bao trọn vịnh biển từ ban công, chỉ 50m đi bộ ra bãi tắm riêng.',
    status: 'active'
  },
  {
    room_id: 'R006',
    room_name: 'Sunset Villa',
    branch: 'nha_trang',
    branch_name: 'Nha Trang',
    capacity: 6,
    base_price_weekday: 3500000,
    base_price_weekend: 5000000,
    slot_prices: {"08:00 - 11:00": 499000, "11:30 - 14:30": 529000, "15:00 - 18:00": 499000, "18:30 - 21:30": 559000, "22:00 - 08:00": 699000},
    amenities: ["Bếp tự nấu", "Máy chiếu", "Sofa bàn trà", "Bồn tắm", "Board game", "Tủ lạnh", "NVS riêng", "Gương lớn"],
    images: ["images/room_2_main.png", "images/room_2_bath.png"],
    emoji: '🌅',
    description: 'Biệt thự nghỉ dưỡng 3 phòng ngủ view hoàng hôn biển tuyệt đẹp, hồ bơi tràn bờ.',
    status: 'active'
  }
];

async function run() {
  console.log('Sending rooms initialization request to Google Sheets...');
  try {
    const payload = {
      token: API_KEY,
      sheet: 'rooms',
      action: 'create',
      data: defaultRooms
    };

    const res = await fetch(WEB_APP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    console.log('Response from Google Apps Script:', data);
    if (data.success) {
      console.log('Successfully seeded rooms data!');
    } else {
      console.log('Failed to seed rooms data:', data.message);
    }
  } catch (err) {
    console.error('Network Error:', err.message);
  }
}

run();
