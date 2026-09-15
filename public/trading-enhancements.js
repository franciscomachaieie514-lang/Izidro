/* IziTrader trading enhancements: working +/- stake controls, universal martingale, selected stake used for orders. */
(function(){
'use strict';
const MIN_STAKE=.35;
const MAX_STAKE=10;
const STEP=.05;
const MAX_LEVEL=20;
const $=s=>document.querySelector(s);
let baseStake=Math.max(MIN_STAKE,Math.min(MAX_STAKE,Number(localStorage.getItem('izitrader_stake')||MIN_STAKE)));
if(!Number.isFinite(baseStake))baseStake=MIN_STAKE;
let level=0,nativeSend=null;
function money(n){return Number(n).toFixed(2)}
function selectedBaseStake(){return Math.min(MAX_STAKE,Math.max(MIN_STAKE,Number(baseStake)||MIN_STAKE))}
function setBaseStake(value){
  let n=Number(value);
  if(!Number.isFinite(n))n=MIN_STAKE;
  n=Math.min(MAX_STAKE,Math.max(MIN_STAKE,n));
  baseStake=Number((Math.round(n*100)/100).toFixed(2));
  level=0;
  try{localStorage.setItem('izitrader_stake',String(baseStake))}catch{}
  renderStake();
  updateInfo();
  window.dispatchEvent(new CustomEvent('izitrader:stake-change',{detail:{stake:baseStake}}));
}
function renderStake(){
  const value=$('.stake-value');
  if(value)value.textContent=money(baseStake);
  const minus=$('#stakeMinus'),plus=$('#stakePlus');
  if(minus)minus.disabled=baseStake<=MIN_STAKE;
  if(plus)plus.disabled=baseStake>=MAX_STAKE;
  window.izitraderStake=baseStake;
}
function mountStakeControls(){
  const value=$('.stake-value');
  if(!value)return false;
  const row=value.parentElement;
  if(!row)return false;
  if(!$('#stakeMinus')){
    const minus=document.createElement('button');
    minus.id='stakeMinus';minus.type='button';minus.className='stake-control';minus.textContent='−';
    minus.setAttribute('aria-label','Diminuir aposta');
    row.insertBefore(minus,value);
    minus.addEventListener('click',()=>setBaseStake(baseStake-STEP));
  }
  if(!$('#stakePlus')){
    const plus=document.createElement('button');
    plus.id='stakePlus';plus.type='button';plus.className='stake-control';plus.textContent='+';
    plus.setAttribute('aria-label','Aumentar aposta');
    row.appendChild(plus);
    plus.addEventListener('click',()=>setBaseStake(baseStake+STEP));
  }
  if(!$('#iziStakeControlsCss')){
    const s=document.createElement('style');s.id='iziStakeControlsCss';
    s.textContent='.stake-row{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px}.stake-value{min-width:76px;text-align:center;font-size:26px;font-weight:800}.stake-control{width:40px;height:40px;border-radius:10px;background:var(--field);border:1px solid var(--border);color:var(--text);font-size:24px;line-height:1;font-weight:800;cursor:pointer}.stake-control:disabled{opacity:.45;cursor:default}.stake-control:not(:disabled):active{transform:scale(.96)}';
    document.head.appendChild(s);
  }
  renderStake();
  return true;
}
function currentStake(){return Number((selectedBaseStake()*Math.pow(2,Math.min(level,MAX_LEVEL))).toFixed(2))}
function updateInfo(){
  const row=$('.stake-row');if(!row)return;
  let info=$('#martingaleInfo');
  if(!info){info=document.createElement('div');info.id='martingaleInfo';info.style.cssText='margin-top:7px;text-align:right;font-size:10px;color:var(--muted);';row.parentElement.insertBefore(info,row.nextSibling)}
  info.textContent='Martingale '+level+'/'+MAX_LEVEL+' · próxima aposta $'+money(currentStake());
}
function installProposalInterceptor(){
  const Ctor=window.__IziNativeWebSocket||window.WebSocket;if(!Ctor||!Ctor.prototype)return;
  if(Ctor.prototype.__iziMartingalePatched)return;
  nativeSend=Ctor.prototype.send;
  const wrapped=function(data){
    try{
      const m=typeof data==='string'?JSON.parse(data):null;
      if(m&&m.proposal===1&&m.basis==='stake'&&Number.isFinite(Number(m.amount))){
        m.amount=currentStake();delete m.subscribe;data=JSON.stringify(m);
      }
    }catch(e){}
    return nativeSend.call(this,data);
  };
  wrapped.__iziOriginal=nativeSend;Ctor.prototype.send=wrapped;Ctor.prototype.__iziMartingalePatched=true;
}
function setConnectedStatus(){const type=localStorage.getItem('izitrader_account_type')==='demo'?'Demo':'Real';const el=$('#statusText');if(el)el.textContent='Conta '+type+' ligada';const dot=$('.status .dot');if(dot)dot.style.background='#35d492'}
function updatePnlColor(profit){
  const el=$('#pnl');if(!el)return;
  const n=Number(profit);
  if(Number.isFinite(n)&&n<0)el.style.color='var(--red)';
  else if(Number.isFinite(n)&&n>0)el.style.color='var(--green)';
  else el.style.color='var(--text)';
}
function applyResult(profit){
  const p=Number(profit);if(!Number.isFinite(p))return;
  updatePnlColor(p);
  if(p<0)level=Math.min(MAX_LEVEL,level+1);else level=0;
  updateInfo();
  window.dispatchEvent(new CustomEvent('izitrader:martingale',{detail:{level,baseStake:selectedBaseStake(),stake:currentStake(),maxLevel:MAX_LEVEL,profit:p}}));
}
function installWhatsApp(){
  const a=$('.whatsapp-btn');if(!a)return;
  a.setAttribute('aria-label','WhatsApp');
  a.innerHTML='<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" focusable="false" style="display:block;fill:#fff"><path d="M16.02 3.1a12.88 12.88 0 0 0-10.97 19.6L3.08 28.9l6.34-1.87A12.9 12.9 0 1 0 16.02 3.1Zm0 23.43h-.01a10.5 10.5 0 0 1-5.34-1.46l-.38-.23-3.76 1.11 1.1-3.67-.25-.39a10.53 10.53 0 1 1 8.64 4.64Zm5.77-7.9c-.31-.16-1.82-.9-2.1-1-.28-.1-.48-.16-.68.16-.2.3-.78 1-.96 1.21-.18.2-.35.23-.66.08-.31-.16-1.3-.48-2.48-1.52-.91-.81-1.53-1.8-1.71-2.1-.18-.31-.02-.48.14-.63.14-.14.31-.36.47-.54.16-.18.21-.31.31-.52.1-.2.05-.39-.03-.55-.08-.16-.68-1.63-.93-2.23-.24-.58-.49-.5-.68-.51l-.58-.01c-.2 0-.52.07-.79.38-.27.3-1.04 1.02-1.04 2.5s1.07 2.9 1.22 3.1c.15.2 2.1 3.2 5.1 4.5.71.31 1.27.5 1.7.64.72.23 1.37.2 1.89.12.58-.09 1.82-.74 2.07-1.45.26-.71.26-1.32.18-1.45-.08-.13-.29-.2-.6-.36Z"/></svg>';
}
function boot(){mountStakeControls();updateInfo();installProposalInterceptor();installWhatsApp()}
window.addEventListener('izitrader:contract-closed',e=>applyResult(e.detail?.profit_loss??e.detail?.profit));
window.addEventListener('izitrader:martingale',()=>setTimeout(()=>{mountStakeControls();updateInfo()},0));
window.addEventListener('izitrader:deriv-error',e=>{const m=String(e.detail?.message||'');if(/unknown contract proposal/i.test(m)){setConnectedStatus();setTimeout(boot,0)}});
window.addEventListener('izitrader:ws-open',boot);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
