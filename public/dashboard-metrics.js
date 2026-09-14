/* IziTrader dashboard metrics: restored visual treatment for P/L, Positions and recent results. */
(function(){
  'use strict';
  const YELLOW='#f5c04a';
  const $=s=>document.querySelector(s);

  function installStyles(){
    if($('#iziDashboardMetricsStyle')) return;
    const s=document.createElement('style');
    s.id='iziDashboardMetricsStyle';
    s.textContent=`
      .balance-row .positions-block{flex:1!important;min-width:0}
      .balance-row .positions-block .value,
      .balance-row #pnl{color:${YELLOW}!important}
      .balance-row .positions-block .label{color:var(--muted)}
      #historyScroll .history-item .digit,
      #historyScroll .history-item .result{color:${YELLOW}!important;font-weight:800!important}
      #historyScroll .history-item .result.win,
      #historyScroll .history-item .result.loss{color:${YELLOW}!important}
      #historyScroll .history-item .digit-row{display:flex;align-items:baseline;gap:6px}
      #historyScroll .history-item .result{font-size:9px!important;white-space:nowrap}
      @media(max-width:599px){.balance-row .divider{margin:0 10px}.balance-row .value{font-size:18px}.balance-row .label{font-size:10px}}
    `;
    document.head.appendChild(s);
  }

  function ensurePositions(){
    const row=$('.balance-row');
    if(!row || $('#positionsValue')) return;
    const divider=document.createElement('div');
    divider.className='divider';
    const block=document.createElement('div');
    block.className='positions-block';
    block.innerHTML='<div class="label">POSITIONS</div><div class="value" id="positionsValue">0</div>';
    row.appendChild(divider);
    row.appendChild(block);
  }

  function formatResultItem(item){
    if(!item) return;
    const result=item.querySelector('.result');
    const digit=item.querySelector('.digit');
    if(!result || !digit) return;
    const raw=(digit.textContent||'').trim();
    const value=raw.replace(/\$/g,'');
    const isWin=result.classList.contains('win') || /^\+/.test(value);
    result.textContent=isWin?'GANHO':'PERDA';
    digit.textContent=value;
    digit.style.color=YELLOW;
    result.style.color=YELLOW;
  }

  function formatHistory(){
    document.querySelectorAll('#historyScroll .history-item').forEach(formatResultItem);
  }

  function getPositions(){
    try{return Number(sessionStorage.getItem('izitrader_positions')||0)}catch{return 0}
  }
  function setPositions(n){
    const value=Math.max(0,Number(n)||0);
    const el=$('#positionsValue');
    if(el)el.textContent=String(value);
    try{sessionStorage.setItem('izitrader_positions',String(value))}catch{}
  }

  function syncExistingHistory(){
    const items=[...document.querySelectorAll('#historyScroll .history-item')];
    const stored=getPositions();
    setPositions(Math.max(stored,items.length));
    formatHistory();
  }

  function start(){
    installStyles();
    ensurePositions();
    setPositions(getPositions());
    syncExistingHistory();

    window.addEventListener('izitrader:contract-closed',()=>{
      setPositions(getPositions()+1);
      requestAnimationFrame(formatHistory);
    });

    const history=$('#historyScroll');
    if(history && !history.dataset.metricsObserver){
      const observer=new MutationObserver(()=>formatHistory());
      observer.observe(history,{childList:true,subtree:true});
      history.dataset.metricsObserver='1';
    }

    const pnl=$('#pnl');
    if(pnl) pnl.style.color=YELLOW;
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start);
  else start();
})();
