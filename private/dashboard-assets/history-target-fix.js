/* Izitrader recent history — robust upsert and duplicate protection. */
(function () {
  'use strict';

  const $ = (selector) => document.querySelector(selector);

  function getHistory() {
    return $('#historyRow') || $('#historyScroll');
  }

  function profitOf(contract) {
    const value = Number(contract && (contract.profit_loss ?? contract.profit));
    return Number.isFinite(value) ? value : null;
  }

  function lastDigitOf(contract) {
    const direct = Number(contract && contract.lastDigit);
    if (Number.isInteger(direct) && direct >= 0 && direct <= 9) return direct;

    const display = contract && (
      contract.exit_tick_display_value ??
      contract.exit_spot_display_value ??
      contract.sell_spot_display_value
    );
    const shown = String(display ?? '').match(/(\d)\s*$/);
    if (shown) return Number(shown[1]);
    return null;
  }

  function render(node, profit, digit) {
    const won = profit >= 0;
    node.className = 'chip ' + (won ? 'win' : 'loss');
    node.dataset.closed = '1';
    node.innerHTML =
      '<span><span class="chip-amount">' +
      (won ? '+' : '-') + '$' + Math.abs(profit).toFixed(2) +
      '</span>' +
      (digit == null ? '' : '<span class="chip-digit">NR ' + digit + '</span>') +
      '</span><span class="chip-tag">' + (won ? 'GANHO' : 'PERDA') + '</span>';
  }

  function upsert(contract) {
    const row = getHistory();
    const id = String(contract && (contract.contract_id || contract.transaction_id) || '');
    const profit = profitOf(contract);
    if (!row || !id || profit === null) return;

    let node = Array.from(row.querySelectorAll('.chip')).find(
      (item) => String(item.dataset.contractId || '') === id
    );
    if (!node) {
      node = document.createElement('div');
      node.dataset.contractId = id;
    }

    node.dataset.contractId = id;
    render(node, profit, lastDigitOf(contract));
    row.prepend(node);
    row.scrollLeft = 0;

    while (row.querySelectorAll('.chip').length > 700) {
      const oldest = row.lastElementChild;
      if (!oldest) break;
      oldest.remove();
    }

    const count = $('#opsCount');
    if (count) count.textContent = String(row.querySelectorAll('.chip[data-closed="1"]').length);

    try {
      localStorage.setItem('izitrader_operations', String(row.querySelectorAll('.chip[data-closed="1"]').length));
    } catch (_) {}
  }

  function normalize() {
    const row = getHistory();
    if (!row) return;
    const seen = new Set();

    Array.from(row.querySelectorAll('.chip')).forEach((node) => {
      const id = String(node.dataset.contractId || '');
      if (!id) return;
      if (seen.has(id)) node.remove();
      else seen.add(id);
    });

    const count = $('#opsCount');
    if (count) count.textContent = String(row.querySelectorAll('.chip[data-closed="1"]').length);
  }

  window.addEventListener('izitrader:history-load', (event) => upsert(event.detail || {}));
  window.addEventListener('izitrader:contract-closed', (event) => {
    if (event.detail) upsert(event.detail);
    setTimeout(normalize, 0);
  });
  window.izitraderResetHistory = normalize;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', normalize, { once: true });
  } else {
    normalize();
  }
})();