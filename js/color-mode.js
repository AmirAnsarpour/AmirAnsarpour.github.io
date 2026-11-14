(() => {
  const key = 'portfolio-color-mode';
  const root = document.documentElement;
  let mode = 'light';
  try { if (localStorage.getItem(key) === 'dark') mode = 'dark'; } catch (_) { /* storage is optional */ }
  root.dataset.theme = mode;

  function sync() {
    const dark = mode === 'dark';
    root.dataset.theme = mode;
    document.querySelectorAll('.mode-choice').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    });
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.setAttribute('content', dark ? '#151515' : '#ffffff');
  }
  function init() {
    sync();
    document.querySelectorAll('.mode-choice').forEach(button => button.addEventListener('click', () => {
      mode = button.dataset.mode;
      try { localStorage.setItem(key, mode); } catch (_) { /* continue without persistence */ }
      sync();
    }));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
