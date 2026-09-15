/* Izitrader AccountLabel — presentation-only account inversion for one platform user. */
(function () {
  'use strict';
  if (window.IziAccountLabel) return;

  const SPECIAL_EMAIL = 'ezidrotrader@gmail.com';
  let authMe = null;
  let loaded = false;

  function normalizeAccount(account) {
    return account === 'demo' ? 'demo' : 'real';
  }

  function getLanguage() {
    return localStorage.getItem('izitrader_lang') || document.documentElement.lang || 'en';
  }

  function labelsFor(lang) {
    const context = window.IziLanguageContext;
    if (context && typeof context.accountLabels === 'function') return context.accountLabels(lang);
    const fallback = { en: { real: 'Real', demo: 'Demo' }, pt: { real: 'Real', demo: 'Demo' }, es: { real: 'Real', demo: 'Demo' } };
    return fallback[lang] || fallback.en;
  }

  function presentationAccount(account) {
    const normalized = normalizeAccount(account);
    if (authMe?.user?.email?.toLowerCase() === SPECIAL_EMAIL) return normalized === 'demo' ? 'real' : 'demo';
    return normalized;
  }

  function AccountLabel(account) {
    return labelsFor(getLanguage())[presentationAccount(account)];
  }

  function apply() {
    const select = document.getElementById('iziAccountSelect');
    if (!select) return;
    const labels = labelsFor(getLanguage());
    const inverted = authMe?.user?.email?.toLowerCase() === SPECIAL_EMAIL;
    const real = select.querySelector('option[value="real"]');
    const demo = select.querySelector('option[value="demo"]');
    if (real) real.textContent = inverted ? labels.demo : labels.real;
    if (demo) demo.textContent = inverted ? labels.real : labels.demo;
    select.dataset.accountPresentation = inverted ? 'inverted' : 'normal';
  }

  async function loadOnce() {
    if (loaded) return;
    loaded = true;
    try {
      const response = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
      authMe = response.ok ? await response.json() : null;
    } catch {
      authMe = null;
    }
    apply();
    window.dispatchEvent(new CustomEvent('izitrader:account-label-ready', {
      detail: { inverted: authMe?.user?.email?.toLowerCase() === SPECIAL_EMAIL }
    }));
  }

  window.IziAccountLabel = { AccountLabel, presentationAccount, loadOnce, apply };
  window.addEventListener('izitrader:language-change', apply);
  const observer = new MutationObserver(() => apply());
  if (document.body) observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadOnce, { once: true });
  else loadOnce();
})();
