/* IziTrader dashboard metrics — screenshot-matched recent history + Positions. */
(function(){
  'use strict';
  const YELLOW='#f5c04a';
  const $=s=>document.querySelector(s);

  function installStyles(){
    if($('#iziDashboardMetricsStyle')) return;
    const s=document.createElement('style');
    s.id='iziDashboardMetricsStyle';
    s.textContent=`
      /* The reference dashboard keeps P/L in yellow. */
      .balance-row #pnl{color:${YELLOW}!important}

      /* Recent-history cards match the reference: compact amount + GANHO/PERDA. */
      #historyScroll{display:flex!important;gap:10px;overflow-x:auto;overflow-y:hidden;touch-action:pan-x;-webkit-overflow-scrolling:touch}
      #historyScroll .history-item{flex:0 0 calc(25% - 7.5px)!important;min-width:0!important;max-width:calc(25% - 7.5px)!important;padding:10px 7px!important;white-space:nowrap;overflow:hidden}
      #historyScroll .history-item .bot,
      #historyScroll .history-item .time{display:none!important}
      #historyScroll .history-item .digit-row{display:flex;align-items:baseline;justify-content:center;gap:5px;min-width:0}
      #historyScroll .history-item .digit{font-size:14px!important;font-weight:800!important;color:${YELLOW}!important}
      #historyScroll .history-item .result,
      #historyScroll .history-item .result.win,
      #historyScroll .history-item .result.loss{font-size:9px!important;font-weight:800!important;color:${YELLOW}!important;white-space:nowrap}

      /* Positions belongs below the recent-history divider, as in the reference image. */
      .izi-positions-footer{display:flex;align-items:center;justify-content:center;border-top:1px solid var(--border);margin-top:2px;padding-top:10px;font-size:13px;font-weight:800;letter-spacing:.03em;color:var(--muted)}
      .izi-positions-footer .positions-label{margin-right:7px}
      .izi-positions-footer .positions-value{color:var(--text);font-size:14px}

      @media(max-width:599px){
        .balance-row .value{font-size:18px}
        .balance-row .label{font-size:10px}
        #historyScroll .history-item{padding:10px 6px!important}
      }
    `;
    document.head.appendChild(s);
  }

  function ensurePositionsFooter(){
    const history=$('#historyScroll');
    if(!history) return;
    const card=history.closest('.card');
    if(!card) return;

    // Remove the previous version that incorrectly placed Positions in the balance row.
    const oldBalance=$('.balance-row .positions-block');
    if(oldBalance){
      const oldDivider=oldBalance.previousElementSibling;
      oldBalance.remove();
      if(oldDivider && oldDivider.classList.contains('divider')) oldDivider.remove();
    }

    let footer=card.querySelector('.izi-positions-footer');
    if(!footer){
      footer=document.createElement('div');
      footer.className='izi-positions-footer';
      footer.innerHTML='<span class="positions-label">POSITIONS</span><span class="positions-value" id="positionsValue">0</span>';
      card.appendChild(footer);
    }
  }

  function formatResultItem(item){
    if(!item) return;
    const result=item.querySelector('.result');
    const digit=item.querySelector('.digit');
    if(!result || !digit) return;

    const rawDigit=(digit.textContent||'').trim();
    const value=rawDigit.replace(/\$/g,'');
    const isWin=result.classList.contains('win') || /^\+/.test(value);
    const nextResult=isWin?'GANHO':'PERDA';

    // Only mutate when necessary: prevents MutationObserver -> DOM -> MutationObserver loops.
    if(result.textContent!==nextResult) result.textContent=nextResult;
    if(digit.textContent!==value) digit.textContent=value;
    if(digit.style.color!==YELLOW) digit.style.color=YELLOW;
    if(result.style.color!==YELLOW) result.style.color=YELLOW;
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
    if(el && el.textContent!==String(value)) el.textContent=String(value);
    try{
      const stored=sessionStorage.getItem('izitrader_positions');
      if(stored!==String(value)) sessionStorage.setItem('izitrader_positions',String(value));
    }catch{}
  }

  function syncExistingHistory(){
    const items=[...document.querySelectorAll('#historyScroll .history-item')];
    const stored=getPositions();
    setPositions(Math.max(stored,items.length));
    formatHistory();
  }

  function start(){
    installStyles();
    ensurePositionsFooter();
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
