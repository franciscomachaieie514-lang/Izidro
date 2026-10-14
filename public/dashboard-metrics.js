/* Izitrader dashboard metrics — safe history formatting. */
(function () {
  'use strict';

  const BLUE = '#3b82f6';
  const RED = 'var(--red)';
  const $ = (selector) => document.querySelector(selector);

  function installStyles() {
    if ($('#iziDashboardMetricsStyle')) return;
    const style = document.createElement('style');
    style.id = 'iziDashboardMetricsStyle';
    style.textContent =
      '.history-card{background:var(--panel,var(--card));border:1px solid var(--border);border-radius:16px;padding:14px 20px 12px;margin-bottom:18px}' +
      '.history-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px}' +
      '.history-title{font-size:12px;color:var(--muted);letter-spacing:.04em}' +
      '.history-hint{font-size:12px;color:var(--muted)}' +
      '.history-row{display:flex;gap:5px;padding-bottom:4px;margin-bottom:3px;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch}' +
      '.history-row .chip{flex:0 0 calc((100% - 20px)/5);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;background:var(--panel-2,var(--field));border:1px solid var(--border);border-radius:10px;padding:9px 2px;font-family:var(--mono,monospace);font-size:12px;font-weight:700;white-space:nowrap;min-width:0}' +
      '.history-row .chip.win,.history-row .chip.loss{color:var(--text)}' +
      '.history-row .chip-tag{font-family:var(--mono,monospace);font-size:12px;font-weight:700;letter-spacing:.01em}' +
      '.history-row .chip.win .chip-tag{color:' + BLUE + '}' +
      '.history-row .chip.loss .chip-tag{color:' + RED + '}' +
      '.history-row .chip-digit{display:none!important}' +
      '.history-foot{display:flex;justify-content:center;gap:8px;padding-top:3px;border-top:1px solid var(--border);font-size:13px;color:var(--muted);letter-spacing:.04em}' +
      '.history-foot b{color:var(--text);font-family:var(--mono,monospace);font-size:15px}';
    document.head.appendChild(style);
  }

  function getHistoryRow() {
    let row = $('#historyRow');
    if (!row) {
      row = $('#historyScroll');
      if (row) row.id = 'historyRow';
    }
    return row;
  }

  function currentLanguage() {
    try {
      const value = localStorage.getItem('izitrader_language') || localStorage.getItem('izitrader_lang') || 'en';
      return ['en', 'pt', 'es'].includes(value) ? value : 'en';
    } catch (_) {
      return 'en';
    }
  }

  function ensureHistory() {
    const row = getHistoryRow();
    if (!row) return null;
    const card = row.closest('.history-card') || row.closest('.card');
    if (card) card.classList.add('history-card');

    if (card && !card.querySelector('.history-head')) {
      const header = document.createElement('div');
      header.className = 'history-head';
      header.innerHTML = '<div class="history-title"></div><div class="history-hint"></div>';
      card.insertBefore(header, row);
    }
    return row;
  }

  function formatHistory() {
    const row = getHistoryRow();
    if (!row) return;

    const lang = currentLanguage();
    const labels = {
      en: { win: 'WIN', loss: 'LOSS', title: 'RECENT HISTORY', hint: 'Swipe to see more →' },
      pt: { win: 'GANHO', loss: 'PERDA', title: 'HISTÓRICO RECENTE', hint: 'Deslize para ver mais →' },
      es: { win: 'GANANCIA', loss: 'PÉRDIDA', title: 'HISTORIAL RECIENTE', hint: 'Deslice para ver más →' }
    }[lang];

    const card = row.closest('.history-card');
    const title = card && card.querySelector('.history-title');
    const hint = card && card.querySelector('.history-hint');
    if (title) title.textContent = labels.title;
    if (hint) hint.textContent = labels.hint;

    row.querySelectorAll('.chip').forEach((item) => {
      const amount = item.querySelector('.chip-amount');
      const tag = item.querySelector('.chip-tag');
      if (!amount || !tag) return;

      const raw = amount.textContent.trim().replace(/\s+/g, '').replace(',', '.');
      const match = raw.match(/^([+-])\$?(\d+(?:\.\d{1,2})?)$/);
      if (!match) return;

      const won = match[1] === '+';
      amount.textContent = (won ? '+' : '-') + '$' + Number(match[2]).toFixed(2);
      tag.textContent = won ? labels.win : labels.loss;
      item.classList.toggle('win', won);
      item.classList.toggle('loss', !won);
    });

    const count = $('#opsCount');
    if (count) count.textContent = String(row.querySelectorAll('.chip[data-closed="1"]').length);
  }

  function start() {
    installStyles();
    ensureHistory();
    formatHistory();
    window.addEventListener('izitrader:contract-closed', () => requestAnimationFrame(formatHistory));
    window.addEventListener('izitrader:history-load', () => requestAnimationFrame(formatHistory));
    window.addEventListener('izitrader:language-change', () => requestAnimationFrame(formatHistory));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();