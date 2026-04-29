/**
 * Typing Animation Effect
 * Types, pauses, deletes, and cycles through phrases
 */

(function () {
  const phrases = [
    "Developer.",
    "Creator.",
    "Open Source.",
    "Problem Solver.",
    "Code Lover.",
  ];

  const el = document.getElementById("typing-text");
  if (!el) return;

  let phraseIndex = 0;
  let charIndex = 0;
  let isDeleting = false;
  let isPaused = false;

  const TYPING_SPEED = 80;
  const DELETING_SPEED = 50;
  const PAUSE_AFTER_TYPE = 2000;
  const PAUSE_AFTER_DELETE = 500;

  function type() {
    const currentPhrase = phrases[phraseIndex];

    if (isPaused) return;

    if (!isDeleting) {
      // Typing
      charIndex++;
      el.textContent = currentPhrase.substring(0, charIndex);

      if (charIndex === currentPhrase.length) {
        // Finished typing — pause then delete
        isPaused = true;
        setTimeout(() => {
          isPaused = false;
          isDeleting = true;
          type();
        }, PAUSE_AFTER_TYPE);
        return;
      }

      setTimeout(type, TYPING_SPEED + Math.random() * 40);
    } else {
      // Deleting
      charIndex--;
      el.textContent = currentPhrase.substring(0, charIndex);

      if (charIndex === 0) {
        // Finished deleting — move to next phrase
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;

        setTimeout(type, PAUSE_AFTER_DELETE);
        return;
      }

      setTimeout(type, DELETING_SPEED);
    }
  }

  // Start after a small delay
  setTimeout(type, 600);
})();
