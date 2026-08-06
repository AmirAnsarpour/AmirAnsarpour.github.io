/**
 * Shows how long ago the static GitHub data snapshot (data/meta.json,
 * written by scripts/fetch-github-data.js) was generated, next to the
 * Tech Stack / Open Source headings. Silently does nothing if the file
 * isn't there yet (e.g. before the update-data workflow has run once).
 */
(function () {
  function relativeTime(date) {
    const diffSec = Math.round((Date.now() - date.getTime()) / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHr = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHr / 24);

    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 30) return `${diffDay}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  async function init() {
    const targets = document.querySelectorAll(".sync-timestamp");
    if (targets.length === 0) return;

    try {
      const res = await fetch("data/meta.json", { cache: "no-store" });
      if (!res.ok) return;
      const { generatedAt } = await res.json();
      if (!generatedAt) return;

      const text = `Synced ${relativeTime(new Date(generatedAt))}`;
      targets.forEach((el) => {
        el.textContent = text;
      });
    } catch {
      /* no static snapshot yet — leave the timestamp slots empty */
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
