(function(){
  'use strict';
  let sessionPnl=0;
  const $=id=>document.getElementById(id);
  const lang=()=>localStorage.getItem('izitrader_lang')||'pt';
  const resultLabel=positive=>{const l=lang();if(l==='en')return positive?'WIN':'LOSS';if(l==='es')return positive?'GANANCIA':'PÉRDIDA';return positive?'GANHO':'PERDA';};
  const setPnl=()=>{const el=$('pnl');if(!el)return;const n=Number(sessionPnl)||0;el.textContent=(n>=0?'+':'-')+'$'+Math.abs(n).toFixed(2);el.style.color=n<0?'#e24b4a':n>0?'#f5c04a':'#fff';};
  const amountFromItem=item=>{const m=String(item.textContent||'').match(/([+-])\s*\$\s*(\d+(?:[.,]\d+)?)/);if(!m)return null;const n=Number(m[2].replace(',','.'));return Number.isFinite(n)?(m[1]==='-'?-n:n):null;};
  const cleanHistory=()=>{const h=$('historyScroll');if(!h)return;[...h.children].forEach(item=>{const text=String(item.textContent||'');const result=item.querySelector('.result');const amount=amountFromItem(item);if(/ABERTO|OPEN/i.test(text)||amount===null||!result||/ABERTO|OPEN/i.test(result.textContent||'')){item.remove();return;}const positive=amount>=0;item.querySelector('.bot')?.remove();item.querySelector('.time')?.remove();const digit=item.querySelector('.digit');if(digit)digit.textContent=(positive?'+':'-')+'$'+Math.abs(amount).toFixed(2);result.textContent=resultLabel(positive);result.className='result '+(positive?'win':'loss');item.style.height='38px';item.style.minHeight='38px';item.style.padding='3px 6px';item.style.margin='1px 0';item.style.display='flex';item.style.alignItems='center';item.style.justifyContent='center';item.style.gap='4px';item.style.whiteSpace='nowrap';});while(h.children.length>12)h.lastElementChild.remove();};
  const style=()=>{if($('iziHistoryCss'))return;const s=document.createElement('style');s.id='iziHistoryCss';s.textContent='#historyScroll{height:42px!important;max-height:42px!important;min-height:42px!important;overflow-y:hidden!important;overflow-x:hidden!important;padding:1px 0!important;scrollbar-width:none!important;-ms-overflow-style:none!important}#historyScroll::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}.history-item{height:38px!important;min-height:38px!important;margin:1px 0!important;padding:3px 6px!important}.history-item .bot,.history-item .time{display:none!important}.history-item .digit{font-size:14px!important;font-weight:800!important}.history-item .result{font-size:12px!important;font-weight:800!important}.history-item .result.win{color:#f5c04a!important}.history-item .result.loss{color:#e24b4a!important}';document.head.appendChild(s);};
  const refresh=()=>{style();setPnl();cleanHistory();const st=$('statusText');if(st){const m=String(st.textContent||'').match(/^Conta\s+(Real|Demo)\s+ligada\s+—/i);if(m)st.textContent='Conta '+m[1]+' ligada';}};
  document.addEventListener('DOMContentLoaded',()=>{sessionPnl=0;refresh();});
  window.addEventListener('izitrader:ws-open',()=>{sessionPnl=0;setPnl();cleanHistory();});
  window.addEventListener('izitrader:buy',()=>setTimeout(cleanHistory,0));
  window.addEventListener('izitrader:contract-closed',e=>{const p=Number(e.detail?.profit_loss??e.detail?.profit);if(Number.isFinite(p)){sessionPnl+=p;setPnl();}setTimeout(cleanHistory,0);});
  window.addEventListener('storage',refresh);
})();
