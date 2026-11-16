/**
 * Time to Elevate: RSVP sheet
 *
 * Paste this into Extensions → Apps Script of your Google Sheet, set SECRET,
 * then Deploy → New deployment → Web app (Execute as: Me, Who has access: Anyone).
 * Full steps are in README.md.
 *
 * Each RSVP becomes one row. If the same phone number RSVPs again, that row
 * is updated instead of adding a duplicate.
 */

const SECRET = 'CHANGE-ME-to-a-long-random-phrase'; // must match SHEETS_SECRET on Vercel
const SHEET_NAME = 'RSVPs';
const HEADERS = ['Received', 'Name', 'Phone', 'WhatsApp number', 'Last updated', 'Times submitted'];

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.secret !== SECRET) return json_({ ok: false, error: 'unauthorized' });

    const name = String(body.name || '').trim().slice(0, 80);
    const phone = String(body.phone || '').trim().slice(0, 24);
    const key = String(body.phoneKey || '').replace(/\D/g, '').slice(0, 15);
    if (name.length < 2 || key.length < 9) return json_({ ok: false, error: 'invalid' });

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const sheet = getSheet_();
      const now = new Date();
      const lastRow = sheet.getLastRow();

      if (lastRow > 1) {
        const keys = sheet.getRange(2, 4, lastRow - 1, 1).getDisplayValues();
        for (let i = 0; i < keys.length; i++) {
          if (String(keys[i][0]).replace(/\D/g, '') === key) {
            const row = i + 2;
            const times = Number(sheet.getRange(row, 6).getValue()) || 1;
            sheet.getRange(row, 2, 1, 5).setValues([[asText_(name), asText_(phone), asText_('+' + key), now, times + 1]]);
            return json_({ ok: true, updated: true });
          }
        }
      }
      sheet.appendRow([now, asText_(name), asText_(phone), asText_('+' + key), now, 1]);
      return json_({ ok: true, updated: false });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return json_({ ok: false, error: 'server_error' });
  }
}

// Visiting the web app URL in a browser shows this, which confirms the deployment works.
function doGet() {
  return json_({ ok: true, service: 'Time to Elevate RSVPs' });
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#24122b').setFontColor('#f7e3a8');
    sheet.setFrozenRows(1);
    sheet.getRange('A:A').setNumberFormat('ddd d mmm yyyy, h:mm am/pm');
    sheet.getRange('E:E').setNumberFormat('ddd d mmm yyyy, h:mm am/pm');
    sheet.setColumnWidths(1, HEADERS.length, 180);
  }
  return sheet;
}

// Stops Sheets from treating "+254…" as a formula or a number, and blocks formula injection.
function asText_(value) {
  return "'" + String(value);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
