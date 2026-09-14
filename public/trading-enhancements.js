/* IziTrader trading enhancements: stake dropdown, universal martingale, selected stake used for orders. */
(function(){
'use strict';
const MIN_STAKE=.35;
const MAX_STAKE=10;
const MAX_LEVEL=20;
const STAKES=[.35,.50];
for(let v=1.50;v<=MAX_STAKE+.001;v+=.50)STAKES.push(Number(v.toFixed(2)));
const $=s=>document.querySelector(s);
let baseStake=Math.max(MIN_STAKE,Math.min(MAX_STAKE,Number(localStorage.getItem('izitrader_stake')||MIN_STAKE)));
if(!STAKES.includes(Number(baseStake.toFixed(2))))baseStake=MIN_STAKE;
let level=0,nativeSend=null;
function money(n){return Number(n).toFixed(2)}
function selectedBaseStake(){
  const ui=$('#stakeInput');
  const saved=Number(ui?.value||localStorage.getItem('izitrader_stake')||baseStake);
  const n=Number.isFinite(saved)?saved:baseStake;
  return Math.min(MAX_STAKE,Math.max(MIN_STAKE,n));
}
function syncBaseFromUi(){
  const n=selectedBaseStake();
  const nearest=STAKES.reduce((a,b)=>Math.abs(b-n)<Math.abs(a-n)?b:a,STAKES[0]);
  baseStake=Number(nearest.toFixed(2));
  localStorage.setItem('izitrader_stake',String(baseStake));
  return baseStake;
}
function setBaseStake(value){
  let n=Number(value);
  if(!Number.isFinite(n)||n<MIN_STAKE)n=MIN_STAKE;
  n=Math.min(MAX_STAKE,n);
  const nearest=STAKES.reduce((a,b)=>Math.abs(b-n)<Math.abs(a-n)?b:a,STAKES[0]);
  baseStake=Number(nearest.toFixed(2));
  level=0;
  localStorage.setItem('izitrader_stake',String(baseStake));
  const select=$('#stakeInput');if(select)select.value=money(baseStake);
  updateInfo();
}
function buildStakeOptions(select){
  select.innerHTML='';
  STAKES.forEach(v=>{const o=document.createElement('option');o.value=money(v);o.textContent='$'+money(v);select.appendChild(o)});
  select.value=money(baseStake);
}
function syncStakeInput(){
  const row=$('.stake-row');if(!row)return;
  let control=$('#stakeInput');
  if(!control||control.tagName!=='SELECT'){
    const old=control||row.querySelector('.stake-value');
    const select=document.createElement('select');
    select.id='stakeInput';
    select.setAttribute('aria-label','Stake amount');
    select.title='Select stake';
    select.className='stake-select';
    buildStakeOptions(select);
    if(old)old.replaceWith(select);else row.appendChild(select);
    control=select;
  }else buildStakeOptions(control);
  control.onchange=()=>setBaseStake(control.value);
  control.value=money(baseStake);
  let info=$('#martingaleInfo');
  if(!info){info=document.createElement('div');info.id='martingaleInfo';info.style.cssText='margin-top:7px;text-align:right;font-size:10px;color:var(--muted);';row.parentElement.insertBefore(info,row.nextSibling)}
  updateInfo();
}
function currentStake(){
  const chosen=syncBaseFromUi();
  return Number((chosen*Math.pow(2,Math.min(level,MAX_LEVEL))).toFixed(2));
}
function updateInfo(){
  const select=$('#stakeInput');
  if(select&&select.tagName==='SELECT'){
    const saved=Number(localStorage.getItem('izitrader_stake')||baseStake);
    const valid=STAKES.includes(Number(saved.toFixed(2)))?Number(saved.toFixed(2)):baseStake;
    select.value=money(valid);
  }
  const info=$('#martingaleInfo');
  if(info)info.textContent='Martingale '+level+'/'+MAX_LEVEL+' · próxima aposta $'+money(currentStake());
}
function installProposalInterceptor(){
  const Ctor=window.__IziNativeWebSocket||window.WebSocket;if(!Ctor||!Ctor.prototype)return;
  if(Ctor.prototype.__iziMartingalePatched)return;
  nativeSend=Ctor.prototype.send;
  const wrapped=function(data){
    try{
      const m=typeof data==='string'?JSON.parse(data):null;
      if(m&&m.proposal===1&&m.basis==='stake'&&Number.isFinite(Number(m.amount))){
        const amount=currentStake();
        m.amount=amount;
        delete m.subscribe;
        data=JSON.stringify(m);
      }
    }catch(e){}
    return nativeSend.call(this,data);
  };
  wrapped.__iziOriginal=nativeSend;Ctor.prototype.send=wrapped;Ctor.prototype.__iziMartingalePatched=true;
}
function setConnectedStatus(){
  const type=localStorage.getItem('izitrader_account_type')==='demo'?'Demo':'Real';
  const el=$('#statusText');if(el)el.textContent='Conta '+type+' ligada';
  const dot=$('.status .dot');if(dot)dot.style.background='#35d492';
}
function applyResult(profit){
  const p=Number(profit);if(!Number.isFinite(p))return;
  if(p<0)level=Math.min(MAX_LEVEL,level+1);else level=0;
  updateInfo();
  window.dispatchEvent(new CustomEvent('izitrader:martingale',{detail:{level,baseStake:selectedBaseStake(),stake:currentStake(),maxLevel:MAX_LEVEL,profit:p}}));
}
function installWhatsApp(){
  const a=$('.whatsapp-btn');if(!a)return;
  a.setAttribute('aria-label','WhatsApp');
  a.innerHTML='<svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true" focusable="false" style="display:block;fill:#fff"><path d="M16.02 3.1a12.88 12.88 0 0 0-10.97 19.6L3.08 28.9l6.34-1.87A12.9 12.9 0 1 0 16.02 3.1Zm0 23.43h-.01a10.5 10.5 0 0 1-5.34-1.46l-.38-.23-3.76 1.11 1.1-3.67-.25-.39a10.53 10.53 0 1 1 8.64 4.64Zm5.77-7.9c-.31-.16-1.82-.9-2.1-1-.28-.1-.48-.16-.68.16-.2.3-.78 1-.96 1.21-.18.2-.35.23-.66.08-.31-.16-1.3-.48-2.48-1.52-.91-.81-1.53-1.8-1.71-2.1-.18-.31-.02-.48.14-.63.14-.14.31-.36.47-.54.16-.18.21-.31.31-.52.1-.2.05-.39-.03-.55-.08-.16-.68-1.63-.93-2.23-.24-.58-.49-.5-.68-.51l-.58-.01c-.2 0-.52.07-.79.38-.27.3-1.04 1.02-1.04 2.5s1.07 2.9 1.22 3.1c.15.2 2.1 3.2 5.1 4.5.71.31 1.27.5 1.7.64.72.23 1.37.2 1.89.12.58-.09 1.82-.74 2.07-1.45.26-.71.26-1.32.18-1.45-.08-.13-.29-.2-.6-.36Z"/></svg>';
}
function installResponsiveStakeCss(){
  if($('#iziStakeControlsCss'))return;
  const s=document.createElement('style');s.id='iziStakeControlsCss';
  s.textContent=`
    .stake-row{display:flex;align-items:center;justify-content:space-between;gap:10px}
    .stake-select{width:150px;min-width:120px;height:42px;padding:7px 34px 7px 12px;border:1px solid var(--border);border-radius:10px;background:var(--field);color:var(--text);font-size:18px;font-weight:800;text-align:center;outline:none;cursor:pointer;}
    .stake-select:focus{border-color:var(--accent)}
    #martingaleInfo{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    @media(max-width:599px){.stake-select{width:132px;min-width:118px;height:40px;font-size:17px}.stake-row{gap:8px}}
    @media(min-width:600px){.stake-select{width:150px;height:42px}}
  `;
  document.head.appendChild(s);
}
function boot(){installResponsiveStakeCss();syncStakeInput();installProposalInterceptor();installWhatsApp();}
window.addEventListener('izitrader:contract-closed',e=>applyResult(e.detail?.profit_loss??e.detail?.profit));
window.addEventListener('izitrader:martingale',()=>setTimeout(syncStakeInput,0));
window.addEventListener('izitrader:deriv-error',e=>{const m=String(e.detail?.message||'');if(/unknown contract proposal/i.test(m)){setConnectedStatus();setTimeout(boot,0)}});
window.addEventListener('izitrader:ws-open',boot);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
