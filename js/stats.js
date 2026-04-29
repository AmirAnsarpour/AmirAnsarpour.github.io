/**
 * Stats Counter Animation
 * Animates numbers counting up when visible
 */

(function () {
  let statsAnimated = false;

  /**
   * Animate a counter from 0 to target
   */
  function animateCounter(element, target, duration = 2000) {
    const start = 0;
    const startTime = performance.now();

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const current = Math.round(start + (target - start) * easedProgress);
      element.textContent = current.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  /**
   * Update stats from cached repo data
   */
  function updateStats() {
    if (typeof cachedRepos === "undefined" || cachedRepos.length === 0) return;

    const totalRepos = cachedRepos.length;
    const totalStars = cachedRepos.reduce(
      (sum, r) => sum + (r.stargazers_count || 0),
      0
    );
    const totalForks = cachedRepos.reduce(
      (sum, r) => sum + (r.forks_count || 0),
      0
    );
    const languages = new Set(
      cachedRepos.map((r) => r.language).filter(Boolean)
    );
    const totalLangs = languages.size;

    // Store targets
    document.getElementById("stat-repos").setAttribute("data-target", totalRepos);
    document.getElementById("stat-stars").setAttribute("data-target", totalStars);
    document.getElementById("stat-forks").setAttribute("data-target", totalForks);
    document.getElementById("stat-langs").setAttribute("data-target", totalLangs);

    // If already visible, trigger animation
    checkAndAnimate();
  }

  /**
   * Check if stats section is visible and animate
   */
  function checkAndAnimate() {
    if (statsAnimated) return;

    const statsSection = document.getElementById("stats");
    if (!statsSection) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !statsAnimated) {
            statsAnimated = true;

            document.querySelectorAll(".counter").forEach((counter) => {
              const target = parseInt(counter.getAttribute("data-target")) || 0;
              if (target > 0) {
                animateCounter(counter, target, 2000);
              }
            });

            observer.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );

    observer.observe(statsSection);
  }

  // Expose globally so github.js can call it
  window.updateStats = updateStats;

  // Also try on load in case data is already there
  document.addEventListener("DOMContentLoaded", () => {
    // Will be called by github.js after data loads
    checkAndAnimate();
  });
})();