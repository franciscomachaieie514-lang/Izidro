/* Izitrader slogan — follows the selected dashboard language. */
(function () {
  'use strict';
  if (window.IziSlogan) return;

  const TEXT = {
    en: 'Trade options',
    pt: 'Negocie opções',
    es: 'Opera opciones'
  };

  function getLanguage() {
    return localStorage.getItem('izitrader_lang') || document.documentElement.lang || 'en';
  }

  function apply() {
    const text = TEXT[getLanguage()] || TEXT.en;
    document.querySelectorAll('.izi-slogan').forEach((el) => {
      el.textContent = text;
    });
  }

  function ensure() {
    document.querySelectorAll('.auth-brand, .brand').forEach((brand) => {
      if (brand.querySelector('.izi-slogan')) return;
      const slogan = document.createElement('div');
      slogan.className = 'izi-slogan';
      brand.appendChild(slogan);
    });
    apply();
  }

  function boot() {
    if (!document.getElementById('iziSloganCss')) {
      const style = document.createElement('style');
      style.id = 'iziSloganCss';
      style.textContent = '.auth-brand,.brand{line-height:1.05}.izi-slogan{display:block;margin-top:1px;font-size:10px;font-weight:600;line-height:1;letter-spacing:.02em;color:var(--muted);white-space:nowrap;}';
      document.head.appendChild(style);
    }
    ensure();
  }

  window.IziSlogan = { apply, ensure };
  window.addEventListener('izitrader:language-change', apply);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
