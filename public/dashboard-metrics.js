/* IziTrader dashboard metrics — screenshot-matched recent history + Positions. */
(function(){
  'use strict';

  const YELLOW='#f5c04a';
  const RED='#e24b4a';
  const MONEY=/^[+-]\$?\d+(?:\.\d{1,2})?$/;
  const $=s=>document.querySelector(s);
  const seenClosed=new Set();

  function installStyles(){
    if($('#iziDashboardMetricsStyle')) return;
    const s=document.createElement('style');
    s.id='iziDashboardMetricsStyle';
    s.textContent=`
      .balance-row #pnl{color:${YELLOW}!important}
      #historyScroll{display:flex!important;gap:10px;overflow-x:auto;overflow-y:hidden;touch-action:pan-x;-webkit-overflow-scrolling:touch}
      #historyScroll .history-item{flex:0 0 calc(25% - 7.5px)!important;min-width:0!important;max-width:calc(25% - 7.5px)!important;padding:10px 7px!important;white-space:nowrap;overflow:hidden}
      #historyScroll .history-item .bot,
      #historyScroll .history-item .time{display:none!important}
      #historyScroll .history-item .digit-row{display:flex;align-items:baseline;justify-content:center;gap:5px;min-width:0}
      #historyScroll .history-item .digit{font-size:14px!important;font-weight:800!important;color:${YELLOW}!important;white-space:nowrap}
      #historyScroll .history-item .result{font-size:9px!important;font-weight:800!important;white-space:nowrap}
      #historyScroll .history-item .result.win{color:${YELLOW}!important}
      #historyScroll .history-item .result.loss{color:${RED}!important}
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

  function normalizeAmount(raw){
    const v=String(raw||'').trim().replace(/\s+/g,'');
    if(!MONEY.test(v)) return null;
    const sign=v.charAt(0);
    const number=v.slice(1).replace('$','');
    return sign+'$'+Number(number).toFixed(2);
  }

  function formatResultItem(item){
    if(!item) return false;
    const result=item.querySelector('.result');
    const digit=item.querySelector('.digit');
    if(!result || !digit) return false;

    let amount=normalizeAmount(digit.textContent);
    if(!amount){
      const fallback=item.dataset.profit || item.querySelector('.profit')?.textContent || '';
      amount=normalizeAmount(fallback);
    }

    // Legacy/malformed cards such as raw contract IDs are not closed-trade results.
    if(!amount){
      item.remove();
      return false;
    }

    const win=amount.charAt(0)==='+';
    const resultText=win?'GANHO':'PERDA';
    const resultClass=win?'win':'loss';

    if(digit.textContent!==amount) digit.textContent=amount;
    if(result.textContent!==resultText) result.textContent=resultText;
    if(!result.classList.contains(resultClass)){
      result.classList.remove('win','loss');
      result.classList.add(resultClass);
    }
    if(digit.style.color!==YELLOW) digit.style.color=YELLOW;
    if(result.style.color!==(win?YELLOW:RED)) result.style.color=win?YELLOW:RED;
    return true;
  }

  function formatHistory(){
    document.querySelectorAll('#historyScroll .history-item').forEach(formatResultItem);
  }

  function getPositions(){
    try{
      const n=Number(sessionStorage.getItem('izitrader_positions')||0);
      return Number.isFinite(n)&&n>0?n:0;
    }catch{return 0}
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

  function start(){
    installStyles();
    ensurePositionsFooter();
    setPositions(getPositions());
    formatHistory();

    window.addEventListener('izitrader:contract-closed',(event)=>{
      const d=event?.detail||{};
      const id=String(d.contract_id||d.contractId||'');
      if(id && seenClosed.has(id)) return;
      if(id) seenClosed.add(id);
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

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
