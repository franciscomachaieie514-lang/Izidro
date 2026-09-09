(function(){
  'use strict';
  let sessionPnl=0;
  let cleaning=false;
  let cleanQueued=false;
  const pnlEl=()=>document.getElementById('pnl');
  const lang=()=>localStorage.getItem('izitrader_lang')||'pt';
  const resultLabel=(positive)=>{
    const l=lang();
    if(l==='en')return positive?'WIN':'LOSS';
    if(l==='es')return positive?'GANANCIA':'PÉRDIDA';
    return positive?'GANHO':'PERDA';
  };
  const setPnl=()=>{
    const el=pnlEl(); if(!el)return;
    const n=Number(sessionPnl||0);
    const next=(n>=0?'+':'-')+'$'+Math.abs(n).toFixed(2);
    if(el.textContent!==next)el.textContent=next;
    const color=n<0?'#e24b4a':n>0?'#f5c04a':'#fff';
    if(el.style.color!==color)el.style.color=color;
  };
  const numericAmount=item=>{
    const text=String(item.textContent||'');
    const matches=[...text.matchAll(/([+-])\s*\$\s*(\d+(?:[.,]\d+)?)/g)];
    if(!matches.length)return null;
    const m=matches[matches.length-1];
    const n=Number(m[2].replace(',','.'));
    if(!Number.isFinite(n))return null;
    return m[1]==='-'?-n:n;
  };
  const cleanHistory=()=>{
    const h=document.getElementById('historyScroll'); if(!h||cleaning)return;
    cleaning=true;
    try{
      [...h.children].forEach(item=>{
        const text=String(item.textContent||'');
        const result=item.querySelector('.result');
        const amount=numericAmount(item);
        if(/ABERTO/i.test(text)||amount===null||!result||/ABERTO/i.test(result.textContent||'')){item.remove();return;}
        const positive=amount>=0;
        item.querySelector('.bot')?.remove();
        item.querySelector('.time')?.remove();
        const digit=item.querySelector('.digit');
        const signed=(positive?'+':'-')+'$'+Math.abs(amount).toFixed(2);
        if(digit){if(digit.textContent!==signed)digit.textContent=signed;digit.style.fontWeight='800';}
        const label=resultLabel(positive);
        if(result.textContent!==label)result.textContent=label;
        result.className='result '+(positive?'win':'loss');
        item.style.minWidth='88px';
        item.style.height='34px';
        item.style.padding='4px 7px';
        item.style.display='flex';
        item.style.alignItems='center';
        item.style.justifyContent='center';
        item.style.gap='3px';
        item.style.whiteSpace='nowrap';
      });
      while(h.children.length>12)h.lastElementChild.remove();
    }finally{cleaning=false;}
  };
  const queueClean=()=>{
    if(cleanQueued)return;
    cleanQueued=true;
    requestAnimationFrame(()=>{cleanQueued=false;if(!cleaning)cleanHistory();});
  };
  const cleanStatus=()=>{
    const el=document.getElementById('statusText');if(!el)return;
    const text=String(el.textContent||'');
    const m=text.match(/^Conta\s+(Real|Demo)\s+ligada\s+—/i);
    if(m){const next='Conta '+m[1]+' ligada';if(el.textContent!==next)el.textContent=next;}
  };
  const style=()=>{
    if(document.getElementById('iziHistoryCss'))return;
    const css=document.createElement('style');css.id='iziHistoryCss';
    css.textContent='#historyScroll{height:152px!important;max-height:152px!important;overflow-y:auto!important;overflow-x:hidden!important;scrollbar-width:none!important;-ms-overflow-style:none!important;padding:2px 0!important}#historyScroll::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}.history-item{min-height:34px!important;height:34px!important;margin:2px 0!important;padding:4px 7px!important}.history-item .bot,.history-item .time{display:none!important}.history-item .result.win{color:#f5c04a!important}.history-item .result.loss{color:#e24b4a!important}';
    document.head.appendChild(css);
  };
  const refresh=()=>{style();setPnl();cleanHistory();cleanStatus();};
  document.addEventListener('DOMContentLoaded',()=>{sessionPnl=0;refresh();});
  window.addEventListener('izitrader:pnl',()=>{setPnl();queueClean();cleanStatus();});
  window.addEventListener('izitrader:ws-open',()=>{sessionPnl=0;setPnl();queueClean();cleanStatus();});
  window.addEventListener('storage',()=>{queueClean();cleanStatus();});
  window.addEventListener('izitrader:buy',()=>queueClean());
  window.addEventListener('izitrader:contract-closed',e=>{
    const c=e.detail||{},profit=Number(c.profit_loss??c.profit);
    if(Number.isFinite(profit)){sessionPnl+=profit;setPnl();}
    queueClean();
  });
  const observer=new MutationObserver(()=>{
    if(cleaning)return;
    queueClean();
    cleanStatus();
  });
  observer.observe(document.documentElement,{subtree:true,childList:true});
})();
