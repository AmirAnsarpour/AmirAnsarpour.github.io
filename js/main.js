/**
 * Main initialization script
 */

document.addEventListener("DOMContentLoaded", () => {
  // ========================
  // Fetch GitHub repos
  // ========================
  fetchRepositories("AmirAnsarpour");

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
      showingAll = !showingAll;

      const activeOption = document.querySelector(".sort-option.active");
      const currentSort = activeOption
        ? activeOption.getAttribute("data-value")
        : "stars";

      handleSort(currentSort);
      updateViewAllButton();

      if (!showingAll) {
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
  }

  // ========================
  // Navbar hide/show on scroll
  // ========================
  let lastScrollY = window.scrollY;
  const nav = document.querySelector("nav");

  window.addEventListener(
    "scroll",
    () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 200) {
        nav.style.transform = "translateY(-120%)";
        nav.style.transition = "transform 0.3s ease";
      } else {
        nav.style.transform = "translateY(0)";
        nav.style.transition = "transform 0.3s ease";
      }

      lastScrollY = currentScrollY;
    },
    { passive: true }
  );

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