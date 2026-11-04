/* Izitrader stake controls — based on 596eb288 functional dashboard. */
(function(){
  'use strict';
  const MIN_STAKE=0.35;
  const STEP=0.05;
  const KEY='izitrader_stake';
  let stake=MIN_STAKE;

  function readStake(){
    const saved=Number(localStorage.getItem(KEY));
    return Number.isFinite(saved)&&saved>=MIN_STAKE?saved:MIN_STAKE;
  }
  function format(v){return Number(v).toFixed(2)}
  function findValue(){return document.querySelector('.stake-value')}
  function render(){
    const value=findValue();
    if(value)value.textContent=format(stake);
    window.izitraderStake=stake;
    try{localStorage.setItem(KEY,format(stake))}catch{}
    const minus=document.getElementById('stakeMinus');
    const plus=document.getElementById('stakePlus');
    if(minus)minus.disabled=stake<=MIN_STAKE;
  }
  function adjust(delta){
    stake=Math.max(MIN_STAKE,Math.round((stake+delta)*100)/100);
    render();
    window.dispatchEvent(new CustomEvent('izitrader:stake-change',{detail:{stake}}));
  }
  function mount(){
    const value=findValue();
    if(!value||value.dataset.stakeControls==='1')return !!value;
    value.dataset.stakeControls='1';
    stake=readStake();
    const row=value.parentElement;
    if(!row)return true;
    const minus=document.createElement('button');
    minus.id='stakeMinus';
    minus.type='button';
    minus.className='stake-control';
    minus.textContent='−';
    minus.setAttribute('aria-label','Diminuir aposta');
    const plus=document.createElement('button');
    plus.id='stakePlus';
    plus.type='button';
    plus.className='stake-control';
    plus.textContent='+';
    plus.setAttribute('aria-label','Aumentar aposta');
    const style=document.createElement('style');
    style.textContent='.stake-row{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px}.stake-value{min-width:76px;text-align:center}.stake-control{width:40px;height:40px;border-radius:10px;background:var(--field);border:1px solid var(--border);color:var(--text);font-size:24px;line-height:1;font-weight:800;cursor:pointer}.stake-control:disabled{opacity:.45;cursor:default}.stake-control:not(:disabled):active{transform:scale(.96)}';
    document.head.appendChild(style);
    row.insertBefore(minus,value);
    row.appendChild(plus);
    minus.addEventListener('click',()=>adjust(-STEP));
    plus.addEventListener('click',()=>adjust(STEP));
    render();
    return true;
  }
  function boot(){
    if(mount())return;
    let tries=0;
    const timer=setInterval(()=>{if(mount()||++tries>50)clearInterval(timer)},100);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
