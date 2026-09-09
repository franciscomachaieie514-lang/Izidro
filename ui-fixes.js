(function(){
  'use strict';
  let sessionPnl=0;
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
    el.textContent=(n>=0?'+':'-')+'$'+Math.abs(n).toFixed(2);
    el.style.color=n<0?'#e24b4a':n>0?'#f5c04a':'#fff';
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
    const h=document.getElementById('historyScroll'); if(!h)return;
    h.style.scrollbarWidth='none';
    h.style.msOverflowStyle='none';
    [...h.children].forEach(item=>{
      const text=String(item.textContent||'');
      if(/Aposta\s*\$/i.test(text)&&/ABERTO/i.test(text)){item.remove();return;}
      const amount=numericAmount(item);
      if(amount===null)return;
      const positive=amount>=0;
      item.querySelector('.bot')?.remove();
      item.querySelector('.time')?.remove();
      const digit=item.querySelector('.digit');
      const result=item.querySelector('.result');
      if(digit){digit.textContent=(positive?'+':'-')+'$'+Math.abs(amount).toFixed(2);digit.style.fontWeight='800';}
      if(result){result.textContent=resultLabel(positive);result.className='result '+(positive?'win':'loss');}
      item.style.minWidth='88px';
      item.style.display='flex';
      item.style.alignItems='center';
      item.style.justifyContent='center';
      item.style.gap='3px';
      item.style.whiteSpace='nowrap';
    });
  };
  const cleanStatus=()=>{
    const el=document.getElementById('statusText');if(!el)return;
    const text=String(el.textContent||'');
    const m=text.match(/^Conta\s+(Real|Demo)\s+ligada\s+—/i);
    if(m)el.textContent='Conta '+m[1]+' ligada';
  };
  const style=()=>{
    if(document.getElementById('iziHistoryCss'))return;
    const css=document.createElement('style');css.id='iziHistoryCss';
    css.textContent='#historyScroll{scrollbar-width:none!important;-ms-overflow-style:none!important}#historyScroll::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}.history-item .bot,.history-item .time{display:none!important}.history-item .result.win{color:#f5c04a!important}.history-item .result.loss{color:#e24b4a!important}';
    document.head.appendChild(css);
  };
  document.addEventListener('DOMContentLoaded',()=>{sessionPnl=0;style();setPnl();cleanHistory();cleanStatus();});
  window.addEventListener('izitrader:pnl',()=>{setPnl();cleanHistory();cleanStatus();});
  window.addEventListener('izitrader:ws-open',()=>{sessionPnl=0;setPnl();cleanHistory();cleanStatus();});
  window.addEventListener('storage',()=>{cleanHistory();cleanStatus();});
  window.addEventListener('izitrader:buy',()=>{setTimeout(cleanHistory,0);});
  window.addEventListener('izitrader:contract-closed',e=>{
    const c=e.detail||{},profit=Number(c.profit_loss??c.profit);
    if(Number.isFinite(profit)){sessionPnl+=profit;setPnl();}
    setTimeout(cleanHistory,0);
  });
  const observer=new MutationObserver(()=>{style();cleanHistory();cleanStatus();});
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
})();
