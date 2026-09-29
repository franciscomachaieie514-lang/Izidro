/* Izitrader theme toggle — Light is the default; users can switch to Dark. */
(function () {
  'use strict';
  if (window.IziThemeToggle) return;

  const STORAGE_KEY = 'izitrader_theme';
  const DEFAULT_MIGRATION_KEY = 'izitrader_theme_default_light_v2';

  function ensureDefaultTheme() {
    try {
      if (localStorage.getItem(DEFAULT_MIGRATION_KEY) !== '1') {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(STORAGE_KEY, 'light');
        localStorage.setItem(DEFAULT_MIGRATION_KEY, '1');
      } else if (localStorage.getItem(STORAGE_KEY) !== 'dark') {
        localStorage.setItem(STORAGE_KEY, 'light');
      }
    } catch {}
  }

  function getTheme() {
    ensureDefaultTheme();
    try {
      return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  }

  function applyTheme(theme) {
    const normalized = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = normalized;
    if (document.body) {
      document.body.classList.toggle('dark', normalized === 'dark');
      document.body.classList.toggle('light', normalized === 'light');
    }

    const button = document.getElementById('themeBtn');
    if (button) {
      button.textContent = normalized === 'light' ? '🌙' : '☀️';
      button.title = normalized === 'light' ? 'Dark mode' : 'Light mode';
      button.setAttribute('aria-label', button.title);
    }
    return normalized;
  }

  function saveTheme(theme) {
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
    applyTheme(theme);
    window.dispatchEvent(new CustomEvent('izitrader:theme-change', { detail: { theme } }));
  }

  function bind() {
    let currentTheme = applyTheme(getTheme());
    const button = document.getElementById('themeBtn');
    if (!button || button.dataset.iziThemeToggle === '1') return;

    /* Replace the button so any legacy click handlers cannot force another theme. */
    const replacement = button.cloneNode(true);
    button.replaceWith(replacement);
    replacement.dataset.iziThemeToggle = '1';
    replacement.addEventListener('click', function () {
      currentTheme = currentTheme === 'light' ? 'dark' : 'light';
      saveTheme(currentTheme);
    });
  }

  window.IziThemeToggle = { applyTheme, saveTheme, getTheme, bind };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
