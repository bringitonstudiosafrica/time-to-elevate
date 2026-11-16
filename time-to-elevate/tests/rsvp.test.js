// Run with: npm test
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import vm from "node:vm";
import handler, { phoneKey, validate } from "../api/rsvp.js";

/* ---------- a fake Google Sheet + Apps Script runtime ---------- */
function loadAppsScript() {
  const rows = [];
  const range = (r, c, nr = 1, nc = 1) => ({
    getDisplayValues: () => rows.slice(r - 1, r - 1 + nr).map((row) => row.slice(c - 1, c - 1 + nc).map((v) => String(v ?? "").replace(/^'/, ""))),
    getValue: () => rows[r - 1][c - 1],
    setValues: (vals) => { vals.forEach((vr, i) => vr.forEach((v, j) => { rows[r - 1 + i][c - 1 + j] = v; })); },
    setFontWeight() { return this; }, setBackground() { return this; }, setFontColor() { return this; }, setNumberFormat() { return this; }
  });
  const sheet = {
    getLastRow: () => rows.length,
    appendRow: (r) => rows.push([...r]),
    getRange: (a, b, c, d) => (typeof a === "string" ? range(1, 1) : range(a, b, c, d)),
    setFrozenRows() {}, setColumnWidths() {}
  };
  const ctx = {
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheetByName: () => sheet, insertSheet: () => sheet }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: (s) => ({ setMimeType: () => ({ body: s }) }) }
  };
  vm.createContext(ctx);
  const src = fs.readFileSync(new URL("../google-apps-script/Code.gs", import.meta.url), "utf8").replace("CHANGE-ME-to-a-long-random-phrase", "test-secret");
  vm.runInContext(src, ctx);
  const post = (obj) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(obj) } }).body);
  return { rows, post };
}

/* ---------- a local server that behaves like script.google.com ---------- */
let server, base, sheet, mode = "ok";
before(async () => {
  sheet = loadAppsScript();
  let pending = null;
  server = http.createServer((req, res) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => {
      if (mode === "html") { res.writeHead(200, { "Content-Type": "text/html" }); return res.end("<html>Sign in</html>"); }
      if (req.method === "POST" && req.url === "/exec") {
        pending = sheet.post(JSON.parse(data));          // Apps Script runs doPost…
        res.writeHead(302, { Location: base + "/echo" }); // …then redirects to the result
        return res.end();
      }
      if (req.method === "GET" && req.url === "/echo") {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end(JSON.stringify(pending));
      }
      res.writeHead(404); res.end();
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  base = "http://127.0.0.1:" + server.address().port;
  process.env.SHEETS_WEBHOOK_URL = base + "/exec";
  process.env.SHEETS_SECRET = "test-secret";
});
after(() => server.close());

function call(method, body) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 200, headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      status(c) { this.statusCode = c; return this; },
      json(o) { resolve({ status: this.statusCode, body: o, headers: this.headers }); return this; }
    };
    handler({ method, body }, res);
  });
}

/* ---------- tests ---------- */
test("phoneKey normalises Kenyan and international formats", () => {
  assert.equal(phoneKey("0712 345 678"), "254712345678");
  assert.equal(phoneKey("+254 712 345 678"), "254712345678");
  assert.equal(phoneKey("712345678"), "254712345678");
  assert.equal(phoneKey("0110 123 456"), "254110123456");
  assert.equal(phoneKey("00254712345678"), "254712345678");
  assert.equal(phoneKey("+44 7700 900123"), "447700900123");
});

test("validate rejects bad input", () => {
  assert.equal(validate({ name: "A", phone: "0712345678" }).error, "invalid_name");
  assert.equal(validate({ name: "Wanjiru", phone: "12345" }).error, "invalid_phone");
  assert.equal(validate({ name: "Wanjiru", phone: "0712abc678" }).error, "invalid_phone");
  assert.equal(validate({ name: "  Wanjiru   Mwangi ", phone: "0712 345 678" }).name, "Wanjiru Mwangi");
});

test("GET is not allowed", async () => {
  const r = await call("GET");
  assert.equal(r.status, 405);
  assert.equal(r.headers.Allow, "POST");
});

test("a new RSVP is written to the sheet", async () => {
  const r = await call("POST", { name: "Wanjiru Mwangi", phone: "0712 345 678" });
  assert.deepEqual(r.body, { ok: true, updated: false });
  assert.equal(sheet.rows.length, 2); // header + 1
  assert.equal(sheet.rows[1][1], "'Wanjiru Mwangi");
  assert.equal(sheet.rows[1][3], "'+254712345678");
});

test("the same phone number updates the row instead of duplicating", async () => {
  const r = await call("POST", JSON.stringify({ name: "Wanjiru M.", phone: "+254712345678" }));
  assert.deepEqual(r.body, { ok: true, updated: true });
  assert.equal(sheet.rows.length, 2);
  assert.equal(sheet.rows[1][1], "'Wanjiru M.");
  assert.equal(sheet.rows[1][5], 2);
});

test("a second guest gets their own row", async () => {
  const r = await call("POST", { name: "Otieno", phone: "0722000111" });
  assert.equal(r.body.ok, true);
  assert.equal(sheet.rows.length, 3);
});

test("formula injection is neutralised", async () => {
  await call("POST", { name: "=HYPERLINK(\"x\")", phone: "0733000222" });
  assert.ok(String(sheet.rows[3][1]).startsWith("'="));
});

test("spam trap returns ok without writing", async () => {
  const before = sheet.rows.length;
  const r = await call("POST", { name: "Bot", phone: "0712345678", website: "http://spam" });
  assert.equal(r.body.ok, true);
  assert.equal(sheet.rows.length, before);
});

test("invalid input returns 400 with a message", async () => {
  const r = await call("POST", { name: "", phone: "0712345678" });
  assert.equal(r.status, 400);
  assert.ok(r.body.message);
});

test("wrong secret is reported as a sheet error", async () => {
  process.env.SHEETS_SECRET = "wrong";
  const r = await call("POST", { name: "Kamau", phone: "0744000333" });
  process.env.SHEETS_SECRET = "test-secret";
  assert.equal(r.status, 502);
});

test("a non-JSON reply (wrong access setting) is reported as a sheet error", async () => {
  mode = "html";
  const r = await call("POST", { name: "Kamau", phone: "0744000333" });
  mode = "ok";
  assert.equal(r.status, 502);
});

test("missing configuration returns 503", async () => {
  const url = process.env.SHEETS_WEBHOOK_URL;
  delete process.env.SHEETS_WEBHOOK_URL;
  const r = await call("POST", { name: "Kamau", phone: "0744000333" });
  process.env.SHEETS_WEBHOOK_URL = url;
  assert.equal(r.status, 503);
});
