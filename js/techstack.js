/**
 * Tech Stack Section — Dynamic from GitHub
 * Fetches real language usage from all repos and shows percentages
 */

(function () {
  const techMeta = {
    JavaScript: { icon: "fa-brands fa-js", color: "#f1e05a" },
    TypeScript: { icon: "fa-brands fa-js", color: "#3178c6" },
    Python: { icon: "fa-brands fa-python", color: "#3572A5" },
    Go: { icon: "fa-brands fa-golang", color: "#00ADD8" },
    HTML: { icon: "fa-brands fa-html5", color: "#e34c26" },
    CSS: { icon: "fa-brands fa-css3-alt", color: "#563d7c" },
    SCSS: { icon: "fa-brands fa-sass", color: "#c6538c" },
    Less: { icon: "fa-brands fa-less", color: "#1d365d" },
    Java: { icon: "fa-brands fa-java", color: "#b07219" },
    Kotlin: { icon: "fa-solid fa-k", color: "#A97BFF" },
    Swift: { icon: "fa-brands fa-swift", color: "#F05138" },
    Ruby: { icon: "fa-solid fa-gem", color: "#701516" },
    PHP: { icon: "fa-brands fa-php", color: "#4F5D95" },
    "C#": { icon: "fa-solid fa-hashtag", color: "#178600" },
    "C++": { icon: "fa-solid fa-code", color: "#f34b7d" },
    C: { icon: "fa-solid fa-c", color: "#555555" },
    Rust: { icon: "fa-brands fa-rust", color: "#dea584" },
    Dart: { icon: "fa-solid fa-d", color: "#00B4AB" },
    Shell: { icon: "fa-solid fa-terminal", color: "#89e051" },
    PowerShell: { icon: "fa-solid fa-terminal", color: "#012456" },
    Lua: { icon: "fa-solid fa-moon", color: "#000080" },
    Perl: { icon: "fa-solid fa-code", color: "#0298c3" },
    R: { icon: "fa-solid fa-chart-line", color: "#198CE7" },
    Vue: { icon: "fa-brands fa-vuejs", color: "#41b883" },
    Svelte: { icon: "fa-solid fa-fire", color: "#ff3e00" },
    Dockerfile: { icon: "fa-brands fa-docker", color: "#384d54" },
    Makefile: { icon: "fa-solid fa-gears", color: "#427819" },
    Nix: { icon: "fa-solid fa-snowflake", color: "#7e7eff" },
    HCL: { icon: "fa-solid fa-cloud", color: "#5C4EE5" },
    Scala: { icon: "fa-solid fa-s", color: "#c22d40" },
    Elixir: { icon: "fa-solid fa-droplet", color: "#6e4a7e" },
    Haskell: { icon: "fa-solid fa-h", color: "#5e5086" },
    "Jupyter Notebook": { icon: "fa-solid fa-book", color: "#DA5B0B" },
    "Vim Script": { icon: "fa-solid fa-v", color: "#199f4b" },
    Zig: { icon: "fa-solid fa-z", color: "#ec915c" },
    Assembly: { icon: "fa-solid fa-microchip", color: "#6E4C13" },
    EJS: { icon: "fa-solid fa-file-code", color: "#a91e50" },
    Astro: { icon: "fa-solid fa-rocket", color: "#ff5a03" },
  };

  const defaultMeta = { icon: "fa-solid fa-code", color: "#6b7280" };

  const CACHE_KEY = "github_techstack";
  const CACHE_EXPIRY = 30 * 60 * 1000;

  // ─── Skeleton ─────────────────────────────────────────────────────────────

  /**
   * Skeleton که دقیقاً شبیه کارت واقعیه:
   * ردیف ۱: آیکون (circle) + فاصله
   * ردیف ۲: اسم زبان (خط کوتاه)
   * ردیف ۳: نوار درصد (خط بلند)
   * ردیف ۴: عدد درصد (خط خیلی کوتاه)
   */
  function renderTechSkeletons(count = 12) {
    const grid = document.getElementById("tech-grid");
    if (!grid) return;

    grid.innerHTML = Array(count)
      .fill(
        `<div class="tech-card tech-skeleton">
          <div class="skeleton-line" style="width:36px;height:36px;border-radius:50%;flex-shrink:0;"></div>
          <div class="skeleton-line" style="width:56px;height:11px;border-radius:6px;"></div>
          <div class="skeleton-line" style="width:100%;height:3px;border-radius:10px;"></div>
          <div class="skeleton-line" style="width:32px;height:10px;border-radius:6px;"></div>
        </div>`,
      )
      .join("");
  }

  // ─── Fetch ─────────────────────────────────────────────────────────────────

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
   * منتظر میمونه تا cachedRepos از github.js پر بشه
   * بدون هیچ timeout ثابتی — polling واقعی
   */
  function waitForCachedRepos(maxWait = 10000) {
    return new Promise((resolve) => {
      const start = Date.now();

      function check() {
        if (
          typeof cachedRepos !== "undefined" &&
          Array.isArray(cachedRepos) &&
          cachedRepos.length > 0
        ) {
          resolve(cachedRepos);
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

  async function fetchAllLanguages(username) {
    // Cache check
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

    // منتظر repos بمون
    const repos = await waitForCachedRepos();

    if (repos.length === 0) {
      // Fallback: fetch directly
      try {
        const res = await fetch(
          `https://api.github.com/users/${username}/repos?per_page=100`,
        );
        if (!res.ok) return {};
        const data = await res.json();
        if (!Array.isArray(data)) return {};
        repos.push(...data);
      } catch {
        return {};
      }
    }

    // Fetch languages با concurrency
    const CONCURRENCY = 5;
    const totalLangs = {};
    const queue = repos.map((r) => r.full_name).filter(Boolean);

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

    // Cache
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
        <p class="col-span-full text-center text-gray-500 py-8 text-sm">
          No language data available.
        </p>`;
      return;
    }

    // Top 12 by bytes
    const sorted = Object.entries(langData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);

    grid.innerHTML = sorted
      .map(([lang, bytes]) => {
        const meta = techMeta[lang] || defaultMeta;
        const percentage = ((bytes / totalBytes) * 100).toFixed(1);

        return `
          <div class="tech-card" title="${lang} — ${percentage}%">
            <div class="tech-icon" style="color:${meta.color};">
              <i class="${meta.icon}"></i>
            </div>
            <span class="tech-name">${lang}</span>
            <div class="tech-bar-container">
              <div class="tech-bar" style="width:${percentage}%;background:${meta.color};"></div>
            </div>
            <span class="tech-percentage" style="color:${meta.color};">${percentage}%</span>
          </div>`;
      })
      .join("");
  }

  // ─── Init ──────────────────────────────────────────────────────────────────

  async function init() {
    renderTechSkeletons();
    const langData = await fetchAllLanguages("AmirAnsarpour");
    renderTechStack(langData);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
