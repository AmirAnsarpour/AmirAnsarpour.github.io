/**
 * 3D tilt effect for the profile photo — tracks the cursor across the
 * whole page (not just while hovering the card) and eases toward it,
 * like the photo is "looking" at the mouse. Only resets when the mouse
 * actually leaves the browser window.
 */
(function () {
  const el = document.getElementById("profile-tilt");
  if (!el) return;

  // Skip on touch devices — there's no persistent cursor to track
  if (window.matchMedia("(hover: none)").matches) return;

  const MAX_DEG = 16;
  const EASE = 0.08;

  let mouseX = null;
  let mouseY = null;
  let currentRotX = 0;
  let currentRotY = 0;
  let currentScale = 1;
  let rafId = null;

  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const lerp = (start, end, factor) => start + (end - start) * factor;

  function tick() {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const halfW = rect.width / 2 || 1;
    const halfH = rect.height / 2 || 1;

    let targetRotX = 0;
    let targetRotY = 0;
    let targetScale = 1;

    if (mouseX !== null) {
      // Normalized -0.5..0.5, clamped so the tilt maxes out at the card's
      // edge instead of growing without bound the further away the
      // cursor gets.
      const px = clamp((mouseX - cx) / halfW, -1, 1) / 2;
      const py = clamp((mouseY - cy) / halfH, -1, 1) / 2;
      targetRotX = -py * MAX_DEG;
      targetRotY = px * MAX_DEG;
      targetScale = 1.06;
    }

    currentRotX = lerp(currentRotX, targetRotX, EASE);
    currentRotY = lerp(currentRotY, targetRotY, EASE);
    currentScale = lerp(currentScale, targetScale, EASE);

    el.style.transform = `perspective(700px) rotateX(${currentRotX.toFixed(2)}deg) rotateY(${currentRotY.toFixed(2)}deg) scale3d(${currentScale.toFixed(3)}, ${currentScale.toFixed(3)}, ${currentScale.toFixed(3)})`;

    rafId = requestAnimationFrame(tick);
  }

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
  });

  // Only let go once the cursor actually leaves the window
  document.addEventListener("mouseleave", () => {
    mouseX = null;
    mouseY = null;
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!rafId) {
      tick();
    }
  });

  tick();
})();
