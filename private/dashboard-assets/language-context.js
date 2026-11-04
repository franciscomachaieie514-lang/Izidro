/* Izitrader LanguageContext — shared presentation labels used by UI components. */
(function () {
  'use strict';
  const ACCOUNT_LABELS = {
    en: { real: 'Real', demo: 'Demo' },
    pt: { real: 'Real', demo: 'Demo' },
    es: { real: 'Real', demo: 'Demo' }
  };
  window.IziLanguageContext = {
    accountLabels(lang) { return ACCOUNT_LABELS[lang] || ACCOUNT_LABELS.en; }
  };
})();
