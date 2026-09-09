(function(){
  'use strict';
  let sessionPnl=0;
  const pnlEl=()=>document.getElementById('pnl');
  const setPnl=()=>{
    const el=pnlEl(); if(!el)return;
    const n=Number(sessionPnl||0);
    el.textContent=(n>=0?'+':'-')+'$'+Math.abs(n).toFixed(2);
    el.style.color=n<0?'#e24b4a':n>0?'#f5c04a':'#fff';
  };
  const money=v=>(Number(v)>=0?'+':'-')+'$'+Math.abs(Number(v)||0).toFixed(2);
  const styleHistory=()=>{
    const h=document.getElementById('historyScroll'); if(!h)return;
    h.style.overflowX='auto';
    h.style.scrollbarWidth='none';
    h.querySelectorAll('.history-item').forEach(item=>{
      item.style.scrollbarWidth='none';
      const result=item.querySelector('.result');
      if(result){
        const t=String(result.textContent||'').toUpperCase();
        result.style.color=t==='LOSS'?'#e24b4a':t==='WIN'?'#f5c04a':'';
      }
    });
  };
  document.addEventListener('DOMContentLoaded',()=>{
    const css=document.createElement('style');
    css.textContent='#historyScroll::-webkit-scrollbar{display:none;width:0;height:0}#historyScroll{scrollbar-width:none!important;-ms-overflow-style:none!important}.history-item .digit{font-weight:800}.history-item .result.win{color:#f5c04a!important}.history-item .result.loss{color:#e24b4a!important}';
    document.head.appendChild(css);
    sessionPnl=0;setPnl();styleHistory();
  });
  window.addEventListener('izitrader:pnl',()=>{sessionPnl=0;setPnl();styleHistory();});
  window.addEventListener('izitrader:ws-open',()=>{sessionPnl=0;setPnl();});
  window.addEventListener('izitrader:buy',e=>{
    const c=e.detail||{};
    setTimeout(()=>{
      const id=String(c.contract_id||'');
      const item=[...document.querySelectorAll('.history-item')].find(x=>x.dataset.contractId===id);
      if(item){const d=item.querySelector('.digit');if(d)d.textContent=money(-(Number(c.buy_price??c.price??0)||0));styleHistory();}
    },0);
  });
  window.addEventListener('izitrader:contract-closed',e=>{
    const c=e.detail||{},profit=Number(c.profit_loss);
    if(Number.isFinite(profit)){sessionPnl+=profit;setPnl();}
    setTimeout(()=>{
      const id=String(c.contract_id||'');
      const item=[...document.querySelectorAll('.history-item')].find(x=>x.dataset.contractId===id);
      if(item){
        const d=item.querySelector('.digit'),r=item.querySelector('.result');
        if(d)d.textContent=money(profit);
        if(r){r.textContent=profit>=0?'WIN':'LOSS';r.className='result '+(profit>=0?'win':'loss');}
      }
      styleHistory();
    },0);
  });
  const observer=new MutationObserver(styleHistory);
  observer.observe(document.documentElement,{subtree:true,childList:true});
})();
