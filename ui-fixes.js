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
    el.style.color=n<0?'#e24b4a':n>0?'#f5c04a':'#fff';
  };
  const numericAmount=item=>{
    const text=String(item.textContent||'');
    const matches=[...text.matchAll(/([+-])\s*\$\s*(\d+(?:[.,]\d+)?)/g)];
    if(!matches.length)return null;
    const m=matches[matches.length-1];
    const n=Number(m[2].replace(',','.'));
    return Number.isFinite(n)?(m[1]==='-'?-n:n):null;
  };
  const cleanHistory=()=>{
    const h=document.getElementById('historyScroll');if(!h||cleaning)return;
    cleaning=true;
    try{
      h.style.scrollbarWidth='none';
      h.style.msOverflowStyle='none';
      [...h.children].forEach(item=>{
        const text=String(item.textContent||'');
        const result=item.querySelector('.result');
        const amount=numericAmount(item);
        const open=/ABERTO|OPEN/i.test(text)||(result&&!/^(GANHO|PERDA|WIN|LOSS|GANANCIA|PÉRDIDA)$/i.test(result.textContent.trim()));
        if(open||amount===null||!result){item.remove();return;}
        const positive=amount>=0;
        item.querySelector('.bot')?.remove();
        item.querySelector('.time')?.remove();
        const digit=item.querySelector('.digit');
        const signed=(positive?'+':'-')+'$'+Math.abs(amount).toFixed(2);
        if(digit){digit.textContent=signed;digit.style.fontSize='11px';digit.style.fontWeight='700';}
        result.textContent=resultLabel(positive);
        result.className='result '+(positive?'win':'loss');
        result.style.fontSize='10px';
        item.style.minWidth='0';
        item.style.height='28px';
        item.style.minHeight='28px';
        item.style.margin='1px 0';
        item.style.padding='2px 4px';
        item.style.display='flex';
        item.style.alignItems='center';
        item.style.justifyContent='center';
        item.style.gap='2px';
        item.style.whiteSpace='nowrap';
      });
      while(h.children.length>10)h.lastElementChild.remove();
    }finally{cleaning=false;}
  };
  const queueClean=()=>{
    if(cleanQueued)return;
    cleanQueued=true;
    requestAnimationFrame(()=>{cleanQueued=false;if(!cleaning)cleanHistory();});
  };
  const cleanStatus=()=>{
    const el=document.getElementById('statusText');if(!el)return;
    const m=String(el.textContent||'').match(/^Conta\s+(Real|Demo)\s+ligada\s+—/i);
    if(m)el.textContent='Conta '+m[1]+' ligada';
  };
  const style=()=>{
    if(document.getElementById('iziHistoryCss'))return;
    const css=document.createElement('style');css.id='iziHistoryCss';
    css.textContent='#historyScroll{height:116px!important;max-height:116px!important;overflow-y:auto!important;overflow-x:hidden!important;scrollbar-width:none!important;-ms-overflow-style:none!important;padding:2px 0!important}#historyScroll::-webkit-scrollbar{display:none!important;width:0!important;height:0!important}.history-item{height:28px!important;min-height:28px!important;margin:1px 0!important;padding:2px 4px!important}.history-item .bot,.history-item .time{display:none!important}.history-item .digit{font-size:11px!important}.history-item .result{font-size:10px!important}.history-item .result.win{color:#f5c04a!important}.history-item .result.loss{color:#e24b4a!important}.history-item .digit-row{gap:2px!important;line-height:1!important}';
    document.head.appendChild(css);
  };
  const refresh=()=>{style();setPnl();cleanHistory();cleanStatus();};
  document.addEventListener('DOMContentLoaded',()=>{sessionPnl=0;refresh();});
  window.addEventListener('izitrader:pnl',()=>{setPnl();cleanStatus();});
  window.addEventListener('izitrader:ws-open',()=>{sessionPnl=0;setPnl();queueClean();cleanStatus();});
  window.addEventListener('storage',()=>{queueClean();cleanStatus();});
  window.addEventListener('izitrader:buy',()=>{});
  window.addEventListener('izitrader:contract-closed',e=>{
    const c=e.detail||{},profit=Number(c.profit_loss??c.profit);
    if(Number.isFinite(profit)){sessionPnl+=profit;setPnl();}
    queueClean();
  });
  let lastSignature='';
  const observer=new MutationObserver(()=>{
    const h=document.getElementById('historyScroll');
    const signature=h?[...h.children].map(x=>x.textContent).join('|'):'';
    if(signature!==lastSignature){lastSignature=signature;queueClean();}
    cleanStatus();
  });
  observer.observe(document.documentElement,{subtree:true,childList:true,characterData:true});
})();
