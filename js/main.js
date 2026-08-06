/**
 * Main initialization script
 */

document.addEventListener("DOMContentLoaded", () => {
  // ========================
  // Fetch GitHub repos
  // ========================
  window.Portfolio.fetchRepositories(window.SITE_CONFIG.githubUsername);

  // ========================
  // Smooth scrolling for anchor links
  // ========================
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const href = this.getAttribute("href");
      if (href === "#") return;

      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        const navHeight = 80;
        const targetPos =
          target.getBoundingClientRect().top + window.scrollY - navHeight;
        window.scrollTo({
          top: targetPos,
          behavior: "smooth",
        });
      }
    });
  });

  // ========================
  // View All / Show Less toggle
  // ========================
  const viewAllBtn = document.getElementById("view-all-btn");
  if (viewAllBtn) {
    viewAllBtn.addEventListener("click", () => {
      window.Portfolio.showingAll = !window.Portfolio.showingAll;
      window.Portfolio.updateViewAllButton();

      window.Portfolio.toggleShowAll(() => {
        // Only scroll once the grid has settled at its final height —
        // scrolling while the extra cards are still collapsing makes the
        // browser's own scroll clamping fight the smooth animation.
        if (!window.Portfolio.showingAll) {
          const section = document.getElementById("repositories");
          if (section) {
            const navHeight = 80;
            const targetPos =
              section.getBoundingClientRect().top + window.scrollY - navHeight;
            window.scrollTo({
              top: targetPos,
              behavior: "smooth",
            });
          }
        }
      });
    });
  }

  // ========================
  // Clear Tech Stack language filter
  // ========================
  const clearFilterBtn = document.getElementById("clear-filter-btn");
  if (clearFilterBtn) {
    clearFilterBtn.addEventListener("click", () => {
      window.Portfolio.setLanguageFilter(null);
    });
  }

  // ========================
  // Navbar hide/show + scroll progress + back-to-top
  // ========================
  let lastScrollY = window.scrollY;
  const nav = document.querySelector("nav");
  const navPill = document.querySelector(".glass-nav");
  const progressBar = document.getElementById("scroll-progress");
  const backToTopBtn = document.getElementById("back-to-top");
  let scrollTicking = false;

  function updateOnScroll() {
    const currentScrollY = window.scrollY;

    if (currentScrollY > lastScrollY && currentScrollY > 200) {
      nav.style.transform = "translateY(-120%)";
      nav.style.transition = "transform 0.3s ease";
    } else {
      nav.style.transform = "translateY(0)";
      nav.style.transition = "transform 0.3s ease";
    }

    if (navPill) {
      navPill.classList.toggle("scrolled", currentScrollY > 20);
    }

    if (progressBar) {
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (currentScrollY / docHeight) * 100 : 0;
      progressBar.style.width = `${Math.min(100, Math.max(0, progress))}%`;
    }

    if (backToTopBtn) {
      backToTopBtn.classList.toggle("visible", currentScrollY > 500);
    }

    lastScrollY = currentScrollY;
    scrollTicking = false;
  }

  if (backToTopBtn) {
    backToTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!scrollTicking) {
        requestAnimationFrame(updateOnScroll);
        scrollTicking = true;
      }
    },
    { passive: true }
  );

  updateOnScroll();

  // ========================
  // Intersection Observer for sections
  // ========================
  const style = document.createElement("style");
  style.textContent = `
    .section-visible {
      opacity: 1 !important;
      transform: translateY(0) !important;
    }
  `;
  document.head.appendChild(style);

  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("section-visible");
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll("header, section").forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(30px)";
    el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    observer.observe(el);
  });

  // ========================
  // Console Easter Egg
  // ========================
  console.log(
    "%c👋 Hey there! Curious developer?",
    "font-size:16px;font-weight:bold;color:#60a5fa;"
  );
  console.log(
    "%cCheck out my repos: https://github.com/AmirAnsarpour",
    "font-size:12px;color:#9ca3af;"
  );
});