/* Izitrader recent history — load closed trades and never erase live history. */
(function(){
'use strict';
const $=s=>document.querySelector(s);
function getHistory(){return $('#historyRow')||$('#historyScroll')}
function profitOf(c){const n=Number(c?.profit_loss??c?.profit);return Number.isFinite(n)?n:null}
function render(node,p){
  const win=p>=0;
  node.className='chip '+(win?'win':'loss');
  node.dataset.closed='1';
  node.innerHTML='<span>'+(win?'+':'-')+'$'+Math.abs(p).toFixed(2)+'</span><span class="chip-tag">'+(win?'GANHO':'PERDA')+'</span>';
}
function upsert(c){
  const row=getHistory(),id=String(c?.contract_id||c?.transaction_id||''),p=profitOf(c);
  if(!row||!id||p===null)return;
  let node=[...row.querySelectorAll('.chip')].find(x=>String(x.dataset.contractId||'')===id);
  if(!node){node=document.createElement('div');node.dataset.contractId=id;row.prepend(node)}
  render(node,p);
  while(row.querySelectorAll('.chip').length>20){const last=row.lastElementChild;if(!last)break;last.remove()}
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