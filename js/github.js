/**
 * GitHub API handler with caching and retry logic
 */

let cachedRepos = [];
let showingAll = false;
const DISPLAY_LIMIT = 9;

// Language color map
const langColors = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  Python: "#3572A5",
  Go: "#00ADD8",
  Rust: "#dea584",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Shell: "#89e051",
  Java: "#b07219",
  "C++": "#f34b7d",
  C: "#555555",
  "C#": "#178600",
  PHP: "#4F5D95",
  Ruby: "#701516",
  Swift: "#F05138",
  Kotlin: "#A97BFF",
  Dart: "#00B4AB",
  Vue: "#41b883",
  Svelte: "#ff3e00",
  Lua: "#000080",
  Perl: "#0298c3",
  R: "#198CE7",
  Scala: "#c22d40",
  Elixir: "#6e4a7e",
  Haskell: "#5e5086",
  Dockerfile: "#384d54",
  Makefile: "#427819",
  SCSS: "#c6538c",
  PowerShell: "#012456",
};

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
 * Fetch repositories with localStorage caching
 */
async function fetchRepositories(username) {
  const grid = document.getElementById("repositories-grid");
  const cacheKey = `github_repos_${username}`;
  const cacheExpiry = 30 * 60 * 1000; // 30 minutes

  renderSkeletons();

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < cacheExpiry) {
        cachedRepos = data;
        handleSort("stars");
        updateViewAllButton();
        if (typeof updateStats === "function") updateStats();
        return;
      }
    }

    const response = await fetchWithRetry(
      `https://api.github.com/users/${username}/repos?per_page=100`
    );

    cachedRepos = await response.json();

    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        data: cachedRepos,
        timestamp: Date.now(),
      })
    );

    handleSort("stars");
    updateViewAllButton();
    if (typeof updateStats === "function") updateStats();
  } catch (error) {
    console.error("Fetch error:", error);

    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      cachedRepos = JSON.parse(cached).data;
      handleSort("stars");
      updateViewAllButton();
      if (typeof updateStats === "function") updateStats();
    } else {
      grid.innerHTML = `
        <div class="col-span-full text-center py-16">
          <i class="fa-solid fa-triangle-exclamation text-3xl text-gray-600 mb-4"></i>
          <p class="text-gray-500 text-sm">Failed to load repositories. Please try again later.</p>
          <button onclick="fetchRepositories('${username}')" class="mt-4 glass-dropdown-btn px-4 py-2 text-xs">
            <i class="fa-solid fa-rotate-right mr-2"></i> Retry
          </button>
        </div>`;
    }
  }
}

/**
 * Sort cached repos
 */
function handleSort(criteria) {
  let sortedRepos = [...cachedRepos];

  if (criteria === "stars") {
    sortedRepos.sort((a, b) => b.stargazers_count - a.stargazers_count);
  } else if (criteria === "forks") {
    sortedRepos.sort((a, b) => b.forks_count - a.forks_count);
  } else if (criteria === "updated") {
    sortedRepos.sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
  } else if (criteria === "name") {
    sortedRepos.sort((a, b) => a.name.localeCompare(b.name));
  }

  const limit = showingAll ? sortedRepos.length : DISPLAY_LIMIT;
  renderGrid(sortedRepos.slice(0, limit));
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
 * Render repository grid
 */
function renderGrid(repos) {
  const grid = document.getElementById("repositories-grid");

  if (repos.length === 0) {
    grid.innerHTML = `<p class="col-span-full text-center text-gray-500 py-16">No repositories found.</p>`;
    return;
  }

  grid.innerHTML = repos
    .map((repo) => {
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

      const langColor = langColors[repo.language] || "#6b7280";

      return `
        <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="repo-card group" aria-label="Repository: ${repo.name}">
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
                <p class="text-gray-400 text-sm line-clamp-2 mb-6">${repo.description || "No description provided."}</p>
            </div>
            
            <div class="flex items-center gap-4 text-xs font-semibold text-gray-500">
                <span class="flex items-center">
                    <span class="lang-dot" style="background:${langColor};"></span> ${repo.language || "Project"}
                </span>
                <span class="flex items-center">
                    <i class="fa-regular fa-star mr-1" aria-hidden="true"></i> ${repo.stargazers_count}
                </span>
                ${forksCountHTML}
            </div>
        </a>
      `;
    })
    .join("");
}

/**
 * Update View All button
 */
function updateViewAllButton() {
  const container = document.getElementById("view-all-container");
  const btn = document.getElementById("view-all-btn");

  if (cachedRepos.length > DISPLAY_LIMIT) {
    container.style.display = "block";
    btn.innerHTML = showingAll
      ? 'Show Less <i class="fa-solid fa-arrow-up ml-2" aria-hidden="true"></i>'
      : `View All Projects (${cachedRepos.length}) <i class="fa-solid fa-arrow-right ml-2" aria-hidden="true"></i>`;
  } else {
    container.style.display = "none";
  }
}