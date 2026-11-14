# Portfolio

A project display for people who actually care about how things look. Just change the username in the script and try to keep up.

## Public data cache

The site reads one public JSON object from Supabase Storage, rather than making GitHub API requests in visitors' browsers. The object is `sites/amir-ansarpour/github.json` in the public `portfolio-public-cache` bucket. This bucket is for public data only; do not put private information in it. Other sites can use separate paths under `sites/`.

The `Refresh public portfolio cache` GitHub Actions workflow updates this site's object every six hours and can also be run manually. It uses the repository's read-only `GITHUB_TOKEN` to fetch public GitHub data and the `SUPABASE_CACHE_SECRET` Actions secret to upload it. The Supabase secret is project-wide, so keep it out of the repository and browser code. Updating another site requires its own refresh process and object path. If the contribution service fails, the refresh retains the previous calendar. If the shared cache is unavailable, visitors who have loaded it previously can use the copy in their browser.

The snapshot also contains each repository's five latest commits, latest published release and contributors, plus the account's public starred repositories. Optional GitHub endpoint failures retain the previous data where available; missing releases and empty repositories are displayed separately from temporary failures. The starred list loads six entries at a time in the browser.

The first snapshot was uploaded during setup. On a machine with `gh` authenticated, run `python3 scripts/refresh-public-cache.py` to refresh it manually; provide the Supabase secret through standard input or the `SUPABASE_CACHE_SECRET` environment variable. The secret must never be placed in a shell command or checked into Git.
