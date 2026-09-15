/* Izitrader recent history — reset to zero. */
(function(){
'use strict';
const $=s=>document.querySelector(s);
function getHistory(){return $('#historyRow')||$('#historyScroll')}
function resetHistory(){
  const row=getHistory();
  if(row) row.innerHTML='';
  const count=$('#opsCount');
  if(count) count.textContent='0';
  try{localStorage.setItem('izitrader_operations','0')}catch{}
}
function stopRobot(reason){
  const b=$('.operate-btn');
  if(b&&b.textContent.includes('PARAR'))b.click();
  const s=$('#statusText');
  if(s){s.textContent=reason;s.style.color='#f5a623'}
}
function boot(){
  resetHistory();
  setTimeout(resetHistory,50);
  setTimeout(resetHistory,250);
  setTimeout(resetHistory,1000);
}
document.addEventListener('DOMContentLoaded',boot);
window.addEventListener('izitrader:ws-open',resetHistory);
window.addEventListener('izitrader:buy',resetHistory);
window.addEventListener('izitrader:contract-closed',resetHistory);
window.addEventListener('storage',resetHistory);
window.izitraderResetHistory=resetHistory;
})();
