/**
 * GitHub repositories: fetched straight from api.github.com in the
 * browser (no build step, no server), cached in localStorage for 30
 * minutes so repeat visits within that window don't re-hit the API.
 */

window.Portfolio = window.Portfolio || {};

(function () {
  const state = window.Portfolio;
  state.cachedRepos = [];
  state.showingAll = false;
  state.activeLanguageFilter = null;

  const DISPLAY_LIMIT = 9;
  const LANGUAGE_FETCH_CONCURRENCY = 5;
  const CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutes

  function langMeta(lang) {
    return (window.LANG_META && window.LANG_META[lang]) || window.DEFAULT_LANG_META;
  }

  function cacheKeyFor(username) {
    return `github_repos_${username}`;
  }

  function readCache(key, ignoreExpiry) {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    try {
      const { data, timestamp } = JSON.parse(raw);
      if (ignoreExpiry || Date.now() - timestamp < CACHE_EXPIRY) return data;
    } catch {
      /* corrupt cache entry, ignore */
    }
    return null;
  }

  function writeCache(key, data) {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  }

  /**
   * Fetch with retry logic
   */
  async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch(url);
        if (res.ok) return res;
        if (res.status === 403 || res.status === 429) {
          console.warn("GitHub API rate limited.");
          break;
        }
      } catch (e) {
        if (i === retries - 1) throw e;
      }
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
    throw new Error("Failed after retries");
  }

  /**
   * Per-repo language breakdown, used for the multi-color bar on each
   * card. Best-effort — a repo just falls back to its single primary
   * `language` dot if this particular call fails.
   */
  async function fetchRepoLanguages(fullName) {
    try {
      const res = await fetch(`https://api.github.com/repos/${fullName}/languages`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  /**
   * Fetches the `/languages` breakdown for every repo, a handful at a
   * time. Also doubles as the Tech Stack section's data source — see
   * techstack.js, which aggregates these same `repo.languages` values
   * instead of fetching them separately.
   */
  async function attachLanguageBreakdown(repos) {
    const queue = [...repos];

    async function worker() {
      while (queue.length > 0) {
        const repo = queue.shift();
        repo.languages = await fetchRepoLanguages(repo.full_name);
      }
    }

    await Promise.all(
      Array.from({ length: LANGUAGE_FETCH_CONCURRENCY }, worker)
    );

    return repos;
  }

  async function fetchLiveRepos(username) {
    const res = await fetchWithRetry(
      `https://api.github.com/users/${username}/repos?per_page=100`
    );
    const repos = await res.json();
    await attachLanguageBreakdown(repos);
    return repos;
  }

  /**
   * Fetch repositories with localStorage caching
   */
  async function fetchRepositories(username) {
    const grid = document.getElementById("repositories-grid");
    const cacheKey = cacheKeyFor(username);

    renderSkeletons();

    const cached = readCache(cacheKey);
    if (cached) {
      state.cachedRepos = cached;
      applyRepos();
      return;
    }

    try {
      const repos = await fetchLiveRepos(username);

      state.cachedRepos = repos;
      writeCache(cacheKey, repos);
      applyRepos();
    } catch (error) {
      console.error("Fetch error:", error);

      const stale = readCache(cacheKey, true);
      if (stale) {
        state.cachedRepos = stale;
        applyRepos();
      } else {
        grid.innerHTML = `
        <div class="col-span-full text-center py-16">
          <i class="fa-solid fa-triangle-exclamation text-3xl text-gray-600 mb-4"></i>
          <p class="text-gray-500 text-sm">Failed to load repositories. Please try again later.</p>
          <button onclick="window.Portfolio.fetchRepositories('${username}')" class="mt-4 glass-dropdown-btn px-4 py-2 text-xs">
            <i class="fa-solid fa-rotate-right mr-2"></i> Retry
          </button>
        </div>`;
      }
    }
  }

  function applyRepos() {
    handleSort("stars");
    updateViewAllButton();
    if (typeof state.updateStats === "function") state.updateStats();
  }

  let lastSortCriteria = "stars";

  /**
   * Repos matching the active Tech Stack language filter, if any.
   * A repo matches when it uses that language at all (checked against its
   * per-repo breakdown when available, falling back to its primary
   * `language` on the live-API path where no breakdown was fetched).
   */
  function filteredRepos() {
    const lang = state.activeLanguageFilter;
    if (!lang) return state.cachedRepos;

    return state.cachedRepos.filter((repo) => {
      if (repo.languages) return Object.prototype.hasOwnProperty.call(repo.languages, lang);
      return repo.language === lang;
    });
  }

  function sortRepos(criteria) {
    const sorted = [...filteredRepos()];

    if (criteria === "stars") {
      sorted.sort((a, b) => b.stargazers_count - a.stargazers_count);
    } else if (criteria === "forks") {
      sorted.sort((a, b) => b.forks_count - a.forks_count);
    } else if (criteria === "updated") {
      sorted.sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
    } else if (criteria === "name") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    }

    return sorted;
  }

  /**
   * Full re-render — used for the initial load and whenever the sort
   * order actually changes (every visible card's position can move).
   */
  function handleSort(criteria) {
    lastSortCriteria = criteria;
    const sorted = sortRepos(criteria);
    const limit = state.showingAll ? sorted.length : DISPLAY_LIMIT;
    renderGrid(sorted.slice(0, limit));
  }

  /**
   * Expand/collapse the grid without touching the cards already on
   * screen: appends the extra cards (they fade in on their own) or
   * fades out + removes them, instead of re-rendering everything.
   *
   * `onSettled`, if given, fires once the DOM has actually finished
   * changing — on collapse specifically, only after the extra cards are
   * removed and the grid has its final (shorter) height. Callers that
   * need to scroll afterward should wait for this instead of scrolling
   * immediately, otherwise the scroll target/max-scroll is computed
   * against a page that's about to shrink out from under it.
   */
  function toggleShowAll(onSettled) {
    const grid = document.getElementById("repositories-grid");
    const sorted = sortRepos(lastSortCriteria);

    if (state.showingAll) {
      const extra = sorted.slice(DISPLAY_LIMIT);
      const html = extra
        .map((repo, i) => repoCardHTML(repo, i * 0.05))
        .join("");
      grid.insertAdjacentHTML("beforeend", html);
      if (typeof onSettled === "function") onSettled();
    } else {
      const cards = Array.from(grid.querySelectorAll(".repo-card")).slice(DISPLAY_LIMIT);
      cards.forEach((card) => card.classList.add("removing"));
      setTimeout(() => {
        cards.forEach((card) => card.remove());
        if (typeof onSettled === "function") onSettled();
      }, 250);
    }
  }

  /**
   * Toggle filtering the grid down to repos using `lang` — clicking the
   * same language again clears the filter. Triggered from the Tech Stack
   * cards in techstack.js.
   */
  function setLanguageFilter(lang) {
    const wasActive = state.activeLanguageFilter;
    state.activeLanguageFilter = state.activeLanguageFilter === lang ? null : lang;
    state.showingAll = false;

    handleSort(lastSortCriteria);
    updateViewAllButton();
    updateFilterUI();
    flashGrid();

    window.dispatchEvent(
      new CustomEvent("languagefilterchange", {
        detail: { lang: state.activeLanguageFilter },
      })
    );

    // Only jump down to the grid when a filter is being applied. Clearing
    // it should leave the user right where they are — near the "×" chip
    // or the tech card they just clicked — so they can actually see the
    // chip disappear / the card un-highlight instead of it happening
    // off-screen mid-scroll.
    if (state.activeLanguageFilter && !wasActive) {
      const section = document.getElementById("repositories");
      if (section) {
        const navHeight = 80;
        const targetPos =
          section.getBoundingClientRect().top + window.scrollY - navHeight;
        window.scrollTo({ top: targetPos, behavior: "smooth" });
      }
    }
  }

  /**
   * Briefly highlights the grid's border so a filter change reads as an
   * obvious update even when nothing scrolls (e.g. clearing the filter).
   */
  function flashGrid() {
    const grid = document.getElementById("repositories-grid");
    if (!grid) return;
    grid.classList.remove("grid-flash");
    // Force reflow so re-adding the class restarts the animation even if
    // it's already mid-flash from a rapid second click.
    void grid.offsetWidth;
    grid.classList.add("grid-flash");
  }

  /**
   * Show/hide the "Filtering: X" chip next to the Open Source heading.
   */
  function updateFilterUI() {
    const btn = document.getElementById("clear-filter-btn");
    const label = document.getElementById("active-filter-label");
    if (!btn || !label) return;

    if (state.activeLanguageFilter) {
      label.textContent = state.activeLanguageFilter;
      btn.classList.add("show");
    } else {
      btn.classList.remove("show");
    }
  }

  /**
   * Render skeleton loading
   */
  function renderSkeletons(count = 9) {
    const grid = document.getElementById("repositories-grid");
    grid.innerHTML = Array(count)
      .fill(
        `
    <div class="skeleton-card">
      <div>
        <div class="flex justify-between items-center mb-6">
          <div class="skeleton-line" style="width:32px;height:32px;border-radius:10px;"></div>
          <div class="skeleton-line" style="width:16px;height:16px;border-radius:4px;"></div>
        </div>
        <div class="skeleton-line" style="width:75%;height:24px;margin-bottom:12px;"></div>
        <div class="skeleton-line" style="width:100%;height:16px;margin-bottom:8px;"></div>
        <div class="skeleton-line" style="width:66%;height:16px;margin-bottom:24px;"></div>
      </div>
      <div class="flex gap-4">
        <div class="skeleton-line" style="width:64px;height:16px;"></div>
        <div class="skeleton-line" style="width:48px;height:16px;"></div>
      </div>
    </div>
  `
      )
      .join("");
  }

  /**
   * Build the multi-color language bar (empty if the /languages call for
   * this repo failed — the card just falls back to the single lang-dot).
   */
  function buildLangBar(repo) {
    const languages = repo.languages;
    if (!languages) return "";

    const total = Object.values(languages).reduce((a, b) => a + b, 0);
    if (total <= 0) return "";

    const segments = Object.entries(languages)
      .sort((a, b) => b[1] - a[1])
      .map(([lang, bytes]) => {
        const pct = ((bytes / total) * 100).toFixed(1);
        return `<span style="width:${pct}%;background:${langMeta(lang).color};" title="${lang} ${pct}%"></span>`;
      })
      .join("");

    return `<div class="repo-lang-bar" role="img" aria-label="Language breakdown">${segments}</div>`;
  }

  /**
   * Up to 3 GitHub topic chips, if the repo has any set.
   */
  function buildTopicChips(repo) {
    if (!repo.topics || repo.topics.length === 0) return "";

    const chips = repo.topics
      .slice(0, 3)
      .map((topic) => `<span class="repo-topic">${topic}</span>`)
      .join("");

    return `<div class="flex flex-wrap gap-1.5 mb-2">${chips}</div>`;
  }

  /**
   * Build the HTML for a single repo card. `delaySeconds`, when passed,
   * sets an explicit entrance-animation delay (used when appending cards
   * one at a time outside the normal nth-child stagger, e.g. View All).
   */
  function repoCardHTML(repo, delaySeconds) {
    const dateObj = new Date(repo.pushed_at || repo.updated_at);
    const formattedDate = dateObj
      .toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
      .toUpperCase();

    const forkBadge = repo.fork
      ? `<span class="flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-500">
           <i class="fa-solid fa-code-branch text-[8px]" aria-hidden="true"></i> Forked
         </span>`
      : "";

    const forksCountHTML =
      repo.forks_count > 0
        ? `<span class="flex items-center">
             <i class="fa-solid fa-code-branch mr-1 text-[10px]" aria-hidden="true"></i> ${repo.forks_count}
           </span>`
        : "";

    const langColor = langMeta(repo.language).color;
    const style =
      delaySeconds !== undefined ? ` style="animation-delay:${delaySeconds.toFixed(2)}s"` : "";

    return `
        <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="repo-card group"${style} aria-label="Repository: ${repo.name}">
            <div>
                <div class="flex justify-between items-center mb-6">
                    <div class="flex items-center gap-3">
                        <div class="flex items-center gap-3">
                            <i class="fa-regular fa-folder text-blue-400 text-2xl" aria-hidden="true"></i>
                            <span class="text-[9px] text-gray-600 font-bold tracking-widest mt-1 whitespace-nowrap">
                                ${formattedDate}
                            </span>
                        </div>
                        ${forkBadge}
                    </div>
                    <i class="fa-solid fa-arrow-up-right-from-square text-gray-600 group-hover:text-white transition-colors text-xs" aria-hidden="true"></i>
                </div>
                <h4 class="text-xl font-bold mb-2 tracking-tight">${repo.name}</h4>
                <p class="text-gray-400 text-sm line-clamp-2 mb-4" title="${repo.description ? repo.description.replace(/"/g, "&quot;") : ""}">${repo.description || "No description provided."}</p>
                ${buildTopicChips(repo)}
            </div>

            <div>
                ${buildLangBar(repo)}
                <div class="flex items-center gap-4 text-xs font-semibold text-gray-500">
                    <span class="flex items-center">
                        <span class="lang-dot" style="background:${langColor};"></span> ${repo.language || "Project"}
                    </span>
                    <span class="flex items-center">
                        <i class="fa-regular fa-star mr-1" aria-hidden="true"></i> ${repo.stargazers_count}
                    </span>
                    ${forksCountHTML}
                </div>
            </div>
        </a>
      `;
  }

  /**
   * Render repository grid
   */
  function renderGrid(repos) {
    const grid = document.getElementById("repositories-grid");

    if (repos.length === 0) {
      grid.innerHTML = `
        <div class="col-span-full text-center py-16">
          <i class="fa-regular fa-folder-open text-3xl text-gray-600 mb-4" aria-hidden="true"></i>
          <p class="text-gray-500 text-sm">No repositories found here yet.</p>
        </div>`;
      return;
    }

    grid.innerHTML = repos.map((repo) => repoCardHTML(repo)).join("");
  }

  /**
   * Update View All button
   */
  function updateViewAllButton() {
    const container = document.getElementById("view-all-container");
    const btn = document.getElementById("view-all-btn");
    const total = filteredRepos().length;

    if (total > DISPLAY_LIMIT) {
      container.style.display = "block";
      btn.innerHTML = state.showingAll
        ? 'Show Less <i class="fa-solid fa-arrow-up ml-2" aria-hidden="true"></i>'
        : `View All Projects (${total}) <i class="fa-solid fa-arrow-right ml-2" aria-hidden="true"></i>`;
    } else {
      container.style.display = "none";
    }
  }

  state.fetchRepositories = fetchRepositories;
  state.handleSort = handleSort;
  state.toggleShowAll = toggleShowAll;
  state.updateViewAllButton = updateViewAllButton;
  state.setLanguageFilter = setLanguageFilter;
})();
