/* ============================================================
   Flow: riddle → 3D folder → invitation page.
   ============================================================ */
(function () {
  "use strict";

  const C = window.INVITE;
  const $ = (s) => document.querySelector(s);
  const SOLVED_KEY = "tte-riddle-solved";

  const riddle = $("#riddle"), intro = $("#intro");
  const form = $("#riddle-form"), input = $("#answer");
  const msg = $("#riddle-msg"), count = $("#riddle-count"), tiles = $("#tiles"), cont = $("#riddle-continue");

  const remember = () => { try { localStorage.setItem(SOLVED_KEY, "1"); } catch (e) { /* ignore */ } };
  const solvedBefore = () => { try { return localStorage.getItem(SOLVED_KEY) === "1"; } catch (e) { return false; } };

  // Start building the 3D scene right away, while the guest thinks.
  const introReady = window.Intro ? window.Intro.prepare().catch(() => null) : Promise.resolve(null);

  /* ---------- Reveal the page ---------- */
  let revealed = false;
  function revealPage(controller) {
    if (revealed) return;
    revealed = true;
    document.body.classList.remove("locked");
    document.body.classList.add("revealing");
    intro.classList.add("gone");
    riddle.classList.add("gone");
    setTimeout(() => {
      if (controller) controller.dispose();
      intro.remove();
      riddle.remove();
    }, 1300);
  }

  /* ---------- Play the folder ---------- */
  let introStarted = false;
  async function playIntro() {
    if (introStarted) return;
    introStarted = true;
    const controller = await introReady;
    riddle.classList.add("gone");
    if (!controller) { revealPage(null); return; }
    const skip = $("#skip");
    skip.hidden = false;
    skip.addEventListener("click", () => revealPage(controller), { once: true });
    controller.begin(() => revealPage(controller));
  }

  /* ---------- Riddle ---------- */
  const hints = [
    "Not quite. Give it another go.",
    "Hint: everyone has one, and it changes on every birthday.",
    "Hint: on 27 November, Ian's reaches 30.",
    "Three letters, starting with A: A _ _"
  ];
  let attempts = 0;

  function isCorrect(value) {
    const words = value.toLowerCase().normalize("NFKD").replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
    return words.some((w) => C.riddleAnswers.includes(w));
  }

  function success() {
    remember();
    form.hidden = true;
    count.hidden = true;
    tiles.hidden = false;
    msg.classList.add("ok");
    msg.textContent = "Correct. Age only ever goes up, and this year Ian's reaches 30. Your invitation awaits.";
    cont.hidden = false;
    cont.focus({ preventScroll: true });
    cont.addEventListener("click", playIntro, { once: true });
    setTimeout(playIntro, 3200);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = input.value.trim();
    if (!value) {
      msg.textContent = "Type your answer first.";
      input.focus();
      return;
    }
    if (isCorrect(value)) { success(); return; }

    attempts += 1;
    msg.textContent = hints[Math.min(attempts - 1, hints.length - 1)];
    count.hidden = false;
    count.textContent = "Attempts: " + attempts;
    form.classList.remove("shake");
    void form.offsetWidth; // restart the animation
    form.classList.add("shake", "wrong");
    input.select();
  });
  input.addEventListener("input", () => form.classList.remove("wrong"));
  form.addEventListener("animationend", () => form.classList.remove("shake"));

  /* ---------- Start ---------- */
  if (solvedBefore()) {
    // Returning guests skip the riddle and go straight to the folder.
    riddle.classList.add("gone");
    playIntro();
  } else if (window.matchMedia("(pointer: fine)").matches) {
    // Focus the answer box on desktop; on phones, wait for a tap so the keyboard doesn't cover the riddle.
    setTimeout(() => input.focus({ preventScroll: true }), 400);
  }
})();
