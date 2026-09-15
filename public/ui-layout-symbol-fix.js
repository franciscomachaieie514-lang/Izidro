(function(){'use strict';
function applyLayout(){
  const card=document.querySelector('.card:has(#historyScroll)');
  if(card){card.style.width='calc(100% - 24px)';card.style.maxWidth='396px';card.style.marginLeft='auto';card.style.marginRight='auto';}
  const row=document.getElementById('historyScroll');
  if(row){row.style.gap='4px';row.style.paddingBottom='10px';row.querySelectorAll('.chip').forEach(c=>{c.style.flex='0 0 72px';c.style.width='72px';c.style.padding='7px 2px';})}
}
function symbols(){
  const btn=document.getElementById('symbolBtn'),menu=document.getElementById('symbolMenu');
  if(!btn||!menu||btn.dataset.uiLayoutSymbols)return;
  btn.dataset.uiLayoutSymbols='1';
  const items=[['R_100','Volatility 100'],['R_75','Volatility 75'],['R_50','Volatility 50'],['R_25','Volatility 25'],['R_10','Volatility 10']];
  function open(e){e.preventDefault();e.stopPropagation();menu.innerHTML=items.map(x=>`<div class="symbol-item" data-symbol="${x[0]}"><span class="symbol-name">${x[0]}</span><span class="symbol-desc">${x[1]}</span></div>`).join('');menu.classList.add('open');menu.style.display='block';menu.style.zIndex='1000';}
  btn.addEventListener('click',open,true);
  menu.addEventListener('click',e=>{const item=e.target.closest('.symbol-item');if(!item)return;e.stopPropagation();const code=item.dataset.symbol;const sel=document.getElementById('selectedSymbol');if(sel)sel.textContent=code;localStorage.setItem('izitrader_symbol',code);menu.classList.remove('open');menu.style.display='none';window.dispatchEvent(new CustomEvent('izitrader:symbol-change',{detail:{symbol:code}}));});
  document.addEventListener('click',e=>{if(!menu.contains(e.target)&&e.target!==btn){menu.classList.remove('open');menu.style.display='none';}});
}
function stakeControls(){
  const row=document.querySelector('.stake-row');
  if(!row||row.dataset.iziRiskReady)return;
  row.dataset.iziRiskReady='1';
  let input=document.getElementById('stakeInput');
  const oldValue=row.querySelector('.stake-value');
  if(!input){
    input=document.createElement('input');
    input.id='stakeInput';input.type='number';input.min='0.35';input.step='0.05';input.inputMode='decimal';
    input.value=oldValue?.textContent?.trim()||localStorage.getItem('izitrader_stake')||'0.35';
    row.appendChild(input);
  }
  input.style.cssText='position:absolute!important;width:1px!important;height:1px!important;opacity:0!important;pointer-events:none!important;';
  const initial=Math.max(0.35,Number(input.value)||0.35);
  const card=document.createElement('div');
  card.className='risk-card';
  card.innerHTML='<div class="risk-label">Gestão de risco</div><div class="risk-row"><button type="button" class="risk-btn" data-risk="minus">−</button><div class="risk-value" id="stakeValue">$'+initial.toFixed(2)+'</div><button type="button" class="risk-btn" data-risk="plus">+</button></div>';
  row.parentElement.insertBefore(card,row);
  row.style.display='none';
  const value=card.querySelector('#stakeValue');
  function setStake(next){
    const n=Math.max(0.35,Math.round(next*100)/100);
    input.value=n.toFixed(2);
    value.textContent='$'+n.toFixed(2);
    input.dispatchEvent(new Event('change',{bubbles:true}));
    try{localStorage.setItem('izitrader_stake',n.toFixed(2))}catch{}
  }
  card.querySelector('[data-risk="minus"]').addEventListener('click',()=>setStake(Number(input.value)-0.05));
  card.querySelector('[data-risk="plus"]').addEventListener('click',()=>setStake(Number(input.value)+0.05));
  window.adjustStake=function(delta){setStake(Number(input.value)+Number(delta||0))};
  const style=document.createElement('style');
  style.textContent='.risk-card{background:#151717;border:1px solid #323738;border-radius:8px;padding:12px 14px;margin-bottom:14px}.risk-label{font-size:11px;color:#6e6e6e;margin-bottom:8px;text-transform:uppercase;letter-spacing:.4px}.risk-row{display:flex;align-items:center;justify-content:space-between}.risk-btn{width:32px;height:32px;border-radius:6px;background:#1b1d1d;border:1px solid #323738;color:#c2c2c2;font-size:18px;font-weight:600;cursor:pointer}.risk-value{font-size:18px;font-weight:600;font-family:'IBM Plex Mono',ui-monospace,monospace;color:#fff}' ;
  document.head.appendChild(style);
}
function boot(){applyLayout();symbols();stakeControls();setTimeout(applyLayout,100);setTimeout(applyLayout,500);setTimeout(stakeControls,300);setTimeout(stakeControls,1000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
