// generate-guide.js
// Tạo file Word hướng dẫn luồng vận hành Bliss AI Homestay
// Sử dụng: node generate-guide.js

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, PageBreak, ExternalHyperlink,
  LevelFormat, TableOfContents, Bookmark,
} = require('docx');
const fs = require('fs');

// ─── Color Palette ──────────────────────────────────────────
const C = {
  primary:  '4F46E5', // Indigo
  secondary:'7C3AED', // Purple
  accent:   '0891B2', // Cyan
  success:  '059669', // Green
  warning:  'D97706', // Amber
  danger:   'DC2626', // Red
  lightBg:  'EEF2FF', // Indigo-50
  lightBg2: 'F0FDF4', // Green-50
  lightBg3: 'FFF7ED', // Orange-50
  tableHead:'4F46E5', // Indigo header
  tableAlt: 'F8F8FF', // Very light
  border:   'C7D2FE', // Indigo-200
  white:    'FFFFFF',
  dark:     '1E1B4B',
  gray:     '64748B',
  lightGray:'F1F5F9',
};

// ─── Helper: Border object ───────────────────────────────────
const bdr = (color = C.border, size = 4) =>
  ({ style: BorderStyle.SINGLE, size, color });

const borders = (color = C.border) => ({
  top: bdr(color), bottom: bdr(color),
  left: bdr(color), right: bdr(color),
});

const noBorder = () => ({
  top:    { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left:   { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right:  { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
});

// ─── Helper: Heading ─────────────────────────────────────────
const h1 = (text, id) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  children: id
    ? [new Bookmark({ id, children: [new TextRun({ text, color: C.dark })] })]
    : [new TextRun({ text, color: C.dark })],
  spacing: { before: 480, after: 200 },
});

const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  children: [new TextRun({ text, color: C.primary })],
  spacing: { before: 320, after: 160 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: C.border, space: 4 } },
});

const h3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  children: [new TextRun({ text, bold: true, color: C.secondary })],
  spacing: { before: 240, after: 100 },
});

// ─── Helper: Body text ───────────────────────────────────────
const body = (text, opts = {}) => new Paragraph({
  children: [new TextRun({ text, font: 'Arial', size: 22, color: '374151', ...opts })],
  spacing: { before: 60, after: 80 },
  indent: opts.indent ? { left: 360 } : undefined,
});

const bold = (text, color = C.primary) =>
  new TextRun({ text, bold: true, font: 'Arial', size: 22, color });

const normal = (text) =>
  new TextRun({ text, font: 'Arial', size: 22, color: '374151' });

// ─── Helper: Bullet list ─────────────────────────────────────
const bullet = (text, sub = false) => new Paragraph({
  numbering: { reference: sub ? 'sub-bullets' : 'bullets', level: 0 },
  children: [new TextRun({ text, font: 'Arial', size: 22, color: '374151' })],
  spacing: { before: 40, after: 40 },
});

const numItem = (text) => new Paragraph({
  numbering: { reference: 'numbers', level: 0 },
  children: [new TextRun({ text, font: 'Arial', size: 22, color: '374151' })],
  spacing: { before: 60, after: 60 },
});

// ─── Helper: Info box ────────────────────────────────────────
const infoBox = (title, lines, bgColor = C.lightBg, borderColor = C.primary) =>
  new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: [9360],
    rows: [
      new TableRow({
        children: [new TableCell({
          borders: {
            top: bdr(borderColor, 8), bottom: bdr(borderColor, 4),
            left: bdr(borderColor, 16), right: bdr(borderColor, 4),
          },
          shading: { fill: bgColor, type: ShadingType.CLEAR },
          margins: { top: 120, bottom: 120, left: 180, right: 180 },
          children: [
            new Paragraph({ children: [new TextRun({ text: title, bold: true, font: 'Arial', size: 22, color: borderColor })], spacing: { after: 60 } }),
            ...lines.map(l => new Paragraph({ children: [new TextRun({ text: l, font: 'Arial', size: 20, color: '374151' })], spacing: { before: 40, after: 20 } })),
          ],
        })],
      }),
    ],
  });

// ─── Helper: Spacer ──────────────────────────────────────────
const spacer = (before = 120) => new Paragraph({ children: [new TextRun('')], spacing: { before } });

// ─── Helper: Table header row ────────────────────────────────
const thRow = (cells, widths) => new TableRow({
  tableHeader: true,
  children: cells.map((c, i) => new TableCell({
    borders: borders(C.primary),
    shading: { fill: C.tableHead, type: ShadingType.CLEAR },
    width: { size: widths[i], type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 140, right: 140 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ children: [new TextRun({ text: c, bold: true, color: C.white, font: 'Arial', size: 20 })], alignment: AlignmentType.CENTER })],
  })),
});

const tdRow = (cells, widths, alt = false) => new TableRow({
  children: cells.map((c, i) => new TableCell({
    borders: borders(C.border),
    shading: { fill: alt ? C.tableAlt : C.white, type: ShadingType.CLEAR },
    width: { size: widths[i], type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 140, right: 140 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({ children: [new TextRun({ text: String(c), font: 'Arial', size: 20, color: '374151' })], alignment: AlignmentType.LEFT })],
  })),
});

const tdRowBold = (cells, widths, boldIdx = [], colors = []) => new TableRow({
  children: cells.map((c, i) => new TableCell({
    borders: borders(C.border),
    shading: { fill: C.white, type: ShadingType.CLEAR },
    width: { size: widths[i], type: WidthType.DXA },
    margins: { top: 80, bottom: 80, left: 140, right: 140 },
    children: [new Paragraph({ children: [new TextRun({ text: String(c), font: 'Arial', size: 20, bold: boldIdx.includes(i), color: colors[i] || '374151' })] })],
  })),
});

// ═══════════════════════════════════════════════════════════════
// DOCUMENT CONTENT
// ═══════════════════════════════════════════════════════════════

const doc = new Document({
  title: 'Hướng Dẫn Luồng Vận Hành — Bliss Homestay AI Automation',
  description: 'Tài liệu mô tả toàn bộ luồng hoạt động của hệ thống AI Automation cho Bliss Homestay',
  creator: 'Bliss AI Hub',

  numbering: {
    config: [
      { reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
      { reference: 'sub-bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u25E6', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 900, hanging: 300 } } } }] },
      { reference: 'numbers', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
    ],
  },

  styles: {
    default: {
      document: { run: { font: 'Arial', size: 22, color: '374151' } },
    },
    paragraphStyles: [
      {
        id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 36, bold: true, font: 'Arial', color: C.dark },
        paragraph: { spacing: { before: 480, after: 200 }, outlineLevel: 0 },
      },
      {
        id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 28, bold: true, font: 'Arial', color: C.primary },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 1 },
      },
      {
        id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { size: 24, bold: true, font: 'Arial', color: C.secondary },
        paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 2 },
      },
    ],
  },

  sections: [
    // ═══ SECTION 1: COVER PAGE ═══════════════════════════════
    {
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: 'BLISS HOMESTAY  ', font: 'Arial', size: 18, bold: true, color: C.primary }),
                new TextRun({ text: '|  Tài liệu nội bộ  |  v1.0  2026', font: 'Arial', size: 18, color: C.gray }),
              ],
              border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.border, space: 4 } },
            }),
          ],
        }),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: '\u00A9 2026 Bliss Homestay AI Hub  \u2014  Bảo mật nội bộ  \u2014  Trang ', font: 'Arial', size: 18, color: C.gray }),
                new TextRun({ children: [PageNumber.CURRENT], font: 'Arial', size: 18, color: C.gray }),
                new TextRun({ text: '/', font: 'Arial', size: 18, color: C.gray }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Arial', size: 18, color: C.gray }),
              ],
              border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.border, space: 4 } },
            }),
          ],
        }),
      },
      children: [
        // Cover block
        spacer(1440),
        new Paragraph({
          children: [new TextRun({ text: '\uD83C\uDFE1', font: 'Segoe UI Emoji', size: 96 })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'BLISS HOMESTAY', font: 'Arial', size: 52, bold: true, color: C.dark })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'AI Workflow Automation', font: 'Arial', size: 40, color: C.primary })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: '\u2500'.repeat(40), font: 'Arial', size: 24, color: C.border })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'HƯỚNG DẪN LUỒNG VẬN HÀNH', font: 'Arial', size: 32, bold: true, color: C.secondary })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Tài liệu mô tả đầy đủ 5 nghiệp vụ cốt lõi', font: 'Arial', size: 24, color: C.gray })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 800 },
        }),
        new Table({
          width: { size: 7200, type: WidthType.DXA },
          columnWidths: [2400, 4800],
          rows: [
            new TableRow({ children: [
              new TableCell({ borders: borders(C.border), shading: { fill: C.lightBg, type: ShadingType.CLEAR }, width: { size: 2400, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: 'Phiên bản', bold: true, font: 'Arial', size: 20, color: C.primary })] })] }),
              new TableCell({ borders: borders(C.border), shading: { fill: C.white, type: ShadingType.CLEAR }, width: { size: 4800, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: '1.0 — Tháng 5/2026', font: 'Arial', size: 20 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: borders(C.border), shading: { fill: C.lightBg, type: ShadingType.CLEAR }, width: { size: 2400, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: 'Nền tảng', bold: true, font: 'Arial', size: 20, color: C.primary })] })] }),
              new TableCell({ borders: borders(C.border), shading: { fill: C.white, type: ShadingType.CLEAR }, width: { size: 4800, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: 'Make.com + AI NLP + Airtable + Google Calendar', font: 'Arial', size: 20 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: borders(C.border), shading: { fill: C.lightBg, type: ShadingType.CLEAR }, width: { size: 2400, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: 'Chi nhánh', bold: true, font: 'Arial', size: 20, color: C.primary })] })] }),
              new TableCell({ borders: borders(C.border), shading: { fill: C.white, type: ShadingType.CLEAR }, width: { size: 4800, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: 'Đà Lạt  •  Hội An  •  Nha Trang', font: 'Arial', size: 20 })] })] }),
            ]}),
            new TableRow({ children: [
              new TableCell({ borders: borders(C.border), shading: { fill: C.lightBg, type: ShadingType.CLEAR }, width: { size: 2400, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: 'Chi phí vận hành', bold: true, font: 'Arial', size: 20, color: C.primary })] })] }),
              new TableCell({ borders: borders(C.border), shading: { fill: C.lightBg2, type: ShadingType.CLEAR }, width: { size: 4800, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: '~$52 - $63 / tháng  (~1.3 triệu VND)', bold: true, font: 'Arial', size: 20, color: C.success })] })] }),
            ]}),
          ],
        }),

        // Page break to main content
        new Paragraph({ children: [new PageBreak()] }),

        // ─── TABLE OF CONTENTS ─────────────────────────────────
        h1('Mục Lục', 'toc'),
        new TableOfContents('Mục Lục', { hyperlink: true, headingStyleRange: '1-3', stylesWithLevels: [] }),
        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════════
        // PHẦN 1: TỔNG QUAN HỆ THỐNG
        // ═══════════════════════════════════════════════════════
        h1('1. Tổng Quan Hệ Thống', 'sec1'),
        h2('1.1 Bối Cảnh Vấn Đề'),
        body('Doanh nghiệp Bliss Homestay vận hành tại 3 chi nhánh (Đà Lạt, Hội An, Nha Trang) với các thách thức chính:'),
        spacer(60),
        bullet('Tốn nhân lực trả lời câu hỏi lặp (giá, phòng trống, tiện ích) — ước tính 4-6 giờ/ngày/chi nhánh'),
        bullet('Quy trình báo giá thủ công dễ sai sót và chậm trễ (trung bình 15-30 phút/lần)'),
        bullet('Thiếu liên kết tự động giữa Facebook/Zalo với hệ thống quản lý → nguy cơ Overbooking'),
        bullet('Chăm sóc khách trước/sau lưu trú (mã cửa, review) hoàn toàn thủ công'),
        spacer(80),

        h2('1.2 Mục Tiêu Hệ Thống'),
        spacer(60),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [4680, 4680],
          rows: [
            thRow(['Chỉ Số Cần Cải Thiện', 'Mục Tiêu Đề Ra'], [4680, 4680]),
            tdRow(['Thời gian trực chat thủ công', 'Giảm 70-80%'], [4680, 4680]),
            tdRow(['Thời gian phản hồi trung bình', '< 30 giây (từ 15-30 phút)'], [4680, 4680], true),
            tdRow(['Tỷ lệ sai sót báo giá', '0% (real-time từ DB)'], [4680, 4680]),
            tdRow(['Sự cố Overbooking', '0 lần / tháng'], [4680, 4680], true),
            tdRow(['Tỷ lệ gửi reminder check-in', '100% tự động'], [4680, 4680]),
            tdRow(['Tỷ lệ thu thập đánh giá', '≥ 40% (từ < 10%)'], [4680, 4680], true),
          ],
        }),

        spacer(200),
        h2('1.3 Kiến Trúc Tổng Thể'),
        body('Hệ thống gồm 3 lớp chính:'),
        spacer(60),
        bullet('Lớp giao tiếp: Facebook Messenger API + Zalo OA API (kênh nhận/gửi tin nhắn)'),
        bullet('Lớp xử lý: Make.com (Workflow Engine) + AI/NLP (GPT-4o-mini hoặc Gemini Flash)'),
        bullet('Lớp dữ liệu: Airtable (CRM + Phòng) + Google Calendar (iCal sync với OTA)'),
        spacer(80),
        infoBox('💡 Nguyên tắc thiết kế cốt lõi', [
          '→ Mọi tin nhắn đến đều được xử lý tự động trước — chỉ chuyển người khi cần thiết',
          '→ Dữ liệu thời gian thực: phòng trống, giá cả luôn lấy từ DB — không báo giá "ước tính"',
          '→ Anti-Overbooking: phòng bị khóa ngay khi bắt đầu quy trình xác nhận',
          '→ Zero human error: mọi reminder, mã cửa, review request đều tự động hoàn toàn',
        ], C.lightBg, C.primary),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════════
        // PHẦN 2: FR01 — SMART CHATBOT & NLP
        // ═══════════════════════════════════════════════════════
        h1('2. FR01 — Smart Chatbot & NLP Engine', 'sec2'),
        h2('2.1 Mô Tả Chức Năng'),
        body('Đây là điểm đầu vào của toàn bộ hệ thống. Mọi tin nhắn từ khách đều được phân tích để bóc tách thông tin cần thiết trước khi xử lý.'),
        spacer(80),

        h2('2.2 Luồng Xử Lý Chi Tiết'),
        spacer(60),
        infoBox('📥 BƯỚC 1: Nhận tin nhắn', [
          'Trigger: Webhook từ Facebook Messenger / Zalo OA',
          'Dữ liệu nhận: user_id, message_text, timestamp, channel',
          'Yêu cầu: Make.com lắng nghe 24/7 — không giới hạn giờ',
        ], C.lightBg, C.primary),
        spacer(80),
        infoBox('🧠 BƯỚC 2: NLP Extraction (AI)', [
          'Gọi OpenAI GPT-4o-mini hoặc Gemini Flash với System Prompt đã chuẩn bị',
          'Trích xuất: intent, check_in_date, check_out_date, num_guests, branch, budget, preferences',
          'Fallback: Rule-based NLP nếu API không phản hồi (đảm bảo 100% uptime)',
        ], C.lightBg, C.primary),
        spacer(80),
        infoBox('🔀 BƯỚC 3: Intent Routing', [
          'booking_inquiry → FR02 (Quoting Engine)',
          'booking_confirm → FR04 (CRM Booking)',
          'complaint → FR03 Alert Maintenance',
          'checkin_support → Gửi hướng dẫn tự động',
          'faq → Trả lời từ Knowledge Base',
          'general / oob → FR03 Handoff to Human',
        ], C.lightBg2, C.success),
        spacer(100),

        h2('2.3 Entities Được Trích Xuất'),
        spacer(60),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2000, 3200, 2400, 1760],
          rows: [
            thRow(['Entity', 'Ví dụ input', 'Output chuẩn', 'Bắt buộc?'], [2000, 3200, 2400, 1760]),
            tdRow(['check_in_date', '"thứ 6 tuần này", "28/6", "cuối tuần"', '2026-06-26', 'Có'], [2000, 3200, 2400, 1760]),
            tdRow(['check_out_date', '"2 đêm", "chủ nhật", "đến 30/6"', '2026-06-28', 'Có'], [2000, 3200, 2400, 1760], true),
            tdRow(['num_guests', '"3 người lớn 1 trẻ em", "cặp đôi"', '{ adults: 3, children: 1 }', 'Có'], [2000, 3200, 2400, 1760]),
            tdRow(['branch', '"bên Đà Lạt", "da lat", "dalat"', 'da_lat', 'Có'], [2000, 3200, 2400, 1760], true),
            tdRow(['budget', '"tầm 1 triệu", "dưới 2tr"', '{ amount: 1000000, isMax: true }', 'Không'], [2000, 3200, 2400, 1760]),
            tdRow(['occasion', '"honeymoon", "sinh nhật", "gia đình"', 'honeymoon / family', 'Không'], [2000, 3200, 2400, 1760], true),
            tdRow(['urgency', '"gấp lắm", "cần ngay"', 'high / medium / low', 'Không'], [2000, 3200, 2400, 1760]),
          ],
        }),
        spacer(100),

        h2('2.4 Xử Lý Trường Hợp Thiếu Thông Tin'),
        body('Khi thiếu entity bắt buộc, bot hỏi lại theo thứ tự ưu tiên:'),
        numItem('Hỏi chi nhánh → "Bạn muốn đặt ở Đà Lạt, Hội An hay Nha Trang?"'),
        numItem('Hỏi ngày check-in → "Ngày nhận phòng là ngày mấy ạ?"'),
        numItem('Hỏi ngày check-out → "Bạn ở đến ngày mấy hoặc mấy đêm?"'),
        numItem('Hỏi số khách → "Có bao nhiêu người ạ?"'),
        spacer(60),
        body('Sau khi đủ 4 entity → tự động chuyển sang FR02.', { bold: true }),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════════
        // PHẦN 3: FR02 — QUOTING ENGINE
        // ═══════════════════════════════════════════════════════
        h1('3. FR02 — Automated Quoting Engine', 'sec3'),
        h2('3.1 Mô Tả Chức Năng'),
        body('Tự động truy vấn Database kiểm tra phòng trống, tính giá chính xác và phản hồi báo giá cho khách — thay thế hoàn toàn việc nhân viên kiểm tra thủ công.'),
        spacer(80),

        h2('3.2 Luồng Kiểm Tra Phòng Trống'),
        spacer(60),
        infoBox('🔍 BƯỚC 1: Truy vấn Airtable', [
          'Input: branch, check_in_date, check_out_date, num_guests',
          'Filter: branch = {{branch}} AND capacity >= {{num_guests}}',
          'Kết quả: Danh sách phòng phù hợp sức chứa',
        ], C.lightBg, C.accent),
        spacer(80),
        infoBox('📅 BƯỚC 2: Kiểm tra Calendar iCal', [
          'Với mỗi phòng → gọi Google Calendar API hoặc parse iCal URL',
          'Kiểm tra: date range {{check_in}} → {{check_out}} có bị block không?',
          'Logic: checkOut <= existing.checkIn OR checkIn >= existing.checkOut → AVAILABLE',
        ], C.lightBg, C.accent),
        spacer(80),
        infoBox('💰 BƯỚC 3: Tính Giá Chính Xác', [
          'Đếm số ngày weekday (thứ 2-5) × base_price_weekday',
          'Đếm số ngày weekend (thứ 6, 7, CN) × base_price_weekend',
          'Cộng tổng → tính discount nếu ≥ 5 đêm hoặc nhóm lớn',
        ], C.lightBg, C.accent),
        spacer(80),
        infoBox('✍️ BƯỚC 4: Tạo Tin Nhắn Báo Giá', [
          'AI viết phản hồi tự nhiên dựa trên dữ liệu thực',
          'Format: Tên phòng + Giá + Top 3 tiện ích nổi bật + CTA',
          'Upsell: Tự động gợi ý dịch vụ phụ trợ phù hợp',
        ], C.lightBg, C.accent),
        spacer(100),

        h2('3.3 Chiến Lược Upsell / Cross-sell'),
        spacer(60),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3500, 2860, 3000],
          rows: [
            thRow(['Điều Kiện Trigger', 'Upsell Đề Xuất', 'Giá Trị Thêm'], [3500, 2860, 3000]),
            tdRow(['Số khách ≥ 4 người', 'Gói BBQ ngoài trời', '+300k/nhóm'], [3500, 2860, 3000]),
            tdRow(['Chi nhánh Nha Trang', 'Tour lặn biển, câu cá', '+450k/người'], [3500, 2860, 3000], true),
            tdRow(['Chi nhánh Đà Lạt', 'Thuê xe máy khám phá', '+150k/ngày'], [3500, 2860, 3000]),
            tdRow(['Chi nhánh Hội An', 'Tour xe đạp phố cổ', 'Miễn phí included'], [3500, 2860, 3000], true),
            tdRow(['Occasion = Honeymoon', 'Trang trí phòng hoa nến', '+500k'], [3500, 2860, 3000]),
            tdRow(['Occasion = Birthday', 'Bánh sinh nhật + decoration', '+300k'], [3500, 2860, 3000], true),
            tdRow(['Tổng ≥ 2 triệu', 'Offer gói "Welcome Package"', 'Tặng kèm'], [3500, 2860, 3000]),
          ],
        }),

        spacer(100),
        h2('3.4 Xử Lý Khi Không Còn Phòng'),
        bullet('Bot thông báo lịch lịch sự và giải thích'),
        bullet('Gợi ý 3 lựa chọn: đổi ngày / đổi chi nhánh / join waitlist'),
        bullet('Nếu khách muốn waitlist → Tạo record "inquiring" trong Airtable để Sales follow-up'),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════════
        // PHẦN 4: FR03 — CONVERSATION ROUTING
        // ═══════════════════════════════════════════════════════
        h1('4. FR03 — Conversation Routing & Alert System', 'sec4'),
        h2('4.1 Mô Tả Chức Năng'),
        body('Tự động phân loại ý định (Intent) của khách và điều hướng đến đúng bộ phận hoặc kịch bản xử lý. Đảm bảo không có tin nhắn nào bị bỏ sót.'),
        spacer(80),

        h2('4.2 Ma Trận Phân Loại Intent'),
        spacer(60),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2200, 2800, 2200, 2160],
          rows: [
            thRow(['Intent', 'Ví Dụ Tin Nhắn', 'Hành Động Bot', 'Đến Bộ Phận'], [2200, 2800, 2200, 2160]),
            tdRow(['booking_inquiry', '"Còn phòng không?", "Giá bao nhiêu?"', 'Trigger FR02', 'Tự động'], [2200, 2800, 2200, 2160]),
            tdRow(['booking_confirm', '"OK đặt đi", "Xác nhận"', 'Trigger FR04', 'Tự động'], [2200, 2800, 2200, 2160], true),
            tdRow(['complaint', '"Máy lạnh hỏng", "Điện nước"', 'Alert + Reassure', 'Bảo trì chi nhánh'], [2200, 2800, 2200, 2160]),
            tdRow(['checkin_support', '"Mã cửa?", "Cách vào phòng?"', 'Gửi guide tự động', 'Tự động'], [2200, 2800, 2200, 2160], true),
            tdRow(['faq', '"Có parking?", "Bữa sáng?"', 'Trả từ KB', 'Tự động'], [2200, 2800, 2200, 2160]),
            tdRow(['cancel_modify', '"Huỷ booking BL001"', 'Xác nhận + Process', 'Sales / Tự động'], [2200, 2800, 2200, 2160], true),
            tdRow(['feedback', '"Tuyệt vời lắm!", "5 sao"', 'Cảm ơn + Review link', 'Tự động'], [2200, 2800, 2200, 2160]),
            tdRow(['general / oob', 'Câu hỏi phức tạp khác', 'Handoff Protocol', 'Sales trực tiếp'], [2200, 2800, 2200, 2160], true),
          ],
        }),
        spacer(100),

        h2('4.3 Human Handoff Protocol'),
        body('Khi bot phát hiện cần chuyển người (confidence thấp, intent không rõ, hoặc câu hỏi phức tạp):'),
        spacer(60),
        infoBox('🔔 Quy trình Handoff (4 bước)', [
          'B1: Bot gửi khách: "Mình sẽ kết nối nhân viên tư vấn trong 5 phút nhé!"',
          'B2: Make.com gửi Slack alert đến #sales-live-chat với link conversation',
          'B3: Airtable cập nhật conversation status = "human_needed"',
          'B4: SLA Timer 5 phút — nếu không có response → escalate lên Manager',
        ], C.lightBg3, C.warning),
        spacer(80),

        h2('4.4 Alert Sự Cố Vận Hành'),
        body('Khi khách báo sự cố kỹ thuật:'),
        bullet('Bot xác nhận đã nhận thông tin và an ủi khách'),
        bullet('Make.com gửi Telegram/Slack tới channel của chi nhánh tương ứng'),
        bullet('Tạo Maintenance Ticket trong Airtable với: mô tả, phòng, thời gian, độ ưu tiên'),
        bullet('SLA: Nhân viên phản hồi trong 15 phút — xử lý trong 30 phút'),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════════
        // PHẦN 5: FR04 — CRM & BOOKING INTEGRATION
        // ═══════════════════════════════════════════════════════
        h1('5. FR04 — CRM & Booking Integration', 'sec5'),
        h2('5.1 Mô Tả Chức Năng'),
        body('Tự động tạo hồ sơ khách hàng và booking record khi khách xác nhận đặt phòng. Đồng thời khóa phòng trên tất cả kênh OTA qua iCal để ngăn Overbooking.'),
        spacer(80),

        h2('5.2 Luồng Xác Nhận Đặt Phòng'),
        spacer(60),
        infoBox('✅ BƯỚC 1: Bot xác nhận lại thông tin', [
          'Hiển thị đầy đủ: Phòng, Ngày, Số khách, Giá, Yêu cầu đặc biệt',
          'Hỏi: "Bạn xác nhận thông tin đúng chưa? Gõ OK để chốt"',
          'Timeout 10 phút — nếu không reply → giữ context để tiếp tục sau',
        ], C.lightBg2, C.success),
        spacer(80),
        infoBox('🔒 BƯỚC 2: Khóa phòng tạm thời (Anti-Overbooking)', [
          'NGAY KHI khách gõ OK → tạo Calendar Event ngay lập tức',
          'Không chờ thanh toán — khóa phòng trước để đảm bảo an toàn',
          'Nếu phát hiện conflict → hủy event, thông báo khách, đề xuất phòng khác',
        ], C.lightBg3, C.warning),
        spacer(80),
        infoBox('📋 BƯỚC 3: Tạo Booking Record trong Airtable', [
          'booking_id: Auto-generate (BL001, BL002...)',
          'Lưu: customer_name, phone, fb_id, branch, room_id, dates, guests, price, source',
          'status: "confirmed" — review_sent: false',
        ], C.lightBg, C.primary),
        spacer(80),
        infoBox('📅 BƯỚC 4: Sync Google Calendar → iCal → OTA', [
          'Tạo event: "[BL001] Phòng Sương Mù — Nguyễn Văn A"',
          'Calendar này publish iCal URL → Airbnb/Booking.com/Agoda tự đồng bộ',
          'Kết quả: Phòng bị block trên TẤT CẢ kênh trong 1-5 phút',
        ], C.lightBg2, C.success),
        spacer(80),
        infoBox('💬 BƯỚC 5: Gửi xác nhận cho khách', [
          'Tin nhắn: "🎉 Đặt phòng thành công! Mã #BL001..."',
          'Thông báo: Sẽ nhận hướng dẫn check-in trước 24 giờ',
          'Slack: Notify #bookings channel cho team',
        ], C.lightBg2, C.success),
        spacer(100),

        h2('5.3 Data Schema Booking Record'),
        spacer(60),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [2200, 2000, 5160],
          rows: [
            thRow(['Trường Dữ Liệu', 'Kiểu', 'Mô Tả'], [2200, 2000, 5160]),
            tdRow(['booking_id', 'Text (Auto)', 'BL001, BL002... tự động tăng'], [2200, 2000, 5160]),
            tdRow(['customer_name', 'Text', 'Tên khách hàng'], [2200, 2000, 5160], true),
            tdRow(['customer_phone', 'Phone', 'Số điện thoại liên hệ'], [2200, 2000, 5160]),
            tdRow(['customer_fb_id', 'Text', 'Facebook/Zalo ID để gửi tin'], [2200, 2000, 5160], true),
            tdRow(['branch', 'Select', 'da_lat / hoi_an / nha_trang'], [2200, 2000, 5160]),
            tdRow(['room_id', 'Link→Rooms', 'Liên kết với bảng Rooms'], [2200, 2000, 5160], true),
            tdRow(['check_in_date', 'Date', 'YYYY-MM-DD'], [2200, 2000, 5160]),
            tdRow(['check_out_date', 'Date', 'YYYY-MM-DD'], [2200, 2000, 5160], true),
            tdRow(['num_guests', 'Number', 'Tổng số khách'], [2200, 2000, 5160]),
            tdRow(['total_price', 'Currency', 'VND — tính tự động'], [2200, 2000, 5160], true),
            tdRow(['status', 'Select', 'inquiring / confirmed / checked_in / checked_out / cancelled'], [2200, 2000, 5160]),
            tdRow(['source', 'Select', 'facebook / zalo / website / direct'], [2200, 2000, 5160], true),
            tdRow(['special_requests', 'Long text', 'Yêu cầu đặc biệt của khách'], [2200, 2000, 5160]),
            tdRow(['review_sent', 'Boolean', 'Đã gửi yêu cầu review chưa?'], [2200, 2000, 5160], true),
          ],
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════════
        // PHẦN 6: FR05 — SCHEDULED AUTOMATION
        // ═══════════════════════════════════════════════════════
        h1('6. FR05 — Scheduled Automation', 'sec6'),
        h2('6.1 Mô Tả Chức Năng'),
        body('Hệ thống có các Trigger hẹn giờ để tự động chăm sóc khách trước và sau khi lưu trú — không cần bất kỳ tác động thủ công nào.'),
        spacer(80),

        h2('6.2 Scenario S06: Pre Check-in Reminder'),
        spacer(60),
        infoBox('📩 Cấu hình Trigger', [
          'Schedule: Chạy hàng ngày lúc 09:00 SA (Make.com Scheduled Scenario)',
          'Query: Lấy tất cả booking có check_in_date = NGÀY MAI AND status = "confirmed"',
          'Action: Với mỗi booking → Tạo tin nhắn cá nhân hóa → Gửi qua Facebook/Zalo',
        ], C.lightBg, C.primary),
        spacer(80),
        body('Nội dung tin nhắn gửi khách (template — có thể tùy chỉnh theo chi nhánh):'),
        spacer(60),
        infoBox('📱 Template Tin Nhắn Check-in', [
          '"🏡 Xin chào {{customer_name}}! Ngày mai là ngày check-in rồi!"',
          '"📍 Địa chỉ: {{branch_address}} (kèm link Google Maps)"',
          '"🔑 Mã cửa: {{pin_code}} (nhập số rồi nhấn # hai lần)"',
          '"📶 WiFi: {{wifi_name}} / Mật khẩu: {{wifi_pass}}"',
          '"🚗 Parking: {{parking_guide}}"',
          '"⏰ Check-in từ 14:00 | Liên hệ nếu cần hỗ trợ thêm nhé! 😊"',
        ], C.lightBg2, C.success),
        spacer(100),

        h2('6.3 Scenario S07: Post Check-out Review Request'),
        spacer(60),
        infoBox('⭐ Cấu hình Trigger', [
          'Schedule: Chạy mỗi 1 giờ (Make.com)',
          'Query: booking có check_out_date = HÔM NAY AND status = "checked_in" AND review_sent = false',
          'Action: Gửi tin nhắn → Cập nhật review_sent = true + status = "checked_out"',
        ], C.lightBg, C.secondary),
        spacer(80),
        infoBox('⭐ Template Tin Nhắn Review', [
          '"💙 Cảm ơn {{customer_name}} đã lưu trú tại Bliss {{branch_name}}!"',
          '"Hy vọng bạn đã có kỳ nghỉ tuyệt vời 🌟"',
          '"⭐ Google Review: {{google_link}}"',
          '"⭐ Facebook: {{fb_link}}"',
          '"Hẹn gặp lại lần sau! 🙏"',
        ], C.lightBg2, C.success),
        spacer(100),

        h2('6.4 Scenario S08: Anti-Overbooking Monitor'),
        spacer(60),
        infoBox('🛡️ Cấu hình Trigger', [
          'Trigger: Make.com Watch Records (Airtable) — kích hoạt mỗi khi có booking mới',
          'Action: Quét tất cả booking cùng phòng → tìm conflict ngày',
          'Nếu conflict: Hủy booking mới → Alert Sales → Đề xuất phòng thay thế cho khách',
        ], C.lightBg3, C.danger),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════════
        // PHẦN 7: MAKE.COM SCENARIOS
        // ═══════════════════════════════════════════════════════
        h1('7. Thiết Kế Make.com Scenarios', 'sec7'),
        h2('7.1 Danh Sách Đầy Đủ 9 Scenarios'),
        spacer(60),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [900, 2800, 2200, 1660, 1800],
          rows: [
            thRow(['ID', 'Tên Scenario', 'Trigger', 'Ops/tháng', 'FR'], [900, 2800, 2200, 1660, 1800]),
            tdRow(['S01', 'Message Intake & NLP Router', 'Webhook (tức thì)', '~3,000', 'FR01'], [900, 2800, 2200, 1660, 1800]),
            tdRow(['S02', 'Quoting Engine', 'Called from S01', '~1,500', 'FR02'], [900, 2800, 2200, 1660, 1800], true),
            tdRow(['S03', 'Booking Confirmation Flow', 'Called from S01', '~500', 'FR04'], [900, 2800, 2200, 1660, 1800]),
            tdRow(['S04', 'Human Handoff Alert', 'Called from S01', '~300', 'FR03'], [900, 2800, 2200, 1660, 1800], true),
            tdRow(['S05', 'FAQ Auto-Reply', 'Called from S01', '~800', 'FR01'], [900, 2800, 2200, 1660, 1800]),
            tdRow(['S06', 'Pre Check-in Reminder', 'Daily 09:00', '~60', 'FR05'], [900, 2800, 2200, 1660, 1800], true),
            tdRow(['S07', 'Post Check-out Review', 'Every 1 hour', '~120', 'FR05'], [900, 2800, 2200, 1660, 1800]),
            tdRow(['S08', 'Anti-Overbooking Monitor', 'Airtable Watch', '~500', 'FR04'], [900, 2800, 2200, 1660, 1800], true),
            tdRow(['S09', 'Calendar iCal Sync', 'Called from S03', '~500', 'FR04'], [900, 2800, 2200, 1660, 1800]),
            new TableRow({
              children: [
                new TableCell({ borders: borders(C.primary), shading: { fill: C.lightBg, type: ShadingType.CLEAR }, width: { size: 900, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: 'TOTAL', bold: true, font: 'Arial', size: 20, color: C.primary })] })] }),
                new TableCell({ borders: borders(C.primary), shading: { fill: C.lightBg, type: ShadingType.CLEAR }, width: { size: 2800, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: '9 Scenarios', bold: true, font: 'Arial', size: 20 })] })] }),
                new TableCell({ borders: borders(C.primary), shading: { fill: C.lightBg, type: ShadingType.CLEAR }, width: { size: 2200, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: '', font: 'Arial', size: 20 })] })] }),
                new TableCell({ borders: borders(C.primary), shading: { fill: C.lightBg2, type: ShadingType.CLEAR }, width: { size: 1660, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: '~7,280 ops', bold: true, font: 'Arial', size: 20, color: C.success })] })] }),
                new TableCell({ borders: borders(C.primary), shading: { fill: C.lightBg, type: ShadingType.CLEAR }, width: { size: 1800, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: 'All FR', font: 'Arial', size: 20 })] })] }),
              ],
            }),
          ],
        }),
        spacer(80),
        body('→ Tổng 7,280 ops/tháng → Phù hợp gói Make.com Core ($16/tháng — 10,000 ops).', { bold: true }),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════════
        // PHẦN 8: ROADMAP TRIỂN KHAI
        // ═══════════════════════════════════════════════════════
        h1('8. Roadmap Triển Khai 8 Tuần', 'sec8'),
        spacer(60),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [1200, 2200, 3560, 2400],
          rows: [
            thRow(['Giai Đoạn', 'Tuần', 'Công Việc Chính', 'Kết Quả Đạt Được'], [1200, 2200, 3560, 2400]),
            tdRowBold(['Phase 1', 'Tuần 1-2', 'Setup Airtable, kết nối Facebook/Zalo Webhook, cấu hình OpenAI API, test webhook end-to-end', 'Hạ tầng sẵn sàng, nhận được tin nhắn'], [1200, 2200, 3560, 2400], [0], [C.primary]),
            tdRowBold(['Phase 2', 'Tuần 3-4', 'Build S01 (NLP Router), S02 (Quoting), S04 (Handoff), test 50 case tin nhắn thực tế', 'Bot có thể hỏi-đáp và báo giá tự động'], [1200, 2200, 3560, 2400], [0], [C.accent]),
            tdRowBold(['Phase 3', 'Tuần 5-6', 'Build S03 (Booking), S08 (Anti-OB), S09 (Calendar Sync), UAT với team Sales', 'Đặt phòng tự động, không Overbooking'], [1200, 2200, 3560, 2400], [0], [C.success]),
            tdRowBold(['Phase 4', 'Tuần 7', 'Build S06 (Check-in reminder), S07 (Review), tạo template nội dung cho từng chi nhánh', 'Tự động hóa chăm sóc trước/sau lưu trú'], [1200, 2200, 3560, 2400], [0], [C.warning]),
            tdRowBold(['Phase 5', 'Tuần 8', 'Soft launch 1 chi nhánh pilot, monitor logs, collect feedback, fix bugs, full rollout', 'Hệ thống live toàn bộ 3 chi nhánh'], [1200, 2200, 3560, 2400], [0], [C.danger]),
          ],
        }),

        spacer(200),

        // ═══════════════════════════════════════════════════════
        // PHẦN 9: CHI PHÍ & KPIs
        // ═══════════════════════════════════════════════════════
        h1('9. Chi Phí & KPIs Theo Dõi', 'sec9'),
        h2('9.1 Chi Phí Vận Hành Hàng Tháng'),
        spacer(60),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3000, 2000, 2400, 1960],
          rows: [
            thRow(['Dịch Vụ', 'Gói Đề Xuất', 'Chi Phí / Tháng', 'Ghi Chú'], [3000, 2000, 2400, 1960]),
            tdRow(['Make.com', 'Core Plan', '$16', '10,000 ops/tháng'], [3000, 2000, 2400, 1960]),
            tdRow(['OpenAI API (GPT-4o-mini)', 'Pay-per-use', '$10-$20', '~500K tokens'], [3000, 2000, 2400, 1960], true),
            tdRow(['Airtable', 'Plus Plan', '$20', '5 users, advanced'], [3000, 2000, 2400, 1960]),
            tdRow(['Google Workspace', 'Starter', '$6', 'Calendar + Drive'], [3000, 2000, 2400, 1960], true),
            tdRow(['Slack (nội bộ)', 'Free Tier', '$0', 'Đủ dùng cho team < 10'], [3000, 2000, 2400, 1960]),
            new TableRow({
              children: [
                new TableCell({ borders: { top: bdr(C.success, 8), bottom: bdr(C.success, 4), left: bdr(C.success, 4), right: bdr(C.success, 4) }, shading: { fill: C.lightBg2, type: ShadingType.CLEAR }, width: { size: 3000, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: 'TỔNG CỘNG', bold: true, font: 'Arial', size: 22, color: C.success })] })] }),
                new TableCell({ borders: { top: bdr(C.success, 8), bottom: bdr(C.success, 4), left: bdr(C.success, 4), right: bdr(C.success, 4) }, shading: { fill: C.lightBg2, type: ShadingType.CLEAR }, width: { size: 2000, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: '', font: 'Arial', size: 22 })] })] }),
                new TableCell({ borders: { top: bdr(C.success, 8), bottom: bdr(C.success, 4), left: bdr(C.success, 4), right: bdr(C.success, 4) }, shading: { fill: C.lightBg2, type: ShadingType.CLEAR }, width: { size: 2400, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: '$52 – $62/tháng', bold: true, font: 'Arial', size: 22, color: C.success })] })] }),
                new TableCell({ borders: { top: bdr(C.success, 8), bottom: bdr(C.success, 4), left: bdr(C.success, 4), right: bdr(C.success, 4) }, shading: { fill: C.lightBg2, type: ShadingType.CLEAR }, width: { size: 1960, type: WidthType.DXA }, margins: { top: 100, bottom: 100, left: 140, right: 140 }, children: [new Paragraph({ children: [new TextRun({ text: '~1.3 – 1.6 triệu VND', font: 'Arial', size: 20, color: C.success })] })] }),
              ],
            }),
          ],
        }),

        spacer(120),
        h2('9.2 KPIs Theo Dõi Hàng Tuần'),
        spacer(60),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3200, 2200, 2200, 1760],
          rows: [
            thRow(['KPI', 'Baseline (hiện tại)', 'Mục Tiêu', 'Cách Đo'], [3200, 2200, 2200, 1760]),
            tdRow(['% tin nhắn bot xử lý tự động', '0%', '≥ 70%', 'Auto / Total msgs'], [3200, 2200, 2200, 1760]),
            tdRow(['Thời gian phản hồi trung bình', '15-30 phút', '< 30 giây', 'Timestamp webhook→reply'], [3200, 2200, 2200, 1760], true),
            tdRow(['Accuracy phân loại Intent', 'N/A', '≥ 90%', 'Spot check 50 cases/tuần'], [3200, 2200, 2200, 1760]),
            tdRow(['Tỷ lệ chuyển đổi Inquiry→Booking', '~15%', '≥ 25%', 'Confirmed / Inquiry count'], [3200, 2200, 2200, 1760], true),
            tdRow(['Sự cố Overbooking', 'N/A', '0 lần', 'Count(conflicts)'], [3200, 2200, 2200, 1760]),
            tdRow(['Gửi reminder check-in', 'Thủ công (~50%)', '100%', 'Sent / Tomorrow bookings'], [3200, 2200, 2200, 1760], true),
            tdRow(['Tỷ lệ thu thập Review', '< 10%', '≥ 40%', 'Reviews / Checkouts'], [3200, 2200, 2200, 1760]),
          ],
        }),

        new Paragraph({ children: [new PageBreak()] }),

        // ═══════════════════════════════════════════════════════
        // PHỤ LỤC
        // ═══════════════════════════════════════════════════════
        h1('Phụ Lục: System Prompt Mẫu', 'appendix'),
        h2('A. System Prompt — NLP Entity Extraction (FR01)'),
        spacer(60),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [9360],
          rows: [new TableRow({ children: [new TableCell({
            borders: borders('333333'),
            shading: { fill: '1E1B4B', type: ShadingType.CLEAR },
            margins: { top: 160, bottom: 160, left: 200, right: 200 },
            children: [
              new Paragraph({ children: [new TextRun({ text: 'SYSTEM PROMPT — NLP Engine', bold: true, font: 'Courier New', size: 18, color: '818CF8' })], spacing: { after: 100 } }),
              new Paragraph({ children: [new TextRun({ text: 'Bạn là AI NLP engine của hệ thống đặt phòng homestay Việt Nam.', font: 'Courier New', size: 18, color: 'A5F3FC' })], spacing: { after: 40 } }),
              new Paragraph({ children: [new TextRun({ text: 'Phân tích tin nhắn và trả về JSON (không giải thích thêm):', font: 'Courier New', size: 18, color: 'A5F3FC' })], spacing: { after: 80 } }),
              new Paragraph({ children: [new TextRun({ text: '{ "intent": "booking_inquiry|confirm|complaint|...",', font: 'Courier New', size: 18, color: 'FDE68A' })], spacing: { after: 20 } }),
              new Paragraph({ children: [new TextRun({ text: '  "check_in_date": "YYYY-MM-DD hoặc null",', font: 'Courier New', size: 18, color: 'FDE68A' })], spacing: { after: 20 } }),
              new Paragraph({ children: [new TextRun({ text: '  "check_out_date": "YYYY-MM-DD hoặc null",', font: 'Courier New', size: 18, color: 'FDE68A' })], spacing: { after: 20 } }),
              new Paragraph({ children: [new TextRun({ text: '  "num_adults": number | null,', font: 'Courier New', size: 18, color: 'FDE68A' })], spacing: { after: 20 } }),
              new Paragraph({ children: [new TextRun({ text: '  "branch": "da_lat|hoi_an|nha_trang|null" }', font: 'Courier New', size: 18, color: 'FDE68A' })], spacing: { after: 80 } }),
              new Paragraph({ children: [new TextRun({ text: 'Ngày hôm nay: {{current_date}}', font: 'Courier New', size: 18, color: '6EE7B7' })], spacing: { after: 20 } }),
              new Paragraph({ children: [new TextRun({ text: 'Tin nhắn: "{{user_message}}"', font: 'Courier New', size: 18, color: '6EE7B7' }) ], spacing: { after: 0 } }),
            ],
          })]})],
        }),

        spacer(160),
        h2('B. Liên Hệ & Hỗ Trợ'),
        bullet('Demo app: Mở file index.html trong thư mục dự án'),
        bullet('Source code: Thư mục bliss/ — gồm 7 file JS, CSS, HTML'),
        bullet('Tài liệu kế hoạch: implementation_plan.md'),
        bullet('Hỗ trợ kỹ thuật: Liên hệ team Tech qua Slack #dev-support'),
        spacer(80),
        infoBox('📌 Lưu ý quan trọng', [
          '• Demo hiện tại chạy 100% offline, không cần server hay API key',
          '• Có thể nâng cấp AI bằng cách thêm Gemini API key (miễn phí) trong phần Cài đặt',
          '• Dữ liệu demo lưu trong localStorage của browser — reset bằng nút trong Cài đặt',
          '• Để deploy thực tế: cần cấu hình Make.com + Airtable + Facebook/Zalo API',
        ], C.lightBg3, C.warning),
      ],
    },
  ],
});

// ─── Generate file ────────────────────────────────────────────
Packer.toBuffer(doc).then(buffer => {
  const outPath = 'Bliss_Homestay_AI_Huong_Dan_Luong_Van_Hanh.docx';
  fs.writeFileSync(outPath, buffer);
  console.log(`\n✅ Tạo file Word thành công: ${outPath}`);
  console.log(`📁 Đường dẫn: ${require('path').resolve(outPath)}`);
  console.log(`📄 Kích thước: ${(buffer.length / 1024).toFixed(1)} KB`);
}).catch(err => {
  console.error('❌ Lỗi:', err.message);
  process.exit(1);
});
