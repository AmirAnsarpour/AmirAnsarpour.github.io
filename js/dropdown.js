/**
 * Custom glass dropdown component
 */

document.addEventListener("DOMContentLoaded", () => {
  const sortBtn = document.getElementById("sort-button");
  const sortMenu = document.getElementById("sort-menu");
  const currentSortText = document.getElementById("current-sort");
  const sortOptions = document.querySelectorAll(".sort-option");
  const arrow = sortBtn.querySelector(".fa-chevron-down");

  sortBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isHidden = sortMenu.classList.contains("hidden");

    if (isHidden) {
      openMenu();
    } else {
      closeMenu();
    }
  });

  sortOptions.forEach((option) => {
    option.addEventListener("click", () => {
      const val = option.getAttribute("data-value");
      currentSortText.innerText = option.innerText.trim();

      sortOptions.forEach((opt) => opt.classList.remove("active"));
      option.classList.add("active");

      handleSort(val);
      closeMenu();
    });
  });

  window.addEventListener("click", () => {
    if (!sortMenu.classList.contains("hidden")) closeMenu();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !sortMenu.classList.contains("hidden")) {
      closeMenu();
      sortBtn.focus();
    }
  });

  function openMenu() {
    sortMenu.classList.remove("hidden");
    sortBtn.setAttribute("aria-expanded", "true");
    setTimeout(() => {
      sortMenu.classList.add("show");
      arrow.classList.add("rotate-arrow");
    }, 10);
  }

  function closeMenu() {
    sortMenu.classList.remove("show");
    arrow.classList.remove("rotate-arrow");
    sortBtn.setAttribute("aria-expanded", "false");
    setTimeout(() => {
      sortMenu.classList.add("hidden");
    }, 250);
  }
});
