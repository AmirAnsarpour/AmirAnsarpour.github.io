/**
 * Fetches repo + language data from the GitHub REST API and writes it to
 * static JSON files under /data. Run by .github/workflows/update-data.yml
 * on a schedule, and readable directly by js/github.js + js/techstack.js
 * so the live site never has to call api.github.com from the browser.
 *
 * Usage: node scripts/fetch-github-data.js
 * Optional env: GITHUB_TOKEN (raises the API rate limit from 60/hr to 5000/hr)
 */

const fs = require("fs");
const path = require("path");

const USERNAME = "AmirAnsarpour";
const OUT_DIR = path.join(__dirname, "..", "data");
const CONCURRENCY = 5;

const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "portfolio-data-fetch-script",
};
if (process.env.GITHUB_TOKEN) {
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

async function fetchJson(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} for ${url}`);
  }
  return res.json();
}

// Trim each repo down to the fields the frontend actually renders.
function trimRepo(repo) {
  return {
    name: repo.name,
    full_name: repo.full_name,
    html_url: repo.html_url,
    description: repo.description,
    language: repo.language,
    topics: repo.topics || [],
    stargazers_count: repo.stargazers_count,
    forks_count: repo.forks_count,
    pushed_at: repo.pushed_at,
    updated_at: repo.updated_at,
    fork: repo.fork,
  };
}

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

async function main() {
  const rawRepos = await fetchJson(
    `https://api.github.com/users/${USERNAME}/repos?per_page=100`,
  );

  if (!Array.isArray(rawRepos)) {
    throw new Error(`Unexpected response for repo list: ${JSON.stringify(rawRepos).slice(0, 200)}`);
  }

  const repos = rawRepos.map(trimRepo);

  const repoLanguages = {};
  const totalLanguages = {};

  await mapWithConcurrency(rawRepos, CONCURRENCY, async (repo) => {
    let langs = {};
    try {
      langs = await fetchJson(`https://api.github.com/repos/${repo.full_name}/languages`);
    } catch (err) {
      console.warn(`Skipping languages for ${repo.full_name}: ${err.message}`);
    }
    repoLanguages[repo.full_name] = langs;
    Object.entries(langs).forEach(([lang, bytes]) => {
      totalLanguages[lang] = (totalLanguages[lang] || 0) + bytes;
    });
  });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "repos.json"), JSON.stringify(repos, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "repo-languages.json"), JSON.stringify(repoLanguages, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, "languages.json"), JSON.stringify(totalLanguages, null, 2));
  fs.writeFileSync(
    path.join(OUT_DIR, "meta.json"),
    JSON.stringify({ generatedAt: new Date().toISOString() }, null, 2),
  );

  console.log(`Wrote data for ${repos.length} repos to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
