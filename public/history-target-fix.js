/* Izitrader recent history — load closed trades and never erase live history. */
(function(){
'use strict';
const $=s=>document.querySelector(s);
function getHistory(){return $('#historyRow')||$('#historyScroll')}
function profitOf(c){const n=Number(c?.profit_loss??c?.profit);return Number.isFinite(n)?n:null}
function lastDigitOf(c){
  if(Number.isInteger(Number(c?.lastDigit))&&Number(c.lastDigit)>=0&&Number(c.lastDigit)<=9)return Number(c.lastDigit);
  const display=c?.exit_tick_display_value??c?.exit_spot_display_value??c?.sell_spot_display_value;
  const shown=String(display??'').match(/(\\d)\\s*$/);
  if(shown)return Number(shown[1]);
  return null;
}
function render(node,p,digit){
  const win=p>=0;
  node.className='chip '+(win?'win':'loss');
  node.dataset.closed='1';
  node.innerHTML='<span><span class="chip-amount">'+(win?'+':'-')+'
  const row=getHistory(),id=String(c?.contract_id||c?.transaction_id||''),p=profitOf(c);
  if(!row||!id||p===null)return;
  let node=[...row.querySelectorAll('.chip')].find(x=>String(x.dataset.contractId||'')===id);
  if(!node){node=document.createElement('div');node.dataset.contractId=id;row.prepend(node)}else{row.prepend(node)}
  render(node,p,lastDigitOf(c));
  row.scrollLeft=0;
  while(row.querySelectorAll('.chip').length>700){const last=row.lastElementChild;if(!last)break;last.remove()}
  const count=$('#opsCount');if(count)count.textContent=String(row.querySelectorAll('.chip[data-closed="1"]').length);
  try{localStorage.setItem('izitrader_operations',String(row.querySelectorAll('.chip[data-closed="1"]').length))}catch{}
}
function normalize(){
  const row=getHistory();if(!row)return;
  const seen=new Set();
  [...row.querySelectorAll('.chip')].forEach(node=>{
    const id=String(node.dataset.contractId||'');
    if(!id)return;
    if(seen.has(id))node.remove();else seen.add(id);
  });
  const count=$('#opsCount');if(count)count.textContent=String(row.querySelectorAll('.chip[data-closed="1"]').length);
}
window.addEventListener('izitrader:history-load',e=>upsert(e.detail||{}));
window.addEventListener('izitrader:contract-closed',()=>setTimeout(normalize,0));
window.izitraderResetHistory=normalize;
})();+Math.abs(p).toFixed(2)+'</span>'+(digit==null?'':'<span class="chip-digit">NR '+digit+'</span>')+'</span><span class="chip-tag">'+(win?'GANHO':'PERDA')+'</span>';
}
function upsert(c){
  const row=getHistory(),id=String(c?.contract_id||c?.transaction_id||''),p=profitOf(c);
  if(!row||!id||p===null)return;
  let node=[...row.querySelectorAll('.chip')].find(x=>String(x.dataset.contractId||'')===id);
  if(!node){node=document.createElement('div');node.dataset.contractId=id;row.prepend(node)}else{row.prepend(node)}
  render(node,p);
  row.scrollLeft=0;
  while(row.querySelectorAll('.chip').length>700){const last=row.lastElementChild;if(!last)break;last.remove()}
  const count=$('#opsCount');if(count)count.textContent=String(row.querySelectorAll('.chip[data-closed="1"]').length);
  try{localStorage.setItem('izitrader_operations',String(row.querySelectorAll('.chip[data-closed="1"]').length))}catch{}
}
function normalize(){
  const row=getHistory();if(!row)return;
  const seen=new Set();
  [...row.querySelectorAll('.chip')].forEach(node=>{
    const id=String(node.dataset.contractId||'');
    if(!id)return;
    if(seen.has(id))node.remove();else seen.add(id);
  });
  const count=$('#opsCount');if(count)count.textContent=String(row.querySelectorAll('.chip[data-closed="1"]').length);
}
window.addEventListener('izitrader:history-load',e=>upsert(e.detail||{}));
window.addEventListener('izitrader:contract-closed',()=>setTimeout(normalize,0));
window.izitraderResetHistory=normalize;
})();