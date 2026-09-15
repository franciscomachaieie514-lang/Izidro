/* Izitrader history scroll + automatic target stop + closed-trade history renderer. */
(function(){
'use strict';
const $=s=>document.querySelector(s);
let sessionPnl=0,stoppedByTarget=false;
const seen=new Set();
function n(v){const x=Number(v);return Number.isFinite(x)?x:0}
function targets(){return{profit:Math.max(0,n(localStorage.getItem('izitrader_profit_target'))),loss:Math.max(0,n(localStorage.getItem('izitrader_loss_target')))}}
function getHistory(){return $('#historyRow')||$('#historyScroll')}
function scrollFix(){const h=getHistory();if(!h)return;h.style.overflowX='auto';h.style.overflowY='hidden';h.style.display='flex';h.style.flexWrap='nowrap';h.style.touchAction='pan-x';h.style.webkitOverflowScrolling='touch';h.style.scrollBehavior='smooth';h.querySelectorAll('.chip').forEach(i=>{i.style.flex='0 0 78px';i.style.minWidth='78px';i.style.maxWidth='78px'});h.querySelectorAll('.history-item').forEach(i=>{i.style.flex='0 0 78px';i.style.minWidth='78px';i.style.maxWidth='78px'})}
function addClosed(d){const h=getHistory();if(!h)return;const result=String(d?.result||d?.status||'').toUpperCase();if(result!=='WON'&&result!=='LOST')return;const id=String(d?.contract_id||d?.contractId||'');if(id&&(seen.has(id)||h.querySelector('[data-contract-id="'+CSS.escape(id)+'"]')))return;if(id)seen.add(id);const p=n(d?.profit_loss??d?.profit??d?.pnl),win=result==='WON'||p>=0,chip=document.createElement('div');chip.className='chip '+(win?'win':'loss');if(id)chip.dataset.contractId=id;chip.dataset.closed='1';chip.innerHTML='<span>'+(win?'+':'-')+'$'+Math.abs(p).toFixed(2)+'</span><span class="chip-tag">'+(win?'GANHO':'PERDA')+'</span>';h.prepend(chip);while(h.children.length>20)h.lastElementChild.remove();const count=$('#opsCount');if(count)count.textContent=String(h.querySelectorAll('.chip[data-closed="1"]').length);scrollFix()}
function stopRobot(reason){if(stoppedByTarget)return;stoppedByTarget=true;const b=$('.operate-btn');if(b&&b.textContent.includes('PARAR'))b.click();const s=$('#statusText');if(s){s.textContent=reason;s.style.color='#f5a623'}localStorage.setItem('izitrader_target_stopped','1')}
function checkTargets(){const t=targets();if(t.profit>0&&sessionPnl>=t.profit)stopRobot('Meta de lucro atingida — robô parado');else if(t.loss>0&&sessionPnl<=-t.loss)stopRobot('Meta de perdas atingida — robô parado')}
function resetTargetState(){stoppedByTarget=false;sessionPnl=0;localStorage.removeItem('izitrader_target_stopped')}
function boot(){scrollFix();setTimeout(scrollFix,100)}
document.addEventListener('DOMContentLoaded',boot);
window.addEventListener('izitrader:ws-open',()=>{resetTargetState();scrollFix()});
window.addEventListener('izitrader:contract-closed',e=>{const d=e.detail||{},p=n(d.profit_loss??d.profit);sessionPnl+=p;addClosed(d);scrollFix();checkTargets()});
window.addEventListener('storage',()=>{scrollFix();checkTargets()});
window.addEventListener('izitrader:buy',()=>setTimeout(scrollFix,0));
})();
