let cachedRepos = [];

async function fetchRepositories(username) {
  const grid = document.getElementById("repositories-grid");

  try {
    const response = await fetch(
      `https://api.github.com/users/${username}/repos?per_page=100`,
    );
    if (!response.ok) throw new Error("GitHub API Error");

    cachedRepos = await response.json();

    // Default initial sort by stars
    handleSort("stars");
  } catch (error) {
    console.error(error);
    grid.innerHTML = `<p class="col-span-full text-center text-gray-500">Failed to load repositories.</p>`;
  }
}

function handleSort(criteria) {
  let sortedRepos = [...cachedRepos];

  if (criteria === "stars") {
    sortedRepos.sort((a, b) => b.stargazers_count - a.stargazers_count);
  } else if (criteria === "forks") {
    sortedRepos.sort((a, b) => b.forks_count - a.forks_count);
  } else if (criteria === "updated") {
    // Using pushed_at for actual code activity
    sortedRepos.sort((a, b) => new Date(b.pushed_at) - new Date(a.pushed_at));
  } else if (criteria === "name") {
    sortedRepos.sort((a, b) => a.name.localeCompare(b.name));
  }

  renderGrid(sortedRepos.slice(0, 9));
}

function renderGrid(repos) {
  const grid = document.getElementById("repositories-grid");

  grid.innerHTML = repos
    .map((repo) => {
      // Date Logic: Using pushed_at to match GitHub Web UI (Fixes the 2025 error)
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
                <i class="fa-solid fa-code-branch text-[8px]"></i> Forked
               </span>`
        : "";

      const forksCountHTML =
        repo.forks_count > 0
          ? `<span class="flex items-center">
                <i class="fa-solid fa-code-branch mr-1 text-[10px]"></i> ${repo.forks_count}
               </span>`
          : "";

      return `
        <a href="${repo.html_url}" target="_blank" class="repo-card group">
            <div>
                <div class="flex justify-between items-center mb-6">
                    <div class="flex items-center gap-3">
                        <div class="flex items-center gap-3">
                            <i class="fa-regular fa-folder text-blue-400 text-2xl"></i>
                            <span class="text-[9px] text-gray-600 font-bold tracking-widest mt-1 whitespace-nowrap">
                                ${formattedDate}
                            </span>
                        </div>
                        ${forkBadge}
                    </div>
                    <i class="fa-solid fa-arrow-up-right-from-square text-gray-600 group-hover:text-white transition-colors text-xs"></i>
                </div>
                <h4 class="text-xl font-bold mb-2 tracking-tight">${repo.name}</h4>
                <p class="text-gray-400 text-sm line-clamp-2 mb-6">${repo.description || "No description provided."}</p>
            </div>
            
            <div class="flex items-center gap-4 text-xs font-semibold text-gray-500">
                <span class="flex items-center">
                    <span class="lang-dot bg-blue-500"></span> ${repo.language || "Project"}
                </span>
                <span class="flex items-center">
                    <i class="fa-regular fa-star mr-1"></i> ${repo.stargazers_count}
                </span>
                ${forksCountHTML}
            </div>
        </a>
        `;
    })
    .join("");
}

// Logic for the Custom Dropdown
document.addEventListener("DOMContentLoaded", () => {
  fetchRepositories("AmirAnsarpour");

  const sortBtn = document.getElementById("sort-button");
  const sortMenu = document.getElementById("sort-menu");
  const currentSortText = document.getElementById("current-sort");
  const sortOptions = document.querySelectorAll(".sort-option");
  const arrow = sortBtn.querySelector(".fa-chevron-down");

  // Toggle menu visibility
  sortBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isHidden = sortMenu.classList.contains("hidden");

    if (isHidden) {
      sortMenu.classList.remove("hidden");
      setTimeout(() => {
        sortMenu.classList.add("show");
        arrow.classList.add("rotate-arrow");
      }, 10);
    } else {
      closeMenu();
    }
  });

  // Handle selecting an option
  sortOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const val = option.getAttribute("data-value");
      currentSortText.innerText = option.innerText;

      sortOptions.forEach((opt) => opt.classList.remove("active"));
      option.classList.add("active");

      handleSort(val);
      closeMenu();
    });
  });

  // Close menu when clicking anywhere else
  window.addEventListener("click", () => {
    if (!sortMenu.classList.contains("hidden")) closeMenu();
  });

  function closeMenu() {
    sortMenu.classList.remove("show");
    arrow.classList.remove("rotate-arrow");
    setTimeout(() => {
      sortMenu.classList.add("hidden");
    }, 250);
  }
});
