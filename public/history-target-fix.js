/* Izitrader history scroll + automatic target stop. */
(function(){
'use strict';
const $=s=>document.querySelector(s);
let sessionPnl=0,stoppedByTarget=false;
function n(v){const x=Number(v);return Number.isFinite(x)?x:0}
function targets(){return{profit:Math.max(0,n(localStorage.getItem('izitrader_profit_target'))),loss:Math.max(0,n(localStorage.getItem('izitrader_loss_target')))}}
function getHistory(){return $('#historyRow')||$('#historyScroll')}
function removeLegacyOpenHistory(){const h=getHistory();if(!h)return;h.querySelectorAll('.chip:not([data-closed="1"])').forEach(el=>el.remove())}
function scrollFix(){const h=getHistory();if(!h)return;removeLegacyOpenHistory();h.style.overflowX='hidden';h.style.overflowY='hidden';h.style.display='flex';h.style.flexWrap='nowrap';h.style.gap='5px'}
function stopRobot(reason){if(stoppedByTarget)return;stoppedByTarget=true;const b=$('.operate-btn');if(b&&b.textContent.includes('PARAR'))b.click();const s=$('#statusText');if(s){s.textContent=reason;s.style.color='#f5a623'}localStorage.setItem('izitrader_target_stopped','1')}
function checkTargets(){const t=targets();if(t.profit>0&&sessionPnl>=t.profit)stopRobot('Meta de lucro atingida — robô parado');else if(t.loss>0&&sessionPnl<=-t.loss)stopRobot('Meta de perdas atingida — robô parado')}
function resetTargetState(){stoppedByTarget=false;sessionPnl=0;localStorage.removeItem('izitrader_target_stopped')}
function boot(){scrollFix();setTimeout(scrollFix,100)}
document.addEventListener('DOMContentLoaded',boot);
window.addEventListener('izitrader:ws-open',()=>{resetTargetState();scrollFix()});
window.addEventListener('izitrader:contract-closed',e=>{sessionPnl+=n((e.detail||{}).profit_loss??(e.detail||{}).profit);scrollFix();checkTargets()});
window.addEventListener('storage',()=>{scrollFix();checkTargets()});
window.addEventListener('izitrader:buy',()=>{removeLegacyOpenHistory();setTimeout(scrollFix,0)});
})();