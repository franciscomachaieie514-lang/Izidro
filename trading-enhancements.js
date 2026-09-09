/* IziTrader trading enhancements: editable stake, universal martingale, responsive stake controls, official-style WhatsApp mark. */
(function(){
'use strict';
const MIN_STAKE=.35;
const MAX_LEVEL=20;
const STAKE_STEP=.05;
let baseStake=Math.max(MIN_STAKE,Number(localStorage.getItem('izitrader_stake')||MIN_STAKE));
let level=0;
let nativeSend=null;
const $=s=>document.querySelector(s);
function money(n){return Number(n).toFixed(2)}
function setBaseStake(value){
  let n=Number(value);
  if(!Number.isFinite(n)||n<MIN_STAKE)n=MIN_STAKE;
  baseStake=Number(n.toFixed(2));
  level=0;
  localStorage.setItem('izitrader_stake',String(baseStake));
  const input=$('#stakeInput');
  if(input){input.value=money(baseStake);}
  updateInfo();
}
function adjustStake(direction){
  const current=Number(baseStake)||MIN_STAKE;
  const next=current+(direction*STAKE_STEP);
  setBaseStake(Math.max(MIN_STAKE,next));
}
function syncStakeInput(){
  const row=$('.stake-row');if(!row)return;
  let input=$('#stakeInput');
  if(!input){
    const old=row.querySelector('.stake-value');
    const controls=document.createElement('div');
    controls.id='stakeControls';
    controls.style.cssText='display:flex;align-items:center;justify-content:flex-end;gap:8px;width:auto;max-width:100%;';

    const minus=document.createElement('button');
    minus.id='stakeMinus';minus.type='button';minus.textContent='−';
    minus.setAttribute('aria-label','Decrease stake');minus.title='Decrease stake';

    input=document.createElement('input');
    input.id='stakeInput';input.type='number';input.min=String(MIN_STAKE);input.step='0.01';input.inputMode='decimal';
    input.value=money(baseStake);input.setAttribute('aria-label','Stake amount');

    const plus=document.createElement('button');
    plus.id='stakePlus';plus.type='button';plus.textContent='+';
    plus.setAttribute('aria-label','Increase stake');plus.title='Increase stake';

    const controlStyle='width:40px;height:40px;min-width:40px;border:1px solid var(--border);border-radius:10px;background:var(--field);color:var(--text);font-size:22px;font-weight:800;line-height:1;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;touch-action:manipulation;-webkit-tap-highlight-color:transparent;user-select:none;';
    minus.style.cssText=controlStyle;
    plus.style.cssText=controlStyle;
    input.style.cssText='width:112px;min-width:86px;background:var(--field);border:1px solid var(--border);border-radius:9px;color:var(--text);font-size:22px;font-weight:800;text-align:center;padding:7px 8px;outline:none;';

    controls.appendChild(minus);controls.appendChild(input);controls.appendChild(plus);
    if(old)old.replaceWith(controls);else row.appendChild(controls);

    minus.addEventListener('click',()=>adjustStake(-1));
    plus.addEventListener('click',()=>adjustStake(1));
  }
  input.onchange=()=>setBaseStake(input.value);
  input.onblur=()=>setBaseStake(input.value);

  let info=$('#martingaleInfo');
  if(!info){info=document.createElement('div');info.id='martingaleInfo';info.style.cssText='margin-top:7px;text-align:right;font-size:10px;color:var(--muted);';row.parentElement.insertBefore(info,row.nextSibling)}
  updateInfo();
}
function currentStake(){return Number((baseStake*Math.pow(2,Math.min(level,MAX_LEVEL))).toFixed(2))}
function updateInfo(){
  const input=$('#stakeInput');
  const next=currentStake();
  if(input&&document.activeElement!==input)input.value=money(next);
  const info=$('#martingaleInfo');
  if(info)info.textContent='Martingale '+level+'/'+MAX_LEVEL+' · próxima aposta $'+money(next);
}
function installProposalInterceptor(){
  const Ctor=window.__IziNativeWebSocket||window.WebSocket;if(!Ctor||!Ctor.prototype)return;
  if(Ctor.prototype.__iziMartingalePatched)return;
  nativeSend=Ctor.prototype.send;
  const wrapped=function(data){
    try{
      const m=typeof data==='string'?JSON.parse(data):null;
      if(m&&m.proposal===1&&m.basis==='stake'&&Number.isFinite(Number(m.amount))){
        m.amount=currentStake();
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
  window.dispatchEvent(new CustomEvent('izitrader:martingale',{detail:{level,baseStake,stake:currentStake(),maxLevel:MAX_LEVEL,profit:p}}));
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
    #stakeControls{flex-wrap:nowrap}
    #stakeMinus:hover,#stakePlus:hover{border-color:var(--accent);transform:translateY(-1px)}
    #stakeMinus:active,#stakePlus:active{transform:scale(.97)}
    #stakeInput::-webkit-inner-spin-button,#stakeInput::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
    #stakeInput{appearance:textfield}
    @media(max-width:599px){#stakeControls{gap:6px}#stakeMinus,#stakePlus{width:42px;height:42px;min-width:42px;font-size:23px}#stakeInput{width:96px;min-width:80px;font-size:20px;padding:8px 5px}}
    @media(min-width:600px){#stakeMinus,#stakePlus{width:42px;height:42px}#stakeInput{width:118px}}
  `;
  document.head.appendChild(s);
}
function boot(){installResponsiveStakeCss();syncStakeInput();installProposalInterceptor();installWhatsApp();}
window.addEventListener('izitrader:contract-closed',e=>applyResult(e.detail?.profit_loss??e.detail?.profit));
window.addEventListener('izitrader:deriv-error',e=>{const m=String(e.detail?.message||'');if(/unknown contract proposal/i.test(m)){setConnectedStatus();setTimeout(boot,0)}});
window.addEventListener('izitrader:ws-open',boot);
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
