(function () {
  const glow = document.getElementById("cursor-glow");
  if (!glow) return;

  // Only on non-touch devices
  if (window.matchMedia("(hover: none)").matches) return;

  let mouseX = -200;
  let mouseY = -200;
  let currentX = -200;
  let currentY = -200;
  let isActive = false;
  let rafId = null;

  // Smooth interpolation
  const lerp = (start, end, factor) => start + (end - start) * factor;

  function animate() {
    currentX = lerp(currentX, mouseX, 0.12);
    currentY = lerp(currentY, mouseY, 0.12);

    glow.style.left = currentX + "px";
    glow.style.top = currentY + "px";

    rafId = requestAnimationFrame(animate);
  }

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!isActive) {
      isActive = true;
      glow.classList.add("active");
      animate();
    }
  });

  document.addEventListener("mouseleave", () => {
    isActive = false;
    glow.classList.remove("active");
    if (rafId) cancelAnimationFrame(rafId);
  });

  document.addEventListener("mouseenter", () => {
    if (!isActive) {
      isActive = true;
      glow.classList.add("active");
      animate();
    }
  });

  // Interactive elements enhance glow
  document.addEventListener("mouseover", (e) => {
    const target = e.target.closest(
      "a, button, .repo-card, .tech-card, .social-btn, .glass-dropdown-btn",
    );
    if (target) {
      glow.style.background = `radial-gradient(
        circle,
        rgba(96, 165, 250, 0.12) 0%,
        rgba(96, 165, 250, 0.05) 30%,
        transparent 70%
      )`;
      glow.style.width = "300px";
      glow.style.height = "300px";
    }
  });

  document.addEventListener("mouseout", (e) => {
    const target = e.target.closest(
      "a, button, .repo-card, .tech-card, .social-btn, .glass-dropdown-btn",
    );
    if (target) {
      glow.style.background = `radial-gradient(
        circle,
        rgba(96, 165, 250, 0.07) 0%,
        rgba(96, 165, 250, 0.03) 30%,
        transparent 70%
      )`;
      glow.style.width = "300px";
      glow.style.height = "300px";
    }
  });

  // Pause when hidden
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (rafId) cancelAnimationFrame(rafId);
      isActive = false;
    }
  });
})();
