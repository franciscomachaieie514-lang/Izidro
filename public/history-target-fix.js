/* Izitrader recent history + automatic target stop. */
(function(){
'use strict';
const $=s=>document.querySelector(s);
let sessionPnl=0,stoppedByTarget=false;
function n(v){const x=Number(v);return Number.isFinite(x)?x:0}
function targets(){return{profit:Math.max(0,n(localStorage.getItem('izitrader_profit_target'))),loss:Math.max(0,n(localStorage.getItem('izitrader_loss_target')))}}
function getHistory(){return $('#historyRow')||$('#historyScroll')}
function updateCount(){const row=getHistory();const count=$('#opsCount');if(count)count.textContent=String(row?.querySelectorAll('.chip').length||0)}
function removeOpenEntries(){const row=getHistory();if(!row)return;row.querySelectorAll('.chip[data-contract-id]:not([data-closed="1"])').forEach(x=>x.remove());updateCount()}
function hasClosedEntry(contractId){const row=getHistory();if(!row||!contractId)return false;return !!row.querySelector('.chip[data-contract-id="'+String(contractId).replace(/"/g,'')+'"][data-closed="1"]')}
function renderHistoryItem(h){const row=getHistory();if(!row)return;const chip=document.createElement('div');chip.className='chip '+(h.win?'win':'loss');chip.innerHTML='<span>'+h.v+'</span><span class="chip-tag">'+h.tag+'</span>';row.appendChild(chip);updateCount()}
function addHistory(profit){const value=n(profit);if(value===0)return;renderHistoryItem({v:(value>=0?'+':'-')+'$'+Math.abs(value).toFixed(2),tag:value>=0?'WIN':'LOSS',win:value>=0});const row=getHistory();if(row&&row.children.length>10)row.removeChild(row.firstElementChild);updateCount()}
function clearHistory(){const h=getHistory();if(!h)return;h.innerHTML='';updateCount()}
function scrollFix(){const h=getHistory();if(!h)return;h.style.overflowX='auto';h.style.overflowY='hidden';h.style.display='flex';h.style.flexWrap='nowrap';h.style.gap='5px';updateCount()}
function stopRobot(reason){if(stoppedByTarget)return;stoppedByTarget=true;const b=$('.operate-btn');if(b&&b.textContent.includes('PARAR'))b.click();const s=$('#statusText');if(s){s.textContent=reason;s.style.color='#f5a623'}localStorage.setItem('izitrader_target_stopped','1')}
function checkTargets(){const t=targets();if(t.profit>0&&sessionPnl>=t.profit)stopRobot('Profit target reached — bot stopped');else if(t.loss>0&&sessionPnl<=-t.loss)stopRobot('Loss target reached — bot stopped')}
function resetTargetState(){stoppedByTarget=false;sessionPnl=0;localStorage.removeItem('izitrader_target_stopped');clearHistory()}
function boot(){scrollFix();setTimeout(scrollFix,100)}
document.addEventListener('DOMContentLoaded',boot);
window.addEventListener('izitrader:ws-open',()=>{resetTargetState();scrollFix()});
window.addEventListener('izitrader:buy',()=>{removeOpenEntries()});
window.addEventListener('izitrader:contract-closed',e=>{const detail=e.detail||{};const profit=detail.profit_loss??detail.profit??0;sessionPnl+=n(profit);if(!hasClosedEntry(detail.contract_id))addHistory(profit);checkTargets()});
window.addEventListener('storage',()=>{scrollFix();checkTargets()});
})();
