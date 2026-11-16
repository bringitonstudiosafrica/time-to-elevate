/* ============================================================
   Event details: edit here, everything else reads from this.
   ============================================================ */
window.INVITE = Object.freeze({
  host: "Ian Kanyi",
  hostFirst: "Ian",
  age: 30,
  theme: "Time to Elevate",

  // WhatsApp: digits only with country code (used in wa.me links), and the display version.
  whatsapp: "254740085764",
  whatsappDisplay: "+254 740 085 764",

  // 27 Nov 2026, 7:00 PM to midnight, Nairobi time (EAT = UTC+3).
  // Stored in UTC so the countdown is right for guests in any time zone.
  startUTC: Date.UTC(2026, 10, 27, 16, 0, 0),
  endUTC: Date.UTC(2026, 10, 27, 21, 0, 0),

  // Serverless function that writes RSVPs to the Google Sheet (see README.md).
  rsvpEndpoint: "/api/rsvp",

  // Riddle
  riddleAnswers: ["age", "ages"]
});
