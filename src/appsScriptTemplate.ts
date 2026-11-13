export const APPS_SCRIPT_SPREADSHEET_ID = '1QaxFBlOUpkGU2ZraBCcUooFmgXVV4vVuN4WdionZUKk';

export const APPS_SCRIPT_CODE = `/**
 * Google Apps Script Web App for Two-Way Sync
 * Thoothukudi District - Potential Dropout Dashboard
 * Target Spreadsheet ID: 1QaxFBlOUpkGU2ZraBCcUooFmgXVV4vVuN4WdionZUKk
 *
 * SETUP INSTRUCTIONS:
 * 1. Open Google Sheet: https://docs.google.com/spreadsheets/d/1QaxFBlOUpkGU2ZraBCcUooFmgXVV4vVuN4WdionZUKk/edit
 * 2. Go to Extensions -> Apps Script
 * 3. Delete any existing code in Code.gs and paste this entire script.
 * 4. Click Save (Ctrl+S).
 * 5. Click Deploy -> New deployment
 *    - Select type: Web app
 *    - Description: Dashboard Sync v1
 *    - Execute as: Me (your Google account with edit access to the sheet)
 *    - Who has access: Anyone
 * 6. Click Deploy, authorize permissions, and copy the "Web app URL".
 * 7. Paste that Web app URL into the Dashboard's "Sheet Sync Setup" modal (or Vercel env var GOOGLE_APPS_SCRIPT_URL).
 */

var SPREADSHEET_ID = '1QaxFBlOUpkGU2ZraBCcUooFmgXVV4vVuN4WdionZUKk';

var FIELD_CONFIG = {
  dropoutReason: {
    headers: ['dropout reason', 'reason for dropout'],
    fallbackCol: 17 // Col Q
  },
  transferRequestDept: {
    headers: ['request to transfer department', 'request to transfer', 'transfer department', 'transfer to department', 'transfer dept', 'request to change cases'],
    fallbackCol: 18 // Col R
  },
  counsellingRequired: {
    headers: ['counselling required', 'counsellingrequired', 'counselling needed'],
    fallbackCol: 19 // Col S
  },
  counsellingBy: {
    headers: ['counselling by', 'counselled by'],
    fallbackCol: 20 // Col T
  },
  counsellorName: {
    headers: ['counsellor name', 'counselor name', 'counsellor', 'counselor'],
    fallbackCol: 21 // Col U
  },
  counsellingDate: {
    headers: ['counselling given date', 'counselling date', 'counseling date', 'date of counselling', 'given date'],
    fallbackCol: 22 // Col V
  },
  status: {
    headers: ['present status', 'status', 'current status'],
    fallbackCol: 23 // Col W
  },
  brteRemarks: {
    headers: ['brte / hm remarks ( case study)', 'brte / hm remarks (case study)', 'brte / hm remarks', 'brte remarks', 'case study', 'hm remarks'],
    fallbackCol: 24 // Col X
  },
  deptRemarks: {
    headers: ['department / counsellors remarks', 'department remarks', 'counsellors remarks', 'counsellor remarks'],
    fallbackCol: 25 // Col Y
  }
};

function doGet(e) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheets = ss.getSheets().map(function (s) {
      return { name: s.getName(), gid: s.getSheetId(), rows: s.getLastRow() };
    });

    return jsonResponse({
      ok: true,
      status: 'connected',
      spreadsheetId: SPREADSHEET_ID,
      spreadsheetName: ss.getName(),
      sheets: sheets,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return jsonResponse({
      ok: false,
      error: err && err.message ? err.message : String(err)
    });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);

    var rawBody = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
    var payload = JSON.parse(rawBody);

    var updates = Array.isArray(payload.updates) ? payload.updates : [payload];
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var results = [];

    for (var u = 0; u < updates.length; u++) {
      var item = updates[u];
      var res = applySingleUpdate(ss, item);
      results.push(res);
    }

    SpreadsheetApp.flush();

    var allSucceeded = results.every(function (r) { return r.success; });
    return jsonResponse({
      success: allSucceeded,
      updatedCount: results.filter(function (r) { return r.success; }).length,
      results: results,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err && err.message ? err.message : String(err)
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (ignore) {}
  }
}

function applySingleUpdate(ss, item) {
  var month = String(item.month || '').trim();
  var sheet = findMonthSheet(ss, month);
  if (!sheet) {
    return { success: false, error: 'Sheet tab not found for month: ' + month };
  }

  var lastRow = sheet.getLastRow();
  var lastCol = Math.max(sheet.getLastColumn(), 25);
  if (lastRow < 2) {
    return { success: false, error: 'Sheet "' + sheet.getName() + '" has no student data rows.' };
  }

  var headerValues = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var emisCol = findColumnIndex(headerValues, ['emis_id', 'emis id', 'emis number', 'emis'], 8);
  var nameCol = findColumnIndex(headerValues, ['student name', 'name of the student', 'student_name'], 6);
  var sNoCol = findColumnIndex(headerValues, ['s.no', 'sno', 'sl.no', 'tracker s.no', 'potential dropout tracker s.no'], 1);

  var targetEmis = normalizeId(item.emisId);
  var targetName = String(item.studentName || '').trim().toLowerCase();
  var targetSNo = String(item.sNo || '').trim();

  var dataRange = sheet.getRange(2, 1, lastRow - 1, Math.max(emisCol, nameCol, sNoCol)).getValues();
  var matchedRow = -1;

  // 1. Primary match: EMIS ID
  if (targetEmis) {
    for (var r = 0; r < dataRange.length; r++) {
      var rowEmis = normalizeId(dataRange[r][emisCol - 1]);
      if (rowEmis && rowEmis === targetEmis) {
        matchedRow = r + 2;
        break;
      }
    }
  }

  // 2. Fallback match: Student Name (+ S.No)
  if (matchedRow === -1 && targetName) {
    for (var r2 = 0; r2 < dataRange.length; r2++) {
      var rowName = String(dataRange[r2][nameCol - 1] || '').trim().toLowerCase();
      var rowSNo = String(dataRange[r2][sNoCol - 1] || '').trim();
      if (rowName === targetName && (!targetSNo || rowSNo === targetSNo)) {
        matchedRow = r2 + 2;
        break;
      }
    }
  }

  if (matchedRow === -1) {
    return {
      success: false,
      error: 'Student not found in "' + sheet.getName() + '" (EMIS: ' + targetEmis + ', Name: ' + item.studentName + ')'
    };
  }

  var fieldsToUpdate = {};
  if (item.field) {
    fieldsToUpdate[item.field] = item.value !== undefined ? item.value : '';
  }
  if (item.fields && typeof item.fields === 'object') {
    for (var k in item.fields) {
      if (Object.prototype.hasOwnProperty.call(item.fields, k)) {
        fieldsToUpdate[k] = item.fields[k];
      }
    }
  }

  var updatedColumns = [];
  for (var fieldKey in fieldsToUpdate) {
    if (!Object.prototype.hasOwnProperty.call(fieldsToUpdate, fieldKey)) continue;
    var cfg = FIELD_CONFIG[fieldKey];
    if (!cfg) continue;

    var colIdx = findColumnIndex(headerValues, cfg.headers, cfg.fallbackCol);
    var newVal = fieldsToUpdate[fieldKey] === null || fieldsToUpdate[fieldKey] === undefined
      ? ''
      : String(fieldsToUpdate[fieldKey]);

    sheet.getRange(matchedRow, colIdx).setValue(newVal);
    updatedColumns.push({
      field: fieldKey,
      column: colIdx,
      row: matchedRow,
      value: newVal
    });
  }

  return {
    success: true,
    sheet: sheet.getName(),
    row: matchedRow,
    emisId: targetEmis,
    studentName: item.studentName || '',
    updatedColumns: updatedColumns
  };
}

function findMonthSheet(ss, monthStr) {
  var sheets = ss.getSheets();
  var cleanTarget = monthStr.toLowerCase().trim();

  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().toLowerCase().trim() === cleanTarget) {
      return sheets[i];
    }
  }

  var monthTokens = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  var matchedToken = '';
  for (var m = 0; m < monthTokens.length; m++) {
    if (cleanTarget.indexOf(monthTokens[m]) !== -1) {
      matchedToken = monthTokens[m];
      break;
    }
  }

  if (matchedToken) {
    for (var j = 0; j < sheets.length; j++) {
      var sName = sheets[j].getName().toLowerCase();
      if (sName.indexOf(matchedToken) !== -1) {
        return sheets[j];
      }
    }
  }

  return null;
}

function findColumnIndex(headers, expectedNames, fallbackCol) {
  for (var c = 0; c < headers.length; c++) {
    var h = String(headers[c] || '').replace(/\\s+/g, ' ').trim().toLowerCase();
    for (var e = 0; e < expectedNames.length; e++) {
      if (h === expectedNames[e].toLowerCase()) {
        return c + 1;
      }
    }
  }
  for (var c2 = 0; c2 < headers.length; c2++) {
    var h2 = String(headers[c2] || '').replace(/\\s+/g, ' ').trim().toLowerCase();
    for (var e2 = 0; e2 < expectedNames.length; e2++) {
      if (h2.indexOf(expectedNames[e2].toLowerCase()) !== -1) {
        return c2 + 1;
      }
    }
  }
  return fallbackCol;
}

function normalizeId(val) {
  if (val === null || val === undefined) return '';
  var str = String(val).trim();
  if (/^\\d+\\.0+$/.test(str)) {
    str = str.replace(/\\.0+$/, '');
  }
  return str;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}`;
