/**
 * Canvas-based particle/snow effect
 * Lightweight replacement for DOM-based snowflakes
 */

(function () {
  const PARTICLE_COUNT = 120;
  let canvas, ctx, particles, animationId;

  function init() {
    const container = document.getElementById("particle-container");
    if (!container) return;

    canvas = document.createElement("canvas");
    canvas.style.cssText =
      "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;";
    container.appendChild(canvas);

    resize();

    particles = Array.from({ length: PARTICLE_COUNT }, () => createParticle());

    animate();

    // Debounced resize
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        particles.forEach((p) => {
          if (p.x > canvas.width || p.y > canvas.height) {
            Object.assign(p, createParticle());
          }
        });
      }, 200);
    });

    // Pause when tab hidden
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        cancelAnimationFrame(animationId);
      } else {
        animate();
      }
    });
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
  }

  function createParticle() {
    const size = Math.random() * 1.5 + 0.5;
    return {
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: size,
      speedX: (Math.random() - 0.5) * 0.6,
      speedY: (Math.random() * 0.3 + 0.1) * (2 - size),
      opacity: Math.random() * 0.35 + 0.05,
      flickerSpeed: Math.random() > 0.7 ? Math.random() * 0.005 + 0.002 : 0,
      flickerOffset: Math.random() * Math.PI * 2,
    };
  }

  function animate() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.clearRect(0, 0, w, h);

    const now = Date.now() * 0.001;

    particles.forEach((p) => {
      p.x += p.speedX;
      p.y += p.speedY;

      if (p.y > h + 5) {
        p.y = -5;
        p.x = Math.random() * w;
      }
      if (p.x < -10) p.x = w + 5;
      if (p.x > w + 10) p.x = -5;

      let alpha = p.opacity;
      if (p.flickerSpeed > 0) {
        alpha =
          p.opacity *
          (0.5 + 0.5 * Math.sin(now * p.flickerSpeed * 100 + p.flickerOffset));
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fill();
    });

    animationId = requestAnimationFrame(animate);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
