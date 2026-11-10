(() => {
  const username = 'AmirAnsarpour';
  const list = document.querySelector('#project-list');
  const filter = document.querySelector('#language-filter');
  const sort = document.querySelector('#sort-projects');
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
    return repo.languages ? Object.keys(repo.languages) : repo.language ? [repo.language] : [];
  }
  function render() {
    const selected = filter.value;
    const items = repos.filter(repo => !selected || languages(repo).includes(selected));
    items.sort((a, b) => {
      if (sort.value === 'name') return a.name.localeCompare(b.name);
      if (sort.value === 'updated') return new Date(b.pushed_at || b.updated_at) - new Date(a.pushed_at || a.updated_at);
      if (sort.value === 'forks') return b.forks_count - a.forks_count;
      return b.stargazers_count - a.stargazers_count;
    });
    count.textContent = `${items.length} project${items.length === 1 ? '' : 's'}${selected ? ` / ${selected}` : ''}`;
    const pageCount = Math.max(1, Math.ceil(items.length / limit));
    page = Math.min(page, pageCount - 1);
    previous.disabled = page === 0;
    nextPage.disabled = page >= pageCount - 1;
    pageStatus.textContent = `${String(page + 1).padStart(2, '0')} / ${String(pageCount).padStart(2, '0')}`;
    list.replaceChildren();
    if (!items.length) list.append(element('p', 'list-message', 'No projects found for this language.'));
    for (const repo of items.slice(page * limit, (page + 1) * limit)) {
      const row = element('a', 'project-row', '');
      row.href = repo.html_url;
      row.target = '_blank';
      row.rel = 'noopener noreferrer';
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
      stackNote.textContent = 'Language breakdown is unavailable right now.';
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
    const key = `github_repos_${username}`;
    let cached;
    try { cached = JSON.parse(localStorage.getItem(key)); } catch (_) { /* storage may be unavailable */ }
    if (Array.isArray(cached?.data) && Date.now() - cached.timestamp < 1800000) { updateData(cached.data); return; }
    try {
      const all = [];
      for (let page = 1; ; page++) {
        const response = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&page=${page}`);
        if (!response.ok) throw new Error('GitHub request failed');
        const batch = await response.json();
        all.push(...batch);
        if (batch.length < 100) break;
      }
      // Show the index immediately; language details enhance the filter when available.
      updateData(all);
      let next = 0;
      await Promise.all(Array.from({length: 5}, async () => {
        while (next < all.length) {
          const repo = all[next++];
          try {
            const response = await fetch(`https://api.github.com/repos/${repo.full_name}/languages`);
            if (response.ok) repo.languages = await response.json();
          } catch (_) { /* primary language remains available */ }
        }
      }));
      const currentFilter = filter.value;
      updateData(all);
      filter.value = currentFilter;
      syncMenu(filter);
      renderStack();
      render();
      try { localStorage.setItem(key, JSON.stringify({data: all, timestamp: Date.now()})); } catch (_) { /* optional cache */ }
    } catch (_) {
      if (Array.isArray(cached?.data)) { updateData(cached.data); count.textContent += ' / cached'; }
      else { stackNote.textContent = 'Language breakdown is unavailable right now.'; count.textContent = 'Project index unavailable'; list.replaceChildren(element('p', 'list-message', 'Projects could not be loaded. Please visit GitHub using the link below.')); }
    }
  }
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
  filter.addEventListener('change', () => { page = 0; render(); renderStack(); });
  sort.addEventListener('change', () => { page = 0; render(); });
  previous.addEventListener('click', () => changePage(-1));
  nextPage.addEventListener('click', () => changePage(1));
  load();
})();
