(function(){'use strict';
function applyLayout(){
  const card=document.querySelector('.card:has(#historyScroll)');
  if(card){card.style.width='calc(100% - 24px)';card.style.maxWidth='396px';card.style.marginLeft='auto';card.style.marginRight='auto';}
  const row=document.getElementById('historyScroll');
  if(row){row.style.gap='4px';row.style.paddingBottom='10px';row.querySelectorAll('.chip').forEach(c=>{c.style.flex='0 0 72px';c.style.width='72px';c.style.padding='7px 2px';})}
}
function symbols(){
  const btn=document.getElementById('symbolBtn'),menu=document.getElementById('symbolMenu');
  if(!btn||!menu||btn.dataset.uiLayoutSymbols)return;
  btn.dataset.uiLayoutSymbols='1';
  const items=[['R_100','Volatility 100'],['R_75','Volatility 75'],['R_50','Volatility 50'],['R_25','Volatility 25'],['R_10','Volatility 10']];
  function open(e){e.preventDefault();e.stopPropagation();menu.innerHTML=items.map(x=>`<div class="symbol-item" data-symbol="${x[0]}"><span class="symbol-name">${x[0]}</span><span class="symbol-desc">${x[1]}</span></div>`).join('');menu.classList.add('open');menu.style.display='block';menu.style.zIndex='1000';}
  btn.addEventListener('click',open,true);
  menu.addEventListener('click',e=>{const item=e.target.closest('.symbol-item');if(!item)return;e.stopPropagation();const code=item.dataset.symbol;const sel=document.getElementById('selectedSymbol');if(sel)sel.textContent=code;localStorage.setItem('izitrader_symbol',code);menu.classList.remove('open');menu.style.display='none';window.dispatchEvent(new CustomEvent('izitrader:symbol-change',{detail:{symbol:code}}));});
  document.addEventListener('click',e=>{if(!menu.contains(e.target)&&e.target!==btn){menu.classList.remove('open');menu.style.display='none';}});
}
function boot(){applyLayout();symbols();setTimeout(applyLayout,100);setTimeout(applyLayout,500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
