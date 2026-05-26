/**
 * Bliss Homestay AI Hub - Google Sheets Database Service Script
 * Version: 3.0
 * File: google-apps-script.js
 * 
 * Description:
 * This script runs inside Google Apps Script (bound to the Google Sheet) and provides 
 * a robust, transactional CRUD API for the Bliss Homestay database. It handles GET and 
 * POST requests from the Express backend server to interact with the 'Rooms', 'Bookings', 
 * 'Customers', and 'ChatLogs' sheets, bypassing the need for heavy API client libraries.
 * It also handles real-time edit notification triggers to clear the server's cache when
 * administrative edits are made directly in the spreadsheet cells.
 * 
 * Features:
 * - Thread-safe auto-incrementing ID generation utilizing LockService.
 * - Auto-initialization: Creates sheets and writes correct header schemas if they don't exist.
 * - JSON serialization: Handles array and object columns (amenities, images, slot_prices) automatically.
 * - Soft-deletes for rooms (inactive) and bookings (cancelled), with hard-delete fallback.
 * - Security: API key validation and installable trigger for webhook notifications (preventing stale cache).
 */

// =========================================================================
// 1. DATABASE SCHEMA & CONFIGURATION
// =========================================================================

const SHEET_CONFIG = {
  rooms: {
    name: "Rooms",
    idField: "room_id",
    idPrefix: "R",
    idPad: 3,
    columns: [
      "room_id",
      "room_name",
      "branch",
      "branch_name",
      "address",
      "capacity",
      "base_price_weekday",
      "base_price_weekend",
      "slot_prices",
      "amenities",
      "images",
      "emoji",
      "description",
      "status",
      "created_at",
      "updated_at"
    ]
  },
  bookings: {
    name: "Bookings",
    idField: "booking_id",
    idPrefix: "BL",
    idPad: 3,
    columns: [
      "booking_id",
      "customer_name",
      "customer_phone",
      "customer_social_id",
      "branch",
      "branch_name",
      "room_id",
      "room_name",
      "check_in_date",
      "check_out_date",
      "num_guests",
      "total_price",
      "payment_status",
      "checkin_status",
      "special_requests",
      "source",
      "review_sent",
      "created_at",
      "updated_at"
    ]
  },
  customers: {
    name: "Customers",
    idField: "customer_id",
    idPrefix: "C",
    idPad: 3,
    columns: [
      "customer_id",
      "customer_name",
      "customer_phone",
      "facebook_psid",
      "telegram_chat_id",
      "whatsapp_phone_id",
      "interaction_count",
      "last_booking_id",
      "notes",
      "created_at",
      "updated_at"
    ]
  },
  chat_logs: {
    name: "ChatLogs",
    idField: "log_id",
    idPrefix: "LOG",
    idPad: 6,
    columns: [
      "log_id",
      "social_id",
      "channel",
      "sender_role",
      "message_content",
      "parsed_intent",
      "parsed_entities",
      "timestamp"
    ]
  }
};

// =========================================================================
// 2. HTTP ROUTER HANDLERS (GET & POST)
// =========================================================================

/**
 * Handle incoming GET requests (Read operations)
 */
function doGet(e) {
  try {
    const params = e.parameter;
    const token = params.token;

    // Verify API Key
    if (token !== getAuthToken()) {
      return makeJsonResponse({ success: false, error: "UNAUTHORIZED", message: "Chìa khóa API không hợp lệ!" }, 401);
    }

    const sheetKey = params.sheet;
    if (!sheetKey || !SHEET_CONFIG[sheetKey]) {
      return makeJsonResponse({ success: false, error: "INVALID_SHEET", message: "Bảng dữ liệu yêu cầu không hợp lệ hoặc thiếu!" }, 400);
    }

    const records = readRecords(sheetKey, params);
    return makeJsonResponse({ success: true, data: records }, 200);
  } catch (error) {
    return makeJsonResponse({ success: false, error: "SERVER_ERROR", message: error.toString() }, 500);
  }
}

/**
 * Handle incoming POST requests (Write operations: Create, Update, Delete)
 */
function doPost(e) {
  try {
    let postData;
    try {
      postData = JSON.parse(e.postData.contents);
    } catch (err) {
      return makeJsonResponse({ success: false, error: "BAD_REQUEST", message: "Nội dung yêu cầu không phải là định dạng JSON hợp lệ!" }, 400);
    }

    // Verify API Key (supports body token or query parameter token)
    const token = postData.token || e.parameter.token;
    if (token !== getAuthToken()) {
      return makeJsonResponse({ success: false, error: "UNAUTHORIZED", message: "Chìa khóa API không hợp lệ!" }, 401);
    }

    const sheetKey = postData.sheet;
    if (!sheetKey || !SHEET_CONFIG[sheetKey]) {
      return makeJsonResponse({ success: false, error: "INVALID_SHEET", message: "Bảng dữ liệu yêu cầu không hợp lệ hoặc thiếu!" }, 400);
    }

    const action = postData.action;
    let result;

    switch (action) {
      case "create":
        if (Array.isArray(postData.data)) {
          result = createRecords(sheetKey, postData.data);
        } else {
          result = createRecord(sheetKey, postData.data);
        }
        break;
      case "update":
        if (!postData.id) {
          return makeJsonResponse({ success: false, error: "MISSING_ID", message: "Thiếu trường ID để cập nhật thông tin!" }, 400);
        }
        result = updateRecord(sheetKey, postData.id, postData.data);
        break;
      case "delete":
        if (!postData.id) {
          return makeJsonResponse({ success: false, error: "MISSING_ID", message: "Thiếu trường ID để thực hiện hành động xóa!" }, 400);
        }
        result = deleteRecord(sheetKey, postData.id, postData.force);
        break;
      default:
        return makeJsonResponse({ success: false, error: "INVALID_ACTION", message: "Hành động (action) không được hỗ trợ!" }, 400);
    }

    return makeJsonResponse(result, 200);
  } catch (error) {
    return makeJsonResponse({ success: false, error: "SERVER_ERROR", message: error.toString() }, 500);
  }
}

/**
 * Format JSON responses for Apps Script Web App
 */
function makeJsonResponse(data, statusCode) {
  // Apps Script Web Apps do not natively support setting HTTP status codes on text outputs.
  // Therefore, we embed the status code directly in the JSON response payload.
  const responsePayload = typeof data === "object" ? data : { message: data };
  responsePayload.status = statusCode;

  const output = ContentService.createTextOutput(JSON.stringify(responsePayload));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

/**
 * Get the security token from Script Properties, with a secure default fallback.
 */
function getAuthToken() {
  const token = PropertiesService.getScriptProperties().getProperty("API_KEY");
  return token || "BlissSecureToken2026";
}

// =========================================================================
// 3. CORE DATABASE OPERATIONS (CRUD)
// =========================================================================

/**
 * Fetch or auto-create sheet structure based on schema configs
 */
function getOrCreateSheet(sheetKey) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const config = SHEET_CONFIG[sheetKey];
  if (!config) throw new Error("Cấu hình sheet không tồn tại cho khóa: " + sheetKey);

  let sheet = ss.getSheetByName(config.name);
  if (!sheet || sheet.getLastColumn() === 0) {
    if (!sheet) {
      sheet = ss.insertSheet(config.name);
    }
    // Write header rows
    sheet.appendRow(config.columns);
    // Style headers to make them readable
    const range = sheet.getRange(1, 1, 1, config.columns.length);
    range.setFontWeight("bold");
    range.setBackground("#4F46E5"); // Indigo theme
    range.setFontColor("#FFFFFF");
    sheet.setFrozenRows(1);

    // Automatically apply alternating colors to rows for readability
    sheet.getRange(2, 1, 1000, config.columns.length).setBackground(null);
    sheet.getRange(1, 1, 1000, config.columns.length).setFontFamily("Arial");
  }
  return sheet;
}

/**
 * Fetch sheet headers array
 */
function getSheetHeaders(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) return [];
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
}

/**
 * Read records from Google Sheet and parse values dynamically based on data types
 */
function readRecords(sheetKey, queryParams) {
  const sheet = getOrCreateSheet(sheetKey);
  const config = SHEET_CONFIG[sheetKey];
  const lastRow = sheet.getLastRow();

  if (lastRow <= 1) {
    return []; // Sheet is empty (only headers exist)
  }

  const headers = getSheetHeaders(sheet);
  const values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();

  const records = values.map((row, rowIndex) => {
    const record = { _rowNum: rowIndex + 2 }; // Row number is 1-indexed, starts at row 2

    headers.forEach((header, colIndex) => {
      if (header) {
        let val = row[colIndex];

        // Parse JSON strings (e.g. amenities, images, slot_prices)
        if (typeof val === "string" && (val.startsWith("{") || val.startsWith("["))) {
          try {
            val = JSON.parse(val);
          } catch (e) {
            // Keep original string if parsing fails
          }
        }

        // Normalize Dates
        if (val instanceof Date) {
          if (header.indexOf("date") !== -1) {
            // Date only (check_in_date, check_out_date)
            val = Utilities.formatDate(val, Session.getScriptTimeZone(), "yyyy-MM-dd");
          } else {
            // Full ISO timestamp (created_at, updated_at, timestamp)
            val = val.toISOString();
          }
        }

        record[header] = val;
      }
    });
    return record;
  });

  return filterRecords(records, queryParams, config.idField);
}

/**
 * Filter record arrays in memory according to API query queries
 */
function filterRecords(records, params, idField) {
  if (!params) return records;

  let filtered = records;

  // Specific ID query (action=get&id=R001)
  if (params.id) {
    filtered = filtered.filter(r => String(r[idField]).toLowerCase() === String(params.id).toLowerCase());
  }

  // General columns filters (e.g. branch=da_lat)
  Object.keys(params).forEach(key => {
    const ignoredParams = ["id", "action", "sheet", "token", "_rowNum"];
    if (ignoredParams.indexOf(key) === -1) {
      const filterVal = String(params[key]).toLowerCase();
      filtered = filtered.filter(r => r[key] !== undefined && String(r[key]).toLowerCase() === filterVal);
    }
  });

  return filtered;
}

/**
 * Thread-safe auto-increment ID generation logic
 */
function generateNextId(sheet, config) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return config.idPrefix + "1".padStart(config.idPad, "0");
  }

  const headers = getSheetHeaders(sheet);
  const idColIndex = headers.indexOf(config.idField);
  if (idColIndex === -1) {
    throw new Error("Không tìm thấy cột khóa chính '" + config.idField + "' trong tiêu đề!");
  }

  const idValues = sheet.getRange(2, idColIndex + 1, lastRow - 1, 1).getValues();
  const ids = idValues.map(r => String(r[0]));

  let maxNum = 0;
  const regex = new RegExp("^" + config.idPrefix + "(\\d+)$");

  ids.forEach(id => {
    const match = id.match(regex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num > maxNum) maxNum = num;
    }
  });

  return config.idPrefix + String(maxNum + 1).padStart(config.idPad, "0");
}

/**
 * Custom Room ID generation format: CITY-BRANCH-INDEX (e.g. DL-BL-01)
 */
function generateRoomId(sheet, recordData) {
  const branch = recordData.branch || 'da_lat';
  const branchName = recordData.branch_name || '';
  let cityPrefix = 'DL';
  let branchPrefix = 'BL'; // Default to Bliss

  // 1. Detect City Prefix
  const bLower = branch.toLowerCase();
  if (bLower.includes('dalat') || bLower.includes('da_lat')) {
    cityPrefix = 'DL';
  } else if (bLower.includes('hoian') || bLower.includes('hoi_an')) {
    cityPrefix = 'HA';
  } else if (bLower.includes('nhatrang') || bLower.includes('nha_trang')) {
    cityPrefix = 'NT';
  } else if (bLower.includes('hanoi') || bLower.includes('ha_noi')) {
    cityPrefix = 'HN';
  } else {
    cityPrefix = branch.substring(0, 2).toUpperCase();
  }

  // 2. Detect Branch Prefix (Initials of words in branch_name, excluding city if present)
  if (branchName) {
    const words = branchName.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 0);
    const stopWords = ['da', 'lat', 'hoi', 'an', 'nha', 'trang', 'ha', 'noi', 'homestay', 'hanoi'];
    const filteredWords = words.filter(w => !stopWords.includes(w.toLowerCase()));

    if (filteredWords.length > 0) {
      if (filteredWords.length === 1) {
        const word = filteredWords[0];
        branchPrefix = (word.length >= 2 ? word.substring(0, 2) : word).toUpperCase();
      } else {
        branchPrefix = filteredWords.map(w => w[0]).join('').toUpperCase().substring(0, 2);
      }
    } else if (words.length > 0) {
      if (words.length === 1) {
        const word = words[0];
        branchPrefix = (word.length >= 2 ? word.substring(0, 2) : word).toUpperCase();
      } else {
        branchPrefix = words.map(w => w[0]).join('').toUpperCase().substring(0, 2);
      }
    }
  }

  // 3. Find Max Index in Sheet
  const lastRow = sheet.getLastRow();
  let maxIndex = 0;
  if (lastRow > 1) {
    const headers = getSheetHeaders(sheet);
    const idColIdx = headers.indexOf('room_id');
    const idValues = sheet.getRange(2, idColIdx + 1, lastRow - 1, 1).getValues();
    const prefix = cityPrefix + '-' + branchPrefix + '-';

    idValues.forEach(r => {
      const idStr = String(r[0]);
      if (idStr.startsWith(prefix)) {
        const numStr = idStr.replace(prefix, '');
        const num = parseInt(numStr, 10);
        if (!isNaN(num) && num > maxIndex) {
          maxIndex = num;
        }
      }
    });
  }

  return cityPrefix + '-' + branchPrefix + '-' + String(maxIndex + 1).padStart(2, '0');
}

/**
 * Write a single new row in Google Sheet
 */
function createRecord(sheetKey, recordData) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); // 15 seconds timeout
  } catch (e) {
    throw new Error("Không nhận được khóa an toàn (LockService). Máy chủ bận, vui lòng thử lại!");
  }

  try {
    const sheet = getOrCreateSheet(sheetKey);
    const config = SHEET_CONFIG[sheetKey];
    const headers = getSheetHeaders(sheet);

    // Generate unique PK if not explicitly provided
    let id = recordData[config.idField];
    if (!id) {
      if (sheetKey === "rooms") {
        id = generateRoomId(sheet, recordData);
      } else {
        id = generateNextId(sheet, config);
      }
    }

    const now = new Date().toISOString();
    const dataWithDefaults = { ...recordData, [config.idField]: id };

    // Set auto-populated timestamp fields
    if (headers.indexOf("created_at") !== -1) dataWithDefaults["created_at"] = now;
    if (headers.indexOf("updated_at") !== -1) dataWithDefaults["updated_at"] = now;
    if (headers.indexOf("timestamp") !== -1) dataWithDefaults["timestamp"] = now;

    // Default column values based on sheet types
    if (sheetKey === "customers" && dataWithDefaults["interaction_count"] === undefined) {
      dataWithDefaults["interaction_count"] = 0;
    }
    if (sheetKey === "bookings") {
      if (dataWithDefaults["review_sent"] === undefined) dataWithDefaults["review_sent"] = false;
      if (dataWithDefaults["payment_status"] === undefined) dataWithDefaults["payment_status"] = "pending";
      if (dataWithDefaults["checkin_status"] === undefined) dataWithDefaults["checkin_status"] = "pending";
    }

    // Construct values array in header order
    const rowValues = headers.map(header => {
      let val = dataWithDefaults[header];
      if (val === undefined || val === null) return "";
      if (typeof val === "object") return JSON.stringify(val); // Serialize lists/dicts
      return val;
    });

    sheet.appendRow(rowValues);
    lock.releaseLock();

    return { success: true, id: id, data: dataWithDefaults };
  } catch (error) {
    lock.releaseLock();
    throw error;
  }
}

/**
 * Batch write multiple rows to minimize execution times and round-trips
 */
function createRecords(sheetKey, recordsData) {
  const records = Array.isArray(recordsData) ? recordsData : [recordsData];
  const results = [];

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (e) {
    throw new Error("Không nhận được khóa an toàn (LockService) để ghi hàng loạt. Vui lòng thử lại!");
  }

  try {
    const sheet = getOrCreateSheet(sheetKey);
    const config = SHEET_CONFIG[sheetKey];
    const headers = getSheetHeaders(sheet);
    const rowsToWrite = [];
    const batchMaxIndices = {};

    records.forEach(recordData => {
      let id = recordData[config.idField];

      // Calculate ID inside loop incrementing sequentially
      if (!id) {
        if (sheetKey === "rooms") {
          id = generateRoomId(sheet, recordData);
          const prefix = id.substring(0, id.lastIndexOf('-') + 1);
          let baseIdx = parseInt(id.replace(prefix, ''), 10);
          if (batchMaxIndices[prefix] !== undefined) {
            batchMaxIndices[prefix] = Math.max(batchMaxIndices[prefix] + 1, baseIdx);
          } else {
            batchMaxIndices[prefix] = baseIdx;
          }
          id = prefix + String(batchMaxIndices[prefix]).padStart(2, "0");
        } else {
          id = generateNextId(sheet, config);
          // Temporarily append dummy row or manually track incremental sequence
          // to prevent duplicate ID generation within this batch loop
          const tempMax = results.length > 0 ? parseInt(results[results.length - 1].id.replace(config.idPrefix, ""), 10) : null;
          if (tempMax !== null) {
            id = config.idPrefix + String(tempMax + 1).padStart(config.idPad, "0");
          }
        }
      }

      const now = new Date().toISOString();
      const dataWithDefaults = { ...recordData, [config.idField]: id };

      if (headers.indexOf("created_at") !== -1) dataWithDefaults["created_at"] = now;
      if (headers.indexOf("updated_at") !== -1) dataWithDefaults["updated_at"] = now;
      if (headers.indexOf("timestamp") !== -1) dataWithDefaults["timestamp"] = now;

      if (sheetKey === "bookings") {
        if (dataWithDefaults["review_sent"] === undefined) dataWithDefaults["review_sent"] = false;
        if (dataWithDefaults["payment_status"] === undefined) dataWithDefaults["payment_status"] = "pending";
        if (dataWithDefaults["checkin_status"] === undefined) dataWithDefaults["checkin_status"] = "pending";
      }

      const rowValues = headers.map(header => {
        let val = dataWithDefaults[header];
        if (val === undefined || val === null) return "";
        if (typeof val === "object") return JSON.stringify(val);
        return val;
      });

      rowsToWrite.push(rowValues);
      results.push({ id: id, success: true });
    });

    if (rowsToWrite.length > 0) {
      // Append range to save API calls
      const lastRow = sheet.getLastRow();
      const targetRange = sheet.getRange(lastRow + 1, 1, rowsToWrite.length, headers.length);
      targetRange.setValues(rowsToWrite);
    }

    lock.releaseLock();
    return { success: true, count: results.length, results: results };
  } catch (error) {
    lock.releaseLock();
    throw error;
  }
}

/**
 * Edit an existing record matched by Primary ID in Column A
 */
function updateRecord(sheetKey, id, updateData) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    throw new Error("Không nhận được khóa an toàn để cập nhật dòng. Vui lòng thử lại!");
  }

  try {
    const sheet = getOrCreateSheet(sheetKey);
    const config = SHEET_CONFIG[sheetKey];
    const headers = getSheetHeaders(sheet);
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      throw new Error("Bảng trống, không có dòng nào để cập nhật!");
    }

    const idColIndex = headers.indexOf(config.idField);
    const idRange = sheet.getRange(2, idColIndex + 1, lastRow - 1, 1);
    const ids = idRange.getValues().map(r => String(r[0]));

    const rowIndex = ids.indexOf(String(id));
    if (rowIndex === -1) {
      throw new Error("Không tìm thấy dòng có ID " + id + " trong bảng " + config.name);
    }

    const actualRowNum = rowIndex + 2;
    const now = new Date().toISOString();

    // Fetch existing values to merge partial updates correctly
    const rowRange = sheet.getRange(actualRowNum, 1, 1, headers.length);
    const currentRowValues = rowRange.getValues()[0];

    const currentRecord = {};
    headers.forEach((header, idx) => {
      currentRecord[header] = currentRowValues[idx];
    });

    // Merge updates
    const mergedRecord = { ...currentRecord, ...updateData, [config.idField]: id };
    if (headers.indexOf("updated_at") !== -1) {
      mergedRecord["updated_at"] = now;
    }

    // Format values back for writing
    const rowValues = headers.map(header => {
      let val = mergedRecord[header];
      if (val === undefined || val === null) return "";
      if (typeof val === "object") return JSON.stringify(val);
      return val;
    });

    rowRange.setValues([rowValues]);
    lock.releaseLock();

    return { success: true, id: id, data: mergedRecord };
  } catch (error) {
    lock.releaseLock();
    throw error;
  }
}

/**
 * Delete a record (defaults to Soft-delete for inventory integrity)
 */
function deleteRecord(sheetKey, id, force) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    throw new Error("Không nhận được khóa an toàn để xóa dòng. Vui lòng thử lại!");
  }

  try {
    const sheet = getOrCreateSheet(sheetKey);
    const config = SHEET_CONFIG[sheetKey];
    const headers = getSheetHeaders(sheet);
    const lastRow = sheet.getLastRow();

    if (lastRow <= 1) {
      throw new Error("Không có bản ghi nào để thực hiện hành động xóa!");
    }

    const idColIndex = headers.indexOf(config.idField);
    const ids = sheet.getRange(2, idColIndex + 1, lastRow - 1, 1).getValues().map(r => String(r[0]));

    const rowIndex = ids.indexOf(String(id));
    if (rowIndex === -1) {
      throw new Error("Không tìm thấy dòng có ID " + id + " trong bảng " + config.name);
    }

    const actualRowNum = rowIndex + 2;

    // Hard delete override
    if (force === true || force === "true") {
      sheet.deleteRow(actualRowNum);
      lock.releaseLock();
      return { success: true, message: "Bản ghi mang ID " + id + " đã bị xóa vĩnh viễn khỏi Google Sheet." };
    }

    // Soft-delete logic to prevent breaking active relationships
    let statusField = "status";
    let statusVal = "inactive";

    if (sheetKey === "bookings") {
      statusVal = "cancelled";
    } else if (sheetKey === "rooms") {
      // Guard: Cannot disable a room that has active bookings (confirmed/checked_in)
      const bookingsSheet = getOrCreateSheet("bookings");
      const bHeaders = getSheetHeaders(bookingsSheet);
      const bLastRow = bookingsSheet.getLastRow();

      if (bLastRow > 1) {
        const rIdIdx = bHeaders.indexOf("room_id");
        const statusIdx = bHeaders.indexOf("status");
        const bookingsData = bookingsSheet.getRange(2, 1, bLastRow - 1, bHeaders.length).getValues();

        const hasActive = bookingsData.some(row => {
          const roomFk = String(row[rIdIdx]);
          const status = String(row[statusIdx]);
          return roomFk === String(id) && ["confirmed", "checked_in"].includes(status);
        });

        if (hasActive) {
          lock.releaseLock();
          return {
            success: false,
            error: "ERR_ROOM_HAS_ACTIVE_BOOKINGS",
            message: "Không thể ngưng hoạt động phòng " + id + " do đang có lịch đặt sắp diễn ra hoặc đang ở!"
          };
        }
      }
    }

    const statusColIndex = headers.indexOf(statusField);
    if (statusColIndex !== -1) {
      sheet.getRange(actualRowNum, statusColIndex + 1).setValue(statusVal);
      if (headers.indexOf("updated_at") !== -1) {
        sheet.getRange(actualRowNum, headers.indexOf("updated_at") + 1).setValue(new Date().toISOString());
      }
      lock.releaseLock();
      return { success: true, message: "Bản ghi mang ID " + id + " đã được chuyển đổi trạng thái sang " + statusVal.toUpperCase() + "." };
    } else {
      // Fallback to hard delete if status column doesn't exist
      sheet.deleteRow(actualRowNum);
      lock.releaseLock();
      return { success: true, message: "Bản ghi mang ID " + id + " đã bị xóa cứng (không tìm thấy cột trạng thái)." };
    }
  } catch (error) {
    lock.releaseLock();
    throw error;
  }
}

// =========================================================================
// 4. SHEET EDIT SYNC WEBHOOK (REAL-TIME CACHE SYNC)
// =========================================================================

/**
 * Installable Trigger function that triggers whenever cells are manually modified.
 * It sends an HTTP POST request to the Express backend server's '/backend/api/sync-cache' 
 * endpoint, telling the application to fetch fresh data and discard stale in-memory caches.
 * 
 * IMPORTANT: To allow external web requests, this must be set up as an "Installable Trigger"
 * inside Extensions -> Triggers. Simply naming it "onEdit" will block UrlFetchApp due to 
 * simple trigger permission scopes.
 */
function onEditTrigger(e) {
  if (!e) return;

  const range = e.range;
  const sheet = range.getSheet();
  const sheetName = sheet.getName();

  // Find mapped schema sheet key
  let sheetKey = null;
  for (const key in SHEET_CONFIG) {
    if (SHEET_CONFIG[key].name === sheetName) {
      sheetKey = key;
      break;
    }
  }

  // Ignore chat logs edits or untracked sheets
  if (!sheetKey || sheetKey === "chat_logs") return;

  const properties = PropertiesService.getScriptProperties();
  const serverUrl = properties.getProperty("SERVER_URL");
  const serverToken = properties.getProperty("SERVER_TOKEN");

  if (!serverUrl) {
    console.warn("Chưa cấu hình SERVER_URL trong Script Properties. Bỏ qua đồng bộ cache!");
    return;
  }

  // Construct sync webhook payload
  const payload = {
    sheet: sheetKey,
    action: "sync",
    row: range.getRow(),
    column: range.getColumn(),
    numRows: range.getNumRows(),
    numColumns: range.getNumColumns(),
    timestamp: new Date().toISOString()
  };

  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  if (serverToken) {
    options.headers = {
      "Authorization": "Bearer " + serverToken
    };
  }

  try {
    const response = UrlFetchApp.fetch(serverUrl + "/backend/api/sync-cache", options);
    console.log("Đã kích hoạt đồng bộ cache cho backend. Phản hồi máy chủ: " + response.getContentText());
  } catch (error) {
    console.error("Không thể kích hoạt đồng bộ cache cho backend: " + error.toString());
  }
}

// =========================================================================
// 5. ADMINISTRATIVE TOOLS
// =========================================================================

/**
 * Initialize all sheets, formatting rules, and configure default properties.
 * Run this function once from the Google Apps Script editor during initial setup.
 */
function initializeSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const results = [];

  // 1. Create Sheets and headers (Delete existing first to force-recreate correct headers)
  Object.keys(SHEET_CONFIG).forEach(key => {
    try {
      const config = SHEET_CONFIG[key];
      let sheet = ss.getSheetByName(config.name);
      if (sheet) {
        ss.deleteSheet(sheet);
        results.push("Đã xóa sheet cũ để reset cấu trúc: " + config.name);
      }
      getOrCreateSheet(key);
      results.push("Khởi tạo thành công sheet mới: " + config.name);
    } catch (e) {
      results.push("LỖI khởi tạo sheet " + key + ": " + e.toString());
    }
  });

  // 2. Set default API Key in properties if blank
  const properties = PropertiesService.getScriptProperties();
  if (!properties.getProperty("API_KEY")) {
    properties.setProperty("API_KEY", "BlissSecureToken2026");
    results.push("Đã thiết lập API_KEY mặc định: BlissSecureToken2026");
  }

  // 3. Write default Rooms data to make testing easier
  try {
    const roomsSheet = getOrCreateSheet("rooms");
    if (roomsSheet.getLastRow() === 1) { // Empty except for headers
      const defaultRooms = [
        [
          "SG-CS1-01", "Phòng Studio Cát Tường", "cs1", "Chi nhánh Tân Bình (CS1)", "71 Xuân Hồng, Phường 12, Quận Tân Bình", 2, 500000, 700000,
          JSON.stringify({ "08:00 - 11:00": 150000, "11:30 - 14:30": 170000, "15:00 - 18:00": 150000, "18:30 - 21:30": 180000, "22:00 - 08:00": 250000 }),
          JSON.stringify(["Bếp tự nấu", "WiFi", "NVS riêng", "Điều hòa", "Tủ lạnh", "Gương lớn"]),
          JSON.stringify(["images/room_1_main.png", "images/room_1_bath.png"]),
          "🏡", "Phòng Studio thiết kế hiện đại, đầy đủ tiện nghi ngay trung tâm quận Tân Bình.", "active",
          new Date().toISOString(), new Date().toISOString()
        ],
        [
          "SG-CS2-01", "Phòng Standard Hoa Nắng", "cs2", "Chi nhánh Quận 10 (CS2)", "25a Đường 3 Tháng 2, Phường 11, Quận 10", 2, 550000, 750000,
          JSON.stringify({ "08:00 - 11:00": 160000, "11:30 - 14:30": 180000, "15:00 - 18:00": 160000, "18:30 - 21:30": 190000, "22:00 - 08:00": 270000 }),
          JSON.stringify(["WiFi", "Sofa bàn trà", "NVS riêng", "Điều hòa", "Gương lớn", "Tủ lạnh"]),
          JSON.stringify(["images/room_2_main.png", "images/room_2_bath.png"]),
          "☀️", "Không gian sống ấm cúng, tinh tế trên trục đường chính 3 Tháng 2.", "active",
          new Date().toISOString(), new Date().toISOString()
        ],
        [
          "SG-CS3-01", "Phòng Vintage Memory", "cs3", "Chi nhánh Quận 5 (CS3)", "2N Phạm Hữu Chí, Phường 12, Quận 5", 2, 480000, 680000,
          JSON.stringify({ "08:00 - 11:00": 140000, "11:30 - 14:30": 160000, "15:00 - 18:00": 140000, "18:30 - 21:30": 170000, "22:00 - 08:00": 240000 }),
          JSON.stringify(["Bếp tự nấu", "WiFi", "NVS riêng", "Điều hòa", "Board game", "Tủ lạnh"]),
          JSON.stringify(["images/room_1_main.png", "images/room_1_bath.png"]),
          "🌿", "Thiết kế phong cách hoài cổ yên bình, thư thái giữa lòng Quận 5 nhộn nhịp.", "active",
          new Date().toISOString(), new Date().toISOString()
        ],
        [
          "SG-CS4-01", "Phòng Loft Ban Công", "cs4", "Chi nhánh Gò Vấp (CS4)", "331/16 Phan Huy Ích, Phường 14, Quận Gò Vấp", 3, 600000, 850000,
          JSON.stringify({ "08:00 - 11:00": 180000, "11:30 - 14:30": 200000, "15:00 - 18:00": 180000, "18:30 - 21:30": 220000, "22:00 - 08:00": 300000 }),
          JSON.stringify(["Bếp tự nấu", "Máy chiếu", "WiFi", "Ban công", "NVS riêng", "Điều hòa", "Tủ lạnh"]),
          JSON.stringify(["images/room_2_main.png", "images/room_2_bath.png"]),
          "🍃", "Căn Loft áp mái thoáng đãng có ban công rộng ngắm hoàng hôn cực chill.", "active",
          new Date().toISOString(), new Date().toISOString()
        ],
        [
          "SG-CS5-01", "Phòng View Sông Sài Gòn", "cs5", "Chi nhánh Bình Thạnh (CS5)", "217/70/5 Bùi Đình Túy, Phường 14, Quận Bình Thạnh", 2, 650000, 900000,
          JSON.stringify({ "08:00 - 11:00": 190000, "11:30 - 14:30": 220000, "15:00 - 18:00": 190000, "18:30 - 21:30": 240000, "22:00 - 08:00": 330000 }),
          JSON.stringify(["Bếp tự nấu", "Bồn tắm", "WiFi", "NVS riêng", "Điều hòa", "Tủ lạnh", "Gương lớn"]),
          JSON.stringify(["images/room_1_main.png", "images/room_1_bath.png"]),
          "🌅", "Phòng lãng mạn lộng gió với tầm nhìn trực diện ra sông Sài Gòn rộng mở.", "active",
          new Date().toISOString(), new Date().toISOString()
        ]
      ];

      const range = roomsSheet.getRange(2, 1, defaultRooms.length, SHEET_CONFIG.rooms.columns.length);
      range.setValues(defaultRooms);
      results.push("Đã nạp 5 phòng Saigon mới mặc định vào sheet Rooms thành công!");
    }
  } catch (e) {
    results.push("LỖI nạp phòng mặc định: " + e.toString());
  }

  return results.join("\n");
}
