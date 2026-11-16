/* ============================================================
   Invitation page: countdown, clock, gold motes, WhatsApp, RSVP.
   ============================================================ */
(function () {
  "use strict";

  const C = window.INVITE;
  const $ = (s) => document.querySelector(s);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- helpers ---------- */
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } }
  };
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove("show"), 2200);
  }
  const waLink = (text) => "https://wa.me/" + C.whatsapp + (text ? "?text=" + encodeURIComponent(text) : "");

  /* Phone numbers: keep what the guest typed, and build a comparable digits-only key.
     Kenyan local formats (07…, 01…, 7…, 1…) are converted to 254…. */
  function phoneKey(raw) {
    let d = String(raw || "").replace(/\D/g, "");
    if (d.startsWith("00")) d = d.slice(2);
    if (d.length === 10 && d.startsWith("0")) d = "254" + d.slice(1);
    else if (d.length === 9 && /^[17]/.test(d)) d = "254" + d;
    return d;
  }

  /* ---------- WhatsApp + copy ---------- */
  document.querySelectorAll(".wa-display").forEach((el) => { el.textContent = C.whatsappDisplay; });
  $("#wa-extra").href = waLink(
    "Hi Ian! I got your invitation to your 30th on Friday 27 November. Could I please get an extra invitation for someone? Their name is: "
  );
  document.querySelectorAll(".copy-num").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.target);
      const selectIt = () => {
        const r = document.createRange();
        r.selectNodeContents(target);
        const s = window.getSelection();
        s.removeAllRanges();
        s.addRange(r);
        toast("Number selected");
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(C.whatsappDisplay).then(() => toast("Number copied"), selectIt);
      } else {
        selectIt();
      }
    });
  });

  /* ---------- Clock ticks ---------- */
  (function buildClock() {
    let html = "";
    for (let i = 0; i < 60; i++) {
      const a = (i * 6 - 90) * Math.PI / 180;
      const major = i % 5 === 0;
      const r1 = major ? 80 : 84, r2 = 88;
      html += '<line class="tick' + (major ? " major" : "") + '" x1="' + (100 + r1 * Math.cos(a)).toFixed(2) + '" y1="' + (100 + r1 * Math.sin(a)).toFixed(2) +
        '" x2="' + (100 + r2 * Math.cos(a)).toFixed(2) + '" y2="' + (100 + r2 * Math.sin(a)).toFixed(2) + '"/>';
    }
    for (let n = 1; n <= 12; n++) {
      const a = (n * 30 - 90) * Math.PI / 180;
      const on = n >= 7; // 7 to 12 are party hours
      html += '<text class="num' + (on ? " on" : "") + '" x="' + (100 + 68 * Math.cos(a)).toFixed(2) + '" y="' + (100 + 68 * Math.sin(a)).toFixed(2) + '">' + n + "</text>";
    }
    $("#ticks").innerHTML = html;
  })();

  /* ---------- Countdown ---------- */
  (function countdown() {
    const pad = (n) => String(n).padStart(2, "0");
    const els = { d: $("#cd-d"), h: $("#cd-h"), m: $("#cd-m"), s: $("#cd-s") };
    function tick() {
      const now = Date.now();
      let diff = C.startUTC - now;
      if (diff <= 0) {
        Object.values(els).forEach((el) => { el.textContent = "00"; });
        $("#cd-note").textContent = now < C.endUTC ? "The night has begun" : "Thank you for celebrating with me";
        return;
      }
      const d = Math.floor(diff / 864e5); diff -= d * 864e5;
      const h = Math.floor(diff / 36e5); diff -= h * 36e5;
      const m = Math.floor(diff / 6e4); diff -= m * 6e4;
      const s = Math.floor(diff / 1e3);
      els.d.textContent = pad(d); els.h.textContent = pad(h); els.m.textContent = pad(m); els.s.textContent = pad(s);
      setTimeout(tick, 1000 - (Date.now() % 1000));
    }
    tick();
  })();

  /* ---------- Rising gold motes ---------- */
  (function motes() {
    const c = $("#motes");
    const ctx = c.getContext("2d");
    if (!ctx) return;
    let w = 0, h = 0, dpr = 1;
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = c.width = Math.round(window.innerWidth * dpr);
      h = c.height = Math.round(window.innerHeight * dpr);
    }
    size();
    window.addEventListener("resize", size);
    const N = window.innerWidth < 600 ? 34 : 70;
    const P = Array.from({ length: N }, () => ({
      x: Math.random(), y: Math.random(), r: Math.random() * 1.6 + .4,
      v: Math.random() * .00025 + .00008, p: Math.random() * 6.28
    }));
    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      for (const p of P) {
        if (!reduced) {
          p.y -= p.v;
          if (p.y < -.02) { p.y = 1.02; p.x = Math.random(); }
        }
        const tw = .35 + .65 * Math.abs(Math.sin(t * .0008 + p.p));
        const px = (p.x + Math.sin(t * .0002 + p.p) * .01) * w, py = p.y * h, r = p.r * dpr * 4;
        const g = ctx.createRadialGradient(px, py, 0, px, py, r);
        g.addColorStop(0, "rgba(247,227,168," + (.7 * tw) + ")");
        g.addColorStop(1, "rgba(216,178,106,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, 6.283);
        ctx.fill();
      }
      if (!reduced && !document.hidden) requestAnimationFrame(draw);
    }
    document.addEventListener("visibilitychange", () => { if (!document.hidden && !reduced) requestAnimationFrame(draw); });
    requestAnimationFrame(draw);
  })();

  /* ---------- RSVP ---------- */
  const form = $("#rsvp-form"), done = $("#done"), err = $("#err");
  const nameEl = $("#g-name"), phoneEl = $("#g-phone"), submitBtn = $("#submit");
  const STORE_KEY = "tte-rsvp";

  function rsvpMessage(r) {
    return "Hi Ian! I'd love to celebrate your 30th with you.\n\nName: " + r.name + "\nPhone: " + r.phone +
      "\n\nFriday 27 November 2026, 7 PM till midnight. I'll be on time!";
  }

  function showDone(r) {
    $("#t-name").textContent = r.name;
    $("#t-phone").textContent = r.phone;
    const wa = $("#wa-rsvp"), status = $("#status");
    wa.href = waLink(rsvpMessage(r));
    if (r.saved) {
      status.classList.remove("warn");
      $("#status-text").textContent = "You're on the guest list. Ian will send you the venue on WhatsApp before the night.";
      $("#wa-rsvp-label").textContent = "Message Ian on WhatsApp";
      wa.classList.remove("btn-gold");
    } else {
      status.classList.add("warn");
      $("#status-text").textContent = "We couldn't add you to the guest list online. Send your RSVP to Ian on WhatsApp instead, and he'll reply with the venue.";
      $("#wa-rsvp-label").textContent = "Send RSVP on WhatsApp";
      wa.classList.add("btn-gold");
    }
    form.hidden = true;
    done.hidden = false;
  }

  const previous = store.get(STORE_KEY);
  if (previous && previous.name && previous.phone) showDone(previous);

  $("#edit").addEventListener("click", () => {
    const p = store.get(STORE_KEY) || {};
    nameEl.value = p.name || "";
    phoneEl.value = p.phone || "";
    done.hidden = true;
    form.hidden = false;
    nameEl.focus();
  });

  function fieldError(el, message) {
    el.setAttribute("aria-invalid", "true");
    err.textContent = message;
    el.focus();
  }

  async function sendToSheet(payload) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(C.rsvpEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal
      });
      const data = await res.json().catch(() => null);
      return { ok: res.ok && !!(data && data.ok), status: res.status, data };
    } catch (e) {
      return { ok: false, status: 0, data: null };
    } finally {
      clearTimeout(timer);
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = nameEl.value.trim().replace(/\s+/g, " ");
    const phone = phoneEl.value.trim().replace(/\s+/g, " ");
    const key = phoneKey(phone);
    nameEl.removeAttribute("aria-invalid");
    phoneEl.removeAttribute("aria-invalid");
    err.textContent = "";

    if (name.length < 2) return fieldError(nameEl, "Please enter your name.");
    if (!/^[+\d\s().-]+$/.test(phone) || key.length < 9 || key.length > 15) {
      return fieldError(phoneEl, "Please enter a valid phone number, for example 0712 345 678 or +254 712 345 678.");
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Reserving…";
    const result = await sendToSheet({ name, phone, website: $("#g-website").value });
    submitBtn.disabled = false;
    submitBtn.textContent = "Reserve my seat";

    if (result.status === 400 && result.data && result.data.error) {
      err.textContent = result.data.message || "Please check your details and try again.";
      return;
    }
    const r = { name, phone, saved: result.ok };
    store.set(STORE_KEY, r);
    showDone(r);
  });

  window.InvitePage = { phoneKey };
})();
