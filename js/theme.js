/**
 * Light/dark theme toggle. The initial theme (stored preference or system
 * preference) is already applied by an inline script in <head> to avoid a
 * flash — this file only wires up the toggle button and persists changes.
 */
(function () {
  const STORAGE_KEY = "theme";
  const root = document.documentElement;

  function currentTheme() {
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    window.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }));
  }

  function updateIcon(btn) {
    const isLight = currentTheme() === "light";
    btn.innerHTML = isLight
      ? '<i class="fa-solid fa-moon" aria-hidden="true"></i>'
      : '<i class="fa-solid fa-sun" aria-hidden="true"></i>';
    btn.setAttribute(
      "aria-label",
      isLight ? "Switch to dark mode" : "Switch to light mode",
    );
  }

  function init() {
    const btn = document.getElementById("theme-toggle");
    if (!btn) return;

    updateIcon(btn);

    btn.addEventListener("click", () => {
      const next = currentTheme() === "light" ? "dark" : "light";
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* private browsing / storage disabled — theme just won't persist */
      }
      updateIcon(btn);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
