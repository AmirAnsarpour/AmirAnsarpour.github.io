/**
 * Stats Counter Animation
 * Animates numbers counting up when visible
 */

(function () {
  let statsAnimated = false;
  let pendingTargets = null;

  /**
   * Animate a counter from 0 to target
   */
  function animateCounter(element, target, duration = 2000) {
    const startTime = performance.now();

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const current = Math.round(target * easedProgress);
      element.textContent = current.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }

    requestAnimationFrame(update);
  }

  /**
   * Run the actual counter animations
   */
  function runAnimation() {
    document.querySelectorAll(".counter").forEach((counter) => {
      const target = parseInt(counter.getAttribute("data-target")) || 0;
      if (target > 0) {
        animateCounter(counter, target, 2000);
      }
    });
  }

  /**
   * Update stats from cached repo data
   * Called by github.js after data is loaded
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

    // Set data-target attributes
    document
      .getElementById("stat-repos")
      .setAttribute("data-target", totalRepos);
    document
      .getElementById("stat-stars")
      .setAttribute("data-target", totalStars);
    document
      .getElementById("stat-forks")
      .setAttribute("data-target", totalForks);
    document
      .getElementById("stat-langs")
      .setAttribute("data-target", totalLangs);

    // Save targets in case observer already fired before data arrived
    pendingTargets = { totalRepos, totalStars, totalForks, totalLangs };

    const statsSection = document.getElementById("stats");
    if (!statsSection) return;

    // Check if section is already in viewport RIGHT NOW
    const rect = statsSection.getBoundingClientRect();
    const isVisible =
      rect.top < window.innerHeight && rect.bottom > 0;

    if (isVisible && !statsAnimated) {
      // Section already visible → animate immediately
      statsAnimated = true;
      runAnimation();
    } else if (!statsAnimated) {
      // Section not visible yet → observe it
      observeStats();
    }
  }

  /**
   * Setup IntersectionObserver to trigger when stats scroll into view
   */
  function observeStats() {
    const statsSection = document.getElementById("stats");
    if (!statsSection) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !statsAnimated && pendingTargets) {
            statsAnimated = true;
            runAnimation();
            observer.disconnect();
          }
        });
      },
      { threshold: 0.2 }
    );

    observer.observe(statsSection);
  }

  // Expose globally
  window.updateStats = updateStats;
})();