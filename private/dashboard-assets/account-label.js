/* Izitrader account-label presentation. User allowlist is evaluated server-side. */
(function () {
  'use strict';
  if (window.IziAccountLabel) return;

  let inverted = false;
  let loaded = false;

  function normalizeAccount(account) {
    return account === 'demo' ? 'demo' : 'real';
  }

  function getLanguage() {
    const stored = localStorage.getItem('izitrader_language');
    const lang = stored || document.documentElement.lang || 'en';
    return ['en', 'pt', 'es'].includes(lang) ? lang : 'en';
  }

  function labelsFor(lang) {
    const context = window.IziLanguageContext;
    if (context && typeof context.accountLabels === 'function') return context.accountLabels(lang);
    const fallback = {
      en: { real: 'Real', demo: 'Demo' },
      pt: { real: 'Real', demo: 'Demo' },
      es: { real: 'Real', demo: 'Demo' }
    };
    return fallback[lang] || fallback.en;
  }

  function presentationAccount(account) {
    const normalized = normalizeAccount(account);
    return inverted ? (normalized === 'demo' ? 'real' : 'demo') : normalized;
  }

  function AccountLabel(account) {
    return labelsFor(getLanguage())[presentationAccount(account)];
  }

  function apply() {
    const select = document.getElementById('iziAccountSelect');
    if (!select) return;
    const labels = labelsFor(getLanguage());
    const realText = inverted ? labels.demo : labels.real;
    const demoText = inverted ? labels.real : labels.demo;
    const real = select.querySelector('option[value="real"]');
    const demo = select.querySelector('option[value="demo"]');
    if (real && real.textContent !== realText) real.textContent = realText;
    if (demo && demo.textContent !== demoText) demo.textContent = demoText;
    select.dataset.accountPresentation = inverted ? 'inverted' : 'normal';
  }

  async function loadOnce() {
    if (loaded) return;
    loaded = true;
    try {
      const response = await fetch('/api/account-presentation', {
        credentials: 'same-origin',
        cache: 'no-store'
      });
      const data = response.ok ? await response.json() : null;
      inverted = Boolean(data && data.inverted === true);
    } catch (_) {
      inverted = false;
    }
    apply();
    window.dispatchEvent(new CustomEvent('izitrader:account-label-ready', {
      detail: { inverted }
    }));
  }

  window.IziAccountLabel = { AccountLabel, presentationAccount, loadOnce, apply };
  window.addEventListener('izitrader:language-change', apply);
  window.addEventListener('storage', event => {
    if (event.key === 'izitrader_language' || event.key === 'izitrader_lang') apply();
  });

  const observer = new MutationObserver(() => apply());
  if (document.body) observer.observe(document.body, {
    subtree: true, childList: true, characterData: true
  });
  else document.addEventListener('DOMContentLoaded', () => observer.observe(document.body, {
    subtree: true, childList: true, characterData: true
  }), { once: true });

  loadOnce();
})();
