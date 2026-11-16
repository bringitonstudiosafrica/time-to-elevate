/**
 * POST /api/rsvp
 * Validates an RSVP and forwards it to the Google Apps Script web app that
 * writes it into the Google Sheet. The script URL and shared secret stay on
 * the server (Vercel environment variables), never in the browser.
 *
 * Environment variables (Vercel → Project → Settings → Environment Variables):
 *   SHEETS_WEBHOOK_URL  the Apps Script web app URL (ends in /exec)
 *   SHEETS_SECRET       the same secret you set in google-apps-script/Code.gs
 */

const MAX_BODY = 4 * 1024;

export function cleanText(value, max) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/** Digits-only key used to spot repeat RSVPs. Kenyan local formats become 254…. */
export function phoneKey(raw) {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 10 && d.startsWith("0")) d = "254" + d.slice(1);
  else if (d.length === 9 && /^[17]/.test(d)) d = "254" + d;
  return d;
}

export function validate(body) {
  const name = cleanText(body.name, 80);
  const phone = cleanText(body.phone, 24);
  const key = phoneKey(phone);
  if (name.length < 2) return { error: "invalid_name", message: "Please enter your name." };
  if (!/^[+\d\s().-]+$/.test(phone) || key.length < 9 || key.length > 15) {
    return { error: "invalid_phone", message: "Please enter a valid phone number, for example 0712 345 678." };
  }
  return { name, phone, key };
}

function parseBody(req) {
  const b = req.body;
  if (b && typeof b === "object" && !Buffer.isBuffer(b)) return b;
  const text = Buffer.isBuffer(b) ? b.toString("utf8") : typeof b === "string" ? b : "";
  if (text.length > MAX_BODY) return null;
  try { return JSON.parse(text || "{}"); } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  const body = parseBody(req);
  if (!body || typeof body !== "object") {
    return res.status(400).json({ ok: false, error: "bad_request", message: "Please check your details and try again." });
  }

  // Spam trap: real guests never fill the hidden "website" field.
  if (cleanText(body.website, 200)) return res.status(200).json({ ok: true });

  const v = validate(body);
  if (v.error) return res.status(400).json({ ok: false, error: v.error, message: v.message });

  const url = process.env.SHEETS_WEBHOOK_URL;
  const secret = process.env.SHEETS_SECRET;
  if (!url || !secret) {
    console.error("RSVP: SHEETS_WEBHOOK_URL or SHEETS_SECRET is not set");
    return res.status(503).json({ ok: false, error: "not_configured" });
  }

  try {
    // Apps Script answers a POST with a redirect to the result; fetch follows it.
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, name: v.name, phone: v.phone, phoneKey: v.key }),
      redirect: "follow",
      signal: AbortSignal.timeout(12000)
    });
    const text = await upstream.text();
    let data = null;
    try { data = JSON.parse(text); } catch { /* not JSON: usually a wrong URL or access setting */ }

    if (!upstream.ok || !data || data.ok !== true) {
      console.error("RSVP: sheet rejected the write", upstream.status, text.slice(0, 300));
      return res.status(502).json({ ok: false, error: "sheet_error" });
    }
    return res.status(200).json({ ok: true, updated: Boolean(data.updated) });
  } catch (err) {
    console.error("RSVP: could not reach the sheet", err && err.message);
    return res.status(502).json({ ok: false, error: "sheet_unreachable" });
  }
}
