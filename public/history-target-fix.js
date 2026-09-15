/* Izitrader recent history + automatic target stop. */
(function(){
'use strict';
const $=s=>document.querySelector(s);
let sessionPnl=0,stoppedByTarget=false;
const START_HISTORY=[
  {v:'+$1.64',tag:'WIN',win:true},
  {v:'-$0.50',tag:'LOSS',win:false},
  {v:'-$0.50',tag:'LOSS',win:false},
  {v:'+$0.82',tag:'WIN',win:true},
  {v:'+$1.64',tag:'WIN',win:true}
];
function n(v){const x=Number(v);return Number.isFinite(x)?x:0}
function targets(){return{profit:Math.max(0,n(localStorage.getItem('izitrader_profit_target'))),loss:Math.max(0,n(localStorage.getItem('izitrader_loss_target')))}}
function getHistory(){return $('#historyRow')||$('#historyScroll')}
function renderHistoryItem(h){const row=getHistory();if(!row)return;const chip=document.createElement('div');chip.className='chip '+(h.win?'win':'loss');chip.innerHTML='<span>'+h.v+'</span><span class="chip-tag">'+h.tag+'</span>';row.appendChild(chip)}
function seedHistory(){const row=getHistory();if(!row)return;if(row.children.length===0)START_HISTORY.forEach(renderHistoryItem);const count=$('#opsCount');if(count)count.textContent=String(row.children.length)}
function addHistory(profit){const value=n(profit);renderHistoryItem({v:(value>=0?'+':'-')+'$'+Math.abs(value).toFixed(2),tag:value>=0?'WIN':'LOSS',win:value>=0});const row=getHistory();if(row&&row.children.length>10)row.removeChild(row.firstElementChild);const count=$('#opsCount');if(count&&row)count.textContent=String(row.children.length)}
function clearHistory(){const h=getHistory();if(!h)return;h.innerHTML='';seedHistory();const count=$('#opsCount');if(count)count.textContent=String(h.children.length)}
function scrollFix(){const h=getHistory();if(!h)return;seedHistory();h.style.overflowX='auto';h.style.overflowY='hidden';h.style.display='flex';h.style.flexWrap='nowrap';h.style.gap='5px'}
function stopRobot(reason){if(stoppedByTarget)return;stoppedByTarget=true;const b=$('.operate-btn');if(b&&b.textContent.includes('PARAR'))b.click();const s=$('#statusText');if(s){s.textContent=reason;s.style.color='#f5a623'}localStorage.setItem('izitrader_target_stopped','1')}
function checkTargets(){const t=targets();if(t.profit>0&&sessionPnl>=t.profit)stopRobot('Profit target reached — bot stopped');else if(t.loss>0&&sessionPnl<=-t.loss)stopRobot('Loss target reached — bot stopped')}
function resetTargetState(){stoppedByTarget=false;sessionPnl=0;localStorage.removeItem('izitrader_target_stopped')}
function boot(){scrollFix();setTimeout(scrollFix,100)}
document.addEventListener('DOMContentLoaded',boot);
window.addEventListener('izitrader:ws-open',()=>{resetTargetState();scrollFix()});
window.addEventListener('izitrader:contract-closed',e=>{const detail=e.detail||{};const profit=detail.profit_loss??detail.profit??0;sessionPnl+=n(profit);addHistory(profit);checkTargets()});
window.addEventListener('storage',()=>{scrollFix();checkTargets()});
window.addEventListener('izitrader:buy',()=>{seedHistory()});
})();
