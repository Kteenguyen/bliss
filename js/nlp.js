// ============================================================
// nlp.js — Advanced Vietnamese NLP Engine v2.0
// Nâng cấp: multi-date, typo tolerance, number words,
//            budget extraction, group detection, sentiment,
//            special requests, room-type preference
// ============================================================

const NLP = {

  // ─── Normalize text: lowercase + remove diacritics variants ─
  _norm(text) {
    return text.toLowerCase()
      .replace(/à|á|ả|ã|ạ|ă|ắ|ặ|ằ|ẳ|ẵ|â|ấ|ầ|ẩ|ẫ|ậ/g, 'a')
      .replace(/è|é|ẻ|ẽ|ẹ|ê|ề|ế|ể|ễ|ệ/g, 'e')
      .replace(/ì|í|ỉ|ĩ|ị/g, 'i')
      .replace(/ò|ó|ỏ|õ|ọ|ô|ố|ồ|ổ|ỗ|ộ|ơ|ớ|ờ|ở|ỡ|ợ/g, 'o')
      .replace(/ù|ú|ủ|ũ|ụ|ư|ứ|ừ|ử|ữ|ự/g, 'u')
      .replace(/ỳ|ý|ỷ|ỹ|ỵ/g, 'y')
      .replace(/đ/g, 'd');
  },

  // ─── Convert Vietnamese number words to digits ──────────────
  _vnNumToInt(text) {
    const map = {
      'mot': 1, 'hai': 2, 'ba': 3, 'bon': 4, 'nam': 5,
      'sau': 6, 'bay': 7, 'tam': 8, 'chin': 9, 'muoi': 10,
      'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
      'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    };
    const n = this._norm(text);
    for (const [k, v] of Object.entries(map)) {
      if (n.includes(k)) return v;
    }
    return null;
  },

  // ─── Multi-pattern Vietnamese date parser ───────────────────
  parseDate(text, referenceDate = new Date()) {
    const t = text.toLowerCase().trim();
    const ref = new Date(referenceDate);
    const year = ref.getFullYear();

    const mkDate = (y, m, d) => {
      const date = new Date(y, m - 1, d);
      return date.toISOString().split('T')[0];
    };

    const addDays = (base, n) => {
      const d = new Date(base);
      d.setDate(d.getDate() + n);
      return d.toISOString().split('T')[0];
    };

    const normT = this._norm(t);

    // Relative expressions first
    if (normT.match(/\bhom nay\b|today/)) return ref.toISOString().split('T')[0];
    if (normT.match(/\bngay mai\b|tomorrow/)) return addDays(ref, 1);
    if (normT.match(/\bngay kia\b|ngay mot\b/)) return addDays(ref, 2);
    if (normT.match(/tuan sau|tuan toi|next week/)) return addDays(ref, 7);
    if (normT.match(/cuoi tuan nay|this weekend/)) {
      const d = new Date(ref);
      const dow = d.getDay();
      d.setDate(d.getDate() + (6 - dow));
      return d.toISOString().split('T')[0];
    }
    if (normT.match(/cuoi tuan sau|next weekend/)) {
      const d = new Date(ref);
      const dow = d.getDay();
      d.setDate(d.getDate() + (13 - dow));
      return d.toISOString().split('T')[0];
    }

    // "X ngày nữa / X ngày tới"
    const inDays = normT.match(/(\d+)\s*ngay\s*(nua|toi|sau)/);
    if (inDays) return addDays(ref, parseInt(inDays[1]));

    // Weekday names
    const dayMap = { 'hai': 1, 'ba': 2, 'tu': 3, 'nam': 4, 'sau': 5, 'bay': 6, 'chu nhat': 0, 'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6 };
    for (const [name, target] of Object.entries(dayMap)) {
      const re = name === 'chu nhat'
        ? /\b(chu nhat|cn|sunday|sun)\b/
        : new RegExp(`\\b(thu\\s*${name}|${name})\\b`);
      if (this._norm(t).match(re)) {
        const curr = ref.getDay();
        let diff = (target - curr + 7) % 7;
        if (diff === 0) diff = 7; // next occurrence
        return addDays(ref, diff);
      }
    }
    // Numeric weekday check (e.g. "thứ 6", "t6", "thứ 2")
    const numDays = { '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6 };
    for (const [num, target] of Object.entries(numDays)) {
      const re = new RegExp(`\\b(thu\\s*${num}|t${num})\\b`);
      if (this._norm(t).match(re)) {
        const curr = ref.getDay();
        let diff = (target - curr + 7) % 7;
        if (diff === 0) diff = 7; // next occurrence
        return addDays(ref, diff);
      }
    }

    // Direct weekday match (Vietnamese with diacritics)
    const vDays = [/thứ\s*hai/, /thứ\s*ba/, /thứ\s*tư/, /thứ\s*năm/, /thứ\s*sáu/, /thứ\s*bảy/, /chủ\s*nhật/];
    const vTargets = [1, 2, 3, 4, 5, 6, 0];
    for (let i = 0; i < vDays.length; i++) {
      if (text.toLowerCase().match(vDays[i])) {
        const curr = ref.getDay();
        let diff = (vTargets[i] - curr + 7) % 7 || 7;
        return addDays(ref, diff);
      }
    }

    // "đầu tháng / giữa tháng / cuối tháng" + optional month number
    const monthRef = t.match(/thang\s*(\d{1,2})/);
    const m = monthRef ? parseInt(monthRef[1]) : (ref.getMonth() + 1);
    const y = (m < ref.getMonth() + 1) ? year + 1 : year;
    if (t.match(/dau thang|đầu tháng/)) return mkDate(y, m, 3);
    if (t.match(/giua thang|giữa tháng/)) return mkDate(y, m, 15);
    if (t.match(/cuoi thang|cuối tháng/)) return mkDate(y, m, 28);

    // DD/MM/YYYY or DD/MM or DD-MM
    const dmy = text.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}|\d{2}))?/);
    if (dmy) {
      const dy = dmy[1] <= 31 ? parseInt(dmy[1]) : null;
      const dm = dmy[2] <= 12 ? parseInt(dmy[2]) : null;
      if (dy && dm) {
        let fy = dmy[3] ? parseInt(dmy[3]) : year;
        if (fy < 100) fy += 2000;
        const candidate = new Date(fy, dm - 1, dy);
        if (candidate < ref && !dmy[3]) candidate.setFullYear(year + 1);
        return candidate.toISOString().split('T')[0];
      }
    }

    // "ngày DD tháng MM" or "DD tháng MM"
    const dtm = text.match(/(?:ngày\s*)?(\d{1,2})\s*[\/\-]?\s*tháng\s*(\d{1,2})(?:\s*(?:năm\s*)?(\d{4}))?/i);
    if (dtm) {
      const fy = dtm[3] ? parseInt(dtm[3]) : year;
      return mkDate(fy, parseInt(dtm[2]), parseInt(dtm[1]));
    }

    // Month/Year only: "tháng 7", "tháng 7/2026" → first day of that month
    const moOnly = text.match(/tháng\s*(\d{1,2})(?:\s*[\/\-]\s*(\d{4}))?/i);
    if (moOnly) {
      const fy = moOnly[2] ? parseInt(moOnly[2]) : year;
      return mkDate(fy, parseInt(moOnly[1]), 1);
    }

    return null;
  },

  // ─── Extract multiple dates from a single text ──────────────
  extractAllDates(text) {
    // Try "từ X đến/tới Y" pattern first
    const range = text.match(/(?:từ|from)\s+(.+?)\s+(?:đến|tới|đến ngày|to)\s+(.+?)(?:\s|$|,|\.)/i);
    if (range) {
      const d1 = this.parseDate(range[1]);
      const d2 = this.parseDate(range[2]);
      if (d1 && d2 && d1 < d2) return { checkIn: d1, checkOut: d2 };
    }

    // Try "check-in X check-out Y"
    const co = text.match(/(?:check.?out|trả phòng|ra)\s+(?:ngày\s*)?(.+?)(?:\s|$|,)/i);
    const ci = text.match(/(?:check.?in|nhận phòng|vào|từ)\s+(?:ngày\s*)?(.+?)(?:\s|$|,)/i);
    if (ci && co) {
      const d1 = this.parseDate(ci[1]);
      const d2 = this.parseDate(co[1]);
      if (d1 && d2) return { checkIn: d1, checkOut: d2 };
    }

    // Fallback: find 2 separate date-like tokens
    const tokens = text.split(/\s+(?:đến|tới|và|→|-|,)\s+/);
    if (tokens.length >= 2) {
      const d1 = this.parseDate(tokens[0]);
      const d2 = this.parseDate(tokens[1]);
      if (d1 && d2 && d1 < d2) return { checkIn: d1, checkOut: d2 };
    }

    // Single date found
    const single = this.parseDate(text);
    return { checkIn: single, checkOut: null };
  },

  extractNights(text) {
    const m = text.match(/(\d+)\s*(đêm|ngày|nights?|days?)/i);
    if (m) return parseInt(m[1]);
    // Word numbers: "hai đêm"
    const wn = text.match(/(một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười)\s*(đêm|ngày)/i);
    if (wn) {
      const map = { 'một':1,'hai':2,'ba':3,'bốn':4,'năm':5,'sáu':6,'bảy':7,'tám':8,'chín':9,'mười':10 };
      return map[wn[1].toLowerCase()] || null;
    }
    return null;
  },

  // ─── Extract guest count with child/adult breakdown ─────────
  extractGuests(text) {
    const t = text;

    // "2 người lớn 1 trẻ em"
    const mixed = t.match(/(\d+)\s*(?:người lớn|adult)/i);
    const kids = t.match(/(\d+)\s*(?:trẻ em|bé|em bé|kids?|children?)/i);
    if (mixed) {
      return { adults: parseInt(mixed[1]), children: kids ? parseInt(kids[1]) : 0, total: parseInt(mixed[1]) + (kids ? parseInt(kids[1]) : 0) };
    }

    // "2 người" / "4 khách" / "nhóm 5"
    const simple = t.match(/(\d+)\s*(?:người|khách|pax|adults?|members?|bạn|người bạn)/i);
    if (simple) return { adults: parseInt(simple[1]), children: 0, total: parseInt(simple[1]) };

    // Number word: "hai người"
    const wordNum = t.match(/(một|hai|ba|bốn|năm|sáu|bảy|tám|chín|mười)\s*(?:người|khách|bạn)/i);
    if (wordNum) {
      const map = { 'một':1,'hai':2,'ba':3,'bốn':4,'năm':5,'sáu':6,'bảy':7,'tám':8,'chín':9,'mười':10 };
      const n = map[wordNum[1].toLowerCase()] || 1;
      return { adults: n, children: 0, total: n };
    }

    // Group keywords: "cả nhà", "gia đình" → assume 4, "cặp đôi" → 2
    if (t.match(/cả nhà|gia đình|family/i)) return { adults: 4, children: 1, total: 5, inferred: true };
    if (t.match(/cặp đôi|couple|2 vợ chồng|anh em|2 anh|chúng mình 2/i)) return { adults: 2, children: 0, total: 2, inferred: true };
    if (t.match(/nhóm bạn|hội bạn|team building/i)) return { adults: 6, children: 0, total: 6, inferred: true };

    return null;
  },

  // ─── Extract budget/price expectation ───────────────────────
  extractBudget(text) {
    // "dưới 1 triệu", "khoảng 2tr", "tầm 800k", "không quá 1.5 triệu"
    const m = text.match(/(?:dưới|không quá|tầm|khoảng|budget|giá tầm|giá khoảng|giá không|tối đa)?\s*([\d,.]+)\s*(tr|triệu|k|nghìn|đồng|vnd)/i);
    if (!m) return null;
    let val = parseFloat(m[1].replace(/,/g, '.'));
    const unit = m[2].toLowerCase();
    if (unit === 'tr' || unit === 'triệu') val *= 1000000;
    else if (unit === 'k' || unit === 'nghìn') val *= 1000;
    const isMax = !!text.match(/dưới|không quá|tối đa|tối thiểu|budget/i);
    return { amount: val, isMaxBudget: isMax };
  },

  // ─── Extract room type preferences ─────────────────────────
  extractRoomPreferences(text) {
    const t = text.toLowerCase();
    const prefs = {
      wantsView: t.match(/view|cảnh|nhìn ra|ngắm/i) ? true : null,
      wantsBathtub: t.match(/bồn tắm|bathtub|bồn/) ? true : null,
      wantsPool: t.match(/hồ bơi|bể bơi|pool/) ? true : null,
      wantsKitchen: t.match(/bếp|nấu ăn|kitchen/) ? true : null,
      wantsHighFloor: t.match(/tầng cao|view cao|trên cao/) ? true : null,
      occasion: null,
    };
    if (t.match(/honeymoon|tuần trăng mật|wedding|lễ cưới|kỷ niệm/)) prefs.occasion = 'honeymoon';
    else if (t.match(/sinh nhật|birthday/)) prefs.occasion = 'birthday';
    else if (t.match(/team building|công ty|company/)) prefs.occasion = 'corporate';
    else if (t.match(/family|gia đình|cả nhà/)) prefs.occasion = 'family';
    return prefs;
  },

  // ─── Branch extraction with alias/typo tolerance ────────────
  extractBranch(text) {
    const n = this._norm(text);
    if (n.match(/\b(da lat|dalat|da.?lat|đà lạt|dalate|dala)\b/)) return { key: 'da_lat', name: 'Đà Lạt' };
    if (n.match(/\b(hoi an|hoian|hội an|hoan|hoian)\b/)) return { key: 'hoi_an', name: 'Hội An' };
    if (n.match(/\b(nha trang|nhatrang|nt|nha.?tran)\b/)) return { key: 'nha_trang', name: 'Nha Trang' };
    // Fuzzy: detect common misspellings
    if (n.match(/dalat|dalattt|đà ?lạt/)) return { key: 'da_lat', name: 'Đà Lạt' };
    if (n.match(/hoi-an|hoi_an/)) return { key: 'hoi_an', name: 'Hội An' };
    return null;
  },

  // ─── Sentiment analysis ────────────────────────────────────
  detectSentiment(text) {
    const t = text.toLowerCase();
    const pos = (t.match(/tuyệt|đẹp|thích|yêu|ổn|được|ngon|tốt|ok|hay|thú vị|vui|hạnh phúc|great|nice|love|good/g) || []).length;
    const neg = (t.match(/tệ|dở|chán|thất vọng|tức|bực|khó chịu|xấu|không ổn|bad|poor|terrible|awful|disappointed/g) || []).length;
    if (neg > pos) return 'negative';
    if (pos > neg) return 'positive';
    return 'neutral';
  },

  // ─── Urgency detection ─────────────────────────────────────
  detectUrgency(text) {
    const t = text.toLowerCase();
    if (t.match(/gấp|ngay|ngay bây giờ|ngay lập tức|khẩn|urgent|asap|hôm nay|trong hôm nay|còn phòng gấp/)) return 'high';
    if (t.match(/sớm nhất|as soon|nhanh|quickly/)) return 'medium';
    return 'low';
  },

  // ─── Intent detection v2 (ordered by specificity) ──────────
  detectIntent(text) {
    const t = text.toLowerCase();
    const n = this._norm(text);

    // High-priority specific intents first
    if (n.match(/\b(hong|hu|bi loi|khong hoat dong|su co|phan nan|khieu nai|mat dien|nuoc khong|may lanh|wifi khong|hong roi|chua hoat|bi hu)\b/))
      return 'complaint';

    if (t.match(/mã cửa|pin code|cửa không mở|nhận phòng|vào phòng|đã đến nơi|đang ở trước cửa|check.?in guide|hướng dẫn vào/))
      return 'checkin_support';

    if (t.match(/trả phòng|check.?out rồi|vừa trả|đã ra|làm thủ tục trả|late check.?out|sớm trả/))
      return 'checkout_support';

    if (n.match(/\b(huy|huy phong|doi lich|thay ngay|cancel|doi phong|huy dat)\b/))
      return 'cancel_modify';

    if (t.match(/cảm ơn|tuyệt vời|hài lòng|sẽ quay lại|review|đánh giá|feedback|5 sao|recommend/))
      return 'feedback';

    // Booking confirmation — must come before inquiry to avoid "ok tôi muốn hỏi" misclassification
    if (n.match(/\b(ok|oke|okk|chot|dat di|minh dat|xac nhan|confirm|duoc roi|lấy phòng|tôi lấy|đặt phòng này|book it|tôi muốn đặt)\b/)
      && !n.match(/\b(khong|chua|nghi|suy nghi)\b/) && !n.match(/\bhoi\b(?!\s*an\b)/))
      return 'booking_confirm';

    // Price/availability inquiry & implicit booking request (e.g. "từ thứ 6 đến chủ nhật")
    if (n.match(/con phong|co phong|kiem tra phong|check phong|available|dat phong|bao nhieu|gia phong|tu van|muon dat|muon o|tim phong|gia|tien|budget|goi y phong|\bphong\b/))
      return 'booking_inquiry';

    if (n.match(/\b(tu|from)\b/) && n.match(/\b(den|toi|to)\b/) && (n.match(/\b(da lat|hoi an|nha trang)\b/) || n.match(/\b(dem|ngay)\b/)))
      return 'booking_inquiry';

    // Mentions of branch names alone (e.g. when replying to branch prompt)
    if (n.match(/\b(da lat|dalat|hoi an|hoian|nha trang|nhatrang)\b/) && !n.match(/\b(pass|password|wifi|mat khau|o to|xe may|xe dap|an uong|nha hang|gan day|cach|km|parking|bai do|don san bay|check.?in|check.?out|mat dien|nuoc khong|mat nuoc|hong|hu|su co)\b/))
      return 'booking_inquiry';

    if (n.match(/\b(tien ich|tien nghi|gan day|gan dau|cach|km|duong di|duong den|parking|bai do|nha hang|quan an|an gi|an uong|tour|dich vu|ho boi|bua sang|xe may|xe dap|don san bay)\b/))
      return 'faq';

    if (n.match(/xin chao|hello|hi|alo|chao|good morning|chào buổi|bonjour/))
      return 'greeting';

    if (t.match(/so sánh|phòng nào tốt|phòng nào đẹp|nên chọn|recommend|gợi ý|tư vấn/))
      return 'recommendation';

    if (t.match(/đặt cọc|cọc|deposit|chuyển khoản|bank|thanh toán|payment|stk|số tài khoản/))
      return 'payment';

    if (t.match(/có wifi|wifi mật khẩu|password wifi|mật khẩu|pass wifi/))
      return 'faq';

    return 'general';
  },

  // ─── Main extraction function (enriched) ──────────────────
  extract(text) {
    const intent = this.detectIntent(text);
    const branch = this.extractBranch(text);
    const guests = this.extractGuests(text);
    const nights = this.extractNights(text);
    const budget = this.extractBudget(text);
    const prefs = this.extractRoomPreferences(text);
    const sentiment = this.detectSentiment(text);
    const urgency = this.detectUrgency(text);

    // Multi-date extraction
    const { checkIn, checkOut: co } = this.extractAllDates(text);
    let checkOut = co;

    // Derive checkOut from nights if needed
    if (checkIn && !checkOut && nights) {
      const d = new Date(checkIn);
      d.setDate(d.getDate() + nights);
      checkOut = d.toISOString().split('T')[0];
    }

    // Validate: checkOut must be after checkIn
    if (checkIn && checkOut && checkOut <= checkIn) {
      checkOut = null;
    }

    return {
      intent,
      check_in_date: checkIn,
      check_out_date: checkOut,
      num_adults: guests?.adults ?? null,
      num_children: guests?.children ?? 0,
      total_guests: guests?.total ?? null,
      guests_inferred: guests?.inferred ?? false,
      branch: branch?.key ?? null,
      branch_name: branch?.name ?? null,
      nights,
      budget,
      preferences: prefs,
      sentiment,
      urgency,
      raw: text,
    };
  },

  // ─── Gemini API integration (enhanced prompt) ──────────────
  async extractWithGemini(text, apiKey) {
    const today = new Date().toISOString().split('T')[0];
    const prompt = `Bạn là AI NLP engine của hệ thống đặt phòng homestay Việt Nam. 
Phân tích tin nhắn khách hàng và trả về JSON chính xác (không giải thích thêm, không markdown).

Schema:
{
  "intent": "booking_inquiry|booking_confirm|complaint|checkin_support|checkout_support|faq|greeting|cancel_modify|recommendation|payment|feedback|general",
  "check_in_date": "YYYY-MM-DD hoặc null",
  "check_out_date": "YYYY-MM-DD hoặc null",
  "num_adults": number hoặc null,
  "num_children": number hoặc 0,
  "total_guests": number hoặc null,
  "branch": "da_lat|hoi_an|nha_trang hoặc null",
  "branch_name": "Đà Lạt|Hội An|Nha Trang hoặc null",
  "nights": number hoặc null,
  "budget": { "amount": number, "isMaxBudget": boolean } hoặc null,
  "preferences": {
    "wantsView": boolean hoặc null,
    "wantsBathtub": boolean hoặc null,
    "wantsPool": boolean hoặc null,
    "wantsKitchen": boolean hoặc null,
    "occasion": "honeymoon|birthday|corporate|family hoặc null"
  },
  "sentiment": "positive|neutral|negative",
  "urgency": "high|medium|low",
  "guests_inferred": boolean
}

Quy tắc:
- Ngày hôm nay: ${today}
- Tính ngày tương đối (ngày mai, thứ 6, cuối tuần) so với ngày hôm nay
- intent "booking_inquiry" khi hỏi giá/phòng/tìm phòng
- intent "booking_confirm" khi khách đồng ý đặt (ok, chốt, xác nhận)
- Nếu không đủ thông tin → vẫn trả về những gì có, null cho phần còn lại

Tin nhắn khách: "${text}"`;

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 512 }
          })
        }
      );
      const data = await res.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0];
      if (jsonStr) {
        const result = JSON.parse(jsonStr);
        result.raw = text;
        return result;
      }
    } catch (e) {
      console.warn('[NLP] Gemini error, falling back to rule-based:', e.message);
    }
    return null;
  },

  // ─── Test suite (call NLP.runTests() in console) ───────────
  runTests() {
    const cases = [
      { input: 'Còn phòng ở Đà Lạt từ 28/6 đến 30/6 không? Mình 2 người', expected: { intent: 'booking_inquiry', branch: 'da_lat', num_adults: 2 } },
      { input: 'cho mình hỏi phòng Hội An thứ 6 tuần này 3 đêm cho 4 người', expected: { intent: 'booking_inquiry', branch: 'hoi_an', nights: 3, num_adults: 4 } },
      { input: 'OK đặt phòng đó đi', expected: { intent: 'booking_confirm' } },
      { input: 'máy lạnh bị hỏng rồi ạ', expected: { intent: 'complaint' } },
      { input: 'mã cửa là bao nhiêu', expected: { intent: 'checkin_support' } },
      { input: 'xin chào', expected: { intent: 'greeting' } },
      { input: 'mình muốn phòng có view biển, budget tầm 1 triệu 1 đêm, 2 người', expected: { intent: 'booking_inquiry', budget: { isMaxBudget: true } } },
      { input: 'từ thứ 6 đến chủ nhật tuần này ở Nha Trang cặp đôi', expected: { intent: 'booking_inquiry', branch: 'nha_trang', num_adults: 2 } },
      { input: 'tuần trăng mật cần phòng có bồn tắm ở Đà Lạt', expected: { intent: 'booking_inquiry', branch: 'da_lat' } },
      { input: 'huỷ booking BL003 giúp mình', expected: { intent: 'cancel_modify' } },
    ];

    let pass = 0;
    console.group('[NLP Test Suite]');
    cases.forEach((c, i) => {
      const result = this.extract(c.input);
      const ok = Object.entries(c.expected).every(([k, v]) => {
        if (typeof v === 'object' && v !== null) return JSON.stringify(result[k]).includes(JSON.stringify(v).slice(1, -1));
        return result[k] === v;
      });
      console.log(`${ok ? '✅' : '❌'} [${i+1}] "${c.input}"`);
      if (!ok) console.log('  Expected:', c.expected, '\n  Got:', result);
      if (ok) pass++;
    });
    console.log(`\n📊 Result: ${pass}/${cases.length} passed (${Math.round(pass/cases.length*100)}%)`);
    console.groupEnd();
    return { pass, total: cases.length, rate: Math.round(pass/cases.length*100) };
  }
};
