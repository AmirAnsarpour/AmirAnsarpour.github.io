(() => {
  const username = 'AmirAnsarpour';
  const cacheUrl = 'https://nepmcsckxjlpkmnujoma.supabase.co/storage/v1/object/public/portfolio-public-cache/sites/amir-ansarpour/github.json';
  const cacheKey = 'portfolio_central_cache_v1';
  async function loadSharedCache() {
    try {
      const response = await fetch(cacheUrl);
      if (!response.ok) throw new Error('Shared cache unavailable');
      const data = await response.json();
      if (data.version !== 1 || !Array.isArray(data.repos) || !data.profile || !Array.isArray(data.events)) throw new Error('Invalid shared cache');
      try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch (_) { /* optional browser fallback */ }
      return data;
    } catch (_) {
      try {
        const data = JSON.parse(localStorage.getItem(cacheKey));
        if (data?.version === 1 && Array.isArray(data.repos) && data.profile && Array.isArray(data.events)) return data;
      } catch (_) { /* no previous cache */ }
      return null;
    }
  }
  const sharedCache = loadSharedCache().then(data => {
    if (data?.updated_at) {
      const updated = new Date(data.updated_at);
      if (!Number.isNaN(updated.getTime())) document.querySelector('#cache-status').textContent = `GitHub / Updated ${updated.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric', timeZone:'UTC'})} UTC`;
    }
    return data;
  });
  const list = document.querySelector('#project-list');
  const filter = document.querySelector('#language-filter');
  const sort = document.querySelector('#sort-projects');
  const search = document.querySelector('#project-search');
  const count = document.querySelector('#project-count');
  const previous = document.querySelector('#previous-page');
  const nextPage = document.querySelector('#next-page');
  const pageStatus = document.querySelector('#page-status');
  const stackList = document.querySelector('#stack-list');
  const stackNote = document.querySelector('#stack-note');
  const limit = 5;
  let repos = [];
  let page = 0;
  document.querySelector('#year').textContent = new Date().getFullYear();

  function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
  }
  function languages(repo) {
    const names = repo.languages ? Object.keys(repo.languages) : [];
    return names.length ? names : repo.language ? [repo.language] : [];
  }
  function render() {
    const selected = filter.value;
    const query = search.value.trim().toLocaleLowerCase();
    const items = repos.filter(repo => (!selected || languages(repo).includes(selected)) && (!query || `${repo.name} ${repo.description || ''}`.toLocaleLowerCase().includes(query)));
    items.sort((a, b) => {
      if (sort.value === 'name') return a.name.localeCompare(b.name);
      if (sort.value === 'updated') return new Date(b.pushed_at || b.updated_at) - new Date(a.pushed_at || a.updated_at);
      if (sort.value === 'forks') return b.forks_count - a.forks_count;
      return b.stargazers_count - a.stargazers_count;
    });
    count.textContent = `${items.length} project${items.length === 1 ? '' : 's'}${selected ? ` / ${selected}` : ''}`;
    const pageCount = Math.max(1, Math.ceil(items.length / limit));
    previous.parentElement.hidden = pageCount <= 1;
    page = Math.min(page, pageCount - 1);
    previous.disabled = page === 0;
    nextPage.disabled = page >= pageCount - 1;
    pageStatus.textContent = `${String(page + 1).padStart(2, '0')} / ${String(pageCount).padStart(2, '0')}`;
    list.replaceChildren();
    if (!items.length) list.append(element('p', 'list-message', 'No projects found for this language.'));
    for (const repo of items.slice(page * limit, (page + 1) * limit)) {
      const row = element('a', 'project-row', '');
      row.href = repo.html_url;
      row.addEventListener('click', event => { event.preventDefault(); openProject(repo); });
      const date = new Date(repo.pushed_at || repo.updated_at);
      row.append(element('span', 'date', Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-US', {month:'short', year:'numeric'})));
      const title = element('span', 'project-title', '');
      title.append(element('span', 'project-name', repo.name));
      if (repo.description) title.append(element('span', 'project-description', repo.description));
      row.append(title, element('span', 'language', repo.language || 'N/A'), element('span', 'stars', String(repo.stargazers_count)));
      list.append(row);
    }
  }
  function renderStack() {
    const totals = {};
    let available = 0;
    repos.forEach(repo => {
      if (!repo.languages) return;
      available++;
      Object.entries(repo.languages).forEach(([language, bytes]) => {
        if (Number.isFinite(bytes) && bytes > 0) totals[language] = (totals[language] || 0) + bytes;
      });
    });
    const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, entry) => sum + entry[1], 0);
    stackList.replaceChildren();
    if (!total) {
      const primary = [...new Set(repos.map(repo => repo.language).filter(Boolean))].sort();
      stackNote.textContent = primary.length ? 'Byte-level breakdown is unavailable. Showing primary languages instead.' : 'Language data is unavailable right now.';
      primary.forEach(language => {
        const button = element('button', 'stack-item stack-fallback', language);
        button.type = 'button';
        button.setAttribute('aria-pressed', String(filter.value === language));
        button.addEventListener('click', () => { filter.value = filter.value === language ? '' : language; page = 0; syncMenu(filter); render(); renderStack(); document.querySelector('#work').scrollIntoView({behavior:'smooth'}); });
        stackList.append(button);
      });
      return;
    }
    stackNote.textContent = available < repos.length
      ? `Share of code by size, based on ${available} of ${repos.length} repositories with available language data.`
      : 'Share of code by size across public repositories. Select a language to explore projects.';
    entries.forEach(([language, bytes]) => {
      const percent = (bytes / total * 100).toFixed(1);
      const button = element('button', 'stack-item', '');
      button.type = 'button';
      button.setAttribute('aria-pressed', String(filter.value === language));
      const name = element('span', 'stack-name', language);
      const value = element('span', 'stack-value', `${percent}%`);
      const track = element('span', 'stack-track', '');
      track.setAttribute('aria-hidden', 'true');
      const fill = element('span', 'stack-fill', '');
      fill.style.width = `${percent}%`;
      track.append(fill);
      button.append(name, value, track);
      button.addEventListener('click', () => {
        filter.value = filter.value === language ? '' : language;
        page = 0;
        syncMenu(filter);
        render();
        renderStack();
        document.querySelector('#work').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      });
      stackList.append(button);
    });
  }
  function updateData(data) {
    repos = data;
    const selectedLanguage = filter.value;
    const langs = [...new Set(repos.flatMap(languages))].sort((a,b) => a.localeCompare(b));
    filter.replaceChildren(new Option('All languages', ''));
    langs.forEach(lang => filter.add(new Option(lang, lang)));
    if (langs.includes(selectedLanguage)) filter.value = selectedLanguage;
    syncMenu(filter);
    renderStack();
    document.querySelector('#stat-repos').textContent = repos.length;
    document.querySelector('#stat-stars').textContent = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0).toLocaleString();
    document.querySelector('#stat-forks').textContent = repos.reduce((sum, repo) => sum + repo.forks_count, 0).toLocaleString();
    document.querySelector('#stat-languages').textContent = langs.length;
    render();
  }
  async function load() {
    const data = await sharedCache;
    if (data) { updateData(data.repos); return; }
    stackNote.textContent = 'Language data is unavailable right now.';
    count.textContent = 'Project index unavailable';
    list.replaceChildren(element('p', 'list-message', 'Projects could not be loaded. Please visit GitHub using the link below.'));
  }
  const dialog = document.querySelector('#project-dialog');
  const detailTitle = document.querySelector('#detail-title');
  const detailDescription = document.querySelector('#detail-description');
  const detailLanguages = document.querySelector('#detail-languages');
  const detailLinks = document.querySelector('#detail-links');
  const detailExtras = document.querySelector('#detail-extras');
  const readme = document.querySelector('#detail-readme');
  let detailRequest = 0;

  function safeUrl(value, base) {
    try {
      if (!value || !value.trim()) return null;
      const url = new URL(value, base);
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
    } catch (_) { return null; }
  }
  function addExternalLink(parent, label, url) {
    const safe = safeUrl(url);
    if (!safe) return;
    const link = element('a', '', label);
    link.href = safe;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    parent.append(link);
  }
  function displayDate(value) {
    const date = new Date(value);
    return value && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric', timeZone:'UTC'}) : '';
  }
  function projectDetails(repo) {
    detailExtras.replaceChildren();
    const controls = element('div', 'detail-extra-controls', '');
    const panel = element('div', 'detail-extra-panel', '');
    panel.id = 'detail-extra-panel';
    panel.hidden = true;
    controls.append(detailLinks);
    const buttons = [];
    function group(title, content) {
      const button = element('button', 'detail-extra-button', title);
      button.type = 'button';
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-controls', panel.id);
      button.addEventListener('click', () => {
        const opening = button.getAttribute('aria-expanded') !== 'true';
        buttons.forEach(item => item.setAttribute('aria-expanded', 'false'));
        button.setAttribute('aria-expanded', String(opening));
        panel.hidden = !opening;
        panel.replaceChildren();
        if (opening) panel.append(content);
      });
      buttons.push(button);
      controls.append(button);
    }
    if (Array.isArray(repo.contributors) && repo.contributors.some(person => person.login && person.login.toLowerCase() !== username.toLowerCase())) {
      const section = element('section', 'detail-contributors', '');
      section.append(element('h3', 'detail-side-label', 'Contributors'));
      const contributors = element('div', 'contributor-list', '');
      repo.contributors.forEach(person => {
        const url = safeUrl(person.html_url);
        if (!url || !person.login) return;
        const link = element('a', 'contributor', person.login);
        link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
        contributors.append(link);
      });
      if (contributors.childNodes.length) { section.append(contributors); controls.append(section); }
    }
    const release = element('div', 'extra-content', '');
    if (repo.latest_release) {
      const item = repo.latest_release;
      addExternalLink(release, item.name || item.tag_name || 'View release', item.html_url);
      if (item.name && item.tag_name && item.name !== item.tag_name) release.append(element('span', 'extra-muted', item.tag_name));
      if (displayDate(item.published_at)) release.append(element('span', 'extra-muted', displayDate(item.published_at)));
      if (Array.isArray(item.assets) && item.assets.length) {
        const downloads = element('div', 'release-downloads', '');
        item.assets.forEach(asset => addExternalLink(downloads, asset.name || 'Download', asset.browser_download_url));
        if (downloads.childNodes.length) release.append(downloads);
      }
      group('Latest release', release);
    }
    const commits = element('div', 'extra-content extra-commits', '');
    if (Array.isArray(repo.recent_commits)) repo.recent_commits.forEach(commit => {
      const row = element('div', 'extra-commit', '');
      const url = safeUrl(commit.html_url);
      if (url) addExternalLink(row, commit.message || 'View commit', url);
      else row.append(element('span', '', commit.message || 'Commit'));
      if (displayDate(commit.date)) row.append(element('time', 'extra-muted', displayDate(commit.date)));
      commits.append(row);
    });
    if (commits.childNodes.length) group('Recent changes', commits);
    detailExtras.append(controls, panel);
  }
  async function loadStarred() {
    const container = document.querySelector('#starred-list');
    const pagination = document.querySelector('#starred-pagination');
    const previous = document.querySelector('#starred-previous');
    const next = document.querySelector('#starred-next');
    const status = document.querySelector('#starred-page-status');
    const cached = (await sharedCache)?.starred;
    if (!Array.isArray(cached)) { container.replaceChildren(element('p', 'list-message', 'Starred projects are temporarily unavailable.')); return; }
    const starred = cached.filter(repo => repo && safeUrl(repo.html_url) && repo.full_name);
    if (!starred.length) { container.replaceChildren(element('p', 'list-message', 'No starred projects to show yet.')); return; }
    let page = 0;
    const pageCount = Math.ceil(starred.length / 5);
    function renderPage() {
      container.replaceChildren();
      for (const repo of starred.slice(page * 5, (page + 1) * 5)) {
        const url = safeUrl(repo.html_url);
        if (!url || !repo.full_name) continue;
        const row = element('a', 'starred-row', '');
        row.href = url; row.target = '_blank'; row.rel = 'noopener noreferrer';
        const info = element('span', 'starred-info', '');
        info.append(element('span', 'starred-name', repo.full_name));
        if (repo.description) info.append(element('span', 'starred-description', repo.description));
        const meta = element('span', 'starred-meta', '');
        if (Number.isFinite(repo.stargazers_count)) {
          const stars = element('span', 'starred-stars', '');
          stars.append(element('strong', '', repo.stargazers_count.toLocaleString()), document.createTextNode(repo.stargazers_count === 1 ? ' star' : ' stars'));
          meta.append(stars);
        }
        if (repo.language) meta.append(element('span', 'starred-language', repo.language));
        row.append(info, meta);
        container.append(row);
      }
      previous.disabled = page === 0;
      next.disabled = page === pageCount - 1;
      status.textContent = `${String(page + 1).padStart(2, '0')} / ${String(pageCount).padStart(2, '0')}`;
      pagination.hidden = pageCount <= 1;
    }
    previous.addEventListener('click', () => { if (page > 0) { page--; renderPage(); } });
    next.addEventListener('click', () => { if (page < pageCount - 1) { page++; renderPage(); } });
    renderPage();
  }
  loadStarred();
  function renderReadme(html, repo) {
    const source = new DOMParser().parseFromString(html, 'text/html');
    const allowed = new Set(['ARTICLE','DIV','SECTION','P','H1','H2','H3','H4','H5','H6','UL','OL','LI','A','IMG','STRONG','EM','B','I','DEL','S','CODE','PRE','BLOCKQUOTE','HR','BR','TABLE','THEAD','TBODY','TR','TH','TD','DETAILS','SUMMARY','SUP','SUB']);
    const ignored = new Set(['SCRIPT','STYLE','IFRAME','OBJECT','EMBED','SVG','FORM','INPUT','BUTTON','VIDEO','AUDIO']);
    const base = `${repo.html_url}/blob/${encodeURIComponent(repo.default_branch || 'main')}/`;
    function copy(node, parent) {
      if (node.nodeType === Node.TEXT_NODE) { parent.append(document.createTextNode(node.textContent)); return; }
      if (node.nodeType !== Node.ELEMENT_NODE || ignored.has(node.tagName)) return;
      if (!allowed.has(node.tagName)) { node.childNodes.forEach(child => copy(child, parent)); return; }
      const target = document.createElement(node.tagName.toLowerCase());
      if (node.tagName === 'A') {
        const href = safeUrl(node.getAttribute('href'), base);
        if (href) { target.href = href; target.target = '_blank'; target.rel = 'noopener noreferrer'; }
      }
      if (node.tagName === 'IMG') {
        let src = safeUrl(node.getAttribute('src'), base);
        if (!src) return;
        const imageUrl = new URL(src);
        if (imageUrl.hostname === 'github.com' && imageUrl.pathname.includes('/blob/')) {
          imageUrl.hostname = 'raw.githubusercontent.com';
          imageUrl.pathname = imageUrl.pathname.replace('/blob/', '/');
          src = imageUrl.href;
        }
        target.src = src;
        target.alt = node.getAttribute('alt') || '';
        target.loading = 'lazy';
        target.decoding = 'async';
        const width = Number(node.getAttribute('width'));
        const height = Number(node.getAttribute('height'));
        if (Number.isInteger(width) && width > 0 && width <= 10000 && Number.isInteger(height) && height > 0 && height <= 10000) {
          target.width = width;
          target.height = height;
          target.className = 'readme-image-sized';
        } else if (imageUrl.hostname === 'img.shields.io' || (node.getAttribute('data-canonical-src') || '').startsWith('https://img.shields.io/')) {
          target.width = 120;
          target.height = 20;
          target.className = 'readme-badge';
        } else {
          target.className = 'readme-image-unsized';
        }
      }
      node.childNodes.forEach(child => copy(child, target));
      parent.append(target);
    }
    const fragment = document.createDocumentFragment();
    (source.querySelector('article') || source.body).childNodes.forEach(node => copy(node, fragment));
    readme.replaceChildren(fragment);
  }
  async function openProject(repo) {
    const request = ++detailRequest;
    detailTitle.replaceChildren();
    repo.name.split(/([._-])/).forEach(part => {
      detailTitle.append(document.createTextNode(part));
      if (/^[._-]$/.test(part)) detailTitle.append(document.createElement('wbr'));
    });
    detailTitle.classList.toggle('detail-title-long', repo.name.length >= 23);
    detailDescription.textContent = repo.description || 'No description provided.';
    detailLanguages.replaceChildren();
    const languageHeading = element('span', 'detail-languages-label', 'Languages by code size');
    detailLanguages.append(languageHeading);
    const breakdown = Object.entries(repo.languages || {}).filter(([,bytes]) => Number.isFinite(bytes) && bytes > 0).sort((a,b) => b[1] - a[1]);
    const totalBytes = breakdown.reduce((sum, [,bytes]) => sum + bytes, 0);
    if (totalBytes) {
      const list = element('div', 'detail-language-list', '');
      breakdown.forEach(([language, bytes]) => {
        const row = element('div', 'detail-language', '');
        const percentage = bytes / totalBytes * 100;
        row.append(element('span', '', language), element('span', '', `${percentage < 0.1 ? '<0.1' : percentage.toFixed(1)}%`));
        list.append(row);
      });
      detailLanguages.append(list);
    } else {
      detailLanguages.append(element('p', 'detail-language-empty', repo.language ? `${repo.language} / Percentage unavailable` : 'Language data unavailable'));
    }
    detailLinks.replaceChildren();
    addExternalLink(detailLinks, 'View on GitHub', repo.html_url);
    if (repo.homepage && repo.homepage.trim()) addExternalLink(detailLinks, 'Visit project website', repo.homepage.trim());
    projectDetails(repo);
    readme.textContent = 'Loading README…';
    dialog.showModal();
    try {
      if (request !== detailRequest || !dialog.open) return;
      if (repo.readme_html) renderReadme(repo.readme_html, repo);
      else readme.textContent = 'This project does not have a README.';
    } catch (_) {
      if (request === detailRequest && dialog.open) readme.textContent = 'README could not be loaded. You can read it on GitHub.';
    }
  }
  document.querySelector('#detail-close').addEventListener('click', () => dialog.close());
  function outsideDialog(event) {
    const bounds = dialog.getBoundingClientRect();
    return event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
  }
  let pointerStartedOutside = false;
  dialog.addEventListener('pointerdown', event => { pointerStartedOutside = event.target === dialog && outsideDialog(event); });
  dialog.addEventListener('click', event => {
    if (pointerStartedOutside && event.target === dialog && outsideDialog(event)) dialog.close();
    pointerStartedOutside = false;
  });
  dialog.addEventListener('close', () => { detailRequest++; });

  async function loadProfile() {
    const followers = document.querySelector('#profile-followers');
    const following = document.querySelector('#profile-following');
    try {
      const profile = (await sharedCache)?.profile;
      if (!profile) throw new Error('Profile unavailable');
      if (!Number.isInteger(profile.followers) || !Number.isInteger(profile.following)) throw new Error('Invalid profile');
      followers.textContent = profile.followers.toLocaleString();
      following.textContent = profile.following.toLocaleString();
    } catch (_) {
      followers.textContent = 'See';
      following.textContent = 'See';
    }
  }
  function updateTehranTime() {
    const clock = document.querySelector('#tehran-time');
    try {
      const now = new Date();
      clock.textContent = new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Tehran', hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).format(now);
      clock.dateTime = now.toISOString();
    } catch (_) {
      clock.textContent = 'Unavailable';
    }
  }
  loadProfile();
  updateTehranTime();
  setInterval(updateTehranTime, 30000);
  async function loadContributions() {
    const total = document.querySelector('#contribution-total');
    const grid = document.querySelector('#contribution-grid');
    const months = document.querySelector('#contribution-months');
    const tooltip = document.querySelector('#contribution-tooltip');
    const tooltipCount = tooltip.querySelector('.tooltip-count');
    const tooltipDate = tooltip.querySelector('.tooltip-date');
    let activeCell = null;
    function showDetail(cell) {
      activeCell = cell;
      tooltipCount.textContent = cell.dataset.count;
      tooltipDate.textContent = cell.dataset.date;
      tooltip.hidden = false;
      const rect = cell.getBoundingClientRect();
      const width = tooltip.offsetWidth;
      tooltip.style.left = `${Math.max(width / 2 + 12, Math.min(window.innerWidth - width / 2 - 12, rect.left + rect.width / 2))}px`;
      tooltip.style.top = `${Math.max(tooltip.offsetHeight + 12, rect.top - 10)}px`;
    }
    function hideDetail() { tooltip.hidden = true; activeCell = null; }
    grid.addEventListener('keydown', event => {
      const step = {ArrowRight:7, ArrowLeft:-7, ArrowDown:1, ArrowUp:-1}[event.key];
      if (event.key === 'Escape') { hideDetail(); return; }
      if (step === undefined) return;
      const cells = Array.from(grid.querySelectorAll('button'));
      const current = cells.indexOf(document.activeElement);
      if (current < 0) return;
      event.preventDefault();
      const next = cells[Math.max(0, Math.min(cells.length - 1, current + step))];
      cells[current].tabIndex = -1;
      next.tabIndex = 0;
      next.focus();
    });
    document.addEventListener('pointerdown', event => { if (activeCell && !grid.contains(event.target)) hideDetail(); });
    window.addEventListener('scroll', hideDetail, {passive:true});
    window.addEventListener('resize', hideDetail);
    try {
      const data = (await sharedCache)?.contributions;
      if (!data) throw new Error('Calendar unavailable');
      const days = data.contributions;
      if (!Array.isArray(days) || !days.length) throw new Error('No calendar data');
      const valid = days.filter(day => /^\d{4}-\d{2}-\d{2}$/.test(day.date) && Number.isFinite(day.count) && day.level >= 0 && day.level <= 4).sort((a, b) => a.date.localeCompare(b.date));
      if (!valid.length) throw new Error('No calendar data');
      const offset = new Date(`${valid[0].date}T00:00:00Z`).getUTCDay();
      const weeks = Math.ceil((offset + valid.length) / 7);
      const sum = valid.reduce((acc, day) => acc + day.count, 0);
      total.textContent = `${sum.toLocaleString()} contributions in the last year`;
      grid.setAttribute('aria-label', `${sum.toLocaleString()} contributions in the last year. Use arrow keys to explore days.`);
      grid.style.setProperty('--weeks', weeks);
      months.style.setProperty('--weeks', weeks);
      grid.replaceChildren(); months.replaceChildren();
      let lastMonth = '';
      valid.forEach((day, index) => {
        const position = offset + index;
        const week = Math.floor(position / 7) + 1;
        const date = new Date(`${day.date}T00:00:00Z`);
        const month = day.date.slice(0, 7);
        if (month !== lastMonth) {
          const label = element('span', '', date.toLocaleDateString('en-US', {month: 'short', timeZone: 'UTC'}));
          label.style.gridColumn = week;
          months.append(label);
          lastMonth = month;
        }
        const cell = element('button', `contribution-day level-${Math.floor(day.level)}`, '');
        cell.type = 'button';
        cell.tabIndex = index === valid.length - 1 ? 0 : -1;
        cell.style.gridColumn = week;
        cell.style.gridRow = position % 7 + 1;
        cell.dataset.count = `${day.count} contribution${day.count === 1 ? '' : 's'}`;
        cell.dataset.date = date.toLocaleDateString('en-US', {month:'long', day:'numeric', year:'numeric', timeZone:'UTC'});
        cell.setAttribute('aria-label', `${cell.dataset.count} on ${cell.dataset.date}`);
        cell.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') showDetail(cell); });
        cell.addEventListener('pointerleave', event => { if (event.pointerType !== 'touch' && document.activeElement !== cell) hideDetail(); });
        cell.addEventListener('focus', () => showDetail(cell));
        cell.addEventListener('blur', hideDetail);
        cell.addEventListener('click', () => showDetail(cell));
        grid.append(cell);
      });
    } catch (_) {
      total.textContent = 'Contribution calendar is temporarily unavailable.';
      grid.setAttribute('aria-label', 'Contribution calendar unavailable. View contributions on GitHub.');
    }
  }
  loadContributions();
  async function loadActivity() {
    const container = document.querySelector('#activity-list');
    const labels = { PushEvent: 'Pushed code', CreateEvent: 'Created', DeleteEvent: 'Deleted a branch or tag', WatchEvent: 'Starred', ForkEvent: 'Forked', IssuesEvent: 'Updated an issue in', IssueCommentEvent: 'Commented on an issue in', PullRequestEvent: 'Updated a pull request in', PullRequestReviewEvent: 'Reviewed a pull request in', ReleaseEvent: 'Published a release in', PublicEvent: 'Made public' };
    try {
      const publicEvents = (await sharedCache)?.events;
      if (!publicEvents) throw new Error('Activity unavailable');
      const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const events = publicEvents.filter(event => labels[event.type] && event.repo?.name && Date.parse(event.created_at) >= cutoff).sort((a,b) => Date.parse(b.created_at) - Date.parse(a.created_at));
      container.replaceChildren();
      if (!events.length) { container.append(element('p', 'list-message', 'No public activity in the last 7 days.')); return; }
      events.forEach(event => {
        const row = element('a', 'activity-row', '');
        row.href = `https://github.com/${event.repo.name}`;
        row.target = '_blank'; row.rel = 'noopener noreferrer';
        const date = new Date(event.created_at);
        row.append(element('span', 'activity-date', date.toLocaleDateString('en-US', {month:'short', day:'numeric', year:'numeric'})), element('span', 'activity-action', labels[event.type]), element('span', 'activity-repo', event.repo.name));
        container.append(row);
      });
    } catch (_) {
      container.replaceChildren(element('p', 'list-message', 'Recent activity could not be loaded. Visit GitHub to see more.'));
    }
  }
  loadActivity();
  // Keep the native selects as a fallback, and enhance them with a consistent menu.
  function enhanceSelect(select) {
    const details = document.createElement('details');
    details.className = 'filter-menu';
    const summary = document.createElement('summary');
    const choices = document.createElement('div');
    choices.className = 'filter-options';
    details.append(summary, choices);
    select.hidden = true;
    select.after(details);
    select.menu = { details, summary, choices };
    details.addEventListener('keydown', event => {
      if (event.key === 'Escape' && details.open) {
        details.open = false;
        summary.focus();
      }
    });
    details.addEventListener('focusout', event => {
      if (!details.contains(event.relatedTarget)) details.open = false;
    });
    document.addEventListener('click', event => {
      if (!details.contains(event.target)) details.open = false;
    });
    syncMenu(select);
  }
  function syncMenu(select) {
    if (!select.menu) return;
    const { details, summary, choices } = select.menu;
    const selected = select.selectedOptions[0];
    summary.textContent = selected ? selected.textContent : '';
    summary.setAttribute('aria-label', `${select.id === 'language-filter' ? 'Language' : 'Sort by'}: ${summary.textContent}`);
    choices.replaceChildren();
    Array.from(select.options).forEach(option => {
      const button = element('button', 'filter-option', option.textContent);
      button.type = 'button';
      button.setAttribute('aria-label', option.textContent);
      button.setAttribute('aria-pressed', String(option.selected));
      button.addEventListener('click', () => {
        select.value = option.value;
        select.dispatchEvent(new Event('change'));
        syncMenu(select);
        details.open = false;
        summary.focus();
      });
      choices.append(button);
    });
  }
  enhanceSelect(filter);
  enhanceSelect(sort);
  function changePage(direction) {
    page += direction;
    render();
    list.classList.remove('page-enter');
    void list.offsetWidth;
    list.classList.add('page-enter');
  }
  search.addEventListener('input', () => { page = 0; render(); });
  filter.addEventListener('change', () => { page = 0; render(); renderStack(); });
  sort.addEventListener('change', () => { page = 0; render(); });
  previous.addEventListener('click', () => changePage(-1));
  nextPage.addEventListener('click', () => changePage(1));
  load();
})();
