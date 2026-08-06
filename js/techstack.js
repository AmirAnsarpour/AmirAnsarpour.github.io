/**
 * Tech Stack Section — language usage across all repos, shown as percentages.
 * Reads the pre-generated data/languages.json snapshot first (no per-repo
 * API calls, no rate limit); falls back to live per-repo /languages calls
 * only if that snapshot isn't available.
 */

(function () {
  const CACHE_KEY = "github_techstack";
  const CACHE_EXPIRY = 30 * 60 * 1000;
  const STATIC_LANGUAGES_URL = "data/languages.json";

  function langMeta(lang) {
    return (window.LANG_META && window.LANG_META[lang]) || window.DEFAULT_LANG_META;
  }

  // ─── Skeleton ─────────────────────────────────────────────────────────────

  function renderTechSkeletons(count = 12) {
    const grid = document.getElementById("tech-grid");
    if (!grid) return;

    grid.innerHTML = Array(count)
      .fill(
        `<div class="tech-card tech-skeleton">
          <div class="skeleton-line" style="width:36px;height:36px;border-radius:50%;flex-shrink:0;"></div>
          <div class="skeleton-line" style="width:56px;height:11px;border-radius:6px;"></div>
          <div class="skeleton-line" style="width:100%;height:5px;border-radius:10px;"></div>
          <div class="skeleton-line" style="width:32px;height:10px;border-radius:6px;"></div>
        </div>`,
      )
      .join("");
  }

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchStaticLanguages() {
    const res = await fetch(STATIC_LANGUAGES_URL, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data && typeof data === "object" && Object.keys(data).length ? data : null;
  }

  async function fetchRepoLanguages(repoFullName) {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${repoFullName}/languages`,
      );
      if (!res.ok) return {};
      return await res.json();
    } catch {
      return {};
    }
  }

  /**
   * Waits for window.Portfolio.cachedRepos (populated by github.js) —
   * only needed on the live-API fallback path.
   */
  function waitForCachedRepos(maxWait = 10000) {
    return new Promise((resolve) => {
      const start = Date.now();

      function check() {
        const repos = window.Portfolio && window.Portfolio.cachedRepos;
        if (Array.isArray(repos) && repos.length > 0) {
          resolve(repos);
          return;
        }
        if (Date.now() - start > maxWait) {
          resolve([]); // timeout
          return;
        }
        setTimeout(check, 100);
      }

      check();
    });
  }

  async function fetchAllLanguagesLive(username) {
    const repos = await waitForCachedRepos();
    let repoList = repos;

    if (repoList.length === 0) {
      try {
        const res = await fetch(
          `https://api.github.com/users/${username}/repos?per_page=100`,
        );
        if (!res.ok) return {};
        const data = await res.json();
        if (!Array.isArray(data)) return {};
        repoList = data;
      } catch {
        return {};
      }
    }

    const CONCURRENCY = 5;
    const totalLangs = {};
    const queue = repoList.map((r) => r.full_name).filter(Boolean);

    while (queue.length > 0) {
      const batch = queue.splice(0, CONCURRENCY);
      const results = await Promise.all(
        batch.map((name) => fetchRepoLanguages(name)),
      );
      results.forEach((langs) => {
        Object.entries(langs).forEach(([lang, bytes]) => {
          totalLangs[lang] = (totalLangs[lang] || 0) + bytes;
        });
      });
    }

    return totalLangs;
  }

  async function fetchAllLanguages(username) {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_EXPIRY) {
          return data;
        }
      } catch {
        localStorage.removeItem(CACHE_KEY);
      }
    }

    let totalLangs = await fetchStaticLanguages();
    if (!totalLangs) {
      totalLangs = await fetchAllLanguagesLive(username);
    }

    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ data: totalLangs, timestamp: Date.now() }),
    );

    return totalLangs;
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  function renderTechStack(langData) {
    const grid = document.getElementById("tech-grid");
    if (!grid) return;

    const totalBytes = Object.values(langData).reduce((a, b) => a + b, 0);

    if (totalBytes === 0) {
      grid.innerHTML = `
        <div class="col-span-full text-center py-8">
          <i class="fa-solid fa-code text-3xl text-gray-600 mb-4" aria-hidden="true"></i>
          <p class="text-gray-500 text-sm">No language data available yet.</p>
        </div>`;
      return;
    }

    // Top 12 by bytes
    const sorted = Object.entries(langData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);

    grid.innerHTML = sorted
      .map(([lang, bytes]) => {
        const meta = langMeta(lang);
        const percentage = ((bytes / totalBytes) * 100).toFixed(1);

        return `
          <div class="tech-card" data-lang="${lang}" title="Filter projects by ${lang} — ${percentage}%" tabindex="0" role="button" aria-pressed="false">
            <div class="tech-icon" style="color:${meta.color};">
              <i class="${meta.icon}"></i>
            </div>
            <span class="tech-name">${lang}</span>
            <div class="tech-bar-container">
              <div class="tech-bar" style="width:${percentage}%;background:${meta.color};"></div>
            </div>
            <span class="tech-percentage">${percentage}%</span>
          </div>`;
      })
      .join("");
  }

  // ─── Filter interaction ───────────────────────────────────────────────────

  function initFilterInteraction() {
    const grid = document.getElementById("tech-grid");
    if (!grid) return;

    function activate(card) {
      const lang = card.getAttribute("data-lang");
      if (lang && window.Portfolio && typeof window.Portfolio.setLanguageFilter === "function") {
        window.Portfolio.setLanguageFilter(lang);
      }
    }

    grid.addEventListener("click", (e) => {
      const card = e.target.closest(".tech-card[data-lang]");
      if (card) activate(card);
    });

    grid.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const card = e.target.closest(".tech-card[data-lang]");
      if (card) {
        e.preventDefault();
        activate(card);
      }
    });

    window.addEventListener("languagefilterchange", (e) => {
      const activeLang = e.detail && e.detail.lang;
      grid.querySelectorAll(".tech-card[data-lang]").forEach((card) => {
        const isActive = card.getAttribute("data-lang") === activeLang;
        card.classList.toggle("active", isActive);
        card.setAttribute("aria-pressed", String(isActive));
      });
    });
  }

  // ─── Init ──────────────────────────────────────────────────────────────────

  async function init() {
    renderTechSkeletons();
    initFilterInteraction();
    const langData = await fetchAllLanguages(window.SITE_CONFIG.githubUsername);
    renderTechStack(langData);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
